import mongoose from "mongoose";
import { env } from "./env.config.js";

export const databaseConnection = () => {
  return new Promise((resolve, reject) => {
    mongoose
      .connect(env.DATABASE_URL)
      .then(() => {
        resolve(true);
      })
      .catch((error) => {
        reject(error);
      });
  });
};
