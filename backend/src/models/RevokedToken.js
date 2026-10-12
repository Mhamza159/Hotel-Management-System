const mongoose = require('mongoose');

/**
 * ============================================================================
 * REVOKED REFRESH TOKENS (logout / rotation denylist)
 * ============================================================================
 *
 * Refresh token me ek random `jti` hota hai. Logout par, ya refresh hone par purana
 * token, yahan likha jata hai taake wo dobara kaam na kare. Record token ki apni
 * expiry par TTL index se khud mit jata hai. Har node (hub / cloud) ka apna —
 * sync nahi hota (dono ke JWT secrets bhi alag hain).
 */
const revokedTokenSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, enum: ['logout', 'rotated'], default: 'logout' },
    revokedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false }
);

revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RevokedToken', revokedTokenSchema);
