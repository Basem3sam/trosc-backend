const Joi = require('joi');
const attachmentValidation = require('../../src/utils/attachmentValidation');

describe('attachmentValidation', () => {
  it('should validate an array of trusted HTTPS URLs', () => {
    const urls = [
      'https://drive.google.com/file/d/abc',
      'https://github.com/user/repo/blob/main/file.pdf',
      'https://res.cloudinary.com/demo/image.jpg',
      'https://cdn.discordapp.com/attachments/123/file.png',
    ];
    const { error } = attachmentValidation.validate(urls);
    expect(error).toBeUndefined();
  });

  it('should allow an empty array or undefined', () => {
    const { error: err1 } = attachmentValidation.validate([]);
    expect(err1).toBeUndefined();
    const { error: err2 } = attachmentValidation.validate(undefined);
    expect(err2).toBeUndefined();
  });

  it('should reject a URL that is not HTTPS', () => {
    const urls = ['http://drive.google.com/file/d/abc'];
    const { error } = attachmentValidation.validate(urls);
    expect(error).toBeDefined();
    expect(error.message).toMatch(/must be a valid URL from a trusted host/);
  });

  it('should reject a URL from an untrusted host', () => {
    const urls = ['https://evil.com/file.pdf'];
    const { error } = attachmentValidation.validate(urls);
    expect(error).toBeDefined();
    expect(error.message).toMatch(/must be a valid URL from a trusted host/);
  });

  it('should reject a URL with a dangerous file extension', () => {
    const urls = ['https://drive.google.com/file.exe'];
    const { error } = attachmentValidation.validate(urls);
    expect(error).toBeDefined();
    expect(error.message).toMatch(/Executable files are not allowed/);
  });

  it('should reject a non-string item', () => {
    const urls = [123];
    const { error } = attachmentValidation.validate(urls);
    expect(error).toBeDefined();
  });

  it('should reject more than 10 items', () => {
    const urls = Array(11).fill('https://drive.google.com/file.pdf');
    const { error } = attachmentValidation.validate(urls);
    expect(error).toBeDefined();
    expect(error.message).toMatch(/Maximum 10 attachments allowed/);
  });
});
