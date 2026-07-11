import { Router } from "express";

import {
  uploadFile,
  getFiles,
  deleteFile,
} from "../controllers/fileController";

import { authMiddleware } from "../middleware/authMiddleware";
import { upload } from "../middleware/upload";

const router = Router();

// ================= UPLOAD FILE =================
router.post(
  "/:serverId",
  authMiddleware,
  upload.single("file"),
  uploadFile
);

// ================= LIST FILES =================
router.get(
  "/:serverId",
  authMiddleware,
  getFiles
);

// ================= DELETE FILE =================
router.delete(
  "/:fileId",
  authMiddleware,
  deleteFile
);

export default router;