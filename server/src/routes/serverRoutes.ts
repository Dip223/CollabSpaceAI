import { Router } from "express";

import {
  createServer,
  joinServer,
  myServers,
  serverMembers
} from "../controllers/serverController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post(
  "/create",
  authMiddleware,
  createServer
);

router.post(
  "/join",
  authMiddleware,
  joinServer
);

router.get(
  "/my",
  authMiddleware,
  myServers
);

router.get(
  "/members/:id",
  authMiddleware,
  serverMembers
);

export default router;