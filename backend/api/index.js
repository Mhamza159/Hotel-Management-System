const app = require("../src/app");
const { connectDB } = require("../src/config/db");
const logger = require("../src/utils/logger");

let isConnecting = null;

module.exports = async (req, res) => {
  try {
    if (!isConnecting) {
      isConnecting = connectDB();
    }
    await isConnecting;
  } catch (error) {
    logger.error(`Database connection error in Vercel function: ${error.message}`);
    isConnecting = null;
  }
  return app(req, res);
};
