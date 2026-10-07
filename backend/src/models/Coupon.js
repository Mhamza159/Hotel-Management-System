const mongoose = require('mongoose');

/**
 * ============================================================================
 * COUPON MODEL (POLISH-03)
 * ============================================================================
 * 
 * Promotional and loyalty discount coupons applied during booking reservation.
 */
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value must be positive'],
    },
    minBookingAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum booking amount must be positive'],
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: [true, 'Expiration date is required'],
    },
    usageLimit: {
      type: Number,
      default: 100,
      min: [1, 'Usage limit must be at least 1'],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, 'Used count cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

couponSchema.methods.isValid = function (bookingAmount = 0) {
  const now = new Date();
  if (!this.isActive) return false;
  if (now < this.validFrom || now > this.validUntil) return false;
  if (this.usedCount >= this.usageLimit) return false;
  if (bookingAmount < this.minBookingAmount) return false;
  return true;
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
