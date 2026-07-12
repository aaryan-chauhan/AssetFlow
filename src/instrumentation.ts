// Node 18 has no global WebSocket, which supabase-js initializes eagerly.
// Polyfill it once at server startup.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !(globalThis as { WebSocket?: unknown }).WebSocket) {
    const ws = await import("ws");
    (globalThis as { WebSocket?: unknown }).WebSocket = ws.default;
  }
}
