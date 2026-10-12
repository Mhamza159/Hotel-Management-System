const config = require('../config/env');
const logger = require('../utils/logger');
const SyncTombstone = require('../models/SyncTombstone');
const { ROOM_HOLDING_STATUSES, reconcileBookingRanges, releaseBookingRanges } = require('./bookingRanges');

/**
 * ============================================================================
 * SYNC STORE — changes jama karna (collect) aur doosri taraf ke changes lagana (apply)
 * ============================================================================
 *
 * Dono nodes yahi code chalate hain:
 *   hub push:  hub collect('hub')    -> cloud apply
 *   hub pull:  cloud collect('cloud') -> hub apply
 *
 * Har collection ka cursor { ts, id } hai (syncUpdatedAt, _id). Sirf wo changes
 * bheje jate hain jin ki muhar SYNC_SETTLE_MS (default 5s) purani ho, taake abhi chal rahi write
 * (jis ka waqt pehle laga par commit baad me hua) cursor ke peechhe na reh jaye.
 *
 * Apply "last writer wins" hai: remote document tabhi lagta hai jab us ka
 * syncUpdatedAt local se naya ho. Remote documents raw driver se likhe jate hain
 * (plugin hooks ke baghair) taake un ki muhar aur origin wesi rahe.
 */

const DEFAULT_LIMIT = 100;
const TOMBSTONES = '_tombstones';

// Order zaroori hai: booking apply hone se pehle us ke user aur rooms aa jayein
const SYNCED = [
  { name: 'users', model: () => require('../models/User') },
  { name: 'rooms', model: () => require('../models/Room'), kind: 'room' },
  { name: 'coupons', model: () => require('../models/Coupon') },
  { name: 'bookings', model: () => require('../models/Booking'), kind: 'booking' },
  { name: 'payments', model: () => require('../models/Payment') },
  { name: 'reviews', model: () => require('../models/Review') },
  { name: 'waitlists', model: () => require('../models/Waitlist') },
  { name: 'auditlogs', model: () => require('../models/AuditLog') },
];

const collectionFor = (name) =>
  name === TOMBSTONES ? SyncTombstone.collection : SYNCED.find((entry) => entry.name === name).model().collection;

const entryForCollection = (collectionName) =>
  SYNCED.find((entry) => entry.model().collection.collectionName === collectionName);

/**
 * @param {Object} params
 * @param {'hub'|'cloud'} params.origin - sirf is node par hui tabdeeliyan
 * @param {Object} [params.cursors] - { [name]: { ts, id } }
 * @param {number} [params.limit]
 * @returns {Promise<{ changes: Object, cursors: Object, hasMore: boolean, count: number }>}
 */
const collectChanges = async ({ origin, cursors = {}, limit = DEFAULT_LIMIT }) => {
  const settledBefore = new Date(Date.now() - config.sync.settleMs);
  const changes = {};
  const nextCursors = { ...cursors };
  let hasMore = false;
  let count = 0;

  for (const name of [...SYNCED.map((entry) => entry.name), TOMBSTONES]) {
    const cursor = cursors[name];
    const filter = { syncOrigin: origin, syncUpdatedAt: { $lte: settledBefore } };
    if (cursor && cursor.ts) {
      filter.$or = [
        { syncUpdatedAt: { $gt: cursor.ts } },
        { syncUpdatedAt: cursor.ts, _id: { $gt: cursor.id } },
      ];
    }
    const docs = await collectionFor(name)
      .find(filter)
      .sort({ syncUpdatedAt: 1, _id: 1 })
      .limit(limit)
      .toArray();
    if (docs.length > 0) {
      changes[name] = docs;
      const last = docs[docs.length - 1];
      nextCursors[name] = { ts: last.syncUpdatedAt, id: last._id };
      count += docs.length;
    }
    if (docs.length === limit) hasMore = true;
  }

  return { changes, cursors: nextCursors, hasMore, count };
};

// ---------------------------------------------------------------- apply

const isNewer = (local, incoming) =>
  !local || !local.syncUpdatedAt || !incoming.syncUpdatedAt || incoming.syncUpdatedAt > local.syncUpdatedAt;

const CONFLICT_REASON =
  'Room was already booked at the hotel for these dates when this online booking arrived. Front desk must assign another room or cancel.';

/**
 * Booking ke room locks milao. Hub par lock na lage to ye website (cloud) ki
 * booking hai jo hotel ki booking se takra gayi: usay conflict mark karo. Ye
 * normal Mongoose update hai, is liye hub ki muhar lagti hai aur flag cloud tak
 * wapis jata hai.
 */
