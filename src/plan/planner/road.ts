// Task 019, settled point 1: the road — a World played forward from its running steps to a time, given as lines while it
// plays. The one function the outlook's child process (src/server/outlook-run.ts), `npm run outlook` and the checks call;
// the Lab is the same function with other knobs. Pure but for the seconds it measures. In order:
//   waiting — waitingOf of the start World;
//   next    — per character its next three steps, as soon as every character has three (at the end when one never does);
//   day     — once a simulated UTC day, the points so far;
//   done    — every completion, the points at the end and at each day's end, the seconds, the steps played.

// Task 028 (A.2, A.3): the day lines and `done` carry each character's levels at the day's end (LEVEL_KEYS' order), `done`
// the levels at the start, the gear pieces and tools made, the day each fighter's XP pick changes monster and the gear
// crafts' crafters; `needs` (after `waiting`) the road's needs and the tools of the start World (needs.ts).

import { itemsOf } from "./compile";
import { levelOf, perOf } from "./cost";
import { bankPlus, forward, pointsOf, waitingOf } from "./forward";
import { isOn } from "./gates";
import { GEAR_CRAFT } from "./config";
import { crafterOf } from "./roles";
import { needsOf } from "./needs";
import { queueItemText } from "../queue";
import type { NeedRow } from "./needs";
import type { QueueItem } from "../queue";
import type { Answer, Lane, Running, Step, World } from "./types";

export type Waiting = ReturnType<typeof waitingOf>[number];
export interface NextStep { key: string; as: Answer; text: string; why: string; hours: number; at: number }
export interface Completion { code: string; points: number; at: number }
/** Task 028: the order of a character's levels in a day line: combat, then the eight skills. */
export const LEVEL_KEYS: Lane[] = ["combat", "mining", "woodcutting", "fishing", "weaponcrafting", "gearcrafting", "jewelrycrafting", "cooking", "alchemy"];
export type Levels = Record<string, number[]>;
/** A gear piece or tool the road makes: when (the step's end), what, how many, for whom, by whom. */
export interface Made { at: number; code: string; n: number; for?: string; by: string }
/** A fighter's XP pick changes monster (the first pick has no `from`). */
export interface PickChange { at: number; who: string; from?: string; to: string }
export interface RoadDay { day: string; points: number; levels: Levels }
export type RoadLine =
  | { k: "waiting"; from: number; waiting: Waiting[] }
  | { k: "needs"; from: number; needs: NeedRow[]; error?: string }
  | { k: "next"; from: number; next: Record<string, NextStep[]> }
  | { k: "day"; at: number; n: number; of: number; points: number; levels: Levels }
  | { k: "done"; from: number; until: number; points: number; expected: number; completed: Completion[]; byDay: RoadDay[]; sec: number; steps: number; start: Levels; made: Made[]; picks: PickChange[]; crafters: Record<string, string> };

const levelsOf = (w: World): Levels => Object.fromEntries(w.characters.map((c) => [c.name, LEVEL_KEYS.map((k) => levelOf(c, k))]));

const DAY = 864e5;

/** Settled point 2: what is left of a running step — its units less the units done, its hours pro rata. A field item counts
 *  actions (Running.units); a kill or gather step's unit is an item of its drop (perOf actions) unless it is supply. */
export function leftOf(r: Running): Step {
  const s = r.step;
  const done = (s.work.kind === "kill" || s.work.kind === "gather") && s.as !== "supply" ? r.units / perOf(s.work) : r.units;
  const units = Math.max(0, s.units - done);
  return { ...s, units, hours: s.units > 0 ? (s.hours * units) / s.units : 0 };
}

/** The text a step carries in a queue: its field item, craft, buy, task or train item (a tidy step's first recycle) —
 *  task 028: the runtime's `step` record too (state/planner.ts). */
export function stepText(step: Step, items: QueueItem[]): string {
  const its = items.filter((it) => it.kind !== "deposit-all");
  const it = step.work.kind === "recycle" ? its[0] : its[its.length - 1];
  return it ? queueItemText(it) : step.target;
}
function textOf(step: Step, w: World): string {
  const ch = w.characters.find((c) => c.name === step.character);
  try {
    return ch ? stepText(step, itemsOf(step, ch)) : step.target;
  } catch {
    return step.target;
  }
}

