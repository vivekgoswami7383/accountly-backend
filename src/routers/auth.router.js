import express from "express";
import { login, me } from "../controllers/auth.controller.js";
import { loginSchema } from "../validations/auth.validation.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/login", validate(loginSchema), login);

router.get("/me", authenticate, me);

export default router;
