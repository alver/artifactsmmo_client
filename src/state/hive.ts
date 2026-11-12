// The Hive coordinator — the account-level strategist above the per-character
// queues. It is a DOCUMENT + OBSERVER, never a runner: its only mutations are
// writing queue items (addItem/startQueue/stopQueue) and updating its own
// persisted state. The queue stays the only execution engine (CLAUDE.md).
//
// Lifecycle: the UI shows proposeGoals() proposals → the user Launches one →
// the hive takes over the participants' queues and dispatches the compiled
// plan's wave 0 → an effect on the `queues` signal watches those items drain →
// at the barrier it re-calls compileGoal with fresh state and dispatches the
// NEW wave 0 (recompile-at-barrier) — until goalSatisfied, an empty compile,
// or the stall guard. One API read is permitted per barrier: refreshing
// achievements for achievement goals.
//
// Dispatch is idempotent via deterministic item ids
// (hive:<startedAt>:<waveSeq>:<char>:<i>, filler items use f<i>): a reload
// re-attaches to in-flight items instead of re-pushing, and a user deleting a
// hive item just counts as done — the hive appends and watches, user edits
// always win.
//
// Mid-wave idle is filled at RUNTIME, not compile time: a participant whose
// part is done (or who was never assigned) gets an infinite task-loop as a
// `filler` assignment — excluded from waveDone, pulled only when the run
// continues to a next wave — so nobody stands around waiting AND filler never
// delays the goal. A FINISHING goal (done/incomplete) never parks the fleet:
// running fillers carry on, and every idle participant is handed an infinite
// items task-loop as a plain user-owned queue item. Stop (⏹) still means stop.

import { batch, effect, signal } from "@preact/signals";
import { IS_SERVER, expose, rpc } from "../lib/remote";
import { addItem, dropItem, insertItem, patchItem, queues, removeItem, setRepeat, startQueue, stopQueue, clearQueue, type QueueState } from "./queue";
import { achievements, bankDetails, bankItems, characterList, characters, craftPins, pushLog } from "./store";
import { invQty } from "./exec";
import { bankQty } from "./loopkit";
import { compileGoal, fillerItems, goalSatisfied, needsAchievements, proposeGoals } from "../plan/hive";
import type { AccountGoal, HiveCtx, HivePlan, HiveWave, ScoredGoal } from "../plan/hive";
import { SPLIT_ACTIONS } from "../plan/hive/acquire";
import { SCORE } from "../plan/hive/score";
import { fleetBis, skillLevel } from "../plan/hive/ctx";
import { actionsPerTask } from "../plan/hive/tasks";
import { item, resource } from "../catalog";
import { queueItemText, withId } from "../plan/queue";
import type { QueueItem, QueueItemInput } from "../plan/queue";
import type { Character } from "../types/api";

export interface HiveAssignmentState {
  character: string;
  label: string;
  items: QueueItemInput[];
  dispatched: boolean;
  /** Opt-out, user skip, missing character, or empty items. */
  skipped?: boolean;
  /** Deterministic ids of the pushed queue items. */
  itemIds?: string[];
  /** Runtime idle filler (an infinite task-loop): appended mid-wave when the
   *  character's own part is done, never holds the barrier, pulled from the
   *  queue only when the run continues to a next wave (a finishing goal
   *  leaves it running). Its item ids live in the `f` namespace so they
   *  can't collide with the character's completed main assignment. */
  filler?: boolean;
  /** Item-id namespace of an extra assignment in the same wave (a stolen
   *  slice: `s<k>`) — keeps its ids apart from the finished main one. */
  ns?: string;
  /** Dispatch time (ms) — the lane's measured pace is progress since then. */
  at?: number;
  /** Dispatch AHEAD of the queue's head: a slice taken by a starved `wait`
   *  crafter runs before its craft resumes. */
  front?: boolean;
}

export interface HiveWaveState {
  label: string;
  assignments: HiveAssignmentState[];
}

export interface HiveRun {
  goal: AccountGoal;
  label: string;
  startedAt: number;
  /** Monotonic dispatch counter — the id namespace of the current wave. */
  waveSeq: number;
  wave: HiveWaveState | null;
  /** Canonical fingerprint of the current wave (the stall guard's memory). */
  waveKey: string;
  /** Plan.progress at last dispatch — an identical recompiled wave is only a
   *  stall when this hasn't moved either (see HivePlan.progress). */
  progress?: number;
  /** Labels of the last compile's later waves — an honest preview, nothing more. */
  preview: string[];
  /** Bounded single-shot plan: the wave completing IS the goal completing. */
  once?: boolean;
  /** "stopped" persists IMMEDIATELY on Stop — a reload can never resurrect it. */
  status: "running" | "verifying" | "stopped";
}

