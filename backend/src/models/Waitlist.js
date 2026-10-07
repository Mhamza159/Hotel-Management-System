const mongoose = require('mongoose');

/**
 * ============================================================================
 * WAITLIST MODEL SCHEMA (ENGAGE-03)
 * ============================================================================
 * 
 * Yeh model un guests ki requests ko store karta hai jo kisi specific room type
 * aur date range ke liye sold-out honay par intizar (waitlist) me shamil hotay hain.
 * 
 * Jab bhi koi booking cancel ho ya 15-minute unpaid reservation release ho,
 * CancellationService / CronService is collection ko query kar ke
 * matching guests ko automatic notification trigger karega.
 */

const waitlistSchema = new mongoose.Schema(
  {
    // Guest jis ne waitlist join ki
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Guest ID is required'],
      index: true,
    },

    // Room type jis ke liye waitlist join ki gayi
    roomType: {
      type: String,
      required: [true, 'Room type is required'],
      enum: {
        values: ['single', 'double', 'deluxe', 'suite', 'presidential'],
        message: '{VALUE} is not a valid room type',
      },
      lowercase: true,
      index: true,
    },

    // Check-in date
    checkIn: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },

    // Check-out date
    checkOut: {
      type: Date,
      required: [true, 'Check-out date is required'],
    },

    // Entry ki state:
    // - active: Guest notification ka intizar kar raha hai
    // - notified: Free inventory ki notification bheji ja chuki hai
    // - expired: CheckIn date guzar chuki hai
    // - cancelled: Guest ne khud request cancel kar di
    status: {
      type: String,
      enum: {
        values: ['active', 'notified', 'expired', 'cancelled'],
        message: '{VALUE} is not a valid waitlist status',
      },
      default: 'active',
      index: true,
    },

    // Notification bhejny ka waqt
    notifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index: Jab koi room free ho, to tezi se matching active waitlist entries dhoondnay ke liye
waitlistSchema.index({ roomType: 1, status: 1, checkIn: 1, checkOut: 1 });

const Waitlist = mongoose.model('Waitlist', waitlistSchema);

module.exports = Waitlist;
