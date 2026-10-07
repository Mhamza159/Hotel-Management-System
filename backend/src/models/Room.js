const mongoose = require('mongoose');

/**
 * ============================================================================
 * ROOM MODEL SCHEMA
 * ============================================================================
 * 
 * Yeh model Hotel ke har aik individual physical room ko represent karta hai.
 * 
 * Key Features:
 * 1. Soft Delete Pattern: Kamray ko database se hard-delete karne ke bajaye `isDeleted: true` kiya jata hai,
 *    taake maazi (past) ki bookings aur financial reports kharab na hon.
 * 2. Pre-find Middleware: Aam queries me se deleted rooms automatically filter out ho jaate hain.
 * 3. Atomic Concurrency Lock: `reservedRanges` array har room me un dates ko track karta hai
 *    jin me room booked hai, taake do simultaneous booking requests me double-booking na ho sake.
 * 4. Compound Indexes: High-traffic availability search queries ko fast karne ke liye optimized indexes.
 */

const roomSchema = new mongoose.Schema(
  {
    // Kamre ka number jaise: '101', '204A' (Hamesha Uppercase aur Unique hoga)
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    // Kamre ki category/type: Sirf valid types allowed hain
    type: {
      type: String,
      required: [true, 'Room type is required'],
      enum: {
        values: ['single', 'double', 'deluxe', 'suite', 'presidential'],
        message: '{VALUE} is not a valid room type',
      },
      lowercase: true,
      index: true,
    },

    // Kamre ki description (Guest ko display karne ke liye)
    description: {
      type: String,
      default: '',
      trim: true,
    },

    // Cloudinary ya remote storage par upload ki gayi tasweeron ke URLs aur public IDs
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
      },
    ],

    // Kamre me zyada se zyada kitne mehmaan reh sakte hain (Minimum: 1)
    capacity: {
      type: Number,
      required: [true, 'Room capacity is required'],
      min: [1, 'Capacity must be at least 1 guest'],
    },

    // 1 raat ka bunyadi kiraya (Base price in USD / PKR)
    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required'],
      min: [0, 'Price cannot be negative'],
    },

    // Sahooliyaat ki list (e.g. WiFi, AC, Balcony, Mini Bar)
    amenities: {
      type: [String],
      default: [],
    },

    // Safai aur tayyari ki soorat-e-haal:
    // - clean: Kamra saaf hai, naye guest ko check-in karwaya ja sakta hai
    // - dirty: Guest checkout kar gaya hai, housekeeping staff ko safai karni hai
    // - cleaning: Housekeeping staff kamre ke andar safai kar raha hai
    // - maintenance: Kamre me koi technical masla hai (e.g. AC kharab), booking ke liye unavailable
    housekeepingStatus: {
      type: String,
      enum: {
        values: ['clean', 'dirty', 'cleaning', 'maintenance'],
        message: '{VALUE} is not a valid housekeeping status',
      },
      default: 'clean',
      index: true,
    },

    // Kya kamra commercial booking ke liye active hai?
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Soft-delete flag: Agar hotel management kisi kamre ko remove kare to wo delete nahi hota, sirf hide ho jata hai
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Average guest rating (1.0 to 5.0) auto-calculated by Review hooks
    averageRating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5'],
      index: true,
    },

    // Total count of verified reviews
    totalReviews: {
      type: Number,
      default: 0,
      min: [0, 'Review count cannot be negative'],
    },

    // ========================================================================
    // CONCURRENCY LOCK: RESERVED RANGES
    // ========================================================================
    // Yeh array har us booking ka date-span store karta hai jo is room par active hai.
    // MongoDB ka atomic $findOneAndUpdate operator is array par $not: { $elemMatch: ... }
    // laga kar check karta hai. Agar dates takra rahi hon to query foran null return karti hai,
    // jis se Zero Double-Booking guarantee milti hai.
    reservedRanges: [
      {
        checkIn: {
          type: Date,
          required: true,
        },
        checkOut: {
          type: Date,
          required: true,
        },
        bookingReference: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    // createdAt aur updatedAt automatically manage hote hain
    timestamps: true,
    // Optimistic concurrency tracking ke liye version key (__v)
    versionKey: '__v',
  }
);

// ============================================================================
// COMPOUND INDEXES (Performance Optimization)
// ============================================================================

// 1. Guest Availability Search Index:
// Jab guest search karta hai: "Mujhe deluxe rooms dikhao jo active hon, deleted na hon, aur price range me hon"
// Database pooray table ko scan karne ke bajaye fractions of a millisecond me sorted results deta hai.
roomSchema.index({ type: 1, isActive: 1, isDeleted: 1, pricePerNight: 1 });

// 2. Housekeeping & Front-Desk Dashboard Index:
// Staff ko dekhna hota hai: "Kaun se kamray dirty hain?" ya "Kaun se clean hain?"
roomSchema.index({ housekeepingStatus: 1, isActive: 1, isDeleted: 1 });

// ============================================================================
// SOFT DELETE QUERY MIDDLEWARE
// ============================================================================
// Jab bhi code me `Room.find()`, `Room.findOne()`, waghera chale,
// yeh hook automatically `{ isDeleted: false }` inject kar deta hai,
// jab tak developer explicitly `{ isDeleted: true }` na maangay.
roomSchema.pre(/^find/, function (next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
