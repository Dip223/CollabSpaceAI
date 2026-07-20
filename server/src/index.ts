import dns from "dns";
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
import { verifyMailTransport } from "./services/mailService";

// Render's network resolves SMTP hosts to IPv6 but can't route it, which is
// what caused the SMTP connection timeouts in the logs. Prefer IPv4 host-wide.
dns.setDefaultResultOrder("ipv4first");

dotenv.config({ override: true });

const app = express();

const allowedOrigins = new Set(
  [
    "http://localhost:5173",
    "https://collab-space-ai.vercel.app",
    process.env.CLIENT_URL,
    ...(process.env.CLIENT_URLS || "").split(","),
  ]
    .map((origin) => origin?.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/server", serverRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/file", fileRoutes);

app.get("/", (_req, res) => {
  res.send("CollabSpace API Running 🚀");
});

const server = http.createServer(app);

initSocket(server);

const PORT = Number(process.env.PORT) || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  verifyMailTransport();
});