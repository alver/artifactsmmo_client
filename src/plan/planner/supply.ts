// Supply through the bank (task 009 section 3). Every open target that consumes items — a craft or buy objective,
// a gear piece (gear.ts) — has a bill of materials: its recipe opened until each leaf is bank stock, a field source
// (a gather or a kill, with its gates) or out of reach for now (an event that is not live, a boss, a raid, another
// layer, gold, tasks coins). A code that is short is a target of its own:
//   src:<code>  its field source; units are actions (a rare drop is a run of ordinary chunks)
//   mat:<code>  its craft, from the bank; its inputs are demand in turn
// and the gear piece itself is gear:<code>, made by its crafter. What a step produces is in the bank when it ends.
// Supply is made for open demand only: when the parent closes its supply targets are gone. Pure.
// Task 012: a craft or trade step has its fixed seconds (cost.ts stepSec: the reset, the walks, the deposit), once a
// mat leaf in a bill; a craft of the chain — a mat leaf or the objective's own — whose level nobody that may craft it
// meets puts the road to that level (the one who gets there first, cost.ts hoursToLevel) into the parent's hours, and
// the parent waits when there is no road (settled point 8); decide.ts makes the level a candidate of the lane's role
// holders with the parent's score.
// Task 013, settled point 7: an event-only material (its field source carries an event gate) is a leaf like any other,
// priced by its calendar (events.ts materialCal: the spawns needed × the mean time between spawns, everybody that can
// ever be a member) — ∞ when nobody can, and the parent waits; with config.events 0 it is out of reach (a wall), as before.
// It is never a step of its own: the event interrupt does that work (decide.ts).

import { catalog, item, itemName } from "../../catalog";
import { killSeconds } from "../bis";
import { CRAFT_SEC } from "../xp";
import { CHUNK_SEC, CRAFT_LANES, GEAR_CRAFT, KILL_LOG } from "./config";
import { actionSec, hoursToLevel, killWalk, levelOf, makePlace, perOf, stepSec } from "./cost";
import { isOn, met, outOfReach } from "./gates";
import { planRec, potionPrice, wins } from "./reach";
import { crafterOf } from "./roles";
import { available } from "./stock";
import { materialCal } from "./events";
import { placeGates, sourceFor, targetsOf } from "./targets";
import type { Gate, Lane, Target, Work, World } from "./types";

export interface Leaf { key: string; code: string; kind: "src" | "mat"; qty: number; work: Work; gates: Gate[] }
/** Task 012, settled point 8: a craft of the chain whose level nobody that may craft it meets — the road to it for the
 *  character that gets there first (∞: nobody has an XP source on the way). */
export interface Gated { code: string; lane: Lane; level: number; who?: string; hours: number }
export interface Bill {
  leaves: Map<string, Leaf>; // by key; src qty = items short, mat qty = products short
  out: string[];             // what is out of reach, with its price
  hours: number;             // field hours of the src leaves (the fleet's quickest character) + 5 s a mat run + each mat leaf's fixed step seconds + the gated roads + the event calendars
  crafts: number;            // the mat runs' share of `hours` (their fixed step seconds included)
  gated: Gated[];            // per lane the highest gated level of the chain, with its road (in `hours` when finite)
  /** Task 013, settled point 7: an event-only material's calendar (events.ts materialCal: the spawns needed × the mean
   *  time between spawns, everybody that can ever be a member) — in `hours`; ∞ = nobody can ever be one. */
  events: { code: string; event: string; qty: number; hours: number }[];
}

/** Who may craft a recipe of `lane` once the level is there (mayCraft without the level): anyone for a gathering
 *  skill's recipe, the role holder for a gear crafting skill or cooking. */
const mayHold = (lane: Lane, name: string, world: World): boolean =>
  !(GEAR_CRAFT.includes(lane) || CRAFT_LANES.includes(lane)) || crafterOf(lane, world) === name;

/** Settled point 8: a craft at `level` of `lane` that nobody who is on and may craft it meets yet → the road for the
 *  one who gets there first (undefined: someone meets it). */
