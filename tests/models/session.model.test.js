const Session = require('../../src/models/session.model');
const { createTestUser } = require('../helpers/testUser');

describe('Session model — field validators', () => {
  let instructor;

  beforeEach(async () => {
    instructor = (await createTestUser({ role: 'instructor' })).user;
  });

  describe('url', () => {
    it('accepts a trusted-host https URL that is not YouTube/Drive', async () => {
      const session = await Session.create({
        title: 'Trusted Host Session',
        instructor: instructor._id,
        url: 'https://github.com/basem/repo',
      });
      expect(session.url).toBe('https://github.com/basem/repo');
    });

    it('rejects an https URL from an untrusted host', async () => {
      await expect(
        Session.create({
          title: 'Untrusted Host Session',
          instructor: instructor._id,
          url: 'https://totally-random-host.example.com/video',
        }),
      ).rejects.toThrow('Session URL must be a valid');
    });

    it('rejects a malformed url string', async () => {
      await expect(
        Session.create({
          title: 'Malformed URL Session',
          instructor: instructor._id,
          url: 'not a url at all',
        }),
      ).rejects.toThrow('Session URL must be a valid');
    });
  });

  describe('resources[].url', () => {
    it('accepts a trusted-host https resource URL', async () => {
      const session = await Session.create({
        title: 'Resources Session',
        instructor: instructor._id,
        resources: [
          { title: 'Slides', url: 'https://drive.google.com/file/d/abc' },
        ],
      });
      expect(session.resources[0].url).toBe(
        'https://drive.google.com/file/d/abc',
      );
    });

    it('rejects a malformed resource URL', async () => {
      await expect(
        Session.create({
          title: 'Bad Resource Session',
          instructor: instructor._id,
          resources: [{ title: 'Broken', url: 'not-a-valid-url' }],
        }),
      ).rejects.toThrow('Resource URL must be from a trusted host');
    });
  });

  describe('coverImage', () => {
    it('accepts a full https URL', async () => {
      const session = await Session.create({
        title: 'Cover URL Session',
        instructor: instructor._id,
        coverImage: 'https://example.com/cover.jpg',
      });
      expect(session.coverImage).toBe('https://example.com/cover.jpg');
    });

    it('accepts a bare image filename', async () => {
      const session = await Session.create({
        title: 'Cover Filename Session',
        instructor: instructor._id,
        coverImage: 'cover-image.png',
      });
      expect(session.coverImage).toBe('cover-image.png');
    });

    it('rejects an invalid cover image value', async () => {
      await expect(
        Session.create({
          title: 'Bad Cover Session',
          instructor: instructor._id,
          coverImage: 'not a valid image reference!',
        }),
      ).rejects.toThrow('Cover image must be a valid URL or image filename');
    });
  });
});
