const mongoose = require('mongoose');

/**
 * ============================================================================
 * SYNC TOMBSTONE — "ye document delete hua tha"
 * ============================================================================
 *
 * Jab koi synced document (e.g. review) hard-delete hota hai to sync plugin yahan
 * ek record likhta hai, taake doosri taraf (hub <-> cloud) bhi wo document delete
 * ho. Is ke baghair delete hua record agle sync me wapis aa jata.
 */
const syncTombstoneSchema = new mongoose.Schema(
  {
    // Synced collection ka naam, e.g. 'reviews'
    collectionName: { type: String, required: true },
    docId: { type: mongoose.Schema.Types.Mixed, required: true },
    syncUpdatedAt: { type: Date, required: true },
    syncOrigin: { type: String, enum: ['cloud', 'hub'], required: true },
  },
  { versionKey: false }
);

syncTombstoneSchema.index({ syncOrigin: 1, syncUpdatedAt: 1, _id: 1 });
syncTombstoneSchema.index({ collectionName: 1, docId: 1 });

module.exports = mongoose.model('SyncTombstone', syncTombstoneSchema);
