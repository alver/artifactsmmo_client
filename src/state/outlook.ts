// Task 019, settled points 4–8: the outlook — the live World played forward to the deadline in a child process
// (src/server/outlook-run.ts, src/plan/planner/road.ts). The service's thread only hands over a World and takes lines back.
// This module never spawns anything: src/server/main.ts injects the runner (setOutlookRunner), as it injects the file sinks;
// the harness injects a fake or none. With no runner there is no outlook and no line about it. A run that fails — the
// child dies, hangs, prints garbage or cannot be started — costs one raw line, a journal record and `failed` on the page;
// nothing pauses, nothing blocks, no decision waits for it. Server-owned like the planner: its own key ammo:v1:outlook,
// hydrated before its persisting effect, so a restart shows the last road with its time until a new one lands.
//
// When a run starts (only while a character is owned and the achievements are read): two minutes after the first
// achievements read of a boot; three hours after the last run ended; 30 s after a change of the planner's config; on the
// Roadmap's ↻, at most once a minute. One child at a time: the config's change and ↻ kill a running one and start anew,
// the three-hour timer skips while one runs. A run not ended after 30 minutes is killed and counts as failed.

import { effect, signal } from "@preact/signals";
import { IS_SERVER, expose, rpc } from "../lib/remote";
import { devlog } from "../lib/devlog";
import { journal, runInfo, statusField } from "../lib/journal";
import { achievements, characters, isOwned } from "./store";
import { planner, worldOf } from "./planner";
import type { Completion, NextStep, RoadLine, Waiting } from "../plan/planner/road";

export interface OutlookRoad {
  from: number;     // the World's time it was played from
  until: number;    // played to (the deadline, or the horizon of settled point 8)
  at: number;       // when the run ended
  points: number;   // the points at the start
  expected: number; // the points at `until`, by the model
  completed: Completion[];
  byDay: { day: string; points: number }[];
  sec: number;      // the run's seconds
  steps: number;
  commit?: string;  // the service's commit
}
export interface OutlookState {
  state: "idle" | "running" | "failed";
  error?: string;                                               // failed: why
  startedAt?: number;                                           // running: since when
  day?: { at: number; n: number; of: number; points: number };  // running: its last day line
  from?: number;                                                // the World's time `waiting` and `next` came from
  waiting?: Waiting[];
  next?: Record<string, NextStep[]>;
  road?: OutlookRoad;                                           // the last whole road (replaced only when a run ends)
}

/** Starts a child with `input` on its stdin, calls `onLine` per stdout line and `onExit` once when it is gone. */
export type OutlookRunner = (input: string, onLine: (line: string) => void, onExit: (code: number | null, why?: string) => void) => { kill(): void };

const KEY = "ammo:v1:outlook";
const EMPTY: OutlookState = { state: "idle" };
const DAY = 864e5;
const BOOT_MS = 2 * 60_000;
const EVERY_MS = 3 * 3_600_000;
const CONFIG_MS = 30_000;
const ASK_MS = 60_000;
const KILL_MS = 30 * 60_000;
/** Settled point 8: the service's horizon in days (0 = to the deadline). Task 020, settled point 6: a whole run from the
 *  World of 2026-11-21 takes 420 s and 683 MB at its peak alone (report 020; it took 36 minutes and 2.1 GB, report 019, when
 *  this was 21), so the service plays to the deadline and the Season card shows what is expected there. Task 021: back to
 *  21 — with a fleet that fights on, the live World of 2026-11-22 is not played to the deadline within KILL_MS (3,588 s
 *  alone; 21 days in about 7 minutes), though the World of 11-21 still is (412 s, 477 MB): report 021. */
export const HORIZON_DAYS = 21;

function load(): OutlookState {
  try {
    const s = { ...EMPTY, ...(JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<OutlookState>) };
    // a run that was on when the service stopped is gone with it
    return s.state === "running" ? { ...s, state: "idle", startedAt: undefined, day: undefined } : s;
  } catch {
    return EMPTY;
  }
}

// The tab never hydrates or persists: its copy is a mirror fed by state/synced.ts.
export const outlook = signal<OutlookState>(IS_SERVER ? load() : EMPTY);
let saved = IS_SERVER ? localStorage.getItem(KEY) : null;
if (IS_SERVER) effect(() => {
  const s = JSON.stringify(outlook.value);
  if (s === saved || (saved === null && s === JSON.stringify(EMPTY))) return;
  try {
    localStorage.setItem(KEY, s);
    saved = s;
  } catch {
    /* quota / unavailable — non-fatal */
  }
});
const put = (patch: Partial<OutlookState>): void => void (outlook.value = { ...outlook.value, ...patch });
const iso = (t: number): string => new Date(t).toISOString();

let runner: OutlookRunner | undefined;
let live: { kill(): void } | undefined; // the child running now
let seq = 0; // the run whose lines and exit are heard; a killed or failed run's are not
let killTimer: ReturnType<typeof setTimeout> | undefined;
let due: { at: number; restart: boolean; t: ReturnType<typeof setTimeout> } | undefined;
let asked = -Infinity;

