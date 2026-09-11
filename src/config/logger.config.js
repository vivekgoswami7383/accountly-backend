import winston from "winston";

const { combine, timestamp, errors, splat, colorize, printf } = winston.format;

const consoleFormat = combine(
  colorize(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  splat(),
  printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

export const logger = winston.createLogger({
  level: "info",
  transports: [new winston.transports.Console({ format: consoleFormat })],
});
