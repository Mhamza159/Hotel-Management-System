const config = require('../config/env');

/**
 * Seed scripts users / rooms / coupons ko delete aur dobara banate hain. Galti se
 * live database (Atlas / NODE_ENV=production) par na chalein, is liye wahan
 * `--allow-production` dena zaroori hai.
 *
 * @param {string} scriptName - log me dikhane ke liye
 */
const assertSafeToSeed = (scriptName) => {
  const looksLive = config.env === 'production' || config.mongoUri.startsWith('mongodb+srv://');
  if (looksLive && !process.argv.includes('--allow-production')) {
    console.error(
      `[${scriptName}] Refusing to run: MONGO_URI looks like a live database (Atlas or NODE_ENV=production).\n` +
        'Seeding deletes and recreates seed users, rooms and coupons. If this really is a test database, run again with --allow-production.'
    );
    process.exit(1);
  }
};

module.exports = { assertSafeToSeed };
