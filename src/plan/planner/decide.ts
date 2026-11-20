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

import { achievement as achievementOf, item, itemName, resource as resourceOf } from "../../catalog";
import { CRAFT_SEC } from "../xp";
import { jobGear } from "../jobgear";
import { CHUNK_SEC, GATHER_LANES, TRAIN_LANES } from "./config";
import { actionSec, craftsPerLevel, hoursToLevel, levelOf, perOf, recycleLane, stepSec, unitSec } from "./cost";
import { achHours, bundleOf, bundleScore } from "./bundle";
import { met } from "./gates";
import { gearPieces, pieceParent } from "./gear";
import { monsterName, pickMonster, pickNode, pickRecipe, pickSource } from "./pick";
import { fightRec, nearestSpot, placeOf } from "./reach";
import { crafterOf, rolesFor } from "./roles";
import { available, poolBank } from "./stock";
import { feedable, inStep, mayCraft, objectiveParents, recipeDemand, supplyNeeds } from "./supply";
import { sourceFor, targetsOf } from "./targets";
import { GEAR_SLOTS } from "../../types/api";
import type { Parent } from "./supply";
import type { Character, GearSlot } from "../../types/api";
import type { Answer, Input, Lane, Place, Source, Step, Target, Work, World } from "./types";

export { met } from "./gates";

const fmt = (h: number): string => (!Number.isFinite(h) ? "∞" : h < 10 ? h.toFixed(1) : String(Math.round(h)));

interface Plan { work: Work; units: number; hours: number; place?: Place; until?: number; sources?: Source[]; withdraw?: Record<string, number> }

/** A chunk of an action work (kills, gathers): about CHUNK_SEC, at least 1, at most `left`, and inside an event's time. */
function chunk(work: Work, sec: number, left: number, world: World, spot: { place: Place; until?: number }): Plan | undefined {
  if (!Number.isFinite(sec) || sec <= 0) return undefined;
  let units = Math.min(left, Math.max(1, Math.round(CHUNK_SEC / sec)));
  if (spot.until) units = Math.min(units, Math.floor((spot.until - world.now) / 1000 / sec));
  units = Math.floor(units);
  return units >= 1 ? { work, units, hours: (units * sec) / 3600, place: spot.place, until: spot.until } : undefined;
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
  const ins = inputs.map((i) => {
    const can = field && i.source.kind !== "craft" && i.gates.every((g) => met(g, ch, world));
    const per = perOf(i.source);
    return { i, avail: available(i.code, world, ch.name), field: can, per, margin: per > 1 ? 1.5 : 1, act: can ? actionSec(i.source, ch, world) : Infinity };
  });
  let max = Math.floor(Math.min(left, CHUNK_SEC / own));
  for (const x of ins) if (!x.field) max = Math.min(max, Math.floor(x.avail / x.i.per + 1e-9));
  if (max < 1) return undefined;
  // shortcut: a drop or a rare gather is sourced at 1.5 × its expected actions, so a step rarely comes up short
  const times = (x: (typeof ins)[number], n: number): number => Math.ceil(Math.max(0, n * x.i.per - x.avail) * x.per * x.margin - 1e-9);
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
    withdraw: Object.fromEntries(ins.filter((x) => x.avail > 0).map((x) => [x.i.code, Math.min(x.avail, Math.ceil(lo * x.i.per - 1e-9))])),
  };
}