/** `logs/status.json`'s `outlook`: the last road's World time, expected points and seconds, and the state. */
function status(): void {
  const o = outlook.value; // read first: the effect follows what it read
  if (!runner) return;
  statusField("outlook", { at: o.road && iso(o.road.from), expected: o.road?.expected, sec: o.road?.sec, state: o.state });
}
if (IS_SERVER) effect(status);

/** src/server/main.ts: how to start a child. Never called in the harness unless a scenario brings a fake. */
export function setOutlookRunner(r: OutlookRunner): void {
  runner = r;
  status();
}

/** A run in `ms`, unless one is due sooner; `restart` kills a running child. */
function plan(ms: number, restart: boolean): void {
  if (!runner) return;
  const at = Date.now() + ms;
  if (due && due.at <= at) return void (due.restart ||= restart);
  if (due) {
    clearTimeout(due.t);
    restart ||= due.restart;
  }
  due = { at, restart, t: setTimeout(() => {
    const r = due!.restart;
    due = undefined;
    begin(r);
  }, ms) };
}

const may = (): boolean => !!achievements.value && Object.keys(characters.value).some(isOwned);

function begin(restart: boolean): void {
  if (!runner || !may()) return; // the next trigger tries again
  if (live) {
    if (!restart) return; // the three-hour timer skips while one runs
    seq++;
    live.kill();
    live = undefined;
  }
  clearTimeout(killTimer);
  const now = Date.now();
  const id = ++seq;
  const heard = <A extends unknown[]>(f: (...a: A) => void) => (...a: A): void => void (id === seq && f(...a));
  let whole = false;
  try {
    const world = worldOf(now);
    const deadline = Date.parse(world.config.deadline);
    const until = HORIZON_DAYS ? Math.min(deadline, now + HORIZON_DAYS * DAY) : deadline;
    const running = Object.fromEntries(Object.entries(planner.value.current).filter(([n, r]) => r && !r.over && world.config.on[n]));
    const input = JSON.stringify({ world, running, until });
    put({ state: "running", startedAt: now, day: undefined, error: undefined });
    live = runner(input, heard((line: string) => {
      let l: RoadLine;
      try {
        l = JSON.parse(line) as RoadLine;
        if (typeof l?.k !== "string") throw new Error("no kind");
      } catch {
        return fail(`a line that is not the road's: ${line.slice(0, 80)}`, now);
      }
      if (l.k === "waiting") put({ from: l.from, waiting: l.waiting });
      else if (l.k === "next") put({ from: l.from, next: l.next });
      else if (l.k === "day") put({ day: { at: l.at, n: l.n, of: l.of, points: l.points } });
      else if (l.k === "done") {
        whole = true;
        clearTimeout(killTimer);
        live?.kill(); // its work is done: it exits by itself, and must never hold the next run back
        live = undefined;
        put({ state: "idle", startedAt: undefined, day: undefined, road: { from: l.from, until: l.until, at: Date.now(), points: l.points, expected: l.expected, completed: l.completed, byDay: l.byDay, sec: l.sec, steps: l.steps, commit: runInfo().commit } });
        journal("outlook", { from: iso(l.from), until: iso(l.until), sec: l.sec, points: l.points, expected: l.expected, next: l.completed.slice(0, 10).map((c) => ({ code: c.code, at: iso(c.at) })) });
        plan(EVERY_MS, false);
      }
    }), heard((code: number | null, why?: string) => {
      live = undefined;
      if (!whole) fail(`the child ${code == null ? "stopped" : `exited with ${code}`} before the road was whole${why ? `: ${why}` : ""}`, now);
    }));
  } catch (e) {
    return fail(`could not start: ${(e as Error).message}`, now);
  }
  killTimer = setTimeout(heard(() => fail(`not ended after ${KILL_MS / 60_000} minutes — killed`, now)), KILL_MS);
}

/** One raw line, one journal record, `failed` on the page; the last road stays. */
function fail(why: string, from: number): void {
  seq++;
  live?.kill();
  live = undefined;
  clearTimeout(killTimer);
  put({ state: "failed", error: why, startedAt: undefined, day: undefined });
  devlog(`outlook: failed — ${why}`);
  journal("outlook", { from: iso(from), failed: why });
  plan(EVERY_MS, false);
}

if (IS_SERVER) {
  // the first achievements read of a boot (the achievements are not persisted: null until then)
  let read = false;
  effect(() => {
    if (read || !achievements.value) return;
    read = true;
    plan(BOOT_MS, false);
  });
  // a change of the planner's config, any key, once the achievements are read (before that the boot's run covers it)
  let cfg = planner.peek().config;
  effect(() => {
    const c = planner.value.config;
    if (c === cfg) return;
    cfg = c;
    if (read) plan(CONFIG_MS, true);
  });
}

/** The Roadmap's ↻: a new run now (a running one is killed), at most once a minute. */
export function refreshOutlook(): void {
  if (!IS_SERVER) return rpc("refreshOutlook", []);
  if (Date.now() - asked < ASK_MS) return;
  asked = Date.now();
  plan(0, true);
}

expose({ refreshOutlook });
