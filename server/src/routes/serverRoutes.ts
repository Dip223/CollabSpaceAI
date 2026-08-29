import { Router } from "express";

import {
  createServer,
  joinServer,
  getMyServers,
  getServer,
  serverMembers,
  renameServer,
  removeMember,
  leaveServer,
} from "../controllers/serverController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// ================= CREATE WORKSPACE =================
router.post(
  "/create",
  authMiddleware,
  createServer
);

// ================= JOIN WORKSPACE =================
router.post(
  "/join",
  authMiddleware,
  joinServer
);

// ================= MY WORKSPACES =================
router.get(
  "/my",
  authMiddleware,
  getMyServers
);

// ================= SINGLE WORKSPACE =================
router.get(
  "/:id",
  authMiddleware,
  getServer
);

// ================= WORKSPACE MEMBERS =================
router.get(
  "/members/:id",
  authMiddleware,
  serverMembers
);

// ================= RENAME WORKSPACE (admin only) =================
router.put(
  "/:id",
  authMiddleware,
  renameServer
);

// ================= REMOVE MEMBER (admin only) =================
router.delete(
  "/:id/members/:userId",
  authMiddleware,
  removeMember
);

// ================= LEAVE / DELETE WORKSPACE =================
router.delete(
  "/:id/leave",
  authMiddleware,
  leaveServer
);

export default router;