// The local game service: ONE Node process runs the whole engine — queue
// runners, the hive, every API call — and serves the browser UI, which is only
// a view: state streams to it over SSE (/events, state/synced.ts) and its edits
// and actions come back as POST /rpc (lib/remote.ts). Closing or crashing the
// tab no longer touches the runners.
//
// Started by scripts/serve.mjs (npm run dev / npm start), which restarts it
// when it exits. Storage is Node's built-in localStorage (the supervisor passes
// --localstorage-file=.ammo/storage.db), so the engine's persistence code runs
// unchanged. Binds 127.0.0.1 only — whoever reaches /rpc plays the account.

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { appendFileSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { effect } from "@preact/signals";
import { expose, handlerFor } from "../lib/remote";
import { devlog, setDevlogSink } from "../lib/devlog";
import { setDataReader } from "../catalog/load";
import { hasToken, setToken } from "../api/client";
import { SYNCED } from "../state/synced";
import { boot } from "../state/sync";
import { queues } from "../state/queue";

const PORT = Number(process.env.PORT) || 5173;
const DEV = process.argv.includes("--dev");
const ROOT = process.cwd();

// Orphan guard: when the supervisor dies (killed, not Ctrl+C), go with it.
process.on("disconnect", () => process.exit(0));
// Browser semantics: a stray rejection is logged, never fatal — a crash loop
// would cost a boot sync (5 reads of the ~300/hr budget) per restart.
process.on("unhandledRejection", (e) => report("unhandled rejection", e));
process.on("uncaughtException", (e) => report("uncaught exception", e));
function report(what: string, e: unknown): void {
  console.error(`[server] ${what}:`, e);
  devlog(`server ${what}: ${(e as Error)?.stack ?? e}`);
}

mkdirSync(path.join(ROOT, "logs"), { recursive: true });
setDevlogSink((lines) => appendFileSync(path.join(ROOT, "logs/dev.log"), lines));
setDataReader(async (name) => JSON.parse(await readFile(path.join(ROOT, "public/data", `${name}.json`), "utf8")));
try {
  process.loadEnvFile(path.join(ROOT, ".env"));
} catch {
  /* no .env — the UI's token gate sets one */
}
if (!hasToken() && process.env.TOKEN) setToken(process.env.TOKEN);

// ── one-time import of the browser-only era's state (state/synced.ts) ───────

const IMPORTED = "ammo:server:imported";
const fresh = !localStorage.getItem(IMPORTED) && Object.keys(queues.value).length === 0;

function importLocal(data: Record<string, string>): void {
  if (!fresh) throw new Error("this service already has its own state — import refused");
  let n = 0;
  for (const [k, v] of Object.entries(data)) {
    if (!k.startsWith("ammo:") || typeof v !== "string") continue;
    localStorage.setItem(k, v);
    n++;
  }
  localStorage.setItem(IMPORTED, new Date().toISOString());
  console.log(`[server] imported ${n} keys from the browser — restarting to resume them`);
  devlog(`server imported ${n} browser keys — restarting`);
  // Exit before any pending debounced save can overwrite what was just written;
  // the supervisor restarts us and boot() resumes the imported queues.
  setImmediate(() => process.exit(0));
}
expose({ importLocal });

// ── state stream: snapshot on connect, then changed signals, coalesced ──────

const clients = new Set<ServerResponse>();
const dirty = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function send(msg: Record<string, unknown>, to: Iterable<ServerResponse> = clients): void {
  const line = `data: ${JSON.stringify(msg)}\n\n`;
  for (const res of to) res.write(line);
}
function flush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  if (dirty.size === 0) return;
  const msg: Record<string, unknown> = {};
  for (const k of dirty) msg[k] = SYNCED[k].peek();
  dirty.clear();
  send(msg);
}
for (const [k, sig] of Object.entries(SYNCED)) {
  effect(() => {
    void sig.value;
    dirty.add(k);
    flushTimer ??= setTimeout(flush, 50);
  });
}

