const mongoose = require('mongoose');

/**
 * Rate limit counters jo saare server instances share karein (Vercel par har
 * serverless instance ki apni memory hoti hai, is liye memory counter kamzor tha).
 * _id = "<route>:<ip>"; resetAt guzarne par TTL index record mita deta hai.
 */
const rateLimitHitSchema = new mongoose.Schema(
  {
    _id: { type: String },
    count: { type: Number, default: 0 },
    resetAt: { type: Date, required: true },
  },
  { versionKey: false }
);

rateLimitHitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RateLimitHit', rateLimitHitSchema);
