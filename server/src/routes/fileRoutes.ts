import { Router } from "express";

import {
  uploadFile,
  getFiles,
  downloadFile,
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

// ================= DOWNLOAD FILE =================
router.get(
  "/:fileId/download",
  authMiddleware,
  downloadFile
);

// ================= DELETE FILE =================
router.delete(
  "/:fileId",
  authMiddleware,
  deleteFile
);

export default router;