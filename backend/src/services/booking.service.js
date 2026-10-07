const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const { BOOKING_STATUS, PAYMENT_STATUS, ROLES } = require('../config/constants');
const ApiError = require('../utils/apiError');

/**
 * ============================================================================
 * BOOKING SERVICE (The Core Commercial Engine)
 * ============================================================================
 * 
 * Yeh service Hotel Booking System ka sab se ahem aur sensitive hissa hai.
 * 
 * 3 Golden Rules jo yeh service enforce karti hai:
 * 1. Zero Double-Booking: Multi-document ACID transactions aur atomic document-level
 *    conditional locking ke sath do concurrent requests me se sirf 1 ko confirm karti hai.
 * 2. Authoritative Pricing: Client ki taraf se aane wali kisi bhi price ko trust nahi kiya jata.
 *    Server database se rates le kar nights se multiply karta hai.
 * 3. Guest Capacity Enforcement: Agar select kiye gaye rooms ki total capacity guest count se kam ho,
 *    to booking foran reject ho jaati hai.
 */
class BookingService {
  /**
   * Creates an atomic multi-room reservation within a MongoDB ACID transaction.
   * Prevents race conditions and guarantees zero double-booking.
   *
   * @param {Object} params
   * @param {string} params.userId - Logged in guest ki User ID
   * @param {Array<string>} params.roomIds - Book karne ke liye select kiye gaye kamron ki IDs
   * @param {string|Date} params.checkInDate - Check-in date
   * @param {string|Date} params.checkOutDate - Check-out date
   * @param {number} params.numberOfGuests - Mehmaano ki tadaad
   * @param {string} [params.specialRequests] - Guest ki remarks/requests
   * @param {string} [params.paymentMethod] - 'pay_at_desk' ya 'online'
   * @param {string} [params.idempotencyKey] - Duplicate prevention token
   * @returns {Promise<Object>} Created booking document
   */
  static async createBooking({
    userId,
    roomIds,
    checkInDate,
    checkOutDate,
    numberOfGuests,
    specialRequests = '',
    paymentMethod = 'online',
    idempotencyKey,
    couponCode,
    redeemLoyaltyPoints = false,
  }) {
    // ------------------------------------------------------------------------
    // STEP 1: INPUT VALIDATION (Inputs ki jaanch)
    // ------------------------------------------------------------------------
    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      throw ApiError.badRequest('At least one room ID must be selected');
    }

    if (!checkInDate || !checkOutDate) {
      throw ApiError.badRequest('Both checkInDate and checkOutDate are required');
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw ApiError.badRequest('Invalid checkInDate or checkOutDate format');
    }

    if (checkIn >= checkOut) {
      throw ApiError.badRequest('checkOutDate must be strictly after checkInDate');
    }

