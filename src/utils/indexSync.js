// Helpers shared by scripts/syncIndexes.js and the startup index check in
// db.config.js. They only READ: nothing here creates or drops an index.

// Index options that change what an index is. If one of these differs
// between the schema and the database, MongoDB treats them as different
// indexes (and refuses to hold both on the same key).
const COMPARED_OPTIONS = ['unique', 'sparse', 'expireAfterSeconds'];

const keySignature = (fields) =>
  Object.entries(fields)
    .map(([key, dir]) => `${key}:${dir}`)
    .join(',');

const flagsOf = (source) =>
  COMPARED_OPTIONS.filter((name) => source[name] !== undefined)
    .map((name) =>
      name === 'expireAfterSeconds' ? `ttl ${source[name]}s` : name,
    )
    .join(', ');

// "users: email:1 (unique)" - safe to log: names and options only.
const describeDeclared = (collection, [fields, options = {}]) => {
  const flags = flagsOf(options);
  return `${collection}: ${keySignature(fields)}${flags ? ` (${flags})` : ''}`;
};

const describeExisting = (collection, index) => {
  const flags = flagsOf(index);
  return `${collection}: ${index.name}${flags ? ` (${flags})` : ''}`;
};

const isMissingCollection = (err) =>
  err && (err.codeName === 'NamespaceNotFound' || err.code === 26);

const listExisting = async (Model) => {
  try {
    return await Model.listIndexes();
  } catch (err) {
    if (isMissingCollection(err)) return [];
    throw err;
  }
};

// Used only when the installed Mongoose has no Model.diffIndexes().
const fallbackDiff = async (Model) => {
  const existing = (await listExisting(Model)).filter(
    (index) => index.name !== '_id_',
  );
  const declared = Model.schema.indexes();

  const sameIndex = ([fields, options = {}], index) =>
    keySignature(fields) === keySignature(index.key) &&
    COMPARED_OPTIONS.every(
      (name) => (options[name] ?? undefined) === (index[name] ?? undefined),
    );

  return {
    toCreate: declared.filter(
      (entry) => !existing.some((index) => sameIndex(entry, index)),
    ),
    toDrop: existing
      .filter((index) => !declared.some((entry) => sameIndex(entry, index)))
      .map((index) => index.name),
  };
};

/**
 * What a sync would do for one model, without doing it.
 * @param {import('mongoose').Model} Model
 * @returns {Promise<Object>} { collection, toCreate, toDrop, existing }.
 *   toCreate: declared indexes as [fields, options] that are missing (or
 *   differ); toDrop: names of database indexes the schema does not declare.
 */
const getIndexDiff = async (Model) => {
  const collection = Model.collection.collectionName;
  const existing = await listExisting(Model);

  if (typeof Model.diffIndexes === 'function') {
    let diff;
    try {
      diff = await Model.diffIndexes();
    } catch (err) {
      if (!isMissingCollection(err)) throw err;
      diff = { toCreate: Model.schema.indexes(), toDrop: [] };
    }
    return {
      collection,
      toCreate: diff.toCreate,
      toDrop: diff.toDrop,
      existing,
    };
  }

  const diff = await fallbackDiff(Model);
  return { collection, ...diff, existing };
};

module.exports = {
  getIndexDiff,
  describeDeclared,
  describeExisting,
  keySignature,
};
