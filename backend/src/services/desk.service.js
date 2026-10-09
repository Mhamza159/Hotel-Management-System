const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const Payment = require("../models/Payment");
const ApiError = require("../utils/apiError");
const {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  PAYMENT_PROVIDERS,
  PERMISSIONS,
  ROLES,
} = require("../config/constants");
const LoyaltyService = require("./loyalty.service");
const AuditService = require("./audit.service");

/**
 * ============================================================================
 * DESK SERVICE (Front Desk Operational Engine & Financial Settlement)
 * ============================================================================
 *
 * Yeh service Front Desk Receptionists ke daily hotel operations ka markazi dimaagh (Central Engine) hai.
 *
 * Asal Maqsad aur Responsibilities:
 * 1. Guest Check-In Workflow:
 *    - Mehmaan ke physical arrival par booking ko 'confirmed' se 'checked-in' status me convert karna.
 * 2. Guest Check-Out Workflow & Housekeeping Automation:
 *    - Mehmaan ke stay mukammal hone par checkout karna.
 *    - Ahem Tareen Logic: Physical rooms ko automatically 'dirty' status me shift karna taake safai staff ko pata chale.
 * 3. In-Person Desk Payment Intake (Cash / Offline Card Slip):
 *    - Front desk counter par physical payment receive karna.
 *    - Strict PBAC Check: Cash ke liye `payments:recordCash` aur Card ke liye `payments:recordCard` verify karna.
 *    - Financial Audit Attribution: Receptionist ki user ID ko `receivedByStaffId` me save karna (Financial Accountability).
 *    - Automatic Balance Settlement: Booking payment status ko 'paid' ya 'partially_paid' me update karna.
 * 4. Front Desk Operations Dashboard (Operational Overview):
 *    - Aaj aane wale (Arrivals), jaane wale (Departures), aur currently ruke hue (In-House) guests ka filter-based overview.
 */
class DeskService {
  /**
   * ==========================================================================
   * METHOD 1: checkInGuest
   * ==========================================================================
   * 
   * Maqsad:
   * Front desk par mehmaan ke pohanchne par uski reservation ko active stay ('checked-in') me tabdeel karna.
   *
   * Business & Security Invariants (Qawaneen):
   * 1. ObjectId Format Check: Ghalat ya corrupt string aane par database crash na ho, 400 Bad Request jaye.
   * 2. Existence Check: Agar booking database me nahi hai toh 404 Not Found return karein.
   * 3. State Machine Check:
   *    - Sirf aur sirf 'confirmed' booking hi check-in ho sakti hai.
   *    - Agar booking pehle se 'checked-in' hai toh duplicate check-in rokein.
   *    - Agar booking 'cancelled' hai toh invalid access rokein.
   *    - Agar booking 'pending' (unpaid) hai toh pehle payment settlement required hai.
   *
   * @param {string} bookingId - Booking document ki MongoDB ObjectId
   * @param {string} [allocatedRoomId] - Receptionist ki taraf se allot kiya gaya physical room ID
   * @returns {Promise<Object>} Updated aur populated booking document
   */
  static async checkInGuest(bookingId, allocatedRoomId = null) {
    // ------------------------------------------------------------------------
    // STEP 1: OBJECT ID VALIDATION (Format ki Durustagi)
    // ------------------------------------------------------------------------
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw ApiError.badRequest("Invalid booking ID format");
    }