const roadMemo = new Map<string, Omit<Gated, "code">>();
export function gateRoad(lane: Lane, level: number, world: World): Omit<Gated, "code"> | undefined {
  // whoever may craft it and meets the level, on or not, is no gate (a crafter not on is section 7's business); the road
  // is walked by the ones that are on
  if (world.characters.some((c) => mayHold(lane, c.name, world) && levelOf(c, lane) >= level)) return undefined;
  const may = world.characters.filter((c) => isOn(c.name, world) && mayHold(lane, c.name, world));
  // shortcut: a road is taken to turn on the levels, the measured level hours and the layer they stand on only (cost.ts:
  // the atlas's hours once a node or a recipe gives XP; what is reached freely is one connected set per layer), not on
  // the pool — every decision is a new World, and walking five characters' roads per decision doubled the first week;
  // upgrade if a road ever turns on gear or on where in a layer a character stands
  const k = `${lane}|${level}|${may.map((c) => `${c.name}:${levelOf(c, lane)}:${(c as { layer?: string }).layer ?? ""}`).join(";")}|${Object.entries(world.costs).filter(([key, v]) => key.startsWith(`level:${lane}:`) && v.n >= 3).map(([key, v]) => `${key}=${v.sec}`).join(";")}`;
  const hit = roadMemo.get(k);
  if (hit) return hit;
  let best: Omit<Gated, "code"> = { lane, level, hours: Infinity };
  for (const c of may) {
    const h = hoursToLevel(lane, levelOf(c, lane), level, world, c);
    if (h < best.hours) best = { lane, level, who: c.name, hours: h };
  }
  if (roadMemo.size >= 5000) roadMemo.clear();
  roadMemo.set(k, best);
  return best;
}

const secMemo = new WeakMap<World, Map<string, number>>();
/** Seconds a field action takes for the quickest character that is on and meets the source's gates (∞: nobody yet).
 *  A price, so a kill is judged and timed by the planning-grade solve (reach.ts planRec), not the full one.
 *  shortcut: a kill is priced by the highest-level character that wins it, not the quickest of all; upgrade if a
 *  low-level fighter is ever the much faster one */
export function fleetSec(work: Work, gates: Gate[], world: World): number {
  let m = secMemo.get(world);
  if (!m) secMemo.set(world, (m = new Map()));
  const k = work.kind === "kill" ? `kill:${work.monster}` : work.kind === "gather" ? `gather:${work.resource}` : JSON.stringify(work);
  let s = m.get(k);
  if (s == null) {
    s = Infinity;
    const by = [...world.characters].sort((a, b) => b.level - a.level || (a.name < b.name ? -1 : 1));
    for (const c of by) {
      if (!isOn(c.name, world) || !gates.every((g) => (g.kind === "win" ? true : met(g, c, world)))) continue;
      if (work.kind !== "kill") { s = Math.min(s, actionSec(work, c, world)); continue; }
      const r = planRec(c, world, work.monster);
      if (wins(r, world)) { s = killSeconds(r!.forecast, potionPrice(world, c.name).price) * KILL_LOG + killWalk(c, world, work.monster); break; }
    }
    m.set(k, s);
  }
  return s;
}

const tradeMemo = new Map<string, { work: Work & { kind: "buy" }; gates: Gate[] } | null>();
/** An NPC that sells the code for another item (not gold, not tasks coins), on a tile with a free route: the trade.
 *  Static per catalog, memoised for good. */
export function tradeOf(code: string): { work: Work & { kind: "buy" }; gates: Gate[] } | undefined {
  let t = tradeMemo.get(code);
  if (t === undefined) {
    t = null;
    for (const n of catalog().npcs.values()) {
      const o = (n.items ?? []).find((x) => x.code === code && x.buy_price != null && x.currency !== "gold" && x.currency !== "tasks_coin");
      const g = o && placeGates("npc", n.code);
      if (o && g && typeof g !== "string") { t = { work: { kind: "buy", code, npc: n.code, currency: o.currency, price: o.buy_price! }, gates: g }; break; }
    }
    tradeMemo.set(code, t);
  }
  return t ?? undefined;
}

