import { Router } from "express";

import {
  getNote,
  saveNote,
} from "../controllers/noteController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// ================= GET NOTE =================

router.get(
  "/:serverId",
  authMiddleware,
  getNote
);

// ================= SAVE NOTE =================

router.put(
  "/:serverId",
  authMiddleware,
  saveNote
);

export default router;