export interface HiveHistoryEntry {
  label: string;
  startedAt: number;
  endedAt: number;
  outcome: "done" | "incomplete" | "abandoned";
}

export interface HiveState {
  run: HiveRun | null;
  /** Per-character manual opt-out (these queues are never touched). */
  manual: string[];
  history: HiveHistoryEntry[];
  /** Continuous mode: when a goal runs out, launch the next backlog goal,
   *  else the best launchable proposal — the fleet never waits for a click. */
  auto: boolean;
  /** User-queued goals, launched in order as each goal ends (JSON — see types.ts). */
  backlog: { goal: AccountGoal; label: string }[];
}

// ── persistence (the runner pattern: hydrate BEFORE the persisting effect) ──

const STORE_KEY = "ammo:v1:hive";
const SCHEMA = 1;

function loadStored(): HiveState {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null") as (HiveState & { schema?: number }) | null;
    if (!s || s.schema !== SCHEMA) return { run: null, manual: [], history: [], auto: false, backlog: [] };
    return { run: s.run ?? null, manual: s.manual ?? [], history: s.history ?? [], auto: !!s.auto, backlog: s.backlog ?? [] };
  } catch {
    return { run: null, manual: [], history: [], auto: false, backlog: [] };
  }
}

// The tab never hydrates or persists: its copy is a mirror fed by state/synced.ts.
export const hive = signal<HiveState>(IS_SERVER ? loadStored() : { run: null, manual: [], history: [], auto: false, backlog: [] });

/** Fresh proposals for the panel — recomputed on demand, never persisted. */
export const hiveProposals = signal<ScoredGoal[] | null>(null);

if (IS_SERVER) effect(() => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ schema: SCHEMA, ...hive.value }));
  } catch {
    /* quota / unavailable — non-fatal */
  }
});

const log = (text: string, kind: "ok" | "bad" | "info" = "info"): void =>
  pushLog({ ts: Date.now(), character: "hive", action: "hive", text, kind });

// ── ctx + ids ────────────────────────────────────────────────────────────────

/** Snapshot the planning domain works on (participants = not opted out). */
export function buildHiveCtx(): HiveCtx {
  const manual = new Set(hive.value.manual);
  return {
    characters: characterList().filter((c) => !manual.has(c.name)),
    bank: bankItems.value,
    bankGold: bankDetails.value?.gold ?? 0,
    achievements: achievements.value,
    craftPins: craftPins(),
  };
}

export function refreshProposals(): void {
  hiveProposals.value = proposeGoals(buildHiveCtx());
}

const hiveItemId = (startedAt: number, waveSeq: number, character: string, i: number, ns: string): string =>
  `hive:${startedAt}:${waveSeq}:${character}:${ns}${i}`;
const nsOf = (a: HiveAssignmentState): string => (a.filler ? "f" : (a.ns ?? ""));
export const isHiveItemId = (id: string): boolean => id.startsWith("hive:");

const waveKeyOf = (w: HiveWave): string =>
  JSON.stringify(
    w.assignments
      .map((a) => [a.character, a.items] as const)
      .sort((x, y) => x[0].localeCompare(y[0])),
  );

const toWaveState = (w: HiveWave): HiveWaveState => ({
  label: w.label,
  assignments: w.assignments.map((a) => ({ character: a.character, label: a.label, items: a.items, dispatched: false })),
});

const isInfinite = (it: QueueItemInput): boolean =>
  it.kind === "fight" || it.kind === "gather" || it.kind === "task-loop"
    ? it.times === 0
    : it.kind === "craft" || it.kind === "sell" || it.kind === "recycle"
      ? it.quantity === 0
      : false;

// ── derived status (never stored — the queues signal is the truth) ──────────

export type LiveAssignmentStatus = "pending" | "running" | "done" | "paused" | "blocked" | "stopped" | "skipped";

export function assignmentStatus(a: HiveAssignmentState, q: QueueState | undefined): LiveAssignmentStatus {
  if (a.skipped) return "skipped";
  if (!a.dispatched) return "pending";
  const ids = new Set(a.itemIds ?? []);
  const mine = (q?.items ?? []).filter((it) => ids.has(it.id));
  if (mine.length === 0) return "done"; // completed OR user-deleted — both count
  if (q?.running) return "running";
  const head = q?.items[0];
  if (head?.error) return ids.has(head.id) ? "paused" : "blocked";
  return "stopped";
}

const waveDone = (w: HiveWaveState): boolean =>
  w.assignments.every((a) => {
    if (a.filler) return true; // filler never holds the barrier
    const s = assignmentStatus(a, queues.value[a.character]);
    return s === "done" || s === "skipped";
  });

// ── the observer: effect → microtask → tick ─────────────────────────────────

let tickQueued = false;
function scheduleTick(): void {
  if (tickQueued) return;
  tickQueued = true;
  queueMicrotask(() => {
    tickQueued = false;
    tick();
  });
}

