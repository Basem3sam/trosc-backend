const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Course = require('../src/models/course.model');
const Session = require('../src/models/session.model');
const Assignment = require('../src/models/assignment.model');
const Event = require('../src/models/event.model');
const ActivityLog = require('../src/models/activitylog.model');
const assignmentService = require('../src/services/assignment.service');
const { createTestUser } = require('./helpers/testUser');
const { buildAuthzFixture } = require('./helpers/authzFixture');

const ROSTER_FIELDS = ['students', 'pendingStudents', 'pendingLeaves'];

const get = (url, caller) => {
  const req = request(app).get(url);
  return caller && caller.token
    ? req.set('Authorization', `Bearer ${caller.token}`)
    : req;
};

// Records every command Mongoose sends, with its arguments as text, so a
// test can look at the projection of the first read of a collection.
let calls = [];
const startCapture = () => {
  calls = [];
  mongoose.set('debug', (collection, method, ...args) => {
    calls.push({ collection, method, text: JSON.stringify(args) });
  });
};
const firstRead = (collection) =>
  calls.find(
    (c) =>
      c.collection === collection &&
      (c.method === 'find' || c.method === 'findOne'),
  );

afterEach(() => {
  mongoose.set('debug', false);
});

describe('track lists and detail - rosters only for those who receive them', () => {
  let f;
  let outsider;

  beforeEach(async () => {
    f = await buildAuthzFixture();
    outsider = await createTestUser();
  });

  const noRosters = (track) => {
    ROSTER_FIELDS.forEach((field) => expect(track[field]).toBeUndefined());
  };

  it('list: anonymous, outsider and unrelated instructor get flags and a count, no arrays', async () => {
    const trackId = f.track.id;
    // eslint-disable-next-line no-restricted-syntax
    for (const caller of [null, outsider, f.stranger]) {
      // eslint-disable-next-line no-await-in-loop
      const res = await get('/v1/tracks', caller);
      expect(res.status).toBe(200);
      const track = res.body.data.tracks.find((t) => t._id === trackId);
      noRosters(track);
      expect(track.studentCount).toBe(1);
      expect(track.isEnrolled).toBe(false);
      expect(track.isPending).toBe(false);
      expect(track.isPendingLeave).toBe(false);
    }
  });

  it('list: an enrolled student and a pending applicant see their own flags', async () => {
    const enrolled = await get('/v1/tracks', f.student);
    const applicant = await get('/v1/tracks', f.pending);

    const a = enrolled.body.data.tracks.find((t) => t._id === f.track.id);
    const b = applicant.body.data.tracks.find((t) => t._id === f.track.id);
    noRosters(a);
    noRosters(b);
    expect(a).toMatchObject({ studentCount: 1, isEnrolled: true });
    expect(a.isPending).toBe(false);
    expect(b).toMatchObject({ studentCount: 1, isEnrolled: false });
    expect(b.isPending).toBe(true);
  });

  it('list: the track lead, a co-instructor and an admin still get the arrays', async () => {
    const trackId = f.track.id;
    // eslint-disable-next-line no-restricted-syntax
    for (const caller of [f.lead, f.co, f.admin]) {
      // eslint-disable-next-line no-await-in-loop
      const res = await get('/v1/tracks', caller);
      const track = res.body.data.tracks.find((t) => t._id === trackId);
      expect(track.students).toHaveLength(1);
      expect(track.pendingStudents).toHaveLength(1);
      expect(track.pendingLeaves).toEqual([]);
      expect(track.studentCount).toBe(1);
    }
  });

  it('list: the roster arrays are left out of the query for anonymous and student callers only', async () => {
    startCapture();
    await get('/v1/tracks', null);
    const anonRead = firstRead('tracks');
    startCapture();
    await get('/v1/tracks', f.student);
    const studentRead = firstRead('tracks');
    startCapture();
    await get('/v1/tracks', f.admin);
    const adminRead = firstRead('tracks');

    [anonRead, studentRead].forEach((read) => {
      expect(read.text).toContain('"students":0');
      expect(read.text).toContain('"pendingStudents":0');
      expect(read.text).toContain('"pendingLeaves":0');
    });
    expect(adminRead.text).not.toContain('"students":0');
  });

  it('list: a ?fields= request keeps the old path (nothing excluded by the service)', async () => {
    const res = await get('/v1/tracks?fields=title,students', null);

    expect(res.status).toBe(200);
    const track = res.body.data.tracks.find((t) => t._id === f.track.id);
    // Redacted as before: the array is replaced by flags.
    expect(track.students).toBeUndefined();
    expect(track.isEnrolled).toBe(false);
  });

  it('detail: anonymous, outsider and pending applicant get no arrays; flags and count are right', async () => {
    const anon = await get(`/v1/tracks/${f.track.id}`, null);
    const out = await get(`/v1/tracks/${f.track.id}`, outsider);
    const app1 = await get(`/v1/tracks/${f.track.id}`, f.pending);

    [anon, out, app1].forEach((res) => {
      expect(res.status).toBe(200);
      noRosters(res.body.data.track);
      expect(res.body.data.track.studentCount).toBe(1);
      expect(res.body.data.track.isEnrolled).toBe(false);
    });
    expect(anon.body.data.track.isPending).toBe(false);
    expect(app1.body.data.track.isPending).toBe(true);
  });

  it('detail: an enrolled student gets the populated roster but no pending arrays', async () => {
    const res = await get(`/v1/tracks/${f.track.id}`, f.student);

    const { track } = res.body.data;
    expect(track.isEnrolled).toBe(true);
    expect(track.studentCount).toBe(1);
    expect(track.students).toHaveLength(1);
    expect(track.students[0]).toMatchObject({ _id: f.student.user.id });
    expect(track.students[0].name).toBeDefined();
    expect(track.students[0].email).toBeDefined();
    expect(track.pendingStudents).toBeUndefined();
    expect(track.pendingLeaves).toBeUndefined();
  });

  it('detail: lead, co-instructor and admin get the roster and both pending arrays', async () => {
    // eslint-disable-next-line no-restricted-syntax
    for (const caller of [f.lead, f.co, f.admin]) {
      // eslint-disable-next-line no-await-in-loop
      const res = await get(`/v1/tracks/${f.track.id}`, caller);
      const { track } = res.body.data;
      expect(track.students).toHaveLength(1);
      expect(track.students[0].name).toBeDefined();
      expect(track.pendingStudents).toHaveLength(1);
      expect(track.pendingLeaves).toEqual([]);
      expect(track.studentCount).toBe(1);
    }
  });

  it('detail: an unrelated instructor is treated like an outsider', async () => {
    const res = await get(`/v1/tracks/${f.track.id}`, f.stranger);

    noRosters(res.body.data.track);
    expect(res.body.data.track.isEnrolled).toBe(false);
  });

  it('detail: the roster is not read for a caller who does not receive it', async () => {
    startCapture();
    await get(`/v1/tracks/${f.track.id}`, outsider);
    expect(firstRead('tracks').text).toContain('"students":0');

    startCapture();
    await get(`/v1/tracks/${f.track.id}`, f.lead);
    expect(firstRead('tracks').text).toContain('"students":0');
    // ...and the staff roster comes from a separate, selected read.
    const rosterReads = calls.filter(
      (c) => c.collection === 'tracks' && c.text.includes('"students":1'),
    );
    expect(rosterReads.length).toBeGreaterThan(0);
  });
});

