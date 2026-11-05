// The browser ↔ local-service split. The engine (state/, api/, plan/, sim/) runs
// ONLY in the Node service (src/server/main.ts); the browser tab is a view that
// gets state streamed over SSE (state/synced.ts) and sends its edits back here.
//
// Every engine function the UI calls starts with
//   if (!IS_SERVER) return rpc("name", [args]);
// and its module ends with expose({ name, … }) — so in the tab the call becomes
// a POST /rpc, on the server it runs for real. Must not import engine modules
// (client.ts imports this one).

export const IS_SERVER = typeof window === "undefined";

type Handler = (...args: never[]) => unknown;
const handlers = new Map<string, Handler>();

/** Server: make these functions callable from the browser by name. */
export function expose(fns: Record<string, Handler>): void {
  if (IS_SERVER) for (const [name, fn] of Object.entries(fns)) handlers.set(name, fn);
}

export const handlerFor = (name: string): ((...args: unknown[]) => unknown) | undefined =>
  handlers.get(name) as ((...args: unknown[]) => unknown) | undefined;

/**
 * Browser: run an exposed function on the server. Typed `never` so the guard
 * line type-checks inside any function without widening its return type — at
 * runtime it is a Promise of the server's return value (UI callers ignore it).
 */
export function rpc(fn: string, args: unknown[]): never {
  return (async () => {
    const r = await fetch("/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fn, args }),
    });
    const out = (await r.json().catch(() => ({ error: `local server unreachable (HTTP ${r.status})` }))) as {
      value?: unknown;
      error?: string;
      code?: number;
    };
    if (out.error !== undefined) throw Object.assign(new Error(out.error), { code: out.code ?? 0 });
    return out.value;
  })() as never;
}
