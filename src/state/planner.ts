// The planner's runtime (task 008; docs/design/planner.md B.2, C, F.5, I.2). For every character that is on
// (config `on`, DEFAULTS + Alex's patch): decide(name, world) → itemsOf → the queue, watch the queue, decide again
// when the step ends, pauses, stalls or ends empty. It is the only automatic writer of an owned queue; anything
// that goes ahead of a step goes through interrupt(). Server-only like the queue: its own key ammo:v1:planner,
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
import { RUN, devlog } from "../lib/devlog";
import { journal, lastRecords, meterCut, runInfo, setMeterKey, writeStatus, writeWorld } from "../lib/journal";
import { achievements, achievementsError, bankDetails, bankItems, characterList, characters, isOwned, log as activity, offerings, pendingRewards, plannerOn, pushLog } from "./store";
import { OUTAGE_NOTE, dropItem, haltQueue, insertItem, offeringSkips, queues, resetQueue, runQueue, setOwnedOfferings } from "./queue";
import { liveEvents } from "./events";
import { invCount, setFightBlocks, setMinWin } from "./exec";
import { noSlotFor, setNoSlotHook } from "./loopkit";
import { DEFAULTS } from "../plan/planner/config";
import { EXPAND_BELOW, TIDY_BELOW, expansionOk, freeSlots, tidyLeft, tidyVerdicts, usedSlots } from "../plan/planner/bank";
import { bankSec, minWinOf, placeOf, staticTiles } from "../plan/planner/reach";
import { RUNE, runeOffer, runePays, runesHeld } from "../plan/planner/consumables";
import { item as itemOf, itemName } from "../catalog";
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
const EMPTY: PlannerState = { current: {}, costs: {}, blocked: {}, strikes: {}, config: {}, achievementsAt: 0 };

