/**
 * Server Configuration & URL Resolver
 * Supports independent deployment to Vercel (Frontend) and Render (Backend).
 */

declare global {
  interface Window {
    SERVER_URL?: string;
  }
}

/**
 * Returns the HTTP(S) base URL of the backend server.
 * - Prioritizes `import.meta.env.VITE_SERVER_URL` (set on Vercel)
 * - Falls back to `window.SERVER_URL` (runtime injection fallback)
 * - Defaults gracefully to current `window.location.origin` (same-origin / local dev)
 */
export function getServerUrl(): string {
  // 1. Vite environment variable (set on Vercel)
  const envUrl = import.meta.env.VITE_SERVER_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim() && envUrl !== "undefined") {
    return envUrl.trim().replace(/\/+$/, "");
  }

  // 2. Global runtime override fallback
  if (
    typeof window !== "undefined" &&
    window.SERVER_URL &&
    typeof window.SERVER_URL === "string" &&
    window.SERVER_URL.trim()
  ) {
    return window.SERVER_URL.trim().replace(/\/+$/, "");
  }

  // 3. Graceful fallback to current origin
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  return "";
}

/**
 * Converts a relative API path to a fully qualified URL if an external server is configured,
 * or keeps it relative if running in same-origin mode.
 */
export function getApiUrl(path: string): string {
  const base = getServerUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) return cleanPath;
  return `${base}${cleanPath}`;
}

/**
 * Returns the WebSocket URL corresponding to the backend server.
 */
export function getWsUrl(subPath = "/ws"): string {
  const base = getServerUrl();
  const cleanSubPath = subPath.startsWith("/") ? subPath : `/${subPath}`;

  if (base.startsWith("https://")) {
    return base.replace(/^https:\/\//i, "wss://") + cleanSubPath;
  }
  if (base.startsWith("http://")) {
    return base.replace(/^http:\/\//i, "ws://") + cleanSubPath;
  }

  // Default to window location
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}${cleanSubPath}`;
  }

  return `ws://localhost:3000${cleanSubPath}`;
}
