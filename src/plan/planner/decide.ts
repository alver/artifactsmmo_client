// decide(name, world): the next chunk of work for one free character — rules 1–5 of design A.2.
//   1. Targets are the open objectives and the level gates; one is in reach when the character meets every gate.
//   2. An in-reach objective scores points × fit ÷ the achievement's remaining hours.
//   3. A level gate scores Σ (points × fit) of the open achievements behind this lane's gates up to it
//      ÷ (hours to the gate + their hours); candidates: the next gate of each lane the character has.
//   4. The highest score wins, in this order (task 011): an achievement on config.first (by fit, else by points per
//      hour); a real candidate (objective, level, supply) that fits the deadline; a filler that fits; a real candidate
//      by points per hour; a filler by points per hour; the fallback. So a road that fits nothing takes the fallback's
//      hours, never a fitting filler's.
//   5. "Fits" = the points that fit the deadline (score `fit` > 0); the points-per-hour tiers drop fit and say so in
//      the step's why ("nothing fits the deadline: points per hour").
// Task 009: supply and gear are candidates too (supply.ts, gear.ts): a `src:` / `mat:` / `gear:` target scores what
// it is for — its parent's points × fit ÷ the hours of the parent's whole chain, the same number on every link —
// and a crafter short of a needed piece's recipe has that level as a level target carrying the piece's points.
// It always returns a step (C.4): else filler, else a gather chunk on the best node of the character's highest
// gathering skill whose fallback is not blocked. Built in: × 1.25 in pickMonster for a monster with an open
// objective (E), + 10% for the target the character was on last (B.4). Ties go to the target key. Pure.
// Task 013, settled point 1: a target with an event gate is never a step, live or not, nor an event-only material's
// src: leaf — that work is the event interrupt's (events.ts eventMembers); its points ride a level's bundle (bundle.ts)
// or a parent's calendar (supply.ts).
// Task 027, the roles (roles.ts roleOf; no new scoring term — a candidate the role forbids is simply not one), task 027e
// (Alex: a fighter's level is a goal in itself; the workers serve its road) — an order of existing candidates:
//   a fighter: fight work only (no gathering, supply-gather, filler or tidy step), in this order: (1) an achievement on
//     config.first; (2) forging by need (027b); (3) a kill a need of a fighter's road asks (027d's coins; 027g: a src: kill
//     only when no worker that is on is admitted for it, and not of its pick's monster); (4) the XP pick — 027g: a road
//     need's src: kill monster joins its ×1.25 bonus, so within 25% of the pick's rate its drops come along; (5) with no
//     admitted fight that gives XP or at the level cap, today's rule over the whole list.
//   a worker, in this order: (1) a need of the fighters' road (gear work (a), the craft level such a piece asks, the road's
//     consumables) or a lane holder's tool, today's scoring among them — task 030 (GEAR_FIRST on): in two halves, (1a) weapons
//     and armour (gear work (a), the level such a piece asks, a craft's training; `pick`: the XP pick's consumables too), its
//     own train step last, then (1b) the rest; (2) an objective whose achievement completes within
//     WORKER_SHORT_H of its work; (3) its gear craft to the tier the fighters wear next (the highest fighter's level + 5,
//     down to a multiple of 5, at least WORKER_CRAFT; the train item); (4) today's rule inside its lanes (a work of no lane
//     — a task, a trade — and a kill objective's needs included). Never a combat level or a kill objective; a src: kill
//     (027g, Alex: the workers hunt the materials) whenever it is admitted for it, but one of a monster a fighter's XP pick
//     fights (its drops come along). Its fallback gathers in its own lanes.
// Task 027d (tasks.ts): a fighter's kill step starts with a visit to the tasks master when it holds no task, a finished one
// or an items task; its held task's monster joins pickMonster's bonus; coins a bill lacks are its src:tasks_coin step (the
// held task's kills); a task worked on purpose (that step, the filler) is cancelled there when rule 4 says so.

import { achievement as achievementOf, item, itemName, monster as monsterOf, resource as resourceOf } from "../../catalog";
import { CRAFT_SEC, fightXp } from "../xp";
import { PINNED_ARTIFACTS, jobGear, ownedQtyOf } from "../jobgear";
import { CHUNK_SEC, GATHER_LANES, GEAR_CRAFT, GEAR_FIRST, KITCHEN, TRAIN_HUNT, TRAIN_LANES } from "./config";
import { actionSec, bagActions, craftsPerLevel, fareShare, hoursToLevel, levelOf, perOf, recycleLane, stepSec, unitSec } from "./cost";
import { achHours, bundleOf, bundleScore } from "./bundle";
import { bankStuck, newCodes, tidyStep } from "./bank";
import { isOn, met } from "./gates";
import { consFree, consParents, consumableNeeds, fedParents, fightTake, gearWorld, kitchenOn, nextFoodTier, stockCook } from "./consumables";
import type { Take } from "./consumables";
import { candidatesOf, gearNeeds, gearPieces, pieceParent } from "./gear";
import { atlas } from "../../catalog/atlas";
import { monsterName, pickMonster, pickNode, pickRecipe, pickSource } from "./pick";
import { admitted, fightRec, nearestSpot, placeOf, withToll, verdictOf } from "./reach";
import { crafterOf, fights, roleOf, rolesFor } from "./roles";
import { cancelOf, coinsInFlight, monstersTask, startVisit, taskText, visitSec } from "./tasks";
import { available, poolBank, setPoolOut } from "./stock";
import { feedable, inStep, mayCraft, objectiveParents, recipeDemand, supplyNeeds } from "./supply";
import { sourceFor, targetsOf } from "./targets";
import { WORKER_CRAFT, craftTarget, trainParents, trainPlan } from "./train";
import { stageCraft, stageOf } from "./stage";
import { marketOffers } from "./market";
import type { MarketNeed, Offer } from "./market";
import { GEAR_SLOTS, slotCode } from "../../types/api";
import type { Parent } from "./supply";
import type { Character, GearSlot } from "../../types/api";
import type { Answer, Input, Lane, Place, Reason, Rule, Source, Step, Target, Toll, Work, World } from "./types";

export { met } from "./gates";

/** Task 017, settled point 13: a kill step the potion stock caps below this many kills (and a third of its chunk) is a
 *  sliver — every one in the journal of 11-21 was one or two kills; section 1's own mark is five. */
const SLIVER = 5;
/** Task 027 (decision 66): a worker's objective goes before its craft when its achievement completes within this many
 *  hours of the worker's own work (cheap points first), and the craft it levels before the rest of its lanes. */
export const WORKER_SHORT_H = 6;
export { WORKER_CRAFT };

/** The lane a work levels: combat for a kill, the skill of a gather, a craft or a recycle; none for a task or a trade. */
function laneOfWork(w: Work, ch: Character, world: World): Lane | undefined {
  switch (w.kind) {
    case "kill": return "combat";
    case "gather": return resourceOf(w.resource)?.skill as Lane | undefined;
    case "craft": return item(w.code)?.craft?.skill as Lane | undefined;
    case "train": case "level": return w.lane;
    case "recycle": return recycleLane(ch, world);
    default: return undefined;
  }
}

const fmt = (h: number): string => (!Number.isFinite(h) ? "∞" : h < 10 ? h.toFixed(1) : String(Math.round(h)));