function load(): PlannerState {
  try {
    // task 019: the hive's opt-out list (`optedOut`, read by nobody since 018) is dropped at load, without a line
    const { optedOut: _, ...st } = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<PlannerState> & { optedOut?: unknown };
    return { ...EMPTY, ...st };
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
// task 025: the executor's gate admits a fight at the planner's floor (config.risk.minWin)
effect(() => setMinWin(minWinOf({ config: configOf(planner.value.config) } as World)));

/** Task 025, settled point 2: a fight block — the brake (play against the forecast) or a gate that refused — keyed
 *  `kill:<monster>@<name>`, for 24 h or until the set (its combat pieces) or the level changes (the core reads it: reach.ts
 *  braked; the executor: exec.ts fightBlocked). No strike: the old "not a safe win", three times running, is this rule now. */
const FIGHT_BLOCK_MS = 24 * 3600_000;
const brakedSteps = new Map<string, string>(); // name → the why of a block written while its step ran (its end record)
if (IS_SERVER) setFightBlocks((name, monster, why, set, level) => {
  if (!isOwned(name)) return;
  const now = Date.now();
  const blocked = { ...planner.value.blocked };
  for (const [k, b] of Object.entries(blocked)) if (b.until <= now) delete blocked[k];
  blocked[`kill:${monster}@${name}`] = { until: now + FIGHT_BLOCK_MS, why, set, level };
  put({ blocked });
  if (planner.value.current[name] && !planner.value.current[name]!.over) brakedSteps.set(name, `${monster}: ${why}`);
  plog(name, `blocked ${monster} for ${name} 24 h or until its set or level changes — ${why}`);
  journal("block", { who: name, target: `kill:${monster}`, until: iso(now + FIGHT_BLOCK_MS), why, level, set });
}, (name, monster) => planner.value.blocked[`kill:${monster}@${name}`]);

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
  // task 013, settled point 9: a running ach: step is in flight only for what it still has to do — the achievements read
  // already counts what it did (its counter is actions: a drop's fights, a gather's gathers)
  const left = (r: Running): Step => (r.step.target.startsWith("ach:") ? { ...r.step, units: Math.max(0, r.step.units - r.units / perOf(r.step.work)) } : r.step);
  for (const [n, r] of Object.entries(st.current)) if (config.on[n] && r) current[n] = left(r);
  return {
    now, characters: characterList(), bank: bankItems.value, bankGold: bankDetails.value?.gold ?? 0,
    achievements: achievements.value ?? NONE, events: liveEvents(), current, costs: st.costs, blocked: st.blocked, config,
    favors: favorsOf(now), bags: bagsOf(config),
    // task 015, settled point 2: the bank's slots and the next expansion's price
    bankSlots: bankDetails.value?.slots, nextExpansion: bankDetails.value?.next_expansion_cost,
    ...(st.hunted ? { hunted: st.hunted } : {}), // task 027
  };
}

/** Task 014, settled point 9: what lies in the owned characters' bags beyond their own running steps' inputs (a step's
 *  withdrawal, its sources' and its recipe's materials, a buy's currency) — stock on its way: every step starts with a
 *  bank reset. The bills count it (supply.ts billOf); a craft's withdrawal and feedable stay the bank's. */
function bagsOf(config: PlannerConfig): Record<string, number> {
  const out: Record<string, number> = {};
  for (const ch of characterList()) {
    if (!config.on[ch.name]) continue;
    const r = planner.value.current[ch.name], s = r && !r.over ? r.step : undefined;
    const inputs = new Set<string>([...Object.keys(s?.withdraw ?? {}), ...(s?.sources ?? []).map((x) => x.code)]);
    if (s?.work.kind === "craft") for (const g of itemOf(s.work.code)?.craft?.items ?? []) inputs.add(g.code);
    if (s?.work.kind === "buy") inputs.add(s.work.currency);
    for (const it of ch.inventory ?? []) if (it.code && it.quantity > 0 && !inputs.has(it.code)) out[it.code] = (out[it.code] ?? 0) + it.quantity;
  }
  return out;
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
const SPIN_HOLD = 60_000; // task 017: a character whose steps end at once waits this long before the next decision
const holdUntil = new Map<string, number>();

/** Decide for a character that has no step; its items go behind whatever is queued (interrupts), then run. */
function start(name: string): void {
  const ch = characters.value[name];
  if (!ch || !isOwned(name)) return;
  if (queues.value[name]?.items.some((it) => isStepId(it.id))) {
    journal("defect", { who: name, what: "a decision while a step item is queued — none made" });
    return void plog(name, "defect: a decision while a step item is queued — none made");
  }
  const now = Date.now();
  const recent = (starts.get(name) ?? []).filter((s) => now - s.at < BRAKE_WINDOW);
  // Task 017: a character whose every step ends at once (each item skipped: no route off a paid isle without the fare)
  // would be decided for again and again inside one second; past the ceiling it waits a minute, with one line.
  if ((holdUntil.get(name) ?? 0) > now) return;
  if (recent.length >= BRAKE_ALL && now - recent[recent.length - 1].at < 1000) {
    holdUntil.set(name, now + SPIN_HOLD);
    plog(name, `spinning — ${recent.length} starts in 10 min, the last ones ending at once; the next decision in a minute`);
    journal("flap", { who: name, n: recent.length, until: iso(now + SPIN_HOLD), spin: true });
    return;
  }
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
      const all = [...r.objectives, ...r.levels, ...r.supply, ...r.fillers].map((c) => c.target.key);
      hold(all);
      journal("flap", { who: name, n: recent.length, until: iso(now + BRAKE_HOLD), keys: recent.map((s) => s.key), targets: all.length });
      recent.length = 0;
    }
    step = decide(name, worldOf(now));
    // Per target: a target this character started BRAKE_N times inside the window is blocked and the decision made
    // again — three times at most in one start(); then whatever comes is taken.
    for (let i = 0; i < 3; i++) {
      const n = recent.filter((s) => s.target === step.target).length;
      if (n < BRAKE_N) break;
      plog(name, `flapping — ${step.target}: ${n} starts in 10 min, blocked 30 min`);
      journal("flap", { who: name, target: step.target, n, until: iso(now + BRAKE_HOLD) });
      hold([step.target]);
      step = decide(name, worldOf(now));
    }
    items = itemsOf(step, ch);
  } catch (e) {
    journal("nostep", { who: name, why: (e as Error).message });
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
  journal("step", {
    who: name, key: step.key, target: step.target, as: step.as, work: step.work, units: step.units, h: Math.round(step.hours * 1000) / 1000,
    score: Number(step.score.toPrecision(4)), why: step.why, parent: step.parent, for: step.for, wd: some(step.withdraw), wear: some(step.wear), until: step.until && iso(step.until),
  });
  statusNow();
}

// ── task 016: the journal's records of a step's end and an interrupt's ──────

const iso = (t: number): string => new Date(t).toISOString();
const some = <T extends object>(o: T | undefined): T | undefined => (o && Object.keys(o).length ? o : undefined);
const reattached = new Set<string>(); // steps and interrupts re-attached at this boot: their end is partial (the meter is in memory)
/** The bucket of the meter an item's actions go to (lib/journal.ts): a step's `pl:<key>`, an interrupt's `pl:int:<cls>:<what>`. */
const bucketOf = (id: string | undefined): string => (id?.startsWith("pl:") ? id.slice(0, id.lastIndexOf(":")) : "");
if (IS_SERVER) setMeterKey((name) => bucketOf(queues.value[name]?.items[0]?.id));

/** A step is over: units done of planned, the wall, running and planned seconds, how it ended, and what its own items did. */
function endRecord(name: string, r: Running, how: "done" | "blocked" | "empty" | "noslot" | "dropped" | "gone" | "braked", why?: string): void {
  const now = Date.now();
  const m = meterCut(name, `pl:${r.step.key}`);
  // task 025, settled point 2: a fight step's fights, wins and losses, the forecast's p and seconds a win beside the measured
  // ones (the step's running seconds a win, its walks and bank trips in)
  const won = m?.won ?? 0, lost = m?.lost ?? 0, f = r.step.fight;
  const fight = f || won || lost ? { fights: won + lost, wins: won, losses: lost, p: f ? Math.round(f.p * 1000) / 1000 : undefined, pWon: won + lost ? Math.round((1000 * won) / (won + lost)) / 1000 : undefined, sec: f ? Math.round(f.sec) : undefined, secWon: won ? Math.round(r.run / won) : undefined } : undefined;
  journal("end", {
    who: name, key: r.step.key, units: r.units, of: r.step.units, wall: Math.round((now - r.startedAt) / 1000), ran: Math.round(r.run),
    plan: Math.round(r.step.hours * 3600), how, why, partial: reattached.delete(`pl:${r.step.key}`) || undefined, fight, m,
  });
  statusNow();
}

/** Interrupts issued and not over yet, per character (in memory; a restart registers the queued ones again, partial). */
const ints = new Map<string, Map<string, { cls: string; what: string; at: number; removed?: string }>>();
const intOf = (name: string): Map<string, { cls: string; what: string; at: number; removed?: string }> =>
  ints.get(name) ?? ints.set(name, new Map()).get(name)!;

/** An offering interrupt's end: the day's categories completed, and every other with the item's own reason. */
function offeringOutcome(name: string): { done: string[]; open: Record<string, string> } {
  const st = offerings.value[name];
  const sk = offeringSkips.get(name);
  const skips = sk && (!st || sk.day === st.date) ? sk.why : {};
  const done = st?.completed_categories ?? [];
  const open: Record<string, string> = {};
  for (const c of st ? ["combat", ...st.skills] : Object.keys(skips)) {
    if (done.includes(c)) continue;
    open[c] = skips[c] ?? (st?.selected_offerings.some((s) => s.category === c) ? "accepted, not completed" : "not accepted");
  }
  return { done, open };
}

/** Every interrupt of this character whose items are all gone: its `int-end` with its own meter. */
function intsOver(name: string): void {
  const mine = ints.get(name);
  if (!mine?.size) return;
  const items = queues.value[name]?.items ?? [];
  for (const [bucket, o] of mine) {
    if (items.some((it) => it.id.startsWith(`${bucket}:`))) continue;
    mine.delete(bucket);
    journal("int-end", {
      who: name, cls: o.cls, what: o.what, how: o.removed ? "removed" : "done", why: o.removed, s: Math.round((Date.now() - o.at) / 1000),
      partial: reattached.delete(bucket) || undefined, off: o.cls === "offering" ? offeringOutcome(name) : undefined, m: meterCut(name, bucket),
    });
  }
}

// ── the status and the day's snapshot (settled points 5, 6) ─────────────────

let snapDay = "";
/** The status: the run, the account's points, the bank, per character its level, place, step, queue head; the blocks,
 *  the live events, the last pause or server record. Rewritten whole every minute and at every step and end. */
function statusNow(): void {
  if (!IS_SERVER) return;
  // task 017, settled point 13: a status that cannot be built is dropped like one that cannot be written
  try {
    statusOf();
  } catch {
    /* the next minute's goes through */
  }
}
function statusOf(): void {
  const now = Date.now(), st = planner.value, d = bankDetails.value, info = runInfo();
  const done = achievements.value?.filter(isDone);
  const codes = new Set(bankItems.value.map((b) => b.code)).size;
  writeStatus({
    t: iso(now), run: RUN, commit: info.commit, branch: info.branch, dev: info.dev, up: info.up,
    points: done ? done.reduce((s, a) => s + a.points, 0) : null,
    bank: { codes, slots: d?.slots, free: d ? d.slots - codes : undefined, gold: d?.gold, next: d?.next_expansion_cost },
    chars: Object.fromEntries(characterList().map((ch) => {
      const q = queues.value[ch.name], head = q?.items[0], r = st.current[ch.name];
      return [ch.name, {
        owned: isOwned(ch.name), lv: ch.level,
        skills: Object.fromEntries(["mining", "woodcutting", "fishing", "weaponcrafting", "gearcrafting", "jewelrycrafting", "cooking", "alchemy"].map((s) => [s, (ch as unknown as Record<string, number>)[`${s}_level`]])),
        at: [ch.x, ch.y, (ch as { layer?: string }).layer ?? "overworld"], hp: [ch.hp, ch.max_hp],
        step: r && !r.over ? { key: r.step.key, as: r.step.as, why: r.step.why, since: iso(r.startedAt), units: r.units, of: r.step.units, h: Math.round(r.step.hours * 1000) / 1000, ran: Math.round(r.run) } : null,
        head: head ? `[${head.id}] ${queueItemText(head)}` : null, note: q?.note ?? null, running: !!q?.running, error: head?.error ?? null,
      }];
    })),
    blocked: Object.entries(st.blocked).filter(([, b]) => b.until > now).map(([k, b]) => ({ k, until: iso(b.until), why: b.why })),
    events: liveEvents().map((e) => ({ code: e.code, at: [e.map.x, e.map.y, e.map.layer], until: e.expiration })),
    last: lastRecords(),
  });
}

/** The World as decide() reads it, and the planner's own state — the start of any later replay. Never the token. */
const snapshotOf = (now: number): Record<string, unknown> => {
  const st = planner.value;
  return { t: iso(now), run: RUN, commit: runInfo().commit, world: worldOf(now), bankDetails: bankDetails.value, offerings: offerings.value, planner: { current: st.current, costs: st.costs, blocked: st.blocked, strikes: st.strikes, config: st.config, offered: st.offered } };
};
/** The day's snapshot once a day: at the first minute after 00:00 UTC, and at boot when the day has none (after the
 *  first achievements read: the World is not whole without them). */
function snapshotDue(): void {
  const day = new Date().toISOString().slice(0, 10);
  if (snapDay === day || !achievements.value) return;
  snapDay = day;
  writeWorld(day, () => snapshotOf(Date.now()));
}
function minute(): void {
  if (!owned().length) return;
  statusNow();
  snapshotDue();
}

/** The step's counter (the stall check) and its units done, from the queue and the character. */
function measure(r: Running, ch: Character): { counter: number; units: number } {
  const mine = stepItems(ch.name, r.step.key);
  const w = r.step.work;
  let counter = (r.n - mine.length) * 1e6; // a finished item is progress
  for (const it of mine) counter += ("done" in it ? it.done : 0) + (it.kind === "buy" && it.bought ? 1 : 0);
  // A train step: every XP of the character, not only the lane's — sourcing a batch's materials gathers or hunts first.
  if (w.kind === "train") for (const [k, v] of Object.entries(ch)) if (k.endsWith("xp") && !k.endsWith("max_xp") && typeof v === "number") counter += v;
  // the step's last item that counts: a supply step ends in a deposit-all, which has none (task 009); task 027d: a visit to
  // the tasks master counts only in a step that is the visit alone
  const items = itemsOf(r.step, ch).filter((it) => it.kind !== "deposit-all");
  const counts = (items.filter((it) => it.kind !== "task-visit").pop() ?? items.pop())?.id;
  const last = mine.find((it) => it.id === counts);
  // task 017, settled point 13: a tidy step's units are the copies of all its codes (a finished recycle item: its quantity)
  const tidy = r.step.as === "tidy" ? itemsOf(r.step, ch).reduce((s, it) => {
    if (it.kind !== "recycle") return s;
    const live = mine.find((x) => x.id === it.id);
    return s + (live?.kind === "recycle" ? live.done : it.quantity);
  }, 0) : undefined;
  const units =
    w.kind === "train" ? (levelOf(ch, w.lane) > (r.from ?? Infinity) ? 1 : 0)
    : tidy != null ? tidy
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
  journal("sample", { who: name, key, s: Math.round(value * toSec), units, n: c.n, mean: Math.round(c.sec * toSec), est: Math.round(estimate * toSec) });
  if (c.sec > 2 * estimate && !slow.has(key)) {
    slow.add(key);
    devlog(`plan: slower than expected — ${key} ${Math.round(c.sec * toSec)} s against ${Math.round(estimate * toSec)} s`);
    journal("slow", { key, mean: Math.round(c.sec * toSec), est: Math.round(estimate * toSec) });
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

/** The lanes whose level-up ends a long block of this target: its level gates, combat for an admitted win. */
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
    journal("block", { who: name, target: s.target, key: s.key, all: true, until: iso(until), lanes, why, strikes: n });
  } else {
    blocked[`${s.target}@${name}`] = { until: now + BLOCK_MS, why };
    plog(name, `blocked ${s.target} 6 h — ${why}`);
    journal("block", { who: name, target: s.target, key: s.key, until: iso(now + BLOCK_MS), why, strikes: n });
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
      // task 015, settled point 1: a step that ended because the bank had no slot is not blocked for it
      const noSlot = !block && r.units === 0 && (noSlotAt.get(name) ?? 0) >= r.startedAt;
      if (noSlot) plog(name, `${r.step.key} ended with no unit — the bank had no slot; not blocked`);
      // task 025: a step the brake or the gate ended has its monster blocked already (setFightBlocks) — not blocked again
      const brake = brakedSteps.get(name);
      brakedSteps.delete(name);
      const empty = !block && !noSlot && !brake && r.units === 0;
      if (empty) block = `ended empty${skipReason(name, r.startedAt)}`;
      endRecord(name, r, noSlot ? "noslot" : brake && !block ? "braked" : empty ? "empty" : block ? "blocked" : "done", block ?? brake);
      // task 027: the kills of a sale's hunt (the golden egg's chickens), for its stop (supply.ts huntStop)
      const sold = r.units > 0 && r.step.work.kind === "kill" && r.step.target.startsWith("src:") ? r.step.target.slice(4) : "";
      if (sold && targetsOf(worldOf(Date.now())).some((t) => t.work.kind === "sell" && t.work.code === sold)) {
        put({ hunted: { ...planner.value.hunted, [sold]: (planner.value.hunted?.[sold] ?? 0) + r.units } });
        plog(name, `hunted ${sold}: ${planner.value.hunted![sold]} kills`);
      }
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
    intsOver(name);
    if (busy.has(name)) continue;
    const q = queues.value[name];
    const head = q?.items[0];
    if (q && !q.running && head?.error && head.id.startsWith("pl:int:")) {
      // An interrupt that pauses is removed, not the step under it (settled point 7).
      plog(name, `interrupt removed — ${queueItemText(head)}: ${head.error}`);
      const o = ints.get(name)?.get(bucketOf(head.id));
      if (o) o.removed = `${queueItemText(head)}: ${head.error}`;
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
    journal("stopped", { who: name, head: `[${q.items[0].id}] ${queueItemText(q.items[0])}` });
    runQueue(name);
  }
  if (Date.now() - lastRead >= READ_EVERY) void readAchievements();
  catchUpOfferings();
  bankCheck();
  runeCheck();
  tick();
}

/** Task 025, settled point 5: the planner buys a healing rune for a character it pays for (consumables.ts runePays: its fight
 *  work at least 5% cheaper a win, or over the floor; inside Alex's 50,000 gold; the gold after it covering the floor, the
 *  fares and a due expansion) — the merchant interrupt, as the Lost World Maps were bought: walk to the Rune Vendor, buy one
 *  with the bank's gold (a `spend` record from the echo), wear it (a worn healing rune stays on: jobgear.ts PINNED_RUNE).
 *  One at a time; a character with a step that is no fight is asked too (the rune is for its fight work on the road). */
function runeCheck(): void {
  const names = owned();
  if (!names.length || !bankDetails.value) return;
  if (names.some((n) => queues.value[n]?.items.some((it) => it.id.startsWith("pl:int:merchant:rune")))) return;
  const world = worldOf(Date.now());
  const offer = runeOffer();
  if (!offer) return;
  for (const name of names) {
    const v = runePays(world, name);
    if (!v.pays) continue;
    const tile = staticTiles("npc", offer.npc)[0];
    plog(name, `buys a healing rune for ${fmtG(offer.price)} gold — ${v.why}`);
    journal("rune", { who: name, price: offer.price, why: v.why, held: runesHeld(world) });
    interrupt(name, "merchant", [
      { kind: "buy", code: RUNE, quantity: 1, npc: offer.npc, ...(tile ? { x: tile.x, y: tile.y, layer: tile.layer } : {}) },
      { kind: "gear", desired: { rune: RUNE } },
    ], `rune${runesHeld(world)}`);
    return;
  }
}

// ── the bank (task 015) ──────────────────────────────────────────────────────

const noSlotAt = new Map<string, number>(); // the last time the bank had no slot for a code this character carried
const said = new Map<string, number>(); // a bank line's key → when it was written (each at most once in its period)
const fmtG = (n: number): string => Math.round(n).toLocaleString("en-US");
/** One `plan: bank` line, at most once per `every` ms for the same `key`; the activity log too when `activityToo`. Task 016:
 *  its `bank` record, with the numbers apart. */
function bankLine(key: string, every: number, text: string, rec: Record<string, unknown>, activityToo = false): void {
  const now = Date.now();
  if (now - (said.get(key) ?? -Infinity) < every) return;
  said.set(key, now);
  devlog(`plan: bank — ${text}`);
  journal("bank", rec);
  if (activityToo) pushLog({ ts: now, character: "bank", action: "bank", text, kind: "info" });
}
/** The bank's numbers every `bank` record carries. */
const bankNums = (world: World): Record<string, unknown> => ({ used: usedSlots(world), slots: world.bankSlots, free: freeSlots(world), next: world.nextExpansion, gold: world.bankGold });

/** Settled point 1: the executor met a bank with no slot for these codes (any character); the planner answers at once. */
setNoSlotHook((name, codes) => {
  noSlotAt.set(name, Date.now());
  const d = bankDetails.value;
  const used = new Set(bankItems.value.map((b) => b.code)).size;
  bankLine(`refused:${name}:${[...codes].sort().join(",")}`, 3_600_000, `${name} could not bank ${codes.map((c) => itemName(c)).join(", ")}: no slot (${used} codes of ${d?.slots ?? "?"} slots) — kept in the bag`,
    { what: "refused", who: name, codes, used, slots: d?.slots });
  if (active) queueMicrotask(bankCheck);
});

/**
 * Settled points 4 and 5: the bank's state in one place. Below EXPAND_BELOW free with nothing left to tidy: one
 * expansion — the `bank` interrupt on the owned character with the shortest walk to a bank — when the price is at most
 * config.expansionCap and the bank keeps GOLD_FLOOR; otherwise one line a day says why (and the activity log). With no
 * slot, nothing to tidy and no purchase: once an hour, what is stuck. The tidy itself is a step (bank.ts tidyStep).
 */
let bankBooted = false;
function bankCheck(): void {
  const names = owned();
  if (!names.length || !bankDetails.value) return;
  const world = worldOf(Date.now());
  const free = freeSlots(world)!, slots = world.bankSlots!;
  if (!bankBooted) {
    bankBooted = true;
    const out = free < TIDY_BELOW ? tidyVerdicts(world).filter((v) => v.outdated) : [];
    devlog(`plan: bank — ${usedSlots(world)} of ${slots} slots used (${free} free), the next expansion ${fmtG(world.nextExpansion ?? 0)} gold, bank gold ${fmtG(world.bankGold)}; tidy below ${TIDY_BELOW} free, buy below ${EXPAND_BELOW} (cap ${fmtG(world.config.expansionCap)})${free < TIDY_BELOW ? `; outdated: ${out.length ? out.map((v) => `${itemName(v.code)} ×${v.bank}`).join(", ") : "none"}` : ""}`);
    journal("bank", { what: "boot", ...bankNums(world), cap: world.config.expansionCap, outdated: free < TIDY_BELOW ? Object.fromEntries(out.map((v) => [v.code, v.bank])) : undefined });
  }
  if (free >= EXPAND_BELOW) return;
  if (names.some((n) => queues.value[n]?.items.some((it) => it.kind === "expand"))) return;
  // the tidy steps first: no expansion while somebody has one (task 016, settled point 12: what tidyStep asks, for the
  // characters that are on — the verdicts without a name could hold a code nobody's tidy step takes, and buy nothing ever)
  if (tidyLeft(world)) return;
  const e = expansionOk(world);
  if (e.ok) {
    const who = [...names].sort((a, b) => bankSec(placeOf(characters.value[a]!)) - bankSec(placeOf(characters.value[b]!)) || (a < b ? -1 : 1))[0];
    devlog(`plan: bank — ${free} of ${slots} slots free and nothing left to tidy: ${who} buys an expansion for ${fmtG(e.price)} gold (bank gold ${fmtG(world.bankGold)})`);
    journal("bank", { what: "buy", who, price: e.price, ...bankNums(world) });
    interrupt(who, "bank", [{ kind: "expand", price: e.price }], `expand${bankDetails.value.expansions}`);
    return;
  }
  const day = new Date().toISOString().slice(0, 10);
  bankLine(`no-buy:${day}`, 24 * 3_600_000, `${free} of ${slots} slots free and nothing left to tidy; the next expansion costs ${fmtG(e.price)} gold: not bought (${e.why})`,
    { what: "no-buy", price: e.price, why: e.why, ...bankNums(world) }, true);
  if (free <= 0) {
    const bags = names.flatMap((n) => noSlotFor((characters.value[n]?.inventory ?? []).filter((s) => s.code && s.quantity > 0).map((s) => s.code)).map((c) => `${n}: ${itemName(c)}`));
    bankLine("stuck", 3_600_000, `no slot free, nothing to tidy, no expansion (${e.why}): a step that would bring a code the bank does not hold waits; nobody is paused${bags.length ? `; kept in bags: ${bags.join(", ")}` : ""}`,
      { what: "stuck", why: e.why, bags, ...bankNums(world) });
  }
}

let minuteTimer: ReturnType<typeof setInterval> | undefined;
function activate(): void {
  if (active) return;
  active = true;
  setTimeout(heartbeat, TICK_MS);
  minuteTimer ??= setInterval(minute, 60_000); // task 016: the status every minute, the day's snapshot (it does nothing with nobody on)
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
    const total = after.filter(isDone).reduce((s, a) => s + a.points, 0);
    for (const a of done) journal("ach", { code: a.code, pts: a.points, total, at: a.completed_at ?? undefined });
    await reads.loadPendingRewards();
    claimRewards();
  }
  return true;
}

let forcedAt = -Infinity;
/** Task 019: the Roadmap's ↻ of the achievements — one forced read, at most once a minute; a completion is claimed as
 *  after any read. */
export async function refreshAchievements(): Promise<void> {
  if (!IS_SERVER) return rpc("refreshAchievements", []);
  if (Date.now() - forcedAt < 60_000) return;
  forcedAt = Date.now();
  await readAchievements(true);
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

/** Design C.3, highest first. `group` is reserved (stage 4). A step is never inserted ahead of anything. Task 015: `bank`
 *  (an expansion) after the two that a spawn's clock sets, before the offerings: a full bank stops every deposit. */
const CLASSES = ["group", "event", "merchant", "bank", "offering", "claim"] as const;
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
  intOf(name).set(prefix.slice(0, -1), { cls, what, at: Date.now() });
  journal("int", { who: name, cls, what, items: out.map(queueItemText) });
  if (!queues.value[name]?.running) runQueue(name);
  return true;
}

// ── offerings (task 010, section 4) ──────────────────────────────────────────
// The planner owns the trigger for its characters, per character and offerings day (the date of the most recent 00:05
// UTC): the boot, a switch-on and the five-minute tick all go through catchUpOfferings (task 018: the old daily
// trigger, queue.ts scheduleOfferings, is gone), so a service down at 00:05, a stopped queue or a character switched
// on at noon loses nothing. An item with nothing left to do ends at once (runOffering). A removed offering interrupt
// comes back an hour later, at most three times a day.

const AGAIN_MS = 3_600_000;
const AGAIN_MAX = 3;
const offerDay = (now: number): string => new Date(now - 5 * 60_000).toISOString().slice(0, 10);
const putOffered = (name: string, o: { day: string; n: number; again?: number }): void => put({ offered: { ...planner.value.offered, [name]: o } });

/** One offering interrupt for this character and today's offerings day, recorded: the catch-up and the panel's
 *  buttons (queue.ts queueOfferings). False when one is already queued or the character is not owned. */
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

/** Switched on: every queued item that is not the planner's goes (one dev-log line each), the queue stopped until
 *  the first step starts it. The in-flight action is not waited for: its result is id-guarded (runLoop ignores a
 *  finished step whose item is gone). */
function takeOver(name: string): string[] {
  const q = queues.value[name];
  if (q?.running) haltQueue(name);
  const dropped: string[] = [];
  for (const it of q?.items ?? []) if (!it.id.startsWith("pl:int:")) {
    plog(name, `took over — dropped [${it.id}] ${queueItemText(it)}`);
    dropped.push(`[${it.id}] ${queueItemText(it)}`);
  }
  resetQueue(name, (it) => it.id.startsWith("pl:int:"));
  return dropped;
}

/** Switched off: the planner's items go, the queue stays empty and stopped. */
function handBack(name: string): void {
  if (queues.value[name]?.running) haltQueue(name);
  resetQueue(name, (it) => !it.id.startsWith("pl:"));
  const st = planner.value;
  const r = st.current[name];
  if (r && !r.over) endRecord(name, r, "dropped", "handed back");
  ints.delete(name);
  put({ current: { ...st.current, [name]: undefined } });
  lastSeen.delete(name);
  starts.delete(name);
  plog(name, "handed back — the queue is empty and stopped; blocks and costs are kept");
}

function switchOn(name: string): void {
  activate();
  journal("config", { who: name, on: true, dropped: takeOver(name) });
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
  journal("config", { patch });
  const on = configOf(planner.value.config).on;
  for (const name of Object.keys(characters.value)) {
    if (!!on[name] === !!was[name]) continue;
    if (on[name]) switchOn(name);
    else {
      handBack(name);
      journal("config", { who: name, on: false });
    }
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
  if (ready) bankCheck(); // task 015: the bank's line at boot, and its answer
  if (ok) minute(); // task 016: the status, and the day's snapshot if the day has none
  scheduleTick();
}

/**
 * Called from boot()/login() after resumeQueue(). Per owned character: anything queued that
 * is not the planner's → taken over; the step's items still queued → re-attached (nothing written, the queue
 * started if it stands); otherwise the next decision follows the first achievements read.
 */
export function resumePlanner(r: Reads): void {
  reads = r;
  const names = owned();
  const info = runInfo();
  // task 016: the boot record, then what ended at this boot (its own records come after it)
  const chars: Record<string, Record<string, unknown>> = {};
  const after: (() => void)[] = [];
  if (names.length) activate();
  for (const name of names) {
    const q = queues.value[name];
    const r = planner.value.current[name];
    const c: Record<string, unknown> = (chars[name] = {});
    if (q?.items.some((it) => !it.id.startsWith("pl:"))) c.took = takeOver(name);
    // the interrupts still queued go on: their int-end is partial (what ran before the restart was not metered here)
    for (const it of queues.value[name]?.items ?? []) {
      const m = /^pl:int:([a-z]+):(.+):\d+$/.exec(it.id), bucket = bucketOf(it.id);
      if (m && !intOf(name).has(bucket)) {
        intOf(name).set(bucket, { cls: m[1], what: m[2], at: Date.now() });
        reattached.add(bucket);
        ((c.ints ??= []) as string[]).push(bucket);
      }
    }
    if (r && !r.over && stepItems(name, r.step.key).length) {
      plog(name, `re-attached ${r.step.key}`);
      c.step = r.step.key;
      reattached.add(`pl:${r.step.key}`);
      if (!queues.value[name]?.running) runQueue(name);
      continue;
    }
    for (const it of queues.value[name]?.items ?? []) if (isStepId(it.id)) dropItem(name, it.id); // a step nobody knows
    if (r && !r.over) {
      setRunning(name, { ...r, over: true }); // it ended while the service was down: no sample
      after.push(() => endRecord(name, r, c.took ? "dropped" : "gone", c.took ? "taken over at boot" : "its items were gone at boot"));
    }
    if (queues.value[name]?.items.length && !queues.value[name].running) runQueue(name); // interrupts run meanwhile
  }
  journal("boot", { dev: info.dev, commit: info.commit, branch: info.branch, chars });
  for (const f of after) f();
  if (!names.length) return;
  catchUpOfferings();
  setTimeout(() => {
    ready = true;
    scheduleTick();
  }, 5 * 60_000);
  void bootRead(true);
}

// A hot swap would double-register the module-level effects — reload instead (same as queue.ts).
if (import.meta.hot) import.meta.hot.accept(() => location.reload());

expose({ setPlannerConfig, refreshAchievements });
