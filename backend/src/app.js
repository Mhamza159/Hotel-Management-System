const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const logger = require("./utils/logger");
const authRoutes = require("./routes/auth.routes");
const roomRoutes = require("./routes/room.routes");
const bookingRoutes = require("./routes/booking.routes");
const deskRoutes = require("./routes/desk.routes");
const {
  reviewRouter,
  loyaltyRouter,
  waitlistRouter,
  wishlistRouter,
} = require("./routes/engagement.routes");
const adminRoutes = require("./routes/admin.routes");
const chatRoutes = require("./routes/chat.routes");
const syncRoutes = require("./routes/sync.routes");
const mediaRoutes = require("./routes/media.routes");
const { authLimiter, generalLimiter } = require("./middlewares/rateLimiter.middleware");
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");
const { setupSwagger } = require("./config/swagger");
const { isTest, isLocalDevelopment } = require("./utils/runtime");

const app = express();

/**
 * =========================================================================
 * GLOBAL MIDDLEWARES & SECURITY
 * =========================================================================
 */

// 1. Helmet: Sets essential HTTP response headers for web security
app.use(helmet());

// 2. CORS: Cross-Origin Resource Sharing configuration
const clientUrls = (process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...clientUrls,
  "app://hotel", // Grand Horizon Staff desktop app (Electron custom scheme)
  "http://localhost", // Grand Horizon Staff Android app (Capacitor WebView, mobile/)
  "http://localhost:5173",
  "http://localhost:5000",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Koi bhi *.vercel.app site (kisi aur ki bhi) pehle allowed thi. CORS_ALLOW_VERCEL_PREVIEWS=false
      // karne par sirf CLIENT_URL wale domains (default true taake live site na toote).
      const allowVercelPreviews = process.env.CORS_ALLOW_VERCEL_PREVIEWS !== "false";
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        // Sab origins sirf tests / developer ki machine par (Vercel par kabhi nahi)
        isTest() ||
        isLocalDevelopment() ||
        (allowVercelPreviews && origin.endsWith(".vercel.app"))
      ) {
        return callback(null, true);
      }
      // CORS headers na bhejo (browser khud rok deta hai) — pehle ye 500 error banta tha
      return callback(null, false);
    },
    credentials: true,
  })
);

// Hub <-> cloud sync batches apna parser (bari limit, key check ke baad) use karte hain
const isSyncTransfer = (req) => {
  const path = req.originalUrl.split("?")[0];
  return path === "/api/v1/sync/push" || path === "/api/v1/sync/pull";
};

// 3. Body parsers: JSON payload parsing with safety size limit (16kb)
const jsonParser = express.json({ limit: "16kb" });
app.use((req, res, next) => (isSyncTransfer(req) ? next() : jsonParser(req, res, next)));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// 4. HTTP Request Logging: Streams morgan access logs into Winston structured logger
app.use(morgan("combined", { stream: logger.stream }));

// 5. Interactive Swagger / OpenAPI Documentation (Available at /api-docs)
setupSwagger(app);

/**
 * =========================================================================
 * API ROUTES
 * =========================================================================
 */

// Health check endpoint (for server monitoring and uptime probes)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// General rate limiter for all /api endpoints
// (sync push/pull shared key se protected hain aur har cycle me chalte hain — limiter se bahar)
app.use("/api", (req, res, next) => (isSyncTransfer(req) ? next() : generalLimiter(req, res, next)));

// Mount module routes
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/rooms", roomRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/desk", deskRoutes);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/loyalty", loyaltyRouter);
app.use("/api/v1/waitlist", waitlistRouter);
app.use("/api/v1/wishlist", wishlistRouter);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/sync", syncRoutes);
app.use("/api/v1/media", mediaRoutes);

/**
 * =========================================================================
 * ERROR HANDLING MIDDLEWARES
 * =========================================================================
 */

// 1. Unmatched Route Handler: Forwards non-existent routes as 404 ApiError
app.use(notFoundHandler);

// 2. Centralized Error Handler: Normalizes and structures JSON error envelopes
app.use(errorHandler);

module.exports = app;
