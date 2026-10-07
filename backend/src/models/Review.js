const mongoose = require('mongoose');

/**
 * ============================================================================
 * REVIEW MODEL SCHEMA (ENGAGE-02)
 * ============================================================================
 * 
 * Yeh model Hotel rooms ke verified reviews ko manage karta hai.
 * 
 * Key Principles:
 * 1. Zero Fake Reviews: Sirf un guests ke reviews save honge jinhon ne us room me
 *    stay complete (`checked-out` ya `completed`) kiya ho (verifiedStay: true).
 * 2. 1 Review Per Booking: Ek booking par ek hi review submit kiya ja sakta hai (unique bookingId).
 * 3. Static Aggregation Hook: Jab bhi koi review save ya delete hota hai, yeh automatically
 *    us Room ka `averageRating` aur `totalReviews` calculate kar ke update karta hai.
 */

const reviewSchema = new mongoose.Schema(
  {
    // Review likhne wala guest
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Guest ID is required'],
      index: true,
    },

    // Jis room ke baray me review diya ja raha hai
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room ID is required'],
      index: true,
    },

    // Verified booking reference (1 booking = max 1 review)
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      unique: true, // Prevents duplicate reviews for the same stay
      index: true,
    },

    // Rating (1 se 5 stars)
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },

    // Guest ka feedback / tabsera
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },

    // Verified stay indicator (authoritatively checked by review service)
    verifiedStay: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying reviews of a specific room sorted by latest
reviewSchema.index({ roomId: 1, createdAt: -1 });

/**
 * Static method to atomically calculate and update Room's averageRating and totalReviews.
 * @param {mongoose.Types.ObjectId|string} roomId
 */
reviewSchema.statics.calculateAverageRating = async function (roomId) {
  const stats = await this.aggregate([
    {
      $match: { roomId: new mongoose.Types.ObjectId(roomId) },
    },
    {
      $group: {
        _id: '$roomId',
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
      },
    },
  ]);

  const Room = mongoose.model('Room');

  if (stats.length > 0) {
    await Room.findByIdAndUpdate(roomId, {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      totalReviews: stats[0].totalReviews,
    });
  } else {
    await Room.findByIdAndUpdate(roomId, {
      averageRating: 0,
      totalReviews: 0,
    });
  }
};

/**
 * Post-save hook: Trigger average rating recalculation after saving a review.
 */
reviewSchema.post('save', async function () {
  await this.constructor.calculateAverageRating(this.roomId);
});

/**
 * Post-findOneAndDelete hook: Trigger average rating recalculation after deleting a review.
 */
reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await doc.constructor.calculateAverageRating(doc.roomId);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
