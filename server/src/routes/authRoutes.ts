import express from "express";

import {
  register,
  login,
  verifyEmailOtp,
  resendVerification,
  forgotPassword,
  resetPassword,
  getMe,
} from "../controllers/authController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// ================= Register =================
router.post("/register", register);

// ================= Login =================
router.post("/login", login);

// ================= Verify Email OTP =================
router.post("/verify-otp", verifyEmailOtp);

// ================= Resend Verification =================
router.post(
  "/resend-verification",
  resendVerification
);

// ================= Forgot Password =================
router.post(
  "/forgot-password",
  forgotPassword
);

// ================= Reset Password =================
router.post(
  "/reset-password/:token",
  resetPassword
);

// ================= Current Logged-in User =================
router.get(
  "/me",
  authMiddleware,
  getMe
);

export default router;