function events(req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  const snap: Record<string, unknown> = { _fresh: fresh };
  for (const [k, sig] of Object.entries(SYNCED)) snap[k] = sig.peek();
  send(snap, [res]);
  clients.add(res);
  req.on("close", () => clients.delete(res));
}
// Heartbeat: an idle fleet sends nothing, so the tab's stale-stream watchdog (connect()) needs this.
setInterval(() => send({}), 15_000);

// ── POST /rpc {fn, args} → {value} | {error, code} ──────────────────────────

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((ok, fail) => {
    let s = "";
    req.on("data", (c: Buffer) => (s += c.toString()));
    req.on("end", () => ok(s));
    req.on("error", fail);
  });

async function rpcCall(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let fn = "?";
  let out: Record<string, unknown>;
  try {
    const call = JSON.parse(await readBody(req)) as { fn: string; args?: unknown[] };
    fn = String(call.fn);
    const f = handlerFor(fn);
    if (!f) throw new Error(`unknown rpc: ${fn}`);
    out = { value: (await f(...(Array.isArray(call.args) ? call.args : []))) ?? null };
  } catch (e) {
    out = { error: (e as Error)?.message ?? String(e), code: (e as { code?: number })?.code ?? 0 };
    devlog(`rpc ${fn} failed: ${out.error}`);
  }
  flush(); // stream the state change before the reply, so the caller's next read sees it
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(out));
}

// ── access: this machine only (blocks other sites in the browser and DNS rebinding) ──

const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);
const hostOf = (v: string): string | null => {
  try {
    return new URL(v.includes("://") ? v : `http://${v}`).hostname;
  } catch {
    return null;
  }
};
function allowed(req: IncomingMessage): boolean {
  if (!LOCAL.has(hostOf(req.headers.host ?? "") ?? "")) return false;
  const origin = req.headers.origin;
  return !origin || LOCAL.has(hostOf(origin) ?? "");
}

// ── static UI (npm start serves the built dist/) ────────────────────────────

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};
const DIST = path.join(ROOT, "dist");

async function serveStatic(pathname: string, res: ServerResponse): Promise<void> {
  let file: string;
  try {
    file = path.join(DIST, decodeURIComponent(pathname));
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (file !== DIST && !file.startsWith(DIST + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  // A missing asset is a 404 (the UI's img fallback takes over); any other path is the page.
  for (const f of path.extname(file) ? [file] : [path.join(DIST, "index.html")]) {
    try {
      const buf = await readFile(f);
      res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] ?? "application/octet-stream" });
      res.end(buf);
      return;
    } catch {
      /* fall through */
    }
  }
  if (path.extname(file)) res.writeHead(404).end();
  else res.writeHead(500, { "Content-Type": "text/plain" }).end("dist/ is missing — run `npm start` (it builds first)");
}

// ── server ──────────────────────────────────────────────────────────────────

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  if (pathname === "/events" || pathname === "/rpc") {
    if (!allowed(req)) return void res.writeHead(403).end();
    if (pathname === "/events") return events(req, res);
    // application/json forces a CORS preflight, which this server never answers
    if (req.method !== "POST" || !req.headers["content-type"]?.startsWith("application/json")) return void res.writeHead(415).end();
    return void rpcCall(req, res);
  }
  if (vite) return vite.middlewares(req, res);
  void serveStatic(pathname, res);
});

const vite = DEV
  ? await (await import("vite")).createServer({ server: { middlewareMode: true, hmr: { server } }, appType: "spa" })
  : null;

// Bind BEFORE boot: a second copy fails here, before it could run a second set of runners.
server.on("error", (e: NodeJS.ErrnoException) => {
  console.error(e.code === "EADDRINUSE" ? `[server] port ${PORT} is busy — is the service already running?` : e);
  process.exit(3); // serve.mjs: don't restart
});
server.listen(PORT, "127.0.0.1", () => {
  console.log(`[server] ${DEV ? "dev" : "prod"} — http://localhost:${PORT}/`);
  devlog(`server start (${DEV ? "dev" : "prod"}) on :${PORT}`);
  void boot();
});