// Subscribes to `queues` (every action echo touches it) and `hive`; bails
// unless a run is live. tick() runs in a microtask, OUTSIDE the effect, so
// nothing it reads is tracked and its writes re-fire this effect exactly once
// each — every write is guarded by a change, so the loop reaches a fixed point.
// Server only — in the tab this observer would dispatch a second copy of every wave.
if (IS_SERVER) effect(() => {
  queues.value;
  const st = hive.value;
  if (st.run?.status === "running") scheduleTick();
});

function tick(): void {
  const run = hive.value.run;
  if (!run || run.status !== "running") return;
  if (!run.wave) return beginBarrier();
  if (run.wave.assignments.some((a) => !a.dispatched && !a.skipped)) return dispatchWave();
  if (!waveDone(run.wave)) return rebalanceWave(run); // paused/blocked/stopped assignments hold the wave
  beginBarrier();
}

// ── mid-wave rebalancing: steal work, else fill idle ────────────────────────

/** Seconds: below this a slice isn't worth the thief's gear swap + walk. */
const MIN_STEAL = SPLIT_ACTIONS * SCORE.SEC_PER_ACTION;
/** Seconds: a filler's gear reset (~8 actions) only pays off when the wave's
 *  longest remaining lane is at least this long. */
const FILLER_MIN_WAIT = 600;

/** Seconds per fight/gather this lane has really taken since dispatch: eating,
 *  resting, food runs and bank trips all hide inside one "fight" (a wolf lane
 *  ran ~130 s/fight, not SEC_PER_ACTION's 30). Too little progress ⇒ nominal. */
function lanePace(a: HiveAssignmentState, q: QueueState | undefined): number {
  const live = new Map((q?.items ?? []).map((it) => [it.id, it]));
  let done = 0;
  a.items.forEach((input, i) => {
    if (input.kind !== "fight" && input.kind !== "gather") return;
    const it = live.get(a.itemIds?.[i] ?? "");
    done += it?.kind === "fight" || it?.kind === "gather" ? it.done : input.times; // gone = finished
  });
  return a.at && done >= 5 ? (Date.now() - a.at) / 1000 / done : SCORE.SEC_PER_ACTION;
}

/** Seconds a dispatched assignment still owes (its live hive items). */
function remainingSeconds(a: HiveAssignmentState, q: QueueState | undefined): number {
  const ids = new Set(a.itemIds ?? []);
  const ch = characterList().find((c) => c.name === a.character);
  const pace = lanePace(a, q);
  let n = 0;
  for (const it of q?.items ?? []) {
    if (!ids.has(it.id)) continue;
    if (it.kind === "fight" || it.kind === "gather") n += Math.max(0, it.times - it.done) * pace;
    else if (it.kind === "craft" || it.kind === "sell" || it.kind === "recycle") n += Math.max(0, it.quantity - it.done) * SCORE.SEC_PER_ACTION;
    else if (it.kind === "task-loop") n += Math.max(0, it.times - it.done) * (ch ? actionsPerTask(ch, it.master) : 100) * SCORE.SEC_PER_ACTION;
    else n += SCORE.SEC_PER_ACTION;
  }
  return n;
}

/** The wave's longest remaining lane in seconds; Infinity when a lane is
 *  paused/blocked/stopped (no end in sight until the user acts). */
function longestWait(wave: HiveWaveState): number {
  let max = 0;
  for (const a of wave.assignments) {
    if (a.filler || a.skipped || !a.dispatched) continue;
    const q = queues.value[a.character];
    const s = assignmentStatus(a, q);
    if (s === "done") continue;
    if (s !== "running") return Infinity;
    max = Math.max(max, remainingSeconds(a, q));
  }
  return max;
}

/** A pipelined (`wait`) craft at the head of a lane that neither bag nor bank
 *  can feed one run of — holding, not working. */
function starvedWaiter(a: HiveAssignmentState): Extract<QueueItem, { kind: "craft" }> | undefined {
  const q = queues.value[a.character];
  const head = q?.items[0];
  if (!q?.running || !head || head.kind !== "craft" || !head.wait || !(a.itemIds ?? []).includes(head.id)) return undefined;
  const ch = characters.value[a.character];
  const recipe = item(head.code)?.craft;
  if (!ch || !recipe) return undefined;
  return recipe.items.some((g) => invQty(ch, g.code) + bankQty(g.code) < g.quantity) ? head : undefined;
}

/**
 * Drop pipelined crafters nobody can feed anymore: when every unfinished lane
 * of the wave is a starved `wait` craft (no producer running, no paused lane
 * the user still has to act on), pull those items — each lane's deposit-all
 * banks the produce — so the barrier recompile tops the shortfall up instead
 * of the wave hanging forever. True ⇒ queues changed (re-tick).
 * Exported for the verify probe (synthetic queues, no actions).
 */
