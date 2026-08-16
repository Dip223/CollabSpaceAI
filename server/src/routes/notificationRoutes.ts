import { Router } from "express";

import {
  getNotifications,
  getUnreadCount,
  markAllRead,
} from "../controllers/notificationController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// ================= GET NOTIFICATIONS =================

router.get(
  "/",
  authMiddleware,
  getNotifications
);

// ================= UNREAD COUNT =================

router.get(
  "/unread-count",
  authMiddleware,
  getUnreadCount
);

// ================= MARK ALL AS READ =================

router.put(
  "/read",
  authMiddleware,
  markAllRead
);

export default router;