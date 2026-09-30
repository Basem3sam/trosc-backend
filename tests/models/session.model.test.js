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

    // Q8: youtube.com/youtu.be/youtube-nocookie.com are now part of the
    // single trusted-host source of truth (src/utils/trustedHosts.js),
    // and the old hardcoded youtube/drive fast-path regex is gone —
    // everything routes through isTrustedHost() the same way
    // resources[].url already did.
    it('accepts a youtube.com watch URL', async () => {
      const session = await Session.create({
        title: 'YouTube Watch Session',
        instructor: instructor._id,
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      });
      expect(session.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('accepts a youtu.be short URL', async () => {
      const session = await Session.create({
        title: 'YouTube Short Link Session',
        instructor: instructor._id,
        url: 'https://youtu.be/dQw4w9WgXcQ',
      });
      expect(session.url).toBe('https://youtu.be/dQw4w9WgXcQ');
    });

    it('accepts a youtube-nocookie.com embed URL', async () => {
      const session = await Session.create({
        title: 'YouTube No-Cookie Session',
        instructor: instructor._id,
        url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      });
      expect(session.url).toBe(
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      );
    });

    // Previously the youtubeRegex fast-path accepted this (it made the
    // protocol optional); consolidating onto isTrustedHost() closes that
    // gap — every trusted-host URL must now be https, YouTube included.
    it('rejects a non-https YouTube URL now that the fast-path regex is gone', async () => {
      await expect(
        Session.create({
          title: 'Insecure YouTube Session',
          instructor: instructor._id,
          url: 'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
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
      ).rejects.toThrow('Resource URL must be a valid HTTPS URL from a trusted host');
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
