// The bank's slots (task 015). Pure.
//
// A slot is a code, whatever the quantity; a stack the bank holds needs none. Free slots are a fact of the World
// (settled point 2: World.bankSlots, the codes world.bank holds, World.nextExpansion — the runtime's World only; the
// forward model has none, so nothing here fires there).
//   - Outdated gear is recycled a code at a time (settled point 3), as a planned step that goes before any other while
//     fewer than TIDY_BELOW slots are free, one character at a time (settled point 4; decide.ts rank).
//   - With fewer than EXPAND_BELOW free and nothing left to tidy, the runtime buys one expansion if the price is at most
//     config.expansionCap and the bank keeps GOLD_FLOOR after it (settled point 5; state/planner.ts bankCheck).
//   - With no slot, nothing to tidy and no purchase possible, a step that would bring a code the bank does not hold is no
//     candidate (bankStuck, newCodes; decide.ts).

import { catalog, item, itemName, itemUses, monster as monsterOf, resource as resourceOf } from "../../catalog";
import { GOLD_FLOOR } from "../events";
import { jobGear } from "../jobgear";
import { CRAFT_SEC, autoRecyclable, recycleReturn } from "../xp";
import { GATHER_LANES, GEAR_CRAFT } from "./config";
import { levelOf, perOf, stepSec } from "./cost";
import { baseParents } from "./consumables";
import { possibleMembers } from "./events";
import { isOn } from "./gates";
import { gearPieces } from "./gear";
import { monsterName, pickMonster } from "./pick";
import { fightRec, nearestSpot, placeOf } from "./reach";
import { crafterOf, roleOf, rolesFor } from "./roles";
import { available, poolBank } from "./stock";
import { mayCraft, supplyNeeds } from "./supply";
import { sourceFor, targetsOf } from "./targets";
import { GEAR_SLOTS, slotCode } from "../../types/api";
import type { Character } from "../../types/api";
import type { Lane, Step, World } from "./types";

/** Settled point 4: a tidy step goes before any other while fewer than this many slots are free (a guess of the chat; task
 *  041, C: 15 → 40 — with 19 free it never ran). */
export const TIDY_BELOW = 40;
/** Task 041 (B.1): the cut starts while the bank's stones make at least this many of the listed products together. */
export const CUT_MIN = 6;
/** Settled point 5: below this many free slots, with nothing left to tidy, one expansion is bought (a guess of the chat). */
export const EXPAND_BELOW = 10;
/** Settled point 3: gear is outdated this many levels below the lowest combat level of the characters that are on. */
export const TIDY_MARGIN = 10;

/** The item types that are gear here: what goes into a weapon (tools too), shield, helmet, body, legs, boots, ring or
 *  amulet slot — never an artifact, a rune, a bag or a utility. */