export function releaseStarved(wave: HiveWaveState): boolean {
  const live = wave.assignments.filter(
    (a) => !a.filler && !a.skipped && a.dispatched && assignmentStatus(a, queues.value[a.character]) !== "done",
  );
  const starved = live.flatMap((a) => {
    const head = starvedWaiter(a);
    return head ? [{ a, head }] : [];
  });
  if (starved.length === 0 || starved.length < live.length) return false;
  for (const { a, head } of starved) {
    dropItem(a.character, head.id);
    // The batch's recycle was sized for the whole craft — a count it can't
    // reach pauses the lane and holds the barrier; trim it to what was made.
    const rec = queues.value[a.character]?.items.find((it) => it.kind === "recycle" && it.code === head.code && a.itemIds?.includes(it.id));
    if (rec && head.done > 0) patchItem(a.character, rec.id, { quantity: head.done });
    else if (rec) dropItem(a.character, rec.id);
    log(`${a.character}: nothing left to feed ${queueItemText(head)} — ${head.done} made, the rest replans at the barrier`);
  }
  return true;
}

export interface Steal {
  victim: string;
  items: QueueItemInput[];
  patches: { id: string; patch: Partial<QueueItem> }[];
  size: number;
}

/**
 * Carve half of the biggest running gather/fight lane this thief can work:
 * the victim's head item shrinks (a `times` patch on OUR item — the runner
 * completes it at its next step) and the thief gets the slice as a fresh
 * assignment. A smelt chained right behind the gather moves with its ore in
 * whole runs, so neither side ends up at the bank short of materials.
 * Exported for the verify probe (synthetic queues, no actions).
 */
export function planSteal(wave: HiveWaveState, ctx: HiveCtx, thief: Character): Steal | undefined {
  let best: Steal | undefined;
  for (const a of wave.assignments) {
    if (a.filler || a.skipped || !a.dispatched || a.character === thief.name) continue;
    const q = queues.value[a.character];
    const ids = new Set(a.itemIds ?? []);
    const head = q?.items[0];
    // Only a RUNNING head is carved: a paused lane is the user's to retry or skip.
    if (!q?.running || !head || !ids.has(head.id)) continue;
    if ((head.kind !== "gather" && head.kind !== "fight") || head.times <= 0) continue;
    let unit = 1;
    let craft: Extract<QueueItem, { kind: "craft" }> | undefined;
    if (head.kind === "gather") {
      const res = resource(head.resource);
      if (!res || skillLevel(thief, res.skill) < res.level) continue;
      const consumer = q.items.find(
        (x) => ids.has(x.id) && x.kind === "craft" && !!item(x.code)?.craft?.items.some((g) => g.code === head.code),
      );
      if (consumer && consumer.kind === "craft") {
        // Carvable only as the immediate next item, on a sure drop, and when its
        // product feeds no deeper craft of ours (plank → shield): otherwise the
        // victim would reach the workshop short of what the thief banks later.
        const deeper = q.items.some((x) => ids.has(x.id) && x.kind === "craft" && !!item(x.code)?.craft?.items.some((g) => g.code === consumer.code));
        if (consumer !== q.items[1] || deeper || res.drops.find((d) => d.code === head.code)?.rate !== 1) continue;
        unit = item(consumer.code)!.craft!.items.find((g) => g.code === head.code)!.quantity;
        craft = consumer;
      }
    } else if (!fleetBis(ctx, thief, head.monster)?.forecast.win) continue;
    const share = Math.floor((head.times - head.done) / unit / 2) * unit;
    const size = share * lanePace(a, q); // seconds of the victim's real pace
    if (share < 1 || size < MIN_STEAL || (best && size <= best.size)) continue;
    const items: QueueItemInput[] =
      head.kind === "gather"
        ? [{ kind: "gather", code: head.code, resource: head.resource, times: share, done: 0, gear: true }]
        : [{ kind: "fight", monster: head.monster, times: share, done: 0, gear: true }];
    const patches: Steal["patches"] = [{ id: head.id, patch: { times: head.times - share } }];
    if (craft) {
      const moved = (share / unit) * Math.max(1, item(craft.code)?.craft?.quantity ?? 1);
      if (craft.quantity - moved <= 0) continue; // 0 would mean ∞ — leave this lane alone
      items.push({ kind: "craft", code: craft.code, quantity: moved, done: 0 });
      patches.push({ id: craft.id, patch: { quantity: craft.quantity - moved } });
    }
    items.push({ kind: "deposit-all" });
    best = { victim: a.character, items, patches, size };
  }
  return best;
}

