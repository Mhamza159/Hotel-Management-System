const IdempotencyKey = require("../models/IdempotencyKey");
const ApiError = require("../utils/apiError");

/**
 * =========================================================================
 * IDEMPOTENCY MIDDLEWARE
 * =========================================================================
 *
 * Prevents double-execution of critical mutating operations (Bookings, Payments).
 *
 * 1. Reads 'Idempotency-Key' from incoming request headers.
 * 2. If identical key + user is 'in-progress', returns 409 Conflict.
 * 3. If identical key + user is 'completed', returns cached response immediately.
 * 4. If new, records 'in-progress', wraps res.json, and saves completed payload.
 *
 * @param {object} options - Configuration options
 * @param {boolean} options.required - If true, throws 400 if Idempotency-Key header is missing
 * @returns {Function} Express middleware
 */
const idempotency = (options = { required: false }) => {
  return async (req, res, next) => {
    try {
      // 1. Header se Idempotency-Key nikalna
      const key = req.headers["idempotency-key"];

      // Agar key missing hai aur required nahi hai, toh aage chalne dein
      if (!key) {
        if (options.required) {
          throw new ApiError(
            400,
            "Idempotency-Key header is required for this operation."
          );
        }
        return next();
      }

      // Idempotency check ke liye authenticated user hona lazmi hai
      if (!req.user || !req.user._id) {
        return next(
          new ApiError(
            401,
            "Authentication required when using Idempotency-Key."
          )
        );
      }

      const userId = req.user._id;

      // 2. Database me check karein ke kya yeh key pehle se exist karti hai
      let record = await IdempotencyKey.findOne({ key, userId });

      if (record) {
        // Case A: Request pehle se process ho rahi hai (Concurrent execution)
        if (record.status === "in-progress") {
          throw new ApiError(
            409,
            "A request with this Idempotency-Key is currently being processed. Please wait."
          );
        }

        // Case B: Request pehle hi complete ho chuki thi -> Cached response return karein!
        if (record.status === "completed") {
          return res.status(record.statusCode).json(record.responseBody);
        }
      }

      // 3. Case C: Nayi request hai -> Pehle 'in-progress' record create karein
      try {
        record = await IdempotencyKey.create({
          key,
          userId,
          path: req.originalUrl || req.url,
          status: "in-progress",
        });
      } catch (err) {
        // Agar exact same millisecond me do requests aa jayein toh unique index error aayega (code 11000)
        if (err.code === 11000) {
          throw new ApiError(
            409,
            "Concurrent duplicate request detected with identical Idempotency-Key."
          );
        }
        throw err;
      }

      // 4. Response interception:
      // Express ke res.json ko wrap karein taake jab controller response bheje,
      // hum us response ko database me 'completed' status ke sath cache kar sakein
      const originalJson = res.json.bind(res);

      res.json = (body) => {
        // Background me record update karein
        IdempotencyKey.findByIdAndUpdate(record._id, {
          statusCode: res.statusCode || 200,
          responseBody: body,
          status: "completed",
        }).catch((updateErr) => {
          // Silent catch taake client ka response block na ho
          console.error("Failed to cache idempotency response:", updateErr);
        });

        // Asal client ko response bhej dein
        return originalJson(body);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = idempotency;
