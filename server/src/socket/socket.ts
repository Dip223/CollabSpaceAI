import { Server as SocketIOServer, Socket } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";

interface AuthedSocket extends Socket {
  userId?: number;
  workspaceId?: number;
  userName?: string;
}

interface PresenceEntry {
  userId: number;
  name: string;
}

let io: SocketIOServer;

// workspaceId -> Map<socketId, PresenceEntry>
const presence = new Map<number, Map<string, PresenceEntry>>();

const roomName = (workspaceId: number) => `workspace-${workspaceId}`;

const broadcastPresence = (workspaceId: number) => {
  const roomPresence = presence.get(workspaceId);
  if (!roomPresence) return;

  // Same user can have multiple tabs, but show them once in member list.
  const uniqueUsers = new Map<number, PresenceEntry>();
  roomPresence.forEach((entry) => uniqueUsers.set(entry.userId, entry));

  io.to(roomName(workspaceId)).emit(
    "presence-update",
    Array.from(uniqueUsers.values())
  );
};

const leaveWorkspace = (
  socket: AuthedSocket,
  workspaceId: number
) => {
  // Remove the leaving user's cursor immediately on teammates' screens.
  socket.to(roomName(workspaceId)).emit("note-cursor-left", {
    socketId: socket.id,
    name: socket.userName,
  });

  socket.leave(roomName(workspaceId));

  const roomPresence = presence.get(workspaceId);
  if (!roomPresence) return;

  roomPresence.delete(socket.id);

  if (roomPresence.size === 0) {
    presence.delete(workspaceId);
  } else {
    broadcastPresence(workspaceId);
  }
};

export const initSocket = (
  server: http.Server,
  allowedOrigins?: Set<string>
) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        // Allows local development, Render, Vercel production,
        // and any URLs explicitly included in CLIENT_URLS.
        if (!origin || !allowedOrigins || allowedOrigins.has(origin)) {
          return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    },

    // Allows rich note HTML including a reasonably sized inserted image.
    maxHttpBufferSize: 5 * 1024 * 1024,

    // More stable on slow Wi-Fi/mobile networks.
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // ================= JWT AUTH =================

  io.use((socket: AuthedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;

      if (!token) {
        return next(new Error("No token provided"));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as { id: number };

      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    // ================= JOIN / LEAVE WORKSPACE =================

    socket.on(
      "join-workspace",
      (payload: { workspaceId: number; name: string }) => {
        const workspaceId = Number(payload.workspaceId);

        if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
          return;
        }

        // If this browser tab changes workspace, leave the old room first.
        if (
          socket.workspaceId &&
          socket.workspaceId !== workspaceId
        ) {
          leaveWorkspace(socket, socket.workspaceId);
        }

        socket.workspaceId = workspaceId;
        socket.userName = String(payload.name || "Member")
          .trim()
          .slice(0, 80) || "Member";

        socket.join(roomName(workspaceId));

        if (!presence.has(workspaceId)) {
          presence.set(workspaceId, new Map());
        }

        presence.get(workspaceId)!.set(socket.id, {
          userId: socket.userId!,
          name: socket.userName,
        });

        broadcastPresence(workspaceId);
      }
    );

    socket.on("leave-workspace", (workspaceId: number) => {
      if (workspaceId === socket.workspaceId) {
        leaveWorkspace(socket, workspaceId);
        socket.workspaceId = undefined;
      }
    });

    // ================= CHAT =================

    socket.on("send-message", (data: { serverId: number }) => {
      if (data.serverId !== socket.workspaceId) return;

      // Keep io.to, because your frontend already deduplicates the sender's
      // saved message and this preserves existing chat behavior.
      io.to(roomName(data.serverId)).emit("receive-message", data);
    });

    socket.on(
      "typing",
      (data: { workspaceId: number; user: string }) => {
        if (data.workspaceId !== socket.workspaceId) return;

        socket.to(roomName(data.workspaceId)).emit("typing", {
          user: socket.userName || "Member",
        });
      }
    );

    // ================= RICH SHARED DOCUMENT =================
    // Database save is handled by your existing /api/note endpoint.
    // These events only send immediate live updates to teammates.

    socket.on(
      "note-update",
      (data: {
        workspaceId: number;
        content: string;
        cursorOffset?: number;
      }) => {
        if (
          data.workspaceId !== socket.workspaceId ||
          typeof data.content !== "string" ||
          data.content.length > 4_000_000
        ) {
          return;
        }

        socket.to(roomName(data.workspaceId)).emit("note-update", {
          content: data.content,

          // Never trust a name sent from the browser.
          updatedBy: socket.userName || "Member",
          socketId: socket.id,

          // Cursor position belongs to this exact content update.
          cursorOffset:
            typeof data.cursorOffset === "number" &&
            Number.isInteger(data.cursorOffset) &&
            data.cursorOffset >= 0
              ? data.cursorOffset
              : undefined,
        });
      }
    );

    // ================= LIVE USER CURSORS =================

    socket.on(
      "note-cursor",
      (data: { workspaceId: number; offset: number }) => {
        if (
          data.workspaceId !== socket.workspaceId ||
          !Number.isInteger(data.offset) ||
          data.offset < 0 ||
          data.offset > 4_000_000
        ) {
          return;
        }

        socket.to(roomName(data.workspaceId)).emit("note-cursor", {
          socketId: socket.id,
          name: socket.userName || "Member",
          offset: data.offset,
        });
      }
    );

    // ================= DISCONNECT =================

    socket.on("disconnect", () => {
      if (socket.workspaceId) {
        leaveWorkspace(socket, socket.workspaceId);
        socket.workspaceId = undefined;
      }
    });
  });
};

// Lets controllers such as fileController emit to a workspace.
export const getIO = () => io;

// Lets controllers (note/message/file) decide who should get an
// offline notification for something that just happened in a workspace —
// anyone with an active socket in that workspace's room is "present" and
// already seeing it live, so they're excluded.
export const getPresentUserIds = (workspaceId: number): Set<number> => {
  const roomPresence = presence.get(workspaceId);
  if (!roomPresence) return new Set();
  return new Set(
    Array.from(roomPresence.values()).map((entry) => entry.userId)
  );
};