const request = require('supertest');
const app = require('../src/app');
const Track = require('../src/models/track.model');
const { buildAuthzFixture, fresh } = require('./helpers/authzFixture');

// Stage 4 permission matrix: caller x resource x action. Every action runs
// once per caller against a FRESH target, so destructive actions can be
// checked for each caller. Allowed callers must get a non-error status;
// everyone else gets 403 (authenticated) or 401 (anonymous).
const ALL = [
  'admin',
  'lead',
  'co',
  'courseInst',
  'sessionInst',
  'former',
  'stranger',
  'demoted',
  'student',
  'anon',
];

const send = (method, path, token, body) => {
  let req = request(app)[method](path).redirects(0);
  if (token) req = req.set('Authorization', `Bearer ${token}`);
  return body ? req.send(body) : req.send();
};

const subPath = (a, f) =>
  `/v1/assignments/${a.id}/submissions/${f.student.user.id}`;

// [label, allowedCallers, (f, token) => Promise<response>]
const ACTIONS = [
  // ---- tracks ----------------------------------------------------------
  [
    'track: edit',
    ['admin', 'lead', 'co'],
    (f, t) => send('patch', `/v1/tracks/${f.track.id}`, t, { level: 'all' }),
  ],
  [
    'track: join/leave handling (pending list)',
    ['admin', 'lead', 'co'],
    (f, t) => send('get', `/v1/tracks/${f.track.id}/pending`, t),
  ],
  [
    'track: leaves list (gated since stage 4)',
    ['admin', 'lead', 'co'],
    (f, t) => send('get', `/v1/tracks/${f.track.id}/leaves`, t),
  ],
  [
    'track: analytics (gated since stage 4)',
    ['admin', 'lead', 'co'],
    (f, t) => send('get', `/v1/tracks/${f.track.id}/analytics`, t),
  ],
  [
    'track: reject a pending join request',
    ['admin', 'lead', 'co'],
    async (f, t) => {
      const res = await send(
        'post',
        `/v1/tracks/${f.track.id}/students/${f.pending.user.id}/reject`,
        t,
      );
      // a second allowed caller finds nothing pending (400) - still "allowed"
      return res.status === 400 ? { status: 200 } : res;
    },
  ],
  [
    'track: delete (admin only)',
    ['admin'],
    async (f, t) => {
      const track = await Track.create({
        title: `Deletable ${Math.random()}`,
        description: 'A throwaway track',
        instructor: f.lead.user._id,
        instructors: [f.co.user._id],
      });
      return send('delete', `/v1/tracks/${track.id}`, t);
    },
  ],
  [
    'track: change instructors (non-admins are dropped, not applied)',
    ['admin', 'lead', 'co'],
    (f, t) =>
      send('patch', `/v1/tracks/${f.track.id}`, t, {
        title: `Renamed ${Math.random().toString(36).slice(2, 8)}`,
        instructors: [f.co.user.id],
      }),
  ],
  // ---- courses ---------------------------------------------------------
  [
    'course: edit',
    ['admin', 'lead', 'co', 'courseInst'],
    (f, t) => send('patch', `/v1/courses/${f.course.id}`, t, { duration: 5 }),
  ],
  [
    'course: delete',
    ['admin', 'lead', 'co', 'courseInst'],
    async (f, t) => {
      const c = await fresh.course(f, f.courseInst);
      return send('delete', `/v1/courses/${c.id}`, t);
    },
  ],
  [
    'course: manage students (remove)',
    ['admin', 'lead', 'co', 'courseInst'],
    (f, t) =>
      send(
        'delete',
        `/v1/courses/${f.course.id}/students/${f.student.user.id}`,
        t,
      ).then((res) => (res.status === 400 ? { status: 200 } : res)),
  ],
  [
    'course: unlink from track',
    ['admin', 'lead', 'co', 'courseInst'],
    async (f, t) => {
      const c = await fresh.course(f, f.courseInst);
      return send('delete', `/v1/tracks/${f.track.id}/courses/${c.id}`, t);
    },
  ],
  [
    'course: link a standalone course owned by courseInst',
    ['admin'],
    async (f, t) => {
      const c = await fresh.course(f, f.courseInst, null);
      return send('patch', `/v1/tracks/${f.track.id}/courses/${c.id}`, t);
    },
  ],
  [
    'course: link a standalone course owned by the track lead',
    ['admin', 'lead'],
    async (f, t) => {
      const c = await fresh.course(f, f.lead, null);
      return send('patch', `/v1/tracks/${f.track.id}/courses/${c.id}`, t);
    },
  ],
  // ---- sessions --------------------------------------------------------
  [
    'session: edit',
    ['admin', 'lead', 'co', 'sessionInst'],
    (f, t) =>
      send('patch', `/v1/sessions/${f.session.id}`, t, { duration: 30 }),
  ],
  [
    'session: delete',
    ['admin', 'lead', 'co', 'sessionInst'],
    async (f, t) => {
      const s = await fresh.session(f, f.sessionInst);
      return send('delete', `/v1/sessions/${s.id}`, t);
    },
  ],
  [
    'session: unlink from track',
    ['admin', 'lead', 'co', 'sessionInst'],
    async (f, t) => {
      const s = await fresh.session(f, f.sessionInst);
      return send('delete', `/v1/tracks/${f.track.id}/sessions/${s.id}`, t);
    },
  ],
  [
    'session: link a standalone session owned by sessionInst',
    ['admin'],
    async (f, t) => {
      const s = await fresh.session(f, f.sessionInst, null);
      return send('patch', `/v1/tracks/${f.track.id}/sessions/${s.id}`, t);
    },
  ],
  [
    'session: link a standalone session owned by a co-instructor',
    ['admin', 'co'],
    async (f, t) => {
      const s = await fresh.session(f, f.co, null);
      return send('patch', `/v1/tracks/${f.track.id}/sessions/${s.id}`, t);
    },
  ],
  // ---- assignments -----------------------------------------------------
  [
    'assignment: create on a course',
    ['admin', 'lead', 'co', 'courseInst'],
    (f, t) =>
      send('post', `/v1/courses/${f.course.id}/assignments`, t, {
        title: 'New assignment',
        description: 'Created through the matrix test',
        deadline: new Date(Date.now() + 86400000).toISOString(),
      }),
  ],
  [
    'assignment: create on a session',
    ['admin', 'lead', 'co', 'sessionInst'],
    (f, t) =>
      send('post', `/v1/sessions/${f.session.id}/assignments`, t, {
        title: 'New session assignment',
        description: 'Created through the matrix test',
        deadline: new Date(Date.now() + 86400000).toISOString(),
      }),
  ],
  [
    'assignment: view with submissions (GET /assignments/:id)',
    ['admin', 'lead', 'co', 'courseInst'],
    (f, t) => send('get', `/v1/assignments/${f.assignment.id}`, t),
  ],
  [
    'assignment: edit',
    ['admin', 'lead', 'co', 'courseInst'],
    (f, t) =>
      send('patch', `/v1/assignments/${f.assignment.id}`, t, {
        title: 'Edited assignment',
      }),
  ],
  [
    'assignment: grade',
    ['admin', 'lead', 'co', 'courseInst'],
    (f, t) =>
      send('patch', `${subPath(f.assignment, f)}/grade`, t, { grade: 90 }),
  ],
  [
    'assignment: open a submission file',
    ['admin', 'lead', 'co', 'courseInst'],
    (f, t) => send('get', `${subPath(f.assignment, f)}/file`, t),
  ],
  [
    'assignment: delete',
    ['admin', 'lead', 'co', 'courseInst'],
    async (f, t) => {
      const a = await fresh.assignmentOnCourse(f);
      return send('delete', `/v1/assignments/${a.id}`, t);
    },
  ],
  [
    'assignment on a session: grade',
    ['admin', 'lead', 'co', 'sessionInst'],
    async (f, t) => {
      const a = await fresh.assignmentOnSession(f);
      return send('patch', `${subPath(a, f)}/grade`, t, { grade: 70 });
    },
  ],
  // ---- weekly tasks ----------------------------------------------------
  [
    'weekly task: create',
    ['admin', 'lead', 'co', 'courseInst'],
    (f, t) =>
      send('post', `/v1/courses/${f.course.id}/weekly-tasks`, t, {
        week: 40 + Math.floor(Math.random() * 1000),
        title: 'New week',
        items: [{ title: 'Do the thing' }],
      }),
  ],
  [
    'weekly task: edit',
    ['admin', 'lead', 'co', 'courseInst'],
    (f, t) =>
      send('patch', `/v1/weekly-tasks/${f.task.id}`, t, { title: 'Edited' }),
  ],
  [
    'weekly task: delete',
    ['admin', 'lead', 'co', 'courseInst'],
    async (f, t) => {
      const task = await fresh.task(f);
      return send('delete', `/v1/weekly-tasks/${task.id}`, t);
    },
  ],
];

describe('Stage 4 permission matrix', () => {
  it.each(ACTIONS)('%s', async (label, allowed, run) => {
    const f = await buildAuthzFixture();

    // eslint-disable-next-line no-restricted-syntax
    for (const name of ALL) {
      // eslint-disable-next-line no-await-in-loop
      const res = await run(f, f.callers[name].token);
      if (allowed.includes(name)) {
        expect([name, res.status < 400]).toEqual([name, true]);
      } else {
        expect([name, res.status]).toEqual([name, name === 'anon' ? 401 : 403]);
      }
    }
  });
});
