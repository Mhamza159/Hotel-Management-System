const config = require('../config/env');
const logger = require('../utils/logger');
const MediaJob = require('../models/MediaJob');
const Room = require('../models/Room');

/**
 * ============================================================================
 * HUB MEDIA QUEUE — room photos jo internet milne par Cloudinary jayengi
 * ============================================================================
 *
 * Hub par upload hui photo ka room me ye entry banti hai:
 *   { url: http://<hub>/api/v1/media/pending/<jobId>, publicId: 'pending:<jobId>' }
 * Desktop app usay foran hub se dikhati hai (internet ke baghair bhi). Cloud par
 * sync hote waqt 'pending:' photos chhod di jati hain (website par toota link na
 * dikhe). Internet milte hi agent photo Cloudinary par daalta hai aur entry asal
 * URL se badal deta hai — wo tabdeeli normal room sync se website tak jati hai.
 */

const PENDING_PREFIX = 'pending:';
const BATCH = 10;

const isHub = () => config.sync.node === 'hub';
const isPendingPublicId = (publicId) => typeof publicId === 'string' && publicId.startsWith(PENDING_PREFIX);

/** @returns {Promise<{ url: string, publicId: string }>} room.images me lagane wali entry */
const enqueueUpload = async ({ roomId, folder, file, hubOrigin }) => {
  const job = await MediaJob.create({
    type: 'upload',
    roomId,
    folder,
    data: file.buffer,
    contentType: file.mimetype,
  });
  return {
    url: `${hubOrigin}/api/v1/media/pending/${job._id}`,
    publicId: `${PENDING_PREFIX}${job._id}`,
  };
};

/** Photo hatai gayi: pending ho to job hi khatam, warna Cloudinary se baad me hatao */
const enqueueDestroy = async (publicId) => {
  if (isPendingPublicId(publicId)) {
    await MediaJob.deleteOne({ _id: publicId.slice(PENDING_PREFIX.length), type: 'upload' });
    return;
  }
  await MediaJob.create({ type: 'destroy', publicId });
};

const getPendingImage = async (jobId) => MediaJob.findOne({ _id: jobId, type: 'upload' }).lean();

/** Cloud ke signed params se seedha Cloudinary par upload (secret hub par nahi) */
const uploadWithSignature = async (job, sign) => {
  if (sign.mode === 'mock') {
    const publicId = `${job.folder || 'hotel-management/rooms'}/mock_${job._id}`;
    return { url: `https://res.cloudinary.com/hotel-demo/image/upload/v1/${publicId}.webp`, publicId };
  }
  const form = new FormData();
  form.append('file', new Blob([job.data], { type: job.contentType }));
  form.append('api_key', sign.apiKey);
  form.append('timestamp', String(sign.timestamp));
  form.append('signature', sign.signature);
  for (const [key, value] of Object.entries(sign.params)) form.append(key, String(value));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(120000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.secure_url) {
    throw new Error(`Cloudinary upload failed: HTTP ${response.status} ${body.error ? body.error.message : ''}`);
  }
  return { url: body.secure_url, publicId: body.public_id };
};

/** Pending entry ko asal photo se badlo; entry kho gayi ho (cloud ne room badla) to wapis jodo */
const attachUploadedImage = async (job, image) => {
  const pendingId = `${PENDING_PREFIX}${job._id}`;
  const replaced = await Room.updateOne(
    { _id: job.roomId, 'images.publicId': pendingId },
    { $set: { 'images.$': image } }
  );
  if (replaced.matchedCount === 0) {
    await Room.updateOne({ _id: job.roomId, 'images.publicId': { $ne: image.publicId } }, { $push: { images: image } });
  }
};

/**
 * Hub sync agent har kamyab cycle ke baad chalata hai.
 * @param {(path: string, payload: Object) => Promise<Object>} request - cloud sync call
 * @returns {Promise<{ uploaded: number, destroyed: number, failed: number }>}
 */
const processMediaJobs = async (request) => {
  const result = { uploaded: 0, destroyed: 0, failed: 0 };
  const jobs = await MediaJob.find().sort({ createdAt: 1 }).limit(BATCH);

  for (const job of jobs) {
    try {
      if (job.type === 'upload') {
        const room = await Room.exists({ _id: job.roomId });
        if (room) {
          const sign = await request('media/sign', { folder: job.folder });
          const image = await uploadWithSignature(job, sign);
          await attachUploadedImage(job, image);
          result.uploaded += 1;
        }
      } else {
        await request('media/destroy', { publicId: job.publicId });
        result.destroyed += 1;
      }
      await MediaJob.deleteOne({ _id: job._id });
    } catch (error) {
      result.failed += 1;
      await MediaJob.updateOne({ _id: job._id }, { $inc: { attempts: 1 }, $set: { lastError: error.message } });
      logger.warn(`[SYNC] media job ${job._id} (${job.type}) failed, will retry: ${error.message}`);
      break; // shayad internet gaya — agle cycle me dobara
    }
  }
  return result;
};

module.exports = {
  PENDING_PREFIX,
  isHub,
  isPendingPublicId,
  enqueueUpload,
  enqueueDestroy,
  getPendingImage,
  processMediaJobs,
};
