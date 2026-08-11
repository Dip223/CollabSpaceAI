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

export const initSocket = (server: http.Server, allowedOrigins?: Set<string>) => {
  io = new SocketIOServer(server, {
    cors: {
      // Mirrors the Express REST CORS check in index.ts instead of only
      // allowing a single hardcoded CLIENT_URL. With just one allowed
      // origin, the WebSocket handshake from any teammate whose deployed
      // frontend URL didn't match byte-for-byte (a preview URL, a slightly
      // different domain, CLIENT_URL not set on this particular Render
      // deploy, etc.) got silently rejected — which looked exactly like
      // "cursors don't work across devices" even though it was really a
      // failed/degraded socket connection.
      origin: (origin, callback) => {
        if (!origin || !allowedOrigins || allowedOrigins.has(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    },
    // Mobile data / public wifi round-trips are far slower and jitterier
    // than the default 20s pingTimeout assumes — a couple of slow pongs in
    // a row was enough to make Socket.IO decide the connection was dead and
    // force a reconnect, dropping whatever note-update/note-cursor events
    // were in flight at that moment.
    pingTimeout: 30000,
    pingInterval: 25000,
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

    // ================= SHARED NOTEPAD =================
    // Persistence goes through the REST /api/note endpoint (debounced on the
    // client); this just relays live keystrokes to everyone else in the room.

    socket.on(
      "note-update",
      (data: {
        workspaceId: number;
        content: string;
        updatedBy: string;
        cursorOffset?: number;
      }) => {
        // cursorOffset rides along with the content it was measured
        // against, so the client can apply both atomically instead of
        // waiting on a separate note-cursor event that could arrive out of
        // order relative to this one under real network latency.
        socket.to(roomName(data.workspaceId)).emit("note-update", {
          content: data.content,
          updatedBy: data.updatedBy,
          cursorOffset: data.cursorOffset,
        });
      }
    );

    // ================= LIVE CURSORS =================
    // Purely ephemeral presence data (like Google Docs' colored cursor labels)
    // — never persisted, just relayed to everyone else in the room.

    socket.on(
      "note-cursor",
      (data: { workspaceId: number; name: string; offset: number }) => {
        socket.to(roomName(data.workspaceId)).emit("note-cursor", {
          name: data.name,
          offset: data.offset,
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