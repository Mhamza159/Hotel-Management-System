const mongoose = require('mongoose');
const config = require('../config/env');
const logger = require('../utils/logger');
const SyncTombstone = require('../models/SyncTombstone');

/**
 * ============================================================================
 * IDENTITY MERGE — hub aur cloud par "same cheez, alag _id"
 * ============================================================================
 *
 * Sync on hone se pehle hub aur website alag alag chal rahe the, is liye dono
 * taraf same email ka user, same number ka room ya same code ka coupon alag
 * _id ke saath ho sakta hai. Unique index ki wajah se doosri taraf ka document
 * lag nahi sakta tha.
 *
 * Qaida: hotel (hub) ka record jeet-ta hai — us ka _id aur us ka data rehta hai.
 * Ye kaam sirf cloud par hota hai, jab hub ka document push me aata hai:
 *   1. cloud ke purane _id ke saare references (bookings, payments, reviews,
 *      waitlist, audit, wishlist ...) hub ke _id par kar do (aur muhar lagao,
 *      taake ye badle hue records hub tak bhi pohnchein)
 *   2. cloud ka purana document hata do (tombstone ke saath)
 *   3. phir hub ka document normal tareeqe se lag jata hai
 *
 * Hub par aisa takrao sirf skip + conflict hota hai; cloud jab hub ka document
 * paata hai to merge kar ke sahi records wapis bhej deta hai.
 */

// Kis collection me kis unique field se pehchan hoti hai
const MERGE_KEYS = {
  users: 'email',
  rooms: 'roomNumber',
  coupons: 'code',
};

// { collection, field, array?, synced } — array = array ke andar ka path
const REFERENCES = {
  users: [
    { collection: 'bookings', field: 'userId' },
    { collection: 'bookings', field: 'bookedByStaffId' },
    { collection: 'bookings', field: 'cancellation.cancelledBy' },
    { collection: 'bookings', field: 'cancellationRequest.requestedBy' },
    { collection: 'bookings', field: 'cancellationRequest.reviewedBy' },
    { collection: 'payments', field: 'userId' },
    { collection: 'payments', field: 'receivedByStaffId' },
    { collection: 'reviews', field: 'guestId' },
    { collection: 'waitlists', field: 'guestId' },
    { collection: 'auditlogs', field: 'actorId' },
    { collection: 'auditlogs', field: 'targetId' },
    { collection: 'chatsessions', field: 'userId', synced: false },
    { collection: 'revokedtokens', field: 'userId', synced: false },
  ],
  rooms: [
    { collection: 'bookings', array: 'rooms', field: 'roomId' },
    { collection: 'reviews', field: 'roomId' },
    { collection: 'auditlogs', field: 'targetId' },
    { collection: 'users', array: 'wishlist' },
    { collection: 'mediajobs', field: 'roomId', synced: false },
  ],
  coupons: [{ collection: 'bookings', field: 'couponApplied' }],
};

const isMergeable = (name) => config.sync.node === 'cloud' && Boolean(MERGE_KEYS[name]);

/**
 * Cloud ke purane _id ke references naye (hub) _id par karo.
 * @returns {Promise<number>} kitne documents badle
 */
const remapReferences = async (name, fromId, toId) => {
  const stamp = { syncUpdatedAt: new Date(), syncOrigin: config.sync.node };
  let modified = 0;

  for (const ref of REFERENCES[name]) {
    const collection = mongoose.connection.collection(ref.collection);
    const extra = ref.synced === false ? {} : stamp;
    let result;
    if (ref.array && ref.field) {
      result = await collection.updateMany(
        { [`${ref.array}.${ref.field}`]: fromId },
        { $set: { [`${ref.array}.$[item].${ref.field}`]: toId, ...extra } },
        { arrayFilters: [{ [`item.${ref.field}`]: fromId }] }
      );
    } else if (ref.array) {
      result = await collection.updateMany(
        { [ref.array]: fromId },
        { $set: { [`${ref.array}.$[item]`]: toId, ...extra } },
        { arrayFilters: [{ item: fromId }] }
      );
    } else {
      result = await collection.updateMany({ [ref.field]: fromId }, { $set: { [ref.field]: toId, ...extra } });
    }
    modified += result.modifiedCount;
  }
  return modified;
};

/**
 * Hub ka document cloud ke same-key document se takraya: cloud wala hub ke _id
 * me mil jata hai. Is ke baad caller hub ka document dobara lagata hai.
 * @returns {Promise<Object|null>} merge ki tafseel, ya null agar merge nahi hua
 */
const mergeIntoIncoming = async (entry, doc) => {
  const key = MERGE_KEYS[entry.name];
  if (!isMergeable(entry.name) || doc[key] === undefined || doc[key] === null) return null;

  const collection = entry.model().collection;
  const local = await collection.findOne({ [key]: doc[key], _id: { $ne: doc._id } }, { projection: { _id: 1 } });
  if (!local) return null;

  const remapped = await remapReferences(entry.name, local._id, doc._id);
  await collection.deleteOne({ _id: local._id });
  // Hub ne kabhi ye _id dekha ho to wahan bhi hat jaye
  await SyncTombstone.collection.insertOne({
    collectionName: collection.collectionName,
    docId: local._id,
    syncUpdatedAt: new Date(),
    syncOrigin: config.sync.node,
  });

  logger.warn(
    `[SYNC] ${entry.name} ${key}=${doc[key]}: website record ${local._id} merged into hotel record ${doc._id} (${remapped} references moved)`
  );
  return { collection: entry.name, key, value: String(doc[key]), fromId: String(local._id), toId: String(doc._id), remapped };
};

module.exports = { mergeIntoIncoming, MERGE_KEYS, REFERENCES };