/** Why a code with no field source and no recipe cannot be had, with its price where there is one. */
export function priceOf(code: string, qty: number): string {
  for (const n of catalog().npcs.values()) {
    const o = (n.items ?? []).find((x) => x.code === code && x.buy_price != null);
    if (!o) continue;
    const n2 = Math.ceil(qty) * o.buy_price!;
    return o.currency === "gold" ? `${itemName(code)} costs gold: ${n2} at ${n.name}`
      : o.currency === "tasks_coin" ? `${itemName(code)} costs tasks coins: ${n2}`
      : `${itemName(code)} is bought with ${n2} ${itemName(o.currency)}`;
  }
  const raid = [...catalog().monsters.values()].find((m) => m.type === "raid_boss" && m.drops.some((d) => d.code === code));
  if (raid) return `${itemName(code)} drops from a raid (${raid.code})`;
  const s = sourceFor(code);
  return typeof s === "string" ? s : `${itemName(code)}: no source`;
}

/**
 * Open `demand` ([code, qty]) against the bank this character may plan with: stock first, then the field source,
 * else the recipe, as deep as the recipes go. `vb` is the virtual bank (shared when several parents are opened in
 * turn); fresh when omitted.
 */
export function billOf(world: World, name: string, demand: [string, number][], vb = new Map<string, number>(), price = true): Bill {
  const bill: Bill = { leaves: new Map(), out: [], hours: 0, crafts: 0, gated: [], events: [] };
  const laneTop = new Map<Lane, { code: string; level: number }>(); // settled point 8: per lane the highest craft level of the chain
  const evQty = new Map<string, number>(); // task 013: an event-only material's quantity, priced by its calendar at the end
  const evOn = !!(world.config.events ?? 1);
  /** A new leaf: true. Task 012, settled point 4: a mat leaf's step has its fixed seconds, once a leaf. */
  const leaf = (key: string, code: string, kind: Leaf["kind"], work: Work, gates: Gate[], q: number): boolean => {
    const l = bill.leaves.get(key);
    if (l) l.qty += q;
    else bill.leaves.set(key, { key, code, kind, qty: q, work, gates });
    return !l;
  };
  const fixed = (w: Work): number => stepSec(makePlace(w, world)) / 3600;
  const need = (code: string, q: number, depth: number): void => {
    if (q <= 1e-9) return;
    const have = vb.has(code) ? vb.get(code)! : available(code, world, name);
    const take = Math.min(have, q);
    vb.set(code, have - take);
    q -= take;
    if (q <= 1e-9) return;
    const s = sourceFor(code);
    if (typeof s !== "string") {
      // task 013, settled point 7: an event-only material is a calendar, not a wall (its other gates still decide)
      const ev = evOn && s.gates.some((g) => g.kind === "event");
      const why = outOfReach(ev ? s.gates.filter((g) => g.kind !== "event") : s.gates, world);
      if (why) return void bill.out.push(`${itemName(code)}: ${why}`);
      leaf(`src:${code}`, code, "src", s.work, s.gates, q);
      if (ev) evQty.set(code, (evQty.get(code) ?? 0) + q);
      else if (price) bill.hours += (q * perOf(s.work) * fleetSec(s.work, s.gates, world)) / 3600;
      return;
    }
    const r = item(code)?.craft;
    if (r && depth < 6) {
      const runs = Math.ceil(q / Math.max(1, r.quantity) - 1e-9);
      const w: Work = { kind: "craft", code };
      const s = (runs * CRAFT_SEC) / 3600 + (leaf(`mat:${code}`, code, "mat", w, [{ kind: "level", lane: r.skill as Lane, level: r.level }], runs * Math.max(1, r.quantity)) ? fixed(w) : 0);
      bill.hours += s;
      bill.crafts += s;
      const lane = r.skill as Lane;
      if ((laneTop.get(lane)?.level ?? 0) < r.level) laneTop.set(lane, { code, level: r.level });
      for (const g of r.items) need(g.code, g.quantity * runs, depth + 1);
      return;
    }
    // A trade for another item (hard leather for cowhide, cloth for wool): no gold, no tasks coins — its currency is
    // demand in turn, and the trade is a mat: step (withdraw, buy, deposit-all). Gold and tasks coins are not spent.
    const t = tradeOf(code);
    if (t && depth < 6) {
      const why = outOfReach(t.gates, world);
      if (why) return void bill.out.push(`${itemName(code)}: the trader is behind ${why}`);
      const n = Math.ceil(q - 1e-9);
      const isNew = leaf(`mat:${code}`, code, "mat", t.work, t.gates, n);
      bill.hours += (5 * Math.ceil(n / 50)) / 3600 + (isNew ? fixed(t.work) : 0); // a buy of up to a bagful is one action
      need(t.work.currency, t.work.price * n, depth + 1);
      return;
    }
    bill.out.push(priceOf(code, q));
  };
  for (const [code, q] of demand) need(code, q, 0);
  if (!price) return bill; // only the leaves wanted (bundle.ts unmetOf): no roads, no calendars
  for (const [code, q] of evQty) {
    const c = materialCal(code, q, world);
    bill.events.push({ code, event: c.event, qty: q, hours: c.hours });
    bill.hours += c.hours;
  }
  // settled point 8: a gated craft of the chain — the road to its level for whoever gets there first is in the hours
  for (const [lane, g] of laneTop) {
    const road = gateRoad(lane, g.level, world);
    if (!road) continue;
    bill.gated.push({ code: g.code, ...road });
    if (price) bill.hours += road.hours;
  }
  return bill;
}