const GEAR = ["weapon", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring", "amulet"];
export const isGear = (code: string): boolean => GEAR.includes(item(code)?.type ?? "");

/** The codes the bank holds: its used slots. */
export const usedSlots = (world: World): number => new Set(world.bank.filter((b) => b.quantity > 1e-9).map((b) => b.code)).size;
/** Free slots; undefined where the World has no slots (the forward model). */
export const freeSlots = (world: World): number | undefined => (world.bankSlots == null ? undefined : world.bankSlots - usedSlots(world));

/** One gear code of the bank and the verdict of settled point 3. */
export interface Verdict {
  code: string;
  level: number;
  type: string;
  bank: number;             // copies in the bank
  worn: string[];           // who wears one
  outdated: boolean;
  why: string;              // "outdated", or the clause that keeps it
  by?: string;              // who recycles it: the lane's crafter first (supply.ts mayCraft)
  back: [string, number][]; // the units expected back for every copy (xp.ts recycleReturn, spread by the recipe)
  added: string[];          // what comes back that the bank holds no stack of
}

const picksMemo = new Map<string, Map<string, string>>();
/**
 * Every code a solve the planner makes today picks, with the first solve that picks it: each character's XP pick, the
 * monsters of the open kill objectives and of the open src: kills (characters up to ten levels below the monster),
 * the events it can be a member of (events.ts possibleMembers), the tool of every gathering lane. Memoised on the
 * characters' levels, the bank's gear and the monsters asked about (the solves themselves are reach.ts's caches).
 */
function solvePicks(world: World, name: string): Map<string, string> {
  const on = world.characters.filter((c) => isOn(c.name, world));
  const kills = new Map<string, string>();
  for (const t of targetsOf(world, true)) {
    if (t.achievement && t.work.kind === "kill" && t.left > 0 && !t.gates.some((g) => g.kind === "event") && !kills.has(t.work.monster)) kills.set(t.work.monster, t.achievement);
  }
  for (const s of supplyNeeds(world, name, baseParents(world, name), () => 0)) {
    const src = s.kind === "src" ? sourceFor(s.code) : undefined;
    if (src && typeof src !== "string" && src.work.kind === "kill" && !src.gates.some((g) => g.kind === "event") && !kills.has(src.work.monster)) kills.set(src.work.monster, `src:${s.code}`);
  }
  const gear = world.bank.filter((b) => isGear(b.code)).map((b) => `${b.code}:${Math.floor(b.quantity)}`).sort().join(",");
  const k = `${on.map((c) => `${c.name}:${c.level}:${GEAR_SLOTS.map((g) => slotCode(c, g)).join("/")}`).join(";")}|${gear}|${[...kills.keys()].sort().join(",")}|${world.config.events ?? 1}`;
  const hit = picksMemo.get(k);
  if (hit) return hit;
  const out = new Map<string, string>();
  const add = (set: Partial<Record<string, string>> | undefined, why: string): void => {
    for (const c of Object.values(set ?? {})) if (c && !out.has(c)) out.set(c, why);
  };
  const events = [...catalog().events.values()].filter((ev) => ev.content.type === "monster");
  for (const ch of on) {
    const p = pickMonster(ch, world, new Set());
    if (p) add(fightRec(ch, world, p.monster)?.slots, `${ch.name}'s XP pick (${monsterName(p.monster)})`);
    for (const [m, what] of kills) {
      const mon = monsterOf(m);
      if (mon && mon.level <= ch.level + 10) add(fightRec(ch, world, m)?.slots, `${what} (${monsterName(m)}) for ${ch.name}`);
    }
    for (const ev of events) if (possibleMembers(ev, world).some((x) => x.name === ch.name)) add(fightRec(ch, world, ev.content.code)?.slots, `event ${ev.code} for ${ch.name}`);
    for (const lane of GATHER_LANES) add({ weapon: jobGear(ch, poolBank(world, ch.name), { kind: "gather", skill: lane })?.weapon }, `${ch.name}'s ${lane} tool`);
  }
  if (picksMemo.size >= 16) picksMemo.clear();
  picksMemo.set(k, out);
  return out;
}

const verdictMemo = new WeakMap<World, Map<string, Verdict[]>>();
/**
 * Settled point 3: every gear code in the bank, outdated or kept, with the clause that decided. Outdated when all of:
 * it has a recipe, is recyclable, and somebody that is on may recycle it (and xp.ts autoRecyclable: no rare ingredient
 * comes back mostly lost); its level is at least TIDY_MARGIN below the lowest combat level of the characters that are on;
 * nobody wears it, no running step's `wear` names it, no solve the planner makes today picks it (solvePicks); no recipe
 * uses it and no open objective's inputs, bill or gear piece asks for it; what comes back is held by the bank, or the
 * codes that bring a new one free more slots than they add, together. Memoised per World and name.
 */
export function tidyVerdicts(world: World, name = ""): Verdict[] {
  let byName = verdictMemo.get(world);
  if (!byName) verdictMemo.set(world, (byName = new Map()));
  const hit = byName.get(name);
  if (hit) return hit;
  const on = world.characters.filter((c) => isOn(c.name, world));
  const minCombat = on.length ? Math.min(...on.map((c) => c.level)) : -Infinity;
  const held = new Set(world.bank.filter((b) => b.quantity > 1e-9).map((b) => b.code));
  const inputs = new Set(targetsOf(world, true).flatMap((t) => (t.achievement ? (t.inputs ?? []).map((i) => i.code) : [])));
  const bills = new Set(baseParents(world, name).flatMap((p) => p.demand.map(([c]) => c)));
  const pieces = gearPieces(world, name);
  const out: Verdict[] = [];
  const pending: Verdict[] = [];
  for (const b of world.bank) {
    if (b.quantity < 1 || !isGear(b.code)) continue;
    const it = item(b.code)!;
    const r = it.craft;
    const v: Verdict = {
      code: b.code, level: it.level, type: it.type, bank: Math.floor(b.quantity), outdated: false, why: "", back: [], added: [],
      worn: world.characters.filter((c) => GEAR_SLOTS.some((g) => slotCode(c, g) === b.code)).map((c) => c.name),
    };
    const kept = (why: string): void => void out.push({ ...v, why });
    if (!r || !it.recyclable) { kept("not recyclable"); continue; }
    const n = r.items.reduce((s, g) => s + g.quantity, 0);
    v.back = r.items.map((g) => [g.code, (v.bank * recycleReturn(n) * g.quantity) / n]);
    v.added = r.items.filter((g) => !held.has(g.code)).map((g) => g.code);
    const lane = r.skill as Lane;
    v.by = [crafterOf(lane, world), ...on.map((c) => c.name)].find((x): x is string => !!x && isOn(x, world) && mayCraft(lane, r.level, x, world));
    const step = Object.values(world.current).find((s) => s && Object.values(s.wear ?? {}).includes(b.code));
    const uses = itemUses(b.code).recipes;
    if (it.level > minCombat - TIDY_MARGIN) kept(`the level margin (level ${it.level}; the lowest combat level on is ${minCombat})`);
    else if (v.worn.length) kept(`worn (${v.worn.join(", ")})`);
    else if (step) kept(`a running step wears it (${step.key})`);
    else if (uses.length) kept(`an ingredient (${uses.map((u) => itemName(u.code)).slice(0, 3).join(", ")}${uses.length > 3 ? ", …" : ""})`);
    else if (inputs.has(b.code) || bills.has(b.code) || pieces.has(b.code)) kept("an open objective or bill asks for it");
    else if (!v.by) kept(`nobody that is on may recycle it (${lane} ${r.level})`);
    else if (!autoRecyclable(b.code)) kept("a rare ingredient would come back mostly lost (xp.ts autoRecyclable)");
    else pending.push(v);
  }
  // the solves only when something is left to ask about (the dearest clause)
  const picks = pending.length ? solvePicks(world, name) : new Map<string, string>();
  const left = pending.filter((v) => {
    const s = picks.get(v.code);
    if (s) out.push({ ...v, why: `in a solve: ${s}` });
    return !s;
  });
  // what comes back: codes that bring a new one go only when they free more slots than they add, together
  const adding = left.filter((v) => v.added.length);
  const net = adding.length > new Set(adding.flatMap((v) => v.added)).size;
  for (const v of left) {
    if (v.added.length && !net) out.push({ ...v, why: `what comes back needs a new slot (${v.added.map(itemName).join(", ")})` });
    else out.push({ ...v, outdated: true, why: "outdated" });
  }
  out.sort((a, b) => a.level - b.level || (a.code < b.code ? -1 : 1));
  byName.set(name, out);
  return out;
}

/** What `qty` copies give back, as the why says it: "22 Copper Bar". */
export const backText = (back: [string, number][]): string => back.map(([c, q]) => `${Math.round(q)} ${itemName(c)}`).join(", ");

/**
 * Settled point 4: the tidy step of `name` — the outdated codes it may recycle, of one workshop, at most three (a step
 * holds four items: a recycle of every copy of each, the deposit; compile.ts: no reset); every copy reserved like any
 * withdrawal. Undefined while TIDY_BELOW or more slots are free, while another character's tidy step runs, or when it may
 * recycle nothing (task 027b: a fighter only the pieces of the gear craft it holds).
 */
export function tidyStep(world: World, name: string): Step | undefined {
  const free = freeSlots(world);
  if (free == null || free >= TIDY_BELOW) return undefined;
  if (Object.entries(world.current).some(([n, s]) => n !== name && s?.as === "tidy")) return undefined;
  const ch = world.characters.find((c) => c.name === name);
  if (!ch) return undefined;
  const blocked = (key: string): boolean => (world.blocked[`${key}@${name}`]?.until ?? 0) > world.now;
  const mine = tidyVerdicts(world, name).filter((v) => {
    const r = item(v.code)!.craft!;
    // task 027b: a fighter recycles only pieces of the gear craft it holds
    return v.outdated && mayCraft(r.skill as Lane, r.level, name, world) && (roleOf(name, world) !== "fighter" || GEAR_CRAFT.includes(r.skill as Lane)) && available(v.code, world, name) >= v.bank && !blocked(`tidy:${v.code}`);
  });
  if (!mine.length) return undefined;
  const skill = item(mine[0].code)!.craft!.skill;
  const codes = mine.filter((v) => item(v.code)!.craft!.skill === skill).slice(0, 3);
  const spot = nearestSpot(placeOf(ch), "workshop", skill, world);
  if (!spot) return undefined;
  const copies = codes.reduce((s, v) => s + v.bank, 0);
  const last = world.current[name];
  const target = `tidy:${codes[0].code}`;
  const n = last?.target === target ? Number(last.key.split("#").pop()) + 1 : 1;
  const slots = world.bankSlots!;
  const why = `${codes.map((v) => `${itemName(v.code)} ×${v.bank}`).join(" and ")} recycled: frees ${codes.length} bank slot${codes.length > 1 ? "s" : ""} (${free} → ${free + codes.length} free of ${slots}), ${codes.map((v) => backText(v.back)).join(", ")} back`;
  return {
    key: `${target}@${name}#${n}`, target, character: name, as: "tidy",
    work: { kind: "recycle", codes: Object.fromEntries(codes.map((v) => [v.code, v.bank])) },
    units: copies, hours: (stepSec(spot.place, placeOf(ch)) + copies * CRAFT_SEC) / 3600, score: 0,
    why: `tidy: ${why}`, place: spot.place, withdraw: Object.fromEntries(codes.map((v) => [v.code, v.bank])),
  };
}

/** Task 016, settled point 12: "something is left to tidy" is "somebody that is on has a tidy step" — the question tidyStep
 *  asks (its own verdicts, what it may recycle, the copies the others did not reserve, its blocks), not tidyVerdicts
 *  without a name, which can call a code outdated that no character's step takes (state/planner.ts bankCheck). */
// Task 017, settled point 13: a tidy step in flight counts too — tidyStep gives nobody a step while another's runs, so
// during a character's last tidy step the others' codes would read as nothing left and an expansion be bought early.
export const tidyLeft = (world: World): boolean =>
  world.characters.some((c) => isOn(c.name, world) && (world.current[c.name]?.as === "tidy" || !!tidyStep(world, c.name)));

/** Task 041 (A.3): why the merchants keep a gear code of the sell list — a running step's `wear` names it, or a solve of today
 *  picks it (the tidy's own test: solvePicks); undefined: it may be sold. */
export function soldKept(world: World, code: string): string | undefined {
  if (!isGear(code)) return undefined;
  const step = Object.values(world.current).find((s) => s && Object.values(s.wear ?? {}).includes(code));
  if (step) return `a running step wears it (${step.key})`;
  const s = solvePicks(world, "").get(code);
  return s && `in a solve: ${s}`;
}

/**
 * Task 041 (B): the cut — the listed products of one material (World.cut: a gem is 24 stones) made from the bank's stock by
 * the mining lane's holder, else by the first character that is on and has a recipe's level; one character at a time. It
 * starts while the bank's stones make at least CUT_MIN of them together and goes on, step after step, until no whole batch
 * is left (the next step of a character whose last step cut); the remainder stays. At most three products a step (four
 * items: a craft of each, the deposit; compile.ts: no reset), the most first, of one workshop; the stones reserved like any
 * withdrawal. No objective, training or need: decide.ts ranks it right after the tidy. Undefined without World.cut (the
 * forward model has none).
 */
export function cutStep(world: World, name: string): Step | undefined {
  if (!world.cut?.length || Object.entries(world.current).some(([n, s]) => n !== name && s?.as === "cut")) return undefined;
  const on = world.characters.filter((c) => isOn(c.name, world));
  const recipes = world.cut.flatMap((code) => { const r = item(code)?.craft; return r?.items.length === 1 ? [{ code, r, stone: r.items[0] }] : []; });
  const may = (c: Character, r: { skill: string; level: number }): boolean => levelOf(c, r.skill as Lane) >= r.level;
  const holder = on.find((c) => rolesFor(world)[c.name]?.includes("mining"));
  const who = [holder, ...on].find((c): c is Character => !!c && recipes.some((x) => may(c, x.r)));
  if (!who || who.name !== name) return undefined;
  const blocked = (code: string): boolean => (world.blocked[`cut:${code}@${name}`]?.until ?? 0) > world.now;
  const lots = recipes.map((x) => ({ ...x, n: Math.floor(available(x.stone.code, world, name) / x.stone.quantity) }))
    .filter((x) => x.n > 0 && may(who, x.r) && !blocked(x.code))
    .sort((a, b) => b.n - a.n);
  const last = world.current[name];
  const total = lots.reduce((s, x) => s + x.n, 0);
  if (!total || (total < CUT_MIN && last?.as !== "cut")) return undefined;
  const mine = lots.filter((x) => x.r.skill === lots[0].r.skill).slice(0, 3);
  const spot = nearestSpot(placeOf(who), "workshop", lots[0].r.skill, world);
  if (!spot) return undefined;
  const gems = mine.reduce((s, x) => s + x.n, 0);
  // the craft item takes a bagful of stones at a time: a round trip bank ↔ workshop each
  const trips = mine.reduce((s, x) => s + Math.ceil(x.n / Math.max(1, Math.floor(who.inventory_max_items / x.stone.quantity))), 0);
  const target = `cut:${mine[0].code}`;
  const k = last?.target === target ? Number(last.key.split("#").pop()) + 1 : 1;
  const left = mine.map((x) => `${Math.floor(available(x.stone.code, world, name) - x.n * x.stone.quantity)} ${itemName(x.stone.code)}`);
  return {
    key: `${target}@${name}#${k}`, target, character: name, as: "cut",
    work: { kind: "craft", code: mine[0].code, codes: Object.fromEntries(mine.map((x) => [x.code, x.n])) },
    units: gems, hours: (stepSec(spot.place, placeOf(who)) + (trips - 1) * stepSec(spot.place) + gems * CRAFT_SEC) / 3600, score: 0,
    why: `cut: ${mine.map((x) => `${x.n} ${itemName(x.code)} of ${x.n * x.stone.quantity} ${itemName(x.stone.code)}`).join(", ")} — ${trips} trip${trips === 1 ? "" : "s"} bank ↔ workshop; the remainder stays (${left.join(", ")})`,
    place: spot.place, withdraw: Object.fromEntries(mine.map((x) => [x.stone.code, x.n * x.stone.quantity])),
  };
}

/** Settled point 5: whether the next expansion may be bought — at most config.expansionCap, the bank keeping GOLD_FLOOR. */
export function expansionOk(world: World): { ok: boolean; price: number; why?: string } {
  const price = world.nextExpansion ?? Infinity;
  const cap = world.config.expansionCap ?? 60_000;
  if (!(price <= cap)) return { ok: false, price, why: `above the cap of ${cap.toLocaleString("en-US")}` };
  if (world.bankGold - price < GOLD_FLOOR) return { ok: false, price, why: `the bank would keep ${(world.bankGold - price).toLocaleString("en-US")} gold, under the floor of ${GOLD_FLOOR.toLocaleString("en-US")}` };
  return { ok: true, price };
}

/** Settled point 5: no slot free, nothing left to tidy, no purchase possible — the bank takes no new code. */
export function bankStuck(world: World, name = ""): boolean {
  const free = freeSlots(world);
  if (free == null || free > 0) return false;
  return !tidyVerdicts(world, name).some((v) => v.outdated) && !expansionOk(world).ok;
}

/** The codes a step would bring that the bank holds no stack of: a craft's or a buy's product, a kill's or a gather's
 *  drops of which its chunk expects one unit at least. */
export function newCodes(step: Step, world: World): string[] {
  const held = new Set(world.bank.filter((b) => b.quantity > 1e-9).map((b) => b.code));
  const w = step.work;
  const expect = (drops: { code: string; rate: number; min_quantity: number; max_quantity: number }[], actions: number): string[] =>
    drops.filter((d) => (actions * (d.min_quantity + d.max_quantity)) / 2 / d.rate >= 1).map((d) => d.code);
  const actions = step.as === "supply" ? step.units : step.units * (w.kind === "kill" || w.kind === "gather" ? perOf(w) : 1);
  const out = w.kind === "kill" ? expect(monsterOf(w.monster)?.drops ?? [], actions)
    : w.kind === "gather" ? expect(resourceOf(w.resource)?.drops ?? [], actions)
    : w.kind === "craft" || w.kind === "buy" ? [w.code]
    : [];
  return out.filter((c) => !held.has(c));
}
