const User = require('../../src/models/user.model');
const { createTestUser } = require('../helpers/testUser');

describe('User model — field validators (mongoose-level)', () => {
  describe('photo', () => {
    it('accepts a bare image filename', async () => {
      const { user } = await createTestUser({ photo: 'avatar123.png' });
      expect(user.photo).toBe('avatar123.png');
    });

    it('rejects a filename with an unsupported extension', async () => {
      await expect(createTestUser({ photo: 'avatar.gif' })).rejects.toThrow();
    });
  });

  describe('website', () => {
    it('accepts an empty website', async () => {
      const { user } = await createTestUser({ website: '' });
      expect(user.website).toBe('');
    });

    it('accepts a valid website URL', async () => {
      const { user } = await createTestUser({
        website: 'https://basem.dev',
      });
      expect(user.website).toBe('https://basem.dev');
    });

    it('rejects a website that is not a valid URL', async () => {
      await expect(createTestUser({ website: 'not a url' })).rejects.toThrow(
        'Website must be a valid URL',
      );
    });
  });

  describe('socialMedia', () => {
    it('accepts empty social links', async () => {
      const { user } = await createTestUser({
        socialMedia: { twitter: '', linkedin: '', github: '' },
      });
      expect(user.socialMedia.twitter).toBe('');
    });

    it('accepts valid social links', async () => {
      const { user } = await createTestUser({
        socialMedia: {
          twitter: 'https://twitter.com/basem',
          linkedin: 'https://linkedin.com/in/basem',
          github: 'https://github.com/basem',
        },
      });
      expect(user.socialMedia.github).toBe('https://github.com/basem');
    });

    it('rejects an invalid twitter URL', async () => {
      await expect(
        createTestUser({ socialMedia: { twitter: 'nope' } }),
      ).rejects.toThrow('Twitter URL must be valid');
    });

    it('rejects an invalid linkedin URL', async () => {
      await expect(
        createTestUser({ socialMedia: { linkedin: 'nope' } }),
      ).rejects.toThrow('LinkedIn URL must be valid');
    });

    it('rejects an invalid github URL', async () => {
      await expect(
        createTestUser({ socialMedia: { github: 'nope' } }),
      ).rejects.toThrow('GitHub URL must be valid');
    });
  });
});

describe('User model — changedPasswordAfter', () => {
  it('returns false when the password has never been changed', async () => {
    const { user } = await createTestUser();
    expect(user.changedPasswordAfter(Math.floor(Date.now() / 1000))).toBe(
      false,
    );
  });

  it('returns true when the JWT was issued before the password change', async () => {
    const { user } = await createTestUser();
    user.password = 'NewPassword123!';
    user.passwordConfirm = 'NewPassword123!';
    await user.save();

    const refreshed = await User.findById(user._id).select(
      '+passwordChangedAt',
    );
    const jwtIssuedBeforeChange = Math.floor(Date.now() / 1000) - 3600;
    expect(refreshed.changedPasswordAfter(jwtIssuedBeforeChange)).toBe(true);
  });

  it('returns false when the JWT was issued after the password change', async () => {
    const { user } = await createTestUser();
    user.password = 'NewPassword123!';
    user.passwordConfirm = 'NewPassword123!';
    await user.save();

    const refreshed = await User.findById(user._id).select(
      '+passwordChangedAt',
    );
    const jwtIssuedAfterChange = Math.floor(Date.now() / 1000) + 3600;
    expect(refreshed.changedPasswordAfter(jwtIssuedAfterChange)).toBe(false);
  });
});
