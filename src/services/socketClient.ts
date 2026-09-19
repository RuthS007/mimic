import { io, Socket } from "socket.io-client";
import { getServerUrl } from "./serverConfig";

let socketInstance: Socket | null = null;

/**
 * Initializes and retrieves the Socket.io client instance.
 * Automatically resolves the backend server URL via VITE_SERVER_URL on Vercel,
 * falling back to window.location.origin.
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    const serverUrl = getServerUrl();
    
    // If serverUrl is empty or same origin, io() connects to current host
    socketInstance = io(serverUrl || undefined, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      withCredentials: true,
    });

    socketInstance.on("connect", () => {
      console.log(`[Socket.io] Connected successfully to backend: ${serverUrl || window.location.origin}`);
    });

    socketInstance.on("connect_error", (err) => {
      console.warn(`[Socket.io] Connection error:`, err.message);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log(`[Socket.io] Disconnected: ${reason}`);
    });
  }

  return socketInstance;
}

/**
 * Reset socket connection if server configuration changes
 */
export function resetSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
