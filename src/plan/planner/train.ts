// Task 029: the fleet levels the crafts — a training's materials are everybody's work. Pure.
//   A.1 a gear craft (GEAR_CRAFT) whose holder — a worker that is on — stands under the target (craftTarget: the highest
//       fighter's level + 5, down to a multiple of 5, at least WORKER_CRAFT, at most the level cap) has its next level as a
//       parent of supply (`train:<lane>`): the picked recipe's materials for the runs that level still takes, recycling's
//       return off. Its leaves are needs of the fighters' road (decide.ts: a worker's first tier; a fighter's kill, A.3).
//   A.2 one picker (trainPick) names the recipe for the parent, the train step and so the loop (the step's `code`, which the
//       train item crafts): XP an hour, a material at the seconds of whoever supplies it under this task (supplierSec: a
//       fighter's kill, the lane holder's gather, the bank's stock free), recycling's return off. A recipe whose batch the
//       bank covers goes first, so a batch's banked materials are used before the choice moves; while the holder runs a
//       train step every other character supplies that step's recipe (trainParents' `fixed`); the choice moves only between
//       steps, as the stock moves.
//   A.5 the train step (trainPlan) is `runs` of that recipe to the end of its level: what the bank covers when that is a
//       batch or more — the crafts alone; else the level, the bank's part free and the rest at the crafter's own sourcing
//       (the loop's sourceOne). Its hours are that.
// The score of a training parent is no new term: the best of the lane's rule-3 level candidate (the bundle up to its gate,
// bundle.ts) and the gear needs whose pieces ask a level of that craft above the holder's (gear.ts) — both are the scores a
// level candidate of that lane carries today. None: no parent (the worker's third tier, craft ahead, still trains it).

import { catalog, item, itemName, resource as resourceOf } from "../../catalog";
import { atlas } from "../../catalog/atlas";
import { CRAFT_SEC, autoRecyclable, recycleReturn } from "../xp";
import { CHUNK_SEC, GEAR_CRAFT } from "./config";
import { actionSec, levelOf, stepSec } from "./cost";
import { bundleOf, bundleScore } from "./bundle";
import { gearPieces } from "./gear";
import { isOn, met } from "./gates";
import { admitted, nearestSpot, placeOf } from "./reach";
import { crafterOf, roleOf, rolesFor } from "./roles";
import { available } from "./stock";
import { billOf, fleetSec } from "./supply";
import type { Gated, Parent } from "./supply";
import { craftXpOf } from "./xp";
import type { Character } from "../../types/api";
import type { Gate, Lane, Place, Work, World } from "./types";

/** Task 027 (decision 66): the least level a worker's gear craft is led to ahead of the fighters. */
export const WORKER_CRAFT = 30;
/** One run of a training: the craft and the recycle (one action each, the log's ~5 s). */
const RUN_SEC = 2 * CRAFT_SEC;

/** Task 027e (B.3), task 029 (A.6): the level the gear crafts are led to — the tier the fighters wear next. */
export function craftTarget(world: World): number {
  const cap = atlas()?.xpNeeded.length ?? Infinity;
  const top = Math.max(0, ...world.characters.filter((c) => isOn(c.name, world) && roleOf(c.name, world) === "fighter").map((c) => c.level));
  return Math.min(cap, Math.max(WORKER_CRAFT, Math.floor((top + 5) / 5) * 5));
}

const supMemo = new WeakMap<World, Map<string, number>>();
/** A.2: a training's field action at the seconds of whoever supplies it under this task — a kill at the quickest fighter
 *  that is on, admitted and reaches it (A.3), a gather at its lane's holder; else the fleet's (supply.ts fleetSec).
 *  shortcut: with TRAIN_HUNT off no fighter hunts a training's kill (033b), yet it is priced here at the fighters' seconds, so a
 *  recipe whose drop no worker is admitted to stays the pick and waits; upgrade when the chat asks it to take its next recipe. */
export function supplierSec(w: Work, gates: Gate[], world: World): number {
  let m = supMemo.get(world);
  if (!m) supMemo.set(world, (m = new Map()));
  const k = w.kind === "kill" ? `kill:${w.monster}` : w.kind === "gather" ? `gather:${w.resource}` : JSON.stringify(w);
  let s = m.get(k);
  if (s != null) return s;
  s = Infinity;
  const may = (c: Character): boolean => isOn(c.name, world) && gates.every((g) => g.kind === "win" || met(g, c, world));
  if (w.kind === "kill") {
    for (const c of world.characters) if (roleOf(c.name, world) === "fighter" && may(c) && admitted(c, world, w.monster) && nearestSpot(placeOf(c), "monster", w.monster, world, c.name)) s = Math.min(s, actionSec(w, c, world));
  } else if (w.kind === "gather") {
    const lane = resourceOf(w.resource)?.skill as Lane | undefined;
    const h = world.characters.find((c) => isOn(c.name, world) && !!lane && (rolesFor(world)[c.name] ?? []).includes(lane));
    if (h && may(h)) s = actionSec(w, h, world);
  }
  if (!Number.isFinite(s)) s = fleetSec(w, gates, world);
  m.set(k, s);
  return s;
}

