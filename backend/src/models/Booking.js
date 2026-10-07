const mongoose = require('mongoose');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../config/constants');

/**
 * ============================================================================
 * BOOKING MODEL SCHEMA
 * ============================================================================
 * 
 * Yeh model Hotel ke reservation contract ko represent karta hai.
 * 
 * Key Architectural Highlights:
 * 1. Multi-Room Checkout: Ek hi booking ke andar mehmaan ek se zyada kamray (e.g. 2 Deluxe, 1 Suite) book kar sakta hai.
 * 2. Price Snapshot: Har book shuda kamray ka us waqt ka price snapshot (`pricePerNight`) store hota hai.
 *    Kyunke agar 6 maah baad hotel apna kiraya barha de, to purani booking ki price change na ho.
 * 3. Idempotency Support: Network drop hone par agar client request retry kare, to duplicate reservation na bane.
 * 4. Cancellation Schema: Server-calculated cancellation tier (100%, 50%, 0%) aur refund amount ko track karta hai.
 * 5. High-Velocity Compound Indexes: Overlap detection, user booking history, aur front-desk daily operations ke liye.
 */

// ============================================================================
// SUB-SCHEMA: BOOKED ROOM ITEM
// ============================================================================
// Ek booking me kitne aur kaun se kamray shamil hain
const bookedRoomItemSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room ID is required'],
    },
    // Booking ke waqt kamre ka per-night rate kya tha?
    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required'],
      min: [0, 'Price per night cannot be negative'],
    },
    // Receptionist ne physically kamra allot kar diya hai ya abhi pending hai
    isAllocated: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false } // Sub-document ki alag se _id banane ki zaroorat nahi hai
);

// ============================================================================
// SUB-SCHEMA: CANCELLATION DETAILS
// ============================================================================
// Agar booking cancel ho to cancellation audit data yahan store hota hai
const cancellationSchema = new mongoose.Schema(
  {
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reason: {
      type: String,
      trim: true,
    },
    // Server-calculated refund policy tier:
    // - '100%': > 48 hours pehle cancel karne par full refund
    // - '50%': 24 se 48 hours ke darmayan cancel karne par half refund
    // - '0%': < 24 hours ke andar cancel karne par zero refund
    // - 'no-show': Mehmaan aya hi nahi
    appliedTier: {
      type: String,
      enum: ['100%', '50%', '0%', 'no-show', 'no-advance-payment'],
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: [0, 'Refund amount cannot be negative'],
    },
  },
  { _id: false }
);

// ============================================================================
// SUB-SCHEMA: CANCELLATION REQUEST (Guest Darkhwast Tracking)
// ============================================================================
// Guest jab cancellation ki darkhwast bhejta hai, toh yeh sub-document state track karta hai:
const cancellationRequestSchema = new mongoose.Schema(
  {
    // Darkhwast kis waqt submit hui
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    // Kis user ne request submit ki
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requesting user ID is required'],
    },
    // Guest ki taraf se radd karne ki waja
    reason: {
      type: String,
      trim: true,
      required: [true, 'Cancellation reason is required'],
    },
    // Request Lifecycle: 'pending' (Intizar), 'approved' (Manzoor), 'rejected' (Mustarad)
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    // Front-Desk ya Super-Admin jisne request ka faisla kiya
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Faisle ka waqt
    reviewedAt: {
      type: Date,
      default: null,
    },
    // Agar staff ne request reject ki toh uski waja
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);


