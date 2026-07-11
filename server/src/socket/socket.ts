import { Server, Socket } from "socket.io";

let io: Server;

export const initSocket = (httpServer: any) => {
  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`🟢 User Connected: ${socket.id}`);

    // ================= JOIN WORKSPACE =================

    socket.on(
      "join-workspace",
      (workspaceId: number) => {
        socket.join(`workspace-${workspaceId}`);

        console.log(
          `✅ ${socket.id} joined workspace ${workspaceId}`
        );

        io.to(`workspace-${workspaceId}`).emit(
          "user-joined",
          {
            socketId: socket.id,
          }
        );
      }
    );

    // ================= LEAVE WORKSPACE =================

    socket.on(
      "leave-workspace",
      (workspaceId: number) => {
        socket.leave(`workspace-${workspaceId}`);

        console.log(
          `❌ ${socket.id} left workspace ${workspaceId}`
        );
      }
    );

    // ================= CHAT MESSAGE =================

    socket.on(
      "send-message",
      (data: {
        workspaceId: number;
        user: string;
        message: string;
      }) => {
        io.to(`workspace-${data.workspaceId}`).emit(
          "receive-message",
          {
            user: data.user,
            message: data.message,
            createdAt: new Date(),
          }
        );
      }
    );

    // ================= USER TYPING =================

    socket.on(
      "typing",
      (data: {
        workspaceId: number;
        user: string;
      }) => {
        socket
          .to(`workspace-${data.workspaceId}`)
          .emit("typing", data);
      }
    );

    // ================= DISCONNECT =================

    socket.on("disconnect", () => {
      console.log(
        `🔴 User Disconnected: ${socket.id}`
      );
    });
  });

  return io;
};

export const getIO = () => io;