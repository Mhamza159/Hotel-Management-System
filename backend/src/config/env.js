const dotenv = require('dotenv');
const joi = require('joi');
const path = require('path');

// Load environment variables from .env file.
// Hotel Hub par Windows service HOTEL_ENV_FILE set karti hai (e.g. C:ProgramDataGrandHorizonHubhub.env)
// taake secrets program folder se bahar rahein aur update par overwrite na hon.
dotenv.config({
  path: process.env.HOTEL_ENV_FILE
    ? path.resolve(process.env.HOTEL_ENV_FILE)
    : path.resolve(process.cwd(), '.env'),
  quiet: true, // dotenv 17+ ka "injected env" tip logs aur HUB_RESULT output me shor na kare
});

// Hosting dashboards me value ke saath Enter / space / bada harf aa jata hai ("production" + newline,
// "Production") — pehle is se server start hote hi crash hota tha. Saaf kar ke poori app
// (process.env padhne wale hisse bhi) ek hi value dekhe.
if (typeof process.env.NODE_ENV === 'string') {
  process.env.NODE_ENV = process.env.NODE_ENV.trim().toLowerCase();
}

const envSchema = joi
  .object({
    PORT: joi.number().default(5000),
    NODE_ENV: joi.string().valid('development', 'production', 'test').default('development'),
    MONGO_URI: joi.string().required().description('MongoDB connection string'),
    JWT_SECRET: joi.string().min(16).required().description('JWT access token secret'),
    JWT_REFRESH_SECRET: joi.string().min(16).required().description('JWT refresh token secret'),
    JWT_EXPIRES_IN: joi.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: joi.string().default('7d'),
    CLOUDINARY_CLOUD_NAME: joi.string().allow('').default('placeholder'),
    CLOUDINARY_API_KEY: joi.string().allow('').default('placeholder'),
    CLOUDINARY_API_SECRET: joi.string().allow('').default('placeholder'),
    // Har IP ke liye 15 minute me max requests. Hub par saare staff PCs LAN se
    // aate hain aur dashboards bar bar poll karte hain, is liye wahan zyada rakhein.
    RATE_LIMIT_MAX: joi.number().integer().min(1).default(300),
    AUTH_RATE_LIMIT_MAX: joi.number().integer().min(1).default(20),
    // Hub <-> Cloud sync. Ye server "cloud" (Vercel/Atlas) hai ya hotel "hub".
    SYNC_NODE: joi.string().valid('cloud', 'hub').default('cloud'),
    // Dono taraf same secret. Cloud par khaali ho to sync band aur website booking pehle jaisi.
    SYNC_SHARED_KEY: joi.string().min(32).allow('').default(''),
    // Sirf hub: cloud API ka base URL, e.g. https://api.example.com/api/v1
    CLOUD_SYNC_URL: joi.string().uri({ scheme: ['http', 'https'] }).allow('').default(''),
    SYNC_INTERVAL_MS: joi.number().integer().min(2000).default(15000),
    // Cloud: hub itni dair se na mile to online booking band (option 1)
    HUB_OFFLINE_AFTER_MS: joi.number().integer().min(10000).default(120000),
    // Itni purani tabdeeliyan hi bheji jati hain (abhi commit ho rahi writes peechhe na rahein)
    SYNC_SETTLE_MS: joi.number().integer().min(0).default(5000),
    // Invoice par hotel ki maloomat (pehle code me likhi thin). HOTEL_TAX_ID khaali = line nahi chhapti
    HOTEL_NAME: joi.string().default('Grand Horizon Luxury Hotel & Suites'),
    HOTEL_ADDRESS: joi.string().allow('').default('104 Boulevard Avenue, Luxury District, Suite 500'),
    HOTEL_PHONE: joi.string().allow('').default('+92 51 111-468-357'),
    HOTEL_EMAIL: joi.string().allow('').default('reservations@grandhorizon.com'),
    HOTEL_TAX_ID: joi.string().allow('').default('9284715-4'),
    HOTEL_WEBSITE: joi.string().allow('').default('www.grandhorizon.com'),
    // Hotel ka timezone: "aaj", arrivals/departures aur din ki revenue isi se (IANA naam)
    HOTEL_TIMEZONE: joi
      .string()
      .default('Asia/Karachi')
      .custom((value, helpers) => {
        try {
          new Intl.DateTimeFormat('en-US', { timeZone: value });
          return value;
        } catch (e) {
          return helpers.error('any.invalid');
        }
      }),
  })
  .unknown(); // Allow other standard system variables without failing

const { value: validatedEnv, error } = envSchema.validate(process.env, { abortEarly: false });

if (error) {
  const missingKeys = error.details.map((detail) => detail.message).join('\n  - ');
  throw new Error(`[Config Error] Environment variable validation failed:\n  - ${missingKeys}`);
}

module.exports = {
  port: validatedEnv.PORT,
  hotelTimeZone: validatedEnv.HOTEL_TIMEZONE,
  hotel: {
    name: validatedEnv.HOTEL_NAME,
    address: validatedEnv.HOTEL_ADDRESS,
    phone: validatedEnv.HOTEL_PHONE,
    email: validatedEnv.HOTEL_EMAIL,
    taxId: validatedEnv.HOTEL_TAX_ID,
    website: validatedEnv.HOTEL_WEBSITE,
  },
  env: validatedEnv.NODE_ENV,
  mongoUri: validatedEnv.MONGO_URI,
  jwt: {
    secret: validatedEnv.JWT_SECRET,
    refreshSecret: validatedEnv.JWT_REFRESH_SECRET,
    expiresIn: validatedEnv.JWT_EXPIRES_IN,
    refreshExpiresIn: validatedEnv.JWT_REFRESH_EXPIRES_IN,
  },
  rateLimit: {
    max: validatedEnv.RATE_LIMIT_MAX,
    authMax: validatedEnv.AUTH_RATE_LIMIT_MAX,
  },
  sync: {
    node: validatedEnv.SYNC_NODE,
    sharedKey: validatedEnv.SYNC_SHARED_KEY,
    cloudUrl: validatedEnv.CLOUD_SYNC_URL.replace(/\/+$/, ''),
    intervalMs: validatedEnv.SYNC_INTERVAL_MS,
    hubOfflineAfterMs: validatedEnv.HUB_OFFLINE_AFTER_MS,
    settleMs: validatedEnv.SYNC_SETTLE_MS,
  },
  cloudinary: {
    cloudName: validatedEnv.CLOUDINARY_CLOUD_NAME,
    apiKey: validatedEnv.CLOUDINARY_API_KEY,
    apiSecret: validatedEnv.CLOUDINARY_API_SECRET,
  },
};
