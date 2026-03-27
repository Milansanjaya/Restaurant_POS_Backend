import { Server as HttpServer } from "http";
import { Server } from "socket.io";

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: "*"
    }
  });

  io.on("connection", (socket) => {
    console.log("🔌 Connected:", socket.id);

    // ✅ JOIN BRANCH ROOM
    socket.on("join-branch", (branchId: string) => {
      socket.join(`branch:${branchId}`);
      console.log(`📦 ${socket.id} joined branch:${branchId}`);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};