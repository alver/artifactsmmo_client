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
// (hive:<startedAt>:<waveSeq>:<char>:<i>): a reload re-attaches to in-flight
// items instead of re-pushing, and a user deleting a hive item just counts as
// done — the hive appends and watches, user edits always win.

import { batch, effect, signal } from "@preact/signals";
import { addItem, queues, removeItem, startQueue, stopQueue, clearQueue, type QueueState } from "./queue";
import { achievements, bankDetails, bankItems, characterList, craftSkillPins, pushLog } from "./store";
import { compileGoal, goalSatisfied, needsAchievements, proposeGoals } from "../plan/hive";
import type { AccountGoal, HiveCtx, HivePlan, HiveWave, ScoredGoal } from "../plan/hive";
import type { QueueItem, QueueItemInput } from "../plan/queue";

export interface HiveAssignmentState {
  character: string;
  label: string;
  items: QueueItemInput[];
  dispatched: boolean;
  /** Opt-out, user skip, missing character, or empty items. */
  skipped?: boolean;
  /** Deterministic ids of the pushed queue items. */
  itemIds?: string[];
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
}

// ── persistence (the runner pattern: hydrate BEFORE the persisting effect) ──

const STORE_KEY = "ammo:v1:hive";
const SCHEMA = 1;

function loadStored(): HiveState {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null") as (HiveState & { schema?: number }) | null;
    if (!s || s.schema !== SCHEMA) return { run: null, manual: [], history: [] };
    return { run: s.run ?? null, manual: s.manual ?? [], history: s.history ?? [] };
  } catch {
    return { run: null, manual: [], history: [] };
  }
}

export const hive = signal<HiveState>(loadStored());

/** Fresh proposals for the panel — recomputed on demand, never persisted. */
export const hiveProposals = signal<ScoredGoal[] | null>(null);

effect(() => {
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
    craftPins: craftSkillPins.value,
  };
}

export function refreshProposals(): void {
  hiveProposals.value = proposeGoals(buildHiveCtx());
}

const hiveItemId = (startedAt: number, waveSeq: number, character: string, i: number): string =>
  `hive:${startedAt}:${waveSeq}:${character}:${i}`;
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
effect(() => {
  queues.value;
  const st = hive.value;
  if (st.run?.status === "running") scheduleTick();
});

function tick(): void {
  const run = hive.value.run;
  if (!run || run.status !== "running") return;
  if (!run.wave) return beginBarrier();
  if (run.wave.assignments.some((a) => !a.dispatched && !a.skipped)) return dispatchWave();
  if (!waveDone(run.wave)) return; // paused/blocked/stopped assignments hold the wave
  beginBarrier();
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
    const assignments = run.wave!.assignments.map((a) => {
      if (a.dispatched || a.skipped) return a;
      if (!known.has(a.character) || manual.has(a.character) || a.items.length === 0) {
        if (!known.has(a.character)) log(`${a.character} is gone — assignment skipped`);
        return { ...a, skipped: true };
      }
      const ids = a.items.map((_, i) => hiveItemId(run.startedAt, run.waveSeq, a.character, i));
      const present = new Set((queues.value[a.character]?.items ?? []).map((it) => it.id));
      a.items.forEach((input, i) => {
        if (!present.has(ids[i])) addItem(a.character, { ...input, id: ids[i] } as QueueItem);
      });
      startQueue(a.character);
      return { ...a, dispatched: true, itemIds: ids };
    });
    hive.value = {
      ...hive.value,
      run: { ...hive.value.run!, wave: { ...run.wave!, assignments } },
    };
    log(`wave ${run.waveSeq + 1} dispatched — ${run.label}`);
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
  if (key === run.waveKey) {
    log(`stalled — the next wave equals the one just finished (${run.label})`, "bad");
    return finish("incomplete");
  }
  hive.value = {
    ...hive.value,
    run: {
      ...run,
      status: "running",
      waveSeq: run.waveSeq + 1,
      wave: toWaveState(next),
      waveKey: key,
      preview: plan.waves.slice(1).map((w) => w.label),
      once: plan.once,
    },
  };
  // the hive write re-fires the observer → the new wave dispatches
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
  // Propose the next move (never auto-launch). Deferred: proposeGoals runs a
  // cold BIS sweep (~seconds) and must not stall the completion paint.
  if (outcome !== "abandoned") setTimeout(refreshProposals, 100);
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
 */
export function launchHive(picked: ScoredGoal, plan: HivePlan): void {
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
      if (q.items.length) clearQueue(c.name); // …so the clear is allowed in the same turn
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
        preview: plan.waves.slice(1).map((w) => w.label),
        once: plan.once,
        status: "running",
      },
    };
  });
  log(`goal launched — ${picked.label}`, "ok");
  // wave 0 dispatches on the tick the hive write just scheduled
}

/** ⏹ Make-stop-stick: persist the stop FIRST, then unwind the queues. */
export function stopHive(): void {
  const st = hive.value;
  const run = st.run;
  if (!run) return;
  if (run.status !== "stopped") hive.value = { ...st, run: { ...run, status: "stopped" } };
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
  startQueue(character);
}

/** Abandon one character's remaining work this wave: pull our items, mark skipped. */
export function skipAssignment(character: string): void {
  const run = hive.value.run;
  const a = run?.wave?.assignments.find((x) => x.character === character);
  if (!run || !run.wave || !a || a.skipped) return;
  batch(() => {
    if (a.dispatched) {
      if (queues.value[character]?.running) stopQueue(character);
      for (const id of a.itemIds ?? []) removeItem(character, id);
    }
    const cur = hive.value.run;
    if (!cur?.wave) return;
    hive.value = {
      ...hive.value,
      run: {
        ...cur,
        wave: {
          ...cur.wave,
          assignments: cur.wave.assignments.map((x) => (x.character === character ? { ...x, skipped: true } : x)),
        },
      },
    };
  });
  log(`${character}'s assignment skipped`);
}

/** Toggle a character's manual opt-out. Opting out mid-run abandons its current
 *  assignment; opting back in rejoins from the next dispatched wave. */
export function toggleHiveManual(name: string): void {
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