/** The chunk of an objective this character can do now, or undefined when it is not in reach. */
function planObjective(t: Target, ch: Character, world: World, left: number): Plan | undefined {
  if (!t.gates.every((g) => met(g, ch, world))) return undefined;
  const w = t.work;
  const here = placeOf(ch);
  switch (w.kind) {
    case "kill": case "gather": {
      const spot = w.kind === "kill" ? nearestSpot(here, "monster", w.monster, world) : nearestSpot(here, "resource", w.resource, world);
      return spot && chunk(w, unitSec(t, ch, world), left, world, spot);
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
function planLevel(lane: Lane, ch: Character, world: World, bonus: Set<string>): (Plan & { what: string }) | undefined {
  const L = levelOf(ch, lane);
  if (lane === "combat") {
    const p = pickMonster(ch, world, bonus);
    const c = p && chunk({ kind: "kill", monster: p.monster }, p.sec, Infinity, world, p);
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
    const c = chunk(w, p.sec * perOf(w), Infinity, world, p);
    return c && { ...c, what: `${itemName(p.drop)} at ${Math.round(p.xph)} XP/h` };
  }
  if (TRAIN_LANES.includes(lane)) {
    const spot = nearestSpot(placeOf(ch), "workshop", lane, world);
    const hours = hoursToLevel(lane, L, L + 1, world, ch);
    return spot && Number.isFinite(hours) ? { work: { kind: "train", lane }, units: 1, hours, place: spot.place, what: `one level of ${lane} training` } : undefined;
  }
  return undefined;
}

/** The slots a step's set is worn in (task 009: runes, artifacts, utilities and bags are not planned). */
export const WEAR_SLOTS: GearSlot[] = GEAR_SLOTS.filter((g) => !g.startsWith("artifact") && !g.startsWith("utility") && g !== "bag" && g !== "rune");
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

export interface Candidate { target: Target; step: Step; fit: number; any: number }
export interface Ranking { step: Step; objectives: Candidate[]; levels: Candidate[]; supply: Candidate[]; fillers: Candidate[]; lanes: Lane[] }

/** Every candidate this character has now, scored, and the step decide() returns. */
export function rank(name: string, world: World): Ranking {
  const ch = world.characters.find((c) => c.name === name);
  if (!ch) throw new Error(`no character ${name}`);
  const cfg = world.config;
  const targets = targetsOf(world);
  const lanes = rolesFor(world)[name] ?? ["combat"];
  const calH = Math.max(0, (Date.parse(cfg.deadline) - world.now) / 3.6e6);
  const last = world.current[name];
  const others = Object.entries(world.current).filter(([n, s]) => n !== name && s).map(([, s]) => s!);
  const inFlight = (key: string): number => others.reduce((t, s) => t + (s.target === key && s.as !== "level" && s.as !== "fallback" ? s.units : 0), 0);
  /** Task 012: the others' src: steps in flight in actions of the static source (supplyNeeds' unit) — each at its own
   *  node, so its actions are items at that node's rate first. */
  const srcInFlight = (key: string): number => {
    const st = key.startsWith("src:") ? sourceFor(key.slice(4)) : undefined;
    if (!st || typeof st === "string") return inFlight(key);
    return others.reduce((t, s) => t + (s.target === key && s.as !== "level" && s.as !== "fallback" ? (s.units / perOf(s.work)) * perOf(st.work) : 0), 0);
  };
  const bonus = new Set(targets.flatMap((t) => (t.work.kind === "kill" ? [t.work.monster] : [])));
  const blocked = (key: string): boolean => (world.blocked[`${key}@${name}`]?.until ?? 0) > world.now;
  const pts = (code: string, p: number): number => p * (cfg.weight[code] ?? 1);
  const boost = (key: string): number => (last?.target === key ? 1.1 : 1);
  const stepOf = (t: Target, p: Plan, as: Answer, score: number, why: string, extra: Partial<Step> = {}): Step => {
    const n = last?.target === t.key ? Number(last.key.split("#").pop()) + 1 : 1;
    return { key: `${t.key}@${name}#${n}`, target: t.key, character: name, as, work: p.work, units: p.units, hours: p.hours, score, why, place: p.place, sources: p.sources, withdraw: p.withdraw, until: p.until, ...extra };
  };

  const objectives: Candidate[] = [];
  const fillers: Candidate[] = [];
  for (const t of targets) {
    // task 013, settled point 1: a target with an event gate is never a step, live or not — its work is the interrupt's
    if (!t.achievement || blocked(t.key) || t.gates.some((g) => g.kind === "event")) continue;
    const left = t.left - inFlight(t.key);
    if (left <= 0) continue;
    const p = planObjective(t, ch, world, left);
    if (!p) continue;
    const h = achHours(t.achievement, name, world);
    const fit = h <= calH ? 1 : 0;
    const any = (pts(t.achievement, t.points) / Math.max(h, 0.01)) * boost(t.key);
    const what = p.work.kind === "train" ? "recycled" : unitWord(t.work);
    const why = `${achievementOf(t.achievement)?.name ?? t.achievement}: ${left} ${what} left, +${t.points} pts in ~${fmt(h)} h; ${p.units} now (${fmt(p.hours)} h)`;
    (t.filler ? fillers : objectives).push({ target: t, step: stepOf(t, p, t.filler ? "filler" : "objective", any * fit, why), fit: any * fit, any });
  }

  // Rule 3: per lane, the next gate behind which open achievements sit, and the bundle up to it (bundle.ts).
  const levels: Candidate[] = [];
  const levelCand = (lane: Lane, to: number, fit: number, any: number, why: (what: string, p: Plan) => string): void => {
    const t = targets.find((x) => x.key === `lvl:${lane}:${to}`) ?? { key: `lvl:${lane}:${to}`, points: 0, work: { kind: "level", lane, to }, left: 1, gates: [], filler: false };
    if (blocked(t.key) || levels.some((c) => c.target.key === t.key && c.fit >= fit * boost(t.key))) return;
    const p = planLevel(lane, ch, world, bonus);
    if (!p) return;
    const i = levels.findIndex((c) => c.target.key === t.key);
    if (i >= 0) levels.splice(i, 1);
    levels.push({ target: t, step: stepOf(t, p, "level", fit * boost(t.key), why(p.what, p)), fit: fit * boost(t.key), any: any * boost(t.key) });
  };
  for (const lane of lanes) {
    const b = bundleOf(lane, name, world);
    if (!b || !Number.isFinite(b.hGate)) continue; // section 2: no XP source up to the gate — no candidate
    const s = bundleScore(b, b.hGate, calH);
    const L = levelOf(ch, lane);
    const to = b.wall ?? b.next;
    const road = b.wall ? `its road ends at ${b.wall} (no XP source there; ${fmt(b.hGate)} h to the gate at the pace before it)` : `${fmt(b.hGate)} h to the gate`;
    // task 013: an event achievement behind the gate says by how many spawns of what, with how many members
    const evs = b.events.map((e) => `; ${e.code} behind it, by ${e.spawns} spawns of ${e.event}, about ${fmt(e.days)} days with ${e.members} ${e.members === 1 ? "member" : "members"}`).join("");
    levelCand(lane, to, s.fit, s.any, (what, p) => `${lane} ${L} → ${b.next}: +${s.points} pts behind it (${b.behind.map((x) => x.code).join(", ")}), ${road}${evs}; ${what}, ${p.units} now (${fmt(p.hours)} h)`);
  }

  // Gear by need (section 4) and supply through the bank (section 3).
  const parents: Parent[] = objectiveParents(world, name, calH);
  const supply: Candidate[] = [];
  for (const [code, piece] of gearPieces(world, name)) {
    const { copies, works, best: n } = piece;
    const r = item(code)!.craft!;
    const qty = [...copies.values()].reduce((s, x) => s + x, 0) - inFlight(`gear:${code}`);
    if (qty <= 0) continue;
    parents.push(pieceParent(code, piece, qty, world, name));
    if (crafterOf(r.skill, world) !== name) continue;
    const why = `${itemName(code)} ×${qty} for ${[...works].map(([who, w]) => `${who} (${w})`).join(", ")} — the best: ${n.for}, ${n.work}: H0 ${fmt(n.H0)} h, with it ${fmt(n.H1)} h + ${fmt(n.G)} h to make; +${n.points} pts behind it`;
    if (levelOf(ch, r.skill as Lane) < r.level) {
      levelCand(r.skill as Lane, r.level, n.fit, n.any, (what, p) => `${r.skill} ${levelOf(ch, r.skill as Lane)} → ${r.level} for gear: ${why}; ${what}, ${p.units} now (${fmt(p.hours)} h)`);
      continue;
    }
    const key = `gear:${code}`;
    const spot = nearestSpot(placeOf(ch), "workshop", r.skill, world);
    const runs = Math.min(qty, feedable(code, world, name));
    if (blocked(key) || !spot || runs < 1) continue;
    const t: Target = { key, points: 0, work: { kind: "craft", code }, left: qty, gates: [], filler: false };
    const p: Plan = { work: t.work, units: runs, hours: (runs * CRAFT_SEC + stepSec(spot.place, placeOf(ch))) / 3600, place: spot.place, withdraw: Object.fromEntries(recipeDemand(code, runs)) };
    supply.push({ target: t, step: stepOf(t, p, "supply", n.fit * boost(key), `gear: ${why}; ${runs} now`, { parent: n.key, for: n.for }), fit: n.fit * boost(key), any: n.any * boost(key) });
  }
  for (const s of supplyNeeds(world, name, parents, srcInFlight)) {
    // task 013, settled point 1: an event-only material is the event interrupt's work, never a step
    if (blocked(s.key) || s.gates.some((g) => g.kind === "event")) continue;
    const par = s.parent;
    const t: Target = { key: s.key, points: 0, work: s.work, left: s.short, gates: s.gates, filler: false };
    let p: Plan | undefined, node = "";
    if (s.kind === "src") {
      // task 012, settled point 7: the node (or monster) is this character's — the least net seconds an item
      const src = pickSource(s.code, ch, world);
      if (!src) continue;
      const items = s.short / perOf(s.work); // short is in actions of the static source (supplyNeeds)
      p = chunk(src.work, src.sec, Math.ceil(items * src.per - 1e-9), world, src);
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
    const why = `${itemName(s.code)}: ${fmt(s.short)} ${s.kind === "src" ? "actions" : ""} short for ${par.label} (+${par.points} pts, chain ~${fmt(par.hours)} h)${node}; ${p.units} ${unit} now (${fmt(p.hours)} h)`;
    // task 013, settled point 9: the answer is prefixed once, where the chosen step's why is made ("supply: supply:")
    supply.push({ target: t, step: stepOf(t, p, "supply", par.fit * boost(s.key), why.replace("  ", " "), { parent: par.key }), fit: par.fit * boost(s.key), any: par.any * boost(s.key) });
  }
  // Task 012, settled point 8: a craft of a parent's chain gated at a level nobody that may craft it has — the level is
  // a candidate for this lane's role holders, carrying the parent's score (as a crafter's missing level for gear).
  for (const par of parents) for (const g of par.gated ?? []) {
    if (!Number.isFinite(g.hours) || !lanes.includes(g.lane)) continue;
    levelCand(g.lane, g.level, par.fit, par.any, (what, p) => `${g.lane} ${levelOf(ch, g.lane)} → ${g.level} for ${itemName(g.code)} in the chain of ${par.label} (+${par.points} pts, chain ~${fmt(par.hours)} h, of it the road ${fmt(g.hours)} h by ${g.who}); ${what}, ${p.units} now (${fmt(p.hours)} h)`);
  }

  const byScore = (k: "fit" | "any") => (a: Candidate, b: Candidate): number => b[k] - a[k] || (a.target.key < b.target.key ? -1 : a.target.key > b.target.key ? 1 : 0);
  const top = (pool: Candidate[], k: "fit" | "any"): Candidate | undefined => {
    const best = pool.filter((c) => c[k] > 0).sort(byScore(k))[0];
    return best && { ...best, step: { ...best.step, score: best[k], why: k === "any" ? `${best.step.why} (nothing fits the deadline: points per hour)` : best.step.why } };
  };
  const real = [...objectives, ...levels, ...supply];
  const firsts = real.filter((c) => c.target.achievement && cfg.first.includes(c.target.achievement));
  // Task 011, settled point 1: filler that fits goes before a road that fits nothing (the road takes the fallback's hours)
  const realAny = real.some((c) => c.any > 0);
  const best = top(firsts, "fit") ?? top(firsts, "any") ?? top(real, "fit");
  const fill = best ? undefined : top(fillers, "fit");
  const late = best || fill ? undefined : top(real, "any");
  const fillAny = best || fill || late ? undefined : top(fillers, "any");
  const chosen = best ?? late;
  const step = chosen ? { ...chosen.step, why: `${chosen.step.as}: ${chosen.step.why}` }
    : fill ? { ...fill.step, why: `filler (${realAny ? "nothing else fits the deadline" : "nothing else scores"}): ${fill.step.why}` }
    : fillAny ? { ...fillAny.step, why: `filler (nothing else scores): ${fillAny.step.why}` }
    : fallback(ch, world, last);
  const wear = wearOf(step.work, ch, world);
  return { step: wear ? { ...step, wear } : step, objectives, levels, supply, fillers, lanes };
}

/** C.4: a gather chunk on the best node of the character's highest gathering skill — always possible. Task 009:
 *  a blocked `fallback:<skill>` is passed over for the next skill; all blocked: the one whose block ends first. */
function fallback(ch: Character, world: World, last: Step | undefined): Step {
  const skills = [...GATHER_LANES].sort((a, b) => levelOf(ch, b) - levelOf(ch, a));
  const opts: { skill: Lane; until: number; c: Plan; p: NonNullable<ReturnType<typeof pickNode>> }[] = [];
  for (const skill of skills) {
    const p = pickNode(skill, levelOf(ch, skill), ch, world, true);
    if (!p) continue;
    const work: Work = { kind: "gather", resource: p.resource, drop: p.drop };
    const c = chunk(work, p.sec * perOf(work), Infinity, world, p);
    if (!c) continue;
    const b = world.blocked[`fallback:${skill}@${ch.name}`];
    opts.push({ skill, until: b && b.until > world.now ? b.until : 0, c, p });
  }
  const o = opts.find((x) => !x.until) ?? [...opts].sort((a, b) => a.until - b.until)[0];
  if (!o) throw new Error(`${ch.name} reaches no gathering node at all`);
  const key = `fallback:${o.skill}`;
  const n = last?.target === key ? Number(last.key.split("#").pop()) + 1 : 1;
  return {
    key: `${key}@${ch.name}#${n}`, target: key, character: ch.name, as: "fallback", work: o.c.work, units: o.c.units, hours: o.c.hours, score: 0,
    why: `fallback (nothing else is open to ${ch.name}${o.until ? "; every fallback is blocked, this one ends first" : ""}): ${itemName(o.p.drop)} at ${o.skill} ${levelOf(ch, o.skill)}, ${o.c.units} now`, place: o.c.place, until: o.c.until,
  };
}

const unitWord = (w: Work): string =>
  w.kind === "kill" ? (w.drop ? itemName(w.drop) : `${monsterName(w.monster)} kills`)
  : w.kind === "gather" ? itemName(w.drop)
  : w.kind === "craft" || w.kind === "buy" ? itemName(w.code)
  : w.kind === "task" ? "tasks" : w.kind;

/** The next step for one free character. The same World gives the same Step. */
export const decide = (name: string, world: World): Step => rank(name, world).step;
