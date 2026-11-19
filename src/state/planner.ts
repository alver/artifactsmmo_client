// The planner's runtime (task 008; docs/design/planner.md B.2, C, F.5, I.2). For every character that is on
// (config `on`, DEFAULTS + Alex's patch): decide(name, world) → itemsOf → the queue, watch the queue, decide again
// when the step ends, pauses, stalls or ends empty. It is the only automatic writer of an owned queue; anything
// that goes ahead of a step goes through interrupt(). Server-only like the hive: its own key ammo:v1:planner,
// hydrated before its persisting effect; resumePlanner() from boot()/login() after resumeQueue(). With nobody on
// it does nothing: no read, no timer, no write, no log line.
//
// The seam with runLoop (a start issued from inside an effect on `queues` is lost: startQueue returns while the
// ending loop is still in liveLoops). The effect here only schedules a microtask. (1) runLoop removes a step's last
// item while its loop is alive and `running` and then sleeps 50 ms: the tick runs before that timer, so the next
// step's items are in the queue when the loop looks again — no start needed. (2) When the decision first awaits an
// achievements read, the loop may run dry and exit; its exit (running:false → return → finally, liveLoops.delete)
// is one synchronous run, so a continuation after the await finds either the loop alive and running or gone, and
// runQueue launches a new one. (3) The 5-minute tick starts any owned queue that holds items and stands stopped.

import { batch, effect, signal } from "@preact/signals";
import { IS_SERVER, expose, rpc } from "../lib/remote";
import { devlog } from "../lib/devlog";
import { achievements, achievementsError, bankDetails, bankItems, characterList, characters, isOwned, log as activity, offerings, pendingRewards, plannerOn } from "./store";
import { OUTAGE_NOTE, dropItem, haltQueue, insertItem, queues, resetQueue, runQueue, setOwnedOfferings } from "./queue";
import { hive, setHiveManual } from "./hive";
import { liveEvents } from "./events";
import { invCount } from "./exec";
import { DEFAULTS } from "../plan/planner/config";
import { costKey, levelHoursEstimate, levelOf, perOf, sample, unitSec } from "../plan/planner/cost";
import { decide, rank } from "../plan/planner/decide";
import { itemsOf } from "../plan/planner/compile";
import { isDone, targetsOf } from "../plan/planner/targets";
import { queueItemText } from "../plan/queue";
import type { QueueItem, QueueItemInput } from "../plan/queue";
import type { AccountAchievement, Character } from "../types/api";
import type { Lane, PlannerConfig, PlannerState, Running, Step, World } from "../plan/planner/types";

// ── state ────────────────────────────────────────────────────────────────────

const KEY = "ammo:v1:planner";
const EMPTY: PlannerState = { current: {}, costs: {}, blocked: {}, strikes: {}, config: {}, optedOut: [], achievementsAt: 0 };

function load(): PlannerState {
  try {
    return { ...EMPTY, ...(JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<PlannerState>) };
  } catch {
    return EMPTY;
  }
}

// The tab never hydrates or persists: its copy is a mirror fed by state/synced.ts.
export const planner = signal<PlannerState>(IS_SERVER ? load() : EMPTY);
let saved = IS_SERVER ? localStorage.getItem(KEY) : null;
if (IS_SERVER) effect(() => {
  const s = JSON.stringify(planner.value);
  if (s === saved || (saved === null && s === JSON.stringify(EMPTY))) return; // nothing changed: nothing written
  try {
    localStorage.setItem(KEY, s);
    saved = s;
  } catch {
    /* quota / unavailable — non-fatal */
  }
});

let merged: { patch: Partial<PlannerConfig>; cfg: PlannerConfig } | undefined;
/** DEFAULTS with Alex's patch over them — one object per patch (targets.ts memoises on it). */
export function configOf(patch: Partial<PlannerConfig>): PlannerConfig {
  if (merged?.patch !== patch) merged = { patch, cfg: { ...DEFAULTS, ...patch, on: { ...DEFAULTS.on, ...patch.on } } };
  return merged.cfg;
}
effect(() => void (plannerOn.value = configOf(planner.value.config).on));

