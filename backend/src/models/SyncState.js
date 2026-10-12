const mongoose = require('mongoose');

/**
 * ============================================================================
 * SYNC STATE — har node ka apna (sync nahi hota)
 * ============================================================================
 *
 * _id 'hub':   hub agent ke push/pull cursors, aakhri kamyabi/ghalti, conflicts
 * _id 'cloud': hub ne aakhri dafa kab rabta kiya (website booking gate isay dekhta hai)
 */
const syncStateSchema = new mongoose.Schema(
  {
    _id: { type: String },
    // { [collectionName]: { ts: Date, id: Mixed } }
    pushCursors: { type: mongoose.Schema.Types.Mixed, default: {} },
    pullCursors: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastSuccessAt: { type: Date, default: null },
    lastAttemptAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    lastHubContactAt: { type: Date, default: null },
    // Aakhri conflicts (duplicate email/room number waghera) jo apply nahi ho sake
    recentConflicts: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { versionKey: false, minimize: false }
);

module.exports = mongoose.model('SyncState', syncStateSchema);
