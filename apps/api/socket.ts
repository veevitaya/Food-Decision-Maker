import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { storage } from "./storage";

let io: SocketServer | null = null;

// Track connected owner sockets for targeted notifications
const ownerSockets = new Map<number, string>(); // ownerId -> socketId

export function initSocketIO(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: [
        "http://localhost:5001",
        "http://localhost:3000",
        "https://toast.fastforwardssl.com",
        "https://admin-toast.fastforwardssl.com",
        ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim()) : []),
      ],
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use(async (socket: Socket, next) => {
    try {
      // Get session from socket handshake auth
      const session = socket.handshake.auth.session || socket.handshake.query.session;
      if (!session) {
        return next(new Error("Authentication required"));
      }

      const parsedSession = typeof session === "string" ? JSON.parse(session) : session;
      
      if (!parsedSession.loggedIn) {
        return next(new Error("Not logged in"));
      }

      // Attach session to socket
      (socket as any).session = parsedSession;
      
      // Track owner connections for targeted notifications
      if (parsedSession.sessionType === "owner" && parsedSession.ownerId) {
        ownerSockets.set(parsedSession.ownerId, socket.id);
        socket.join(`owner:${parsedSession.ownerId}`);
      }

      next();
    } catch (err) {
      next(new Error("Invalid session"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const session = (socket as any).session;
    console.log(`[Socket.IO] Client connected: ${socket.id} (${session?.sessionType || "unknown"})`);

    // Handle disconnect
    socket.on("disconnect", () => {
      if (session?.sessionType === "owner" && session?.ownerId) {
        ownerSockets.delete(session.ownerId);
      }
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });

    // Handle mark notification read
    socket.on("notification:mark-read", async (notificationId: number, callback) => {
      try {
        if (session?.sessionType !== "owner" || !session?.ownerId) {
          callback?.({ success: false, error: "Not authorized" });
          return;
        }

        const notification = await storage.getNotificationById(notificationId);
        if (!notification || notification.ownerId !== session.ownerId) {
          callback?.({ success: false, error: "Notification not found" });
          return;
        }

        await storage.markNotificationRead(notificationId);
        callback?.({ success: true });
      } catch (err) {
        callback?.({ success: false, error: "Server error" });
      }
    });

    // Handle mark all notifications read
    socket.on("notification:mark-all-read", async (callback) => {
      try {
        if (session?.sessionType !== "owner" || !session?.ownerId) {
          callback?.({ success: false, error: "Not authorized" });
          return;
        }

        const count = await storage.markAllNotificationsRead(session.ownerId);
        callback?.({ success: true, markedRead: count });
      } catch (err) {
        callback?.({ success: false, error: "Server error" });
      }
    });

    // Send unread count on connection
    if (session?.sessionType === "owner" && session?.ownerId) {
      storage.getUnreadNotificationCount(session.ownerId).then((count) => {
        socket.emit("notification:unread-count", count);
      });
    }
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
}

// Emit notification to specific owner
export function emitNotificationToOwner(ownerId: number, notification: any): void {
  if (!io) return;
  io.to(`owner:${ownerId}`).emit("notification:new", notification);
  // Also update unread count
  storage.getUnreadNotificationCount(ownerId).then((count) => {
    io?.to(`owner:${ownerId}`).emit("notification:unread-count", count);
  });
}

// Emit unread count update to owner
export function emitUnreadCountToOwner(ownerId: number): void {
  if (!io) return;
  storage.getUnreadNotificationCount(ownerId).then((count) => {
    io?.to(`owner:${ownerId}`).emit("notification:unread-count", count);
  });
}

// Broadcast to all connected clients (for admin notifications, etc.)
export function broadcastToAll(event: string, data: any): void {
  if (!io) return;
  io.emit(event, data);
}

// Broadcast data invalidation — tells all connected clients to refetch these query keys
export function broadcastDataChange(queryKeys: string[]): void {
  if (!io) return;
  io.emit("data:changed", queryKeys);
}
