const policy = require('../../src/services/policy.service');
const { buildAuthzFixture } = require('../helpers/authzFixture');

// Stage 4 management policy (the older read/visibility policy keeps its own
// file, tests/services/policy.service.test.js).
describe('policy.service management rule', () => {
  const admin = { id: 'a1', role: 'admin' };
  const lead = { id: 'l1', role: 'instructor' };
  const co = { id: 'c1', role: 'instructor' };
  const owner = { id: 'o1', role: 'instructor' };
  const stranger = { id: 's1', role: 'instructor' };
  const demoted = { id: 'c1', role: 'student' };
  const student = { id: 'st1', role: 'student' };

  const track = { instructor: 'l1', instructors: ['c1', { _id: 'c2' }] };
  const course = { instructor: 'o1' };
  const session = { instructor: 'o1' };

  describe('isTrackStaff / canManageTrack', () => {
    it('allows the lead and co-instructors with the instructor role', () => {
      expect(policy.isTrackStaff(track, lead)).toBe(true);
      expect(policy.isTrackStaff(track, co)).toBe(true);
      expect(policy.isTrackStaff(track, { id: 'c2', role: 'instructor' })).toBe(
        true,
      );
    });

    it('denies everyone else, including a demoted co-instructor', () => {
      expect(policy.isTrackStaff(track, stranger)).toBe(false);
      expect(policy.isTrackStaff(track, demoted)).toBe(false);
      expect(policy.isTrackStaff(track, student)).toBe(false);
      expect(policy.isTrackStaff(track, null)).toBe(false);
      expect(policy.isTrackStaff(null, lead)).toBe(false);
    });

    it('always allows an admin', () => {
      expect(policy.canManageTrack(admin, track)).toBe(true);
      expect(policy.canManageTrack(admin, null)).toBe(true);
      expect(policy.canManageTrack(stranger, track)).toBe(false);
    });
  });

  describe('canManageCourse', () => {
    it('allows the course instructor, track staff and admins', () => {
      expect(policy.canManageCourse(owner, course, null)).toBe(true);
      expect(policy.canManageCourse(lead, course, track)).toBe(true);
      expect(policy.canManageCourse(co, course, track)).toBe(true);
      expect(policy.canManageCourse(admin, course, track)).toBe(true);
    });

    it('denies unrelated instructors, students and a lost role', () => {
      expect(policy.canManageCourse(stranger, course, track)).toBe(false);
      expect(policy.canManageCourse(lead, course, null)).toBe(false);
      expect(policy.canManageCourse(student, course, track)).toBe(false);
      expect(
        policy.canManageCourse({ id: 'o1', role: 'student' }, course, null),
      ).toBe(false);
    });
  });

  describe('canManageSession', () => {
    it('allows own instructor, its course rule and ANY of its tracks', () => {
      expect(policy.canManageSession(owner, session)).toBe(true);
      const other = { instructor: 'x', instructors: [] };
      const ctx = { tracks: [other, track] };
      expect(policy.canManageSession(co, session, ctx)).toBe(true);
      expect(policy.canManageSession(stranger, session, ctx)).toBe(false);
      const viaCourse = { course: { instructor: 'c1' } };
      expect(policy.canManageSession(co, session, viaCourse)).toBe(true);
    });

    it('a standalone session is managed by its instructor and admins only', () => {
      expect(policy.canManageSession(owner, session, {})).toBe(true);
      expect(policy.canManageSession(admin, session, {})).toBe(true);
      expect(policy.canManageSession(lead, session, {})).toBe(false);
    });
  });

  describe('assignments and weekly tasks use the PARENT, never createdBy', () => {
    const parentCourse = { type: 'course', course, track };

    it('canManageAssignment follows the parent course/session', () => {
      expect(policy.canManageAssignment(owner, parentCourse)).toBe(true);
      expect(policy.canManageAssignment(co, parentCourse)).toBe(true);
      expect(policy.canManageAssignment(stranger, parentCourse)).toBe(false);
      expect(policy.canManageAssignment(admin, null)).toBe(true);
      expect(policy.canManageAssignment(owner, null)).toBe(false);
      const parentSession = { type: 'session', session, tracks: [track] };
      expect(policy.canManageAssignment(lead, parentSession)).toBe(true);
    });

    it('canManageWeeklyTask follows the parent course', () => {
      expect(policy.canManageWeeklyTask(owner, parentCourse)).toBe(true);
      expect(policy.canManageWeeklyTask(lead, parentCourse)).toBe(true);
      expect(policy.canManageWeeklyTask(stranger, parentCourse)).toBe(false);
    });
  });

  describe('linking rule', () => {
    const item = { instructor: 'o1' };

    it('link: admin, or own instructor who is staff of the TARGET track', () => {
      expect(policy.canLinkToTrack(admin, item, track)).toBe(true);
      expect(policy.canLinkToTrack(owner, item, track)).toBe(false);
      expect(policy.canLinkToTrack(lead, item, track)).toBe(false);
      const mine = { instructor: 'l1' };
      expect(policy.canLinkToTrack(lead, mine, track)).toBe(true);
      expect(policy.canLinkToTrack(lead, mine, { instructor: 'zz' })).toBe(
        false,
      );
    });

    it("unlink: admin, track staff, or the item's own instructor", () => {
      expect(policy.canUnlinkFromTrack(admin, item, track)).toBe(true);
      expect(policy.canUnlinkFromTrack(lead, item, track)).toBe(true);
      expect(policy.canUnlinkFromTrack(owner, item, track)).toBe(true);
      expect(policy.canUnlinkFromTrack(stranger, item, track)).toBe(false);
      expect(policy.canUnlinkFromTrack(student, item, track)).toBe(false);
    });
  });

  describe('list helpers', () => {
    const scope = { trackIds: ['t1'], courseIds: ['c9'] };

    it('manageableListFilter: admin all, others published (+ managed drafts)', () => {
      expect(policy.manageableListFilter(admin, scope, 'track')).toEqual({});
      expect(policy.manageableListFilter(null, scope, 'course')).toEqual({
        published: true,
      });
      expect(policy.manageableListFilter(student, scope, 'session')).toEqual({
        published: true,
      });
      const f = policy.manageableListFilter(lead, scope, 'track');
      expect(f.$or).toEqual([
        { published: true },
        { instructor: 'l1' },
        { instructors: 'l1' },
      ]);
    });

    it('andFilters drops empty fragments and ANDs the rest', () => {
      expect(policy.andFilters({}, {})).toEqual({});
      expect(policy.andFilters({ a: 1 }, {}, { b: 2 })).toEqual({
        $and: [{ a: 1 }, { b: 2 }],
      });
    });

    it('isSessionStaffByScope / isCourseStaffByScope use the loaded scope', () => {
      const s = { instructor: 'x', tracks: ['t1'] };
      expect(policy.isSessionStaffByScope(s, lead, scope)).toBe(true);
      expect(policy.isSessionStaffByScope({ course: 'c9' }, lead, scope)).toBe(
        true,
      );
      expect(policy.isSessionStaffByScope(s, student, scope)).toBe(false);
      expect(policy.isCourseStaffByScope({ track: 't1' }, lead, scope)).toBe(
        true,
      );
      expect(policy.isCourseStaffByScope({ track: 't2' }, lead, scope)).toBe(
        false,
      );
      expect(policy.isCourseStaffByScope({}, admin, scope)).toBe(true);
    });
  });

  describe('decideManage / resolveManageableParents (database)', () => {
    it('returns allowed / denied / missing for each resource kind', async () => {
      const f = await buildAuthzFixture();
      const req = {};
      const u = (name) => f.callers[name].user;
      const check = (who, kind, id) =>
        policy.decideManage(req, u(who), kind, id.toString());

      expect(await check('lead', 'track', f.track._id)).toBe('allowed');
      expect(await check('stranger', 'track', f.track._id)).toBe('denied');
      expect(await check('courseInst', 'course', f.course._id)).toBe('allowed');
      expect(await check('sessionInst', 'session', f.session._id)).toBe(
        'allowed',
      );
      expect(await check('co', 'session', f.session._id)).toBe('allowed');
      expect(await check('co', 'assignment', f.assignment._id)).toBe('allowed');
      expect(await check('former', 'assignment', f.assignment._id)).toBe(
        'denied',
      );
      expect(await check('former', 'weeklyTask', f.task._id)).toBe('denied');
      expect(await check('courseInst', 'weeklyTask', f.task._id)).toBe(
        'allowed',
      );
      const ghost = '64b000000000000000000000';
      expect(await check('admin', 'course', ghost)).toBe('missing');
      await expect(check('lead', 'nonsense', ghost)).rejects.toThrow();
    });

    it('caches resolved documents on the request object', async () => {
      const f = await buildAuthzFixture();
      const req = {};
      await policy.decideManage(req, f.lead.user, 'track', f.track.id);
      expect(req.policyCache.track.has(f.track.id)).toBe(true);
    });

    it('resolveManageableParents resolves staff scope for a whole list', async () => {
      const f = await buildAuthzFixture();
      const input = {
        courseIds: [f.course._id, f.standaloneCourse._id],
        sessionIds: [f.session._id, f.standaloneSession._id],
      };
      const run = (who) =>
        policy.resolveManageableParents({}, f.callers[who].user, input);

      const adminAuth = await run('admin');
      expect(adminAuth.all).toBe(true);

      const co = await run('co');
      expect([...co.courses]).toEqual([f.course.id]);
      expect([...co.sessions]).toEqual([f.session.id]);

      const stranger = await run('stranger');
      expect([...stranger.courses]).toEqual([f.standaloneCourse.id]);
      expect([...stranger.sessions]).toEqual([f.standaloneSession.id]);

      const none = await run('student');
      expect(none.courses.size + none.sessions.size).toBe(0);
      expect(
        policy.isStaffOfAssignmentParent(co, { course: { _id: f.course._id } }),
      ).toBe(true);
    });
  });
});