describe('course lists and detail', () => {
  let f;
  let outsider;

  beforeEach(async () => {
    f = await buildAuthzFixture();
    outsider = await createTestUser();
  });

  it('list: anonymous, outsider and unrelated instructor get isEnrolled and a count, no array', async () => {
    const courseId = f.course.id;
    // eslint-disable-next-line no-restricted-syntax
    for (const caller of [null, outsider, f.stranger]) {
      // eslint-disable-next-line no-await-in-loop
      const res = await get('/v1/courses', caller);
      const course = res.body.data.courses.find((c) => c._id === courseId);
      expect(course.students).toBeUndefined();
      expect(course.studentCount).toBe(1);
      expect(course.isEnrolled).toBe(false);
    }
  });

  it('list: the enrolled student is flagged; the course instructor and admin get the array', async () => {
    const student = await get('/v1/courses', f.student);
    const instructor = await get('/v1/courses', f.courseInst);
    const admin = await get('/v1/courses', f.admin);

    const pick = (res) =>
      res.body.data.courses.find((c) => c._id === f.course.id);
    expect(pick(student)).toMatchObject({ isEnrolled: true, studentCount: 1 });
    expect(pick(student).students).toBeUndefined();
    expect(pick(instructor).students).toHaveLength(1);
    expect(pick(admin).students).toHaveLength(1);
  });

  it('list: the roster is excluded from the query only for anonymous and student callers', async () => {
    startCapture();
    await get('/v1/courses', null);
    const anonRead = firstRead('courses');
    startCapture();
    await get('/v1/courses', f.admin);
    const adminRead = firstRead('courses');

    expect(anonRead.text).toContain('"students":0');
    expect(adminRead.text).not.toContain('"students":0');
  });

  it('sub-lists (by track, by instructor) follow the same rule', async () => {
    const byTrack = await get(`/v1/courses/track/${f.track.id}`, null);
    const byInstructor = await get(
      `/v1/courses/instructor/${f.courseInst.user.id}`,
      f.student,
    );

    [byTrack, byInstructor].forEach((res) => {
      expect(res.status).toBe(200);
      res.body.data.courses.forEach((course) => {
        expect(course.students).toBeUndefined();
        expect(typeof course.studentCount).toBe('number');
        expect(typeof course.isEnrolled).toBe('boolean');
      });
    });
    const mine = byInstructor.body.data.courses.find(
      (c) => c._id === f.course.id,
    );
    expect(mine).toMatchObject({ isEnrolled: true, studentCount: 1 });
  });

  it('detail: outsiders get a count and no roster; enrolled student and staff get it populated', async () => {
    const anon = await get(`/v1/courses/${f.course.id}`, null);
    const stranger = await get(`/v1/courses/${f.course.id}`, f.stranger);
    const enrolled = await get(`/v1/courses/${f.course.id}`, f.student);
    const owner = await get(`/v1/courses/${f.course.id}`, f.courseInst);
    const admin = await get(`/v1/courses/${f.course.id}`, f.admin);

    [anon, stranger].forEach((res) => {
      expect(res.body.data.course.students).toBeUndefined();
      expect(res.body.data.course.studentCount).toBe(1);
      expect(res.body.data.course.isEnrolled).toBe(false);
    });
    [enrolled, owner, admin].forEach((res) => {
      const { course } = res.body.data;
      expect(course.students).toHaveLength(1);
      expect(course.students[0].name).toBeDefined();
      expect(course.studentCount).toBe(1);
    });
    expect(enrolled.body.data.course.isEnrolled).toBe(true);
  });

  it('detail: the roster is not read for an outsider', async () => {
    startCapture();
    await get(`/v1/courses/${f.course.id}`, outsider);

    expect(firstRead('courses').text).toContain('"students":0');
  });
});

