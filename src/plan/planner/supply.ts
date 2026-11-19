// Supply through the bank (task 009 section 3). Every open target that consumes items — a craft or buy objective,
// a gear piece (gear.ts) — has a bill of materials: its recipe opened until each leaf is bank stock, a field source
// (a gather or a kill, with its gates) or out of reach for now (an event that is not live, a boss, a raid, another
// layer, gold, tasks coins). A code that is short is a target of its own:
//   src:<code>  its field source; units are actions (a rare drop is a run of ordinary chunks)
//   mat:<code>  its craft, from the bank; its inputs are demand in turn
// and the gear piece itself is gear:<code>, made by its crafter. What a step produces is in the bank when it ends.
// Supply is made for open demand only: when the parent closes its supply targets are gone. Pure.

import { catalog, item, itemName } from "../../catalog";
import { killSeconds } from "../bis";
import { CRAFT_SEC } from "../xp";
import { CHUNK_SEC, CRAFT_LANES, GEAR_CRAFT, KILL_LOG } from "./config";
import { actionSec, killWalk, levelOf, perOf } from "./cost";
import { isOn, met, outOfReach } from "./gates";
import { planRec, wins } from "./reach";
import { crafterOf } from "./roles";
import { available } from "./stock";
import { placeGates, sourceFor, targetsOf } from "./targets";
import type { Gate, Lane, Target, Work, World } from "./types";

export interface Leaf { key: string; code: string; kind: "src" | "mat"; qty: number; work: Work; gates: Gate[] }
export interface Bill {
  leaves: Map<string, Leaf>; // by key; src qty = items short, mat qty = products short
  out: string[];             // what is out of reach, with its price
  hours: number;             // field hours of the src leaves (the fleet's quickest character) + 5 s a mat run
  crafts: number;            // the mat runs' share of `hours`
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
      if (wins(r, world)) { s = killSeconds(r!.forecast) * KILL_LOG + killWalk(c, world, work.monster); break; }
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
  const bill: Bill = { leaves: new Map(), out: [], hours: 0, crafts: 0 };
  const leaf = (key: string, code: string, kind: Leaf["kind"], work: Work, gates: Gate[], q: number): void => {
    const l = bill.leaves.get(key);
    if (l) l.qty += q;
    else bill.leaves.set(key, { key, code, kind, qty: q, work, gates });
  };
  const need = (code: string, q: number, depth: number): void => {
    if (q <= 1e-9) return;
    const have = vb.has(code) ? vb.get(code)! : available(code, world, name);
    const take = Math.min(have, q);
    vb.set(code, have - take);
    q -= take;
    if (q <= 1e-9) return;
    const s = sourceFor(code);
    if (typeof s !== "string") {
      const why = outOfReach(s.gates, world);
      if (why) return void bill.out.push(`${itemName(code)}: ${why}`);
      leaf(`src:${code}`, code, "src", s.work, s.gates, q);
      if (price) bill.hours += (q * perOf(s.work) * fleetSec(s.work, s.gates, world)) / 3600;
      return;
    }
    const r = item(code)?.craft;
    if (r && depth < 6) {
      const runs = Math.ceil(q / Math.max(1, r.quantity) - 1e-9);
      leaf(`mat:${code}`, code, "mat", { kind: "craft", code }, [{ kind: "level", lane: r.skill as Lane, level: r.level }], runs * Math.max(1, r.quantity));
      bill.hours += (runs * CRAFT_SEC) / 3600;
      bill.crafts += (runs * CRAFT_SEC) / 3600;
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
      leaf(`mat:${code}`, code, "mat", t.work, t.gates, n);
      bill.hours += (5 * Math.ceil(n / 50)) / 3600; // a buy of up to a bagful is one action
      need(t.work.currency, t.work.price * n, depth + 1);
      return;
    }
    bill.out.push(priceOf(code, q));
  };
  for (const [code, q] of demand) need(code, q, 0);
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
}

/** One unit of an objective, with nothing in the bank, is all field work the fleet can do, at most three sources,
 *  inside 2 × CHUNK_SEC: the objective's own step sources it (Tanner's Exchange), no supply targets. */
export function inStep(t: Target, world: World): boolean {
  let sec = 0;
  for (const i of t.inputs ?? []) {
    if (i.source.kind === "craft" || outOfReach(i.gates, world)) return false;
    sec += i.per * perOf(i.source) * fleetSec(i.source, i.gates, world);
  }
  return (t.inputs ?? []).length <= 3 && sec <= 2 * CHUNK_SEC;
}

/** The open craft and buy objectives that need supply (section 3), with their chains. Filler is not a parent. */
export function objectiveParents(world: World, name: string, calH: number): Parent[] {
  const out: Parent[] = [];
  for (const t of targetsOf(world)) {
    if (!t.achievement || t.filler || (t.work.kind !== "craft" && t.work.kind !== "buy") || inStep(t, world)) continue;
    const demand: [string, number][] = (t.inputs ?? []).map((i) => [i.code, i.per * t.left]);
    const bill = billOf(world, name, demand);
    if (bill.out.length) continue; // waits: waitingOf names it
    const own = (t.left * (t.work.kind === "craft" ? CRAFT_SEC / Math.max(1, item(t.work.code)?.craft?.quantity ?? 1) : 5)) / 3600;
    const hours = Math.max(0.01, bill.hours + own);
    const points = t.points * (world.config.weight[t.achievement] ?? 1);
    out.push({ key: t.key, label: t.achievement, points, fit: hours <= calH ? points / hours : 0, any: points / hours, hours, demand });
  }
  return out;
}

/** A short code as a target for one character: what it is, how much is short, its best parent. */
export interface SupplyNeed { key: string; kind: "src" | "mat"; code: string; short: number; work: Work; gates: Gate[]; parent: Parent }

/** The short codes of every parent, the bank shared in turn from the best-scoring parent down; `inFlight` = what
 *  the others' current steps of the same key are making (actions for src, products for mat). */
export function supplyNeeds(world: World, name: string, parents: Parent[], inFlight: (key: string) => number): SupplyNeed[] {
  const vb = new Map<string, number>();
  const out = new Map<string, SupplyNeed>();
  for (const p of [...parents].sort((a, b) => b.fit - a.fit || b.any - a.any || (a.key < b.key ? -1 : 1))) {
    for (const l of billOf(world, name, p.demand, vb).leaves.values()) {
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
