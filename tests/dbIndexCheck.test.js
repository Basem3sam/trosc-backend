const mongoose = require('mongoose');
const { logger } = require('../src/utils/logger');
const { checkDeclaredIndexes } = require('../src/config/db.config');

describe('db.config - startup index check', () => {
  const schema = new mongoose.Schema(
    { code: String },
    { autoIndex: false, autoCreate: false },
  );
  schema.index({ code: 1 }, { unique: true });
  const Probe = mongoose.model('StartupCheckProbe', schema, 'startup_probe');

  afterAll(async () => {
    try {
      await Probe.collection.drop();
    } catch {
      // The collection may never have been created.
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('warns about a declared index that is missing, and creates nothing', async () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    const missing = await checkDeclaredIndexes();

    expect(missing).toEqual(
      expect.arrayContaining(['startup_probe: code:1 (unique)']),
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('startup_probe: code:1 (unique)');
    expect(warn.mock.calls[0][0]).toContain('scripts/syncIndexes.js');

    // Still missing afterwards: the check only reads.
    const indexes = await Probe.listIndexes().catch(() => []);
    expect(indexes.some((i) => i.name === 'code_1')).toBe(false);
  });

  it('stays quiet about a model whose indexes all exist', async () => {
    await Probe.createIndexes();
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    const missing = await checkDeclaredIndexes();

    expect(missing.some((m) => m.startsWith('startup_probe:'))).toBe(false);
    const mentionsProbe = warn.mock.calls.some((call) =>
      String(call[0]).includes('startup_probe'),
    );
    expect(mentionsProbe).toBe(false);
  });

  it('never throws: a failing lookup is logged and returns null', async () => {
    jest.spyOn(mongoose, 'modelNames').mockImplementation(() => {
      throw new Error('boom');
    });
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    await expect(checkDeclaredIndexes()).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith('Index check skipped: boom');
  });
});
