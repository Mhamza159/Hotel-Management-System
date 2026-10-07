const dns = require("node:dns");
const mongoose = require("mongoose");
const config = require("./env");
const logger = require("../utils/logger");

// Resolve Windows DNS querySrv ECONNREFUSED error for MongoDB Atlas
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
  // Ignore if unable to set custom DNS servers
}

/**
 * Connects to MongoDB with production connection pool settings.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      maxPoolSize: 50, // Allows up to 50 concurrent connections
      serverSelectionTimeoutMS: 4000,
    });

    logger.info(
      `MongoDB Connected: ${conn.connection.host} [DB: ${conn.connection.name}]`,
    );

    // Monitor connection events
    mongoose.connection.on("error", (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected. Attempting reconnection...");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected successfully.");
    });

    return conn;
  } catch (error) {
    logger.warn(
      `Primary MongoDB connection failed (${error.message}). Attempting local fallback (127.0.0.1:27017)...`,
    );
    try {
      const fallbackConn = await mongoose.connect(
        "mongodb://127.0.0.1:27017/hotel_management",
        {
          maxPoolSize: 50,
          serverSelectionTimeoutMS: 4000,
        },
      );
      logger.info(
        `MongoDB Connected (Local Fallback): ${fallbackConn.connection.host} [DB: ${fallbackConn.connection.name}]`,
      );
      return fallbackConn;
    } catch (fallbackErr) {
      logger.error(`Error connecting to MongoDB: ${fallbackErr.message}`);
      process.exit(1);
    }
  }
};

/**
 * Executes a callback within a MongoDB ACID transaction session.
 * Automatically commits on success and aborts on error.
 *
 * @param {Function} callback - Async function receiving (session)
 * @returns {Promise<any>} Result of the callback
 */
const withTransaction = async (callback) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Graceful shutdown handler to safely close database connections.
 */
const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    logger.info("MongoDB connection closed cleanly through app termination.");
  }
};

// Handle process termination signals
process.on("SIGINT", async () => {
  await closeDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeDB();
  process.exit(0);
});

module.exports = {
  connectDB,
  withTransaction,
  closeDB,
};