/**
 * Mid-wave rebalancing for a participant whose own part is finished (or who
 * was never assigned): first HELP — take over half of the biggest lane they
 * can work, as a fresh barrier-holding assignment — and only when nothing is
 * carvable run an INFINITE task-loop `filler` at their best-suited master
 * (excluded from waveDone, pulled by beginBarrier), and that only when the
 * wave's longest lane outlasts the filler's own gear reset: a 3-minute tail
 * is cheaper stood by than re-geared for. One filler per character per wave,
 * and only an empty, stopped queue qualifies: user-queued work and paused
 * assignments are never built over (user edits win, as always). A starved
 * `wait` crafter may steal too — its slice goes ahead of the craft — but never
 * gets a filler. Exported for scripts/check-steal.mts.
 */
export function rebalanceWave(run: HiveRun): void {
  const wave = run.wave;
  if (!wave) return;
  if (releaseStarved(wave)) return; // the queue write re-ticks
  const ctx = buildHiveCtx(); // participants only — opt-outs never get work
  const added: HiveAssignmentState[] = [];
  let wait: number | undefined;
  for (const ch of ctx.characters) {
    const mine = wave.assignments.filter((a) => a.character === ch.name);
    const live = mine.filter((a) => {
      const s = assignmentStatus(a, queues.value[ch.name]);
      return s !== "done" && s !== "skipped";
    });
    // A crafter holding on a starved `wait` craft is idle too: it can work a
    // producer's slice AHEAD of its craft (the slice's deposit feeds the craft).
    const waiting = live.length > 0 && live.every((a) => starvedWaiter(a));
    if (live.length > 0 && !waiting) continue;
    const q = queues.value[ch.name];
    if (!waiting && (q?.running || (q?.items.length ?? 0) > 0)) continue; // the queue belongs to the user now
    const steal = planSteal(wave, ctx, ch);
    if (steal) {
      for (const p of steal.patches) patchItem(steal.victim, p.id, p.patch); // the victim's lane shrinks NOW
      const text = steal.items
        .filter((it) => it.kind !== "deposit-all")
        .map((it) => queueItemText({ ...it, id: "" } as QueueItem))
        .join(" · ");
      added.push({ character: ch.name, label: `${text} — taken over from ${steal.victim}`, items: steal.items, dispatched: false, ns: `s${mine.length}`, front: waiting || undefined });
      log(`${ch.name} takes over from ${steal.victim}${waiting ? " while waiting for materials" : ""}: ${text}`);
      continue;
    }
    if (waiting) continue; // an infinite filler ahead of the craft would never let it run
    if (mine.some((a) => a.filler)) continue; // one per wave — a pulled or skipped one is not re-issued
    if (wait === undefined) wait = longestWait(wave);
    if (wait < FILLER_MIN_WAIT) continue; // the wave ends soon — standing by beats a gear reset
    const items = fillerItems(ctx, ch);
    added.push({
      character: ch.name,
      label: items ? "filler: run tasks until the wave ends" : "idle — no suitable tasks master",
      items: items ?? [],
      dispatched: false,
      skipped: items ? undefined : true,
      filler: true,
    });
  }
  if (added.length === 0) return;
  hive.value = {
    ...hive.value,
    run: { ...run, wave: { ...wave, assignments: [...wave.assignments, ...added] } },
  };
  // the write re-fires the observer → dispatchWave picks the fillers up
}

/** The only place queue items are written. Idempotent: deterministic ids + a
 *  presence check make double ticks and reload-mid-dispatch harmless. */
function dispatchWave(): void {
  const st = hive.value;
  const run = st.run;
  if (!run?.wave) return;
  const manual = new Set(st.manual);
  const known = new Set(characterList().map((c) => c.name));
  batch(() => {
    let main = false;
    const fillers: string[] = [];
    const assignments = run.wave!.assignments.map((a) => {
      if (a.dispatched || a.skipped) return a;
      if (!known.has(a.character) || manual.has(a.character) || a.items.length === 0) {
        if (!known.has(a.character)) log(`${a.character} is gone — assignment skipped`);
        return { ...a, skipped: true };
      }
      const ids = a.items.map((_, i) => hiveItemId(run.startedAt, run.waveSeq, a.character, i, nsOf(a)));
      const present = new Set((queues.value[a.character]?.items ?? []).map((it) => it.id));
      a.items.forEach((input, i) => {
        if (present.has(ids[i])) return;
        if (a.front) insertItem(a.character, { ...input, id: ids[i] } as QueueItem, i);
        else addItem(a.character, { ...input, id: ids[i] } as QueueItem);
      });
      setRepeat(a.character, false); // a rotating queue would never finish our ids
      startQueue(a.character);
      if (a.filler) fillers.push(a.character);
      else main = true;
      return { ...a, dispatched: true, itemIds: ids, at: Date.now() };
    });
    hive.value = {
      ...hive.value,
      run: { ...hive.value.run!, wave: { ...run.wave!, assignments } },
    };
    if (main) log(`wave ${run.waveSeq + 1} dispatched — ${run.label}`);
    for (const name of fillers) log(`${name} is idle — running tasks until the wave ends`);
    // (a stolen slice logs itself in rebalanceWave — `main` just re-logs the wave)
  });
}

