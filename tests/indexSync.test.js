const path = require('path');
const { spawnSync } = require('child_process');
const mongoose = require('mongoose');
const {
  getIndexDiff,
  describeDeclared,
  keySignature,
} = require('../src/utils/indexSync');

// A model-shaped object with no diffIndexes(), so getIndexDiff() takes its
// fallback path (schema.indexes() compared with listIndexes()).
const fakeModel = (declared, existing, listError) => ({
  collection: { collectionName: 'things' },
  schema: { indexes: () => declared },
  listIndexes: async () => {
    if (listError) throw listError;
    return existing;
  },
});

describe('indexSync - diff logic (mocked model)', () => {
  it('reports a declared index that does not exist yet', async () => {
    const model = fakeModel(
      [[{ code: 1 }, { unique: true }]],
      [{ name: '_id_', key: { _id: 1 } }],
    );

    const diff = await getIndexDiff(model);

    expect(diff.collection).toBe('things');
    expect(diff.toCreate).toEqual([[{ code: 1 }, { unique: true }]]);
    expect(diff.toDrop).toEqual([]);
  });

  it('reports nothing when the database matches the schema', async () => {
    const model = fakeModel(
      [[{ code: 1 }, { unique: true }]],
      [
        { name: '_id_', key: { _id: 1 } },
        { name: 'code_1', key: { code: 1 }, unique: true },
      ],
    );

    const diff = await getIndexDiff(model);

    expect(diff.toCreate).toEqual([]);
    expect(diff.toDrop).toEqual([]);
  });

  it('reports an index the schema does not declare as a drop', async () => {
    const model = fakeModel(
      [],
      [
        { name: '_id_', key: { _id: 1 } },
        { name: 'legacy_1', key: { legacy: 1 } },
      ],
    );

    const diff = await getIndexDiff(model);

    expect(diff.toCreate).toEqual([]);
    expect(diff.toDrop).toEqual(['legacy_1']);
  });

  it('treats a changed option (plain vs TTL) as drop + create', async () => {
    const model = fakeModel(
      [[{ at: 1 }, { expireAfterSeconds: 60 }]],
      [
        { name: '_id_', key: { _id: 1 } },
        { name: 'at_1', key: { at: 1 } },
      ],
    );

    const diff = await getIndexDiff(model);

    expect(diff.toCreate).toHaveLength(1);
    expect(diff.toDrop).toEqual(['at_1']);
  });

  it('treats a missing collection as "no indexes yet"', async () => {
    const err = Object.assign(new Error('ns not found'), {
      codeName: 'NamespaceNotFound',
      code: 26,
    });
    const model = fakeModel([[{ code: 1 }, {}]], [], err);

    const diff = await getIndexDiff(model);

    expect(diff.existing).toEqual([]);
    expect(diff.toCreate).toHaveLength(1);
  });

  it('rethrows any other listIndexes error', async () => {
    const model = fakeModel([], [], new Error('connection lost'));

    await expect(getIndexDiff(model)).rejects.toThrow('connection lost');
  });

  it('turns the bare key objects from diffIndexes() into [fields, options]', async () => {
    const model = {
      collection: { collectionName: 'things' },
      schema: {
        indexes: () => [
          [{ code: 1 }, { unique: true }],
          [{ at: 1 }, { expireAfterSeconds: 60 }],
        ],
      },
      listIndexes: async () => [],
      diffIndexes: async () => ({ toCreate: [{ code: 1 }], toDrop: [] }),
    };

    const diff = await getIndexDiff(model);

    expect(diff.toCreate).toEqual([[{ code: 1 }, { unique: true }]]);
    expect(describeDeclared(diff.collection, diff.toCreate[0])).toBe(
      'things: code:1 (unique)',
    );
  });

  it('describes indexes with names and options only', () => {
    expect(keySignature({ a: 1, b: -1 })).toBe('a:1,b:-1');
    expect(describeDeclared('users', [{ email: 1 }, { unique: true }])).toBe(
      'users: email:1 (unique)',
    );
    expect(
      describeDeclared('logs', [{ at: 1 }, { expireAfterSeconds: 60 }]),
    ).toBe('logs: at:1 (ttl 60s)');
    expect(describeDeclared('plain', [{ x: 1 }])).toBe('plain: x:1');
  });
});

describe('indexSync - real model on the in-memory database', () => {
  const schema = new mongoose.Schema(
    { code: String },
    { autoIndex: false, autoCreate: false },
  );
  schema.index({ code: 1 }, { unique: true });
  const Probe = mongoose.model('IndexSyncProbe', schema, 'index_sync_probe');

  afterAll(async () => {
    try {
      await Probe.collection.drop();
    } catch {
      // The collection may never have been created; nothing to clean up.
    }
  });

  it('walks missing -> in sync -> extra index, without changing anything itself', async () => {
    const before = await getIndexDiff(Probe);
    expect(before.toCreate).toHaveLength(1);
    expect(before.toDrop).toEqual([]);

    // Reading must not have created the collection or the index.
    const again = await getIndexDiff(Probe);
    expect(again.toCreate).toHaveLength(1);

    await Probe.createIndexes();
    const inSync = await getIndexDiff(Probe);
    expect(inSync.toCreate).toEqual([]);
    expect(inSync.toDrop).toEqual([]);

    await Probe.collection.createIndex({ stray: 1 });
    const withExtra = await getIndexDiff(Probe);
    expect(withExtra.toCreate).toEqual([]);
    expect(withExtra.toDrop).toEqual(['stray_1']);
  });
});

describe('scripts/syncIndexes.js - guards', () => {
  const script = path.join(__dirname, '..', 'scripts', 'syncIndexes.js');

  const run = (args, env) =>
    spawnSync(process.execPath, [script, ...args], {
      env,
      encoding: 'utf8',
      timeout: 20000,
    });

  it('refuses to run without NODE_ENV', () => {
    const env = { ...process.env };
    delete env.NODE_ENV;

    const result = run([], env);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NODE_ENV is not set');
  });

  it('rejects --apply together with --dry-run', () => {
    const result = run(['--apply', '--dry-run'], process.env);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('either --dry-run or --apply');
  });

  it('rejects unknown arguments', () => {
    const result = run(['--force'], process.env);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unknown argument(s): --force');
  });
});
