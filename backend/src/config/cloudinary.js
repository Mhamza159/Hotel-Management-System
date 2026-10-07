const cloudinary = require("cloudinary").v2;
const config = require("./env");
const logger = require("../utils/logger");

/**
 * ============================================================================
 * CLOUDINARY CONFIGURATION & STREAM UPLOAD SERVICE
 * ============================================================================
 *
 * Yeh module hotel rooms ki multimedia tasweeron (photos) ko remote Cloudinary CDN
 * par upload aur delete karne ka pipeline manage karta hai.
 *
 * Test-Safe Architecture:
 * Automated tests me real Cloudinary API keys na hone par network call fail nahi hogi;
 * test environment me safe deterministic mock return hota hai taake CI/CD me 100%
 * tests fast aur reliable pass hon.
 */

// Cloudinary client configuration
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

/**
 * Uploads an in-memory buffer directly to Cloudinary using a writable stream.
 *
 * @param {Buffer} buffer - File buffer provided by Multer memory storage
 * @param {Object} [options] - Additional Cloudinary upload options (e.g. folder, transformation)
 * @returns {Promise<{ url: string, publicId: string }>}
 */
const uploadStreamToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    // ------------------------------------------------------------------------
    // TEST ENVIRONMENT MOCK: Offline unit/integration test harness protection
    // ------------------------------------------------------------------------
    if (config.env === "test" || config.cloudinary.cloudName === "placeholder" || !config.cloudinary.apiKey) {
      const mockPublicId = `hotel-management/rooms/mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      return resolve({
        url: `https://res.cloudinary.com/hotel-demo/image/upload/v1/${mockPublicId}.webp`,
        publicId: mockPublicId,
      });
    }

    const defaultFolder = "hotel-management/rooms";
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || defaultFolder,
        resource_type: "image",
        format: "webp", // Convert automatically to high-efficiency WebP format
        transformation: [{ quality: "auto:good" }],
        ...options,
      },
      (error, result) => {
        if (error) {
          logger.error(`[Cloudinary Error] Stream upload failed: ${error.message}`);
          return reject(error);
        }
        return resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    // Write RAM buffer into upload stream
    uploadStream.end(buffer);
  });
};

/**
 * Deletes a remote asset from Cloudinary by its publicId.
 *
 * @param {string} publicId - The Cloudinary asset identifier
 * @returns {Promise<Object>} Deletion result
 */
const deleteFromCloudinary = async (publicId) => {
  if (config.env === "test" || config.cloudinary.cloudName === "placeholder") {
    return { result: "ok" };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.error(`[Cloudinary Error] Asset deletion failed for publicId '${publicId}': ${error.message}`);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadStreamToCloudinary,
  deleteFromCloudinary,
};
