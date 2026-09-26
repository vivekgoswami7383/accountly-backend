import express from "express";
import authRouter from "./auth.router.js";
import businessRoutes from "./business.router.js";
import contactRoutes from "./contact.router.js";
import transactionRoutes from "./transaction.router.js";
import dashboardRoutes from "./dashboard.router.js";
import userRoutes from "./user.routes.js";
import expenseRoutes from "./expense.router.js";
import noteRoutes from "./note.router.js";
import uploadRoutes from "./upload.router.js";
import notificationRoutes from "./notification.router.js";
import reminderRoutes from "./reminder.router.js";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/user", userRoutes);
router.use("/business", businessRoutes);
router.use("/contact", contactRoutes);
router.use("/transaction", transactionRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/expense", expenseRoutes);
router.use("/note", noteRoutes);
router.use("/upload", uploadRoutes);
router.use("/notification", notificationRoutes);
router.use("/reminder", reminderRoutes);

export default router;