const put = (patch: Partial<PlannerState>): void => void (planner.value = { ...planner.value, ...patch });
const setRunning = (name: string, r: Running | undefined): void => put({ current: { ...planner.value.current, [name]: r } });

const plog = (name: string, text: string): void => devlog(`plan ${name}: ${text}`);
const fmtH = (h: number): string => (h < 10 ? h.toFixed(1) : String(Math.round(h)));
const owned = (): string[] => Object.keys(characters.value).filter(isOwned);
const isStepId = (id: string): boolean => id.startsWith("pl:") && !id.startsWith("pl:int:");
const stepItems = (name: string, key: string): QueueItem[] => (queues.value[name]?.items ?? []).filter((it) => it.id.startsWith(`pl:${key}:`));
const laneOf = (s: Step): Lane | undefined => (s.as === "level" ? (s.target.split(":")[1] as Lane) : undefined);

const NONE: AccountAchievement[] = [];
/** The snapshot decide() reads. `now` is the only clock the core sees. */
export function worldOf(now: number): World {
  const st = planner.value;
  const config = configOf(st.config);
  const current: World["current"] = {};
  for (const [n, r] of Object.entries(st.current)) if (config.on[n] && r) current[n] = r.step;
  return {
    now, characters: characterList(), bank: bankItems.value, bankGold: bankDetails.value?.gold ?? 0,
    achievements: achievements.value ?? NONE, events: liveEvents(), current, costs: st.costs, blocked: st.blocked, config,
    favors: favorsOf(now),
  };
}

/** Task 010: each character's active favors, from today's offerings cache (never a read), until the favor's own
 *  expiry (the accept echo's favor_expires_at) or the day's reset. A completed offering's favor stays: the API
 *  document gives `active_favors` as "XP favors active for this character until reset". */
function favorsOf(now: number): NonNullable<World["favors"]> {
  const out: NonNullable<World["favors"]> = {};
  for (const [name, st] of Object.entries(offerings.value)) {
    if (!st || Date.parse(st.expires_at) <= now) continue;
    out[name] = st.active_favors.map((f) => {
      const sel = st.selected_offerings.find((s) => s.favor?.target_type === f.target_type && s.favor.target_code === f.target_code);
      return { type: f.target_type, code: f.target_code, xp: f.xp_multiplier, drop: f.drop_multiplier, until: Date.parse(sel?.expires_at ?? st.expires_at) };
    });
  }
  return out;
}

// ── the step loop ────────────────────────────────────────────────────────────

const busy = new Set<string>(); // a decision in flight (it may wait for an achievements read)
const starts = new Map<string, { at: number; target: string; key: string }[]>();
const lastSeen = new Map<string, { at: number; counting: boolean }>(); // in memory: a stopped service counts nothing
// The brake (task 010: per target). Different short steps in a row are work; the same target started again and again is
// flapping: its 7th start inside the window blocks that target. 20 starts of any kind block everything (the ceiling).
const BRAKE_N = 6;
const BRAKE_ALL = 20;
const BRAKE_WINDOW = 10 * 60_000;
const BRAKE_HOLD = 30 * 60_000;
const BLOCK_MS = 6 * 3_600_000; // guess: long enough for an event, a bank refill or a level to change things
const STALL_SEC = 20 * 60; // guess: max(20 min, 5 × the unit estimate) of running time without the counter moving

