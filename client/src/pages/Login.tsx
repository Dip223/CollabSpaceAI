import { Server as SocketIOServer, Socket } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";

interface AuthedSocket extends Socket {
  userId?: number;
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

  // De-dupe by userId (same user could have multiple tabs/sockets open)
  const uniqueUsers = new Map<number, PresenceEntry>();
  roomPresence.forEach((entry) => uniqueUsers.set(entry.userId, entry));

  io.to(roomName(workspaceId)).emit(
    "presence-update",
    Array.from(uniqueUsers.values())
  );
};

const leaveWorkspace = (socket: AuthedSocket, workspaceId: number) => {
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

export const initSocket = (server: http.Server) => {
  const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // ================= AUTH =================
  // Every socket connection must carry the same JWT used for REST calls.
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
    // ================= JOIN / LEAVE =================

    socket.on(
      "join-workspace",
      (payload: { workspaceId: number; name: string }) => {
        const { workspaceId, name } = payload;

        socket.join(roomName(workspaceId));

        if (!presence.has(workspaceId)) {
          presence.set(workspaceId, new Map());
        }

        presence.get(workspaceId)!.set(socket.id, {
          userId: socket.userId!,
          name,
        });

        broadcastPresence(workspaceId);
      }
    );

    socket.on("leave-workspace", (workspaceId: number) => {
      leaveWorkspace(socket, workspaceId);
    });

    // ================= CHAT =================

    socket.on("send-message", (data: { serverId: number }) => {
      io.to(roomName(data.serverId)).emit("receive-message", data);
    });

    socket.on(
      "typing",
      (data: { workspaceId: number; user: string }) => {
        // socket.to (not io.to) so the typer doesn't see their own indicator
        socket.to(roomName(data.workspaceId)).emit("typing", {
          user: data.user,
        });
      }
    );

    // ================= DISCONNECT =================

    socket.on("disconnect", () => {
      presence.forEach((_, workspaceId) => {
        leaveWorkspace(socket, workspaceId);
      });
    });
  });
};

// Lets controllers (e.g. fileController) emit events to a workspace room
export const getIO = () => io;
