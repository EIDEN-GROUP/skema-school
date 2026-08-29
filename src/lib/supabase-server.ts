import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.warn("[supabase-server] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing   admin client will fail at runtime.");
}

// Node < 22 (local SSR) has no native WebSocket, which crashes the realtime
// client's constructor. Wire in the "ws" polyfill as the transport.
const realtimeTransport =
  typeof globalThis.WebSocket === "undefined"
    ? (await import("ws")).default
    : undefined;

export const supabaseAdmin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: realtimeTransport ? { transport: realtimeTransport as never } : undefined,
});
