const multer = require("multer");
const ApiError = require("../utils/apiError");

/**
 * ============================================================================
 * MULTER IN-MEMORY FILE UPLOAD MIDDLEWARE
 * ============================================================================
 *
 * Yeh middleware incoming multipart/form-data requests se images ko capture karta hai.
 *
 * Architecture Highlights:
 * 1. Memory Storage: File hard drive par save nahi hoti, direct RAM Buffer me rehti hai
 *    taake serverless / Docker environments me disk storage ka issue na aaye.
 * 2. Strict MIME Type Whitelist: Sirf JPEG, PNG, aur WEBP images allow hain.
 * 3. File Size Guard: 5MB per image limit.
 * 4. Quantity Guard: Aik waqt me maximum 5 images upload ho sakti hain.
 */

// Memory storage engine: Files kept in Buffer
const storage = multer.memoryStorage();

// File filter guard
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type '${file.mimetype}'. Only JPEG, PNG, and WEBP image formats are supported.`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes
    files: 5, // Maximum 5 files per request
  },
});

/**
 * Wrapper for multer upload array that catches multer-specific errors
 * and transforms them into standard ApiError envelopes.
 *
 * @param {string} fieldName - Form field name (default: 'images')
 * @param {number} maxCount - Maximum files (default: 5)
 */
const handleUploadImages = (fieldName = "images", maxCount = 5) => {
  const multerMiddleware = upload.array(fieldName, maxCount);

  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(
            new ApiError(400, "Image size cannot exceed 5MB.")
          );
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return next(
            new ApiError(400, `Too many files uploaded. Maximum allowed is ${maxCount}.`)
          );
        }
        return next(new ApiError(400, `File upload error: ${err.message}`));
      } else if (err) {
        return next(err);
      }
      next();
    });
  };
};

module.exports = {
  handleUploadImages,
};
