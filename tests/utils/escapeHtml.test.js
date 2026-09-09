const escapeHtml = require('../../src/utils/escapeHtml');

describe('escapeHtml', () => {
  it('should escape &', () => {
    expect(escapeHtml('&')).toBe('&amp;');
  });
  it('should escape <', () => {
    expect(escapeHtml('<')).toBe('&lt;');
  });
  it('should escape >', () => {
    expect(escapeHtml('>')).toBe('&gt;');
  });
  it('should escape "', () => {
    expect(escapeHtml('"')).toBe('&quot;');
  });
  it("should escape '", () => {
    expect(escapeHtml("'")).toBe('&#39;');
  });
  it('should escape all characters in a string', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
  it('should handle non-string input by converting to string', () => {
    expect(escapeHtml(123)).toBe('123');
    expect(escapeHtml(null)).toBe('null');
    expect(escapeHtml(undefined)).toBe('undefined');
  });
  it('should leave safe characters unchanged', () => {
    expect(escapeHtml('Hello World!')).toBe('Hello World!');
  });
});
