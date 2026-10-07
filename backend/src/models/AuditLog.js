const mongoose = require('mongoose');

/**
 * ============================================================================
 * AUDIT LOG MODEL SCHEMA (MGMT-01)
 * ============================================================================
 * 
 * Yeh model Hotel Management System ke tamam sensitive administrative,
 * financial aur security mutations ka na-mitne-wala (immutable) record store karta hai.
 * 
 * Invariants & Qawaneen:
 * 1. Immutability: Ek dafa record create hone ke baad usay update ya delete nahi kiya ja sakta.
 * 2. Complete State Delta: Tabdeeli se pehle (beforeState) aur baad (afterState)
 *    dono states snapshot me mehfooz rehti hain.
 * 3. Traceability: Kis staff user ne kis IP address se kya action kiya, sab track hota hai.
 */

const auditLogSchema = new mongoose.Schema(
  {
    // Action perform karne wala user (Admin ya Staff)
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor ID is required'],
      index: true,
    },

    // Action ka naam (e.g. 'staff:permission-update', 'room:rate-update', 'payment:record-cash')
    action: {
      type: String,
      required: [true, 'Audit action identifier is required'],
      trim: true,
      index: true,
    },

    // Entity jis par action hua (e.g. 'User', 'Room', 'Booking', 'Payment')
    targetType: {
      type: String,
      required: [true, 'Target entity type is required'],
      enum: ['User', 'Room', 'Booking', 'Payment', 'System'],
      index: true,
    },

    // Target entity ki MongoDB ObjectId
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Target ID is required'],
      index: true,
    },

    // Tabdeeli se pehle ka snapshot (Before state)
    beforeState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Tabdeeli ke baad ka snapshot (After state)
    afterState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Request karne wale client ka IP address
    ipAddress: {
      type: String,
      trim: true,
      default: null,
    },

    // Timestamp jo strictly immutable hai
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
  },
  {
    // UpdatedAt disabled kyun ke update allowed hi nahi hai
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

// ============================================================================
// COMPOUND INDEXES (Audit Trail Fast Retrieval)
// ============================================================================
// 1. Specific actor ki activity timeline:
auditLogSchema.index({ actorId: 1, createdAt: -1 });

// 2. Specific entity (e.g. Room #101) ki change history:
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

// ============================================================================
// STRICT IMMUTABILITY HOOKS (Tamper Protection)
// ============================================================================
// Agar koi query audit record ko modify ya delete karne ki koshish kare toh foran block karein
const blockModification = function (next) {
  const err = new Error('AuditLog records are strictly immutable and cannot be updated or deleted.');
  err.name = 'ImmutabilityViolationError';
  return next(err);
};

auditLogSchema.pre('updateOne', blockModification);
auditLogSchema.pre('updateMany', blockModification);
auditLogSchema.pre('findOneAndUpdate', blockModification);
auditLogSchema.pre('deleteOne', blockModification);
auditLogSchema.pre('deleteMany', blockModification);
auditLogSchema.pre('findOneAndDelete', blockModification);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
