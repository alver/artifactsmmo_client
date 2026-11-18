// The virtual clock. Date, setTimeout and setInterval follow one counter that
// moves only inside advance(), which jumps from timer to timer — an hour of
// cooldowns costs a few thousand callbacks, and the order never depends on
// real time.
//
// Our own scheduler, not node:test mock timers: tick(ms) cannot see the next
// due timer, so it would have to step in fixed slices (coarse virtual time,
// 72,000 steps per hour), and every promise continuation has to settle between
// two timers anyway — which is a loop we would write either way.
//
// Imported before the engine: store.ts starts its 4 Hz interval at import.

/** Every scenario starts here: a fixed instant, half a day from the 00:05 UTC offerings trigger. */
export const T0 = Date.UTC(2026, 0, 15, 12, 0, 0);

const RealDate = Date;
const realImmediate = setImmediate;

interface Timer {
  id: number;
  at: number;
  every?: number;
  fn: (...args: unknown[]) => void;
  args: unknown[];
}
const timers = new Map<number, Timer>();
let now = Number(process.env.AMMO_CHECK_NOW) || T0; // a second boot (index.mts restart()) goes on from the first one's time
let seq = 0;

function arm(fn: (...args: unknown[]) => void, ms: unknown, args: unknown[], repeat: boolean): number {
  const delay = Math.max(0, Number(ms) || 0);
  timers.set(++seq, { id: seq, at: now + delay, every: repeat ? Math.max(1, delay) : undefined, fn, args });
  return seq;
}
const disarm = (id: unknown): void => void timers.delete(id as number);

class VirtualDate extends RealDate {
  constructor(...args: unknown[]) {
    if (args.length) super(...(args as [number]));
    else super(now);
  }
  static now(): number {
    return now;
  }
}

const g = globalThis as unknown as Record<string, unknown>;
g.Date = VirtualDate;
g.setTimeout = (fn: (...a: unknown[]) => void, ms?: unknown, ...args: unknown[]) => arm(fn, ms, args, false);
g.setInterval = (fn: (...a: unknown[]) => void, ms?: unknown, ...args: unknown[]) => arm(fn, ms, args, true);
g.clearTimeout = disarm;
g.clearInterval = disarm;

/** Jump to the earliest timer (ties: creation order) and run it — unless it lies past `deadline`. */
function fire(deadline: number): boolean {
  let next: Timer | undefined;
  for (const t of timers.values()) if (!next || t.at < next.at || (t.at === next.at && t.id < next.id)) next = t;
  if (!next || next.at > deadline) return false;
  now = next.at;
  if (next.every != null) next.at += next.every;
  else timers.delete(next.id);
  next.fn(...next.args);
  return true;
}

/**
 * Run timers in virtual-time order until `stop()` holds — true — or the next
 * timer lies past `deadline` — false, clock at `deadline`. Between two timers
 * the real event loop turns once, so every promise continuation of the last
 * callback has run before the clock moves again.
 */
export async function advance(stop: () => boolean, deadline: number): Promise<boolean> {
  for (;;) {
    await new Promise<void>((r) => realImmediate(r));
    if (stop()) return true;
    if (fire(deadline)) continue;
    if (Number.isFinite(deadline)) now = Math.max(now, deadline);
    return false;
  }
}

/**
 * For the moment before the process exits: fire what is due within `ms`
 * WITHOUT yielding, so buffered writes land (the dev log flushes every 500 ms)
 * while no engine code waiting on a timer gets to continue.
 */
export function drain(ms: number): void {
  const end = now + ms;
  while (fire(end));
}
