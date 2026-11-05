// Forensic trace: every API action, queue note change, head transition and
// activity-log entry, appended to logs/dev.log (gitignored) by the local
// service (src/server/main.ts installs the sink). Purpose: post-mortem
// debugging of runner behavior — the in-app activity log is capped. A no-op
// in the browser tab (no sink there).

/** Random per-process tag so each service start (restart, crash recovery) stays tellable apart. */
const TAG = Math.random().toString(36).slice(2, 6);

const buf: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let sink: ((lines: string) => void) | null = null;

export function setDevlogSink(fn: (lines: string) => void): void {
  sink = fn;
}

export function devlog(line: string): void {
  if (!sink) return;
  buf.push(`${new Date().toISOString()} [${TAG}] ${line}`);
  if (timer == null) timer = setTimeout(flush, 500);
}

function flush(): void {
  timer = null;
  if (buf.length === 0 || !sink) return;
  try {
    sink(buf.splice(0).join("\n") + "\n");
  } catch {
    /* disk trouble — logging must never break the runner */
  }
}
