const mongoose = require("mongoose");

/**
 * =========================================================================
 * IDEMPOTENCY KEY MODEL
 * =========================================================================
 *
 * Stores cached HTTP response payloads for mutating requests (Bookings, Payments).
 * Guarantees zero duplicate operations even if network retries or double-clicks occur.
 * Includes a TTL (Time-To-Live) index to automatically prune records after 24 hours.
 */

const idempotencyKeySchema = new mongoose.Schema({
  // Unique idempotency string supplied by client header (e.g. UUID v4)
  key: {
    type: String,
    required: [true, "Idempotency key string is required"],
    trim: true,
  },
  // User ID who initiated the request (prevents key collision across different users)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required for idempotency binding"],
  },
  // Request path (e.g. /api/v1/bookings)
  path: {
    type: String,
    required: true,
    trim: true,
  },
  // Final HTTP status code returned by controller (e.g. 201 Created)
  statusCode: {
    type: Number,
  },
  // Serialized JSON response payload returned to client
  responseBody: {
    type: mongoose.Schema.Types.Mixed,
  },
  // Lifecycle state of request:
  // - 'in-progress': Server is currently executing the controller
  // - 'completed': Controller finished and response is securely cached
  status: {
    type: String,
    enum: ["in-progress", "completed"],
    default: "in-progress",
  },
  // Auto-cleanup: MongoDB automatically deletes document after 24 hours (86400 seconds)
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // 24 hours TTL index
  },
});

// Compound unique index: Ek hi user ek hi Idempotency-Key ko doosri dafa naye request ke liye use nahi kar sakta
idempotencyKeySchema.index({ key: 1, userId: 1 }, { unique: true });

const IdempotencyKey = mongoose.model("IdempotencyKey", idempotencyKeySchema);

module.exports = IdempotencyKey;