    // Aaj ki midnight se check karein taake maazi (past) ki date me booking na ho
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) {
      throw ApiError.badRequest('checkInDate cannot be in the past');
    }

    if (!numberOfGuests || numberOfGuests < 1) {
      throw ApiError.badRequest('Number of guests must be at least 1');
    }

    // Duplicate room IDs ko saaf karein (agar user ne ghalti se ek hi room 2 dafa pass kar diya)
    const uniqueRoomIds = [...new Set(roomIds.map((id) => id.toString()))];
    const roomObjectIds = uniqueRoomIds.map((id) => new mongoose.Types.ObjectId(id));

    // ------------------------------------------------------------------------
    // STEP 2: VERIFY ROOMS, CAPACITY & AUTHORITATIVE PRICING
    // ------------------------------------------------------------------------
    // Database se verified room documents fetch karein
    const rooms = await Room.find({
      _id: { $in: roomObjectIds },
      isDeleted: false,
      isActive: true,
    });

    // Agar koi ek bhi room missing ho ya inactive ho to foran reject karein
    if (rooms.length !== uniqueRoomIds.length) {
      throw ApiError.badRequest('One or more selected rooms do not exist or are inactive');
    }

    // Maintenance check: Under-maintenance room book nahi kiya ja sakta
    for (const room of rooms) {
      if (room.housekeepingStatus === 'maintenance') {
        throw ApiError.badRequest(`Room ${room.roomNumber} is currently undergoing maintenance`);
      }
    }

    // Capacity check: Kya select kiye gaye rooms me sab guests sama sakte hain?
    const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
    if (numberOfGuests > totalCapacity) {
      throw ApiError.badRequest(
        `Selected rooms have a maximum capacity of ${totalCapacity} guests, but ${numberOfGuests} guests were requested`
      );
    }

    // Raaton ki tadaad nikaalein (Nights calculation)
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (nights < 1) {
      throw ApiError.badRequest('A reservation must be for at least one night');
    }

    // Authoritative pricing: Database se authentic price le kar snapshot banayein
    const bookedRoomItems = rooms.map((r) => ({
      roomId: r._id,
      pricePerNight: r.pricePerNight,
    }));

    const pricePerNightSum = rooms.reduce((sum, r) => sum + r.pricePerNight, 0);
    const totalPrice = nights * pricePerNightSum;

    // ------------------------------------------------------------------------
    // STEP 3: ATOMIC MUTUAL EXCLUSION & TRANSACTION (Race Condition Protection)
    // ------------------------------------------------------------------------
    // Check karein kya mojooda MongoDB deployment replica set transactions support karta hai (e.g. MongoDB Atlas)
    const client = mongoose.connection?.getClient ? mongoose.connection.getClient() : mongoose.connection?.client;
    const topologyType = client?.topology?.description?.type;
    const supportsTransactions = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

    let session = null;
    let inTransaction = false;
    if (supportsTransactions) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        inTransaction = true;
      } catch (e) {
        session = null;
        inTransaction = false;
      }
    }

    const lockedRoomIds = [];
    // Har booking ke liye unique readable reference (e.g. 'BK-M2K8P9-7F3A')
    const bookingReference = Booking.generateBookingReference();

    try {
      // ----------------------------------------------------------------------
      // LAYER A: ATOMIC CONDITIONAL ROOM LOCK ($findOneAndUpdate)
      // ----------------------------------------------------------------------
      // MongoDB ka findOneAndUpdate document-level atomic lock provide karta hai.
      // Hum har room me reservedRanges array me dates tabhi push karte hain jab
      // koi overlapping date range mojood NA HO ($not: { $elemMatch: ... }).
      // Agar 2 requests ek sath aayengi, to doosri request ko match fail hone par
      // lockedRoom null milega, aur wo foran 409 Conflict throw kar degi!
      for (const roomId of roomObjectIds) {
        const query = {
          _id: roomId,
          isActive: true,
          isDeleted: false,
          housekeepingStatus: { $ne: 'maintenance' },
          reservedRanges: {
            $not: {
              $elemMatch: {
                checkIn: { $lt: checkOut },
                checkOut: { $gt: checkIn },
              },
            },
          },
        };

        const update = {
          $push: {
            reservedRanges: {
              checkIn,
              checkOut,
              bookingReference,
            },
          },
        };

        const options = session ? { session, new: true } : { new: true };
        const lockedRoom = await Room.findOneAndUpdate(query, update, options);

        if (!lockedRoom) {
          throw ApiError.conflict(
            'One or more selected rooms are no longer available for the chosen date range'
          );
        }
        lockedRoomIds.push(roomId);
      }

      // ----------------------------------------------------------------------
      // LAYER B: SECONDARY VERIFICATION AGAINST ACTIVE BOOKINGS
      // ----------------------------------------------------------------------
      const activeStatuses = [
        BOOKING_STATUS.PENDING,
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.CHECKED_IN,
      ];

      const overlapQuery = Booking.findOne({
        'rooms.roomId': { $in: roomObjectIds },
        status: { $in: activeStatuses },
        checkInDate: { $lt: checkOut },
        checkOutDate: { $gt: checkIn },
      });

      if (session) {
        overlapQuery.session(session);
      }

      const conflict = await overlapQuery;
      if (conflict) {
        throw ApiError.conflict(
          'One or more selected rooms are no longer available for the chosen date range'
        );
      }

      // ----------------------------------------------------------------------
      // STEP 4: INITIAL STATUS DETERMINATION & BOOKING CREATION
      // ----------------------------------------------------------------------
      // Pay at desk: Mehmaan counter par paise dega, booking direct confirmed ho jati hai
      // Online: Pehle pending hoti hai, Stripe payment complete hone par confirm hoti hai
      const initialStatus =
        paymentMethod === 'pay_at_desk'
          ? BOOKING_STATUS.CONFIRMED
          : BOOKING_STATUS.PENDING;

      const initialPaymentStatus = 'unpaid';

      // Agar online checkout hai to 5 minute ka expiry timer set karein (Cron service release karegi)
      const expiresAt =
        paymentMethod === 'pay_at_desk'
          ? null
          : new Date(Date.now() + 5 * 60 * 1000);

      // ----------------------------------------------------------------------
      // STEP 3.5: COUPON & LOYALTY POINTS DISCOUNT CALCULATION
      // ----------------------------------------------------------------------
      let discountAmount = 0;
      let couponApplied = null;
      let loyaltyPointsUsed = 0;

      // 1. Promotional Coupon Application
      if (couponCode) {
        const coupon = await Coupon.findOne({
          code: couponCode.trim().toUpperCase(),
          isActive: true,
        });

        if (coupon && coupon.isValid(totalPrice)) {
          couponApplied = coupon._id;
          if (coupon.discountType === 'percentage') {
            discountAmount = (totalPrice * coupon.discountValue) / 100;
            if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
              discountAmount = coupon.maxDiscountAmount;
            }
          } else if (coupon.discountType === 'fixed') {
            discountAmount = Math.min(coupon.discountValue, totalPrice);
          }
          coupon.usedCount = (coupon.usedCount || 0) + 1;
          await coupon.save(session ? { session } : {});
        }
      }

      // 2. Loyalty Points Redemption (100 points = $10 discount)
      if (redeemLoyaltyPoints) {
        const user = await User.findById(userId);
        if (user && user.loyaltyPoints >= 100) {
          const maxPointsUsable = user.loyaltyPoints;
          const remainingPrice = Math.max(0, totalPrice - discountAmount);
          const maxDollarsFromPoints = remainingPrice * 0.5; // Max 50% discount from loyalty
          const pointsNeeded = Math.floor((maxDollarsFromPoints / 10) * 100);
          loyaltyPointsUsed = Math.min(maxPointsUsable, pointsNeeded);
          const pointsDiscount = (loyaltyPointsUsed / 100) * 10;

          discountAmount += pointsDiscount;
          user.loyaltyPoints -= loyaltyPointsUsed;
          await user.save(session ? { session } : {});
        }
      }

      const finalPrice = Math.max(0, totalPrice - discountAmount);

      const bookingData = {
        bookingReference,
        userId,
        rooms: bookedRoomItems,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests,
        specialRequests,
        totalPrice: finalPrice,
        discountAmount,
        couponApplied,
        loyaltyPointsUsed,
        status: initialStatus,
        paymentStatus: initialPaymentStatus,
        expiresAt,
        idempotencyKey,
      };

      const [createdBooking] = await Booking.create(
        [bookingData],
        session ? { session } : {}
      );

      // Agar transaction chal rahi thi to ab commit karein
      if (inTransaction && session) {
        await session.commitTransaction();
      }

      return createdBooking;
    } catch (error) {
      // Masla aane par rollback karein
      if (inTransaction && session) {
        await session.abortTransaction();
      } else if (lockedRoomIds.length > 0) {
        // Standalone mode me locked rooms se reserved range ko wapis nikaal dein
        await Room.updateMany(
          { _id: { $in: lockedRoomIds } },
          { $pull: { reservedRanges: { bookingReference } } }
        );
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * Retrieves bookings for a guest with pagination and sorting.
   *
   * @param {string} userId - Logged in user ID
   * @param {Object} query - Query params (page, limit, status)
   * @returns {Promise<Object>} Paginated bookings result
   */
  static async getGuestBookings(userId, { page = 1, limit = 10, status }) {
    // Pagination parameters ko sanitize karein
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = { userId };
    if (status) {
      filter.status = status;
    }

    // Parallel execution: Bookings fetch karo aur total count nikaalo
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('rooms.roomId', 'roomNumber type pricePerNight capacity amenities images')
        .sort({ createdAt: -1 }) // Newest bookings sab se upar
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(filter),
    ]);

    return {
      bookings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Retrieves a single booking by ID with ownership verification.
   *
   * @param {string} bookingId - Booking ki ID
   * @param {string} userId - Logged in user ki ID
   * @param {string} userRole - User ka role (user, receptionist, super-admin)
   * @returns {Promise<Object>} Booking document
   */
  static async getBookingById(bookingId, userId, userRole) {
    const booking = await Booking.findById(bookingId)
      .populate('rooms.roomId', 'roomNumber type pricePerNight capacity amenities images')
      .populate('userId', 'name email');

    if (!booking) {
      throw ApiError.notFound(`Booking with ID '${bookingId}' not found`);
    }

    // Security Authorization Check:
    // Sirf booking ka asal maalik (Guest) ya Hotel Staff (Receptionist, Super-Admin) hi booking dekh sakta hai
    const isOwner = booking.userId._id.toString() === userId.toString();
    const isStaff = userRole === ROLES.SUPER_ADMIN || userRole === ROLES.RECEPTIONIST;

    if (!isOwner && !isStaff) {
      throw ApiError.forbidden('You do not have permission to view this booking');
    }

    return booking;
  }
}

module.exports = BookingService;
