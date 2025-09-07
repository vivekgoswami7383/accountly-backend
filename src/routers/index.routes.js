import express from "express";
import authRouter from "./auth.router.js";
import businessRoutes from "./business.router.js";
import customerRoutes from "./customer.router.js";
import transactionRoutes from "./transaction.router.js";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/business", businessRoutes);
router.use("/customer", customerRoutes);
router.use("/transaction", transactionRoutes);

export default router;