// ── the barrier: verify → finish or recompile ────────────────────────────────

function beginBarrier(): void {
  const st = hive.value;
  const run = st.run;
  if (!run || run.status !== "running") return; // double-fire guard
  hive.value = { ...st, run: { ...run, status: "verifying" } };
  void continueRun();
}

/** Pull the finished wave's infinite fillers so the NEXT wave dispatches onto
 *  clean queues (new items would starve behind an infinite task-loop). Called
 *  only when the run continues — a finishing goal leaves fillers running. The
 *  in-flight action drains harmlessly; the next dispatch's startQueue reuses
 *  the draining loop (the cancel-stop path). */
function pullFillers(run: HiveRun): void {
  for (const a of run.wave?.assignments ?? []) {
    if (!a.filler || !a.dispatched || a.skipped) continue;
    const q = queues.value[a.character];
    const ids = new Set(a.itemIds ?? []);
    if (!(q?.items ?? []).some((it) => ids.has(it.id))) continue; // already gone
    if (q?.running) stopQueue(a.character);
    for (const id of a.itemIds ?? []) removeItem(a.character, id);
  }
}

async function continueRun(): Promise<void> {
  const before = hive.value.run;
  if (!before || before.status !== "verifying") return;
  if (needsAchievements(before.goal)) {
    // The ONE permitted read, only at barriers. Dynamic import keeps the
    // static graph acyclic (sync.ts statically imports this module).
    const { loadAchievements } = await import("./sync");
    await loadAchievements().catch(() => undefined);
  }
  const run = hive.value.run;
  if (!run || run.status !== "verifying") return; // stopped while we were away
  if (run.once) return finish("done");
  const ctx = buildHiveCtx();
  const ok = goalSatisfied(run.goal, ctx);
  if (ok === true) return finish("done");
  const plan = compileGoal(run.goal, ctx);
  const next = plan.waves[0];
  if (!next || next.assignments.every((a) => a.items.length === 0)) {
    return finish(ok === false ? "incomplete" : "done");
  }
  const key = waveKeyOf(next);
  if (key === run.waveKey && plan.progress === run.progress) {
    log(`stalled — the next wave equals the one just finished (${run.label})`, "bad");
    return finish("incomplete");
  }
  batch(() => {
    pullFillers(run);
    hive.value = {
      ...hive.value,
      run: {
        ...run,
        status: "running",
        waveSeq: run.waveSeq + 1,
        wave: toWaveState(next),
        waveKey: key,
        progress: plan.progress,
        preview: plan.waves.slice(1).map((w) => w.label),
        once: plan.once,
      },
    };
  });
  // the hive write re-fires the observer → the new wave dispatches
}

/**
 * A finished goal never parks the fleet: participants whose queue is still
 * running (their wave's filler task-loop, or anything the user started) carry
 * on untouched; everyone whose queue holds nothing but stale hive leftovers
 * gets an infinite items-master task-loop. Pushed as PLAIN items (fresh ids,
 * not hive:*) — the run is over, so the queue belongs to the user again.
 */
function handOffToTasks(): void {
  const manual = new Set(hive.value.manual);
  batch(() => {
    for (const c of characterList()) {
      if (manual.has(c.name)) continue;
      const q = queues.value[c.name];
      if (q?.running) continue; // already mid-task — let them carry on
      const leftovers = (q?.items ?? []).filter((it) => isHiveItemId(it.id));
      if ((q?.items.length ?? 0) > leftovers.length) continue; // user items — user's queue
      for (const it of leftovers) removeItem(c.name, it.id);
      addItem(c.name, withId({ kind: "task-loop", master: "items", times: 0, done: 0, gear: true }));
      startQueue(c.name);
      log(`${c.name} is idle — assigned an items task-loop`);
    }
  });
}

function finish(outcome: HiveHistoryEntry["outcome"]): void {
  const st = hive.value;
  const run = st.run;
  if (!run) return;
  hive.value = {
    ...st,
    run: null,
    history: [...st.history, { label: run.label, startedAt: run.startedAt, endedAt: Date.now(), outcome }].slice(-20),
  };
  log(`goal ${outcome} — ${run.label}`, outcome === "done" ? "ok" : outcome === "incomplete" ? "bad" : "info");
  // Stop (⏹) still means stop — only a goal that RAN OUT moves the fleet on.
  // Deferred: proposeGoals is a cold BIS sweep (~seconds) and must not stall
  // the completion paint.
  if (outcome !== "abandoned") setTimeout(moveOn, 100);
}