/** A recipe's materials for `runs` runs. */
export const recipeDemand = (code: string, runs: number): [string, number][] => (item(code)?.craft?.items ?? []).map((g) => [g.code, g.quantity * runs]);

/** A parent of supply: an open craft or buy objective, or a gear piece (gear.ts), with the score of its whole chain. */
export interface Parent {
  key: string;            // the objective's target key, or gear:<code>
  label: string;          // for the why line
  points: number;         // the points behind it (× weight)
  fit: number;            // points that fit the deadline ÷ hours
  any: number;            // points ÷ hours
  hours: number;          // its whole remaining chain
  demand: [string, number][];
  gated?: Gated[];        // task 012: the chain's crafts whose level nobody that may craft them meets (finite roads)
}

/** One unit of an objective, with nothing in the bank, is all field work the fleet can do, at most three sources,
 *  inside 2 × CHUNK_SEC: the objective's own step sources it (Tanner's Exchange), no supply targets. */
export function inStep(t: Target, world: World): boolean {
  let sec = 0;
  for (const i of t.inputs ?? []) {
    // task 013, settled point 1: event work has one writer, the event interrupt — never a step's field source
    if (i.source.kind === "craft" || i.gates.some((g) => g.kind === "event") || outOfReach(i.gates, world)) return false;
    sec += i.per * perOf(i.source) * fleetSec(i.source, i.gates, world);
  }
  return (t.inputs ?? []).length <= 3 && sec <= 2 * CHUNK_SEC;
}

const parentMemo = new WeakMap<World, Map<string, Parent[]>>();
/** The open craft and buy objectives that need supply (section 3), with their chains. Filler is not a parent. Memoised
 *  per World and name (task 013: the event demand reads them too); a caller that adds to the list copies it. */
