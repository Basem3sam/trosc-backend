const validateAttachments = require('../src/utils/validateAttachments');

describe('validateAttachments', () => {
  it('returns true for empty array or undefined', () => {
    expect(validateAttachments([])).toBe(true);
    expect(validateAttachments(undefined)).toBe(true);
  });

  it('returns true for allowed hosts (HTTPS)', () => {
    const urls = [
      'https://drive.google.com/file/d/abc',
      'https://github.com/user/repo/blob/main/file.pdf',
      'https://res.cloudinary.com/demo/image.jpg',
      'https://cdn.discordapp.com/attachments/123/file.png',
    ];
    expect(validateAttachments(urls)).toBe(true);
  });

  it('returns false for non-HTTPS', () => {
    const urls = ['http://drive.google.com/file/d/abc'];
    expect(validateAttachments(urls)).toBe(false);
  });

  it('returns false for untrusted hosts', () => {
    const urls = ['https://random-site.com/file.pdf'];
    expect(validateAttachments(urls)).toBe(false);
  });

  it('returns false for malformed URLs', () => {
    const urls = ['not-a-url'];
    expect(validateAttachments(urls)).toBe(false);
  });
});