/**
 * After a goal ran out: launch the next backlog goal, else (continuous mode)
 * the best launchable proposal, else hand the fleet to task loops. An
 * auto-launch keeps user items on participants' queues (the hive appends
 * behind them) — only the manual Launch, behind its confirm, clears.
 */
function moveOn(): void {
  if (hive.value.run) return; // the user launched something meanwhile
  const next = nextGoal();
  if (next) {
    launchHive(next.picked, next.plan, { keepUserItems: true });
    return;
  }
  handOffToTasks();
  refreshProposals();
}

/** Backlog head first (unlaunchable entries are dropped with a log line);
 *  then, in continuous mode, the top proposal that compiles — minus labels
 *  that recently ended `incomplete`, so a stalling goal can't relaunch itself
 *  in a loop. Exported for the verify probe (pure apart from the backlog pop). */
export function nextGoal(): { picked: { goal: AccountGoal; label: string }; plan: HivePlan } | undefined {
  const ctx = buildHiveCtx();
  while (hive.value.backlog.length > 0) {
    const [picked, ...rest] = hive.value.backlog;
    hive.value = { ...hive.value, backlog: rest };
    const plan = compileGoal(picked.goal, ctx);
    if (plan.waves.length > 0) return { picked, plan };
    log(`backlog: ${picked.label} skipped — ${plan.blockers[0]?.reason ?? plan.summary}`);
  }
  if (!hive.value.auto) return undefined;
  const failed = new Set(hive.value.history.slice(-5).filter((h) => h.outcome === "incomplete").map((h) => h.label));
  const proposals = proposeGoals(ctx);
  hiveProposals.value = proposals;
  for (const g of proposals) {
    if (failed.has(g.label)) continue;
    const plan = compileGoal(g.goal, ctx);
    if (plan.waves.length > 0) return { picked: g, plan };
  }
  log("continuous: nothing launchable right now — the fleet runs task loops");
  return undefined;
}

/** ⟳ Continuous mode. Switched on while idle, the fleet moves on right away. */
export function toggleHiveAuto(): void {
  if (!IS_SERVER) return rpc("toggleHiveAuto", []);
  const on = !hive.value.auto;
  hive.value = { ...hive.value, auto: on };
  log(`continuous mode ${on ? "on — when a goal ends, the next one launches itself" : "off"}`);
  if (on && !hive.value.run) setTimeout(moveOn, 100);
}

/** ＋ Queue a goal for after the current one (launches now when idle). */
export function queueGoal(picked: { goal: AccountGoal; label: string }): void {
  if (!IS_SERVER) return rpc("queueGoal", [picked]);
  hive.value = { ...hive.value, backlog: [...hive.value.backlog, { goal: picked.goal, label: picked.label }] };
  log(`queued — ${picked.label}`);
  if (!hive.value.run) setTimeout(moveOn, 100);
}

export function unqueueGoal(index: number): void {
  if (!IS_SERVER) return rpc("unqueueGoal", [index]);
  hive.value = { ...hive.value, backlog: hive.value.backlog.filter((_, i) => i !== index) };
}

// ── user actions ─────────────────────────────────────────────────────────────

/** Queues Launch would stop + clear — the UI's confirmation list. */
export function takeoverPreview(): { name: string; items: number; running: boolean }[] {
  const manual = new Set(hive.value.manual);
  return characterList()
    .filter((c) => !manual.has(c.name))
    .map((c) => {
      const q = queues.value[c.name];
      return { name: c.name, items: q?.items.length ?? 0, running: !!q?.running };
    })
    .filter((r) => r.items > 0 || r.running);
}

/**
 * Take over the participants' queues and start the plan. The UI compiles at
 * selection time and passes that exact plan — what was previewed is what runs.
 * `keepUserItems` (auto-launch, nobody confirmed a takeover): only hive
 * leftovers are pulled; user items stay and the new wave appends behind them.
 */
export function launchHive(
  picked: { goal: AccountGoal; label: string },
  plan: HivePlan,
  opts: { keepUserItems?: boolean } = {},
): void {
  if (!IS_SERVER) return rpc("launchHive", [picked, plan, opts]);
  const first = plan.waves[0];
  if (!first) throw new Error("plan has no executable wave");
  for (const a of plan.waves.flatMap((w) => w.assignments)) {
    const bad = a.items.find(isInfinite);
    if (bad) throw new Error(`plan contains an infinite ${bad.kind} item — hive waves must be finite`);
  }
  if (hive.value.run) stopHive(); // one goal at a time
  const manual = new Set(hive.value.manual);
  batch(() => {
    for (const c of characterList()) {
      if (manual.has(c.name)) continue;
      const q = queues.value[c.name];
      if (!q) continue;
      if (q.running) stopQueue(c.name); // persists running:false immediately…
      if (opts.keepUserItems) {
        for (const it of q.items) if (isHiveItemId(it.id)) removeItem(c.name, it.id);
      } else if (q.items.length) clearQueue(c.name); // …so the clear is allowed in the same turn
    }
    hive.value = {
      ...hive.value,
      run: {
        goal: picked.goal,
        label: picked.label,
        startedAt: Date.now(),
        waveSeq: 0,
        wave: toWaveState(first),
        waveKey: waveKeyOf(first),
        progress: plan.progress,
        preview: plan.waves.slice(1).map((w) => w.label),
        once: plan.once,
        status: "running",
      },
    };
  });
  log(`goal launched — ${picked.label}`, "ok");
  // wave 0 dispatches on the tick the hive write just scheduled
}

