import express from "express";
import { statistics } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/statistics", authenticate, statistics);

export default router;
