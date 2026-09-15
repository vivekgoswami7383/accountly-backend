import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { uploadMiddleware } from "../middlewares/upload.middleware.js";
import { uploadFile } from "../controllers/upload.controller.js";

const router = express.Router();

router.post("/", authenticate, uploadMiddleware.single("file"), uploadFile);

export default router;