const syncBookingRanges = async (booking, results) => {
  const isHub = config.sync.node === 'hub';
  const { conflicts } = await reconcileBookingRanges(booking, { force: !isHub });
  if (conflicts.length === 0 || !isHub) return;

  const Booking = require('../models/Booking');
  await Booking.updateOne({ _id: booking._id }, { $set: { syncConflict: CONFLICT_REASON } });
  await reconcileBookingRanges({ ...booking, syncConflict: CONFLICT_REASON });
  results.conflicts.push({
    collection: 'bookings',
    id: String(booking._id),
    bookingReference: booking.bookingReference,
    reason: 'room-double-booked',
  });
  logger.warn(`[SYNC] Booking ${booking.bookingReference} conflicts with a hotel booking; flagged for the front desk.`);
};

const applyDoc = async (entry, doc, results) => {
  const collection = entry.model().collection;
  const local = await collection.findOne({ _id: doc._id }, { projection: { syncUpdatedAt: 1 } });
  if (!isNewer(local, doc)) {
    results.skipped += 1;
    return;
  }

  if (entry.kind === 'room') {
    const { _id, reservedRanges, ...fields } = doc; // eslint-disable-line no-unused-vars
    const write = await collection.updateOne(
      { _id },
      { $set: fields, $setOnInsert: { reservedRanges: [] } },
      { upsert: true }
    );
    if (write.upsertedCount > 0) {
      // Naya room: jo bookings is se pehle aa chuki thin un ke locks ab lagao
      const Booking = require('../models/Booking');
      const waiting = await Booking.collection
        .find({ 'rooms.roomId': _id, status: { $in: ROOM_HOLDING_STATUSES }, syncConflict: null })
        .toArray();
      for (const booking of waiting) await syncBookingRanges(booking, results);
    }
  } else {
    await collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
    if (entry.kind === 'booking') await syncBookingRanges(doc, results);
  }
  results.applied += 1;
};

const applyTombstone = async (tombstone, results) => {
  const entry = entryForCollection(tombstone.collectionName);
  if (entry) {
    const collection = entry.model().collection;
    const local = await collection.findOne(
      { _id: tombstone.docId },
      { projection: { syncUpdatedAt: 1, bookingReference: 1 } }
    );
    if (local && !isNewer(local, tombstone)) {
      results.skipped += 1; // delete ke baad yahan document dobara bana/badla
    } else if (local) {
      await collection.deleteOne({ _id: tombstone.docId });
      if (entry.kind === 'booking' && local.bookingReference) await releaseBookingRanges(local.bookingReference);
      results.applied += 1;
    }
  }
  // Remote origin ke saath rakho: record rehta hai aur wapis nahi bheja jata
  await SyncTombstone.collection.updateOne({ _id: tombstone._id }, { $setOnInsert: tombstone }, { upsert: true });
};

/**
 * @param {Object} changes - { [name]: rawDocs[] } (collectChanges ka output)
 * @returns {Promise<{ applied: number, skipped: number, conflicts: Object[] }>}
 */
const applyChanges = async (changes = {}) => {
  const results = { applied: 0, skipped: 0, conflicts: [] };

  for (const entry of SYNCED) {
    for (const doc of changes[entry.name] || []) {
      try {
        await applyDoc(entry, doc, results);
      } catch (error) {
        if (error.code !== 11000) throw error;
        // Doosre _id ke saath same unique value (email, roomNumber, coupon code...)
        const field = Object.keys(error.keyValue || {})[0] || 'unique field';
        results.conflicts.push({
          collection: entry.name,
          id: String(doc._id),
          reason: `duplicate ${field}`,
          value: error.keyValue ? String(Object.values(error.keyValue)[0]) : undefined,
        });
        logger.warn(`[SYNC] ${entry.name} ${doc._id} skipped: duplicate ${field}`);
      }
    }
  }

  for (const tombstone of changes[TOMBSTONES] || []) {
    await applyTombstone(tombstone, results);
  }

  return results;
};

/**
 * Sync se pehle ke documents (jin par muhar nahi) ko is node ki muhar do, taake
 * wo bhi doosri taraf jayein. Waqt "abhi" rakha jata hai — har cursor se naya —
 * is liye backfill kabhi bhi chalaya jaye, kuch peechhe nahi rehta. Dobara
 * chalana safe hai (sirf bina muhar wale documents badalte hain).
 * @returns {Promise<Object>} { [name]: stampedCount }
 */
const backfillLegacyDocuments = async () => {
  const stamped = {};
  for (const entry of SYNCED) {
    const result = await entry.model().collection.updateMany({ syncOrigin: { $exists: false } }, [
      { $set: { syncOrigin: config.sync.node, syncUpdatedAt: '$$NOW' } },
    ]);
    stamped[entry.name] = result.modifiedCount;
  }
  return stamped;
};

module.exports = {
  backfillLegacyDocuments,
  SYNCED,
  TOMBSTONES,
  collectChanges,
  applyChanges,
  CONFLICT_REASON,
};