/** Decide for a character that has no step; its items go behind whatever is queued (interrupts), then run. */
function start(name: string): void {
  const ch = characters.value[name];
  if (!ch || !isOwned(name)) return;
  if (queues.value[name]?.items.some((it) => isStepId(it.id))) return void plog(name, "defect: a decision while a step item is queued — none made");
  const now = Date.now();
  const recent = (starts.get(name) ?? []).filter((s) => now - s.at < BRAKE_WINDOW);
  let step: Step;
  let items: QueueItem[];
  const hold = (keys: string[]): void => {
    const blocked = { ...planner.value.blocked };
    for (const k of keys) blocked[`${k}@${name}`] = { until: now + BRAKE_HOLD, why: "flapping" };
    put({ blocked });
  };
  try {
    if (recent.length >= BRAKE_ALL) {
      // The ceiling, for what nobody foresaw: everything this character could do now is blocked for 30 minutes, so
      // the rule gives the fallback.
      plog(name, `flapping — ${recent.length} starts in 10 min, every candidate blocked 30 min (${recent.map((s) => s.key).join(", ")})`);
      const r = rank(name, worldOf(now));
      hold([...r.objectives, ...r.levels, ...r.supply, ...r.fillers].map((c) => c.target.key));
      recent.length = 0;
    }
    step = decide(name, worldOf(now));
    // Per target: a target this character started BRAKE_N times inside the window is blocked and the decision made
    // again — three times at most in one start(); then whatever comes is taken.
    for (let i = 0; i < 3; i++) {
      const n = recent.filter((s) => s.target === step.target).length;
      if (n < BRAKE_N) break;
      plog(name, `flapping — ${step.target}: ${n} starts in 10 min, blocked 30 min`);
      hold([step.target]);
      step = decide(name, worldOf(now));
    }
    items = itemsOf(step, ch);
  } catch (e) {
    return void plog(name, `no step — ${(e as Error).message}`); // the next queue change or tick tries again
  }
  starts.set(name, [...recent, { at: now, target: step.target, key: step.key }]);
  lastSeen.delete(name);
  const prev = planner.value.current[name];
  const lane = laneOf(step);
  const run: Running = {
    step, startedAt: now, n: items.length, run: 0, progress: 0, movedAt: 0, units: 0,
    from: step.work.kind === "train" ? levelOf(ch, step.work.lane) : undefined,
    // consecutive level steps of one lane carry the level's running seconds on
    lv: lane ? (prev?.lv && prev.lv.lane === lane && laneOf(prev.step) === lane ? prev.lv : { lane, level: levelOf(ch, lane), run: 0, full: false }) : undefined,
  };
  batch(() => {
    setRunning(name, run);
    for (const it of items) insertItem(name, it, queues.value[name]?.items.length ?? 0);
  });
  runQueue(name);
  plog(name, `${step.key} (${step.as}, ${step.units} units, ${fmtH(step.hours)} h) — ${step.why}`);
}

/** The step's counter (the stall check) and its units done, from the queue and the character. */
function measure(r: Running, ch: Character): { counter: number; units: number } {
  const mine = stepItems(ch.name, r.step.key);
  const w = r.step.work;
  let counter = (r.n - mine.length) * 1e6; // a finished item is progress
  for (const it of mine) counter += ("done" in it ? it.done : 0) + (it.kind === "buy" && it.bought ? 1 : 0);
  // A train step: every XP of the character, not only the lane's — sourcing a batch's materials gathers or hunts first.
  if (w.kind === "train") for (const [k, v] of Object.entries(ch)) if (k.endsWith("xp") && !k.endsWith("max_xp") && typeof v === "number") counter += v;
  // the step's last item that counts: a supply step ends in a deposit-all, which has none (task 009)
  const counts = itemsOf(r.step, ch).filter((it) => it.kind !== "deposit-all").pop()?.id;
  const last = mine.find((it) => it.id === counts);
  const units =
    w.kind === "train" ? (levelOf(ch, w.lane) > (r.from ?? Infinity) ? 1 : 0)
    : !last ? r.units
    : last.kind === "buy" ? (last.bought ? last.quantity : 0)
    : "done" in last ? last.done : 0;
  return { counter, units: Math.max(r.units, units) };
}

/** Running seconds since the last look (when one of the step's own items was the head and the queue ran, not
 *  held for an outage), the counter, the units, and a level step's level-ups. */
