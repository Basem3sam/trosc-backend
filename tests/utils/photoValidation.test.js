const photoValidation = require('../../src/utils/photoValidation');

describe('photoValidation (Joi custom rule)', () => {
  it('allows an empty string', () => {
    const { error, value } = photoValidation.validate('');
    expect(error).toBeUndefined();
    expect(value).toBe('');
  });

  it('allows null', () => {
    const { error, value } = photoValidation.validate(null);
    expect(error).toBeUndefined();
    expect(value).toBeNull();
  });

  it('allows undefined (optional)', () => {
    const { error } = photoValidation.validate(undefined);
    expect(error).toBeUndefined();
  });

  it('allows the literal default-user.jpg', () => {
    const { error, value } = photoValidation.validate('default-user.jpg');
    expect(error).toBeUndefined();
    expect(value).toBe('default-user.jpg');
  });

  it('allows a valid http(s) URL', () => {
    const { error } = photoValidation.validate(
      'https://res.cloudinary.com/demo/user.jpg',
    );
    expect(error).toBeUndefined();
  });

  it('allows a simple filename', () => {
    const { error } = photoValidation.validate('profile-photo.png');
    expect(error).toBeUndefined();
  });

  it('allows a base64 data URI', () => {
    const { error } = photoValidation.validate(
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAA=',
    );
    expect(error).toBeUndefined();
  });

  it('rejects a value that matches none of the allowed formats', () => {
    const { error } = photoValidation.validate('this is not a photo');
    expect(error).toBeDefined();
    expect(error.message).toMatch(
      /must be a valid URL, image filename, or base64 data URI/,
    );
  });
});
