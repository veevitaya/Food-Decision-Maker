import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

interface NotificationEvent {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface UseSocketIOProps {
  session: { loggedIn: boolean; sessionType?: string; ownerId?: number } | null;
  onNotification: (notification: NotificationEvent) => void;
  onUnreadCount: (count: number) => void;
  onDataChanged?: (queryKeys: string[]) => void;
}

export function useSocketIO({ session, onNotification, onUnreadCount, onDataChanged }: UseSocketIOProps) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const onNotificationRef = useRef(onNotification);
  const onUnreadCountRef = useRef(onUnreadCount);
  const onDataChangedRef = useRef(onDataChanged);
  onNotificationRef.current = onNotification;
  onUnreadCountRef.current = onUnreadCount;
  onDataChangedRef.current = onDataChanged;

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!session?.loggedIn) {
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || "https://api-toast.fastforwardssl.com";
    
    const socket = io(API_URL, {
      path: "/socket.io",
      auth: {
        session: JSON.stringify(session),
      },
      transports: ["polling"],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket.IO] Connected:", socket.id);
      setConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket.IO] Disconnected:", reason);
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket.IO] Connection error:", err.message);
      setConnected(false);
    });

    // Listen for new notifications
    socket.on("notification:new", (notification: NotificationEvent) => {
      onNotificationRef.current(notification);
    });

    // Listen for unread count updates
    socket.on("notification:unread-count", (count: number) => {
      onUnreadCountRef.current(count);
    });

    // Listen for data change broadcasts — invalidate relevant queries
    socket.on("data:changed", (queryKeys: string[]) => {
      onDataChangedRef.current?.(queryKeys);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.loggedIn, session?.sessionType, session?.ownerId]);

  // Function to mark notification as read via Socket.IO
  const markNotificationRead = useCallback((notificationId: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error("Socket not connected"));
        return;
      }

      socketRef.current.emit("notification:mark-read", notificationId, (response: { success: boolean; error?: string }) => {
        if (response?.success) {
          resolve();
        } else {
          reject(new Error(response?.error || "Failed to mark as read"));
        }
      });
    });
  }, []);

  // Function to mark all notifications as read via Socket.IO
  const markAllNotificationsRead = useCallback((): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error("Socket not connected"));
        return;
      }

      socketRef.current.emit("notification:mark-all-read", (response: { success: boolean; markedRead?: number; error?: string }) => {
        if (response?.success) {
          resolve(response.markedRead || 0);
        } else {
          reject(new Error(response?.error || "Failed to mark all as read"));
        }
      });
    });
  }, []);

  return {
    connected,
    markNotificationRead,
    markAllNotificationsRead,
  };
}
