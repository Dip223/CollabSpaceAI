import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import serverRoutes from "./routes/serverRoutes";
import messageRoutes from "./routes/messageRoutes";
import fileRoutes from "./routes/fileRoutes";

import { initSocket } from "./socket/socket";

dotenv.config();

const app = express();

// ================= Middleware =================

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// ================= Routes =================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/user",
  userRoutes
);

app.use(
  "/api/server",
  serverRoutes
);

app.use(
  "/api/message",
  messageRoutes
);

app.use(
  "/api/file",
  fileRoutes
);

// ================= Root =================

app.get("/", (req, res) => {
  res.send("CollabSpace API Running 🚀");
});

// ================= HTTP Server =================

const server = http.createServer(app);

// ================= Socket.IO =================

initSocket(server);

// ================= Listen =================

const PORT = Number(process.env.PORT) || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});