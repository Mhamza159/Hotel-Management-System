const mongoose = require('mongoose');

/**
 * ============================================================================
 * MEDIA JOB — hub par Cloudinary ka intezar karti photo (sync nahi hota)
 * ============================================================================
 *
 * Hub par room photo foran Cloudinary nahi jati (internet ho na ho, Cloudinary
 * keys hub par nahi). Photo yahan save hoti hai, hub usay khud serve karta hai,
 * aur sync agent internet milte hi cloud se signed upload le kar Cloudinary par
 * daal deta hai. 'destroy' = Cloudinary se purani photo hatani hai.
 */
const mediaJobSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['upload', 'destroy'], required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    folder: { type: String },
    data: { type: Buffer },
    contentType: { type: String },
    // destroy: Cloudinary public id
    publicId: { type: String },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

mediaJobSchema.index({ createdAt: 1 });

module.exports = mongoose.model('MediaJob', mediaJobSchema);