/** ⏹ Make-stop-stick: persist the stop FIRST, then unwind the queues. Stop
 *  means stop — continuous mode goes off with it. */
export function stopHive(): void {
  if (!IS_SERVER) return rpc("stopHive", []);
  const st = hive.value;
  const run = st.run;
  if (!run) return;
  if (run.status !== "stopped") hive.value = { ...st, run: { ...run, status: "stopped" }, auto: false };
  unwindStop();
}

/** Remove our items + finalize. Re-run by resumeHive() after a crash mid-stop. */
function unwindStop(): void {
  const run = hive.value.run;
  if (!run || run.status !== "stopped") return;
  batch(() => {
    for (const a of run.wave?.assignments ?? []) {
      if (a.skipped || !a.dispatched) continue;
      if (queues.value[a.character]?.running) stopQueue(a.character);
      for (const id of a.itemIds ?? []) removeItem(a.character, id);
    }
    finish("abandoned");
  });
}

/** ▶ a paused/blocked/stopped assignment's queue (startQueue clears the head error). */
export function retryAssignment(character: string): void {
  if (!IS_SERVER) return rpc("retryAssignment", [character]);
  startQueue(character);
}

/** Abandon one character's remaining work this wave: pull our items, mark
 *  skipped. A character can hold TWO assignments (main + filler) — every one
 *  that isn't already finished is skipped; done ones keep their ✓. */
export function skipAssignment(character: string): void {
  if (!IS_SERVER) return rpc("skipAssignment", [character]);
  const run = hive.value.run;
  if (!run || !run.wave) return;
  const mine = run.wave.assignments.filter(
    (x) => x.character === character && !x.skipped && assignmentStatus(x, queues.value[character]) !== "done",
  );
  if (mine.length === 0) return;
  batch(() => {
    if (mine.some((a) => a.dispatched)) {
      if (queues.value[character]?.running) stopQueue(character);
      for (const a of mine) for (const id of a.itemIds ?? []) removeItem(character, id);
    }
    const cur = hive.value.run;
    if (!cur?.wave) return;
    hive.value = {
      ...hive.value,
      run: {
        ...cur,
        wave: {
          ...cur.wave,
          assignments: cur.wave.assignments.map((x) => (mine.includes(x) ? { ...x, skipped: true } : x)),
        },
      },
    };
  });
  log(`${character}'s assignment skipped`);
}

/** Toggle a character's manual opt-out. Opting out mid-run abandons its current
 *  assignment; opting back in rejoins from the next dispatched wave. */
export function toggleHiveManual(name: string): void {
  if (!IS_SERVER) return rpc("toggleHiveManual", [name]);
  const st = hive.value;
  const wasManual = st.manual.includes(name);
  hive.value = { ...st, manual: wasManual ? st.manual.filter((n) => n !== name) : [...st.manual, name] };
  if (!wasManual && st.run && st.run.status !== "stopped") skipAssignment(name);
}

// ── reload-resume ────────────────────────────────────────────────────────────

/**
 * Called from boot()/login() AFTER reconcile() and resumeQueue(): the queues
 * are hydrated and relaunched first, so derived statuses are truthful the
 * moment we look. Nothing is re-pushed — dispatched assignments re-attach via
 * their deterministic ids, pending ones dispatch on the first tick.
 */
export function resumeHive(): void {
  const run = hive.value.run;
  if (!run) return;
  if (run.status === "stopped") return unwindStop(); // crash mid-stop — finish the job
  if (run.status === "verifying") {
    void continueRun(); // redo the boundary check
    return;
  }
  log(`resumed — ${run.label}, wave ${run.waveSeq + 1}`);
  scheduleTick();
}

// A hot swap would double-register the module-level effects against a fresh
// signal while the old ones kept firing — reload instead (same as queue.ts).
if (import.meta.hot) import.meta.hot.accept(() => location.reload());

expose({ toggleHiveAuto, queueGoal, unqueueGoal, launchHive, stopHive, retryAssignment, skipAssignment, toggleHiveManual });
