const request = require('supertest');
const app = require('../src/app');
const Assignment = require('../src/models/assignment.model');
const Track = require('../src/models/track.model');
const { createTestUser } = require('./helpers/testUser');
const {
  buildTrackAndCourseFixture,
  buildStandaloneSessionFixture,
} = require('./helpers/fixtures');

// BACKEND-REQUESTS-2 #3.2: staff of an assignment get `submissionCount` and
// `ungradedCount` on the list endpoints, so the Studio doesn't have to call
// GET /assignments/:id once per assignment. Students and non-managing
// instructors never get them. Counts only - no identities/files/grades.
describe('Assignment list: staff submission counts (#3.2)', () => {
  const inAWeek = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Three submissions: graded 90, graded 0 (a real grade - must NOT count
  // as ungraded), and not graded yet.
  async function buildCourseAssignmentWithSubmissions() {
    const fixture = await buildTrackAndCourseFixture();
    const s2 = (await createTestUser({ role: 'student' })).user;
    const s3 = (await createTestUser({ role: 'student' })).user;

    const assignment = await Assignment.create({
      title: 'Build a REST API',
      description: 'Create a full CRUD API',
      instructor: fixture.instructor._id,
      course: fixture.course._id,
      deadline: inAWeek(),
      submissions: [
        {
          student: fixture.student._id,
          file: 'https://drive.google.com/file/d/a',
          grade: 90,
        },
        {
          student: s2._id,
          file: 'https://drive.google.com/file/d/b',
          grade: 0,
        },
        { student: s3._id, file: 'https://drive.google.com/file/d/c' },
      ],
    });

    return { ...fixture, assignment };
  }

  describe('GET /v1/courses/:id/assignments', () => {
    it("gives the assignment's own instructor submissionCount and ungradedCount", async () => {
      const { course, instructorToken } =
        await buildCourseAssignmentWithSubmissions();

      const res = await request(app)
        .get(`/v1/courses/${course._id}/assignments`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      const [a] = res.body.data.assignments;
      expect(a.submissionCount).toBe(3);
      expect(a.ungradedCount).toBe(1);
      // the raw submissions array (other students' files/grades) is still
      // never exposed on a list endpoint
      expect(a.submissions).toBeUndefined();
    });

    it('gives an admin the counts too', async () => {
      const { course } = await buildCourseAssignmentWithSubmissions();
      const { token: adminToken } = await createTestUser({ role: 'admin' });

      const res = await request(app)
        .get(`/v1/courses/${course._id}/assignments`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.assignments[0].submissionCount).toBe(3);
      expect(res.body.data.assignments[0].ungradedCount).toBe(1);
    });

    it('reports zeros (not missing fields) when nobody has submitted', async () => {
      const fixture = await buildTrackAndCourseFixture();
      await Assignment.create({
        title: 'Empty',
        description: 'No submissions yet',
        instructor: fixture.instructor._id,
        course: fixture.course._id,
        deadline: inAWeek(),
      });

      const res = await request(app)
        .get(`/v1/courses/${fixture.course._id}/assignments`)
        .set('Authorization', `Bearer ${fixture.instructorToken}`);

      expect(res.body.data.assignments[0].submissionCount).toBe(0);
      expect(res.body.data.assignments[0].ungradedCount).toBe(0);
    });

    it('does NOT give counts to an instructor who does not manage the assignment', async () => {
      const { course, otherInstructorToken } =
        await buildCourseAssignmentWithSubmissions();

      const res = await request(app)
        .get(`/v1/courses/${course._id}/assignments`)
        .set('Authorization', `Bearer ${otherInstructorToken}`);

      expect(res.status).toBe(200);
      const [a] = res.body.data.assignments;
      expect(a.submissionCount).toBeUndefined();
      expect(a.ungradedCount).toBeUndefined();
      expect(a.submissions).toBeUndefined();
      expect(a.mySubmission).toBeNull();
    });

    it('does NOT give counts to a student, who still gets only their own mySubmission', async () => {
      const { course, studentToken, student } =
        await buildCourseAssignmentWithSubmissions();

      const res = await request(app)
        .get(`/v1/courses/${course._id}/assignments`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const [a] = res.body.data.assignments;
      expect(a.submissionCount).toBeUndefined();
      expect(a.ungradedCount).toBeUndefined();
      expect(a.submissions).toBeUndefined();
      expect(a.mySubmission.student).toBe(student._id.toString());
      expect(a.mySubmission.grade).toBe(90);
    });
  });

  describe('GET /v1/tracks/:id/assignments', () => {
    it('gives staff the counts on every assignment in the track', async () => {
      const { track, instructorToken } =
        await buildCourseAssignmentWithSubmissions();

      const res = await request(app)
        .get(`/v1/tracks/${track._id}/assignments`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.assignments[0].submissionCount).toBe(3);
      expect(res.body.data.assignments[0].ungradedCount).toBe(1);
    });

    it('does not give counts to an enrolled student', async () => {
      const { track, student, studentToken } =
        await buildCourseAssignmentWithSubmissions();
      await Track.findByIdAndUpdate(track._id, {
        $addToSet: { students: student._id },
      });

      const res = await request(app)
        .get(`/v1/tracks/${track._id}/assignments`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.assignments[0].submissionCount).toBeUndefined();
      expect(res.body.data.assignments[0].ungradedCount).toBeUndefined();
    });
  });

  describe('GET /v1/sessions/:id/assignments', () => {
    it('gives staff the counts for a standalone session', async () => {
      const { session, instructor, instructorToken, student } =
        await buildStandaloneSessionFixture();

      await Assignment.create({
        title: 'Session homework',
        description: 'After the webinar',
        instructor: instructor._id,
        session: session._id,
        deadline: inAWeek(),
        submissions: [
          { student: student._id, file: 'https://drive.google.com/file/d/z' },
        ],
      });

      const res = await request(app)
        .get(`/v1/sessions/${session._id}/assignments`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.assignments[0].submissionCount).toBe(1);
      expect(res.body.data.assignments[0].ungradedCount).toBe(1);
    });
  });
});
