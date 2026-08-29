import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const anon = import.meta.env.VITE_SUPABASE_ANON ?? "";

if (!url || !anon) {
  console.warn("[supabase-browser] VITE_SUPABASE_URL or VITE_SUPABASE_ANON missing");
}

// Node < 22 (used for local SSR here) has no native WebSocket, which crashes
// the realtime client's constructor. The browser always has native
// WebSocket, so only the server needs the "ws" polyfill wired in.
const realtimeTransport =
  typeof window === "undefined" ? (await import("ws")).default : undefined;

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "gestio_auth",
  },
  realtime: realtimeTransport ? { transport: realtimeTransport as never } : undefined,
});
