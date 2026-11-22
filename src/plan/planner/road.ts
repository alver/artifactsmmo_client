// Task 019, settled point 1: the road — a World played forward from its running steps to a time, given as lines while it
// plays. The one function the outlook's child process (src/server/outlook-run.ts), `npm run outlook` and the checks call;
// the Lab is the same function with other knobs. Pure but for the seconds it measures. In order:
//   waiting — waitingOf of the start World;
//   next    — per character its next three steps, as soon as every character has three (at the end when one never does);
//   day     — once a simulated UTC day, the points so far;
//   done    — every completion, the points at the end and at each day's end, the seconds, the steps played.

import { itemsOf } from "./compile";
import { perOf } from "./cost";
import { bankPlus, forward, pointsOf, waitingOf } from "./forward";
import { isOn } from "./gates";
import { queueItemText } from "../queue";
import type { Answer, Running, Step, World } from "./types";

export type Waiting = ReturnType<typeof waitingOf>[number];
export interface NextStep { key: string; as: Answer; text: string; why: string; hours: number; at: number }
export interface Completion { code: string; points: number; at: number }
export type RoadLine =
  | { k: "waiting"; from: number; waiting: Waiting[] }
  | { k: "next"; from: number; next: Record<string, NextStep[]> }
  | { k: "day"; at: number; n: number; of: number; points: number }
  | { k: "done"; from: number; until: number; points: number; expected: number; completed: Completion[]; byDay: { day: string; points: number }[]; sec: number; steps: number };

const DAY = 864e5;

/** Settled point 2: what is left of a running step — its units less the units done, its hours pro rata. A field item counts
 *  actions (Running.units); a kill or gather step's unit is an item of its drop (perOf actions) unless it is supply. */
export function leftOf(r: Running): Step {
  const s = r.step;
  const done = (s.work.kind === "kill" || s.work.kind === "gather") && s.as !== "supply" ? r.units / perOf(s.work) : r.units;
  const units = Math.max(0, s.units - done);
  return { ...s, units, hours: s.units > 0 ? (s.hours * units) / s.units : 0 };
}

/** The text a step would carry in a queue: its field item, craft, buy, task or train item (a tidy step's first recycle). */
function textOf(step: Step, w: World): string {
  const ch = w.characters.find((c) => c.name === step.character);
  try {
    const items = ch ? itemsOf(step, ch).filter((it) => it.kind !== "deposit-all") : [];
    const it = step.work.kind === "recycle" ? items[0] : items[items.length - 1];
    return it ? queueItemText(it) : step.target;
  } catch {
    return step.target;
  }
}

/** Plays `world` from `running` (the runtime's steps in flight) to `until`, calling `emit` with each line. */
export function road(live: World, running: Record<string, Running | undefined>, until: number, emit: (line: RoadLine) => void, n = 3): void {
  const t0 = performance.now();
  // The forward model's World (types.ts): no bank slots — no tidy step, no expansion (check-planner's invariant 21; advance
  // applies no recycle, so a tidy step would come back forever) — and no bags: it banks at a step's end.
  const world: World = { ...live, bank: bankPlus(live.bank, new Map(Object.entries(live.bags ?? {}))), bags: undefined, bankSlots: undefined, nextExpansion: undefined };
  const names = world.characters.map((c) => c.name);
  const on = names.filter((name) => isOn(name, world)); // task 020: a character that is off is not played (forward), so it gets no next step
  emit({ k: "waiting", from: world.now, waiting: waitingOf(world) });
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
  const byDay: { day: string; points: number }[] = [];
  /** Every midnight before `t` (up to `t` with `upTo`) has passed: its day ended with `pts`. */
  const pass = (t: number, upTo: boolean): void => {
    for (; upTo ? midnight <= t : midnight < t; midnight += DAY) {
      byDay.push({ day: new Date(midnight - DAY).toISOString().slice(0, 10), points: pts });
      emit({ k: "day", at: midnight, n: ++day, of, points: pts });
    }
  };
  const r = forward(world, until, (w, step) => {
    pass(w.now, false);
    pts = pointsOf(w);
    const mine = next[step.character];
    if (sent || !mine || mine.length >= n) return;
    mine.push({ key: step.key, as: step.as, text: textOf(step, w), why: step.why, hours: step.hours, at: w.now });
    if (on.every((name) => next[name].length >= n)) sendNext();
  }, undefined, seed, false);
  pts = pointsOf(r.world);
  pass(until, true);
  if (!sent) sendNext();
  emit({ k: "done", from: world.now, until, points: pointsOf(world), expected: pts, completed: r.completed, byDay, sec: Math.round((performance.now() - t0) / 100) / 10, steps: r.steps });
}
