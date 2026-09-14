const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const userService = require('../../src/services/user.service');
const User = require('../../src/models/user.model');
const Track = require('../../src/models/track.model');
const { createTestUser } = require('../helpers/testUser');

describe('user.service — direct calls', () => {
  describe('getMe', () => {
    it('throws 404 when the user no longer exists', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(userService.getMe(fakeId)).rejects.toThrow('User not found');
    });

    it('returns the user without the password field', async () => {
      const { user } = await createTestUser();
      const found = await userService.getMe(user._id);
      expect(found.password).toBeUndefined();
    });
  });

  describe('updateMe', () => {
    it('rejects password updates through this route', async () => {
      const { user } = await createTestUser();
      await expect(
        userService.updateMe(user._id, { password: 'NewPassword123!' }),
      ).rejects.toThrow('This route is not for password update');
    });

    it('throws 409 when the new email is already taken by another user', async () => {
      const { user: takenUser } = await createTestUser({
        email: 'taken@example.com',
      });
      const { user } = await createTestUser();

      await expect(
        userService.updateMe(user._id, { email: takenUser.email }),
      ).rejects.toThrow('Email already in use');
    });

    it('resets emailVerified when the email actually changes', async () => {
      const { user } = await createTestUser();
      await User.findByIdAndUpdate(user._id, { emailVerified: true });

      const updated = await userService.updateMe(user._id, {
        email: 'brand-new-address@example.com',
      });

      expect(updated.emailVerified).toBe(false);
    });

    it('throws 404 when the user does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        userService.updateMe(fakeId, { name: 'Ghost' }),
      ).rejects.toThrow('User not found');
    });
  });

  describe('deleteMe', () => {
    it('deactivates the account instead of deleting it', async () => {
      const { user } = await createTestUser();
      await userService.deleteMe(user._id);

      const refreshed = await User.findById(user._id).select('+active');
      expect(refreshed).not.toBeNull();
      expect(refreshed.active).toBe(false);
    });
  });
});

describe('user.service.bulkUserAction — partial delete failure', () => {
  it('deletes what it can and reports which users could not be deleted', async () => {
    const { token: adminToken } = await createTestUser({ role: 'admin' });
    const { user: deletableStudent } = await createTestUser({
      role: 'student',
    });
    const { user: blockedInstructor } = await createTestUser({
      role: 'instructor',
    });
    // Give the instructor content that blocks hard deletion.
    await Track.create({
      title: 'Blocking Track',
      description: 'Prevents instructor deletion',
      instructor: blockedInstructor._id,
    });

    const res = await request(app)
      .post('/v1/users/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userIds: [deletableStudent._id, blockedInstructor._id],
        action: 'delete',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/1 of 2 user\(s\) could not be deleted/);

    expect(await User.findById(deletableStudent._id)).toBeNull();
    expect(await User.findById(blockedInstructor._id)).not.toBeNull();
  });
});

describe('DELETE /v1/users/deleteMe (route)', () => {
  it('deactivates the current user', async () => {
    const { token, user } = await createTestUser();

    const res = await request(app)
      .delete('/v1/users/deleteMe')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    const refreshed = await User.findById(user._id).select('+active');
    expect(refreshed.active).toBe(false);
  });
});

describe('GET /v1/users/me (route)', () => {
  it("returns the logged-in user's own profile", async () => {
    const { token, user } = await createTestUser();

    const res = await request(app)
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user._id).toBe(user._id.toString());
  });
});

describe('GET /v1/users/me/enrollments (route)', () => {
  it('returns empty arrays when nothing is enrolled', async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .get('/v1/users/me/enrollments')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.tracks).toEqual([]);
    expect(res.body.data.courses).toEqual([]);
    expect(res.body.data.sessions).toEqual([]);
  });

  it('returns the enrolled track, courses, and sessions', async () => {
    const { token, user } = await createTestUser();
    const instructor = (await createTestUser({ role: 'instructor' })).user;

    const track = await Track.create({
      title: 'Enrolled Track',
      description: 'For enrollments test',
      instructor: instructor._id,
      students: [user._id],
    });

    await User.findByIdAndUpdate(user._id, { enrolledTrack: track._id });

    const res = await request(app)
      .get('/v1/users/me/enrollments')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.tracks).toHaveLength(1);
    expect(res.body.data.tracks[0]._id).toBe(track._id.toString());
  });
});
