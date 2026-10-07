const winston = require('winston');

const logFormat = winston.format.printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    process.env.NODE_ENV === 'development'
      ? winston.format.colorize({ all: true })
      : winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        process.env.NODE_ENV === 'development'
          ? winston.format.combine(winston.format.colorize(), logFormat)
          : winston.format.json()
      ),
    }),
  ],
});

// Stream adapter for Morgan HTTP request logging
logger.stream = {
  write: (message) => {
    logger.http ? logger.http(message.trim()) : logger.info(message.trim());
  },
};

module.exports = logger;
