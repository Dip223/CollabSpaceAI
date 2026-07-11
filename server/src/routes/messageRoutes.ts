import { Router } from "express";

import {
  sendMessage,
  getMessages,
} from "../controllers/messageController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// ================= SEND MESSAGE =================

router.post(
  "/:serverId",
  authMiddleware,
  sendMessage
);

// ================= GET ALL MESSAGES =================

router.get(
  "/:serverId",
  authMiddleware,
  getMessages
);

export default router;