function observe(name: string, r: Running, now: number): Running {
  const q = queues.value[name];
  const ch = characters.value[name]!;
  const head = q?.items[0];
  const seen = lastSeen.get(name);
  lastSeen.set(name, { at: now, counting: !!q?.running && !!head?.id.startsWith(`pl:${r.step.key}:`) && q.note !== OUTAGE_NOTE });
  const dt = seen?.counting ? Math.max(0, (now - seen.at) / 1000) : 0;
  const { counter, units } = measure(r, ch);
  let next = r;
  if (dt || counter !== r.progress || units !== r.units) next = { ...r, run: r.run + dt, units, ...(counter !== r.progress ? { progress: counter, movedAt: r.run + dt } : {}) };
  if (next.lv) {
    let lv = dt ? { ...next.lv, run: next.lv.run + dt } : next.lv;
    const L = levelOf(ch, lv.lane);
    if (L > lv.level) {
      if (lv.full && L === lv.level + 1) {
        const est = levelHoursEstimate(lv.lane, lv.level, worldOf(now), ch); // task 009: combat is priced per character
        addSample(name, `level:${lv.lane}:${lv.level}`, lv.run / 3600, 5, est, 3600); // one level is one whole sample
      }
      lv = { lane: lv.lane, level: L, run: 0, full: L === lv.level + 1 };
    }
    if (lv !== next.lv) next = { ...next, lv };
  }
  return next;
}

const slow = new Set<string>();
/** One measured cost (cost.ts sample(): an exponential mean, only from five units up), its dev-log line, and
 *  "slower than expected" the first time the mean passes twice the estimate. `toSec` turns the stored unit into seconds. */
function addSample(name: string, key: string, value: number, units: number, estimate: number, toSec: number): void {
  const costs = sample(planner.value.costs, key, value, units, Date.now());
  if (costs === planner.value.costs) return;
  put({ costs });
  const c = costs[key];
  plog(name, `sample ${key} ${Math.round(value * toSec)} s (n=${c.n}, estimate ${Math.round(estimate * toSec)} s)`);
  if (c.sec > 2 * estimate && !slow.has(key)) {
    slow.add(key);
    devlog(`plan: slower than expected — ${key} ${Math.round(c.sec * toSec)} s against ${Math.round(estimate * toSec)} s`);
  }
}

/** A kill, gather, task or craft step's running seconds ÷ units done, against the model's own estimate. */
function stepSample(name: string, r: Running): void {
  const w = r.step.work;
  const key = costKey(w);
  if (!key || !(w.kind === "kill" || w.kind === "gather" || w.kind === "task" || w.kind === "craft")) return;
  const world = { ...worldOf(Date.now()), costs: {} }; // the estimate, not the measured mean
  const t = targetsOf(world).find((x) => x.key === r.step.target && x.work.kind === w.kind) ?? { work: w };
  addSample(name, key, r.run / Math.max(1, r.units), r.units, unitSec(t, characters.value[name]!, world) / perOf(w), 1);
}

/** The lanes whose level-up ends a long block of this target: its level gates, combat for a safe win. */
function gateLanes(s: Step): Lane[] {
  if (s.target.startsWith("lvl:")) return [s.target.split(":")[1] as Lane];
  const t = targetsOf(worldOf(Date.now())).find((x) => x.key === s.target);
  return [...new Set((t?.gates ?? []).flatMap((g): Lane[] => (g.kind === "level" ? [g.lane] : g.kind === "win" ? ["combat"] : [])))];
}

/** C.4: the pair is blocked for 6 h; the third block in a row of a target blocks it for every owned character
 *  until the next UTC day or a level-up of a lane in its gates, whichever is first. */
