const config = require('../config/env');

/**
 * ============================================================================
 * SYNC PLUGIN — har tabdeeli par "kab aur kahan" ki muhar
 * ============================================================================
 *
 * Synced models (User, Room, Booking, ...) par lagta hai. Har save / update /
 * insertMany par document me ye do fields set karta hai:
 *   syncUpdatedAt — tabdeeli ka waqt (sync cursor isi par chalta hai)
 *   syncOrigin    — 'hub' ya 'cloud': tabdeeli kis node par hui
 * Delete par SyncTombstone likhta hai taake doosri taraf bhi delete ho.
 *
 * Sync engine remote documents raw driver se likhta hai (hooks ke baghair), is
 * liye remote ki muhar wesi hi rehti hai aur document wapis nahi bheja jata.
 *
 * Option `ignoreFields`: sirf in fields ki tabdeeli muhar nahi lagati
 * (Room.reservedRanges har node khud bookings se banata hai).
 */

const stamp = () => ({ syncUpdatedAt: new Date(), syncOrigin: config.sync.node });

// Mongoose timestamps khud updatedAt/createdAt lagata hai — wo akele asal tabdeeli nahi
const ALWAYS_IGNORED = ['updatedAt', 'createdAt'];

const isIgnoredPath = (path, ignoreFields) =>
  [...ALWAYS_IGNORED, ...ignoreFields].some((field) => path === field || path.startsWith(`${field}.`));

// Update object (operators + plain fields) me kaun se paths badal rahe hain
const touchedPaths = (update) => {
  const paths = [];
  for (const [key, value] of Object.entries(update)) {
    if (key.startsWith('$')) {
      if (value && typeof value === 'object') paths.push(...Object.keys(value));
    } else {
      paths.push(key);
    }
  }
  return paths;
};

const syncPlugin = (schema, { ignoreFields = [] } = {}) => {
  schema.add({
    syncUpdatedAt: { type: Date },
    syncOrigin: { type: String, enum: ['cloud', 'hub'] },
  });
  schema.index({ syncOrigin: 1, syncUpdatedAt: 1, _id: 1 });

  schema.pre('save', function stampSave() {
    if (!this.isNew) {
      const modified = this.modifiedPaths();
      if (modified.length === 0) return;
      if (modified.every((path) => isIgnoredPath(path, ignoreFields))) return;
    }
    Object.assign(this, stamp());
  });

  schema.pre('insertMany', function stampInsertMany(next, docs) {
    const values = stamp();
    for (const doc of Array.isArray(docs) ? docs : [docs]) Object.assign(doc, values);
    next();
  });

  schema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function stampUpdate() {
    const update = this.getUpdate();
    if (!update) return;
    if (Array.isArray(update)) {
      this.setUpdate([...update, { $set: stamp() }]);
      return;
    }
    const paths = touchedPaths(update);
    if (paths.length > 0 && paths.every((path) => isIgnoredPath(path, ignoreFields))) return;
    this.setUpdate({ ...update, $set: { ...(update.$set || {}), ...stamp() } });
  });

  schema.pre('replaceOne', function stampReplace() {
    const replacement = this.getUpdate();
    if (replacement && !Array.isArray(replacement)) {
      this.setUpdate({ ...replacement, ...stamp() });
    }
  });

  // ---------------------------------------------------------------- deletes
  const writeTombstones = async (model, ids) => {
    if (!ids || ids.length === 0) return;
    const SyncTombstone = require('../models/SyncTombstone');
    const values = stamp();
    await SyncTombstone.insertMany(
      ids.map((docId) => ({ collectionName: model.collection.collectionName, docId, ...values }))
    );
  };

  schema.pre(['deleteOne', 'deleteMany'], { document: false, query: true }, async function collectIds() {
    const query = this.model.find(this.getFilter()).select('_id').lean();
    if (this.op === 'deleteOne') query.limit(1);
    this._syncDeletedIds = (await query).map((doc) => doc._id);
  });

  schema.post(['deleteOne', 'deleteMany'], { document: false, query: true }, async function tombstone(result) {
    if (result && result.deletedCount > 0) {
      await writeTombstones(this.model, this._syncDeletedIds);
    }
  });

  schema.post('findOneAndDelete', async function tombstoneFound(doc) {
    if (doc) await writeTombstones(this.model, [doc._id]);
  });

  // doc.deleteOne() bhi Mongoose 8 me query deleteOne chalata hai, is liye upar wala hook kafi hai
};

module.exports = syncPlugin;