// ============================================================================
// MAIN BOOKING SCHEMA
// ============================================================================
const bookingSchema = new mongoose.Schema(
  {
    // Unique human-readable code jaise: 'BK-M2K8P9-7F3A'
    bookingReference: {
      type: String,
      required: [true, 'Booking reference is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    // Kis guest ne reservation karwayi hai
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    // Front Desk Staff user (Receptionist / Admin) who created reservation on behalf of walk-in guest
    bookedByStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    // Walk-in Guest Profile Snapshot
    guestInfo: {
      fullName: { type: String, trim: true, default: null },
      phone: { type: String, trim: true, default: null },
      email: { type: String, trim: true, default: null },
      idDocument: { type: String, trim: true, default: null },
    },

    // Kamron ki list: Kam az kam 1 kamra lazmi hona chahiye
    rooms: {
      type: [bookedRoomItemSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A booking must contain at least one room',
      },
    },

    // Tareekh-e-Amad (Check-In)
    checkInDate: {
      type: Date,
      required: [true, 'Check-in date is required'],
      index: true,
    },

    // Tareekh-e-Rukhsat (Check-Out)
    checkOutDate: {
      type: Date,
      required: [true, 'Check-out date is required'],
      index: true,
    },

    // Mehmaano ki kul tadaad (Capacity check ke liye)
    numberOfGuests: {
      type: Number,
      required: [true, 'Number of guests is required'],
      min: [1, 'Number of guests must be at least 1'],
    },

    // Mehmaan ki taraf se koi khas darkhwast (e.g. "Silent room on top floor")
    specialRequests: {
      type: String,
      default: '',
      trim: true,
    },

    // Server-calculated total kiraya: (Nights * Room Rates)
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative'],
      alias: 'totalAmount', // `totalAmount` likhne par bhi `totalPrice` map hoga
    },

    // Discount coupon agar koi apply kiya gaya ho
    couponApplied: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative'],
    },

    loyaltyPointsUsed: {
      type: Number,
      default: 0,
      min: [0, 'Loyalty points used cannot be negative'],
    },

    // Total actual payments received for this booking so far
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative'],
    },

    // Booking Lifecycle Status:
    // - pending: Online booking shuru hui hai, payment ka intizar hai (15 min timer)
    // - confirmed: Payment ho chuki hai ya Pay-At-Desk select kiya hai
    // - checked-in: Mehmaan hotel pohanch gaya aur kamre ki chabi mil gayi
    // - checked-out: Mehmaan rawana ho gaya
    // - cancelled: Booking radd kar di gayi
    // - completed: Stay mukammal ho chuki hai (Reviews aur points ke liye eligible)
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
      index: true,
    },

    // Payment Financial Status:
    paymentStatus: {
      type: String,
      enum: [...Object.values(PAYMENT_STATUS), 'unpaid', 'partially-paid'],
      default: 'unpaid',
      index: true,
    },

    // Real-time Check-in stamp (Receptionist jab button dabaye)
    checkedInAt: {
      type: Date,
    },

    // Real-time Check-out stamp
    checkedOutAt: {
      type: Date,
    },

    // Cancellation request tracking (Guest darkhwast audit)
    cancellationRequest: {
      type: cancellationRequestSchema,
      default: null,
    },

    // Cancellation final history jab staff approve kar de
    cancellation: {
      type: cancellationSchema,
      default: null,
    },

    // Unpaid pending booking expiration deadline (e.g. Creation + 15 minutes)
    expiresAt: {
      type: Date,
    },

    // Duplicate requests ko rokne ke liye unique client header token
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: '__v',
  }
);

// ============================================================================
// STATIC METHOD: UNIQUE BOOKING REFERENCE GENERATOR
// ============================================================================
// Format: BK-{TimeInBase36}-{RandomInBase36} ➔ 'BK-M2K8P9-7F3A'
// Short, clean, 100% unique aur phone/SMS par bolne me asaan
bookingSchema.statics.generateBookingReference = function () {
  const time = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK-${time}-${random}`;
};

// ============================================================================
// COMPOUND INDEXES (Query Performance Optimization)
// ============================================================================

// 1. High-speed double-booking / overlap check:
// Jab bhi koi room book hota hai, database in 4 fields ko milakar check karta hai
// taake 1 millisecond ke andar overlap pakad sake.
bookingSchema.index({
  'rooms.roomId': 1,
  status: 1,
  checkInDate: 1,
  checkOutDate: 1,
});

// 2. User booking history sorted by creation:
// Guest ke "My Bookings" page par newest-first list dikhane ke liye.
bookingSchema.index({ userId: 1, createdAt: -1 });

// 3. Desk arrivals query by status and check-in date:
// Receptionist dashboard par aaj aane wale guests ki list foran lane ke liye.
bookingSchema.index({ status: 1, checkInDate: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