/** Task 028 (A.1): each role's order of rules, as the page lists it (rank() below is the order itself). */
export const ORDER: Record<"fighter" | "worker" | "none", [Rule, string][]> = {
  fighter: [["first", "an achievement on ⭐ first"], ["market", "a need bought on the Grand Exchange, with no worker on"], ["forging", "forging by need"], ["need-kill", "a kill a need of the road asks"], ["train-kill", "a kill a craft's training asks"], ["xp-pick", "the XP pick"], ["free", "no fight admitted, or the level cap: today's rule"]],
  // task 030: GEAR_FIRST on — tier (1) in two halves, weapons and armour first
  // task 031 (KITCHEN): the stock's cook step before the rest of (1a); the road's food in (1a); the kitchen's levels in (3)
  // task 038 (docs/season-plan.md 5: the workers are for the fighters' food first): the stock's cook step and the fighters' food
  // (a stage piece beside it) before the craft's batch
  worker: [["market", "a need bought on the Grand Exchange"], ...(KITCHEN ? [["cook", "the bank's raw food, while a fighter rests"]] as [Rule, string][] : []), ["fed", "the fighters' food, a piece of their stage set beside it"], ["train", "its gear craft: a batch from the bank"], ...(GEAR_FIRST === "off" ? [["need", "a need of the fighters' road, or a tool"]] as [Rule, string][]
    : [["need", `weapons and armour for the fighters' road${KITCHEN ? ", its food" : ""}${GEAR_FIRST === "pick" ? ", the XP pick's consumables" : ""}`], ["need-cons", `the road's ${GEAR_FIRST === "pick" || KITCHEN ? "other " : ""}consumables, or a tool`]] as [Rule, string][]), ["short", `an objective done within ${WORKER_SHORT_H} h`], ["craft-ahead", KITCHEN ? "its gear craft ahead of the fighters, the kitchen's next food tier" : "its gear craft ahead of the fighters"], ["today", "today's rule in its lanes"], ["fallback", "the fallback: gather in its lanes"]],
  none: [["first", "an achievement on ⭐ first"], ["today", "today's rule"], ["fallback", "the fallback: gather"]],
};
/** Task 028: a candidate's reason before the rule that takes it is known. */
type Parts = Omit<Reason, "rule" | "role" | "next">;
/** The why's own clauses of a note (fightTake's), cut at "; " outside parentheses. */
function clauses(note: string): string[] {
  const out: string[] = [];
  let d = 0, cur = "";
  for (let i = 0; i < note.length; i++) {
    const c = note[i];
    if (c === "(") d++;
    else if (c === ")") d--;
    if (d === 0 && note.startsWith("; ", i)) { out.push(cur); cur = ""; i++; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}
const parts = (goal: string, forWho: string | undefined, because: (string | false | undefined)[], note = ""): Parts =>
  ({ goal, ...(forWho ? { for: forWho } : {}), because: because.filter((x): x is string => !!x), limits: clauses(note) });

interface Plan { work: Work; units: number; hours: number; place?: Place; until?: number; sources?: Source[]; withdraw?: Record<string, number>; toll?: Toll }

/** A chunk of an action work (kills, gathers): about CHUNK_SEC, at least 1, at most `left`, and inside an event's time.
 *  Task 017, settled point 3: behind conditional transitions (`spot.toll`) one trip, as much work as it carries — what one
 *  bag carries (`per` actions a unit), at most two chunks — so one fare pays one trip; the toll rides on the plan. `sec`
 *  holds the fare's price (the score's); the step's hours are its time, without it. */
function chunk(work: Work, sec: number, left: number, world: World, spot: { place: Place; until?: number; toll?: Toll }, ch: Character, per = perOf(work)): Plan | undefined {
  if (!Number.isFinite(sec) || sec <= 0) return undefined;
  const real = spot.toll ? Math.max(1e-6, sec - fareShare(ch, work, spot.toll.gold, world) * per) : sec;
  let units = spot.toll ? Math.min(left, Math.floor(bagActions(ch, work) / per + 1e-9), Math.max(1, Math.floor((2 * CHUNK_SEC) / real))) : Math.min(left, Math.max(1, Math.round(CHUNK_SEC / sec)));
  if (spot.until) units = Math.min(units, Math.floor((spot.until - world.now) / 1000 / real));
  units = Math.floor(units);
  return units >= 1 ? { work, units, hours: (units * real) / 3600, place: spot.place, until: spot.until, toll: spot.toll } : undefined;
}

/**
 * A craft or a buy: bank stock first. When `field` (one unit with nothing in the bank is all field work inside
 * 2 × CHUNK_SEC, supply.ts inStep) the shortfall is sourced inside the step, one level deep, as task 007 did;
 * otherwise the step only takes what the bank feeds (the rest comes through supply targets).
 */
function planMake(w: Work & { kind: "craft" | "buy" }, inputs: Input[], ch: Character, world: World, left: number, field: boolean): Plan | undefined {
  const here = placeOf(ch);
  const recipe = w.kind === "craft" ? item(w.code)?.craft : undefined;
  const spot = w.kind === "craft" ? recipe && nearestSpot(here, "workshop", recipe.skill, world) : nearestSpot(here, "npc", w.npc, world);
  if (!spot) return undefined;
  const own = w.kind === "craft" ? CRAFT_SEC / Math.max(1, recipe!.quantity) : 5;
  // task 016, settled point 10: a craft is made in whole runs — n of a recipe that makes q a run takes ceil(n ÷ q) runs'
  // ingredients (121 minor health potions, two a run: 61 runs, 122 nettle, not 121)
  const q = w.kind === "craft" ? Math.max(1, recipe!.quantity) : 1;
  const need = (per: number, n: number): number => Math.ceil(n / q - 1e-9) * q * per;
  const ins = inputs.map((i) => {
    const can = field && i.source.kind !== "craft" && i.gates.every((g) => met(g, ch, world));
    const per = perOf(i.source);
    return { i, avail: available(i.code, world, ch.name), field: can, per, margin: per > 1 ? 1.5 : 1, act: can ? actionSec(i.source, ch, world) : Infinity };
  });
  let max = Math.floor(Math.min(left, CHUNK_SEC / own));
  for (const x of ins) if (!x.field) max = Math.min(max, Math.floor(x.avail / (x.i.per * q) + 1e-9) * q);
  if (max < 1) return undefined;
  // shortcut: a drop or a rare gather is sourced at 1.5 × its expected actions, so a step rarely comes up short
  // task 014, settled point 9: what lies in a bag is not gathered a second time (the step's reset banks it first)
  const times = (x: (typeof ins)[number], n: number): number => Math.ceil(Math.max(0, need(x.i.per, n) - x.avail - (world.bags?.[x.i.code] ?? 0)) * x.per * x.margin - 1e-9);
  const fixed = stepSec(spot.place, here); // task 012: the reset, the walks and the deposit, once a step
  const sec = (n: number): number => ins.reduce((s, x) => s + (times(x, n) ? times(x, n) * x.act : 0), 0) + n * own + fixed;
  if (!(sec(1) <= 2 * CHUNK_SEC)) return undefined; // one unit longer than two chunks: supply targets carry it
  let lo = 1, hi = sec(1) > CHUNK_SEC ? 1 : max;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (sec(mid) <= CHUNK_SEC) lo = mid; else hi = mid - 1; }
  const sources = ins.filter((x) => times(x, lo) > 0);
  if (sources.length > 3) return undefined; // a step holds four items
  return {
    work: w, units: lo, hours: sec(lo) / 3600, place: spot.place,
    sources: sources.length ? sources.map((x) => ({ code: x.i.code, work: x.i.source, times: times(x, lo) })) : undefined,
    withdraw: Object.fromEntries(ins.filter((x) => x.avail > 0).map((x) => [x.i.code, Math.min(x.avail, Math.ceil(need(x.i.per, lo) - 1e-9))])),
  };
}

/** The chunk of an objective this character can do now, or undefined when it is not in reach. */
function planObjective(t: Target, ch: Character, world: World, left: number): Plan | undefined {
  if (!t.gates.every((g) => met(g, ch, world))) return undefined;
  const w = t.work;
  const here = placeOf(ch);
  switch (w.kind) {
    case "kill": case "gather": {
      // task 017: through the transitions this character's plan may open
      const spot = w.kind === "kill" ? nearestSpot(here, "monster", w.monster, world, ch.name) : nearestSpot(here, "resource", w.resource, world, ch.name);
      return spot && chunk(w, unitSec(t, ch, world), left, world, spot, ch);
    }
    case "craft": case "buy": return planMake(w, t.inputs ?? [], ch, world, left, inStep(t, world));
    case "task": return { work: w, units: 1, hours: unitSec(t, ch, world) / 3600 };
    case "recycle": {
      const lane = recycleLane(ch, world);
      if (!lane) return undefined;
      const L = levelOf(ch, lane);
      const spot = nearestSpot(here, "workshop", lane, world);
      const hours = hoursToLevel(lane, L, L + 1, world, ch);
      const { recycled } = craftsPerLevel(lane, L);
      if (!spot || !recycled || !Number.isFinite(hours)) return undefined;
      return { work: { kind: "train", lane }, units: Math.min(left, recycled), hours, place: spot.place };
    }
    default: return undefined; // favor, use, sell, level: interrupts, stage 5, events, level gates
  }
}

/** The work that levels a lane now: the best monster, the best node — or, where no node gives XP, the best recipe
 *  the character can feed (section 5: alchemy 12–19) — or one level of `train`. */
function planLevel(lane: Lane, ch: Character, world: World, bonus: Set<string>): (Plan & { what: string; covered?: boolean }) | undefined {
  const L = levelOf(ch, lane);
  if (lane === "combat") {
    const p = pickMonster(ch, world, bonus);
    const c = p && chunk({ kind: "kill", monster: p.monster }, p.sec, Infinity, world, p, ch);
    return c && { ...c, what: `${monsterName(p.monster)} at ${(p.xp / p.sec).toFixed(2)} XP/s` };
  }
  if (GATHER_LANES.includes(lane)) {
    const p = pickNode(lane, L, ch, world);
    if (!p) {
      const r = pickRecipe(lane, ch, world);
      const c = r && planMake({ kind: "craft", code: r.code }, r.inputs, ch, world, Infinity, true);
      return c && { ...c, what: `no node gives XP: ${itemName(r.code)} at ${Math.round(r.xph)} XP/h` };
    }
    const w: Work = { kind: "gather", resource: p.resource, drop: p.drop };
    const c = chunk(w, p.sec * perOf(w), Infinity, world, p, ch);
    return c && { ...c, what: `${itemName(p.drop)} at ${Math.round(p.xph)} XP/h` };
  }
  // task 029 (A.2, A.5): a gear craft trains on the one picker's recipe, a run count to the end of its level (train.ts)
  if (GEAR_CRAFT.includes(lane)) {
    const t = trainPlan(lane, ch, world);
    return t && { work: t.work, units: t.units, hours: t.hours, place: t.place, withdraw: t.withdraw, what: t.what, covered: t.covered };
  }
  if (TRAIN_LANES.includes(lane)) {
    const spot = nearestSpot(placeOf(ch), "workshop", lane, world);
    const hours = hoursToLevel(lane, L, L + 1, world, ch);
    return spot && Number.isFinite(hours) ? { work: { kind: "train", lane }, units: 1, hours, place: spot.place, what: `one level of ${lane} training` } : undefined;
  }
  return undefined;
}

/** The slots a step's set is worn in (task 009: artifacts, utilities and bags are not planned; task 025, settled point 5:
 *  the rune is — the healing rune a fight's solve wears). */
export const WEAR_SLOTS: GearSlot[] = GEAR_SLOTS.filter((g) => !g.startsWith("artifact") && !g.startsWith("utility") && g !== "bag");

/** Task 033 (A.3): a fighter's weapon stays a fighter's — the pieces each fighter's solved set for its XP pick holds (it does
 *  not wear or hold them yet) are out of a worker's pool, as a piece a running step booked is (stock.ts poolBank). The
 *  fighters' picks first: solved on their own pools, with the bonus of the kill objectives' monsters and the held task.
 *  shortcut: a road need's kill monster (rule 4's bonus, by the deciding character's leaves) is not in that bonus — it moves
 *  the pick only within 25%; upgrade if a fighter's pick and this one part. */
const pickHold = new WeakMap<World, Map<string, number> | null>();
setPoolOut((world, name) => {
  if (roleOf(name, world) !== "worker") return undefined;
  if (pickHold.has(world)) return pickHold.get(world);
  pickHold.set(world, null); // a pool asked while the sets are solved is the pool without them, and is not kept
  const out = new Map<string, number>();
  const cap = atlas()?.xpNeeded.length ?? Infinity;
  const kills = targetsOf(world).flatMap((t) => (t.work.kind === "kill" ? [t.work.monster] : []));
  for (const f of world.characters) {
    if (!isOn(f.name, world) || roleOf(f.name, world) !== "fighter" || f.level >= cap) continue;
    const task = monstersTask(f);
    const p = pickMonster(f, world, new Set(task ? [...kills, task] : kills));
    const set = p && fightRec(f, world, p.monster)?.slots;
    if (!set) continue;
    const has = ownedQtyOf(f, []), want = new Map<string, number>();
    for (const g of WEAR_SLOTS) if (set[g]) want.set(set[g]!, (want.get(set[g]!) ?? 0) + 1);
    for (const [c, n] of want) if (n > (has.get(c) ?? 0)) out.set(c, (out.get(c) ?? 0) + n - (has.get(c) ?? 0));
  }
  pickHold.set(world, out);
  return out;
});
/** The set a step's job wears from the character's pool: the fight solve's, else the gather argmax; none for the rest. */
function wearOf(w: Work, ch: Character, world: World): Record<string, string> | undefined {
  const set: Partial<Record<GearSlot, string>> | undefined =
    w.kind === "kill" ? fightRec(ch, world, w.monster)?.slots
    : w.kind === "gather" ? jobGear(ch, poolBank(world, ch.name), { kind: "gather", skill: resourceOf(w.resource)?.skill ?? "" })
    : undefined;
  if (!set) return undefined;
  const out: Record<string, string> = {};
  for (const g of WEAR_SLOTS) if (set[g]) out[g] = set[g]!;
  return out;
}

/** `need` (task 027): for a fighter's gear by need, a lane holder's tool (027c) or a consumable need — a worker's first tier. `out`: a worker's objective
 *  outside its lanes — its second tier only. */
/** Task 029: `train` — a leaf of a craft's training (train.ts); `covered` — a worker's train step whose batch the bank covers. */
/** Task 030: `gear` — a need of weapons and armour (a worker's tier (1a), GEAR_FIRST): a piece of gear work (a), a craft's training. */
/** Task 038: `fed` — a leaf of the kitchen's ask for the fighters' food (consumables.ts fedParents); `staged` — a piece on the
 *  stage's list, or a leaf of one (a worker's tier with the food). */
export interface Candidate { target: Target; step: Step; fit: number; any: number; need?: boolean; out?: boolean; road?: boolean; train?: boolean; covered?: boolean; gear?: boolean; fed?: boolean; staged?: boolean }
/** Task 032: `market` — every need with a sell order and the market's verdict (market.ts), with a market only. */
export interface Ranking { step: Step; objectives: Candidate[]; levels: Candidate[]; supply: Candidate[]; fillers: Candidate[]; lanes: Lane[]; market?: Offer[] }

/** Every candidate this character has now, scored, and the step decide() returns. */
export function rank(name: string, world: World, free = false): Ranking {
  const ch = world.characters.find((c) => c.name === name);
  if (!ch) throw new Error(`no character ${name}`);
  const cfg = world.config;
  const lanes = rolesFor(world)[name] ?? ["combat"];
  // Task 027: the role (fighter, worker, none) — what it forbids is no candidate (the module's header)
  // task 027b: `free` — today's rule for a fighter with no admitted fight (the role's filters off)
  const role = free ? undefined : roleOf(name, world), fighter = role === "fighter", worker = role === "worker";
  // 027d: a fighter holds a monsters task and earns coins with it — in its free pass too (027e: the rule at the level cap)
  const holder = roleOf(name, world) === "fighter";
  const cap = atlas()?.xpNeeded.length ?? Infinity; // 027e: the game's level cap (docs/api: a level is at most 50; the atlas's xpNeeded ends there)
  /** A worker's work outside its lanes (a work of no lane is inside; a kill is the admission rule's, below). */
  const outside = (w: Work): boolean => { const l = laneOfWork(w, ch, world); return worker && !!l && l !== "combat" && !lanes.includes(l); };
  /** Task 027g (A.2): a src: kill goes to a worker that is on and admitted for it (and reaches it): to a fighter only when none is. */
  const workerHunts = (monster: string): boolean => world.characters.some((c) => c.name !== name && isOn(c.name, world) && roleOf(c.name, world) === "worker" && admitted(c, world, monster) && !!nearestSpot(placeOf(c), "monster", monster, world, c.name));
  /** Task 029 (A.3): a training's src: kill is the fighters' while one that is on is admitted for it and reaches it (TRAIN_HUNT). */
  const trainHunt = cfg.trainHunt ?? TRAIN_HUNT;
  const kitchen = kitchenOn(world); // task 031, B
  const fighterHunts = (monster: string): boolean => world.characters.some((c) => isOn(c.name, world) && roleOf(c.name, world) === "fighter" && admitted(c, world, monster) && !!nearestSpot(placeOf(c), "monster", monster, world, c.name));
  // Task 015, settled point 4: while fewer than TIDY_BELOW bank slots are free, a tidy step goes before any other (task
  // 027: not a fighter's — bank.ts tidyStep)
  const tidy = tidyStep(world, name);
  const realRole = roleOf(name, world) as Reason["role"];
  if (tidy) return { step: { ...tidy, reason: { ...(realRole ? { role: realRole } : {}), rule: "tidy", goal: "free bank slots", because: [tidy.why.replace(/^tidy: /, "")], limits: [] } }, objectives: [], levels: [], supply: [], fillers: [], lanes };
  const targets = targetsOf(world);
  const calH = Math.max(0, (Date.parse(cfg.deadline) - world.now) / 3.6e6);
  const last = world.current[name];
  const others = Object.entries(world.current).filter(([n, s]) => n !== name && s).map(([, s]) => s!);
  const inFlight = (key: string): number => others.reduce((t, s) => t + (s.target === key && s.as !== "level" && s.as !== "fallback" ? s.units : 0), 0);
  /** Task 032: the units of a code the others' market purchases in flight bring (their target buy:<code>; none without a market). */
  const buying = (code: string): number => others.reduce((t, s) => t + (s.target === `buy:${code}` ? s.units : 0), 0);
  /** Task 012: the others' src: steps in flight in actions of the static source (supplyNeeds' unit) — each at its own
   *  node, so its actions are items at that node's rate first. */
  const srcInFlight = (key: string): number => {
    if (key === "src:tasks_coin") return coinsInFlight(others); // task 027d: the coins of the tasks the others turn in
    const st = key.startsWith("src:") ? sourceFor(key.slice(4)) : undefined;
    if (!st || typeof st === "string") return inFlight(key) + buying(key.slice(4));
    return others.reduce((t, s) => t + (s.target === key && s.as !== "level" && s.as !== "fallback" ? (s.units / perOf(s.work)) * perOf(st.work) : 0), 0) + buying(key.slice(4)) * perOf(st.work);
  };
  const objMonsters = targets.flatMap((t) => (t.work.kind === "kill" ? [t.work.monster] : []));
  // task 027g (A.1): a road need's src: kill monster joins it too (the supply loop, before rule 3's pick)
  const bonus = new Set(objMonsters);
  const held = holder ? monstersTask(ch) : undefined; // task 027d: of near-equal fights, the held task's (its kills count)
  if (held) bonus.add(held);
  const blocked = (key: string): boolean => (world.blocked[`${key}@${name}`]?.until ?? 0) > world.now;
  const pts = (code: string, p: number): number => p * (cfg.weight[code] ?? 1);
  const boost = (key: string): number => (last?.target === key ? 1.1 : 1);
  const stepOf = (t: Target, p: Plan & { wear?: Record<string, string> }, as: Answer, score: number, why: string, extra: Partial<Step> = {}, pt?: Parts): Step => {
    const n = last?.target === t.key ? Number(last.key.split("#").pop()) + 1 : 1;
    // task 017, settled point 2: the toll of the round trip (fares, keys, the carried item) is withdrawn — and reserved — by the step
    const tw = p.toll ? ` — the round trip through ${p.toll.via.length} conditional transition${p.toll.via.length === 1 ? "" : "s"} takes ${[...(p.toll.gold ? [`${p.toll.gold} gold`] : []), ...Object.entries({ ...p.toll.keys, ...p.toll.carried }).map(([c, q]) => `${q} ${itemName(c)}`)].join(" and ")}` : "";
    const reason: Reason | undefined = pt && { rule: "today", ...pt, limits: tw ? [...pt.limits, tw.slice(3)] : pt.limits };
    return { key: `${t.key}@${name}#${n}`, target: t.key, character: name, as, work: p.work, units: p.units, hours: p.hours, score, why: why + tw, place: p.place, sources: p.sources, withdraw: withToll(p.withdraw, p.toll), until: p.until, ...(p.wear ? { wear: p.wear } : {}), ...(p.toll ? { toll: p.toll } : {}), ...extra, ...(reason ? { reason } : {}) };
  };
  /** Task 014, settled point 4: a kill plan's consumables — its `withdraw`, its kills capped at what the stock a work of
   *  this score may reserve covers (`per` kills a unit); a set without potions when they cannot be stocked; undefined: no
   *  candidate. The note goes into the why. */
  const fightPlan = (p: Plan, per: number, fit: number, any: number, left: number): (Plan & { note: string; wear?: Record<string, string> }) | undefined => {
    if (p.work.kind !== "kill") return { ...p, note: "" };
    let tk = fightTake(world, ch, p.work.monster, p.units * per, fit, any);
    // task 017, settled point 13: a sliver — a potion the bank holds, the others' running steps off, for less than a third of
    // the chunk and fewer than SLIVER kills (not a bag cap, and not what better works' demand leaves. A third of a chunk
    // alone starved the roads in the replay — row E: no fighter past 30; row A: three of five). Task 027e (C.1): it no longer
    // refuses the step — the fight is planned with the set without that potion where it is still admitted (fightTake
    // `without`); else no candidate, and where the fight is the XP pick's the potion is a need of the road (consumables.ts (a))
    const thin = (t: Take): string[] => !(cfg.tolls ?? 1) ? [] : Object.entries(t.stocks ?? {}).filter(([, k]) => { const c = Math.floor(k / per + 1e-9); return c < p.units / 3 && c < (cfg.sliver ?? SLIVER); }).map(([code]) => code);
    const slivers = tk ? thin(tk) : [];
    if (slivers.length) { tk = fightTake(world, ch, p.work.monster, p.units * per, fit, any, slivers); if (tk && thin(tk).length) tk = undefined; }
    if (!tk) return undefined;
    // task 017: a step behind a toll is timed without the fare's price (in tk.sec through killWalk) and stays one bag
    const fare = p.toll ? fareShare(ch, p.work, p.toll.gold, world) * per : 0;
    const unit = tk.sec != null ? Math.max(1e-6, tk.sec * per - fare) : (p.hours * 3600) / p.units;
    const asked = tk.sec != null && !p.toll ? Math.max(1, Math.min(left, Math.round(CHUNK_SEC / unit))) : p.toll ? Math.min(p.units, Math.max(1, Math.floor((2 * CHUNK_SEC) / unit))) : p.units;
    const units = Math.min(asked, Math.max(Math.floor(tk.kills / per + 1e-9), tk.kills >= 1 ? 1 : 0));
    if (units < 1) return undefined;
    if (tk.sec == null && units === p.units && !tk.withdraw) return { ...p, note: tk.note }; // nothing changed (consumables 0: always)
    const k = (units * per) / Math.max(1, tk.kills); // the withdrawal was sized for tk.kills
    const withdraw = tk.withdraw && Object.fromEntries(Object.entries(tk.withdraw).map(([c, q]) => [c, Math.min(q, Math.ceil(q * k - 1e-9))]));
    const wear = tk.rec && Object.fromEntries(WEAR_SLOTS.filter((g) => tk.rec!.slots[g]).map((g) => [g, tk.rec!.slots[g]!]));
    return { ...p, units, hours: units === p.units && tk.sec == null ? p.hours : (units * unit) / 3600, withdraw, note: tk.note, wear };
  };

  /** Task 027d: a fighter's step for `short` coins of a parent (scored as the parent, as any supply leaf) — kills of its held
   *  monsters task, a chunk at a time, the step that finishes it turning it in at the master (`visit` end); a visit alone
   *  where it holds no task to work (none, a finished one, an items task, or one rule 4 cancels — tasks.ts cancelOf). */
  const coinCand = (short: number, par: Parent, t: Target, via: string[]): Candidate | undefined => {
    const fit = par.fit * boost(t.key), any = par.any * boost(t.key);
    const head = `coins: ${fmt(short)} short for ${par.label} (+${par.points} pts, chain ~${fmt(par.hours)} h)`;
    const cand = (p: Plan & { wear?: Record<string, string> }, why: string, pt: Parts, visit?: Step["visit"]): Candidate =>
      ({ target: t, step: stepOf(t, p, "supply", fit, why, { parent: par.key, ...(visit ? { visit } : {}) }, pt), fit, any, ...flags(via) });
    const goal = `tasks coins: ${fmt(short)} short`, chain = `+${par.points} pts, chain ~${fmt(par.hours)} h`;
    const cancel = cancelOf(ch, world);
    const tk = cancel ? undefined : monstersTask(ch);
    if (!tk) {
      const v = cancel ? { cancel: ch.task } : startVisit(ch, world);
      const sec = v ? visitSec(ch, world, v.cancel) : Infinity;
      if (!v || !Number.isFinite(sec)) return undefined;
      const what = v.cancel ? `cancels task ${taskText(ch)} for a coin (${cancel ?? "a fighter's items task"})` : ch.task ? `turns in task ${taskText(ch)}` : "holds no task";
      return cand({ work: { kind: "task" }, units: 1, hours: sec / 3600 }, `${head}; ${what}, takes a monsters task at the master (${fmt(sec / 3600)} h)`, parts(goal, par.label, [chain, `${what}, takes a monsters task at the master`]), { at: "start", ...v });
    }
    const left = ch.task_total - ch.task_progress, w: Work = { kind: "kill", monster: tk };
    const spot = nearestSpot(placeOf(ch), "monster", tk, world, name);
    const plan = (n: number) => { const c = spot && chunk(w, actionSec(w, ch, world), n, world, spot, ch); return c && fightPlan(c, 1, fit, any, n); };
    let f = plan(left);
    if (!f || !spot) return undefined;
    let end = f.units >= left, sec = end ? visitSec({ ...ch, ...spot.place } as Character, world) : 0;
    // the walk to the master stays inside the step's two chunks (a tolled spot's bagful is two): short of it, the task's end
    // is the next step's
    if (end && f.hours * 3600 + sec > 2 * CHUNK_SEC) {
      const g = plan(Math.min(left - 1, Math.floor((2 * CHUNK_SEC - sec) / ((f.hours * 3600) / f.units))));
      if (g) { f = g; end = false; sec = 0; }
    }
    const hours = f.hours + (Number.isFinite(sec) ? sec : 0) / 3600;
    return cand({ ...f, hours }, `${head}; task: ${taskText(ch)}, ${f.units} kills now${end ? ", turned in at the master" : ""} (${fmt(hours)} h)${f.note}`, parts(goal, par.label, [chain, `task: ${taskText(ch)}, ${f.units} kills now${end ? ", turned in at the master" : ""}`], f.note), end ? { at: "end" } : undefined);
  };

  const objectives: Candidate[] = [];
  const fillers: Candidate[] = [];
  for (const t of targets) {
    // task 013, settled point 1: a target with an event gate is never a step, live or not — its work is the interrupt's
    if (!t.achievement || blocked(t.key) || t.gates.some((g) => g.kind === "event")) continue;
    // task 027: a fighter's objective is a kill, a worker's never; a worker's filler stays inside its lanes
    if (fighter ? t.filler || t.work.kind !== "kill" : worker && (t.work.kind === "kill" || (t.filler && outside(t.work)))) continue;
    const left = t.left - inFlight(t.key);
    if (left <= 0) continue;
    const p0 = planObjective(t, ch, world, left);
    if (!p0) continue;
    const h = achHours(t.achievement, name, world);
    const fit = h <= calH ? 1 : 0;
    const any = (pts(t.achievement, t.points) / Math.max(h, 0.01)) * boost(t.key);
    const p = fightPlan(p0, t.work.kind === "kill" ? perOf(t.work) : 1, any * fit, any, left);
    if (!p) continue;
    const what = p.work.kind === "train" ? "recycled" : unitWord(t.work);
    const why = `${achievementOf(t.achievement)?.name ?? t.achievement}: ${left} ${what} left, +${t.points} pts in ~${fmt(h)} h; ${p.units} now (${fmt(p.hours)} h)${p.note}`;
    const pt = parts(`${achievementOf(t.achievement)?.name ?? t.achievement}: ${left} ${what} left`, undefined, [`+${t.points} pts in ~${fmt(h)} h`, `${p.units} now (${fmt(p.hours)} h)`], p.note);
    (t.filler ? fillers : objectives).push({ target: t, step: stepOf(t, p, t.filler ? "filler" : "objective", any * fit, why, {}, pt), fit: any * fit, any, ...(outside(t.work) ? { out: true } : {}) });
  }

  // Rule 3: per lane, the next gate behind which open achievements sit, and the bundle up to it (bundle.ts).
  const levels: Candidate[] = [];
  const levelCand = (lane: Lane, to: number, fit: number, any: number, why: (what: string, p: Plan) => string, need: boolean, pt: (what: string) => Omit<Parts, "limits">, gear = false): void => {
    // task 027: a fighter's level is combat, a worker's never; 027b: and a fighter's own gear craft where a needed piece asks it
    if (fighter ? lane !== "combat" && !(need && GEAR_CRAFT.includes(lane)) : worker && lane === "combat") return;
    if (to > (stageCraft(world, lane) ?? Infinity)) return; // task 036 (A.1): a gear craft is trained to the stage's number, not past it
    const t = targets.find((x) => x.key === `lvl:${lane}:${to}`) ?? { key: `lvl:${lane}:${to}`, points: 0, work: { kind: "level", lane, to }, left: 1, gates: [], filler: false };
    const had = levels.find((c) => c.target.key === t.key);
    if (had && need) had.need = true;
    if (had && gear) had.gear = true;
    if (blocked(t.key) || (had && had.fit >= fit * boost(t.key))) return;
    let p0 = planLevel(lane, ch, world, bonus);
    let p = p0 && fightPlan(p0, 1, fit * boost(t.key), any * boost(t.key), Infinity);
    // task 014: the pick's potions are held for better works — the road goes on at the pick of the gear alone
    if (p0 && !p && lane === "combat") p = (p0 = planLevel(lane, ch, gearWorld(world), bonus)) && fightPlan(p0, 1, fit * boost(t.key), any * boost(t.key), Infinity);
    if (!p0 || !p) return;
    const i = levels.findIndex((c) => c.target.key === t.key);
    if (i >= 0) levels.splice(i, 1);
    const lp = pt(p0.what);
    levels.push({ target: t, step: stepOf(t, p, "level", fit * boost(t.key), why(p0.what, p) + p.note, {}, { ...lp, because: [...lp.because, `${p.units} now (${fmt(p.hours)} h)`], limits: clauses(p.note) }), fit: fit * boost(t.key), any: any * boost(t.key), ...(need || had?.need ? { need: true } : {}), ...(gear || had?.gear ? { gear: true } : {}) });
  };

  // Gear by need (section 4) and supply through the bank (section 3).
  const parents: Parent[] = objectiveParents(world, name, calH);
  const supply: Candidate[] = [];
  // the parents that are a need: a fighter's — what it may forge (027b: its gear, 027c: a lane holder's tool) and every
  // consumable need; a worker's first tier (task 027e, B.1) — the fighters' road (gear work (a), the road's consumables) and
  // a lane holder's tool; a kill objective's piece or consumables (work (b)) rank in its fourth tier
  const needs = new Set<string>();
  const road = new Set<string>(); // task 027e: the parents of the fighters' road (A.3: a fighter's kill for one goes before its XP pick)
  const gearSide = new Set<string>(); // task 030: the parents of weapons and armour (a worker's tier (1a))
  /** A leaf's flags by every parent it serves (supply.ts `via`): a need, the fighters' road, weapons and armour. Task 033b:
   *  `road` (a fighter's kill in (3)) is a parent of the road but a craft's training — a leaf of a training alone is no fighter's. */
  const fedKeys = new Set<string>(); // task 038 (A.2): the kitchen's ask for the fighters' food — a worker's tier before the craft's
  const listed = new Set(stageOf(world)?.pieces ?? []); // task 038 (A.2): a piece of the fighters' stage set stands beside it
  const staged = (keys: string[]): boolean => keys.some((k) => k.startsWith("gear:") && listed.has(k.slice(5)));
  const flags = (via: string[]): Partial<Candidate> => ({ ...(via.some((k) => needs.has(k)) ? { need: true } : {}), ...(via.some((k) => road.has(k) && !k.startsWith("train:")) ? { road: true } : {}), ...(via.some((k) => gearSide.has(k)) ? { gear: true } : {}), ...(via.some((k) => fedKeys.has(k)) ? { fed: true } : {}), ...(staged(via) ? { staged: true } : {}) });
  const roadPieces = new Set(gearNeeds(world, name).needs.filter((n) => n.offered && n.key.startsWith("lvl:combat:")).flatMap((n) => [...n.pieces.keys()])); // gear.ts (a)
  // Task 029 (A.1): a gear craft's next level under the target is a parent of supply, a need of the fighters' road (train.ts);
  // a worker's own craft in training has one train step (below): a piece's or a chain's level of it up to the target is that one
  const target = (lane: Lane): number => craftTarget(world, lane); // task 036 (A.1): the stage's number of each craft
  const trains = trainParents(world, name, calH);
  const ownTrain = new Set(worker ? trains.map((p) => p.key.slice(6) as Lane).filter((l) => lanes.includes(l)) : []);
  const mneeds: MarketNeed[] = []; // task 032: the needs the market may serve — a piece one copy a wearer, a leaf's shortfall
  for (const [code, piece] of gearPieces(world, name)) {
    const { copies, works, best: n } = piece;
    const qty = [...copies.values()].reduce((s, x) => s + x, 0) - inFlight(`gear:${code}`) - buying(code);
    if (qty <= 0) continue;
    const par = pieceParent(code, piece, qty, world, name);
    parents.push(par);
    mneeds.push({ key: par.key, code, units: Math.min(qty, copies.size), label: par.label, fit: par.fit, any: par.any, ...(piece.bought ? { bought: true } : {}) });
    const tool = item(code)!.subtype === "tool";
    const need = tool || [...copies.keys()].some((who) => roleOf(who, world) === "fighter"); // 027c (Alex): a lane holder's tool too
    if (fighter ? need : tool || roadPieces.has(code)) needs.add(par.key);
    if (roadPieces.has(code)) road.add(par.key);
    if (roadPieces.has(code) && !tool) gearSide.add(par.key);
    if (piece.bought) continue; // task 032c: bought by the market's step, never made — no craft step, no craft level
    const r = item(code)!.craft!;
    if (crafterOf(r.skill, world) !== name || (fighter && !need)) continue; // task 027b: a fighter forges only what a fighter needs (027c: or a tool)
    const why = `${itemName(code)} ×${qty} for ${[...works].map(([who, w]) => `${who} (${w})`).join(", ")} — the best: ${n.for}, ${n.work}: H0 ${fmt(n.H0)} h, with it ${fmt(n.H1)} h + ${fmt(n.G)} h to make; +${n.points} pts behind it`;
    if (levelOf(ch, r.skill as Lane) < r.level) {
      if (!(ownTrain.has(r.skill as Lane) && r.level <= target(r.skill as Lane))) levelCand(r.skill as Lane, r.level, n.fit, n.any, (what, p) => `${r.skill} ${levelOf(ch, r.skill as Lane)} → ${r.level} for gear: ${why}; ${what}, ${p.units} now (${fmt(p.hours)} h)`, needs.has(par.key),
        (what) => ({ goal: `${r.skill} ${levelOf(ch, r.skill as Lane)} → ${r.level}`, for: n.for, because: [`for ${itemName(code)} ×${qty} (${n.work}): H0 ${fmt(n.H0)} h, with it ${fmt(n.H1)} h + ${fmt(n.G)} h to make; +${n.points} pts behind it`, what] }), gearSide.has(par.key));
      continue;
    }
    const key = `gear:${code}`;
    const spot = nearestSpot(placeOf(ch), "workshop", r.skill, world);
    const runs = Math.min(qty, feedable(code, world, name));
    if (blocked(key) || !spot || runs < 1) continue;
    const t: Target = { key, points: 0, work: { kind: "craft", code }, left: qty, gates: [], filler: false };
    const p: Plan = { work: t.work, units: runs, hours: (runs * CRAFT_SEC + stepSec(spot.place, placeOf(ch))) / 3600, place: spot.place, withdraw: Object.fromEntries(recipeDemand(code, runs)) };
    const pt = parts(`${itemName(code)} ×${qty}`, [...works.keys()].join(", "), [`the best: ${n.for}, ${n.work}: H0 ${fmt(n.H0)} h, with it ${fmt(n.H1)} h + ${fmt(n.G)} h to make`, `+${n.points} pts behind it`, `${runs} now`]);
    supply.push({ target: t, step: stepOf(t, p, "supply", n.fit * boost(key), `gear: ${why}; ${runs} now`, { parent: n.key, for: n.for }, pt), fit: n.fit * boost(key), any: n.any * boost(key), ...(needs.has(par.key) ? { need: true } : {}), ...(gearSide.has(par.key) ? { gear: true } : {}), ...(staged([key]) ? { staged: true } : {}) });
  }
  // task 014, settled point 3: potions and food by need, parents of supply with the score of the work they are for
  for (const p of consParents(world, name)) {
    parents.push(p);
    const r = p.key.includes(":lvl:combat:"); // consumables.ts work (a): a fighter's road (027e: the consumables of the XP pick)
    if (fighter || r) needs.add(p.key);
    if (r) road.add(p.key);
    if (r && kitchen && item(p.key.split(":")[1])?.type === "consumable") gearSide.add(p.key); // task 031 (B.2): the road's food is (1a)
  }
  for (const p of trains) { parents.push(p); needs.add(p.key); road.add(p.key); gearSide.add(p.key); }
  // task 038 (A.1): short of what the fighters' picks burn over the kitchen's horizon, the raw of the food with the most healing
  // a worker-second — a worker's (a fighter fights for XP or its stage set: no fighter's step)
  if (!fighter) for (const p of fedParents(world)) { parents.push(p); fedKeys.add(p.key); }
  const leaves = supplyNeeds(world, name, parents, srcInFlight);
  // task 032: a leaf's shortfall in items (a src: leaf's is actions); the leaf of a consumables parent or of an objective that
  // makes a potion or a food is their ingredient (rule 1)
  const consumable = (code: string): boolean => ["utility", "consumable"].includes(item(code)?.type ?? "");
  const consK = (k: string): boolean => k.startsWith("cons:") || targets.some((t) => t.key === k && (t.work.kind === "craft" || t.work.kind === "buy") && consumable(t.work.code));
  if (world.market) for (const l of leaves) if (l.code !== "tasks_coin") mneeds.push({ key: l.key, code: l.code, units: Math.ceil((l.kind === "src" ? l.short / perOf(l.work) : l.short) - 1e-9), label: l.parent.label, fit: l.parent.fit, any: l.parent.any, via: l.via, ...(l.via.some(consK) ? { cons: true } : {}) });
  const offers = world.market ? marketOffers(world, name, mneeds) : [];
  /** Task 027g (A.1): the monsters the other fighters' XP picks fight now — each with a road need's src: kill monster in its
   *  bonus (by its own source), as its own decision has it — what comes along with a pick (its drops) stays a fighter's. */
  let picks: Map<string, string> | undefined; // fighter → the monster of its XP pick now
  const picksNow = (): Map<string, string> => (picks ??= new Map(world.characters.filter((f) => f.name !== name && isOn(f.name, world) && roleOf(f.name, world) === "fighter" && f.level < cap).flatMap((f) => {
    const b = new Set(objMonsters), task = monstersTask(f);
    if (task) b.add(task);
    for (const l of leaves) if (l.kind === "src" && l.code !== "tasks_coin" && l.via.some((k) => road.has(k))) { const s = pickSource(l.code, f, world); if (s?.work.kind === "kill") b.add(s.work.monster); }
    const p = pickMonster(f, world, b);
    return p ? [[f.name, p.monster] as [string, string]] : [];
  })));
  const along = (monster: string): boolean => [...picksNow().values()].includes(monster);
  // task 030 (A, `pick`): the consumables of a fighter's XP pick of today rank with the weapons and armour (tier (1a))
  const gearFirst = cfg.gearFirst ?? GEAR_FIRST;
  if (worker && gearFirst === "pick") for (const n of consumableNeeds(world, name)) if (road.has(n.key) && picksNow().get(n.for[0]) === n.monster) gearSide.add(n.key);
  for (const s of leaves) {
    // task 013, settled point 1: an event-only material is the event interrupt's work, never a step
    if (blocked(s.key) || s.gates.some((g) => g.kind === "event")) continue;
    if (fighter && s.kind !== "src") continue; // task 027: a fighter's supply is a src: kill
    const par = s.parent;
    const t: Target = { key: s.key, points: 0, work: s.work, left: s.short, gates: s.gates, filler: false };
    if (s.code === "tasks_coin") { // task 027d: coins are a fighter's work — its held task's kills
      // task 033 (A.2): a worker's where no fighter's held task is its XP pick (the fighter's own filter: its branch, below)
      const rides = (): boolean => [...picksNow()].some(([f, m]) => monstersTask(world.characters.find((c) => c.name === f)!) === m);
      const c = holder || (worker && !rides()) ? coinCand(s.short, par, t, s.via) : undefined;
      if (c) supply.push(c);
      continue;
    }
    let p: (Plan & { wear?: Record<string, string> }) | undefined, node = "", note = "";
    const tr = s.via.some((k) => k.startsWith("train:")); // task 029: a leaf of a craft's training
    if (s.kind === "src") {
      // task 012, settled point 7: the node (or monster) is this character's — the least net seconds an item
      const src = pickSource(s.code, ch, world);
      if (!src) continue;
      // task 027g (A.1): a road need's kill monster joins a fighter's pick bonus — within 25% of the pick's rate it is the pick
      if (holder && src.work.kind === "kill" && s.via.some((k) => road.has(k))) bonus.add(src.work.monster);
      // task 027 (pickSource admits at the floor); 027g (A.2): a worker hunts any src: kill it is admitted for, but what comes
      // along with a fighter's pick
      // task 029 (A.3): a training's kill is the fighters' while one is admitted (TRAIN_HUNT) — the workers are the crafters
      if (fighter ? src.work.kind !== "kill" : worker && src.work.kind === "kill" && (along(src.work.monster) || (trainHunt && tr && fighterHunts(src.work.monster)))) continue;
      const items = s.short / perOf(s.work); // short is in actions of the static source (supplyNeeds)
      const acts = Math.ceil(items * src.per - 1e-9);
      const c = chunk(src.work, src.sec, acts, world, src, ch, 1);
      const f = c && fightPlan(c, 1, par.fit * boost(s.key), par.any * boost(s.key), acts);
      if (!f) continue;
      p = f;
      note = f.note;
      const what = src.work.kind === "gather" ? resourceOf(src.work.resource)?.name ?? src.work.resource : monsterName(src.work.monster);
      node = `; ${what}: ${Math.round(src.xp)} ${src.lane} XP ${src.work.kind === "gather" ? "a gather" : "a kill"}${src.share >= 1 ? ", the lane's best" : src.share > 0 ? `, ${Math.round(100 * src.share)}% of the lane's best` : ""}${src.over ? ` (over ${src.over}: the XP share decided)` : ""}`;
    } else if (s.work.kind === "buy") {
      // a trade (hard leather for cowhide): the currency from the bank, a bagful at most
      const w = s.work;
      const spot = nearestSpot(placeOf(ch), "npc", w.npc, world);
      const n = Math.min(Math.ceil(s.short - 1e-9), feedable(s.code, world, name), Math.floor(ch.inventory_max_items / (w.price + 1)));
      if (spot && n >= 1) p = { work: w, units: n, hours: (5 + stepSec(spot.place, placeOf(ch))) / 3600, place: spot.place, withdraw: { [w.currency]: n * w.price } };
    } else {
      const r = item(s.code)?.craft;
      const spot = r && nearestSpot(placeOf(ch), "workshop", r.skill, world);
      if (!r || !spot || !mayCraft(r.skill as Lane, r.level, name, world)) continue;
      const q = Math.max(1, r.quantity);
      const runs = Math.min(Math.ceil(s.short / q - 1e-9), feedable(s.code, world, name), Math.floor(CHUNK_SEC / CRAFT_SEC));
      if (runs >= 1) p = { work: s.work, units: runs * q, hours: (runs * CRAFT_SEC + stepSec(spot.place, placeOf(ch))) / 3600, place: spot.place, withdraw: Object.fromEntries(recipeDemand(s.code, runs)) };
    }
    if (!p) continue;
    const unit = s.kind === "src" ? (p.work.kind === "kill" ? "kills" : "gathers") : "made";
    const why = `${itemName(s.code)}: ${fmt(s.short)} ${s.kind === "src" ? "actions" : ""} short for ${par.label} (+${par.points} pts, chain ~${fmt(par.hours)} h)${node}; ${p.units} ${unit} now (${fmt(p.hours)} h)${note}`;
    // task 013, settled point 9: the answer is prefixed once, where the chosen step's why is made ("supply: supply:")
    const pt = parts(`${itemName(s.code)}: ${fmt(s.short)}${s.kind === "src" ? " actions" : ""} short`, par.label, [`+${par.points} pts, chain ~${fmt(par.hours)} h`, node.slice(2), `${p.units} ${unit} now (${fmt(p.hours)} h)`], note);
    supply.push({ target: t, step: stepOf(t, p, "supply", par.fit * boost(s.key), why.replace("  ", " "), { parent: par.key }, pt), fit: par.fit * boost(s.key), any: par.any * boost(s.key), ...flags(s.via), ...(outside(p.work) ? { out: true } : {}), ...(tr ? { train: true } : {}) });
  }
  // Task 012, settled point 8: a craft of a parent's chain gated at a level nobody that may craft it has — the level is
  // a candidate for this lane's role holders, carrying the parent's score (as a crafter's missing level for gear).
  for (const par of parents) for (const g of par.gated ?? []) {
    if (!Number.isFinite(g.hours) || !lanes.includes(g.lane) || (ownTrain.has(g.lane) && g.level <= target(g.lane))) continue;
    levelCand(g.lane, g.level, par.fit, par.any, (what, p) => `${g.lane} ${levelOf(ch, g.lane)} → ${g.level} for ${itemName(g.code)} in the chain of ${par.label} (+${par.points} pts, chain ~${fmt(par.hours)} h, of it the road ${fmt(g.hours)} h by ${g.who}); ${what}, ${p.units} now (${fmt(p.hours)} h)`, needs.has(par.key),
      (what) => ({ goal: `${g.lane} ${levelOf(ch, g.lane)} → ${g.level}`, for: par.label, because: [`for ${itemName(g.code)} in its chain: +${par.points} pts, chain ~${fmt(par.hours)} h, of it the road ${fmt(g.hours)} h by ${g.who}`, what] }), gearSide.has(par.key));
  }

  // Rule 3: per lane, the next gate behind which open achievements sit, and the bundle up to it (bundle.ts) — task 027g: after
  // the supply loop, whose road kills join the pick's bonus
  for (const lane of lanes) {
    const b = bundleOf(lane, name, world);
    if (!b || !Number.isFinite(b.hGate)) continue; // section 2: no XP source up to the gate — no candidate
    const s = bundleScore(b, b.hGate, calH);
    const L = levelOf(ch, lane);
    const to = b.wall ?? b.next;
    const road = b.wall ? `its road ends at ${b.wall} (no XP source there; ${fmt(b.hGate)} h to the gate at the pace before it)` : `${fmt(b.hGate)} h to the gate`;
    // task 013: an event achievement behind the gate says by how many spawns of what, with how many members
    const evs = b.events.map((e) => `; ${e.code} behind it, by ${e.spawns} spawns of ${e.event}, about ${fmt(e.days)} days with ${e.members} ${e.members === 1 ? "member" : "members"}`).join("");
    levelCand(lane, to, s.fit, s.any, (what, p) => `${lane} ${L} → ${b.next}: +${s.points} pts behind it (${b.behind.map((x) => x.code).join(", ")}), ${road}${evs}; ${what}, ${p.units} now (${fmt(p.hours)} h)`, false,
      (what) => ({ goal: `${lane} ${L} → ${b.next}`, because: [`+${s.points} pts behind it (${b.behind.length} achievement${b.behind.length === 1 ? "" : "s"}), ${road}${evs}`, what] }));
  }

  const byScore = (k: "fit" | "any") => (a: Candidate, b: Candidate): number => b[k] - a[k] || (a.target.key < b.target.key ? -1 : a.target.key > b.target.key ? 1 : 0);
  const top = (pool: Candidate[], k: "fit" | "any"): Candidate | undefined => {
    const best = pool.filter((c) => c[k] > 0).sort(byScore(k))[0];
    return best && { ...best, step: { ...best.step, score: best[k], why: k === "any" ? `${best.step.why} (nothing fits the deadline: points per hour)` : best.step.why } };
  };
  // Task 015, settled point 5: no slot, nothing to tidy, no purchase — a step that would bring a new code is no candidate
  const stuck = bankStuck(world, name);
  const fresh = (c: Candidate): boolean => !stuck || !newCodes(c.step, world).length;
  const all = [...objectives, ...levels, ...supply].filter(fresh);
  const real = all.filter((c) => !c.out); // task 027: today's rule — a worker's inside its lanes
  if (stuck) fillers.splice(0, fillers.length, ...fillers.filter(fresh));
  const firsts = real.filter((c) => c.target.achievement && cfg.first.includes(c.target.achievement));
  // Task 011, settled point 1: filler that fits goes before a road that fits nothing (the road takes the fallback's hours)
  const realAny = real.some((c) => c.any > 0);
  const best = top(firsts, "fit") ?? top(firsts, "any") ?? top(real, "fit");
  const fill = best ? undefined : top(fillers, "fit");
  const late = best || fill ? undefined : top(real, "any");
  const fillAny = best || fill || late ? undefined : top(fillers, "any");
  const chosen = best ?? late;
  const today = (): Step => chosen ? { ...chosen.step, why: `${chosen.step.as}: ${chosen.step.why}` }
    : fill ? { ...fill.step, why: `filler (${realAny ? "nothing else fits the deadline" : "nothing else scores"}): ${fill.step.why}` }
    : fillAny ? { ...fillAny.step, why: `filler (nothing else scores): ${fillAny.step.why}` }
    : fallback(ch, world, last, worker ? lanes : undefined);
  const todayRule = (): Rule => chosen ? (firsts.some((c) => c.target.key === chosen.target.key) ? "first" : "today") : fill || fillAny ? "today" : "fallback";

  // Task 027: a worker's tiers before today's rule; a fighter's XP pick where nothing ranks
  const tier = (pool: Candidate[], label: string): Step | undefined => {
    const c = top(pool, "fit") ?? top(pool, "any");
    return c && { ...c.step, why: `worker, ${label}: ${c.step.as}: ${c.step.why}` };
  };
  // task 027e (B.3): the gear craft ahead of the fighters — the tier they wear next: the highest fighter's combat level + 5,
  // down to a multiple of 5 (the gear's tiers), at least WORKER_CRAFT (task 029: train.ts craftTarget)
  const fighterTop = Math.max(0, ...world.characters.filter((c) => isOn(c.name, world) && roleOf(c.name, world) === "fighter").map((c) => c.level));
  const stage = stageOf(world);
  const ahead = (): Lane | undefined => lanes.find((l) => GEAR_CRAFT.includes(l) && levelOf(ch, l) < target(l));
  const craftTo = (): Step | undefined => {
    const lane = ahead(), craftLevel = lane ? target(lane) : 0;
    const key = `lvl:${lane}:${craftLevel}`;
    const p = lane && !blocked(key) ? planLevel(lane, ch, world, bonus) : undefined;
    if (!lane || !p) return undefined;
    const t: Target = targets.find((x) => x.key === key) ?? { key, points: 0, work: { kind: "level", lane, to: craftLevel }, left: 1, gates: [], filler: false };
    const s = stepOf(t, p, "level", 0, `worker, craft to ${craftLevel}: ${lane} ${levelOf(ch, lane)} → ${craftLevel}: ${p.what}, ${p.units} now (${fmt(p.hours)} h)`, {},
      parts(`${lane} ${levelOf(ch, lane)} → ${craftLevel}`, "the fighters' next tier", [stageCraft(world, lane) != null ? `the stage ${stage!.name}` : `the top fighter's combat ${fighterTop} + 5`, p.what, `${p.units} now (${fmt(p.hours)} h)`]));
    return !stuck || !newCodes(s, world).length ? s : undefined;
  };
  // task 031 (B.4): the kitchen's fishing and cooking to the next food tier (consumables.ts nextFoodTier), beside its gear craft
  // in tier (3) — today's scoring among them (each lane's best level candidate of rule 3, fit then points per hour; none
  // scores: the gear craft first, as before)
  const tier3 = (): Step | undefined => {
    const lane0 = ahead();
    const cands: { step: Step; lane: Lane }[] = [];
    const g = craftTo();
    if (g && lane0) cands.push({ step: g, lane: lane0 });
    const T = kitchen && lanes.includes("cooking") ? nextFoodTier(ch, lanes) : undefined;
    if (T != null) for (const lane of ["fishing", "cooking"] as Lane[]) {
      const key = `lvl:${lane}:${T}`;
      if (!lanes.includes(lane) || levelOf(ch, lane) >= T || blocked(key)) continue;
      const p = planLevel(lane, ch, world, bonus);
      if (!p) continue;
      const t: Target = targets.find((x) => x.key === key) ?? { key, points: 0, work: { kind: "level", lane, to: T }, left: 1, gates: [], filler: false };
      const s = stepOf(t, p, "level", 0, `worker, the kitchen to ${T}: ${lane} ${levelOf(ch, lane)} → ${T}: ${p.what}, ${p.units} now (${fmt(p.hours)} h)`, {},
        parts(`${lane} ${levelOf(ch, lane)} → ${T}`, "the kitchen's next food tier", [`fishing and cooking ${T}: a fish and its food open there`, p.what, `${p.units} now (${fmt(p.hours)} h)`]));
      if (!stuck || !newCodes(s, world).length) cands.push({ step: s, lane });
    }
    const score = (lane: Lane): [number, number] => levels.filter((c) => c.target.key.startsWith(`lvl:${lane}:`)).reduce(([f, a], c) => [Math.max(f, c.fit), Math.max(a, c.any)], [0, 0]);
    const ranked = cands.map((c, i) => ({ ...c, i, s: score(c.lane) })).sort((a, b) => b.s[0] - a.s[0] || b.s[1] - a.s[1] || a.i - b.i);
    return ranked[0]?.step;
  };
  // task 031 (B.3): the stock first — the bank's raw food that a hungry fighter would eat and this worker may cook, the most
  // healing first, a chunk at a time (consumables.ts stockCook)
  const cookStep = (): Step | undefined => {
    const c = stockCook(world, name);
    const r = c && item(c.code)?.craft;
    const spot = r && nearestSpot(placeOf(ch), "workshop", r.skill, world);
    const key = c && `mat:${c.code}`;
    if (!c || !r || !spot || !key || blocked(key)) return undefined;
    const n = c.runs * Math.max(1, r.quantity);
    const t: Target = { key, points: 0, work: { kind: "craft", code: c.code }, left: n, gates: [], filler: false };
    const p: Plan = { work: t.work, units: n, hours: (c.runs * CRAFT_SEC + stepSec(spot.place, placeOf(ch))) / 3600, place: spot.place, withdraw: Object.fromEntries(recipeDemand(c.code, c.runs)) };
    // no parent: it serves the fighters' running steps, not a need's demand (a chunk, whatever the horizon)
    const s = stepOf(t, p, "supply", 0, `${itemName(c.code)} ×${n} from the bank's raw for ${c.for.join(", ")}: their fight steps rest or take too little food; ${n} made now (${fmt(p.hours)} h)`, {},
      parts(`${itemName(c.code)} ×${n}`, c.for.join(", "), ["the bank's raw food first: their fight steps rest or take too little food", `${n} made now (${fmt(p.hours)} h)`]));
    return !stuck || !newCodes(s, world).length ? { ...s, why: `worker, the stock first: supply: ${s.why}` } : undefined;
  };
  // task 032: the market's best purchase (its parent's score) — [deposit-all, the purchase at the exchange, deposit-all]
  const buyStep = (): Step | undefined => {
    // a leaf whose every parent is a piece bought itself is not bought: the piece is
    const pieces = new Set(offers.filter((x) => x.rule === 0 && x.key.startsWith("gear:")).map((x) => x.key));
    const o = offers.filter((x) => x.rule === 0 && x.place && !blocked(`buy:${x.code}`) && !(x.via?.length && x.via.every((k) => pieces.has(k)))).sort((a, b) => b.fit - a.fit || b.any - a.any || (a.key < b.key ? -1 : 1))[0];
    if (!o) return undefined;
    const t: Target = { key: `buy:${o.code}`, points: 0, work: { kind: "buy", code: o.code, npc: "grand_exchange", currency: "gold", price: o.ask, order: o.order.id, ...(o.ref ? { ref: o.ref.price } : {}) }, left: o.units, gates: [], filler: false };
    const p: Plan = { work: t.work, units: o.units, hours: (stepSec(o.place, placeOf(ch)) + 5) / 3600, place: o.place, withdraw: { gold: o.gold } };
    const s = stepOf(t, p, "supply", o.fit > 0 ? o.fit : o.any, `${o.why}; for ${o.label}`, { parent: o.key }, parts(`${itemName(o.code)} ×${o.units}`, o.label, [o.why]));
    return !stuck || !newCodes(s, world).length ? s : undefined;
  };
  const xpPick = (): Step | undefined => {
    // the combat level's candidate: the same pick — task 038: a fresh one (no slot, nothing to tidy: no new code), as every tier
    const c = levels.find((x) => x.target.key.startsWith("lvl:combat:") && fresh(x));
    const goal = `combat ${levelOf(ch, "combat")} → ${Number.isFinite(cap) ? cap : levelOf(ch, "combat") + 1}`; // 027e: a fighter's level is a goal in itself
    if (c) return { ...c.step, why: `the XP pick: ${c.step.why}`, ...(c.step.reason ? { reason: { ...c.step.reason, goal, for: name } } : {}) };
    const L = levelOf(ch, "combat"), key = `lvl:combat:${L + 1}`;
    if (blocked(key)) return undefined;
    let p0 = planLevel("combat", ch, world, bonus);
    let p = p0 && fightPlan(p0, 1, 0, 0, Infinity);
    if (p0 && !p) p = (p0 = planLevel("combat", ch, gearWorld(world), bonus)) && fightPlan(p0, 1, 0, 0, Infinity);
    if (!p0 || !p) return undefined;
    const t: Target = { key, points: 0, work: { kind: "level", lane: "combat", to: L + 1 }, left: 1, gates: [], filler: false };
    const s = stepOf(t, p, "level", 0, `the XP pick: combat ${L}: ${p0.what}, ${p.units} now (${fmt(p.hours)} h)${p.note}`, {}, parts(goal, name, [p0.what, `${p.units} now (${fmt(p.hours)} h)`], p.note));
    return !stuck || !newCodes(s, world).length ? s : undefined;
  };
  let step: Step, rule: Rule;
  if (worker) {
    // Task 029 (A.4): its gear craft's train step is a need of the first tier while the craft is under the target — first when
    // the bank covers a batch (the crafts alone), else after the tier's other needs (what the bank lacks it sources itself)
    const trainC: Candidate[] = [];
    for (const par of trains) {
      const lane = par.key.slice(6) as Lane, key = `lvl:${lane}:${target(lane)}`;
      const p = ownTrain.has(lane) && !blocked(key) ? planLevel(lane, ch, world, bonus) : undefined;
      if (!p) continue;
      const t: Target = targets.find((x) => x.key === key) ?? { key, points: 0, work: { kind: "level", lane, to: target(lane) }, left: 1, gates: [], filler: false };
      const c: Candidate = {
        target: t, fit: par.fit, any: par.any, need: true, ...(p.covered ? { covered: true } : {}),
        step: stepOf(t, p, "level", par.fit, `${lane} ${levelOf(ch, lane)} → ${target(lane)} for the fighters' next tier (+${par.points} pts behind it): ${p.what}, ${p.units} now (${fmt(p.hours)} h)`, {},
          parts(`${lane} ${levelOf(ch, lane)} → ${target(lane)}`, "the fighters' next tier", [`+${par.points} pts behind it`, p.what, `${p.units} now (${fmt(p.hours)} h)`])),
      };
      if (fresh(c)) trainC.push(c);
    }
    const short = objectives.filter((c) => fresh(c) && achHours(c.target.achievement!, name, world) <= WORKER_SHORT_H);
    const buy = buyStep(); // task 032: a need bought on the Grand Exchange, before all else
    // task 038 (A.2): the fighters' food first — the stock's cook step (task 031, B.3), then the kitchen's ask for raw with a
    // piece of the fighters' stage set beside it (today's scoring; a food leaf with no score is taken by its key)
    const cook = !kitchen ? undefined : cookStep();
    const fedC = all.filter((c) => c.fed || c.staged);
    const fc = cook ? undefined : top(fedC, "fit") ?? top(fedC, "any") ?? fedC.filter((c) => c.fed).sort((a, b) => (a.target.key < b.target.key ? -1 : 1))[0];
    const feed = fc && { ...fc.step, why: `worker, the fighters' food: ${fc.step.as}: ${fc.step.why}` };
    const batch = cook || feed ? undefined : tier(trainC.filter((c) => c.covered), "a batch from the bank");
    // task 030 (A): GEAR_FIRST on — (1a) weapons and armour, its own train step last; (1b) the rest only when (1a) has none
    const needC = all.filter((c) => c.need), off = gearFirst === "off";
    const need = batch || cook || feed ? undefined : tier(off ? needC : needC.filter((c) => c.gear), "a need") ?? tier(trainC, "a need");
    const cons = batch || cook || feed || need || off ? undefined : tier(needC.filter((c) => !c.gear), "a need (consumables or a tool)");
    const sh = batch || cook || feed || need || cons ? undefined : tier(short, `done within ${WORKER_SHORT_H} h`);
    const ca = batch || cook || feed || need || cons || sh ? undefined : tier3();
    step = (buy && { ...buy, why: `worker, the market: ${buy.as}: ${buy.why}` }) ?? cook ?? feed ?? batch ?? need ?? cons ?? sh ?? ca ?? (({ why, ...s }) => ({ ...s, why: `worker: ${why}` }))(today());
    rule = buy ? "market" : cook ? "cook" : feed ? "fed" : batch ? "train" : need ? "need" : cons ? "need-cons" : sh ? "short" : ca ? "craft-ahead" : todayRule();
  } else if (fighter) {
    // task 027e (Alex: a fighter's level is a goal in itself), an order of work: (1) an achievement on config.first; (2)
    // forging by need (027b: one weapon speeds every fighter); (3) a kill a need of a fighter's road asks (a src: kill or
    // 027d's coins for gear work (a) or the road's consumables); (4) the XP pick — the ×1.25 of an open objective's monster
    // and of the held task's stays, so kill achievements come along; (5) with no admitted fight that gives XP, or at the
    // game's level cap (docs/api: a character's level is at most 50, where the atlas's xpNeeded ends), today's rule over the
    // whole list (027b's free pass), kill objectives included
    const pick = (pool: Candidate[]): Candidate | undefined => top(pool, "fit") ?? top(pool, "any");
    const capped = ch.level >= cap;
    const x = capped ? undefined : xpPick();
    // task 035 (docs/season-plan.md 6): with an XP pick, a fight that gives this fighter no combat XP is no candidate,
    // whatever asks for it — the next one by the order is taken, down to the pick (rule (5) without a pick stays as it is)
    const pays = (c: Candidate): boolean => !x || !noXp(ch, c.step.work);
    const first = pick(firsts.filter(pays));
    // task 032: a fighter buys only while no worker is on
    const buy = world.characters.some((c) => isOn(c.name, world) && roleOf(c.name, world) === "worker") ? undefined : buyStep();
    const forge = pick(all.filter((c) => c.step.work.kind !== "kill" && c.target.key !== "src:tasks_coin")); // 027d: a coins visit is fight work
    // task 027g (A): a road need's kill whose monster is the pick comes along with it (the pick's step); another goes to a
    // worker that is on and admitted, to this fighter (before its pick) only when none is; 027d's coins stay a fighter's
    const mine = x?.work.kind === "kill" ? x.work.monster : undefined;
    // task 029 (A.3): a training's kill is a fighter's whoever else is admitted (TRAIN_HUNT); task 033b: off, never — only a
    // need of the road's gear work (a) or consumables is (`road`), whether or not a worker is admitted
    // task 033 (A.2): the coins only where the held task's monster is the pick (its ×1.25 among the bonus): they ride on it
    const kill = pick(supply.filter((c) => pays(c) && (c.road || (trainHunt && c.train)) && (c.target.key === "src:tasks_coin" ? !!held && held === mine : c.step.work.kind === "kill" && c.step.work.monster !== mine && ((trainHunt && c.train) || !workerHunts(c.step.work.monster)))));
    const trainKill = trainHunt && !!kill?.train;
    const c = first ?? forge ?? kill;
    if (!c && !x && !buy) {
      const r = rank(name, world, true);
      return { ...r, step: { ...r.step, why: `fighter, ${capped ? "at the level cap" : "no fight admitted"}: ${r.step.why}`, ...(r.step.reason ? { reason: { ...r.step.reason, role: "fighter", rule: "free" } } : {}) } };
    }
    step = c && c === first ? { ...c.step, why: `fighter, first: ${c.step.as}: ${c.step.why}` } : buy ? { ...buy, why: `fighter, the market: ${buy.as}: ${buy.why}` }
      : c ? { ...c.step, why: `fighter, ${c === forge ? "forging" : trainKill ? "a training's kill" : "a need's kill"}: ${c.step.as}: ${c.step.why}` } : { ...x!, why: `fighter: ${x!.why}` };
    rule = c && c === first ? "first" : buy ? "market" : c ? (c === forge ? "forging" : trainKill ? "train-kill" : "need-kill") : "xp-pick";
  } else { step = today(); rule = todayRule(); }
  const because: string[] = [], limits: string[] = []; // task 028: the clauses added below, beside the why's
  // Task 027d: a fighter's kill step starts at the monsters master when it holds no task, a finished one or an items task
  // (turn in, take a monsters task; an items task cancelled for a coin) — its walk in the step's hours; the filler's task,
  // worked on purpose, is cancelled there when rule 4 says so (tasks.ts cancelOf). A held task nobody works stays.
  if (holder && step.work.kind === "kill" && !step.visit) {
    const v = startVisit(ch, world), sec = v ? visitSec(ch, world, v.cancel) : Infinity;
    const said = `task: ${v?.cancel ? `cancels ${taskText(ch)} for a coin, then takes` : ch.task ? `turns in ${taskText(ch)}, then takes` : "takes"} a monsters task at the master first`;
    if (v && Number.isFinite(sec)) { step = { ...step, hours: step.hours + sec / 3600, visit: { at: "start", ...v }, why: `${step.why}; ${said}` }; limits.push(said); }
  } else if (step.work.kind === "task" && step.as !== "supply") {
    const why = cancelOf(ch, world), sec = why ? visitSec(ch, world, ch.task) : Infinity;
    if (why && Number.isFinite(sec)) { step = { ...step, hours: step.hours + sec / 3600, visit: { at: "start", cancel: ch.task }, why: `${step.why}; task: cancels ${taskText(ch)} for a coin first (${why})` }; limits.push(`task: cancels ${taskText(ch)} for a coin first (${why})`); }
  }
  if (held && step.work.kind === "kill" && step.work.monster === held && step.target !== "src:tasks_coin") { step = { ...step, why: `${step.why}; task: ${taskText(ch)}` }; because.push(`task: ${taskText(ch)}`); }
  // task 032 (B.6): a need the market refused for its price or its purse says so in its own step's why; task 032b (B.1): one it
  // refused because the step's own way is cheaper (rule 2) too — the why names both
  for (const o of offers) if (o.rule >= 2 && o.key === step.target) { step = { ...step, why: `${step.why}; market: ${o.why}` }; limits.push(`market: ${o.why}`); }
  // task 032b (B.2): the pieces this fighter would wear whose material has no source of ours and that the market refuses (or
  // does not sell) — no need, no leaf: its why says the market's answer, once a material, with the pieces it stops
  if (world.market && fights(name, world)) {
    const by = new Map<string, string[]>();
    for (const r of candidatesOf(ch, world).rejected) if (r.why.includes(": no source of ours; market: ")) by.set(r.why, [...(by.get(r.why) ?? []), itemName(r.piece)]);
    if (by.size) {
      const said = `market, no source of ours: ${[...by].map(([w, ps]) => `${w.replace(": no source of ours; market: ", " — ")} (for ${ps.slice(0, 3).join(", ")}${ps.length > 3 ? ` and ${ps.length - 3} more` : ""})`).join("; ")}`;
      step = { ...step, why: `${step.why}; ${said}` };
      limits.push(said);
    }
  }
  // task 027e (C.2): a candidate dropped for its score (0 or NaN: no tier takes it) is said — in the why, so in the journal
  const dropped = [...objectives, ...levels, ...supply, ...fillers].filter((c) => !(c.any > 0));
  if (dropped.length) step = { ...step, why: `${step.why}; dropped for its score: ${dropped.slice(0, 3).map((c) => `${c.target.key} (${c.any})`).join(", ")}${dropped.length > 3 ? ` and ${dropped.length - 3} more` : ""}` };
  const wear = step.wear ?? wearOf(step.work, ch, world); // task 014: a kill whose potions could not be stocked wears the set without them
  // task 025, settled point 2: the verdict on the very set the step wears (its wear and its take's potions) — the why states
  // its win rate; the runtime's end record and the forward model's losses read it
  // `wear` leaves the artifact slots out: play keeps the worn pinned ones on (the Novice Guide's 25 HP decides initiative ties)
  const pinned = GEAR_SLOTS.map((g) => slotCode(ch, g)).filter((c): c is string => !!c && PINNED_ARTIFACTS.has(c));
  // consumables free or 0 (the replay's rows B and C): no take — the solve's potions are at hand
  const noTake = !(cfg.consumables ?? 1) || consFree(world);
  const pots = step.work.kind !== "kill" ? [] : noTake ? (["utility1", "utility2"] as const).map((g) => fightRec(ch, world, (step.work as { monster: string }).monster)?.slots[g]).filter((c): c is string => !!c)
    : Object.keys(step.withdraw ?? {}).filter((c) => item(c)?.type === "utility");
  // task 038 (B): its seconds with the food it is sent with — the take's food for its kills, rest past them
  const kills = step.work.kind !== "kill" ? 0 : step.as === "supply" ? step.units : step.units * perOf(step.work);
  const fight = step.work.kind === "kill" ? verdictOf(ch, world, step.work.monster, [...Object.values(wear ?? {}), ...pinned, ...pots], noTake ? undefined : { withdraw: step.withdraw, kills }) : undefined;
  const why = fight ? `${step.why}; wins ${Math.round(fight.p * 100)}% of fights, ${Math.round(fight.sec)} s a win` : step.why;
  if (fight) because.push(`wins ${Math.round(fight.p * 100)}% of fights, ${Math.round(fight.sec)} s a win`);
  // task 028 (A.1): the reason in parts — the rule that took it, and the three candidates ranked next by today's scoring
  const base = step.reason ?? { goal: step.target, because: [], limits: [] };
  const next = [...objectives, ...levels, ...supply, ...fillers].filter((c) => c.any > 0 && c.target.key !== step.target)
    .sort((a, b) => Number(b.fit > 0) - Number(a.fit > 0) || (b.fit > 0 ? b.fit - a.fit : b.any - a.any) || (a.target.key < b.target.key ? -1 : 1))
    .slice(0, 3).map((c) => ({ text: `${c.step.as}: ${c.step.reason?.goal ?? c.target.key}`, score: c.fit > 0 ? c.fit : c.any, fits: c.fit > 0 }));
  const reason: Reason = { ...base, ...(realRole ? { role: realRole } : {}), rule, because: [...base.because, ...because], limits: [...base.limits, ...limits], ...(next.length ? { next } : {}) };
  return { step: { ...step, why, ...(wear ? { wear } : {}), ...(fight ? { fight } : {}), reason }, objectives, levels, supply, fillers, lanes, ...(offers.length ? { market: offers } : {}) };
}

/** C.4: a gather chunk on the best node of the character's highest gathering skill — always possible. Task 009:
 *  a blocked `fallback:<skill>` is passed over for the next skill; all blocked: the one whose block ends first. Task 027:
 *  a worker's in its own gathering lanes (`lanes`), when it holds one. */
function fallback(ch: Character, world: World, last: Step | undefined, lanes?: Lane[]): Step {
  const own = GATHER_LANES.filter((l) => lanes?.includes(l));
  const skills = [...(own.length ? own : GATHER_LANES)].sort((a, b) => levelOf(ch, b) - levelOf(ch, a));
  const opts: { skill: Lane; until: number; c: Plan; p: NonNullable<ReturnType<typeof pickNode>> }[] = [];
  for (const skill of skills) {
    const p = pickNode(skill, levelOf(ch, skill), ch, world, true);
    if (!p) continue;
    const work: Work = { kind: "gather", resource: p.resource, drop: p.drop };
    const c = chunk(work, p.sec * perOf(work), Infinity, world, p, ch);
    if (!c) continue;
    const b = world.blocked[`fallback:${skill}@${ch.name}`];
    opts.push({ skill, until: b && b.until > world.now ? b.until : 0, c, p });
  }
  const o = opts.find((x) => !x.until) ?? [...opts].sort((a, b) => a.until - b.until)[0];
  if (!o && own.length) return fallback(ch, world, last); // none in its own lanes: any lane
  if (!o) throw new Error(`${ch.name} reaches no gathering node at all`);
  const key = `fallback:${o.skill}`;
  const n = last?.target === key ? Number(last.key.split("#").pop()) + 1 : 1;
  return {
    key: `${key}@${ch.name}#${n}`, target: key, character: ch.name, as: "fallback", work: o.c.work, units: o.c.units, hours: o.c.hours, score: 0,
    why: `fallback (nothing else is open to ${ch.name}${o.until ? "; every fallback is blocked, this one ends first" : ""}): ${itemName(o.p.drop)} at ${o.skill} ${levelOf(ch, o.skill)}, ${o.c.units} now`, place: o.c.place, until: o.c.until,
    ...(o.c.toll ? { toll: o.c.toll, withdraw: withToll(undefined, o.c.toll) } : {}),
    reason: { rule: "fallback", goal: `${o.skill} ${levelOf(ch, o.skill)}`, because: [`nothing else is open to ${ch.name}${o.until ? "; every fallback is blocked, this one ends first" : ""}`, `${itemName(o.p.drop)}, ${o.c.units} now (${fmt(o.c.hours)} h)`], limits: [] },
  };
}

/** Task 035 (docs/season-plan.md 6: a fighter never takes a fight that gives it no XP): a kill of a monster that gives this
 *  character no combat XP — the "0 combat XP a kill" of a why (fight XP's gap rule: more than 10 levels above it). */
const noXp = (ch: Character, w: Work): boolean => {
  if (w.kind !== "kill") return false;
  const m = monsterOf(w.monster);
  return !!m && fightXp(m.level, m.hp, m.type, ch.level) <= 0;
};

const unitWord = (w: Work): string =>
  w.kind === "kill" ? (w.drop ? itemName(w.drop) : `${monsterName(w.monster)} kills`)
  : w.kind === "gather" ? itemName(w.drop)
  : w.kind === "craft" || w.kind === "buy" ? itemName(w.code)
  : w.kind === "task" ? "tasks" : w.kind;

/** The next step for one free character. The same World gives the same Step. */
export const decide = (name: string, world: World): Step => rank(name, world).step;
