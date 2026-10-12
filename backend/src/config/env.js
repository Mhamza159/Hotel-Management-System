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

const envSchema = joi
  .object({
    PORT: joi.number().default(5000),
    NODE_ENV: joi.string().valid('development', 'production', 'test').default('development'),
    MONGO_URI: joi.string().required().description('MongoDB connection string'),
    JWT_SECRET: joi.string().min(16).required().description('JWT access token secret'),
    JWT_REFRESH_SECRET: joi.string().min(16).required().description('JWT refresh token secret'),
    JWT_EXPIRES_IN: joi.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: joi.string().default('7d'),
    STRIPE_SECRET_KEY: joi.string().allow('').default('sk_test_placeholder'),
    CLOUDINARY_CLOUD_NAME: joi.string().allow('').default('placeholder'),
    CLOUDINARY_API_KEY: joi.string().allow('').default('placeholder'),
    CLOUDINARY_API_SECRET: joi.string().allow('').default('placeholder'),
    // Har IP ke liye 15 minute me max requests. Hub par saare staff PCs LAN se
    // aate hain aur dashboards bar bar poll karte hain, is liye wahan zyada rakhein.
    RATE_LIMIT_MAX: joi.number().integer().min(1).default(300),
    AUTH_RATE_LIMIT_MAX: joi.number().integer().min(1).default(20),
  })
  .unknown(); // Allow other standard system variables without failing

const { value: validatedEnv, error } = envSchema.validate(process.env, { abortEarly: false });

if (error) {
  const missingKeys = error.details.map((detail) => detail.message).join('\n  - ');
  throw new Error(`[Config Error] Environment variable validation failed:\n  - ${missingKeys}`);
}

module.exports = {
  port: validatedEnv.PORT,
  env: validatedEnv.NODE_ENV,
  mongoUri: validatedEnv.MONGO_URI,
  jwt: {
    secret: validatedEnv.JWT_SECRET,
    refreshSecret: validatedEnv.JWT_REFRESH_SECRET,
    expiresIn: validatedEnv.JWT_EXPIRES_IN,
    refreshExpiresIn: validatedEnv.JWT_REFRESH_EXPIRES_IN,
  },
  stripe: {
    secretKey: validatedEnv.STRIPE_SECRET_KEY,
  },
  rateLimit: {
    max: validatedEnv.RATE_LIMIT_MAX,
    authMax: validatedEnv.AUTH_RATE_LIMIT_MAX,
  },
  cloudinary: {
    cloudName: validatedEnv.CLOUDINARY_CLOUD_NAME,
    apiKey: validatedEnv.CLOUDINARY_API_KEY,
    apiSecret: validatedEnv.CLOUDINARY_API_SECRET,
  },
};
