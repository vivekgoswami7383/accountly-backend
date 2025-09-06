import bcrypt from "bcrypt";
import jsonwebtoken from "jsonwebtoken";
import { env } from "../config/env.config.js";

export const hashPassword = async (password) => {
  const hash = await bcrypt.hash(password, 10);
  return hash;
};

export const comparePassword = async (password, hashedPassword) => {
  const result = await bcrypt.compare(password, hashedPassword);
  return result;
};

export const generateToken = async (userId, role) => {
  const token = jsonwebtoken.sign(
    {
      user_id: userId,
      role: role,
    },
    env.APP_SECRET,
    {
      expiresIn: "24h",
    }
  );
  return token;
};
