const request = require('supertest');
const app = require('../src/app');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');
const Session = require('../src/models/session.model');
const User = require('../src/models/user.model');
const { createTestUser } = require('./helpers/testUser');
const { buildAuthzFixture, fresh } = require('./helpers/authzFixture');

const asUser = (method, path, who) =>
  request(app)[method](path).set('Authorization', `Bearer ${who.token}`);

// status code of a request made as `who`
const st = async (method, path, who, body) =>
  (await asUser(method, path, who).send(body)).status;

const DAY = 86400000;
const deadline = () => new Date(Date.now() + DAY).toISOString();

const COURSE = {
  title: 'Rule Course',
  description: 'A course created by the rule tests',
};

describe('Stage 4 final-product rules', () => {
  describe('rule 2/3: creation and instructor assignment', () => {
    it('an unrelated instructor creates and manages standalone content', async () => {
      const inst = await createTestUser({ role: 'instructor' });

      const c = await asUser('post', '/v1/courses', inst).send(COURSE);
      expect(c.status).toBe(201);
      expect(c.body.data.course.instructor._id).toBe(inst.user.id);
      const s = await asUser('post', '/v1/sessions', inst).send({
        title: 'Rule Session',
      });
      expect(s.status).toBe(201);

      const cp = `/v1/courses/${c.body.data.course._id}`;
      const sp = `/v1/sessions/${s.body.data.session._id}`;
      expect(await st('patch', cp, inst, { duration: 4 })).toBe(200);
      expect(await st('patch', sp, inst, { duration: 20 })).toBe(200);
      const asg = {
        title: 'Mine',
        description: 'My own course',
        deadline: deadline(),
      };
      expect(await st('post', `${cp}/assignments`, inst, asg)).toBe(201);
      expect(await st('delete', cp, inst)).toBe(204);
      expect(await st('delete', sp, inst)).toBe(204);
    });

    it("cannot touch another instructor's standalone course or session", async () => {
      const f = await buildAuthzFixture();
      const c = `/v1/courses/${f.standaloneCourse.id}`;
      const s = `/v1/sessions/${f.standaloneSession.id}`;
      const who = f.courseInst;
      expect(await st('patch', c, who, { duration: 3 })).toBe(403);
      expect(await st('delete', c, who)).toBe(403);
      expect(await st('patch', s, who, { duration: 3 })).toBe(403);
      expect(await st('delete', s, who)).toBe(403);
    });

    it('a non-admin instructor: otherUser is ignored on create and update', async () => {
      const inst = await createTestUser({ role: 'instructor' });
      const other = await createTestUser({ role: 'instructor' });

      const c = await asUser('post', '/v1/courses', inst).send({
        ...COURSE,
        instructor: other.user.id,
      });
      expect(c.status).toBe(201);
      expect(c.body.data.course.instructor._id).toBe(inst.user.id);

      const s = await asUser('post', '/v1/sessions', inst).send({
        title: 'Ignored instructor',
        instructor: other.user.id,
      });
      expect(s.status).toBe(201);
      expect(s.body.data.session.instructor._id).toBe(inst.user.id);

      const upd = await asUser(
        'patch',
        `/v1/courses/${c.body.data.course._id}`,
        inst,
      ).send({ duration: 2, instructor: other.user.id });
      expect(upd.status).toBe(200);
      expect(upd.body.data.course.instructor._id).toBe(inst.user.id);
    });

    it('an admin sets and reassigns instructors; role is validated', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const a = await createTestUser({ role: 'instructor' });
      const b = await createTestUser({ role: 'instructor' });
      const stu = await createTestUser({ role: 'student' });

      const c = await asUser('post', '/v1/courses', admin).send({
        ...COURSE,
        instructor: a.user.id,
      });
      expect(c.status).toBe(201);
      expect(c.body.data.course.instructor._id).toBe(a.user.id);
      const cp = `/v1/courses/${c.body.data.course._id}`;

      expect(await st('patch', cp, admin, { instructor: stu.user.id })).toBe(
        400,
      );
      expect(await st('patch', cp, a, { duration: 2 })).toBe(200);
      expect(await st('patch', cp, admin, { instructor: b.user.id })).toBe(200);
      // reassigning revokes the old instructor immediately
      expect(await st('patch', cp, a, { duration: 3 })).toBe(403);
      expect(await st('patch', cp, b, { duration: 3 })).toBe(200);

      const s = await asUser('post', '/v1/sessions', admin).send({
        title: 'Admin made',
        instructor: a.user.id,
      });
      expect(s.status).toBe(201);
      expect(s.body.data.session.instructor._id).toBe(a.user.id);
      const sp = `/v1/sessions/${s.body.data.session._id}`;
      expect(await st('patch', sp, admin, { instructor: stu.user.id })).toBe(
        400,
      );
      expect(await st('patch', sp, admin, { instructor: b.user.id })).toBe(200);
      expect(await st('patch', sp, a, { duration: 3 })).toBe(403);
    });

    it('POST /tracks is admin-only; anonymous is rejected too', async () => {
      const inst = await createTestUser({ role: 'instructor' });
      const body = {
        title: 'Admin Only Track',
        description: 'Long enough text',
      };
      expect(await st('post', '/v1/tracks', inst, body)).toBe(403);
      expect((await request(app).post('/v1/tracks').send(body)).status).toBe(
        401,
      );
    });
  });

  describe('rule 4: linking', () => {
    it('keeps managing his course after an admin attaches it to a track', async () => {
      const f = await buildAuthzFixture();
      const c = await fresh.course(f, f.stranger, null);
      const link = `/v1/tracks/${f.track.id}/courses/${c.id}`;
      expect(await st('patch', link, f.stranger)).toBe(403);
      expect(await st('patch', link, f.admin)).toBe(200);
      const cp = `/v1/courses/${c.id}`;
      expect(await st('patch', cp, f.stranger, { duration: 9 })).toBe(200);
    });

    it("cannot link someone else's session to his own track", async () => {
      const f = await buildAuthzFixture();
      const s = await fresh.session(f, f.stranger, null);
      const link = `/v1/tracks/${f.track.id}/sessions/${s.id}`;
      expect(await st('patch', link, f.lead)).toBe(403);
    });

    it('cannot link his own course to a track he does not lead', async () => {
      const f = await buildAuthzFixture();
      const own = await fresh.course(f, f.stranger, null);
      const link = `/v1/tracks/${f.track.id}/courses/${own.id}`;
      expect(await st('patch', link, f.stranger)).toBe(403);
      const cp = `/v1/courses/${own.id}`;
      const body = { track: f.track.id };
      expect(await st('patch', cp, f.stranger, body)).toBe(403);
    });

    it('a lead creates a course in his own track (ok) and in another (403)', async () => {
      const f = await buildAuthzFixture();
      const other = await Track.create({
        title: 'Other Track',
        description: 'A track led by someone else',
        instructor: f.stranger.user._id,
        published: true,
      });
      const ok = await asUser('post', '/v1/courses', f.lead).send({
        ...COURSE,
        track: f.track.id,
      });
      expect(ok.status).toBe(201);
      expect(ok.body.data.course.track._id).toBe(f.track.id);

      const denied = await asUser('post', '/v1/courses', f.lead).send({
        ...COURSE,
        title: 'Other Track Course',
        track: other.id,
      });
      expect(denied.status).toBe(403);
      const left = await Course.countDocuments({ title: 'Other Track Course' });
      expect(left).toBe(0);
    });

    it('a co-instructor attaches his own course to the track (#2.5)', async () => {
      const f = await buildAuthzFixture();
      const c = await fresh.course(f, f.co, null);
      const cp = `/v1/courses/${c.id}`;
      expect(await st('patch', cp, f.co, { track: f.track.id })).toBe(200);
      const t = await Track.findById(f.track.id);
      expect(t.courses.map(String)).toContain(c.id);
    });
  });

  describe('rule 6 and revocation', () => {
    it("only an admin changes a track's instructors; removal revokes access", async () => {
      const f = await buildAuthzFixture();
      const newCo = await createTestUser({ role: 'instructor' });
      const learner = await createTestUser({ role: 'student' });
      const tp = `/v1/tracks/${f.track.id}`;

      // the lead's attempt is silently dropped
      await asUser('patch', tp, f.lead).send({
        instructors: [newCo.user.id],
        instructor: newCo.user.id,
      });
      const t = await Track.findById(f.track.id);
      expect(t.instructors.map((i) => i.id)).toContain(f.co.user.id);
      expect(t.instructor.id).toBe(f.lead.user.id);

      // admin: only instructors/admins, de-duplicated, lead not repeated
      const bad = { instructors: [learner.user.id] };
      expect(await st('patch', tp, f.admin, bad)).toBe(400);
      const ok = await asUser('patch', tp, f.admin).send({
        instructors: [newCo.user.id, newCo.user.id, f.lead.user.id],
      });
      expect(ok.status).toBe(200);
      const got = ok.body.data.track.instructors.map((i) => i._id);
      expect(got).toEqual([newCo.user.id]);

      // f.co was removed => access is gone immediately
      const body = { level: 'all' };
      expect(await st('patch', tp, f.co, body)).toBe(403);
      expect(await st('patch', tp, newCo, body)).toBe(200);

      // delete is admin-only, even for the lead
      expect(await st('delete', tp, f.lead)).toBe(403);
      expect(await st('delete', tp, f.admin)).toBe(204);
      expect(await Track.findById(f.track.id)).toBeNull();
    });

    it('a demoted instructor and a reassigned course lose access at once', async () => {
      const f = await buildAuthzFixture();
      const cp = `/v1/courses/${f.course.id}`;
      expect(await st('patch', cp, f.courseInst, { duration: 2 })).toBe(200);
      await User.updateOne({ _id: f.courseInst.user._id }, { role: 'student' });
      expect(await st('patch', cp, f.courseInst, { duration: 3 })).toBe(403);

      const toStranger = { instructor: f.stranger.user.id };
      expect(await st('patch', cp, f.admin, toStranger)).toBe(200);
      expect(await st('patch', cp, f.stranger, { duration: 4 })).toBe(200);
      // the former creator of the assignment never had authority
      const ap = `/v1/assignments/${f.assignment.id}`;
      expect(await st('delete', ap, f.former)).toBe(403);
    });

    it('deleting a user pulls them out of Track.instructors', async () => {
      const f = await buildAuthzFixture();
      const gone = await createTestUser({ role: 'instructor' });
      await Track.updateOne(
        { _id: f.track._id },
        { $addToSet: { instructors: gone.user._id } },
      );
      const up = `/v1/users/${gone.user.id}`;
      expect(await st('delete', up, f.admin)).toBe(204);
      const t = await Track.findById(f.track.id);
      expect(t.instructors.map((i) => i.id)).not.toContain(gone.user.id);
    });
  });

  describe('instructors response shape (no email/role)', () => {
    it('track responses expose only _id, name and photo', async () => {
      const f = await buildAuthzFixture();
      const list = await request(app).get('/v1/tracks');
      const detail = await request(app).get(`/v1/tracks/${f.track.id}`);
      const popular = await request(app).get('/v1/tracks/popular');
      const find = (res) =>
        res.body.data.tracks.find((t) => t._id === f.track.id);

      const tracks = [find(list), detail.body.data.track, find(popular)];
      expect(tracks.every(Boolean)).toBe(true);
      tracks.forEach((t) => {
        [t.instructor, ...t.instructors].forEach((u) => {
          expect(u).not.toHaveProperty('email');
          expect(u).not.toHaveProperty('role');
          expect(u).toHaveProperty('_id');
          expect(u).toHaveProperty('name');
        });
        expect(t.instructors).toHaveLength(2);
      });
    });
  });

  describe('GET /tracks?instructor= and draft visibility (rule 7)', () => {
    it('returns lead or co-instructor tracks; drafts only for managers', async () => {
      const f = await buildAuthzFixture();
      const draft = await Track.create({
        title: 'Draft Track',
        description: 'A draft led by the lead',
        instructor: f.lead.user._id,
        instructors: [f.co.user._id],
        published: false,
      });
      const ids = (res) => res.body.data.tracks.map((t) => t._id);
      const list = (who, query) => asUser('get', `/v1/tracks${query}`, who);
      const lq = `?instructor=${f.lead.user.id}`;
      const cq = `?instructor=${f.co.user.id}`;

      const asLead = await list(f.lead, lq);
      const both = expect.arrayContaining([f.track.id, draft.id]);
      expect(ids(asLead)).toEqual(both);
      const asCo = await list(f.co, cq);
      expect(ids(asCo)).toEqual(both);

      const asStranger = await list(f.stranger, lq);
      expect(ids(asStranger)).toContain(f.track.id);
      expect(ids(asStranger)).not.toContain(draft.id);

      const anon = await request(app).get(`/v1/tracks${cq}`);
      expect(ids(anon)).toEqual([f.track.id]);
      expect(ids(await list(f.admin, ''))).toContain(draft.id);
      const bad = await request(app).get('/v1/tracks?instructor=nope');
      expect(bad.status).toBe(400);

      // a demoted co-instructor stops seeing the draft
      await User.updateOne({ _id: f.co.user._id }, { role: 'student' });
      expect(ids(await list(f.co, ''))).not.toContain(draft.id);
      expect(await st('get', `/v1/tracks/${draft.id}`, f.co)).toBe(404);
    });

    it('draft courses and sessions follow the management rule', async () => {
      const f = await buildAuthzFixture();
      const dc = await Course.create({
        title: 'Draft Course',
        description: 'Draft in the authz track',
        instructor: f.courseInst.user._id,
        track: f.track._id,
        published: false,
      });
      const ds = await Session.create({
        title: 'Draft Session',
        instructor: f.sessionInst.user._id,
        tracks: [f.track._id],
        published: false,
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      });
      const cp = `/v1/courses/${dc.id}`;
      const sp = `/v1/sessions/${ds.id}`;

      expect(await st('get', cp, f.lead)).toBe(200);
      expect(await st('get', cp, f.courseInst)).toBe(200);
      expect(await st('get', cp, f.stranger)).toBe(404);
      expect(await st('get', cp, f.student)).toBe(404);
      expect(await st('get', sp, f.co)).toBe(200);
      expect(await st('get', sp, f.sessionInst)).toBe(200);
      expect(await st('get', sp, f.stranger)).toBe(404);
      expect(await st('get', sp, f.student)).toBe(404);

      const tl = `/v1/sessions/track/${f.track.id}`;
      const lead = await asUser('get', tl, f.lead);
      expect(lead.body.data.sessions.map((s) => s._id)).toContain(ds.id);
      const other = await asUser('get', tl, f.stranger);
      expect(other.body.data.sessions.map((s) => s._id)).not.toContain(ds.id);
      const courses = await asUser('get', '/v1/courses', f.stranger);
      expect(courses.body.data.courses.map((c) => c._id)).not.toContain(dc.id);
    });
  });

  describe('submissionCount / ungradedCount seam (#3.2)', () => {
    it('goes to everyone who can manage the assignment and nobody else', async () => {
      const f = await buildAuthzFixture();
      const staff = ['admin', 'lead', 'co', 'courseInst'];
      const others = ['sessionInst', 'former', 'stranger'];
      const paths = [
        `/v1/courses/${f.course.id}/assignments`,
        `/v1/tracks/${f.track.id}/assignments`,
      ];

      // eslint-disable-next-line no-restricted-syntax
      for (const name of [...staff, ...others]) {
        const isStaff = staff.includes(name);
        // eslint-disable-next-line no-restricted-syntax
        for (const path of paths) {
          // eslint-disable-next-line no-await-in-loop
          const res = await asUser('get', path, f.callers[name]);
          expect(res.status).toBe(200);
          const list = res.body.data.assignments;
          const a = list.find((x) => x._id === f.assignment.id);
          expect([name, 'submissionCount' in a]).toEqual([name, isStaff]);
          expect([name, 'ungradedCount' in a]).toEqual([name, isStaff]);
          if (isStaff) {
            expect(a.submissionCount).toBe(1);
            expect(a.ungradedCount).toBe(1);
          }
        }
      }

      const stu = await asUser('get', paths[0], f.student);
      expect(stu.body.data.assignments[0]).not.toHaveProperty(
        'submissionCount',
      );

      // a session assignment: its own instructor and track staff only
      const sa = await fresh.assignmentOnSession(f);
      const sessionPath = `/v1/sessions/${f.session.id}/assignments`;
      const seen = async (who) => {
        const res = await asUser('get', sessionPath, who);
        return res.body.data.assignments.find((x) => x._id === sa.id);
      };
      expect(await seen(f.sessionInst)).toHaveProperty('submissionCount');
      expect(await seen(f.co)).toHaveProperty('submissionCount');
      expect(await seen(f.courseInst)).not.toHaveProperty('submissionCount');
    });
  });

  describe('createdBy / instructor on creation (4A.5)', () => {
    it('a co-instructor keeps the course instructor as instructor', async () => {
      const f = await buildAuthzFixture();
      const path = `/v1/courses/${f.course.id}/assignments`;
      const res = await asUser('post', path, f.co).send({
        title: 'By co-instructor',
        description: "Created on someone else's course",
        deadline: deadline(),
      });
      expect(res.status).toBe(201);
      expect(res.body.data.assignment.instructor).toBe(f.courseInst.user.id);
      expect(res.body.data.assignment.createdBy).toBe(f.co.user.id);
    });
  });
});
