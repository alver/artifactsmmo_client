// Dev-only file logging: batches lines and POSTs them to the dev server's
// /__devlog middleware (vite.config.ts), which appends to logs/dev.log in the
// repo. Production builds compile to a no-op (import.meta.env.DEV is false and
// the middleware doesn't exist). Purpose: post-mortem debugging of runner
// behavior — the in-app activity log is capped and dies with the tab.

/** Random per-tab tag so interleaved sessions (user tab + headless driver) stay tellable apart. */
const TAB = Math.random().toString(36).slice(2, 6);

const buf: string[] = [];
let timer: number | null = null;

export function devlog(line: string): void {
  if (!import.meta.env.DEV) return;
  buf.push(`${new Date().toISOString()} [${TAB}] ${line}`);
  if (buf.length > 400) buf.splice(0, buf.length - 400); // sink gone? don't grow forever
  if (timer == null) timer = window.setTimeout(flush, 500);
}

function flush(): void {
  timer = null;
  if (buf.length === 0) return;
  const body = buf.splice(0).join("\n") + "\n";
  // keepalive lets the final batch survive a page reload
  void fetch("/__devlog", { method: "POST", body, keepalive: true }).catch(() => {});
}
