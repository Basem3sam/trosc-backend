const trackService = require('../src/services/track.service');
const courseService = require('../src/services/course.service');
const sessionService = require('../src/services/session.service');
const Track = require('../src/models/track.model');
const Course = require('../src/models/course.model');
const Session = require('../src/models/session.model');
const User = require('../src/models/user.model');
const { createTestUser } = require('./helpers/testUser');

describe('deactivated users cannot be assigned as instructors', () => {
  let admin;
  let activeInstructor;
  let inactiveInstructor;

  beforeEach(async () => {
    ({ user: admin } = await createTestUser({ role: 'admin' }));
    ({ user: activeInstructor } = await createTestUser({
      role: 'instructor',
    }));
    ({ user: inactiveInstructor } = await createTestUser({
      role: 'instructor',
    }));
    await User.findByIdAndUpdate(inactiveInstructor._id, { active: false });
  });

  const expect400 = async (promise, message) => {
    await expect(promise).rejects.toMatchObject({ statusCode: 400, message });
  };

  const DEACTIVATED = 'The selected instructor account is deactivated';

  describe('tracks', () => {
    it('rejects create', async () => {
      await expect400(
        trackService.createTrack(
          {
            title: 'T1',
            description: 'd',
            instructor: inactiveInstructor.id,
          },
          admin.id,
        ),
        DEACTIVATED,
      );
    });

    it('rejects update', async () => {
      const track = await Track.create({
        title: 'T2',
        description: 'd',
        instructor: activeInstructor._id,
      });
      await expect400(
        trackService.updateTrack(
          track.id,
          { instructor: inactiveInstructor.id },
          admin.id,
        ),
        DEACTIVATED,
      );
    });

    it('rejects a deactivated user in the co-instructors list', async () => {
      await expect400(
        trackService.createTrack(
          {
            title: 'T3',
            description: 'd',
            instructor: activeInstructor.id,
            instructors: [inactiveInstructor.id],
          },
          admin.id,
        ),
        'A selected co-instructor account is deactivated',
      );
    });

    it('still accepts an active instructor and co-instructor', async () => {
      const { user: coInstructor } = await createTestUser({
        role: 'instructor',
      });
      const track = await trackService.createTrack(
        {
          title: 'T4',
          description: 'd',
          instructor: activeInstructor.id,
          instructors: [coInstructor.id],
        },
        admin.id,
      );
      expect(track.id).toBeDefined();
    });
  });

  describe('courses', () => {
    it('rejects create', async () => {
      await expect400(
        courseService.createCourse(
          {
            title: 'C1',
            description: 'd',
            instructor: inactiveInstructor.id,
          },
          admin,
        ),
        DEACTIVATED,
      );
    });

    it('rejects update', async () => {
      const course = await Course.create({
        title: 'Course Two',
        description: 'Course description',
        instructor: activeInstructor._id,
      });
      await expect400(
        courseService.updateCourse(
          course.id,
          { instructor: inactiveInstructor.id },
          admin,
        ),
        DEACTIVATED,
      );
    });
  });

  describe('sessions', () => {
    it('rejects create', async () => {
      await expect400(
        sessionService.createSession(
          { title: 'S1', instructor: inactiveInstructor.id },
          admin.id,
        ),
        DEACTIVATED,
      );
    });

    it('rejects update', async () => {
      const session = await Session.create({
        title: 'S2',
        instructor: activeInstructor._id,
      });
      await expect400(
        sessionService.updateSession(
          session.id,
          { instructor: inactiveInstructor.id },
          admin.id,
        ),
        DEACTIVATED,
      );
    });

    it('still accepts an active instructor', async () => {
      const session = await sessionService.createSession(
        { title: 'S3', instructor: activeInstructor.id },
        admin.id,
      );
      expect(session.id).toBeDefined();
    });
  });
});