function blockStep(name: string, s: Step, why: string): void {
  const now = Date.now();
  const blocked = { ...planner.value.blocked };
  for (const [k, b] of Object.entries(blocked)) if (b.until <= now) delete blocked[k];
  const n = (planner.value.strikes[s.target] ?? 0) + 1;
  if (n >= 3) {
    const until = new Date(now).setUTCHours(24, 0, 0, 0);
    const lanes = gateLanes(s);
    for (const o of owned()) blocked[`${s.target}@${o}`] = { until, why: `${why} (three times running)`, levels: Object.fromEntries(lanes.map((l) => [l, levelOf(characters.value[o]!, l)])) };
    plog(name, `blocked ${s.target} for everyone until ${new Date(until).toISOString().slice(0, 16)}Z or a level-up of ${lanes.join(", ") || "—"} — ${why} (three times running)`);
  } else {
    blocked[`${s.target}@${name}`] = { until: now + BLOCK_MS, why };
    plog(name, `blocked ${s.target} 6 h — ${why}`);
  }
  put({ blocked, strikes: { ...planner.value.strikes, [s.target]: n >= 3 ? 0 : n } });
}

/** The skip line runLoop wrote for this character since `since` (skipItem), as " : <what — why>". */
function skipReason(name: string, since: number): string {
  const e = activity.value.find((x) => x.character === name && x.ts >= since && x.text.startsWith("skipped: "));
  return e ? `: ${e.text.slice("skipped: ".length)}` : "";
}

/** The step is over — its items are gone, or `block` says why it fails: block or sample it, read the
 *  achievements after an objective's or a filler's step, then decide again for this character only. */
async function next(name: string, block?: string): Promise<void> {
  busy.add(name);
  try {
    const r = planner.value.current[name];
    if (r && !r.over) {
      for (const it of stepItems(name, r.step.key)) dropItem(name, it.id);
      setRunning(name, { ...r, over: true });
      if (!block && r.units === 0) block = `ended empty${skipReason(name, r.startedAt)}`;
      if (block) blockStep(name, r.step, block);
      else {
        stepSample(name, r);
        if (planner.value.strikes[r.step.target]) put({ strikes: { ...planner.value.strikes, [r.step.target]: 0 } });
        if (r.step.as === "objective" || r.step.as === "filler") await readAchievements();
      }
    }
    start(name);
  } finally {
    busy.delete(name);
  }
}

const stalled = (r: Running): boolean => r.run - r.movedAt > Math.max(STALL_SEC, (5 * r.step.hours * 3600) / Math.max(1, r.step.units));

let active = false; // someone is on and the runtime was started
let ready = false; // free characters may decide: the first achievements read came back, or five minutes passed
let tickQueued = false;
function scheduleTick(): void {
  if (tickQueued) return;
  tickQueued = true;
  queueMicrotask(() => {
    tickQueued = false;
    tick();
  });
}
// Every queue write (each action's echo) → one microtask tick, outside the effect: nothing it reads is tracked.
if (IS_SERVER) effect(() => {
  queues.value;
  if (active) scheduleTick();
});

function tick(): void {
  const now = Date.now();
  for (const name of owned()) {
    if (busy.has(name)) continue;
    const q = queues.value[name];
    const head = q?.items[0];
    if (q && !q.running && head?.error && head.id.startsWith("pl:int:")) {
      // An interrupt that pauses is removed, not the step under it (settled point 7).
      plog(name, `interrupt removed — ${queueItemText(head)}: ${head.error}`);
      dropItem(name, head.id);
      if (head.id.startsWith("pl:int:offering:")) offeringLater(name, now);
      runQueue(name);
      continue;
    }
    const r = planner.value.current[name];
    if (r && !r.over) {
      const o = observe(name, r, now);
      if (o !== r) setRunning(name, o);
      if (!stepItems(name, r.step.key).length) { if (ready) void next(name); }
      else if (q && !q.running && head?.error && head.id.startsWith(`pl:${r.step.key}:`)) void next(name, head.error);
      else if (stalled(o)) void next(name, "stalled");
      continue;
    }
    if (ready) void next(name);
  }
}

// ── the 5-minute tick and the achievements reads ─────────────────────────────

