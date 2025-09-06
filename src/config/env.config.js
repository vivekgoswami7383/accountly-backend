import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const env = {
  PORT: process.env.PORT || 8800,
  DATABASE_URL: String(process.env.DATABASE_URL),
  APP_SECRET: "ACCOUNTLY_SECRET",
};
