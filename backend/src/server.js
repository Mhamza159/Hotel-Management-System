const app = require("./app");
const config = require("./config/env");
const { connectDB } = require("./config/db");
const logger = require("./utils/logger");
const CronService = require("./services/cron.service");

/**
 * =========================================================================
 * SERVER BOOTSTRAPPER
 * =========================================================================
 * 
 * 1. Connects to MongoDB database with connection pooling.
 * 2. Starts Express HTTP server listener.
 * 3. Initializes background scheduled cron jobs (Watchdog).
 * 4. Gracefully handles unhandled rejections and exceptions.
 */
const startServer = async () => {
  try {
    // 1. Establish database connection
    await connectDB();

    // 2. Start HTTP listener
    const server = app.listen(config.port, () => {
      logger.info(
        `Hotel Management System API listening on port ${config.port} [ENV: ${config.env}]`
      );

      // 3. Initialize background watchdog cron jobs (e.g. 15-minute unpaid release)
      CronService.initScheduledJobs();
    });

    // 4. Handle unhandled promise rejections safely
    process.on("unhandledRejection", (err) => {
      logger.error(`Unhandled Promise Rejection: ${err.message}`);
      CronService.stopScheduledJobs();
      server.close(() => process.exit(1));
    });

    // 5. Handle uncaught exceptions
    process.on("uncaughtException", (err) => {
      logger.error(`Uncaught Exception: ${err.message}`);
      CronService.stopScheduledJobs();
      server.close(() => process.exit(1));
    });
  } catch (error) {
    logger.error(`Fatal Server Startup Error: ${error.message}`);
    process.exit(1);
  }
};

startServer();