    // ------------------------------------------------------------------------
    // STEP 2: DATABASE LOOKUP (Booking Talaash Karna)
    // ------------------------------------------------------------------------
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw ApiError.notFound(`Booking with ID '${bookingId}' not found`);
    }

    // ------------------------------------------------------------------------
    // STEP 3: STATE TRANSITION INTEGRITY (Status ka Qanoon)
    // ------------------------------------------------------------------------
    if (booking.status !== BOOKING_STATUS.CONFIRMED) {
      throw ApiError.badRequest(
        `Cannot check in booking. Current status is '${booking.status}'. Only 'confirmed' bookings can be checked in.`
      );
    }

    // ------------------------------------------------------------------------
    // STEP 4: RECEPTIONIST ROOM ALLOTMENT AUTHORITY
    // ------------------------------------------------------------------------
    // Receptionist ke paas poora ikhtiyar hai ke wo guest ko kisi bhi available,
    // saaf (clean) physical room me allot kare.
    if (allocatedRoomId) {
      if (!mongoose.Types.ObjectId.isValid(allocatedRoomId)) {
        throw ApiError.badRequest("Invalid allocated room ID format");
      }

      const targetRoom = await Room.findOne({
        _id: allocatedRoomId,
        isActive: true,
        isDeleted: false,
      });

      if (!targetRoom) {
        throw ApiError.badRequest("Allocated room does not exist or is inactive");
      }

      if (targetRoom.housekeepingStatus !== 'clean') {
        throw ApiError.badRequest(
          `Room ${targetRoom.roomNumber} cannot be allotted because its status is '${targetRoom.housekeepingStatus}'. It must be clean before check-in.`
        );
      }

      const currentPrimaryRoomId = booking.rooms?.[0]?.roomId?.toString();
      const targetRoomIdStr = targetRoom._id.toString();

      // Agar receptionist ne puranay pre-assigned room se mukhtalif room chuna hai:
      if (currentPrimaryRoomId !== targetRoomIdStr) {
        // Overlap verification: ensure koi doosri active booking is room ko use na kar rahi ho
        const conflict = await Booking.findOne({
          _id: { $ne: booking._id },
          'rooms.roomId': targetRoom._id,
          status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN] },
          checkInDate: { $lt: booking.checkOutDate },
          checkOutDate: { $gt: booking.checkInDate },
        });

        if (conflict) {
          throw ApiError.conflict(
            `Room ${targetRoom.roomNumber} is already occupied or booked for these dates (Ref: ${conflict.bookingReference}).`
          );
        }

        // Purane room ke reservedRanges se booking reference nikaalein
        if (currentPrimaryRoomId) {
          await Room.findByIdAndUpdate(currentPrimaryRoomId, {
            $pull: {
              reservedRanges: { bookingReference: booking.bookingReference },
            },
          });
        }

        // Naye allot shuda room me reservation range push karein
        await Room.findByIdAndUpdate(targetRoom._id, {
          $push: {
            reservedRanges: {
              checkIn: booking.checkInDate,
              checkOut: booking.checkOutDate,
              bookingReference: booking.bookingReference,
            },
          },
        });

        // Booking record me naya room assign karein
        if (booking.rooms && booking.rooms.length > 0) {
          booking.rooms[0].roomId = targetRoom._id;
        } else {
          booking.rooms = [{ roomId: targetRoom._id, pricePerNight: targetRoom.pricePerNight }];
        }
      }
    } else {
      // Agar receptionist ne specific room allot nahi kiya, to mojooda pre-assigned
      // room ki safai verify karein
      for (const r of booking.rooms || []) {
        const roomDoc = await Room.findById(r.roomId);
        if (roomDoc && roomDoc.housekeepingStatus !== 'clean') {
          throw ApiError.badRequest(
            `Cannot check in: Room ${roomDoc.roomNumber} is currently '${roomDoc.housekeepingStatus}'. Please assign a clean room or notify housekeeping.`
          );
        }
      }
    }

    // ------------------------------------------------------------------------
    // STEP 4.1: STRICT PHYSICAL IN-HOUSE OCCUPANCY & DATE OVERLAP GUARDS
    // ------------------------------------------------------------------------
    const finalRoomIds = (booking.rooms || [])
      .map((r) => (r.roomId?._id ? r.roomId._id.toString() : r.roomId?.toString()))
      .filter(Boolean);

    // Guard A: No physical room can have 2 guests checked in at the same time
    const occupiedConflict = await Booking.findOne({
      _id: { $ne: booking._id },
      'rooms.roomId': { $in: finalRoomIds },
      status: BOOKING_STATUS.CHECKED_IN,
    }).populate('rooms.roomId', 'roomNumber');

    if (occupiedConflict) {
      throw ApiError.conflict(
        `Cannot check in: One or more rooms are currently occupied by in-house guest (Booking Ref: '${occupiedConflict.bookingReference}'). The current guest must check out first.`
      );
    }

    // Guard B: No date collision with another active booking
    const overlapConflict = await Booking.findOne({
      _id: { $ne: booking._id },
      'rooms.roomId': { $in: finalRoomIds },
      status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN] },
      checkInDate: { $lt: booking.checkOutDate },
      checkOutDate: { $gt: booking.checkInDate },
    });

    if (overlapConflict) {
      throw ApiError.conflict(
        `Cannot check in: Room is already reserved for these dates by another booking (Ref: '${overlapConflict.bookingReference}').`
      );
    }

    // ------------------------------------------------------------------------
    // STEP 5: FINANCIAL SETTLEMENT CHECK-IN GATE
    // ------------------------------------------------------------------------
    // Guest must have made at least a partial deposit or full payment before keys are issued
    const completedPayments = await Payment.find({
      bookingId: booking._id,
      status: PAYMENT_STATUS.COMPLETED,
    });
    const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    booking.paidAmount = totalPaid;

    if (totalPaid <= 0) {
      throw ApiError.badRequest(
        "Cannot check in guest without payment settlement. Please record at least a partial deposit or full payment at the desk."
      );
    }

    // ------------------------------------------------------------------------
    // STEP 6: MUTATE STATUS & PERSIST
    // ------------------------------------------------------------------------
    booking.status = BOOKING_STATUS.CHECKED_IN;
    await booking.save();

    // ------------------------------------------------------------------------
    // STEP 7: POPULATE DATA FOR FRONT DESK UI
    // ------------------------------------------------------------------------
    await booking.populate("userId", "name email phone");
    await booking.populate("rooms.roomId", "roomNumber type pricePerNight housekeepingStatus capacity");

    return booking;
  }

  /**
   * ==========================================================================
   * METHOD: allotRooms (Multi-Room Allocation by Receptionist)
   * ==========================================================================
   *
   * Allows receptionist to allot physical clean rooms to each slot in a single
   * or multi-room booking, validating cleanliness, date conflicts, and dynamically
   * updating total price based on allocated room rates.
   *
   * @param {string} bookingId - Booking ObjectId
   * @param {Array<{ slotIndex: number, allocatedRoomId: string, pricingPolicy?: string }>} allocations
   * @returns {Promise<Object>} Updated booking document
   */
  static async allotRooms(bookingId, allocations = []) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw ApiError.badRequest("Invalid booking ID format");
    }

    if (!Array.isArray(allocations) || allocations.length === 0) {
      throw ApiError.badRequest("At least one room allocation must be provided");
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw ApiError.notFound(`Booking with ID '${bookingId}' not found`);
    }

    if (booking.status !== BOOKING_STATUS.CONFIRMED && booking.status !== BOOKING_STATUS.PENDING) {
      throw ApiError.badRequest(
        `Cannot allot rooms for booking with status '${booking.status}'. Only confirmed or pending bookings can be allotted.`
      );
    }

    // Ensure no duplicate room IDs within the allocations payload
    const allocatedIds = allocations.map((a) => a.allocatedRoomId?.toString());
    const uniqueIds = new Set(allocatedIds);
    if (uniqueIds.size !== allocatedIds.length) {
      throw ApiError.badRequest("Cannot allocate the same physical room to multiple slots in the same booking");
    }

    // Process each allocation
    for (const alloc of allocations) {
      const { slotIndex = 0, allocatedRoomId } = alloc;

      if (!mongoose.Types.ObjectId.isValid(allocatedRoomId)) {
        throw ApiError.badRequest(`Invalid allocated room ID format for slot ${slotIndex}`);
      }

      if (slotIndex < 0 || slotIndex >= (booking.rooms?.length || 1)) {
        throw ApiError.badRequest(`Invalid slotIndex ${slotIndex}. Booking only contains ${booking.rooms?.length} room(s)`);
      }

      const targetRoom = await Room.findOne({
        _id: allocatedRoomId,
        isActive: true,
        isDeleted: false,
      });

      if (!targetRoom) {
        throw ApiError.badRequest(`Allocated room for slot ${slotIndex} does not exist or is inactive`);
      }

      if (targetRoom.housekeepingStatus !== 'clean') {
        throw ApiError.badRequest(
          `Room ${targetRoom.roomNumber} cannot be allotted because its status is '${targetRoom.housekeepingStatus}'. It must be clean before check-in.`
        );
      }

      const currentRoomSlot = booking.rooms[slotIndex];
      const currentRoomIdStr = currentRoomSlot?.roomId?.toString();
      const targetRoomIdStr = targetRoom._id.toString();

      // Overlap verification: ensure room is not booked by another active booking
      const conflict = await Booking.findOne({
        _id: { $ne: booking._id },
        'rooms.roomId': targetRoom._id,
        status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN] },
        checkInDate: { $lt: booking.checkOutDate },
        checkOutDate: { $gt: booking.checkInDate },
      });

      if (conflict) {
        throw ApiError.conflict(
          `Room ${targetRoom.roomNumber} is already booked or occupied for these dates (Ref: ${conflict.bookingReference}).`
        );
      }

      // Check if room is currently occupied by an in-house guest
      const currentOccupant = await Booking.findOne({
        _id: { $ne: booking._id },
        'rooms.roomId': targetRoom._id,
        status: BOOKING_STATUS.CHECKED_IN,
      });

      if (currentOccupant) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkIn = new Date(booking.checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        if (checkIn <= today || checkIn < new Date(currentOccupant.checkOutDate)) {
          throw ApiError.conflict(
            `Room ${targetRoom.roomNumber} is currently occupied by an in-house guest (Ref: ${currentOccupant.bookingReference}). It cannot be allotted until checkout.`
          );
        }
      }

      if (currentRoomIdStr !== targetRoomIdStr) {
        // Release reservation range from old room
        if (currentRoomIdStr) {
          await Room.findByIdAndUpdate(currentRoomIdStr, {
            $pull: {
              reservedRanges: { bookingReference: booking.bookingReference },
            },
          });
        }

        // Add reservation range to new room
        await Room.findByIdAndUpdate(targetRoom._id, {
          $push: {
            reservedRanges: {
              checkIn: booking.checkInDate,
              checkOut: booking.checkOutDate,
              bookingReference: booking.bookingReference,
            },
          },
        });

        // Update slot
        currentRoomSlot.roomId = targetRoom._id;
        currentRoomSlot.pricePerNight = targetRoom.pricePerNight;
      }

      currentRoomSlot.isAllocated = true;
    }

    // Dynamic price recalculation
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    const diffDays = Math.max(
      1,
      Math.ceil(Math.abs(checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    );

    const sumPerNight = booking.rooms.reduce((sum, r) => sum + (r.pricePerNight || 0), 0);
    const rawTotal = diffDays * sumPerNight;
    booking.totalPrice = Math.max(0, rawTotal - (booking.discountAmount || 0));

    await booking.save();

    await booking.populate("userId", "name email phone");
    await booking.populate("rooms.roomId", "roomNumber type pricePerNight housekeepingStatus capacity");

    return booking;
  }

  /**
   * ==========================================================================
   * METHOD 2: checkOutGuest
   * ==========================================================================
   * 
   * Maqsad:
   * Mehmaan ki rawangi (Departure) par stay khatam karna aur hotel ke kamron ko
   * safai staff (Housekeeping) ke liye 'dirty' mark karna.
   *
   * Business & Architectural Invariants:
   * 1. Status Check: Sirf wahi mehmaan checkout kar sakta hai jo physically hotel me mojood ho ('checked-in').
   * 2. Stay Completion: Booking status tabdeel ho kar 'checked-out' ho jati hai.
   * 3. AUTOMATIC HOUSEKEEPING EVENT (Crucial Logic):
   *    - Real hotel me jab guest kamra chhor kar jata hai toh bedsheets, towels, aur bathroom use ho chuke hote hain.
   *    - System automatically un tamam physical rooms ka `housekeepingStatus` tabdeel karke 'dirty' kar deta hai.
   *    - Is se Housekeeping dashboard par alert chala jata hai aur naya guest ghalati se gande kamre me assign nahi ho sakta.
   *
   * @param {string} bookingId - Booking document ki MongoDB ObjectId
   * @returns {Promise<Object>} Updated booking document with refreshed room statuses
   */
  static async checkOutGuest(bookingId) {
    // ------------------------------------------------------------------------
    // STEP 1: VALIDATE OBJECT ID
    // ------------------------------------------------------------------------
    // Format check taake Mongoose CastError se bacha ja sake
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw ApiError.badRequest("Invalid booking ID format");
    }

    // ------------------------------------------------------------------------
    // STEP 2: FETCH BOOKING
    // ------------------------------------------------------------------------
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw ApiError.notFound(`Booking with ID '${bookingId}' not found`);
    }

    // ------------------------------------------------------------------------
    // STEP 3: CHECKOUT ELIGIBILITY (Check-in Status Lazmi Hai)
    // ------------------------------------------------------------------------
    // Agar koi guest check-in hi nahi hua tha (e.g. 'pending' ya 'confirmed'),
    // toh wo checkout nahi kar sakta. Sirf active in-house guest hi checkout karega.
    if (booking.status !== BOOKING_STATUS.CHECKED_IN) {
      throw ApiError.badRequest(
        `Cannot check out booking. Current status is '${booking.status}'. Only 'checked-in' bookings can be checked out.`
      );
    }

    // ------------------------------------------------------------------------
    // STEP 3.1: FINANCIAL SETTLEMENT GUARD (Unpaid Dues / Baqaya Raqam Check)
    // ------------------------------------------------------------------------
    // Real-world Hotel Policy: Mehmaan bina bill ada kiye hotel nahi chhor sakta!
    // Database me is booking ki tamam completed payments ka hisaab lagayein:
    const completedPayments = await Payment.find({
      bookingId: booking._id,
      status: PAYMENT_STATUS.COMPLETED,
    });

    const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const effectiveTotal = booking.totalPrice ?? booking.totalAmount ?? 0;
    const outstandingBalance = effectiveTotal - totalPaid;

    // Agar guest ke sar koi bhi baqaya raqam (Outstanding Balance > 0) rehti hai,
    // toh checkout foran block kar dein (Bina payment guest leave nahi kar sakta):
    if (outstandingBalance > 0) {
      throw ApiError.badRequest(
        `Cannot check out guest with outstanding balance. Total Amount: $${effectiveTotal}, Total Paid: $${totalPaid}, Remaining Dues: $${Math.max(0, outstandingBalance)}. Please settle all pending payments at the desk before checkout.`
      );
    }

    // ------------------------------------------------------------------------
    // STEP 4: UPDATE BOOKING STATUS
    // ------------------------------------------------------------------------
    // Booking officially close ho gayi
    booking.status = BOOKING_STATUS.CHECKED_OUT;
    await booking.save();

    // Accrue loyalty points for guest ($10 spent = 1 point earned)
    await LoyaltyService.accruePoints(booking);

    // ------------------------------------------------------------------------
    // STEP 5: AUTOMATIC ROOM DIRTY TRIGGER (Housekeeping Integration)
    // ------------------------------------------------------------------------
    // Is booking me jitne bhi kamray book the un sab ki ObjectIds nikaalein:
    const roomIds = booking.rooms.map((r) => r.roomId);

    // MongoDB ke $updateMany operator ke zariye aik hi single fast query me
    // un tamam kamron ka housekeepingStatus 'dirty' set karein:
    if (roomIds.length > 0) {
      await Room.updateMany(
        { _id: { $in: roomIds } },
        {
          $set: { housekeepingStatus: "dirty" },
          $pull: { reservedRanges: { bookingReference: booking.bookingReference } },
        }
      );
    }

    // ------------------------------------------------------------------------
    // STEP 6: POPULATE FRESH STATUS FOR RESPONSE
    // ------------------------------------------------------------------------
    // Response me refreshed housekeepingStatus ('dirty') nazar aana chahiye
    await booking.populate("userId", "name email phone");
    await booking.populate("rooms.roomId", "roomNumber type housekeepingStatus");

    return booking;
  }

  /**
   * ==========================================================================
   * METHOD 3: recordInPersonPayment
   * ==========================================================================
   * 
   * Maqsad:
   * Front desk counter par guest se physical cash ya offline credit/debit card slip
   * ke zariye payment receive karna aur complete audit trail generate karna.
   *
   * Core Security & Financial Principles:
   * 1. Granular PBAC (Permission-Based Access Control):
   *    - Cash lene ke liye receptionist ke paas `payments:recordCash` permission hona shart hai.
   *    - Card swipe slip ke liye `payments:recordCard` permission hona shart hai.
   * 2. Financial Staff Attribution (`receivedByStaffId`):
   *    - Kis staff member ne physically drawer me cash dala? Uski ID payment document par
   *      permanently stamp hoti hai taake sham ko cash audit me 1 rupay ka bhi farq pakra ja sake.
   * 3. Automatic Booking Settlement:
   *    - Purani tamam completed payments + Nayi payment = Total Paid Amount.
   *    - Agar Total Paid >= Booking Total Amount -> `paymentStatus = 'paid'`.
   *    - Agar booking pehle 'pending' thi -> Ab 'confirmed' status me chali jayegi!
   *    - Agar partial payment aayi -> `paymentStatus = 'partially_paid'`.
   *
   * @param {Object} params
   * @param {string} params.bookingId - Kis reservation ke paise hain
   * @param {number} params.amount - Kitni raqam ada ki gayi
   * @param {string} params.paymentMethod - 'cash' ya 'offline-card'
   * @param {string} [params.transactionReference] - POS slip number ya receipt number
   * @param {string} [params.notes] - Staff remarks
   * @param {string} params.staffId - Logged-in staff member ki MongoDB ObjectId
   * @param {Object} params.staffUser - Logged-in staff member ka full document (permissions check ke liye)
   * @returns {Promise<Object>} Created Payment record aur updated Booking settlement summary
   */
  static async recordInPersonPayment({
    bookingId,
    amount,
    paymentMethod,
    transactionReference,
    notes,
    staffId,
    staffUser,
  }) {
    // ------------------------------------------------------------------------
    // STEP 1: INPUT SANITIZATION & VALIDATION
    // ------------------------------------------------------------------------
    // 1.1 Booking ID format check
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw ApiError.badRequest("Invalid booking ID format");
    }

    // 1.2 Amount numerical check (Zero ya negative amount allowed nahi hai)
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw ApiError.badRequest("Payment amount must be a positive number greater than zero");
    }

    // 1.3 Method check: Front desk par sirf 'cash' ya 'offline-card' allowed hai.
    // Online Stripe payment yahan accept nahi hoti, wo webhook ke zariye aati hai.
    const validDeskMethods = [PAYMENT_PROVIDERS.CASH, PAYMENT_PROVIDERS.OFFLINE_CARD];
    if (!validDeskMethods.includes(paymentMethod)) {
      throw ApiError.badRequest(
        `Invalid desk payment method '${paymentMethod}'. Allowed methods are: 'cash', 'offline-card'`
      );
    }

    // ------------------------------------------------------------------------
    // STEP 2: GRANULAR PBAC PERMISSION GUARDS (Security Check)
    // ------------------------------------------------------------------------
    // Super-Admin har permission bypass karta hai. Lekin regular staff members ke liye:
    if (staffUser && staffUser.role !== ROLES.SUPER_ADMIN) {
      // Shart A: Agar cash payment hai toh user ke paas 'payments:recordCash' hona lazmi hai
      if (
        paymentMethod === PAYMENT_PROVIDERS.CASH &&
        !staffUser.permissions?.includes(PERMISSIONS.PAYMENTS_RECORD_CASH)
      ) {
        throw ApiError.forbidden("You do not have permission to record cash payments");
      }

      // Shart B: Agar card payment hai toh user ke paas 'payments:recordCard' hona lazmi hai
      if (
        paymentMethod === PAYMENT_PROVIDERS.OFFLINE_CARD &&
        !staffUser.permissions?.includes(PERMISSIONS.PAYMENTS_RECORD_CARD)
      ) {
        throw ApiError.forbidden("You do not have permission to record card payments");
      }
    }

    // ------------------------------------------------------------------------
    // STEP 3: BOOKING INTEGRITY CHECK
    // ------------------------------------------------------------------------
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw ApiError.notFound(`Booking with ID '${bookingId}' not found`);
    }

    // Cancel ho chuki booking par mazeed paise nahi liye ja sakte
    if (booking.status === BOOKING_STATUS.CANCELLED) {
      throw ApiError.badRequest("Cannot record payment for a cancelled booking");
    }

    // ------------------------------------------------------------------------
    // STEP 4: CREATE IMMUTABLE PAYMENT DOCUMENT (Audit Trail)
    // ------------------------------------------------------------------------
    // Payment collection me naya record create hota hai jisme:
    // 1. `bookingId`: Kis booking ka paisa hai.
    // 2. `userId`: Kis guest ne diya.
    // 3. `receivedByStaffId`: Kis receptionist ne cash counter par receive kiya (Accountability).
    const payment = await Payment.create({
      bookingId: booking._id,
      userId: booking.userId,
      amount: numericAmount,
      currency: "USD",
      paymentMethod,
      status: PAYMENT_STATUS.COMPLETED, // Counter par hath me cash aate hi status 'completed' hota hai
      receivedByStaffId: staffId,
      transactionReference: transactionReference || null,
      notes: notes || "",
    });

    // Fetch guest user details for rich audit log attribution
    let guestUser = null;
    const guestUserId = booking.userId?._id || booking.userId;
    if (guestUserId) {
      guestUser = await User.findById(guestUserId).select('name email phone').lean();
    }

    const resolvedCustomerName =
      booking.guestInfo?.fullName?.trim() ||
      guestUser?.name?.trim() ||
      (booking.userId?.name ? String(booking.userId.name).trim() : null) ||
      'Valued Guest';

    const resolvedCustomerPhone =
      booking.guestInfo?.phone ||
      guestUser?.phone ||
      booking.userId?.phone ||
      null;

    const resolvedCustomerEmail =
      booking.guestInfo?.email ||
      guestUser?.email ||
      booking.userId?.email ||
      null;

    // Record immutable audit log for financial accountability
    await AuditService.logAction({
      actorId: staffId,
      action: `payment:record-${paymentMethod}`,
      targetType: 'Payment',
      targetId: payment._id,
      beforeState: null,
      afterState: {
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        amount: numericAmount,
        currency: 'USD',
        paymentMethod,
        receivedByStaffId: staffId,
        receivedByStaffName: staffUser?.name || 'Staff Cashier',
        receivedByStaffRole: staffUser?.role || 'staff',
        guestName: resolvedCustomerName,
        guestPhone: resolvedCustomerPhone,
        guestEmail: resolvedCustomerEmail,
        transactionReference: transactionReference || null,
        notes: notes || '',
        status: PAYMENT_STATUS.COMPLETED,
      },
    });

    // ------------------------------------------------------------------------
    // STEP 5: SETTLEMENT CALCULATION (Hisaab-Kitaab aur Balance Check)
    // ------------------------------------------------------------------------
    // Is booking ke aewaz ab tak jitni bhi completed payments hui hain unka total nikaalein:
    const allCompletedPayments = await Payment.find({
      bookingId: booking._id,
      status: PAYMENT_STATUS.COMPLETED,
    });

    // Array reduce ke zariye total paid amount calculate karein:
    const totalPaid = allCompletedPayments.reduce((sum, p) => sum + p.amount, 0);

    // ------------------------------------------------------------------------
    // STEP 6: SYNCHRONIZE BOOKING STATUS (Automatic State Transition)
    // ------------------------------------------------------------------------
    const effectiveTotal = booking.totalPrice || booking.totalAmount || 0;
    booking.paidAmount = totalPaid;

    if (totalPaid >= effectiveTotal) {
      // Case A: Puri raqam ada ho chuki hai -> Mark 'completed'
      booking.paymentStatus = PAYMENT_STATUS.COMPLETED;

      // Agar booking 'pay_at_desk' option ki wajah se pehle 'pending' thi,
      // toh ab paise aane par automatically 'confirmed' ho jayegi!
      if (booking.status === BOOKING_STATUS.PENDING) {
        booking.status = BOOKING_STATUS.CONFIRMED;
      }
    } else if (totalPaid > 0) {
      // Case B: Guest ne thode paise diye hain (Advance / Partial Payment)
      booking.paymentStatus = "partially-paid";
      if (booking.status === BOOKING_STATUS.PENDING) {
        booking.status = BOOKING_STATUS.CONFIRMED;
      }
    }

    // Booking ko database me save karein
    await booking.save();

    // ------------------------------------------------------------------------
    // STEP 7: RETURN DETAILED FINANCIAL SUMMARY
    // ------------------------------------------------------------------------
    return {
      payment,
      bookingSummary: {
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        totalAmount: effectiveTotal,
        totalPaid,
        remainingBalance: Math.max(0, effectiveTotal - totalPaid),
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.status,
      },
    };
  }

  /**
   * ==========================================================================
   * METHOD 4: getOperationalOverview
   * ==========================================================================
   * 
   * Maqsad:
   * Front desk receptionist ke dashboard ke liye un mehmaano ki list nikaalna jo:
   * 1. Aaj aane wale hain (Today's Arrivals)
   * 2. Aaj jaane wale hain (Today's Departures)
   * 3. Hotel ke kamron me mojood hain (In-House Guests)
   *
   * Query & Performance Highlights:
   * - Date Normalization: Target date ko 00:00:00 se 23:59:59 tak cover kiya jata hai taake time zone drift na ho.
   * - Compound Index Utilization: `checkInDate` aur `checkOutDate` par index lagay gaye hain taake 10,000 bookings me bhi query fast chale.
   * - Parallel Execution: `Promise.all` ke zariye paginated data aur total count aik sath fetch hota hai.
   *
   * @param {Object} query - Express query string parameters (req.query)
   * @returns {Promise<Object>} Paginated bookings list aur pagination metadata
   */
  static async getOperationalOverview(query = {}) {
    const {
      type,   // 'arrivals' | 'departures' | 'in-house'
      date,   // 'YYYY-MM-DD' (optional, default: today)
      status, // specific status filter (optional)
      page = 1,
      limit = 10,
    } = query;

    // MongoDB filter object build karein
    const filter = {};

    // ------------------------------------------------------------------------
    // STEP 1: DATE WINDOW NORMALIZATION (Tareekh ki Hadoon Ka Ta'ayyun)
    // ------------------------------------------------------------------------
    // Agar client ne specific date pass ki ho toh wo use karein, warna aaj ki date:
    const targetDate = date ? new Date(date) : new Date();

    // Din ki shuruat (Midnight 00:00:00.000)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    // Din ka aakhri lamha (Night 23:59:59.999)
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // ------------------------------------------------------------------------
    // STEP 2: OPERATIONAL TYPE FILTERING (Arrivals, Departures, In-House)
    // ------------------------------------------------------------------------
    if (type === "arrivals") {
      // Aaj aane wale mehmaan:
      // checkInDate aaj ke din me fall karti ho aur status confirmed ya pending ho
      filter.checkInDate = { $gte: startOfDay, $lte: endOfDay };
      filter.status = { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING] };
    } else if (type === "departures") {
      // Aaj jane wale mehmaan:
      // checkOutDate aaj ke din fall karti ho aur status filhal checked-in ho
      filter.checkOutDate = { $gte: startOfDay, $lte: endOfDay };
      filter.status = BOOKING_STATUS.CHECKED_IN;
    } else if (type === "in-house") {
      // Jo mehmaan is waqt hotel ke andar thehre hue hain
      filter.status = BOOKING_STATUS.CHECKED_IN;
    } else if (status) {
      // Custom status filter agar receptionist ne manga ho
      filter.status = status;
    }

    // ------------------------------------------------------------------------
    // STEP 3: PAGINATION CALCULATIONS
    // ------------------------------------------------------------------------
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    // Security check: Limit ko maximum 100 par bandh dein taake server par load na pare
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // ------------------------------------------------------------------------
    // STEP 4: PARALLEL DATABASE QUERY (Fast Execution)
    // ------------------------------------------------------------------------
    // `Promise.all` dono queries ko aik sath chala kar response time aadha kar deta hai
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("userId", "name email phone")
        .populate("rooms.roomId", "roomNumber type pricePerNight housekeepingStatus")
        .sort({ checkInDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(filter),
    ]);

    // ------------------------------------------------------------------------
    // STEP 5: PAGINATED ENVELOPE RETURN
    // ------------------------------------------------------------------------
    return {
      bookings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * ==========================================================================
   * METHOD: getRoomsAllotmentStatus
   * ==========================================================================
   * 
   * Fetches all active physical rooms with real-time occupancy and booking status
   * for front-desk room allotment.
   * 
   * Marks rooms that are already occupied by in-house guests as 'occupied'
   * and rooms that are booked during overlapping dates as 'booked', with booking
   * reference and guest details, preventing double-booking by receptionists.
   */
  static async getRoomsAllotmentStatus({ bookingId, checkInDate, checkOutDate }) {
    let targetBooking = null;
    let effectiveCheckIn = null;
    let effectiveCheckOut = null;
    let currentBookingRoomIds = [];

    if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      targetBooking = await Booking.findById(bookingId);
      if (targetBooking) {
        effectiveCheckIn = targetBooking.checkInDate;
        effectiveCheckOut = targetBooking.checkOutDate;
        currentBookingRoomIds = (targetBooking.rooms || [])
          .map((r) => (r.roomId?._id ? r.roomId._id.toString() : r.roomId?.toString()))
          .filter(Boolean);
      }
    }

    if (checkInDate) {
      effectiveCheckIn = new Date(checkInDate);
    }
    if (checkOutDate) {
      effectiveCheckOut = new Date(checkOutDate);
    }

    if (!effectiveCheckIn) {
      effectiveCheckIn = new Date();
      effectiveCheckIn.setHours(0, 0, 0, 0);
    }
    if (!effectiveCheckOut) {
      effectiveCheckOut = new Date(effectiveCheckIn);
      effectiveCheckOut.setDate(effectiveCheckOut.getDate() + 1);
    }

    // 1. Fetch all active catalog rooms
    const allRooms = await Room.find({
      isDeleted: false,
      isActive: true,
    }).sort({ roomNumber: 1 });

    // 2. Fetch all active bookings in hotel (confirmed, pending, checked-in)
    const excludeQuery = targetBooking ? { _id: { $ne: targetBooking._id } } : {};

    const activeBookings = await Booking.find({
      ...excludeQuery,
      status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN, BOOKING_STATUS.PENDING] },
    })
      .populate('userId', 'name')
      .select('bookingReference status checkInDate checkOutDate rooms guestInfo userId');

    // 3. Map status for each room
    const roomStatuses = allRooms.map((room) => {
      const roomIdStr = room._id.toString();
      const isAssignedToCurrentBooking = currentBookingRoomIds.includes(roomIdStr);

      // Check if room is currently occupied by an in-house guest (status === 'checked-in')
      const inHouseBooking = activeBookings.find(
        (b) =>
          b.status === BOOKING_STATUS.CHECKED_IN &&
          (b.rooms || []).some((r) => {
            const rId = r.roomId?._id ? r.roomId._id.toString() : r.roomId?.toString();
            return rId === roomIdStr;
          })
      );

      // Check if room is booked by another booking with overlapping dates
      const overlappingBooking = activeBookings.find((b) => {
        const matchesRoom = (b.rooms || []).some((r) => {
          const rId = r.roomId?._id ? r.roomId._id.toString() : r.roomId?.toString();
          return rId === roomIdStr;
        });
        if (!matchesRoom) return false;

        const bIn = new Date(b.checkInDate);
        const bOut = new Date(b.checkOutDate);
        return bIn < effectiveCheckOut && bOut > effectiveCheckIn;
      });

      const isOccupied = Boolean(inHouseBooking);
      const isBooked = Boolean(overlappingBooking);

      let conflictRef = null;
      let conflictGuest = null;
      let statusBadge = 'available';

      if (isOccupied) {
        statusBadge = 'occupied';
        conflictRef = inHouseBooking.bookingReference;
        conflictGuest = inHouseBooking.guestInfo?.fullName || inHouseBooking.userId?.name || 'In-House Guest';
      } else if (isBooked) {
        statusBadge = 'booked';
        conflictRef = overlappingBooking.bookingReference;
        conflictGuest = overlappingBooking.guestInfo?.fullName || overlappingBooking.userId?.name || 'Valued Guest';
      } else if (room.housekeepingStatus !== 'clean') {
        statusBadge = room.housekeepingStatus;
      }

      // Can be allotted only if clean, not occupied, and not booked by another guest
      const canAllot =
        room.housekeepingStatus === 'clean' &&
        !isOccupied &&
        (!isBooked || isAssignedToCurrentBooking);

      return {
        _id: room._id,
        roomNumber: room.roomNumber,
        type: room.type,
        capacity: room.capacity,
        pricePerNight: room.pricePerNight,
        amenities: room.amenities || [],
        housekeepingStatus: room.housekeepingStatus,
        isOccupied,
        isBooked,
        isAssignedToCurrentBooking,
        statusBadge,
        conflictRef,
        conflictGuest,
        canAllot,
      };
    });

    return roomStatuses;
  }

  /**
   * ==========================================================================
   * METHOD: createWalkInBooking (Front Desk Walk-In Guest Reservation Engine)
   * ==========================================================================
   * 
   * [URDU / HINGLISH EXPLANATION]:
   * Receptionist ya Admin jab lobby mein anay walay walk-in guest ke liye room
   * book karte hain:
   * 1. Guest Account Resolution: Phone ya email se purana guest dhoondta hai,
   *    agar nahi milta toh naya guest account atomically create karta hai.
   * 2. Room Collision Check: Selected rooms par check-in/out date range mein koi
   *    overlapping active booking na ho.
   * 3. Cleanliness Check: Agar Instant Check-In maanga gaya hai toh kamra 'clean' hona lazmi hai.
   * 4. Pricing & Nights Calculation: Har kamre ki per-night price aur stay duration ka hisab lagata hai.
   * 5. Atomic Booking Creation: Booking record banata hai with bookedByStaffId (Receptionist).
   * 6. Financial Settlement: Agar Cash ya Offline Card select kiya hai toh payment record karta hai.
   * 7. Instant Check-In: Agar true hai toh foran room status occupied aur booking status checked-in karta hai.
   * 8. Security Audit: Immutable audit trail record append karta hai.
   * 
   * @param {Object} params
   * @param {string} params.actorId - Logged-in staff member ki ObjectId
   * @param {Object} [params.staffUser] - Logged-in staff member ka document (payment permission check ke liye)
   * @param {string} params.clientIp - Client IP address
   * @param {Object} params.data - Walk-in payload (guestName, guestPhone, roomIds, dates, etc.)
   * @returns {Promise<Object>} Populated Booking document with Reference code
   */
  static async createWalkInBooking({ actorId, staffUser = null, clientIp = null, data }) {
    const {
      guestName,
      guestPhone,
      guestEmail,
      guestIdDocument,
      roomIds,
      checkInDate,
      checkOutDate,
      numberOfGuests = 1,
      paymentMethod = 'cash',
      paymentAmount,
      instantCheckIn = true,
      specialRequests = '',
    } = data;

    // 0. PAYMENT PERMISSION GUARD
    // Counter par paise lene ke liye wahi PBAC rules jo recordInPersonPayment me hain.
    // Yeh check kisi bhi database write se pehle hota hai.
    const collectsPaymentNow =
      ['cash', 'offline-card', 'card'].includes(paymentMethod) &&
      (paymentAmount === undefined || paymentAmount === null || Number(paymentAmount) > 0);

    if (collectsPaymentNow && staffUser && staffUser.role !== ROLES.SUPER_ADMIN) {
      const requiredPermission =
        paymentMethod === 'cash'
          ? PERMISSIONS.PAYMENTS_RECORD_CASH
          : PERMISSIONS.PAYMENTS_RECORD_CARD;

      if (!staffUser.permissions?.includes(requiredPermission)) {
        throw ApiError.forbidden(
          `You do not have permission to record ${paymentMethod === 'cash' ? 'cash' : 'card'} payments`
        );
      }
    }

    // 1. DATES VALIDATION & NIGHTS CALCULATION
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw ApiError.badRequest('Invalid check-in or check-out date format.');
    }

    if (checkOut <= checkIn) {
      throw ApiError.badRequest('Check-out date must be strictly after check-in date.');
    }

    const diffTime = checkOut.getTime() - checkIn.getTime();
    const totalNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // 2. GUEST USER AUTO-RESOLUTION OR ON-THE-FLY PROVISIONING
    let guest = null;
    const searchConditions = [];
    if (guestEmail && guestEmail.trim()) {
      searchConditions.push({ email: guestEmail.trim().toLowerCase() });
    }
    if (guestPhone && guestPhone.trim()) {
      searchConditions.push({ phone: guestPhone.trim() });
    }

    if (searchConditions.length > 0) {
      guest = await User.findOne({ $or: searchConditions });
    }

    if (!guest) {
      // Auto-generate non-conflicting guest email if not provided
      const finalEmail = (guestEmail && guestEmail.trim())
        ? guestEmail.trim().toLowerCase()
        : `walkin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@guest.grandhorizon.com`;

      const rawPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      guest = await User.create({
        name: guestName.trim(),
        email: finalEmail,
        password: hashedPassword,
        phone: guestPhone.trim(),
        role: ROLES.GUEST,
        isActive: true,
      });
    }

    // 3. FETCH PHYSICAL ROOMS & VALIDATE EXISTENCE
    const rooms = await Room.find({
      _id: { $in: roomIds },
      isActive: true,
      isDeleted: false,
    });

    if (rooms.length !== roomIds.length) {
      throw ApiError.badRequest('One or more selected rooms were not found or are deactivated.');
    }

    // 4. PREVENT OVERLAPPING COLLISION ON SELECTED ROOMS
    const overlappingBookings = await Booking.find({
      'rooms.roomId': { $in: roomIds },
      status: { $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.COMPLETED] },
      checkInDate: { $lt: checkOut },
      checkOutDate: { $gt: checkIn },
    });

    if (overlappingBookings.length > 0) {
      const conflict = overlappingBookings[0];
      throw ApiError.conflict(
        `Selected room is already reserved for the chosen stay duration (Conflict Ref: ${conflict.bookingReference}).`
      );
    }

    // 5. IF INSTANT CHECK-IN: VALIDATE ROOM CLEANLINESS
    if (instantCheckIn) {
      const unreadyRooms = rooms.filter((r) => r.housekeepingStatus !== 'clean');
      if (unreadyRooms.length > 0) {
        const unreadyNumbers = unreadyRooms.map((r) => `#${r.roomNumber}`).join(', ');
        throw ApiError.badRequest(
          `Cannot perform instant check-in: Room(s) ${unreadyNumbers} are currently not clean or already occupied.`
        );
      }
    }

    // 6. CALCULATE TOTAL STAY PRICING
    let totalPrice = 0;
    const bookedRooms = rooms.map((r) => {
      const roomTotal = r.pricePerNight * totalNights;
      totalPrice += roomTotal;
      return {
        roomId: r._id,
        pricePerNight: r.pricePerNight,
        isAllocated: Boolean(instantCheckIn),
      };
    });

    const isPaidNow = paymentMethod === 'cash' || paymentMethod === 'offline-card' || paymentMethod === 'card';
    const finalPaidAmount = isPaidNow
      ? (paymentAmount !== undefined && paymentAmount !== null ? Number(paymentAmount) : totalPrice)
      : 0;

    const bookingStatus = instantCheckIn ? BOOKING_STATUS.CHECKED_IN : BOOKING_STATUS.CONFIRMED;
    const bookingPaymentStatus = isPaidNow
      ? (finalPaidAmount >= totalPrice ? PAYMENT_STATUS.COMPLETED : 'partially-paid')
      : 'unpaid';

    const bookingRef = Booking.generateBookingReference();

    // 7. ATOMIC ROOM DATE LOCK (same guard as online bookings)
    // Har room ke reservedRanges me range sirf tab push hoti hai jab koi overlapping
    // range mojood na ho, taake online aur walk-in bookings aapas me takra na sakein.
    const lockedRoomIds = [];
    const releaseLocks = async () => {
      if (lockedRoomIds.length > 0) {
        await Room.updateMany(
          { _id: { $in: lockedRoomIds } },
          { $pull: { reservedRanges: { bookingReference: bookingRef } } }
        );
      }
    };

    for (const room of rooms) {
      const lockedRoom = await Room.findOneAndUpdate(
        {
          _id: room._id,
          isActive: true,
          isDeleted: false,
          reservedRanges: {
            $not: {
              $elemMatch: {
                checkIn: { $lt: checkOut },
                checkOut: { $gt: checkIn },
              },
            },
          },
        },
        {
          $push: {
            reservedRanges: {
              checkIn,
              checkOut,
              bookingReference: bookingRef,
            },
          },
        },
        { new: true }
      );

      if (!lockedRoom) {
        await releaseLocks();
        throw ApiError.conflict(
          `Room #${room.roomNumber} is no longer available for the chosen stay duration.`
        );
      }
      lockedRoomIds.push(room._id);
    }

    // 8. BOOKING RECORD CREATION (locks release ho jate hain agar yeh fail ho)
    let booking;
    try {
      booking = await Booking.create({
        bookingReference: bookingRef,
        userId: guest._id,
        bookedByStaffId: actorId,
        guestInfo: {
          fullName: guestName.trim(),
          phone: guestPhone.trim(),
          email: guest.email,
          idDocument: guestIdDocument ? guestIdDocument.trim() : null,
        },
        rooms: bookedRooms,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: numberOfGuests || 1,
        specialRequests: specialRequests ? specialRequests.trim() : '',
        totalPrice: totalPrice,
        paidAmount: finalPaidAmount,
        status: bookingStatus,
        paymentStatus: bookingPaymentStatus,
        checkedInAt: instantCheckIn ? new Date() : null,
      });
    } catch (error) {
      await releaseLocks();
      throw error;
    }

    // 9. RECORD FINANCIAL PAYMENT IN LEDGER IF PAID NOW
    if (isPaidNow && finalPaidAmount > 0) {
      await Payment.create({
        bookingId: booking._id,
        userId: guest._id,
        amount: finalPaidAmount,
        currency: 'USD',
        paymentMethod: paymentMethod === 'cash' ? PAYMENT_PROVIDERS.CASH : PAYMENT_PROVIDERS.OFFLINE_CARD,
        status: PAYMENT_STATUS.COMPLETED,
        receivedByStaffId: actorId,
      });
    }

    // 10. APPEND IMMUTABLE SECURITY AUDIT TRAIL EVENT
    await AuditService.logAction({
      actorId,
      action: 'desk:walk-in-booking',
      targetType: 'Booking',
      targetId: booking._id,
      beforeState: null,
      afterState: {
        bookingReference: booking.bookingReference,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        rooms: rooms.map((r) => r.roomNumber),
        totalPrice,
        paidAmount: finalPaidAmount,
        paymentMethod,
        instantCheckIn,
        status: booking.status,
      },
      ipAddress: clientIp,
    });

    // 11. RETURN POPULATED BOOKING FOR FRONTEND DISPOSITION
    const populated = await Booking.findById(booking._id)
      .populate('userId', 'name email phone')
      .populate('rooms.roomId', 'roomNumber type pricePerNight capacity amenities housekeepingStatus')
      .populate('bookedByStaffId', 'name email role')
      .lean();

    return populated;
  }
}

module.exports = DeskService;