const TICK_MS = 5 * 60_000;
const READS_AN_HOUR = 6; // whatever asks: a step's end, the tick (the boot read and its retries are forced)
const READ_EVERY = 30 * 60_000;
let lastRead = 0; // the last attempt
const readTimes: number[] = []; // attempts of the last hour
/** sync.ts's two reads, handed over by resumePlanner (sync.ts imports this module; no cycle, no dynamic import). */
export interface Reads { loadAchievements(): Promise<void>; loadPendingRewards(): Promise<void> }
let reads: Reads | undefined;

function heartbeat(): void {
  if (!owned().length) return void (active = false); // the last one was switched off: nothing runs any more
  setTimeout(heartbeat, TICK_MS);
  // a long block ends at a level-up of a lane in its gates
  const blocked = { ...planner.value.blocked };
  let freed = false;
  for (const [k, b] of Object.entries(blocked)) {
    const ch = characters.value[k.slice(k.lastIndexOf("@") + 1)];
    if (b.levels && ch && Object.entries(b.levels).some(([lane, L]) => levelOf(ch, lane as Lane) > L)) {
      delete blocked[k];
      freed = true;
    }
  }
  if (freed) put({ blocked });
  for (const name of owned()) {
    const q = queues.value[name];
    if (busy.has(name) || !q?.items.length || q.running || q.items[0].error) continue;
    plog(name, "queue found stopped — started"); // a defect when it shows in real play
    runQueue(name);
  }
  if (Date.now() - lastRead >= READ_EVERY) void readAchievements();
  catchUpOfferings();
  tick();
}

function activate(): void {
  if (active) return;
  active = true;
  setTimeout(heartbeat, TICK_MS);
}

/** One achievements read (at most six an hour unless forced). A completion since the read before → one pending
 *  rewards read and a claim. False when nothing new came back. */
async function readAchievements(force = false): Promise<boolean> {
  const now = Date.now();
  while (readTimes.length && now - readTimes[0] >= 3_600_000) readTimes.shift();
  if (!reads || (!force && readTimes.length >= READS_AN_HOUR)) return false;
  lastRead = now;
  readTimes.push(now);
  const before = achievements.value;
  await reads.loadAchievements();
  const after = achievements.value;
  if (achievementsError.value || !after || after === before) {
    devlog(`plan: achievements read failed — ${achievementsError.value ?? "no answer"}`);
    return false;
  }
  put({ achievementsAt: Date.now() });
  const done = before ? after.filter((a) => isDone(a) && before.some((b) => b.code === a.code && !isDone(b))) : [];
  if (done.length) {
    devlog(`plan: completed ${done.map((a) => `${a.code} (+${a.points})`).join(", ")}`);
    await reads.loadPendingRewards();
    claimRewards();
  }
  return true;
}

/** A pending reward → one `claim` interrupt, on the owned character with the emptiest bag; one at a time. */
function claimRewards(): void {
  if (!pendingRewards.value.length) return;
  const names = owned();
  if (names.some((n) => queues.value[n]?.items.some((it) => it.id.startsWith("pl:int:claim:")))) return;
  const who = names.sort((a, b) => invCount(characters.value[a]) - invCount(characters.value[b]))[0];
  if (who) interrupt(who, "claim", [{ kind: "claim" }], Date.now().toString(36));
}

// ── interrupt() ──────────────────────────────────────────────────────────────

/** Design C.3, highest first. `group` is reserved (stage 4). A step is never inserted ahead of anything. */
const CLASSES = ["group", "event", "merchant", "offering", "claim"] as const;
export type InterruptClass = (typeof CLASSES)[number];
const classOf = (id: string): number => CLASSES.indexOf(/^pl:int:([a-z]+):/.exec(id)?.[1] as InterruptClass);

/**
 * The only way anything gets ahead of an owned queue's head: `items` go in ahead of it, behind any interrupt of
 * the same or a higher class, with ids pl:int:<cls>:<what>:<i>. The step keeps its items, their progress and its
 * place. Idempotent per (cls, what). False for a character the planner does not own.
 */