export function objectiveParents(world: World, name: string, calH: number): Parent[] {
  let byName = parentMemo.get(world);
  if (!byName) parentMemo.set(world, (byName = new Map()));
  const k = `${name}|${calH}`;
  const hit = byName.get(k);
  if (hit) return [...hit];
  const out: Parent[] = [];
  for (const t of targetsOf(world)) {
    if (!t.achievement || t.filler || (t.work.kind !== "craft" && t.work.kind !== "buy") || inStep(t, world)) continue;
    const demand: [string, number][] = (t.inputs ?? []).map((i) => [i.code, i.per * t.left]);
    const bill = billOf(world, name, demand);
    if (bill.out.length) continue; // waits: waitingOf names it
    // Task 012, settled point 8: the objective's own craft gated too (diamond_in_the_sky: mining 35) — per lane the road
    // to the highest gated level of the chain; ∞ (no XP source on the way): the parent waits, waitingOf names it.
    const r = t.work.kind === "craft" ? item(t.work.code)?.craft : undefined;
    const self = r && gateRoad(r.skill as Lane, r.level, world);
    const gated = [...bill.gated];
    if (self && t.work.kind === "craft") {
      const i = gated.findIndex((g) => g.lane === self.lane);
      if (i < 0) gated.push({ code: t.work.code, ...self });
      else if (gated[i].level < self.level) gated[i] = { code: t.work.code, ...self };
    }
    const road = gated.reduce((s, g) => s + g.hours, 0);
    if (!Number.isFinite(road) || !Number.isFinite(bill.hours)) continue;
    const own = (t.left * (t.work.kind === "craft" ? CRAFT_SEC / Math.max(1, r?.quantity ?? 1) : 5) + stepSec(makePlace(t.work, world))) / 3600;
    const hours = Math.max(0.01, bill.hours - bill.gated.reduce((s, g) => s + g.hours, 0) + road + own);
    const points = t.points * (world.config.weight[t.achievement] ?? 1);
    out.push({ key: t.key, label: t.achievement, points, fit: hours <= calH ? points / hours : 0, any: points / hours, hours, demand, gated });
  }
  byName.set(k, out);
  return [...out];
}

/** A short code as a target for one character: what it is, how much is short, its best parent. */
export interface SupplyNeed { key: string; kind: "src" | "mat"; code: string; short: number; work: Work; gates: Gate[]; parent: Parent }

/** The short codes of every parent, the bank shared in turn from the best-scoring parent down; `inFlight` = what
 *  the others' current steps of the same key are making (actions for src, products for mat). */
export function supplyNeeds(world: World, name: string, parents: Parent[], inFlight: (key: string) => number): SupplyNeed[] {
  const vb = new Map<string, number>();
  const out = new Map<string, SupplyNeed>();
  for (const p of [...parents].sort((a, b) => b.fit - a.fit || b.any - a.any || (a.key < b.key ? -1 : 1))) {
    for (const l of billOf(world, name, p.demand, vb, false).leaves.values()) {
      const qty = l.kind === "src" ? l.qty * perOf(l.work) : l.qty;
      const s = out.get(l.key);
      if (s) s.short += qty;
      else out.set(l.key, { key: l.key, kind: l.kind, code: l.code, short: qty, work: l.work, gates: l.gates, parent: p });
    }
  }
  return [...out.values()].map((s) => ({ ...s, short: s.short - inFlight(s.key) })).filter((s) => s.short > 1e-6);
}

/** Who may craft a recipe of `lane`: anyone with the level for a gathering skill's recipe (bars, planks, potions);
 *  the holder of the role for a gear crafting skill or cooking (settled point 5). */
export function mayCraft(lane: Lane, level: number, name: string, world: World): boolean {
  const ch = world.characters.find((c) => c.name === name);
  if (!ch || levelOf(ch, lane) < level) return false;
  return !(GEAR_CRAFT.includes(lane) || CRAFT_LANES.includes(lane)) || crafterOf(lane, world) === name;
}

/** Runs of a recipe (or units of a trade) the bank this character may plan with feeds now. */
export function feedable(code: string, world: World, name: string): number {
  const r = item(code)?.craft;
  if (!r) {
    const t = tradeOf(code);
    return t ? Math.floor(available(t.work.currency, world, name) / t.work.price + 1e-9) : 0;
  }
  return Math.min(...r.items.map((g) => Math.floor(available(g.code, world, name) / g.quantity + 1e-9)));
}
