import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const env = {
  PORT: process.env.PORT || 8800,
  DATABASE_URL: String(process.env.DATABASE_URL),
  APP_SECRET: "ACCOUNTLY_SECRET",
  NODE_ENV: process.env.NODE_ENV || "local",
  AWS_REGION: process.env.AWS_REGION,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
};