/** The crafter's own seconds for a field action of its loop (sourceOne: a gather it meets, a hunt it is admitted to), else ∞. */
const ownSec = (ch: Character) => (w: Work, gates: Gate[], world: World): number =>
  gates.every((g) => g.kind === "win" || met(g, ch, world)) && (w.kind !== "kill" || admitted(ch, world, w.monster)) ? actionSec(w, ch, world) : Infinity;

export interface TrainPick {
  lane: Lane; code: string;
  L: number;                  // the level trained
  xp: number;                 // XP a run at L
  runs: number;               // the runs left in the level (the XP left ÷ xp)
  batch: number;              // the loop's batch: half a bag of direct materials (queue.ts batchRuns)
  covered: number;            // runs the bank covers now (direct materials, for the crafter); a batch of them (or the level's
                              // last runs) is "covered": the crafts alone
  demand: [string, number][]; // the level's materials, recycling's return off
  hours: number;              // the level at the suppliers' seconds, the bank free, with its runs
  gated: Gated[];
}

const pickMemo = new WeakMap<World, Map<string, TrainPick | null>>();
/** A.2: the recipe `ch` trains `lane` on now (or `fixed`, a running step's), the bank as the crafter may plan with it. */
export function trainPick(lane: Lane, ch: Character, world: World, fixed?: string): TrainPick | undefined {
  let memo = pickMemo.get(world);
  if (!memo) pickMemo.set(world, (memo = new Map()));
  const key = `${lane}|${ch.name}|${fixed ?? ""}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit ?? undefined;
  const L = levelOf(ch, lane);
  const left = Math.max(1, (atlas()?.xpNeeded[L] ?? 0) - (((ch as unknown as Record<string, number>)[`${lane}_xp`]) ?? 0));
  let best: (TrainPick & { n: number; rate: number }) | undefined;
  for (const it of catalog().items.values()) {
    const r = it.craft;
    if (!r || r.skill !== lane || r.level > L || (fixed && it.code !== fixed)) continue;
    const xp = craftXpOf(it.code, L);
    // the loop recycles its product; a product of rare stuff is banked at full cost (xp.ts autoRecyclable) — no training
    if (!(xp > 0) || !autoRecyclable(it.code)) continue;
    const n = r.items.reduce((s, g) => s + g.quantity, 0);
    const runs = Math.ceil(left / xp - 1e-9);
    const keep = 1 - recycleReturn(n) / n; // recycling hands back that share of the materials (random units: by expectation)
    const demand = r.items.map((g): [string, number] => [g.code, Math.ceil(g.quantity * runs * keep - 1e-9)]);
    const bill = billOf(world, ch.name, demand, new Map(), true, supplierSec);
    if (bill.out.length || !Number.isFinite(bill.hours)) continue;
    const hours = bill.hours + (runs * RUN_SEC) / 3600;
    const covered = Math.min(...r.items.map((g) => Math.floor(available(g.code, world, ch.name) / g.quantity + 1e-9)));
    const batch = Math.max(1, Math.floor(ch.inventory_max_items / 2 / Math.max(1, n)));
    const c = { lane, code: it.code, L, xp, runs, batch, covered, demand, hours, gated: bill.gated, n, rate: (runs * xp) / Math.max(hours, 1e-9) };
    const cov = (x: typeof c): boolean => x.covered >= Math.min(x.batch, x.runs);
    const better = !best ? true
      : cov(c) !== cov(best) ? cov(c)
      : c.rate > best.rate || (c.rate === best.rate && (c.n < best.n || (c.n === best.n && c.code < best.code)));
    if (better) best = c;
  }
  const out = best ? (({ n, rate, ...p }) => p)(best) : undefined;
  memo.set(key, out ?? null);
  return out;
}

/** A.1: the training parents — a gear craft's next level where its holder (a worker that is on) stands under the target. */
export function trainParents(world: World, name: string, calH: number): Parent[] {
  const target = craftTarget(world);
  const out: Parent[] = [];
  for (const lane of GEAR_CRAFT) {
    const holder = crafterOf(lane, world);
    const h = holder ? world.characters.find((c) => c.name === holder) : undefined;
    if (!h || !isOn(h.name, world) || roleOf(h.name, world) !== "worker" || levelOf(h, lane) >= target) continue;
    // A.2: while the holder runs a train step, the fleet supplies that step's recipe, for what is left of the level after it
    // (for the deciding holder `current` is its last step: a fresh pick)
    const run = h.name !== name ? world.current[h.name] : undefined;
    const fixed = run?.work.kind === "train" && run.work.lane === lane && run.work.code ? run.work.code : undefined;
    const p = (fixed && trainPick(lane, h, world, fixed)) || trainPick(lane, h, world);
    if (!p) continue;
    const s = trainScore(lane, h, world, calH, name);
    if (!(s.any > 0)) continue;
    const runs = p.runs - (fixed === p.code && run?.work.kind === "train" ? run.units : 0);
    if (runs < 1) continue; // the running step makes the level
    const demand = p.demand.map(([c, q]): [string, number] => [c, Math.ceil((q * runs) / p.runs - 1e-9)]);
    out.push({ key: `train:${lane}`, label: `${lane} ${p.L} → ${p.L + 1} (${itemName(p.code)} ×${runs})`, points: s.points, fit: s.fit, any: s.any, hours: p.hours, demand, gated: p.gated });
  }
  return out;
}

/** The score a training carries — no new term, the best of the scores today's candidates carry: a fighter's road (rule 3's
 *  combat level candidate: the bundle up to its next gate — A.1: the training's leaves are needs of that road), the lane's own
 *  level candidate (its bundle), a gear need whose piece asks a level of this craft above the holder's. */
function trainScore(lane: Lane, h: Character, world: World, calH: number, name: string): { points: number; fit: number; any: number } {
  let best = { points: 0, fit: 0, any: 0 };
  const take = (s: { points: number; fit: number; any: number }): void => { if (s.fit > best.fit || (s.fit === best.fit && s.any > best.any)) best = { points: s.points, fit: s.fit, any: s.any }; };
  for (const [who, l] of [...world.characters.filter((c) => isOn(c.name, world) && roleOf(c.name, world) === "fighter").map((c): [string, Lane] => [c.name, "combat"]), [h.name, lane] as [string, Lane]]) {
    const b = bundleOf(l, who, world);
    if (b && Number.isFinite(b.hGate)) take(bundleScore(b, b.hGate, calH));
  }
  for (const [code, piece] of gearPieces(world, name)) {
    const r = piece.bought ? undefined : item(code)?.craft; // task 032c: a bought piece asks no craft level
    if (r?.skill === lane && r.level > levelOf(h, lane)) take(piece.best);
  }
  return best;
}

export interface TrainPlan { work: Work & { kind: "train" }; units: number; hours: number; place: Place; withdraw: Record<string, number>; covered: boolean; what: string }
/** A.4, A.5: the crafter's train step — `runs` of the picked recipe, within its level: what the bank covers when that is a
 *  batch or more (the crafts and a bank trip a batch), else a chunk (about CHUNK_SEC): the runs the bank covers free and those
 *  whose materials the crafter sources itself in the rest, at its own seconds (the loop's sourceOne) — so the fleet goes on
 *  supplying the rest of the level. Undefined: no recipe, or a shortfall the crafter cannot source itself (the fleet's). */
export function trainPlan(lane: Lane, ch: Character, world: World): TrainPlan | undefined {
  const p = trainPick(lane, ch, world);
  const here = placeOf(ch), spot = nearestSpot(here, "workshop", lane, world);
  if (!p || !spot) return undefined;
  const r = item(p.code)!.craft!;
  const covered = p.covered >= Math.min(p.batch, p.runs); // a batch, or every run the level still takes
  let runs = covered ? Math.min(p.runs, p.covered) : p.runs, own = 0;
  if (!covered) {
    // the level's shortfall at the crafter's own seconds (the bank free), an average a sourced run
    const b = billOf(world, ch.name, p.demand, new Map(), true, ownSec(ch));
    if (b.out.length || !Number.isFinite(b.hours)) return undefined;
    const free = Math.min(p.covered, p.runs), per = (b.hours * 3600) / Math.max(1, p.runs - free);
    runs = Math.min(p.runs, Math.max(1, free + Math.floor(CHUNK_SEC / Math.max(per + RUN_SEC, 1e-6))));
    own = ((runs - free) * per) / 3600;
  }
  const trips = Math.ceil(runs / p.batch);
  const hours = own + (runs * RUN_SEC + stepSec(spot.place, here) + (trips - 1) * stepSec(spot.place)) / 3600;
  const withdraw = Object.fromEntries(r.items.map((g): [string, number] => [g.code, Math.min(Math.floor(available(g.code, world, ch.name) + 1e-9), g.quantity * runs)]).filter(([, q]) => q > 0));
  return {
    work: { kind: "train", lane, code: p.code, runs }, units: runs, hours, place: spot.place, withdraw, covered,
    what: `${itemName(p.code)} ×${runs} (${p.xp} XP a run)${covered ? ", a batch from the bank" : ", the bank's part free, the rest sourced itself"}`,
  };
}