/** Plays `world` from `running` (the runtime's steps in flight) to `until`, calling `emit` with each line. */
export function road(live: World, running: Record<string, Running | undefined>, until: number, emit: (line: RoadLine) => void, n = 3): void {
  const t0 = performance.now();
  // The forward model's World (types.ts): no bank slots — no tidy step, no expansion (check-planner's invariant 21; advance
  // applies no recycle, so a tidy step would come back forever) — and no bags: it banks at a step's end.
  // task 032: and no market — the forward model buys nothing; task 041: and no cut
  const world: World = { ...live, bank: bankPlus(live.bank, new Map(Object.entries(live.bags ?? {}))), bags: undefined, bankSlots: undefined, nextExpansion: undefined, market: undefined, cut: undefined };
  const names = world.characters.map((c) => c.name);
  const on = names.filter((name) => isOn(name, world)); // task 020: a character that is off is not played (forward), so it gets no next step
  emit({ k: "waiting", from: world.now, waiting: waitingOf(world) });
  // task 028 (A.3): a need the page cannot read is no reason to lose the road
  try {
    emit({ k: "needs", from: world.now, needs: needsOf(world) });
  } catch (e) {
    emit({ k: "needs", from: world.now, needs: [], error: (e as Error).message });
  }
  const start = levelsOf(world);
  let cur = world; // the World of the last step that ended: its levels are the day's when a midnight passes
  const made: Made[] = [], picks: PickChange[] = [];
  const pick: Record<string, string> = {};
  const seed: Record<string, Step> = {};
  for (const [name, r] of Object.entries(running)) if (r && !r.over && names.includes(name)) seed[name] = leftOf(r);
  const next: Record<string, NextStep[]> = Object.fromEntries(names.map((name) => [name, []]));
  let sent = false;
  const sendNext = (): void => void ((sent = true), emit({ k: "next", from: world.now, next }));
  const first = Math.floor(world.now / DAY) * DAY + DAY;
  const of = until >= first ? Math.floor((until - first) / DAY) + 1 : 0;
  let midnight = first, day = 0;
  // the points at the last decision: a completion happens only where a step ends, and a decision follows at that moment
  let pts = pointsOf(world);
  const byDay: RoadDay[] = [];
  /** Every midnight before `t` (up to `t` with `upTo`) has passed: its day ended with `pts` and the levels of `cur`. */
  const pass = (t: number, upTo: boolean): void => {
    for (; upTo ? midnight <= t : midnight < t; midnight += DAY) {
      const levels = levelsOf(cur);
      byDay.push({ day: new Date(midnight - DAY).toISOString().slice(0, 10), points: pts, levels });
      emit({ k: "day", at: midnight, n: ++day, of, points: pts, levels });
    }
  };
  const r = forward(world, until, (w, step) => {
    pass(w.now, false);
    pts = pointsOf(w);
    // task 028: the day a fighter's XP pick changes monster
    if (step.reason?.rule === "xp-pick" && step.work.kind === "kill" && pick[step.character] !== step.work.monster) {
      picks.push({ at: w.now, who: step.character, ...(pick[step.character] ? { from: pick[step.character] } : {}), to: step.work.monster });
      pick[step.character] = step.work.monster;
    }
    const mine = next[step.character];
    if (sent || !mine || mine.length >= n) return;
    mine.push({ key: step.key, as: step.as, text: textOf(step, w), why: step.why, hours: step.hours, at: w.now });
    if (on.every((name) => next[name].length >= n)) sendNext();
  }, (w, step) => {
    // the step ends at its character's clock (forward.ts advance): a midnight before it ended with the World before it
    const end = w.clock?.[step.character] ?? w.now;
    pass(end, false);
    cur = w;
    if (step.target.startsWith("gear:") && step.work.kind === "craft" && end <= until) made.push({ at: end, code: step.work.code, n: step.units, ...(step.for ? { for: step.for } : {}), by: step.character });
  }, seed, false);
  pts = pointsOf(r.world);
  cur = r.world;
  pass(until, true);
  if (!sent) sendNext();
  const crafters = Object.fromEntries(GEAR_CRAFT.flatMap((l) => { const c = crafterOf(l, world); return c ? [[l, c]] : []; }));
  emit({ k: "done", from: world.now, until, points: pointsOf(world), expected: pts, completed: r.completed, byDay, sec: Math.round((performance.now() - t0) / 100) / 10, steps: r.steps, start, made, picks, crafters });
}