describe('session lists and detail', () => {
  let f;
  let outsider;
  let direct;

  beforeEach(async () => {
    f = await buildAuthzFixture();
    outsider = await createTestUser();
    direct = await createTestUser();
    await Session.updateOne(
      { _id: f.session._id },
      {
        $set: { url: 'https://drive.google.com/file/d/abc123/view' },
        $push: {
          students: direct.user._id,
          progress: {
            student: direct.user._id,
            status: 'watched',
            watchedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        },
      },
    );
  });

  it('list: never sends students or progress; count and isEnrolled come from the database', async () => {
    const asDirect = await get('/v1/sessions', direct);
    const asOutsider = await get('/v1/sessions', outsider);

    const pick = (res) =>
      res.body.data.sessions.find((s) => s._id === f.session.id);
    [asDirect, asOutsider].forEach((res) => {
      const item = pick(res);
      expect(item.students).toBeUndefined();
      expect(item.progress).toBeUndefined();
      expect(item.studentCount).toBe(1);
    });
    expect(pick(asDirect).isEnrolled).toBe(true);
    expect(pick(asDirect).url).toBeDefined();
    expect(pick(asOutsider).isEnrolled).toBe(false);
    expect(pick(asOutsider).url).toBeUndefined();
  });

  it('list: students and progress are excluded from the query', async () => {
    startCapture();
    await get('/v1/sessions', outsider);

    const read = firstRead('sessions');
    expect(read.text).toContain('"students":0');
    expect(read.text).toContain('"progress":0');
  });

  it('list: admin, session instructor and unrelated instructor get the same shape', async () => {
    const sessionId = f.session.id;
    // eslint-disable-next-line no-restricted-syntax
    for (const caller of [f.admin, f.sessionInst, f.stranger]) {
      // eslint-disable-next-line no-await-in-loop
      const res = await get('/v1/sessions', caller);
      const item = res.body.data.sessions.find((s) => s._id === sessionId);
      expect(item.students).toBeUndefined();
      expect(item.progress).toBeUndefined();
      expect(item.studentCount).toBe(1);
      expect(item.isEnrolled).toBe(false);
    }
    const asAdmin = await get('/v1/sessions', f.admin);
    const adminItem = asAdmin.body.data.sessions.find(
      (s) => s._id === f.session.id,
    );
    expect(adminItem.url).toBeDefined();
  });

  it('detail: an outsider gets a count, no roster, no content and tracks without students', async () => {
    const res = await get(`/v1/sessions/${f.session.id}`, outsider);

    const { session } = res.body.data;
    expect(res.status).toBe(200);
    expect(session.students).toBeUndefined();
    expect(session.progress).toBeUndefined();
    expect(session.studentCount).toBe(1);
    expect(session.isEnrolled).toBe(false);
    expect(session.url).toBeUndefined();
    expect(session.myProgress).toBeUndefined();
    expect(session.tracks).toHaveLength(1);
    expect(session.tracks[0]).toMatchObject({
      _id: f.track.id,
      title: 'Authz Track',
    });
    expect(session.tracks[0].students).toBeUndefined();
  });

  it('detail: a direct student sees content, the populated roster and their own progress', async () => {
    const res = await get(`/v1/sessions/${f.session.id}`, direct);

    const { session } = res.body.data;
    expect(session.isEnrolled).toBe(true);
    expect(session.url).toBeDefined();
    expect(session.students).toHaveLength(1);
    expect(session.students[0]).toMatchObject({ _id: direct.user.id });
    expect(session.students[0].name).toBeDefined();
    expect(session.myProgress).toMatchObject({ status: 'watched' });
    expect(session.progress).toBeUndefined();
  });

  it('detail: a student enrolled through the parent track is enrolled, with not_started progress', async () => {
    const res = await get(`/v1/sessions/${f.session.id}`, f.student);

    const { session } = res.body.data;
    expect(session.isEnrolled).toBe(true);
    expect(session.url).toBeDefined();
    expect(session.myProgress).toEqual({
      status: 'not_started',
      watchedAt: null,
    });
  });

  it('detail: a student enrolled through the parent course is enrolled', async () => {
    const viaCourse = await Session.create({
      title: 'Course Session',
      instructor: f.sessionInst.user._id,
      course: f.course._id,
      published: true,
      url: 'https://drive.google.com/file/d/xyz789/view',
    });

    const res = await get(`/v1/sessions/${viaCourse.id}`, f.student);
    const outside = await get(`/v1/sessions/${viaCourse.id}`, outsider);

    expect(res.body.data.session.isEnrolled).toBe(true);
    expect(res.body.data.session.url).toBeDefined();
    expect(outside.body.data.session.isEnrolled).toBe(false);
    expect(outside.body.data.session.url).toBeUndefined();
  });

  it('detail: admin and the session instructor see content and the roster without being enrolled', async () => {
    // eslint-disable-next-line no-restricted-syntax
    for (const caller of [f.admin, f.sessionInst]) {
      // eslint-disable-next-line no-await-in-loop
      const res = await get(`/v1/sessions/${f.session.id}`, caller);
      const { session } = res.body.data;
      expect(session.url).toBeDefined();
      expect(session.students).toHaveLength(1);
      expect(session.isEnrolled).toBe(false);
      expect(session.myProgress).toBeUndefined();
    }
  });

  it('detail: the roster is not read for an outsider, and the tracks are populated without students', async () => {
    startCapture();
    await get(`/v1/sessions/${f.session.id}`, outsider);

    expect(firstRead('sessions').text).toContain('"students":0');
    const trackRead = firstRead('tracks');
    expect(trackRead.text).not.toContain('"students":1');
  });

  it('detail: an unknown session is still a 404', async () => {
    const res = await get(
      `/v1/sessions/${new mongoose.Types.ObjectId()}`,
      outsider,
    );

    expect(res.status).toBe(404);
  });
});

describe('assignments - own submission and counts without loading submissions', () => {
  let f;
  let outsider;

  beforeEach(async () => {
    f = await buildAuthzFixture();
    outsider = await createTestUser();
  });

  const list = (caller) =>
    get(`/v1/courses/${f.course.id}/assignments`, caller);

  it('an enrolled student gets only their own submission, no counts', async () => {
    const res = await list(f.student);

    expect(res.status).toBe(200);
    const [assignment] = res.body.data.assignments;
    expect(assignment.submissions).toBeUndefined();
    expect(assignment.submissionCount).toBeUndefined();
    expect(assignment.ungradedCount).toBeUndefined();
    expect(assignment.mySubmission).toMatchObject({
      student: f.student.user.id,
      file: 'https://drive.google.com/file/d/abc123/view',
    });
    expect(Object.keys(assignment.mySubmission).sort()).toEqual(
      ['_id', 'file', 'student', 'submittedAt'].sort(),
    );
  });

  it('another enrolled student with no submission gets mySubmission null', async () => {
    const other = await createTestUser();
    await Course.updateOne(
      { _id: f.course._id },
      { $addToSet: { students: other.user._id } },
    );

    const res = await list(other);

    expect(res.body.data.assignments[0].mySubmission).toBeNull();
    expect(res.body.data.assignments[0].submissionCount).toBeUndefined();
  });

  it('an unenrolled student is still refused', async () => {
    const res = await list(outsider);

    expect(res.status).toBe(403);
  });

  it('staff of the assignment get the two counts and mySubmission null', async () => {
    // eslint-disable-next-line no-restricted-syntax
    for (const caller of [f.admin, f.courseInst, f.lead, f.co]) {
      // eslint-disable-next-line no-await-in-loop
      const res = await list(caller);
      const [assignment] = res.body.data.assignments;
      expect(assignment.submissions).toBeUndefined();
      expect(assignment.mySubmission).toBeNull();
      expect(assignment.submissionCount).toBe(1);
      expect(assignment.ungradedCount).toBe(1);
    }
  });

  it('an unrelated instructor gets no counts', async () => {
    const res = await list(f.stranger);

    const [assignment] = res.body.data.assignments;
    expect(assignment.submissionCount).toBeUndefined();
    expect(assignment.ungradedCount).toBeUndefined();
    expect(assignment.mySubmission).toBeNull();
  });

  it('counts follow the data: a grade of 0 counts as graded; a second submission counts', async () => {
    const other = await createTestUser();
    await Assignment.updateOne(
      { _id: f.assignment._id },
      {
        $set: { 'submissions.0.grade': 0 },
        $push: {
          submissions: {
            student: other.user._id,
            file: 'https://drive.google.com/file/d/def456/view',
          },
        },
      },
    );

    const res = await list(f.admin);

    const [assignment] = res.body.data.assignments;
    expect(assignment.submissionCount).toBe(2);
    expect(assignment.ungradedCount).toBe(1);
  });

  it('the track view uses the same shape', async () => {
    const asStudent = await get(
      `/v1/tracks/${f.track.id}/assignments`,
      f.student,
    );
    const asLead = await get(`/v1/tracks/${f.track.id}/assignments`, f.lead);

    expect(asStudent.status).toBe(200);
    expect(asStudent.body.data.assignments[0].mySubmission).toBeTruthy();
    expect(asStudent.body.data.assignments[0].submissionCount).toBeUndefined();
    expect(asLead.body.data.assignments[0].submissionCount).toBe(1);
    expect(asLead.body.data.assignments[0].mySubmission).toBeNull();
  });

  it('the submissions array is not read from the database', async () => {
    startCapture();
    await list(f.student);

    const read = firstRead('assignments');
    expect(read.text).toContain('"submissions":0');
    // The only other assignments command is the aggregation.
    const aggregate = calls.find(
      (c) => c.collection === 'assignments' && c.method === 'aggregate',
    );
    expect(aggregate).toBeDefined();
  });
});

describe('enrollment checks do not need the roster', () => {
  it('an already enrolled student is refused with the same message', async () => {
    const f = await buildAuthzFixture();
    await Course.updateOne({ _id: f.course._id }, { access: 'public' });

    const res = await request(app)
      .post(`/v1/courses/${f.course.id}/enroll-me`)
      .set('Authorization', `Bearer ${f.student.token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('You are already enrolled in this course');
  });

  it('the course is read without its roster when enrolling', async () => {
    const f = await buildAuthzFixture();
    await Course.updateOne({ _id: f.course._id }, { access: 'public' });
    const other = await createTestUser();

    startCapture();
    const res = await request(app)
      .post(`/v1/courses/${f.course.id}/enroll-me`)
      .set('Authorization', `Bearer ${other.token}`);

    expect(res.status).toBe(200);
    expect(firstRead('courses').text).toContain('"students":0');
  });
});

describe('photo is no longer carried by roster-style populates', () => {
  it('pending lists carry name, email and role, not photo', async () => {
    const f = await buildAuthzFixture();

    const res = await get(`/v1/tracks/${f.track.id}/pending`, f.lead);

    expect(res.status).toBe(200);
    const [applicant] = res.body.data.pendingStudents;
    expect(applicant).toMatchObject({ _id: f.pending.user.id });
    expect(applicant.name).toBeDefined();
    expect(applicant.email).toBeDefined();
    expect(applicant.photo).toBeUndefined();
  });

  it('event attendees carry the name, not photo; the creator keeps photo', async () => {
    const { user: creator } = await createTestUser({
      role: 'admin',
      photo: 'https://res.cloudinary.com/demo/creator.jpg',
    });
    const { user: attendee } = await createTestUser({
      photo: 'https://res.cloudinary.com/demo/attendee.jpg',
    });
    const { insertedId } = await Event.collection.insertOne({
      title: 'Event',
      description: 'An event',
      date: new Date(Date.now() + 86400000),
      locationType: 'online',
      createdBy: creator._id,
      attendees: [attendee._id],
    });

    const res = await get(`/v1/events/${insertedId}`, null);

    expect(res.status).toBe(200);
    const { event } = res.body.data;
    expect(event.attendees[0].name).toBe(attendee.name);
    expect(event.attendees[0].photo).toBeUndefined();
    expect(event.createdBy.photo).toBe(
      'https://res.cloudinary.com/demo/creator.jpg',
    );
  });

  it('assignment submissions carry the student name and email, not photo; the instructor keeps photo', async () => {
    const f = await buildAuthzFixture();

    const assignment = await assignmentService.getAssignmentById(
      f.assignment.id,
    );

    const [submission] = assignment.submissions;
    expect(submission.student.name).toBeDefined();
    expect(submission.student.email).toBeDefined();
    expect(submission.student.photo).toBeUndefined();
    expect(assignment.instructor.name).toBeDefined();
    expect('photo' in assignment.instructor).toBe(true);
  });

  it('the admin activity-log list carries the actor name, email and role, not photo', async () => {
    const { user: admin, token } = await createTestUser({ role: 'admin' });
    const { user } = await createTestUser({
      photo: 'https://res.cloudinary.com/demo/actor.jpg',
    });
    await ActivityLog.collection.insertOne({
      user: user._id,
      action: 'login',
      createdAt: new Date(),
    });

    const res = await request(app)
      .get('/v1/activity-logs')
      .set('Authorization', `Bearer ${token}`);

    expect(admin).toBeDefined();
    expect(res.status).toBe(200);
    const row = res.body.data.activityLogs.find(
      (log) => log.user && log.user._id === user.id,
    );
    expect(row.user.name).toBe(user.name);
    expect(row.user.photo).toBeUndefined();
  });

  it('single instructor and staff roster populates are unchanged', async () => {
    const f = await buildAuthzFixture();

    const res = await get(`/v1/tracks/${f.track.id}`, f.lead);

    // Single instructor/creator populates and the documented staff roster
    // (name, email, photo) are not part of this change.
    expect(res.body.data.track.instructor.name).toBeDefined();
    expect(res.body.data.track.students[0]).toHaveProperty('email');
  });
});
