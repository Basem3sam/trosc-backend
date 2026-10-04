// scripts/measure.js
//
// READ-ONLY measurements for Stage 1.1 of the performance plan.
// It only runs aggregations and lists indexes. It never writes, creates or
// drops anything, and it never prints documents, emails, ids or secrets:
// only counts, sizes, collection names and index names.
//
// Usage (PowerShell, from the project root):
//   $env:NODE_ENV = "production"
//   node scripts/measure.js
//   # save a copy while it prints:
//   node scripts/measure.js | Tee-Object measure-output.txt
//
// NODE_ENV must be set explicitly so you always know WHICH database you are
// measuring (loadEnv() picks .env.<NODE_ENV>, like your other scripts).

const MAX_TIME_MS = 20000;

function fmtBytes(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'n/a';
  const v = Number(n);
  if (v < 1024) return `${Math.round(v)} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(2)} MB`;
}

// Index signature helpers (declared in code vs existing in the database).
function declaredSignature(fields) {
  const entries = Object.entries(fields);
  const text = entries
    .filter(([, v]) => v === 'text')
    .map(([k]) => k)
    .sort();
  if (text.length) return `TEXT:${text.join(',')}`;
  return entries.map(([k, v]) => `${k}:${v}`).join(',');
}

function existingSignature(idx) {
  if (idx.key && idx.key._fts) {
    return `TEXT:${Object.keys(idx.weights || {})
      .sort()
      .join(',')}`;
  }
  return Object.entries(idx.key)
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
}

function compareIndexes(declared, existing) {
  const decl = declared.map(([fields, options]) => ({
    sig: declaredSignature(fields),
    unique: !!(options && options.unique),
    fields,
    options: options || {},
  }));
  const exist = existing
    .filter((i) => i.name !== '_id_')
    .map((i) => ({
      sig: existingSignature(i),
      unique: !!i.unique,
      name: i.name,
    }));
  const existBySig = new Map(exist.map((e) => [e.sig, e]));
  const declSigs = new Set(decl.map((d) => d.sig));
  return {
    missing: decl.filter((d) => !existBySig.has(d.sig)),
    extra: exist.filter((e) => !declSigs.has(e.sig)),
    uniqueMismatch: decl.filter(
      (d) => existBySig.has(d.sig) && existBySig.get(d.sig).unique !== d.unique,
    ),
  };
}

async function safe(fn) {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    const msg = String(err.codeName || err.message || err).slice(0, 140);
    return { ok: false, error: msg };
  }
}

function agg(Model, pipeline) {
  return Model.collection
    .aggregate(pipeline, { maxTimeMS: MAX_TIME_MS })
    .toArray();
}

function heading(title) {
  console.log(`\n${'='.repeat(70)}\n${title}\n${'='.repeat(70)}`);
}