export function interrupt(name: string, cls: InterruptClass, items: QueueItemInput[], what: string): boolean {
  if (!IS_SERVER || !isOwned(name) || !characters.value[name]) return false;
  const prefix = `pl:int:${cls}:${what}:`;
  const q = queues.value[name] ?? { items: [], running: false };
  if (q.items.some((it) => it.id.startsWith(prefix))) return false;
  let at = 0;
  while (at < q.items.length && classOf(q.items[at].id) >= 0 && classOf(q.items[at].id) <= CLASSES.indexOf(cls)) at++;
  const out = items.map((it, i) => ({ ...it, id: `${prefix}${i}` }) as QueueItem);
  batch(() => out.forEach((it, i) => insertItem(name, it, at + i)));
  plog(name, `interrupt ${cls} — ${out.map(queueItemText).join(", ")}`);
  if (!queues.value[name]?.running) runQueue(name);
  return true;
}

// ── offerings (task 010, section 4) ──────────────────────────────────────────
// The planner owns the trigger for its characters, per character and offerings day (the date of the most recent 00:05
// UTC): the daily trigger (queue.ts scheduleOfferings), the boot, a switch-on and the five-minute tick all go through
// catchUpOfferings, so a service down at 00:05, a stopped queue or a character switched on at noon loses nothing. An
// item with nothing left to do ends at once (runOffering). A removed offering interrupt comes back an hour later, at
// most three times a day.

const AGAIN_MS = 3_600_000;
const AGAIN_MAX = 3;
const offerDay = (now: number): string => new Date(now - 5 * 60_000).toISOString().slice(0, 10);
const putOffered = (name: string, o: { day: string; n: number; again?: number }): void => put({ offered: { ...planner.value.offered, [name]: o } });

/** One offering interrupt for this character and today's offerings day, recorded: the daily trigger, the catch-up and
 *  the panel's buttons (queue.ts queueOfferings). False when one is already queued or the character is not owned. */
export function offeringsDue(name: string): boolean {
  if (!IS_SERVER || !isOwned(name) || !characters.value[name]) return false;
  const day = offerDay(Date.now());
  if (planner.value.offered?.[name]?.day !== day) putOffered(name, { day, n: 0 });
  return interrupt(name, "offering", [{ kind: "offering" }], day);
}
setOwnedOfferings(offeringsDue);

/** Every owned character without an offering interrupt for today gets one; a removed one is issued again when due. */
function catchUpOfferings(): void {
  const now = Date.now();
  const day = offerDay(now);
  for (const name of owned()) {
    const o = planner.value.offered?.[name];
    if (o?.day !== day) offeringsDue(name);
    else if (o.again && o.again <= now) {
      putOffered(name, { day, n: o.n });
      plog(name, `offering interrupt issued again (${o.n} of ${AGAIN_MAX} today)`);
      interrupt(name, "offering", [{ kind: "offering" }], day);
    }
  }
}

/** A paused offering interrupt was removed (a 598 at the altar): it comes back in an hour, three times a day at most. */
function offeringLater(name: string, now: number): void {
  const day = offerDay(now);
  const o = planner.value.offered?.[name];
  const n = o?.day === day ? o.n : 0;
  if (n >= AGAIN_MAX) return void plog(name, `offering interrupt not issued again — ${AGAIN_MAX} times today already`);
  putOffered(name, { day, n: n + 1, again: now + AGAIN_MS });
  plog(name, `offering interrupt comes back at ${new Date(now + AGAIN_MS).toISOString().slice(11, 16)}Z (${n + 1} of ${AGAIN_MAX} today)`);
}

// ── taking a character over, handing it back ─────────────────────────────────

function optOut(name: string): void {
  if (hive.value.manual.includes(name)) return;
  setHiveManual(name, true); // a running hive assignment is abandoned by its own rule
  put({ optedOut: [...planner.value.optedOut, name] });
}

/** Switched on: every queued item that is not the planner's goes (one dev-log line each), 🔁 off, the queue
 *  stopped until the first step starts it, the character on the hive's opt-out list. The in-flight action is not
 *  waited for: its result is id-guarded (runLoop ignores a finished step whose item is gone). */
