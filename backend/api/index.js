const app = require("../src/app");
const { connectDB } = require("../src/config/db");

let isConnecting = null;

module.exports = async (req, res) => {
  try {
    if (!isConnecting) {
      isConnecting = connectDB();
    }
    await isConnecting;
  } catch (error) {
    console.error("Database connection error in Vercel function:", error);
    isConnecting = null;
  }
  return app(req, res);
};
