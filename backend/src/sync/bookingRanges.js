const mongoose = require('mongoose');
const Room = require('../models/Room');
const { BOOKING_STATUS } = require('../config/constants');

/**
 * ============================================================================
 * SYNC KE BAAD ROOM LOCKS (reservedRanges) BOOKING SE MILANA
 * ============================================================================
 *
 * Room.reservedRanges sync nahi hota — har node (hub / cloud) usay apni bookings
 * se banata hai. Jab sync koi booking laata hai (nayi, cancel, room change, dates
 * badli) to ye function us booking ke locks ko theek karta hai:
 *   - booking active ho  -> uske har room par { checkIn, checkOut, bookingReference }
 *   - warna (cancel / checkout / conflict) -> us reference ke locks hata do
 *
 * Lock wahi atomic $not/$elemMatch shart se lagta hai jo createBooking me hai.
 * Lock na lag sake (koi aur booking un dates par hai) to room id `conflicts` me
 * aata hai. `force` (cloud par hub ki booking) me lock phir bhi lagta hai, kyun ke
 * hotel ka hub asal inventory hai.
 */

// Ye statuses room ko rokti hain (cancellation request abhi approve nahi hui)
const ROOM_HOLDING_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CHECKED_IN,
  BOOKING_STATUS.CANCELLATION_REQUESTED,
];

const holdsRooms = (booking) =>
  ROOM_HOLDING_STATUSES.includes(booking.status) && !booking.syncConflict;

const toObjectId = (id) => (id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id)));

/**
 * @param {Object} booking - raw booking document (bookingReference, status, rooms, dates, syncConflict)
 * @param {Object} [options]
 * @param {boolean} [options.force=false] - overlap hone par bhi lock lagao
 * @returns {Promise<{ conflicts: ObjectId[] }>}
 */
const reconcileBookingRanges = async (booking, { force = false } = {}) => {
  const rooms = Room.collection;
  const ref = booking.bookingReference;
  const checkIn = booking.checkInDate;
  const checkOut = booking.checkOutDate;

  const desiredIds = holdsRooms(booking)
    ? [...new Map((booking.rooms || []).map((r) => [String(r.roomId), toObjectId(r.roomId)])).values()]
    : [];

  // 1. Purane / ghalat locks hatao: jo room ab booking me nahi, ya jinki dates badal gayin
  await rooms.updateMany(
    {
      'reservedRanges.bookingReference': ref,
      $or: [
        { _id: { $nin: desiredIds } },
        {
          reservedRanges: {
            $elemMatch: {
              bookingReference: ref,
              $or: [{ checkIn: { $ne: checkIn } }, { checkOut: { $ne: checkOut } }],
            },
          },
        },
      ],
    },
    { $pull: { reservedRanges: { bookingReference: ref } } }
  );

  // 2. Jahan lock nahi hai wahan lagao
  const conflicts = [];
  for (const roomId of desiredIds) {
    const room = await rooms.findOne(
      { _id: roomId },
      { projection: { reservedRanges: { $elemMatch: { bookingReference: ref } } } }
    );
    if (!room) continue; // room abhi sync nahi hua — aane par reconcileRoomRanges lagayega
    if (room.reservedRanges && room.reservedRanges.length > 0) continue;

    const range = { _id: new mongoose.Types.ObjectId(), checkIn, checkOut, bookingReference: ref };
    const locked = await rooms.updateOne(
      {
        _id: roomId,
        reservedRanges: {
          $not: { $elemMatch: { checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } } },
        },
      },
      { $push: { reservedRanges: range } }
    );
    if (locked.modifiedCount === 0) {
      if (force) {
        await rooms.updateOne({ _id: roomId }, { $push: { reservedRanges: range } });
      } else {
        conflicts.push(roomId);
      }
    }
  }

  return { conflicts };
};

/** Booking delete hui (tombstone) — uske saare locks hatao */
const releaseBookingRanges = async (bookingReference) => {
  await Room.collection.updateMany(
    { 'reservedRanges.bookingReference': bookingReference },
    { $pull: { reservedRanges: { bookingReference } } }
  );
};

module.exports = {
  ROOM_HOLDING_STATUSES,
  holdsRooms,
  reconcileBookingRanges,
  releaseBookingRanges,
};