function takeOver(name: string): void {
  const q = queues.value[name];
  if (q?.running) haltQueue(name);
  for (const it of q?.items ?? []) if (!it.id.startsWith("pl:int:")) plog(name, `took over — dropped [${it.id}] ${queueItemText(it)}`);
  resetQueue(name, (it) => it.id.startsWith("pl:int:"));
  optOut(name);
}

/** Switched off: the planner's items go, the queue stays empty and stopped, the opt-out goes if the planner put it there. */
function handBack(name: string): void {
  if (queues.value[name]?.running) haltQueue(name);
  resetQueue(name, (it) => !it.id.startsWith("pl:"));
  const st = planner.value;
  put({ current: { ...st.current, [name]: undefined }, optedOut: st.optedOut.filter((n) => n !== name) });
  if (st.optedOut.includes(name)) setHiveManual(name, false);
  lastSeen.delete(name);
  starts.delete(name);
  plog(name, "handed back — the queue is empty and stopped; blocks and costs are kept");
}

function switchOn(name: string): void {
  activate();
  takeOver(name);
  catchUpOfferings();
  busy.add(name);
  void (async () => {
    try {
      if (!achievements.value) await readAchievements(true);
      ready = true;
      start(name);
    } finally {
      busy.delete(name);
    }
  })();
}

/** Alex's knobs, stored as a patch over DEFAULTS. Switching a character on takes it over; off hands it back. */
export function setPlannerConfig(patch: Partial<PlannerConfig>): void {
  if (!IS_SERVER) return rpc("setPlannerConfig", [patch]);
  const st = planner.value;
  const was = configOf(st.config).on;
  put({ config: { ...st.config, ...patch, ...(patch.on ? { on: { ...st.config.on, ...patch.on } } : {}) } });
  const on = configOf(planner.value.config).on;
  for (const name of Object.keys(characters.value)) {
    if (!!on[name] === !!was[name]) continue;
    if (on[name]) switchOn(name);
    else handBack(name);
  }
}

// ── boot ─────────────────────────────────────────────────────────────────────

/** A free character's first decision waits for the first achievements read (retried every minute), at most five minutes. */
async function bootRead(first: boolean): Promise<void> {
  const ok = await readAchievements(true);
  if (first) {
    await reads?.loadPendingRewards();
    claimRewards();
  }
  if (ok) ready = true;
  else if (!ready) setTimeout(() => void bootRead(false), 60_000);
  scheduleTick();
}

/**
 * Called from boot()/login() after resumeQueue(), before resumeHive(). Per owned character: anything queued that
 * is not the planner's → taken over; the step's items still queued → re-attached (nothing written, the queue
 * started if it stands); otherwise the next decision follows the first achievements read.
 */
export function resumePlanner(r: Reads): void {
  reads = r;
  const names = owned();
  if (!names.length) return;
  activate();
  for (const name of names) {
    const q = queues.value[name];
    const r = planner.value.current[name];
    if (q?.items.some((it) => !it.id.startsWith("pl:"))) takeOver(name);
    else optOut(name);
    if (r && !r.over && stepItems(name, r.step.key).length) {
      plog(name, `re-attached ${r.step.key}`);
      if (!queues.value[name]?.running) runQueue(name);
      continue;
    }
    for (const it of queues.value[name]?.items ?? []) if (isStepId(it.id)) dropItem(name, it.id); // a step nobody knows
    if (r && !r.over) setRunning(name, { ...r, over: true }); // it ended while the service was down: no sample
    if (queues.value[name]?.items.length && !queues.value[name].running) runQueue(name); // interrupts run meanwhile
  }
  catchUpOfferings();
  setTimeout(() => {
    ready = true;
    scheduleTick();
  }, 5 * 60_000);
  void bootRead(true);
}

// A hot swap would double-register the module-level effects — reload instead (same as queue.ts).
if (import.meta.hot) import.meta.hot.accept(() => location.reload());

expose({ setPlannerConfig });