async function measurePhotos(mongoose) {
  heading('1.1a  PHOTOS (users collection)');
  const User = mongoose.models.User;
  if (!User) {
    console.log('User model not found.');
    return;
  }
  const isString = { $eq: [{ $type: '$photo' }, 'string'] };
  const pipeline = [
    {
      $project: {
        docBytes: { $bsonSize: '$$ROOT' },
        photoBytes: {
          $cond: [isString, { $strLenBytes: '$photo' }, 0],
        },
        isData: {
          $cond: [
            isString,
            {
              $cond: [{ $eq: [{ $substrCP: ['$photo', 0, 5] }, 'data:'] }, 1, 0],
            },
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        users: { $sum: 1 },
        withPhoto: { $sum: { $cond: [{ $gt: ['$photoBytes', 0] }, 1, 0] } },
        withDataUri: { $sum: '$isData' },
        avgDoc: { $avg: '$docBytes' },
        maxDoc: { $max: '$docBytes' },
        avgPhoto: {
          $avg: { $cond: [{ $gt: ['$photoBytes', 0] }, '$photoBytes', null] },
        },
        maxPhoto: { $max: '$photoBytes' },
        totalPhotoBytes: { $sum: '$photoBytes' },
      },
    },
  ];
  const r = await safe(() => agg(User, pipeline));
  if (!r.ok) {
    console.log(`Could not measure: ${r.error}`);
    console.log('(needs MongoDB 4.4+ for $bsonSize)');
    return;
  }
  const d = r.value[0];
  if (!d) {
    console.log('No users found.');
    return;
  }
  console.log(`users total .............. ${d.users}`);
  console.log(`users with a photo ....... ${d.withPhoto}`);
  console.log(`photo stored as base64 ... ${d.withDataUri}`);
  console.log(
    `photo size ............... avg ${fmtBytes(d.avgPhoto)} | max ${fmtBytes(d.maxPhoto)}`,
  );
  console.log(
    `whole user document ...... avg ${fmtBytes(d.avgDoc)} | max ${fmtBytes(d.maxDoc)}`,
  );
  console.log(`all photo bytes combined . ${fmtBytes(d.totalPhotoBytes)}`);
  const max = d.maxPhoto || 0;
  let hint = 'SMALL (a few KB or none): PERF-001 is minor.';
  if (max >= 50 * 1024) hint = 'LARGE (50 KB or more): PERF-001 is real.';
  else if (max >= 10 * 1024) hint = 'MODERATE (10 to 50 KB): PERF-001 is worth fixing.';
  console.log(`hint ..................... ${hint}`);
}

async function measureIndexes(mongoose) {
  heading('1.1b  INDEXES (declared in code vs existing in the database)');
  const models = Object.values(mongoose.models).sort((a, b) =>
    a.collection.collectionName.localeCompare(b.collection.collectionName),
  );
  const dupReport = [];
  for (const Model of models) {
    const name = Model.collection.collectionName;
    const ex = await safe(() => Model.collection.indexes());
    let existing = [];
    let note = '';
    if (ex.ok) existing = ex.value;
    else if (/NamespaceNotFound|ns does not exist/i.test(ex.error)) {
      note = ' (collection does not exist yet)';
    } else {
      console.log(`\n[${name}] could not list indexes: ${ex.error}`);
      continue;
    }
    const declared = Model.schema.indexes();
    const cmp = compareIndexes(declared, existing);
    const ok =
      !cmp.missing.length && !cmp.extra.length && !cmp.uniqueMismatch.length;
    console.log(
      `\n[${name}]${note} existing: ${existing.length} | declared (besides _id): ${declared.length} | ${ok ? 'OK' : 'DIFFERENT'}`,
    );
    cmp.missing.forEach((m) =>
      console.log(
        `  MISSING in database : ${m.sig}${m.unique ? '  (UNIQUE)' : ''}`,
      ),
    );
    cmp.uniqueMismatch.forEach((m) =>
      console.log(`  UNIQUE FLAG DIFFERS : ${m.sig}`),
    );
    cmp.extra.forEach((e) =>
      console.log(
        `  EXTRA in database   : ${e.name} (syncIndexes would DROP it)`,
      ),
    );

    // duplicates that would block a unique index
    for (const d of declared) {
      const [fields, options] = d;
      if (!options || !options.unique) continue;
      const keys = Object.keys(fields);
      if (Object.values(fields).some((v) => v === 'text' || v === 'hashed')) {
        continue;
      }
      const groupId = {};
      keys.forEach((k) => {
        groupId[k.replace(/\./g, '_')] = `$${k}`;
      });
      const stages = [];
      if (options.partialFilterExpression) {
        stages.push({ $match: options.partialFilterExpression });
      }
      stages.push(
        { $group: { _id: groupId, n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 } } },
        { $count: 'groups' },
      );
      const r = await safe(() => agg(Model, stages));
      dupReport.push({
        collection: name,
        index: declaredSignature(fields),
        result: r.ok ? (r.value[0] ? r.value[0].groups : 0) : `error: ${r.error}`,
      });
    }
  }

  console.log('\n--- duplicate check for every UNIQUE index (counts only) ---');
  if (!dupReport.length) console.log('(no unique indexes declared)');
  dupReport.forEach((d) => {
    const bad = typeof d.result === 'number' && d.result > 0;
    console.log(
      `${bad ? '!! ' : '   '}${d.collection} [${d.index}] duplicate groups: ${d.result}${bad ? '  <- would BLOCK building this unique index' : ''}`,
    );
  });
  console.log(
    '\nNote: values are never printed. If a count is above 0, inspect it yourself.',
  );
}

async function measureSizes(mongoose) {
  heading('1.1c  COLLECTION SIZES');
  const models = Object.values(mongoose.models).sort((a, b) =>
    a.collection.collectionName.localeCompare(b.collection.collectionName),
  );
  for (const Model of models) {
    const name = Model.collection.collectionName;
    const r = await safe(() =>
      agg(Model, [{ $collStats: { storageStats: {} } }]),
    );
    if (r.ok && r.value[0] && r.value[0].storageStats) {
      const s = r.value[0].storageStats;
      console.log(
        `${name.padEnd(18)} docs ${String(s.count).padEnd(8)} data ${fmtBytes(s.size).padEnd(10)} storage ${fmtBytes(s.storageSize).padEnd(10)} indexes ${fmtBytes(s.totalIndexSize)}`,
      );
    } else {
      const c = await safe(() => Model.collection.estimatedDocumentCount());
      console.log(
        `${name.padEnd(18)} docs ${c.ok ? c.value : 'n/a'} (size stats not available${r.ok ? '' : `: ${r.error}`})`,
      );
    }
    if (/activitylog/i.test(name)) {
      console.log(
        '                   ^ audit log: grows forever until retention exists (PERF-008)',
      );
    }
  }
}

async function arrayStats(mongoose, modelName, field) {
  const Model = mongoose.models[modelName];
  if (!Model) {
    console.log(`${modelName}.${field}: model not found`);
    return;
  }
  const pipeline = [
    {
      $project: {
        n: {
          $cond: [{ $isArray: `$${field}` }, { $size: `$${field}` }, 0],
        },
      },
    },
    {
      $group: {
        _id: null,
        docs: { $sum: 1 },
        max: { $max: '$n' },
        avg: { $avg: '$n' },
        over100: { $sum: { $cond: [{ $gte: ['$n', 100] }, 1, 0] } },
        over1000: { $sum: { $cond: [{ $gte: ['$n', 1000] }, 1, 0] } },
      },
    },
  ];
  const r = await safe(() => agg(Model, pipeline));
  const label = `${modelName}.${field}`.padEnd(26);
  if (!r.ok) {
    console.log(`${label} could not measure: ${r.error}`);
    return;
  }
  const d = r.value[0];
  if (!d) {
    console.log(`${label} no documents`);
    return;
  }
  console.log(
    `${label} docs ${String(d.docs).padEnd(6)} max ${String(d.max).padEnd(6)} avg ${Number(d.avg).toFixed(1).padEnd(7)} >=100: ${d.over100}  >=1000: ${d.over1000}`,
  );
}

async function measureRosters(mongoose) {
  heading('1.1c  ROSTER / EMBEDDED ARRAY SIZES (items per document)');
  const targets = [
    ['Track', 'students'],
    ['Track', 'pendingStudents'],
    ['Course', 'students'],
    ['Session', 'students'],
    ['Session', 'progress'],
    ['Assignment', 'submissions'],
  ];
  for (const [m, f] of targets) {
    await arrayStats(mongoose, m, f);
  }
  console.log(
    '\nHint: max below ~100 = fine for now; approaching 1000 = plan Stage 4.2.',
  );
}

async function main() {
  if (!process.env.NODE_ENV) {
    console.error(
      'Set NODE_ENV explicitly first, for example:\n  $env:NODE_ENV = "production"\nSo you know which database is being measured.',
    );
    process.exit(1);
  }
  const fs = require('fs');
  const path = require('path');
  require('../src/config/loadEnv')();
  require('../src/config/env.config')();
  const mongoose = require('mongoose');

  const modelsDir = path.join(__dirname, '..', 'src', 'models');
  fs.readdirSync(modelsDir)
    .filter((f) => f.endsWith('.js'))
    .forEach((f) => require(path.join(modelsDir, f)));

  await mongoose.connect(process.env.DATABASE_URL, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 2,
  });

  console.log('READ-ONLY measurement report (no documents or secrets printed)');
  console.log(`date .......... ${new Date().toISOString()}`);
  console.log(`NODE_ENV ...... ${process.env.NODE_ENV}`);
  console.log(`database ...... ${mongoose.connection.name}`);
  const info = await safe(() => mongoose.connection.db.admin().buildInfo());
  console.log(`server ........ ${info.ok ? info.value.version : 'n/a'}`);
  console.log(`mongoose ...... ${mongoose.version}`);

  try {
    await measurePhotos(mongoose);
    await measureIndexes(mongoose);
    await measureSizes(mongoose);
    await measureRosters(mongoose);
    console.log('\nDONE. Copy everything above into Prompt M.');
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Measurement failed:', String(err.message || err).slice(0, 200));
    process.exit(1);
  });
}

module.exports = { declaredSignature, existingSignature, compareIndexes, fmtBytes };
