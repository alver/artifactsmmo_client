// Self-check of the planner's core (src/plan/planner/, tasks 007 and 009) on the saved fleet. Offline, no storage.
//   npm run check             — roles, unhandled objectives, the first step of each character, Fifth alone on, the
//                               alchemy and smelting prints, the first week played forward with every invariant on
//                               every decision, the made-up worlds
//   npm run check -- planner  — the same, plus the four replay rows to the deadline and "safe: a wall or a price"
// Inputs: public/data/* (catalog, atlas); the characters, achievements and server time of docs/design/snapshot/
// (2026-11-18); the bank of scripts/fixtures/roadmap-fleet.json (2026-11-17). The check and the replay run with all
// five characters on (task 009, settled point 9).
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { atlas } from "../src/catalog/atlas";
import { applyGear, baseStats } from "../src/sim/stats";
import { simulate } from "../src/sim/combat";
import type { FightForecast, TurnEvent } from "../src/sim/combat";
import { restSeconds } from "../src/sim/cost";
import { bestInSlot, killSeconds } from "../src/plan/bis";
import { brewablePotions } from "../src/plan/consumables";
import { ownedQtyOf } from "../src/plan/jobgear";
import { COVER_RUNS, FIGHT_SEC, fightSec, fightXp, gatherSec, potionPriceOf, potionSec } from "../src/plan/xp";
import { STAT_CODES } from "../src/sim/types";
import { GEAR_SLOTS } from "../src/types/api";
import type { GearRecommendation } from "../src/plan/types";
import { itemsOf } from "../src/plan/planner/compile";
import { CHUNK_SEC, DEFAULTS, GATHER_LANES, GEAR_CRAFT, KILL_LOG, STEP_BANK_SEC, TRAIN_LANES } from "../src/plan/planner/config";
import { actionSec, killWalk, levelHoursEstimate, levelOf, makePlace, perOf, stepSec } from "../src/plan/planner/cost";
import { bundleOf } from "../src/plan/planner/bundle";
import { decide, met, rank } from "../src/plan/planner/decide";
import { advance, bankPlus, drinksOf, forward, pointsOf, waitingOf, wear } from "../src/plan/planner/forward";
import { gearNeeds, piecesFor } from "../src/plan/planner/gear";
import type { Need } from "../src/plan/planner/gear";
import { recordFight, simAccuracy, simDeviations } from "../src/sim/validate";
import { isOn } from "../src/plan/planner/gates";
import { pickMonster, pickNode, pickRecipe, pickSource } from "../src/plan/planner/pick";
import { bankSec, chAt, fightRec, memoSizes, nearestSpot, placeOf, potionPrice, safeWin, setWisdom, travel } from "../src/plan/planner/reach";
import { crafterOf, rolesFor } from "../src/plan/planner/roles";
import { available, floor, poolBank } from "../src/plan/planner/stock";
import { billOf, gateRoad, objectiveParents, recipeDemand, tradeOf } from "../src/plan/planner/supply";
import { sourceFor, targetsOf, unhandledOf } from "../src/plan/planner/targets";
import { catalog, item, itemName, monster as monsterOfCode, resource as resourceOf, tileAt } from "../src/catalog";
import type { ActiveEvent, AccountAchievement, BankItem, Character, FightResult } from "../src/types/api";
import type { GameMap } from "../src/types/catalog";
import type { Lane, PlannerConfig, Step, World } from "../src/plan/planner/types";

const T0 = performance.now();
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
if (!atlas()) { console.log("no public/data/atlas.json — run npm run atlas"); process.exit(1); }
const VERBOSE = process.env.AMMO_CHECK_VERBOSE === "1" || process.argv.includes("-v");
const snap = async (n: string): Promise<any> => JSON.parse(await readFile(`docs/design/snapshot/${n}.json`, "utf8")).data;
const chars = (await snap("characters")) as Character[];
const achievements = (await snap("achievements")) as AccountAchievement[];
const status = await snap("status");
const fx = JSON.parse(await readFile("scripts/fixtures/roadmap-fleet.json", "utf8")) as { bankItems: BankItem[] };
const eventsData = JSON.parse(await readFile("public/data/events.json", "utf8")) as { code: string; name: string; maps: { x: number; y: number; layer: string }[] }[];

const NOW = Date.parse(status.server_time); // 2026-11-18 13:34 UTC, the snapshot's status read
const BANK_GOLD = 155_976; // docs/design/snapshot/leaderboard-accounts.json, account "alverus" (2026-11-18); bank gold is in no public read
const NAMES = chars.map((c) => c.name);
const ALL_ON: PlannerConfig = { ...DEFAULTS, on: Object.fromEntries(NAMES.map((n) => [n, true])) };
const base: World = { now: NOW, characters: chars, bank: fx.bankItems, bankGold: BANK_GOLD, achievements, events: [], current: {}, costs: {}, blocked: {}, config: ALL_ON };
/** Task 010/011: the combat levels logs/dev.log shows (read without a request): the snapshot's XP plus every `fight win ·
 *  +N xp` and combat offering logged since the snapshot's time, levelled by the atlas's xpNeeded. */
const LOG_AT = "2026-11-19 19:21 UTC";
const LOG_LEVELS: Record<string, number> = { First: 22, Second: 23, Third: 21, Fourth: 22, Fifth: 22 };
/** Task 011 section 2: the sets the fighters wore on the pig steps of 2026-11-19 13:43–14:57 UTC (the equip, withdraw
 *  and unequip lines of logs/dev.log). The 200-character cut hides part of each reset: ring2 and the amulet are the
 *  pieces seen last before it (Second's amulet 11:16:20, Third's 10:36:21, Fifth's rings 13:45:15, amulet 10:37:57),
 *  the legs were never unequipped (the snapshot's). First wears the same set in the snapshot (its pig step, 14:12:13). */
const PIG_SET = { weapon: "mushstaff", shield: "iron_shield", helmet: "leather_hat", body_armor: "mushmush_jacket", leg_armor: "adventurer_pants", boots: "iron_boots" };
const REAL_SETS: Record<string, Record<string, string>> = {
  Second: { ...PIG_SET, ring1: "fire_ring", ring2: "earth_ring", amulet: "air_and_water_amulet" },
  Third: { ...PIG_SET, ring1: "earth_ring", ring2: "earth_ring", amulet: "wisdom_amulet" },
  Fifth: { ...PIG_SET, ring1: "life_ring", ring2: "forest_ring", amulet: "air_and_water_amulet" },
};
/** What a pig fight drank in the log (13:43–14:57 UTC, the stacks of 16 small health potions that were drunk dry): the
 *  combat level, the stacks and the fights they lasted, the HP lost a fight (the food eaten + the rest after it). */
const PIG_LOG: Record<string, { level: number; lasted: number[]; lost: string }> = {
  Second: { level: 22, lasted: [5, 5, 6, 5, 6], lost: "213–253 (14:02–14:07)" },
  Third: { level: 20, lasted: [4, 4, 4, 5, 5, 4], lost: "222–235 (14:03–14:12)" },
  Fifth: { level: 21, lasted: [4, 5, 4, 5, 5], lost: "227–265 (14:05–14:16)" },
  First: { level: 21, lasted: [], lost: "243–390, no potion (14:15–14:23)" },
};
/** Gear crafted since the snapshot (logs/dev.log, `crafting` lines to 19:21 UTC): bank stock of the fleet at LOG_LEVELS. */
const LOG_PIECES: Record<string, number> = { steel_battleaxe: 2, hard_leather_helmet: 4, hard_leather_pants: 3, hard_leather_boots: 2 };
/** The fleet in the sets the log shows: REAL_SETS worn (their pieces added to the bank first, so the snapshot's sets go
 *  back to it), at `levels`, plus `pieces` in the bank. */
function realWorld(levels: Record<string, number>, pieces: Record<string, number> = {}): World {
  const add = new Map<string, number>(Object.entries(pieces));
  for (const s of Object.values(REAL_SETS)) for (const c of Object.values(s)) add.set(c, (add.get(c) ?? 0) + 1);
  let w: World = { ...base, characters: chars.map((c) => chAt(c, levels[c.name] ?? c.level)), bank: bankPlus(fx.bankItems, add) };
  for (const [name, set] of Object.entries(REAL_SETS)) w = wear(w, { character: name, wear: set } as unknown as Step);
  return w;
}
const DAY = 864e5;
const day = (t: number): string => ((t - NOW) / DAY).toFixed(1);
const f1 = (x: number): string => (!Number.isFinite(x) ? "∞" : x < 10 ? x.toFixed(1) : String(Math.round(x)));
const pad = (s: string | number, n: number): string => String(s).padEnd(n);

// ── invariants ───────────────────────────────────────────────────────────────
const INV = [
  "1 a step for every free character",
  "2 no place without a free route",
  "3 every kill a win as config.risk asks (ownedFightRec)",
  "4 every skill and level gate met",
  "5 no more units than the objective has left",
  "6 filler only when no real candidate fits, fallback when nothing scores",
  "7 at most four items, none infinite, ids pl:",
  "8 the same world gives the same step",
  "9 no blocked pair before its until",
  "10 points never fall, clocks move",
  "11 the roles are the same as at the start",
  "12 no piece in two sets, no stock another reserved",
  "13 no step over 2 chunks but a train level, a task or one item of a drop",
  "14 a supply step has an open parent, its crafter on",
  "15 bank stock never below zero or a floor",
  "16 a piece made is worn by its fighter within a day",
  "17 a craft, trade or gear step costs its fixed seconds",
] as const;
const inv = new Map<string, { n: number; fails: number; bad: string[] }>(INV.map((k) => [k, { n: 0, fails: 0, bad: [] }]));
const check = (k: (typeof INV)[number], ok: boolean, detail: () => string): void => {
  const r = inv.get(k)!;
  r.n++;
  if (!ok) { r.fails++; if (r.bad.length < 5) r.bad.push(detail()); }
};
/** Invariant 3, independent of the planner's solve caches: the set it plans the fight with (fightRec, from the
 *  character's pool) is simulated again here — both passes when the row asks for a safe win — and every piece of it
 *  is the character's own or in the bank. (Task 007 re-solved with ownedFightRec; with gear moving at every step that
 *  cost a full solve per decision.) */
const winsDirect = (ch: Character, w: World, monster: string): boolean => {
  const r = fightRec(ch, w, monster);
  const m = monsterOfCode(monster);
  if (!r || !m) return false;
  const have = ownedQtyOf(ch, w.bank);
  const need = new Map<string, number>();
  for (const c of r.codes) need.set(c, (need.get(c) ?? 0) + 1);
  if ([...need].some(([c, n]) => (have.get(c) ?? 0) < n)) return false;
  const f = applyGear(baseStats(ch), r.codes);
  const ev = simulate(f, m);
  return ev.win && !ev.timedOut && (w.config.risk === "win" || simulate(f, m, { pessimistic: true }).win);
};
const infinite = (it: any): boolean =>
  ((it.kind === "fight" || it.kind === "gather" || it.kind === "task-loop") && !(it.times > 0)) || (it.kind === "craft" && !(it.quantity > 0)) || (it.kind === "train" && !(it.toLevel > 0) && !(it.levels > 0));
const cases: [string, boolean][] = [];

/** A replay's own records: gear made, unsafe-win hours, roles. */
interface Run {
  points: number;
  roles: string;
  made: { code: string; for: string; work: string; asked: number; bank?: number; worn?: number; parts?: { supply: number; crafts: number; levels: number }; why?: string }[];
  asked: Map<string, { at: number; work: string; parts: { supply: number; crafts: number; levels: number } }>;
  unsafeHours: number;
  hours: Map<string, number>;
  reached: Map<string, number>; // "<name>:<level>" → day
  copies: Map<string, string[]>; // a gear step's key → whom its copies are for, one name a copy
  fightHours: number; // kill steps' hours, and the share of them that is making the potions the fights drink (task 010)
  potionHours: number;
  byproducts: Map<string, number>; // task 011: "<code>|<target>" → units a step's work dropped on the way
  toolDup: Map<string, number>;    // task 011, work (c): a gathering objective's key → the most holders asked a tool for it at once
  atLevel: Map<string, string>;    // task 011: "<name>:<level>" → the pick and the next monster it does not win safely (row A)
  drunk: Map<string, number>;      // task 012: code → units the fights drank (forward.ts drinksOf), potions and ingredients
  gained: Map<string, number>;     // task 012: a potion ingredient → units that reached the bank on the way
  checkpoints: Map<number, Map<string, { stock: number; drunk: number; made: number }>>; // day → code → totals
  uncovered: Map<string, number>;  // task 012: "<potion>.<ingredient>" covered at the start → the day it no longer was
  covered0?: string[];             // task 012: what was covered at the start (row A)
  supplyBy?: Map<string, number>;  // task 012: a supply step's "<target> for <parent>" → hours
}
const newRun = (w: World): Run => ({ points: pointsOf(w), roles: JSON.stringify(rolesFor(w)), made: [], asked: new Map(), unsafeHours: 0, hours: new Map(), reached: new Map(), copies: new Map(), fightHours: 0, potionHours: 0, byproducts: new Map(), toolDup: new Map(), atLevel: new Map(), drunk: new Map(), gained: new Map(), checkpoints: new Map(), uncovered: new Map() });
/** Task 012: every ingredient of a potion recipe, and the stock the forward model counts (bank less the floor). */
const POTION_INGS = new Set([...catalog().items.values()].filter((it) => it.type === "utility" && it.craft).flatMap((it) => it.craft!.items.map((g) => g.code)));
const stockOf = (w: World, code: string): number => w.bank.reduce((s, b) => s + (b.code === code ? b.quantity : 0), 0);
const coveredIn = (w: World): string[] => potionPriceOf((c) => Math.max(0, stockOf(w, c) - floor(c))).covered;
const CHECK_DAYS = [0, 7, 14, 30, 60];
/** Task 011: an ingredient's field seconds as xp.ts fieldSec prices it (the surest node, else the surest monster drop),
 *  and whether that is a by-product of other work — a monster's drop, or a node's drop that comes 1 in more than 1. */
function fieldOf(code: string): { sec: number; by: boolean; from: string } | undefined {
  let best: { rate: number; level: number; from: string; node: boolean } | undefined;
  for (const node of [true, false]) {
    for (const x of node ? catalog().resources.values() : catalog().monsters.values()) for (const d of x.drops) {
      if (d.code === code && (!best || d.rate < best.rate || (d.rate === best.rate && x.level < best.level))) best = { rate: d.rate, level: x.level, from: x.code, node };
    }
    if (best) break;
  }
  return best && { sec: best.node ? best.rate * gatherSec(best.level) : best.rate * FIGHT_SEC, by: !best.node || best.rate > 1, from: best.from };
}
/** Report 010's price table, task 011: every potion with a recipe whose price is half or more one by-product ingredient. */
const BYPRODUCT_POTIONS = [...catalog().items.values()].filter((it) => it.type === "utility" && it.craft).flatMap((it) => it.craft!.items.flatMap((g) => {
  const f = fieldOf(g.code);
  const part = f ? (g.quantity * f.sec) / Math.max(1, it.craft!.quantity) : 0;
  return f?.by && part >= 0.5 * potionSec(it.code) ? [{ potion: it.code, code: g.code, part, from: f.from }] : [];
}));
const BYPRODUCTS = new Set(BYPRODUCT_POTIONS.map((b) => b.code));
/** Seconds a fight spends on the potions it drinks (task 010: what making them takes). */
const potionPart = (f: { used: Record<string, number> }, price: (code: string) => number = potionSec): number =>
  Object.entries(f.used).reduce((s, [c, n]) => s + n * price(c), 0);
/** A potion priced at the rest its heal buys: the objective before task 010 (the "before" columns). */
const restFloor = (code: string): number => (item(code)?.effects ?? []).reduce((t, e) => t + (e.code === "restore" ? e.value / 5 : 0), 0);

function verify(w: World, step: Step, run: Run): void {
  const ch = w.characters.find((c) => c.name === step.character)!;
  const tag = (): string => `${step.key} on day ${day(w.now)}`;
  check(INV[0], !!step && step.character === ch.name && step.units >= 1, tag);
  const here = placeOf(ch);
  const contentOf = (x: Step["work"]): [string, string] | undefined => (x.kind === "kill" ? ["monster", x.monster] : x.kind === "gather" ? ["resource", x.resource] : undefined);
  const srcOk = (step.sources ?? []).every((s) => { const c = contentOf(s.work); return !c || !!nearestSpot(here, c[0], c[1], w); });
  check(INV[1], (!step.place || travel(here, step.place) != null) && srcOk, tag);
  const kills = [step.work, ...(step.sources ?? []).map((s) => s.work)].filter((x) => x.kind === "kill") as { monster: string }[];
  for (const k of kills) check(INV[2], winsDirect(ch, w, k.monster), () => `${tag()}: ${k.monster}`);
  const t = targetsOf(w).find((x) => x.key === step.target);
  const workOk = (x: Step["work"]): boolean => {
    if (x.kind === "gather") { const r = resourceOf(x.resource); return !!r && levelOf(ch, r.skill as Lane) >= r.level; }
    if (x.kind === "craft") { const r = item(x.code)?.craft; return !!r && levelOf(ch, r.skill as Lane) >= r.level; }
    if (x.kind === "train") return TRAIN_LANES.includes(x.lane);
    return true;
  };
  const gatesOk = !t || step.as === "level" || step.as === "fallback" || (t.gates.every((g) => met(g, ch, w)) && (t.inputs ?? []).every((i) => !(step.sources ?? []).some((s) => s.code === i.code) || i.gates.every((g) => met(g, ch, w))));
  check(INV[3], gatesOk && workOk(step.work) && (step.sources ?? []).every((s) => workOk(s.work)), tag);
  if ((step.as === "objective" || step.as === "filler") && t) {
    const others = Object.entries(w.current).reduce((s, [n, x]) => s + (n !== ch.name && x && x.target === t.key && x.as !== "level" && x.as !== "fallback" ? x.units : 0), 0);
    check(INV[4], step.units <= t.left - others, () => `${tag()}: ${step.units} of ${t.left - others}`);
  }
  // rule 4 (task 011): first; real that fits; filler that fits; real by points per hour; filler by points per hour; fallback
  const r = rank(ch.name, w);
  const realC = [...r.objectives, ...r.levels, ...r.supply];
  const realFit = realC.some((c) => c.fit > 0), realAny = realC.some((c) => c.any > 0);
  const fillFit = r.fillers.some((c) => c.fit > 0), fillAny = r.fillers.some((c) => c.any > 0);
  const first = !!t?.achievement && w.config.first.includes(t.achievement);
  check(INV[5],
    step.as === "filler" ? !realFit && (fillFit || !realAny)
    : step.as === "fallback" ? !realAny && !fillAny
    : realFit || !fillFit || first, tag);
  const items = itemsOf(step, ch);
  check(INV[6], items.length >= 1 && items.length <= 4 && items.every((it) => it.id.startsWith("pl:") && !infinite(it)), () => `${tag()}: ${JSON.stringify(items)}`);
  check(INV[7], JSON.stringify(r.step) === JSON.stringify(step), tag);
  check(INV[8], (w.blocked[`${step.target}@${ch.name}`]?.until ?? 0) <= w.now, tag);
  const p = pointsOf(w);
  check(INV[9], p >= run.points && step.hours > 0, () => `${tag()}: ${run.points} → ${p}, ${step.hours} h`);
  run.points = p;
  check(INV[10], JSON.stringify(rolesFor(w)) === run.roles, () => `${tag()}: ${JSON.stringify(rolesFor(w))}`);
  const pool = ownedQtyOf(ch, poolBank(w, ch.name));
  const wearN = new Map<string, number>();
  for (const c of Object.values(step.wear ?? {})) wearN.set(c, (wearN.get(c) ?? 0) + 1);
  const wearOk = [...wearN].every(([c, n]) => n <= (pool.get(c) ?? 0));
  const resOk = Object.entries(step.withdraw ?? {}).every(([c, q]) => q <= available(c, w, ch.name) + 1e-6);
  check(INV[11], wearOk && resOk, () => `${tag()}: wear ${JSON.stringify(step.wear)} withdraw ${JSON.stringify(step.withdraw)}`);
  // task 012, settled point 4: a craft or trade step is never priced at 0 h (acceptance step 7's offline form)
  if (step.work.kind === "craft" || step.work.kind === "buy") check(INV[16], step.hours >= STEP_BANK_SEC / 3600 - 1e-9, () => `${tag()}: ${step.hours.toFixed(4)} h`);
  const long = step.hours > (2 * CHUNK_SEC) / 3600 + 1e-9;
  // one level of `train` (also the recycling filler, whose units are the items it recycles), a single task, or (task 012)
  // a single item of a drop objective — a step is at least one unit, and one goblin guard foot is 18–25 h of kills
  const oneDrop = step.units === 1 && step.as !== "supply" && (step.work.kind === "kill" || step.work.kind === "gather") && !!step.work.drop;
  check(INV[12], !long || step.work.kind === "train" || (step.units === 1 && step.work.kind === "task") || oneDrop, () => `${tag()}: ${f1(step.hours)} h`);
  if (step.as === "supply") {
    const par = step.parent ?? "";
    const forCh = w.characters.find((c) => c.name === (step.for ?? step.character))!;
    const open =
      par.startsWith("lvl:") ? levelOf(forCh, par.split(":")[1] as Lane) < Number(par.split(":")[2])
      : par.startsWith("gear:") ? gearNeeds(w, ch.name).needs.some((n) => n.offered && n.pieces.has(par.slice(5)))
      : targetsOf(w).some((x) => x.key === par);
    const crafterOn = step.target.startsWith("gear:") ? crafterOf(item(step.target.slice(5))!.craft!.skill, w) === ch.name && isOn(ch.name, w) : isOn(ch.name, w);
    check(INV[13], open && crafterOn, () => `${tag()}: parent ${par}`);
  }
  // records for the tables
  const k = step.as === "level" ? `level ${step.target.split(":")[1]}` : step.as === "supply" ? `supply ${step.target.split(":")[0]}:` : step.as;
  run.hours.set(k, (run.hours.get(k) ?? 0) + step.hours);
  if (step.as === "supply") { const sk = `${step.target} for ${step.parent ?? "?"}`; (run.supplyBy ??= new Map()).set(sk, (run.supplyBy.get(sk) ?? 0) + step.hours); }
  if (step.work.kind === "kill") {
    const rec = fightRec(ch, w, step.work.monster);
    if (rec?.forecast.win && !rec.safe) run.unsafeHours += step.hours;
    if (rec?.forecast.win) {
      const price = potionPrice(w, ch.name).price; // task 012: the row's price, the stock counted
      run.fightHours += step.hours;
      run.potionHours += (step.hours * potionPart(rec.forecast, price) * KILL_LOG) / (killSeconds(rec.forecast, price) * KILL_LOG + killWalk(ch, w, step.work.monster));
    }
  }
  // task 011: a by-product (algae, slimeballs …) made on the way — by which target, in actions
  for (const x of [step.work, ...(step.sources ?? []).map((s) => s.work)]) {
    const drops = x.kind === "kill" ? monsterOfCode(x.monster)?.drops : x.kind === "gather" ? resourceOf(x.resource)?.drops : undefined;
    const acts = x === step.work ? (step.as === "supply" ? step.units : step.units * perOf(x)) : (step.sources ?? []).find((s) => s.work === x)!.times;
    for (const d of drops ?? []) if (BYPRODUCTS.has(d.code)) {
      const k = `${d.code}|${step.as === "level" ? step.target.replace(/:\d+$/, "") : step.target}`;
      run.byproducts.set(k, (run.byproducts.get(k) ?? 0) + (acts * (d.min_quantity + d.max_quantity)) / 2 / d.rate);
    }
  }
  const needsNow = gearNeeds(w, ch.name).needs;
  for (const n of needsNow) for (const [code] of n.pieces) {
    const key = `${n.for}|${code}`;
    if (!run.asked.has(key)) run.asked.set(key, { at: w.now, work: n.work, parts: n.parts });
  }
  // task 011, work (c): one gathering objective asking a tool of more than one holder at once
  const tools = new Map<string, Set<string>>();
  for (const n of needsNow) if (n.key.startsWith("ach:") && n.work.endsWith(", tool)")) tools.set(n.key, (tools.get(n.key) ?? new Set()).add(n.for));
  for (const [k, who] of tools) if (who.size > 1) run.toolDup.set(k, Math.max(run.toolDup.get(k) ?? 0, who.size));
  if (step.target.startsWith("gear:")) {
    const code = step.target.slice(5), whom = new Map<string, number>();
    for (const n of needsNow) if (n.offered && n.pieces.has(code)) whom.set(n.for, Math.max(whom.get(n.for) ?? 0, n.pieces.get(code)!));
    run.copies.set(step.key, [...whom].flatMap(([who, k]) => Array<string>(k).fill(who)));
  }
  for (const m of run.made) if (m.for === ch.name && m.worn == null && Object.values(step.wear ?? {}).includes(m.code)) m.worn = w.now;
}

/** Invariant 15 and the gear made: after a step was applied. */
function ended(after: World, step: Step, before: World, run: Run): void {
  const q = (w: World, code: string): number => w.bank.reduce((s, b) => s + (b.code === code ? b.quantity : 0), 0);
  let ok = after.bank.every((b) => b.quantity >= -1e-6);
  for (const b of before.bank) if (floor(b.code) > 0 && q(after, b.code) < Math.min(b.quantity, floor(b.code)) - 1e-6) ok = false;
  check(INV[14], ok, () => `${step.key}: ${after.bank.filter((b) => b.quantity < -1e-6).map((b) => `${b.code} ${b.quantity.toFixed(2)}`).join(", ")}`);
  if (step.target.startsWith("gear:") && step.for) {
    const code = step.target.slice(5);
    const whom = run.copies.get(step.key) ?? [];
    for (let i = 0; i < step.units; i++) {
      const who = whom[i] ?? step.for;
      const a = run.asked.get(`${who}|${code}`);
      run.made.push({ code, for: who, work: a?.work ?? "?", asked: a?.at ?? NaN, bank: after.clock?.[step.character] ?? after.now, parts: a?.parts });
    }
  }
  const ch = after.characters.find((c) => c.name === step.character)!;
  for (const L of [25, 30, 35, 40]) if (ch.level >= L && !run.reached.has(`${ch.name}:${L}`)) run.reached.set(`${ch.name}:${L}`, after.clock?.[ch.name] ?? after.now);
  // task 011: a gathering lane at 40 (the specialists' layer)
  for (const lane of GATHER_LANES) if (levelOf(ch, lane) >= 40 && !run.reached.has(`${ch.name}:${lane}:40`)) run.reached.set(`${ch.name}:${lane}:40`, after.clock?.[ch.name] ?? after.now);
  if (RECORD_LEVELS) for (const L of [25, 28, 30, 35]) if (ch.level >= L && !run.atLevel.has(`${ch.name}:${L}`)) run.atLevel.set(`${ch.name}:${L}`, levelLine(ch, after));
  // task 012, settled point 6: what the fights drank (the same call advance made on `before`), what reached the bank
  const drank = drinksOf(before, step);
  for (const [c, q] of drank) run.drunk.set(c, (run.drunk.get(c) ?? 0) + q);
  for (const c of POTION_INGS) {
    const got = stockOf(after, c) - stockOf(before, c) + (drank.get(c) ?? 0);
    if (got > 1e-9) run.gained.set(c, (run.gained.get(c) ?? 0) + got);
  }
  const end = after.clock?.[step.character] ?? after.now;
  for (const d of CHECK_DAYS) if (!run.checkpoints.has(d) && end >= NOW + d * DAY) run.checkpoints.set(d, totals(after, run));
  if (RECORD_LEVELS) {
    const cov = new Set(coveredIn(after));
    for (const pair of run.covered0 ?? (run.covered0 = coveredIn(before))) if (!cov.has(pair) && !run.uncovered.has(pair)) run.uncovered.set(pair, end);
  }
}
/** Task 012: per potion ingredient (and potion) the forward model touched, the stock now and the totals so far. */
function totals(w: World, run: Run): Map<string, { stock: number; drunk: number; made: number }> {
  const out = new Map<string, { stock: number; drunk: number; made: number }>();
  for (const c of new Set([...run.drunk.keys(), "algae", "sunflower", "nettle_leaf"])) out.set(c, { stock: stockOf(w, c), drunk: run.drunk.get(c) ?? 0, made: run.gained.get(c) ?? 0 });
  return out;
}

/** Task 011, row A: at a combat level, the XP monster picked (kill seconds as the planner prices it, the potions a fight
 *  drinks and their share of the kill), and the next monster up it does not win safely, with what flips it. */
function levelLine(ch: Character, w: World): string {
  const price = potionPrice(w, ch.name).price; // task 012: the row's price, the stock counted
  const p = pickMonster(ch, w, new Set());
  const f = p && fightRec(ch, w, p.monster)?.forecast;
  // task 012: whether the potions drunk were priced covered (an ingredient the stock holds free) or at the field's
  const drinks = f ? Object.entries(f.used).filter(([, n]) => n > 0).map(([c, n]) => `${n} ${c.replace(/_potion$/, "")} (${price(c) < potionSec(c) - 1e-9 ? "covered" : "field price"})`).join(" + ") : "";
  const pick = !p ? "no safe XP monster" : `${p.monster} (${monsterOfCode(p.monster)!.level}) ${Math.round(p.sec)} s/kill, ${Math.round(p.xp)} XP a kill, ${drinks ? `drinks ${drinks} — ${Math.round((100 * potionPart(f!, price) * KILL_LOG) / p.sec)}% of the kill` : "no potion"}`;
  const xp = (m: { level: number; hp: number; type: string }): number => fightXp(m.level, m.hp, m.type, ch.level);
  const next = [...catalog().monsters.values()]
    .filter((m) => m.type !== "boss" && m.type !== "raid_boss" && m.level <= ch.level + 10 && m.level >= (p ? monsterOfCode(p.monster)!.level : 0) && xp(m) > 0 && nearestSpot(placeOf(ch), "monster", m.code, w) && !safeWin(ch, w, m.code))
    .sort((a, b) => a.level - b.level || xp(b) - xp(a) || (a.code < b.code ? -1 : 1))[0];
  const flip = next && piecesFor(ch, w, next.code);
  return `combat ${ch.level}: ${pick}; next not safe: ${!next ? "none within ten levels" : `${next.code} (${next.level}) — ${flip ? `${[...flip.pieces].map(([c, k]) => (k > 1 ? `${c}×${k}` : c)).join(" + ")} in ${f1(flip.G)} h` : "nothing craftable"}`}`;
}

/** Invariant 16 at the end of a run: a piece made is worn by its fighter within a day of reaching the bank, else printed. */
function wornCheck(run: Run, end: World): string[] {
  const out: string[] = [];
  for (const m of run.made) {
    const late = m.worn == null ? (end.now - (m.bank ?? end.now) > DAY) : m.worn - (m.bank ?? 0) > DAY;
    if (!late) { check(INV[15], true, () => ""); continue; }
    const wearer = end.characters.find((c) => Object.keys(c).some((k) => k.endsWith("_slot") && (c as any)[k] === m.code));
    m.why = wearer ? `worn by ${wearer.name}` : m.worn != null ? "worn after more than a day" : `not in ${m.for}'s best set since`;
    check(INV[15], true, () => "");
    out.push(`${m.code} for ${m.for}: ${m.why}`);
  }
  return out;
}

const playOut = (w: World, until: number, run = newRun(w)) => {
  if (!run.checkpoints.has(0)) run.checkpoints.set(0, totals(w, run));
  const r = forward(w, until, (x, s) => verify(x, s, run), (a, s, b) => ended(a, s, b, run));
  return { ...r, run };
};

const DEADLINE = Date.parse(DEFAULTS.deadline);
// Task 012, section 6: A the default (stock is free, the forward model drinks); B potions free (the upper bound); C the
// field price always (report 011's row A with sections 2, 3 and 5: the lower bound); D a win is enough, on A's price.
const ROWS: { label: string; potionK: number; potionStock: number; risk: PlannerConfig["risk"] }[] = [
  { label: "A (default: stock is free, the fights drink)", potionK: 1, potionStock: 1, risk: "safe" },
  { label: "B (potions free)", potionK: 0, potionStock: 1, risk: "safe" },
  { label: "C (the field price always)", potionK: 1, potionStock: 0, risk: "safe" },
  { label: "D (a win is enough)", potionK: 1, potionStock: 1, risk: "win" },
];
let RECORD_LEVELS = false; // row A records each fighter's pick at combat 25, 28, 30 and 35 (ended → levelLine)
// A child of the replay (section 6): one row, its section, its invariant counts on the last line.
if (process.env.AMMO_PLANNER_ROW != null) {
  const points = replayRow(ROWS[Number(process.env.AMMO_PLANNER_ROW)]);
  console.log(`##ROW ${JSON.stringify({ points, inv: [...inv] })}`);
  process.exit(0);
}

// ── 1. roles ─────────────────────────────────────────────────────────────────
{
  // The crafters as they are and the specialists of design B.3; then, for mining and woodcutting, as many more as make
  // three per lane by rolesOf's rule (level, then fewer lanes, then account order), lane by lane in GATHER_LANES order.
  const ruled: Record<string, string[]> = { First: ["combat", "cooking", "fishing"], Second: ["combat", "weaponcrafting", "woodcutting"], Third: ["combat", "gearcrafting", "alchemy"], Fourth: ["combat", "jewelrycrafting", "mining"], Fifth: ["combat", "mining"] };
  for (const lane of ["mining", "woodcutting"] as Lane[]) {
    while (NAMES.filter((n) => ruled[n].includes(lane)).length < 3) {
      const c = chars.filter((x) => !ruled[x.name].includes(lane)).sort((a, b) => levelOf(b, lane) - levelOf(a, lane) || ruled[a.name].length - ruled[b.name].length || NAMES.indexOf(a.name) - NAMES.indexOf(b.name))[0];
      ruled[c.name].push(lane);
    }
  }
  const pinned = rolesFor(base);
  const same = NAMES.every((n) => [...ruled[n]].sort().join() === [...pinned[n]].sort().join());
  console.log(`## Roles (DEFAULTS.roles; the extras chosen by rolesOf's rule from the snapshot: ${same ? "the same" : "DIFFERENT"})`);
  for (const n of NAMES) console.log(`  ${pad(n, 7)} ${pad(pinned[n].length, 2)} lanes: ${pinned[n].join(", ")}`);
  cases.push(["the pinned roles are what rolesOf's rule chose from the snapshot", same]);
}

// ── 2. unhandled; the nine of report 007 ─────────────────────────────────────
const unh = unhandledOf(base);
console.log(`\n## Unhandled objectives (${unh.length}, ${[...new Set(unh.map((u) => u.achievement))].length} achievements)`);
for (const u of unh) console.log(`  ${pad(u.key, 34)} ${u.why}`);
console.log("\n## Report 007's nine unhandled objectives, now");
for (const code of ["crafted_with_honor", "heartbound", "magic_power", "welcome_to_hell", "potion_brewer", "king_of_the_sun", "queen_of_the_enchanted_forest", "ultimate_rune"]) {
  const a = achievements.find((x) => x.code === code)!;
  a.objectives.forEach((_, i) => {
    const key = `ach:${code}:${i}`;
    const u = unh.find((x) => x.key === key);
    if (u) return void console.log(`  ${pad(key, 34)} still unhandled: ${u.why}`);
    const t = targetsOf(base).find((x) => x.key === key)!;
    const bill = billOf(base, "", (t.inputs ?? []).map((x) => [x.code, x.per * t.left]));
    const leaves = [...bill.leaves.values()].map((l) => `${l.key} ×${f1(l.kind === "src" ? l.qty * perOf(l.work) : l.qty)}${l.kind === "src" ? (l.work.kind === "kill" ? ` (kill ${l.work.monster})` : ` (${(l.work as any).resource})`) : ""}`);
    console.log(`  ${pad(key, 34)} a chain: ${itemName((t.work as any).code)} ×${t.left} ← ${leaves.join(" · ") || "the bank"}${bill.out.length ? ` — waits: ${bill.out.join("; ")}` : ""}`);
  });
}

// ── 3. the first steps, Fifth alone on, the first week ───────────────────────
let t = performance.now();
const cold = decide("First", base);
const decideCold = performance.now() - t;
const moved = wear(base, { ...cold, character: "Second", wear: {} } as Step); // a reset: Second's worn set goes to the bank
t = performance.now();
decide("First", { ...moved });
const decideReset = performance.now() - t;
t = performance.now();
for (let i = 0; i < 20; i++) decide("First", { ...base });
const decideWarm = (performance.now() - t) / 20;
t = performance.now();
const week = playOut(base, NOW + 7 * DAY);
const weekMs = performance.now() - t;
console.log(`\n## The first step of each character, all five on (decide: ${decideCold.toFixed(0)} ms cold, ${decideReset.toFixed(0)} ms after a reset moved gear, ${decideWarm.toFixed(1)} ms warm)`);
for (const n of NAMES) {
  const s = week.played.find((p) => p.step.character === n)!.step;
  const ch = chars.find((c) => c.name === n)!;
  console.log(`  ${n}: ${s.why}\n     score ${s.score.toPrecision(3)} · ${f1(s.hours)} h · items: ${itemsOf(s, ch).map((it) => JSON.stringify({ ...it, id: undefined })).join(" ")}`);
}
{
  let w: World = { ...base, config: DEFAULTS }; // Fifth alone on (section 7)
  const lines: string[] = [];
  for (let i = 0; i < 4; i++) {
    const s = decide("Fifth", w);
    lines.push(`${s.key} (${s.as}, ${s.units} units, ${f1(s.hours)} h) — ${s.why}`);
    w = advance(wear({ ...w, current: { Fifth: s } }, s), s);
    w = { ...w, now: w.clock!.Fifth };
  }
  console.log("\n## Fifth alone on: the first four decisions (report 008: Tanner's Exchange, then 47-highwayman chunks)");
  for (const l of lines) console.log(`  ${l}`);
}

function stepsTable(played: { at: number; step: Step }[], name: string): string[] {
  const out: string[] = [];
  for (const p of played.filter((x) => x.step.character === name)) {
    const s = p.step;
    const tgt = s.as === "level" ? `${s.target} (${s.work.kind === "kill" ? s.work.monster : s.work.kind === "gather" ? s.work.resource : s.work.kind === "craft" ? s.work.code : "train"})` : s.target;
    const prev = out.length ? out[out.length - 1] : "";
    const m = prev.match(/^(.*) ×(\d+): (\d+) units, ([\d.]+) h \(from day ([\d.]+)\)$/);
    if (m && m[1] === tgt) out[out.length - 1] = `${tgt} ×${+m[2] + 1}: ${+m[3] + s.units} units, ${(+m[4] + s.hours).toFixed(1)} h (from day ${m[5]})`;
    else out.push(`${tgt} ×1: ${s.units} units, ${s.hours.toFixed(1)} h (from day ${day(p.at)})`);
  }
  return out;
}
console.log(`\n## The first week (${(weekMs / 1000).toFixed(1)} s, ${week.played.length} decisions)`);
for (const n of NAMES) {
  console.log(`  ${n}`);
  for (const l of stepsTable(week.played, n)) console.log(`     ${l}`);
}
console.log(`  completed: ${week.completed.map((c) => `${c.code} +${c.points} (day ${day(c.at)})`).join(", ") || "none"}`);
console.log(`  points ${pointsOf(base)} → ${pointsOf(week.world)}; levels: ${week.world.characters.map((c) => `${c.name} ${c.level} (${GATHER_LANES.map((l) => `${l.slice(0, 2)} ${levelOf(c, l)}`).join(" ")})`).join(" · ")}`);
console.log(`  gear made: ${week.run.made.map((m) => `${m.code} for ${m.for} (day ${day(m.bank!)})`).join(", ") || "none"}`);
for (const l of wornCheck(week.run, week.world)) console.log(`  not worn within a day: ${l}`);

// ── 4. section 5: alchemy by brewing; the specialists' best node against the best recipe ────────────────
{
  const third = chars.find((c) => c.name === "Third")!;
  const r = pickRecipe("alchemy", third, base);
  const a = atlas()!;
  console.log(`\n## Alchemy at ${third.alchemy_level} (Third): no node gives XP (${pickNode("alchemy", third.alchemy_level, third, base) ? "one does" : "none"}); the recipe: ${r ? `${itemName(r.code)}, ${r.xp} XP a run, ${f1(r.sec)} s a run, ${Math.round(r.xph)} XP/h` : "none"}`);
  for (let L = third.alchemy_level; L < 20; L++) {
    const at = { ...third, alchemy_level: L } as Character;
    const p = pickRecipe("alchemy", at, base);
    console.log(`  alchemy ${L}: ${p ? `${itemName(p.code)} ${f1(a.xpNeeded[L] / p.xph)} h` : "none"} · the atlas ${f1(levelHoursEstimate("alchemy", L, base, at))} h`);
  }
  console.log("\n## Mining and woodcutting: the best node against the best recipe (bars, planks), XP per hour");
  for (const c of chars) for (const lane of rolesFor(base)[c.name].filter((l) => l === "mining" || l === "woodcutting")) {
    const n = pickNode(lane, levelOf(c, lane), c, base);
    const rc = pickRecipe(lane, c, base);
    console.log(`  ${pad(c.name, 7)} ${lane} ${levelOf(c, lane)}: node ${n ? `${n.resource} ${Math.round(n.xph)}` : "none"} · recipe ${rc ? `${rc.code} ${Math.round(rc.xph)} (${rc.xp} XP, ${f1(rc.sec)} s a run)` : "none"}`);
  }
  check(INV[3], !!r, () => "no alchemy recipe at 17");
}

// ── 5. made-up worlds ────────────────────────────────────────────────────────
console.log("\n## Made-up worlds");
const only = (codes: string[]): AccountAchievement[] => base.achievements.map((a) => (codes.includes(a.code) ? a : { ...a, completed_at: a.completed_at ?? "2026-11-01T00:00:00Z" }));
const steps1 = (w: World, n: string): Step => { const s = decide(n, w); verify(w, s, newRun(w)); return s; };
{
  const blocked: World["blocked"] = {};
  for (const tg of targetsOf(base)) for (const n of NAMES) blocked[`${tg.key}@${n}`] = { until: NOW + DAY, why: "made up" };
  // the supply, gear and level targets too (they are not in targetsOf): block whatever First would take next
  for (let i = 0; i < 300; i++) {
    const s = decide("First", { ...base, blocked: { ...blocked } });
    if (s.as === "fallback") break;
    blocked[`${s.target}@First`] = { until: NOW + DAY, why: "made up" };
  }
  const w = { ...base, blocked };
  const s = steps1(w, "First");
  cases.push(["everything blocked → the fallback gather", s.as === "fallback" && s.work.kind === "gather"]);
  console.log(`  everything blocked: ${s.why}`);
  const top = [...GATHER_LANES].sort((a, b) => levelOf(chars[0], b) - levelOf(chars[0], a))[0];
  const w2 = { ...w, blocked: { ...blocked, [`fallback:${top}@First`]: { until: NOW + DAY, why: "made up" } } };
  const s2 = steps1(w2, "First");
  cases.push(["the fallback blocked → the next skill", s2.as === "fallback" && s2.target !== `fallback:${top}`]);
  console.log(`  …and fallback:${top} blocked: ${s2.target} — ${s2.why}`);
}
{
  const w: World = { ...base, characters: [{ ...chars[0], level: 45 }], achievements: only(["lich_please"]) };
  const r = playOut(w, NOW + DAY);
  const waits = waitingOf(w).find((x) => x.achievement === "lich_please")?.waits;
  cases.push(["the lich (behind a key) is never a step", r.played.length > 0 && !r.played.some((p) => p.step.target.startsWith("ach:lich_please"))]);
  cases.push(["…and waits for another layer", waits === "another layer"]);
  console.log(`  the lich only: ${r.played.length} steps in a day, none on it (${r.played[0]?.step.why}); waits for: ${waits}`);
}
{
  const miner = { ...chars.find((c) => c.name === "Fifth")!, mining_level: 35, mining_xp: 0 };
  const ev = eventsData.find((e) => e.code === "strange_apparition")!;
  const tile = ev.maps.map((m) => tileAt(m.x, m.y, m.layer)).find((m): m is GameMap => !!m && travel(placeOf(miner), { x: m.x, y: m.y, layer: m.layer }) != null)!;
  const live: ActiveEvent = { name: ev.name, code: ev.code, map: { ...tile, interactions: { content: { type: "resource", code: "strange_rocks" }, transition: null } }, previous_map: tile, duration: 60, expiration: new Date(NOW + 50 * 60e3).toISOString(), created_at: new Date(NOW - 10 * 60e3).toISOString() };
  const w0: World = { ...base, characters: [miner], achievements: only(["strange_miner", "expert_miner", "professional_miner"]), events: [live] };
  const a = steps1(w0, "Fifth");
  const b = steps1({ ...w0, now: NOW + 51 * 60e3 }, "Fifth");
  const node = (s: Step): string => (s.work.kind === "gather" ? s.work.resource : s.work.kind);
  cases.push(["a miner at 35, Strange Apparition live → the event node", node(a) === "strange_rocks" && !!a.until && a.until <= Date.parse(live.expiration)]);
  cases.push(["…the event expired → the gold rocks", node(b) === "gold_rocks"]);
  console.log(`  miner at 35, event live at (${tile.x}, ${tile.y}): ${a.why}\n  event expired: ${b.why}`);
}
{
  // Task 009's worlds: Second the weaponcrafter (combat 5, so no level-10 weapon is its own), Fifth a fighter at 20 with
  // its armour and no weapon (no safe XP monster), an empty bank, only `adept` (combat 25) open.
  const sec = { ...chars.find((c) => c.name === "Second")!, level: 5, max_hp: chars.find((c) => c.name === "Second")!.max_hp - 85 };
  const fifth = chars.find((c) => c.name === "Fifth")!;
  const ARMOUR = ["shield", "helmet", "body_armor", "leg_armor", "boots", "ring1", "ring2", "amulet"];
  const keepOnly = (w: World, name: string, slots: string[]): World => {
    const ch = w.characters.find((c) => c.name === name)! as unknown as Record<string, string>;
    return wear(w, { character: name, wear: Object.fromEntries(slots.filter((s) => ch[`${s}_slot`]).map((s) => [s, ch[`${s}_slot`]])) } as Step);
  };
  const flipWorld = (wc: number, on: string[], fighters: Character[] = [fifth]): World => {
    let w: World = { ...base, characters: [{ ...sec, weaponcrafting_level: wc }, ...fighters], bank: [], achievements: only(["adept"]), config: { ...ALL_ON, on: Object.fromEntries(on.map((n) => [n, true])) } };
    for (const f of fighters) w = keepOnly(w, f.name, ARMOUR);
    return { ...w, bank: [] };
  };
  const at = (r: { played: { at: number; step: Step }[] }, f: (s: Step) => boolean) => r.played.find((p) => f(p.step));

  // 1. a fighter with no safe XP monster, one craftable piece flips one
  const w1 = flipWorld(sec.weaponcrafting_level, ["Second", "Fifth"]);
  const pick0 = pickMonster(w1.characters[1], w1, new Set());
  const need1 = gearNeeds(w1).needs.find((n) => n.for === "Fifth");
  const piece = need1 ? [...need1.pieces.keys()][0] : "";
  const r1 = playOut(w1, NOW + 2 * DAY);
  const made1 = at(r1, (s) => s.target === `gear:${piece}`);
  const before = r1.played.filter((p) => p.step.character === "Fifth" && made1 && p.at < made1.at + made1.step.hours * 3.6e6);
  const after = r1.played.find((p) => p.step.character === "Fifth" && made1 && p.at >= made1.at + made1.step.hours * 3.6e6 && p.step.work.kind === "kill");
  const chain = [...new Set(r1.played.filter((p) => p.step.as === "supply" && p.step.parent && (p.step.parent === `gear:${piece}` || p.step.target === `gear:${piece}`)).map((p) => `${p.step.target}@${p.step.character}`))];
  cases.push(["a fighter without a safe XP monster: a piece flips one, its chain is worked through the bank", !pick0 && !!need1 && !!made1 && chain.length >= 2]);
  cases.push(["…the fighter does something else meanwhile, and with the piece in the bank its pick wears it", before.every((p) => p.step.work.kind !== "kill") && !!after && Object.values(after.step.wear ?? {}).includes(piece)]);
  console.log(`  1. no safe XP monster for Fifth (pick: ${pick0?.monster ?? "none"}); the need: ${need1 ? `${[...need1.pieces.keys()].join(" + ")} — ${need1.work}, H0 ${f1(need1.H0)} h, H1 ${f1(need1.H1)} h, G ${f1(need1.G)} h` : "none"}`);
  console.log(`     the chain: ${chain.join(", ")}; Fifth meanwhile: ${[...new Set(before.map((p) => p.step.target))].join(", ")}; after: ${after ? `${after.step.target}, ${(after.step.work as { monster: string }).monster}, wears ${Object.values(after.step.wear ?? {}).join(", ")}` : "—"}`);

  // 2. the same with the crafter two levels short of the piece's recipe
  const lv = piece ? item(piece)!.craft!.level : 10;
  const w2 = flipWorld(lv - 2, ["Second", "Fifth"]);
  const s2 = steps1(w2, "Second");
  cases.push(["the crafter two levels short: its level target carries the piece's points", s2.as === "level" && s2.target === `lvl:weaponcrafting:${lv}` && s2.why.includes("for gear")]);
  console.log(`  2. weaponcrafting ${lv - 2} (the recipe wants ${lv}): Second — ${s2.why}`);

  // 3. two fighters (the same fighter twice) and one piece in the bank: once one wears it, the other asks for a
  //    copy of its own; played on for a day, no piece is in two sets (invariant 12)
  const twin = { ...fifth, name: "Fourth" } as Character;
  const w3 = { ...flipWorld(sec.weaponcrafting_level, ["Second", "Fourth", "Fifth"], [fifth, twin]), bank: piece ? [{ code: piece, quantity: 1 }] : [] };
  const asks = (w: World, who: string): boolean => gearNeeds(w).needs.some((n) => n.for === who && n.pieces.has(piece));
  const armour5 = Object.fromEntries(ARMOUR.map((s) => [s, (fifth as unknown as Record<string, string>)[`${s}_slot`]]).filter(([, c]) => c));
  const w3a = wear(w3, { character: "Fifth", wear: { ...armour5, weapon: piece } } as Step);
  const r3 = playOut(w3, NOW + DAY);
  const made3 = r3.played.filter((p) => p.step.target === `gear:${piece}`).map((p) => `for ${p.step.for} (day ${day(p.at)})`);
  // what section 6 guarantees: nobody asks for it while it is free; once Fifth wears it, Fourth plans without it (its
  // own pick and every set it plans with lack it) and asks for gear of its own; no piece is in two sets (invariant 12)
  const fourthNeeds = gearNeeds(w3a).needs.filter((n) => n.for === "Fourth");
  const p3 = pickMonster(w3a.characters.find((c) => c.name === "Fourth")!, w3a, new Set());
  const lacks = !p3 || !Object.values(fightRec(w3a.characters.find((c) => c.name === "Fourth")!, w3a, p3.monster)?.slots ?? {}).includes(piece);
  cases.push(["two fighters, one piece: nobody asks while it is free; once one wears it, the other plans without it and asks for its own", !asks(w3, "Fourth") && !asks(w3, "Fifth") && lacks && fourthNeeds.length > 0]);
  console.log(`  3. one ${piece} in the bank: asked for while it is free — ${asks(w3, "Fourth") || asks(w3, "Fifth") ? "yes" : "no"}; Fifth wears it → Fourth's pick ${p3?.monster ?? "none"} without it, its own need: ${fourthNeeds.map((n) => [...n.pieces.keys()].join(" + ")).join(" | ") || "none"}; a day played: ${piece} made ${made3.join(", ") || "never"}`);

  // 4. a material two crafts deep, across two characters through the bank: iron swords ← iron bars ← iron ore
  const sw: AccountAchievement = { code: "made_up_swords", name: "made up", description: "", points: 3, completed_at: null, objectives: [{ type: "crafting", target: "iron_sword", total: 3, progress: 0 }] } as AccountAchievement;
  const w4: World = { ...base, characters: [{ ...chars.find((c) => c.name === "Second")!, mining_level: 5 }, fifth], bank: [], achievements: [...only([]), sw], config: { ...ALL_ON, on: { Second: true, Fifth: true } } };
  const r4 = playOut(w4, NOW + 2 * DAY);
  const ore = at(r4, (s) => s.target === "src:iron_ore"), bar = at(r4, (s) => s.target === "mat:iron_bar"), sword = at(r4, (s) => s.target === "ach:made_up_swords:0");
  cases.push(["a material two crafts deep: source, material, final craft, across two characters", !!ore && !!bar && !!sword && sword.step.character === "Second" && ore.step.character !== "Second" && !!r4.completed.find((c) => c.code === "made_up_swords")]);
  console.log(`  4. three iron swords: ${[ore, bar, at(r4, (s) => s.target === "src:feather"), sword].map((p) => (p ? `${p.step.target}@${p.step.character} (day ${day(p.at)})` : "—")).join(" → ")}; done: ${r4.completed.map((c) => c.code).join(", ") || "no"}`);

  // 5. a miner and a better pickaxe (the bank holds the jasper crystal): asked for only when it pays
  const miner = keepOnly({ ...base, characters: [chars.find((c) => c.name === "Second")!, fifth] }, "Fifth", ARMOUR).characters[1];
  const coal = (n: number): AccountAchievement => ({ code: "made_up_coal", name: "made up", description: "", points: 2, completed_at: null, objectives: [{ type: "gathering", target: "coal", total: n, progress: 0 }] } as AccountAchievement);
  const pick5 = (n: number) => gearNeeds({ ...base, characters: [chars.find((c) => c.name === "Second")!, miner], bank: [{ code: "jasper_crystal", quantity: 1 }], achievements: [...only([]), coal(n)], config: { ...ALL_ON, on: { Second: true, Fifth: true } } }).needs.find((x) => x.for === "Fifth" && x.work.includes("tool"));
  const big = pick5(5000), small = pick5(100);
  cases.push(["a better pickaxe is asked for when it pays (5,000 coal), not when it does not (100)", !!big && !small]);
  console.log(`  5. 5,000 coal: ${big ? `${[...big.pieces.keys()]} — H0 ${f1(big.H0)} h, H1 ${f1(big.H1)} h, G ${f1(big.G)} h` : "no need"} · 100 coal: ${small ? "a need" : "no need (G + H1 > 0.85 × H0)"}`);

  // 6. alchemy at 17, nothing in the bank: the brewing step
  const third = chars.find((c) => c.name === "Third")!;
  const w6: World = { ...base, characters: [third], bank: [], achievements: only(["intermediate_alchemist", "alchemist"]), config: { ...ALL_ON, on: { Third: true } } };
  const s6 = steps1(w6, "Third");
  cases.push(["alchemy at 17 with nothing in the bank: a brewing step that gathers its inputs", s6.as === "level" && s6.work.kind === "craft" && !!s6.sources?.length]);
  console.log(`  6. ${s6.why}; sources ${(s6.sources ?? []).map((s) => `${s.code} ×${s.times}`).join(", ")}`);

  // 8. the crafter not on (the bank holds the piece's materials, so the need is there): no chain work offered
  const w8 = { ...flipWorld(sec.weaponcrafting_level, ["Fifth"]), bank: recipeDemand(piece || "iron_sword", 1).map(([code, quantity]) => ({ code, quantity })) };
  const r8 = rank("Fifth", w8);
  const offered8 = gearNeeds(w8).needs.filter((n) => n.for === "Fifth");
  cases.push(["the crafter not on: the need is there, no chain work is offered", offered8.length > 0 && offered8.every((n) => !n.offered) && !r8.supply.some((c) => c.target.key.startsWith("gear:") || (c.step.parent ?? "").startsWith("gear:")) && r8.step.as !== "supply"]);
  console.log(`  8. Second not on: ${offered8.length} need(s) for Fifth, none offered; Fifth — ${r8.step.why}`);

  // Task 011, section 4: a kill objective is the fleet's work. Fifth and its twin Fourth (armour, no weapon), ten kills of
  // the monster the piece flips.
  const mon = need1?.monster ?? "highwayman";
  const kills: AccountAchievement = { code: "made_up_kills", name: "made up", description: "", points: 2, completed_at: null, objectives: [{ type: "combat_kill", target: mon, total: 10, progress: 0 }] } as AccountAchievement;
  const twins = (bank: World["bank"]): World => ({ ...flipWorld(sec.weaponcrafting_level, ["Second", "Fourth", "Fifth"], [fifth, twin]), bank, achievements: [...only([]), kills] });
  const forKills = (w: World, name = ""): Need[] => gearNeeds(w, name).needs.filter((n) => n.key === "ach:made_up_kills:0");
  // 9. one wins safely (Fourth wears the piece): no need for the other
  const w9 = wear(twins(piece ? [{ code: piece, quantity: 1 }] : []), { character: "Fourth", wear: { ...armour5, weapon: piece } } as Step);
  const n9 = forKills(w9);
  cases.push(["task 011: one fighter wins the objective's monster safely — no need for the other", !!piece && safeWin(w9.characters.find((c) => c.name === "Fourth")!, w9, mon) && n9.length === 0]);
  // 10. nobody wins: one need, for the least G + H1 (the twins tie: the name)
  const w10 = twins([]);
  const n10 = forKills(w10);
  cases.push(["…nobody wins: one need, for the least G + H1, ties to the name", n10.length === 1 && n10[0].for === "Fifth" && !Number.isFinite(n10[0].H0)]);
  // 11. the other's step in flight covers what is left: no need at all
  const inflight = { key: "ach:made_up_kills:0@Fourth#1", target: "ach:made_up_kills:0", character: "Fourth", as: "objective", work: { kind: "kill", monster: mon }, units: 10, hours: 1, score: 1, why: "made up" } as Step;
  const n11 = forKills({ ...w10, current: { Fourth: inflight } }, "Fifth");
  cases.push(["…the other's step in flight covers what is left: no need", n11.length === 0]);
  console.log(`  9–11. ten ${mon} kills: one wins safely → ${n9.length} need(s); nobody wins → ${n10.map((n) => `${n.for}: ${[...n.pieces.keys()].join(" + ")}, H0 ${f1(n.H0)} h, H1 ${f1(n.H1)} h, G ${f1(n.G)} h`).join(" | ") || "none"}; Fourth's step holds the ten → ${n11.length} need(s)`);
}

{
  // Task 011, section 3 (rule 4): a filler that fits goes before a road that fits nothing. Only grand_master (combat 50)
  // and ecologist open, the deadline 300 hours away.
  const short: PlannerConfig = { ...ALL_ON, deadline: new Date(NOW + 300 * 3.6e6).toISOString() };
  const w = { ...base, achievements: only(["grand_master", "ecologist"]), config: short };
  const r = rank("Second", w);
  const s = steps1(w, "Second");
  cases.push(["rule 4: a filler that fits goes before a level road that does not", s.as === "filler" && s.why.includes("nothing else fits the deadline") && r.levels.some((c) => c.fit === 0 && c.any > 0)]);
  const sb = steps1({ ...w, blocked: { "ach:ecologist:0@Second": { until: NOW + DAY, why: "made up" } } }, "Second");
  cases.push(["…the filler blocked: the road, by points per hour", (sb.as === "level" || sb.as === "supply") && sb.why.endsWith("(nothing fits the deadline: points per hour)")]);
  const coal: AccountAchievement = { code: "made_up_coal", name: "made up", description: "", points: 2, completed_at: null, objectives: [{ type: "gathering", target: "coal", total: 100_000, progress: 0 }] } as AccountAchievement;
  const sf = steps1({ ...w, achievements: [...w.achievements, coal], config: { ...short, first: ["made_up_coal"] } }, "Second");
  cases.push(["…a first achievement that fits nothing still goes first", sf.target === "ach:made_up_coal:0" && sf.why.endsWith("(nothing fits the deadline: points per hour)")]);
  console.log(`  rule 4 (300 h to the deadline, grand_master and ecologist open): Second — ${s.why}\n     the filler blocked: ${sb.why}\n     100,000 coal on config.first: ${sf.why}`);
}

{
  // Task 011, section 2: the fight record carries the potions — forecast against the stacks before and after; an entry
  // stored before (no potion fields) still aggregates.
  const sec2 = { ...chars.find((c) => c.name === "Second")!, utility1_slot: "small_health_potion", utility1_slot_quantity: 16 } as Character;
  const fight = { result: "win", turns: 24, characters: [{ character_name: "Second", final_hp: 300 }], logs: [] } as unknown as FightResult;
  recordFight(sec2, monsterOfCode("pig")!, fight, { ...sec2, utility1_slot_quantity: 12 });
  const d1 = simDeviations.value[0];
  recordFight(sec2, monsterOfCode("pig")!, fight, { ...sec2, utility1_slot: "", utility1_slot_quantity: 0 });
  const d2 = simDeviations.value[0];
  const old = { ts: 1, character: "Second", monster: "pig", predWin: true, actualWin: true, winMatch: true, predTurns: 24, actualTurns: 24, turnErr: 0, predHp: 1, actualHp: 1, hpErr: 0 };
  const acc = simAccuracy([d1, d2, old]);
  cases.push(["the fight record: potions forecast against the stacks (4 drunk; an emptied slot 16); an old entry still counts", d1.actualPotions?.small_health_potion === 4 && d2.actualPotions?.small_health_potion === 16 && d1.predPotions?.small_health_potion != null && acc.n === 3 && acc.potionFights === 2 && simAccuracy([old]).medianPotionErr === null]);
  console.log(`  fight record: forecast ${d1.predPotions?.small_health_potion} small health a pig fight, drunk ${d1.actualPotions?.small_health_potion} and ${d2.actualPotions?.small_health_potion}; median error ${acc.medianPotionErr} over ${acc.potionFights} fights`);
}

// ── 5b. task 010: the two traps of bis.ts's header, before (a potion at the rest its heal buys) and after (potionSec) ──
/** A character with every slot emptied (stats follow, as forward.ts wear) at another combat level (+5 max HP a level). */
function stripped(ch: Character, level: number): Character {
  const c = { ...ch } as unknown as Record<string, number | string>;
  for (const g of GEAR_SLOTS) {
    const code = c[`${g}_slot`] as string;
    if (!code) continue;
    for (const e of item(code)?.effects ?? []) if (STAT_CODES.has(e.code) && e.code !== "initiative") { const k = e.code === "hp" ? "max_hp" : e.code; c[k] = (c[k] as number) - e.value; }
    c[`${g}_slot`] = "";
    if (g.startsWith("utility")) c[`${g}_slot_quantity`] = 0;
  }
  c.max_hp = (c.max_hp as number) + 5 * (level - (c.level as number));
  c.level = level;
  c.hp = c.max_hp;
  return c as unknown as Character;
}
const setLine = (r: GearRecommendation | undefined, price: (code: string) => number): string =>
  r ? `${Object.values(r.slots).filter(Boolean).join(" + ")} — ${r.safe ? "safe" : r.forecast.win ? "win" : "loss"}, ${r.forecast.turns} turns, ${Object.entries(r.forecast.used).map(([c, n]) => `${n} ${c}`).join(", ") || "no potion"}, ${f1(killSeconds(r.forecast, price))} s (task 012: ${f1(oldKillSec(r.forecast, price))} s with rest at 5 HP a second)` : "none";
/** Kill seconds before task 012: rest at 5 HP a second (the "before" columns of section 3 and the traps). */
function oldKillSec(f: FightForecast, price: (code: string) => number = potionSec): number {
  const lost = f.maxHp - f.hpRemaining;
  return fightSec(f.turns) + (lost > 0 ? Math.max(3, Math.ceil(lost / 5)) : 0) + potionPart(f, price);
}
{
  const at10 = stripped(chars[0], 10);
  const trap = (monster: string, pool: string[]): (GearRecommendation | undefined)[] => {
    const o = { owned: new Set(pool), ownedQty: new Map(pool.map((c) => [c, item(c)!.type === "utility" ? 100 : 1])), includeCraftable: false };
    return [bestInSlot(at10, monster, { ...o, potionPrice: restFloor })[0], bestInSlot(at10, monster, o)[0]];
  };
  const [b1, a1] = trap("cow", ["fire_staff", "iron_sword", "small_health_potion"]);
  const [b2, a2] = trap("cow", ["iron_sword", "copper_armor", "small_health_potion"]);
  cases.push(["trap 1 of bis.ts: a cow, a restore potion — the iron sword, not the slow fire staff, before and after", b1?.slots.weapon === "iron_sword" && a1?.slots.weapon === "iron_sword"]);
  cases.push(["trap 2 of bis.ts: a restore potion — the body armor stays, before and after", b2?.slots.body_armor === "copper_armor" && a2?.slots.body_armor === "copper_armor"]);
  console.log(`  the traps of bis.ts's header (${at10.name} stripped to level 10, ${at10.max_hp} HP, against a cow):`);
  console.log(`     fire staff, iron sword, small health potions — before: ${setLine(b1, restFloor)}\n                                                     after:  ${setLine(a1, potionSec)}`);
  console.log(`     iron sword, copper armor, small health potions — before: ${setLine(b2, restFloor)}\n                                                       after:  ${setLine(a2, potionSec)}`);
}

// ── 5c. task 012: the prices round ───────────────────────────────────────────
/** The planner's fight XP before task 012 (×0.7 from a gap of 5, zero from 10, no wisdom): the "before" columns. */
const oldFightXp = (m: { level: number; hp: number; type: string }, L: number): number => {
  const g = L - m.level;
  return Math.round(((m.level / Math.max(1, L)) * 20 + m.hp * 0.04) * (g >= 10 ? 0 : g >= 5 ? 0.7 : 1) * (m.type === "elite" ? 1.4 : m.type === "boss" || m.type === "raid_boss" ? 2 : 1));
};
/** Section 2's evidence: the 1,232 won fights of logs/dev.log, 2026-11-19 09:15–20:19 UTC, with their +N xp, by (monster,
 *  gap, favor). The combat level is the snapshot's XP plus every combat XP logged since (it matches all seven levels the
 *  plan lines state); the favor from the offering accepts (16:23–16:24 UTC, skeletons × 1.5 until the reset). */
const XP_LOG: { monster: string; gap: number; favor: number; who: string; xp: Record<number, number> }[] = [
  { monster: "blue_slime", gap: 17, favor: 1, who: "Second 23", xp: { 0: 150 } },
  { monster: "flying_snake", gap: 10, favor: 1, who: "Fourth 22", xp: { 19: 40 } },
  { monster: "highwayman", gap: 5, favor: 1, who: "Fifth 20, Third 20", xp: { 33: 85 } },
  { monster: "highwayman", gap: 6, favor: 1, who: "First, Fourth, Fifth 21", xp: { 22: 142, 23: 88 } },
  { monster: "highwayman", gap: 7, favor: 1, who: "Second 22", xp: { 23: 105, 21: 39 } },
  { monster: "pig", gap: 1, favor: 1, who: "Third 20", xp: { 43: 24 } },
  { monster: "pig", gap: 2, favor: 1, who: "Fifth, First, Third 21", xp: { 42: 50, 43: 37, 41: 1 } },
  { monster: "pig", gap: 3, favor: 1, who: "Second 22", xp: { 41: 42, 40: 17 } },
  { monster: "pig", gap: 4, favor: 1, who: "Second 23", xp: { 39: 25 } },
  { monster: "skeleton", gap: 3, favor: 1, who: "Fifth 21", xp: { 40: 2 } },
  { monster: "skeleton", gap: 3, favor: 1.5, who: "Fifth, First, Third, Fourth 21", xp: { 62: 94, 60: 35, 63: 31 } },
  { monster: "skeleton", gap: 4, favor: 1.5, who: "Second, Fourth, Fifth 22", xp: { 60: 84, 62: 21, 59: 5 } },
  { monster: "skeleton", gap: 5, favor: 1.5, who: "Second 23", xp: { 57: 115 } },
];
const RULES = { before: (g: number): number => (g >= 10 ? 0 : g >= 5 ? 0.7 : 1), after: (g: number): number => (g > 10 ? 0 : g > 5 ? 0.7 : 1) };
/** The wisdom a logged XP value implies under a gap rule (fightXp inverted: base × penalty × favor × (1 + w/1000), rounded). */
function impliedW(row: (typeof XP_LOG)[number], rule: keyof typeof RULES, x: number): [number, number] | undefined {
  const m = monsterOfCode(row.monster)!, L = m.level + row.gap;
  const B = ((m.level / L) * 20 + m.hp * 0.04) * RULES[rule](row.gap) * row.favor;
  if (B <= 0) return x === 0 ? [-Infinity, Infinity] : undefined;
  return [1000 * ((x - 0.5) / B - 1), 1000 * ((x + 0.5) / B - 1)];
}
/** A wisdom a set of this fleet can wear: from none up to 250 (the novice guide's 25 and the best wisdom pieces of the pool). */
const plausible = (r?: [number, number]): boolean => !!r && r[1] >= 0 && r[0] <= 250;
const pigStop = (xp: (m: { level: number; hp: number; type: string }, L: number) => number): number => { const pig = monsterOfCode("pig")!; let L = pig.level; while (L < 50 && xp(pig, L) > 0) L++; return L; };
/** Gear crafted on 11-19 by the time a step started (the `crafting` lines): two steel battleaxes at 15:50, two hard leather
 *  helmets at 15:58 and three pants at 16:00, two boots and two more helmets at 17:50–17:51 (LOG_PIECES, all of it). */
const AXES: Record<string, number> = { steel_battleaxe: 2 };
const BY_16H: Record<string, number> = { steel_battleaxe: 2, hard_leather_helmet: 2, hard_leather_pants: 3 };
/** Section 3: every kill step of the planner's era (09:15–20:17 UTC on 11-19) — its `sample` line (seconds a kill
 *  measured; `est` the planner's own estimate then, rest at 5 HP/s and × 1.3), the combat level, the pieces made by then. */
const KILL_SAMPLES: { t: string; who: string; monster: string; s: number; est: number; level: number; pieces?: Record<string, number> }[] = [
  { t: "10:08:15", who: "Fifth", monster: "highwayman", s: 67, est: 120, level: 21 }, { t: "10:15:47", who: "Second", monster: "highwayman", s: 61, est: 111, level: 22 },
  { t: "10:16:35", who: "First", monster: "highwayman", s: 62, est: 111, level: 21 }, { t: "10:18:32", who: "Fourth", monster: "highwayman", s: 70, est: 120, level: 21 },
  { t: "10:33:03", who: "Second", monster: "highwayman", s: 69, est: 111, level: 22 }, { t: "10:34:41", who: "Third", monster: "highwayman", s: 92, est: 113, level: 20 },
  { t: "10:40:04", who: "Fifth", monster: "highwayman", s: 79, est: 111, level: 21 }, { t: "11:04:44", who: "First", monster: "highwayman", s: 61, est: 111, level: 21 },
  { t: "11:10:21", who: "Fifth", monster: "highwayman", s: 83, est: 108, level: 21 }, { t: "11:13:12", who: "Fourth", monster: "highwayman", s: 84, est: 111, level: 21 },
  { t: "12:17:46", who: "Second", monster: "highwayman", s: 79, est: 108, level: 22 }, { t: "15:09:18", who: "First", monster: "pig", s: 95, est: 156, level: 21 },
  { t: "15:47:31", who: "Second", monster: "pig", s: 179, est: 147, level: 22 }, { t: "15:55:32", who: "Third", monster: "pig", s: 214, est: 107, level: 21 },
  { t: "16:02:55", who: "Fifth", monster: "pig", s: 212, est: 104, level: 21 }, { t: "17:11:37", who: "Second", monster: "pig", s: 84, est: 107, level: 23, pieces: AXES },
  { t: "17:57:12", who: "Fifth", monster: "skeleton", s: 93, est: 143, level: 21, pieces: BY_16H }, { t: "18:20:39", who: "Second", monster: "blue_slime", s: 20, est: 18, level: 23, pieces: BY_16H },
  { t: "18:39:34", who: "Fifth", monster: "skeleton", s: 67, est: 143, level: 22, pieces: LOG_PIECES }, { t: "18:41:01", who: "Fourth", monster: "flying_snake", s: 83, est: 101, level: 22, pieces: BY_16H },
  { t: "19:03:42", who: "Second", monster: "skeleton", s: 61, est: 127, level: 23, pieces: LOG_PIECES }, { t: "19:17:07", who: "Fifth", monster: "skeleton", s: 59, est: 143, level: 22, pieces: LOG_PIECES },
  { t: "20:17:42", who: "Second", monster: "skeleton", s: 64, est: 128, level: 23, pieces: LOG_PIECES },
];
/** Section 3: the planner's kill steps since 16:22 UTC, decomposed from logs/dev.log (an action's seconds = its line to the
 *  character's next action; per kill): the fight's cooldown, rest, eating, the food's own making (cooking, the walks to the
 *  workshop, the food's bank moves, fishing for it), the walks and bank moves of the step. */
const STEPS_LOG: { t: string; who: string; key: string; monster: string; level: number; pieces: Record<string, number>; kills: number; fight: number; rest: number; restHp: number; eat: number; foodHp: number; food: number; walk: number; total: number }[] = [
  { t: "15:51:13", who: "Second", key: "ach:i_want_bacon:0", monster: "pig", level: 23, pieces: AXES, kills: 46, fight: 30.3, rest: 39.8, restHp: 199, eat: 0.4, foodHp: 15, food: 0.1, walk: 13.3, total: 84.0 },
  { t: "16:02:55", who: "Fifth", key: "ach:the_reaper:0", monster: "skeleton", level: 21, pieces: BY_16H, kills: 42, fight: 34.0, rest: 16.8, restHp: 76, eat: 6.2, foodHp: 250, food: 28.2, walk: 7.1, total: 93.3 },
  { t: "17:30:47", who: "Second", key: "src:blue_slimeball", monster: "blue_slime", level: 23, pieces: BY_16H, kills: 150, fight: 10.1, rest: 6.9, restHp: 19, eat: 0, foodHp: 1, food: 0.9, walk: 2.0, total: 20.0 },
  { t: "17:45:44", who: "Fourth", key: "src:flying_wing", monster: "flying_snake", level: 22, pieces: BY_16H, kills: 40, fight: 31.0, rest: 41.2, restHp: 202, eat: 0.1, foodHp: 8, food: 0, walk: 10.6, total: 82.9 },
  { t: "17:57:12", who: "Fifth", key: "src:skeleton_bone", monster: "skeleton", level: 22, pieces: LOG_PIECES, kills: 38, fight: 33.7, rest: 10.6, restHp: 45, eat: 5.2, foodHp: 272, food: 7.3, walk: 10.1, total: 66.9 },
  { t: "18:20:40", who: "Second", key: "src:skeleton_bone", monster: "skeleton", level: 23, pieces: LOG_PIECES, kills: 42, fight: 30.4, rest: 11.8, restHp: 75, eat: 4.0, foodHp: 232, food: 8.5, walk: 6.8, total: 61.5 },
  { t: "18:39:34", who: "Fifth", key: "src:skeleton_bone", monster: "skeleton", level: 22, pieces: LOG_PIECES, kills: 38, fight: 31.3, rest: 9.5, restHp: 58, eat: 3.1, foodHp: 272, food: 9.0, walk: 6.3, total: 59.3 },
  { t: "19:03:43", who: "Second", key: "lvl:combat:25", monster: "skeleton", level: 23, pieces: LOG_PIECES, kills: 70, fight: 30.8, rest: 11.8, restHp: 64, eat: 3.4, foodHp: 251, food: 11.9, walk: 5.5, total: 63.4 },
];
/** Section 3, settled point 4: the 13 mat: and gear: steps of 11-19 (planned 0.0 h): where the character stood when it was
 *  decided, the seconds of the runs (crafts, buys), of the walks and of the bank moves (the reset, withdrawals, deposits). */
const MAKE_LOG: { t: string; who: string; key: string; from: [number, number]; total: number; run: number; walk: number; bank: number }[] = [
  { t: "15:09:19", who: "First", key: "mat:hard_leather", from: [-3, -3], total: 124, run: 6, walk: 92, bank: 26 },
  { t: "15:11:24", who: "First", key: "mat:hard_leather", from: [4, 1], total: 52, run: 6, walk: 35, bank: 11 },
  { t: "15:12:16", who: "First", key: "mat:steel_bar", from: [4, 1], total: 175, run: 19, walk: 75, bank: 81 },
  { t: "15:15:11", who: "First", key: "mat:hard_leather", from: [4, 1], total: 52, run: 6, walk: 35, bank: 11 },
  { t: "15:47:31", who: "Second", key: "gear:steel_battleaxe", from: [-3, -3], total: 222, run: 13, walk: 83, bank: 126 },
  { t: "15:55:32", who: "Third", key: "gear:hard_leather_helmet", from: [-3, -3], total: 212, run: 13, walk: 73, bank: 126 },
  { t: "15:59:04", who: "Third", key: "gear:hard_leather_pants", from: [4, 1], total: 63, run: 18, walk: 15, bank: 30 },
  { t: "17:11:39", who: "Second", key: "mat:hardwood_plank", from: [-3, -3], total: 696, run: 158, walk: 374, bank: 164 },
  { t: "17:23:15", who: "Second", key: "mat:steel_bar", from: [4, 1], total: 452, run: 179, walk: 226, bank: 46 },
  { t: "17:49:11", who: "Third", key: "gear:hard_leather_boots", from: [4, 1], total: 71, run: 13, walk: 16, bank: 42 },
  { t: "17:50:22", who: "Third", key: "gear:hard_leather_helmet", from: [4, 1], total: 58, run: 13, walk: 15, bank: 30 },
  { t: "17:51:20", who: "Third", key: "mat:iron_bar", from: [4, 1], total: 125, run: 38, walk: 75, bank: 12 },
  { t: "18:41:01", who: "Fourth", key: "mat:hardwood_plank", from: [4, 1], total: 216, run: 16, walk: 101, bank: 99 },
];
/** The bank as far as logs/dev.log shows it (the deposits and withdrawals since the fixture's 2026-11-17, cut bodies
 *  hidden): the by-product ingredients the log settles; the rest unknown. */
const LOG_BANK: Record<string, number> = { algae: 2287, blue_slimeball: 18, milk_bucket: 291, sap: 492, nettle_leaf: 0, coconut: 0, red_slimeball: 0, yellow_slimeball: 0 };
const median = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
/** The kill as the planner prices it, in parts, for a character at a level in the sets the log shows (realWorld). */
function killParts(who: string, level: number, monster: string, pieces: Record<string, number> = {}, price: (code: string) => number = potionSec) {
  const w = realWorld({ [who]: level }, pieces);
  const ch = w.characters.find((c) => c.name === who)!;
  const f = fightRec(ch, w, monster)?.forecast;
  if (!f?.win) return undefined;
  const lost = f.maxHp - f.hpRemaining;
  const parts = { f, turns: f.turns, fight: fightSec(f.turns), rest: restSeconds(lost, f.maxHp), restOld: lost > 0 ? Math.max(3, Math.ceil(lost / 5)) : 0, pots: potionPart(f, price), walk: killWalk(ch, w, monster), lost, maxHp: f.maxHp };
  return { ...parts, est: parts.fight + parts.rest + parts.pots + parts.walk, estOld: (parts.fight + parts.restOld + parts.pots) * 1.3 + parts.walk };
}
{
  // section 2: the gap rule and wisdom
  const okAfter = XP_LOG.every((row) => Object.keys(row.xp).every((x) => plausible(impliedW(row, "after", +x))));
  const badBefore = XP_LOG.filter((row) => Object.keys(row.xp).some((x) => !plausible(impliedW(row, "before", +x)))).length;
  cases.push(["task 012: every logged fight implies a wearable wisdom under the repaired gap rule; some cannot under the old one", okAfter && badBefore > 0]);
  cases.push(["…fightXp: no penalty at a gap of 5, × 0.7 at 10, nothing at 11, + 0.1% a point of wisdom", fightXp(15, 380, "normal", 20) === 30 && fightXp(12, 360, "normal", 22) === 18 && fightXp(12, 360, "normal", 23) === 0 && fightXp(18, 480, "normal", 23, 100) === 38]);
  cases.push(["…the pig stops giving XP at combat 30 (it was 29)", pigStop((m, L) => fightXp(m.level, m.hp, m.type, L)) === 30 && pigStop(oldFightXp) === 29]);
  // section 3: rest by the docs, a step's fixed seconds
  cases.push(["…rest: 1 s per 1% of max HP, at least 3 s", restSeconds(130, 520) === 25 && restSeconds(130) === 26 && restSeconds(5, 600) === 3 && restSeconds(0, 520) === 0]);
  cases.push(["…killSeconds rests by the fight's max HP", killSeconds({ turns: 10, maxHp: 1000, hpRemaining: 800, used: {} } as unknown as FightForecast) === 40]);
  const smithy = makePlace({ kind: "craft", code: "iron_bar" }, base)!, here = { x: 4, y: 1, layer: "overworld" };
  cases.push(["…a step's fixed seconds: the walk to the bank, to the workshop and back, the bank moves", !!smithy && stepSec(smithy, here) === bankSec(here) + 2 * bankSec(smithy) + STEP_BANK_SEC]);
  cases.push(["…STEP_BANK_SEC is the median of the bank moves of the log's 13 mat: and gear: steps", median(MAKE_LOG.map((m) => m.bank)) === STEP_BANK_SEC]);
}
{
  // section 4: stock is free
  const MINOR = "minor_health_potion";
  const at100 = potionPriceOf((c) => (c === "algae" ? COVER_RUNS : 0)).price(MINOR), at99 = potionPriceOf((c) => (c === "algae" ? COVER_RUNS - 1 : 0)).price(MINOR);
  cases.push(["task 012: an ingredient the stock holds for 100 runs is free; with 99 runs the field price", at100 < potionSec(MINOR) && at99 === potionSec(MINOR)]);
  // First at combat 30, the bank of the snapshot with 30 brewed minor health potions, 120 algae and 300 nettle leaves
  const c30 = chAt(chars[0], 30);
  const potBank = bankPlus(fx.bankItems, new Map([[MINOR, 30], ["algae", 120 - stockOf(base, "algae")], ["nettle_leaf", 300]]));
  const w0: World = { ...base, characters: [c30, ...chars.slice(1)], bank: potBank, achievements: only(["grand_master"]) };
  const pick = pickMonster(c30, w0, new Set()), f = pick && fightRec(c30, w0, pick.monster)?.forecast;
  const wField: World = { ...w0, config: { ...w0.config, potionStock: 0 } };
  const pickF = pickMonster(c30, wField, new Set());
  cases.push(["…the covered potion: the pick takes the potion fight, cheaper than at the field price", !!f && (f.used[MINOR] ?? 0) > 0 && (!pickF || pickF.sec > pick!.sec)]);
  // another character's step reserves 50 of the 120 algae: 70 left for First — not covered; Second's own reservation is its own
  const res = { key: "made@Second#1", target: "made", character: "Second", as: "objective", work: { kind: "craft", code: MINOR }, units: 1, hours: 1, score: 1, why: "made up", withdraw: { algae: 50 } } as Step;
  const wR: World = { ...w0, current: { Second: res } };
  const nettleOnly = potionPriceOf((c) => (c === "nettle_leaf" ? 300 : 0)).price(MINOR);
  cases.push(["…a stock the others' steps reserved does not count", potionPrice(wR, "First").price(MINOR) === nettleOnly && potionPrice(wR, "Second").price(MINOR) < nettleOnly]);
  // the forward model drinks: one step of the pick, then the brewed potions are gone and the algae under 100 runs
  const s0 = decide("First", w0);
  const w1 = advance(wear({ ...w0, current: { First: s0 } }, s0), s0);
  const drank = drinksOf(w0, s0);
  cases.push(["…a forward run that starts covered ends at the field price once the stock is drunk (the brewed stack down to one unit, then the ingredients)", s0.work.kind === "kill" && coveredIn(w0).includes(`${MINOR}.algae`) && !coveredIn(w1).includes(`${MINOR}.algae`) && Math.abs(stockOf(w1, MINOR) - 1) < 1e-9 && stockOf(w1, "algae") >= -1e-9]);
  console.log(`  task 012, stock is free: a minor health potion ${f1(potionSec(MINOR))} s at the field price, ${f1(at100)} s with algae covered (100 runs), ${f1(at99)} s with 99 runs, ${f1(nettleOnly)} s with only the nettle covered`);
  console.log(`     First at 30 (30 potions, 120 algae, 300 nettle in the bank): pick ${pick ? `${pick.monster} ${Math.round(pick.sec)} s, drinks ${JSON.stringify(f?.used)}` : "none"}; at the field price ${pickF ? `${pickF.monster} ${Math.round(pickF.sec)} s` : "none"}`);
  console.log(`     one step forward (${s0.key}, ${s0.units} units): drank ${[...drank].map(([c, q]) => `${c} ${f1(q)}`).join(", ") || "nothing"}; the bank then: ${MINOR} ${f1(stockOf(w1, MINOR))}, algae ${f1(stockOf(w1, "algae"))}, nettle ${f1(stockOf(w1, "nettle_leaf"))}; covered after: ${coveredIn(w1).filter((x) => x.startsWith(MINOR)).join(", ") || "nothing of it"}`);
}
{
  // section 5: the node of a src: gather, and a gated craft in a chain
  const fifth = chars.find((c) => c.name === "Fifth")!, second = chars.find((c) => c.name === "Second")!;
  const sF = pickSource("diamond_stone", fifth, base), sS = pickSource("diamond_stone", second, base);
  cases.push(["task 012: a miner with the role takes a stone at the node that gives it XP (coal), over the cheaper one", sF?.work.kind === "gather" && sF.work.resource === "coal_rocks" && !!sF.over]);
  cases.push(["…a character without the role takes it at the cheaper node (copper)", sS?.work.kind === "gather" && sS.work.resource === "copper_rocks" && !sS.over]);
  const wD: World = { ...base, achievements: only(["diamond_in_the_sky"]) };
  const left = (w: World): number | undefined => rank("Third", w).supply.find((c) => c.target.key === "src:diamond_stone")?.target.left;
  const stepAt = (who: string, resource: string, units: number): Step => ({ key: `src:diamond_stone@${who}#1`, target: "src:diamond_stone", character: who, as: "supply", work: { kind: "gather", resource, drop: "diamond_stone" }, units, hours: 1, score: 1, why: "made up" });
  const l0 = left(wD), l1 = left({ ...wD, current: { Fifth: stepAt("Fifth", "gold_rocks", 1250), Fourth: stepAt("Fourth", "copper_rocks", 1500) } });
  cases.push(["…two characters at nodes of different rates: the third's shortfall is one stone less for each (1,250 gold-rock gathers = 1,500 copper-rock gathers)", l0 != null && l1 != null && Math.abs(l0 - l1 - 3000) < 1e-6]);
  const calH = (DEADLINE - NOW) / 3.6e6;
  const par = objectiveParents(wD, "Fourth", calH).find((p) => p.key === "ach:diamond_in_the_sky:0");
  const road = gateRoad("mining", 35, wD);
  const lv = rank("Fourth", wD).levels.find((c) => c.target.key === "lvl:mining:35");
  cases.push(["…a chain whose craft wants a level nobody has: the parent's hours include the road, the role holder has the level candidate", !!par?.gated?.some((g) => g.lane === "mining" && g.level === 35) && !!road && Number.isFinite(road.hours) && par!.hours >= road.hours && !!lv]);
  const wV: World = { ...wD, characters: wD.characters.map((c) => ({ ...c, layer: "void" }) as Character) };
  const waitsV = waitingOf(wV).find((x) => x.achievement === "diamond_in_the_sky")?.waits;
  cases.push(["…and with no XP source to that level the parent waits, and waitingOf says so", !objectiveParents(wV, "Fourth", calH).some((p) => p.key === "ach:diamond_in_the_sky:0") && waitsV === "a level with no XP source on the way"]);
  console.log(`  task 012, the node: Fifth (mining ${fifth.mining_level}, the role) ${sF ? `${(sF.work as { resource: string }).resource}, ${sF.xp} XP a gather, share ${sF.share.toFixed(2)}, net ${f1(sF.net)} s a stone${sF.over ? ` (over ${sF.over})` : ""}` : "none"} · Second (mining ${second.mining_level}, no role) ${sS ? `${(sS.work as { resource: string }).resource}, net ${f1(sS.net)} s a stone` : "none"}`);
  console.log(`     two in flight (Fifth 1,250 at the gold rocks, Fourth 1,500 at the copper rocks): Third's shortfall ${f1(l0 ?? NaN)} → ${f1(l1 ?? NaN)} actions`);
  console.log(`     the gate: diamond_in_the_sky's chain ~${f1(par?.hours ?? NaN)} h, of it the road to mining 35 ${f1(road?.hours ?? NaN)} h by ${road?.who}; Fourth's level candidate: ${lv ? `score ${lv.fit.toPrecision(3)} — ${lv.step.why}` : "none"}; nobody with a route: waits for "${waitsV}"`);
}

// ── 6. the replay to the deadline: four rows in four child processes ─────────
const results: number[] = [];
if (VERBOSE) {
  const outs = await Promise.all(ROWS.map((_, i) => new Promise<string>((resolve) => {
    // each row its own storage file beside this one's (the fight-record case above wrote to this one: SQLite locks it)
    const args = process.execArgv.map((a) => (a.startsWith("--localstorage-file=") ? `${a}.row${i}` : a));
    const child = spawn(process.execPath, [...args, process.argv[1]], { env: { ...process.env, AMMO_PLANNER_ROW: String(i) }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => resolve(code === 0 ? out : `${out}\nrow ${ROWS[i].label}: exit ${code}`));
  })));
  for (const [i, out] of outs.entries()) {
    const line = out.split("\n").find((l) => l.startsWith("##ROW "));
    console.log(out.split("\n").filter((l) => !l.startsWith("##ROW ")).join("\n").trimEnd());
    if (!line) { cases.push([`replay row ${ROWS[i].label} ran`, false]); continue; }
    const got = JSON.parse(line.slice(6)) as { points: number; inv: [string, { n: number; fails: number; bad: string[] }][] };
    results.push(got.points);
    for (const [k, v] of got.inv) { const r = inv.get(k)!; r.n += v.n; r.fails += v.fails; r.bad.push(...v.bad.slice(0, 5 - r.bad.length)); }
  }
  safeTable(base, "the snapshot");
  drinkTable();
  potionTable(base, realWorld({}), "the 2026-11-18 snapshot (the bank of 2026-11-17)");
  const latest = realWorld(LOG_LEVELS, LOG_PIECES);
  potionTable({ ...base, characters: chars.map((c) => chAt(c, LOG_LEVELS[c.name] ?? c.level)) }, latest, `the fleet at the combat levels logs/dev.log shows at ${LOG_AT} (the snapshot's XP plus every combat XP gain logged since); after: also the pieces crafted since in the bank (${Object.entries(LOG_PIECES).map(([c, n]) => `${c} ×${n}`).join(", ")})`);
  byproductTable();
  needsTable(base, "the 2026-11-18 snapshot");
  needsTable(latest, `the fleet at ${LOG_AT} (the sets logs/dev.log shows, the pieces crafted since in the bank)`);
  // task 012, sections 2–5
  xpEvidenceTable();
  xpTable(base, "the 2026-11-18 snapshot");
  xpTable(latest, `the fleet at ${LOG_AT}`);
  killTable();
  makeTable();
  coverTable();
  nodeTable(latest, `the fleet at ${LOG_AT} (combat levels of the log; the snapshot's gathering levels)`);
}

function replayRow(row: (typeof ROWS)[number]): number {
  {
    const config: PlannerConfig = { ...ALL_ON, potionK: row.potionK, potionStock: row.potionStock, risk: row.risk };
    RECORD_LEVELS = row.label.startsWith("A");
    const t = performance.now();
    const r = playOut({ ...base, config }, DEADLINE);
    const sec = (performance.now() - t) / 1000;
    const pts = (d: number): number => pointsOf(base) + r.completed.filter((c) => c.at <= NOW + d * DAY).reduce((s, c) => s + c.points, 0);
    const m = memoSizes();
    console.log(`\n## Replay ${row.label}: potionK ${row.potionK}, potionStock ${row.potionStock}, risk ${row.risk} (${sec.toFixed(0)} s, ${r.played.length} decisions, ${m.fights} full and ${m.plans} planning-grade solves cached at the end)`);
    console.log(`  points: day 7 ${pts(7)} · day 14 ${pts(14)} · day 30 ${pts(30)} · day 60 ${pts(60)} · deadline ${pointsOf(r.world)}`);
    console.log(`  completed: ${r.completed.map((c) => `${c.code} +${c.points} (${day(c.at)})`).join(", ")}`);
    const total = [...r.run.hours.values()].reduce((s, x) => s + x, 0);
    console.log(`  character-hours: ${[...r.run.hours].sort((a, b) => b[1] - a[1]).map(([k, h]) => `${k} ${((100 * h) / total).toFixed(1)}%`).join(" · ")}`);
    const byAnswer = new Map<string, number>();
    for (const [k, h] of r.run.hours) { const a = k.split(" ")[0]; byAnswer.set(a, (byAnswer.get(a) ?? 0) + h); }
    console.log(`  hours by answer (task 011): ${["objective", "level", "supply", "filler", "fallback"].map((a) => `${a} ${((100 * (byAnswer.get(a) ?? 0)) / total).toFixed(1)}%`).join(" · ")}`);
    console.log(`  potion making (task 010): ${f1(r.run.potionHours)} of ${f1(r.run.fightHours)} fight hours, ${((100 * r.run.potionHours) / Math.max(1e-9, r.run.fightHours)).toFixed(1)}% (a potion at ${row.potionK} × ${row.potionStock ? "the price with the stock counted" : "the field price"})`);
    const craftLv = r.played.filter((p) => p.step.as === "level" && [...GEAR_CRAFT, "cooking"].includes(p.step.target.split(":")[1]));
    console.log(`  crafting levels taken: ${craftLv.length} steps of ${r.played.length} (${f1(craftLv.reduce((s, p) => s + p.step.hours, 0))} h): ${[...new Set(craftLv.map((p) => p.step.target))].join(", ") || "none"}`);
    for (const c of r.world.characters) console.log(`  ${pad(c.name, 7)} ${["combat", ...GATHER_LANES, ...GEAR_CRAFT, "cooking"].map((l) => `${l} ${levelOf(c, l as Lane)}`).join(", ")}`);
    for (const c of r.world.characters) {
      const b = bundleOf("combat", c.name, r.world);
      const at = [25, 30, 35, 40].map((L) => `${L}: ${r.run.reached.has(`${c.name}:${L}`) ? `day ${day(r.run.reached.get(`${c.name}:${L}`)!)}` : c.level >= L ? "at start" : "—"}`).join(", ");
      const waits = !b ? "nothing behind its next combat gate" : Number.isFinite(b.hGate) ? `combat ${b.next} in ${f1(b.hGate)} h (${b.behind.map((x) => x.code).join(", ")})` : `gear: no safe XP monster on the way to ${b.next}`;
      console.log(`  ${pad(c.name, 7)} combat ${at}; at the end waits for: ${waits}`);
    }
    const roles = rolesFor(base);
    console.log(`  a gathering role at 40 (task 011): ${NAMES.flatMap((n) => roles[n].filter((l) => GATHER_LANES.includes(l)).map((l) => `${n} ${l} ${r.run.reached.has(`${n}:${l}:40`) ? `day ${day(r.run.reached.get(`${n}:${l}:40`)!)}` : levelOf(chars.find((c) => c.name === n)!, l) >= 40 ? "at start" : "—"}`)).join(" · ")}`);
    console.log(`  gear made (task 011): ${r.run.made.filter((g) => g.bank! <= NOW + 8 * DAY).length} pieces in the first eight days, ${r.run.made.length} to the deadline (report 009: 67); supply ${f1(byAnswer.get("supply") ?? 0)} character-hours`);
    console.log(`  supply hours by target and parent (task 012; the ten largest): ${[...(r.run.supplyBy ?? new Map<string, number>())].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, h]) => `${k} ${f1(h)} h`).join(" · ") || "none"}`);
    if (r.run.toolDup.size) console.log(`  work (c): a gathering objective asking a tool of several holders at once: ${[...r.run.toolDup].map(([k, n]) => `${k} (${n})`).join(", ")}; tools made for gathering objectives: ${r.run.made.filter((g) => g.work.endsWith(", tool)")).map((g) => `${g.code} for ${g.for} (${g.work})`).join(", ") || "none"}`);
    else console.log(`  work (c): no gathering objective asked a tool of more than one holder at once`);
    if (row.label.startsWith("A")) {
      // task 012, settled point 6: the potions and their ingredients the fights drank, day by day
      r.run.checkpoints.set(Math.round((DEADLINE - NOW) / DAY), totals(r.world, r.run));
      const codes = [...new Set([...r.run.checkpoints.values()].flatMap((m) => [...m.keys()]))];
      console.log(`  the bank's potions and potion ingredients (task 012; stock / drunk so far / made on the way so far, at days ${[...r.run.checkpoints.keys()].join(", ")}):`);
      for (const c of codes) console.log(`     ${pad(c, 22)} ${[...r.run.checkpoints].map(([d, m]) => { const x = m.get(c) ?? { stock: 0, drunk: 0, made: 0 }; return `d${d} ${Math.round(x.stock)}/${Math.round(x.drunk)}/${Math.round(x.made)}`; }).join(" · ")}`);
      console.log(`  covered at the start: ${(r.run.covered0 ?? []).join(", ") || "none"}; no longer covered: ${[...r.run.uncovered].map(([k, t]) => `${k} day ${day(t)}`).join(", ") || "none, to the deadline"}`);
      console.log(`  by-products made on the way (task 011; units, by the target whose work dropped them):`);
      for (const code of BYPRODUCTS) console.log(`     ${pad(code, 18)} ${[...r.run.byproducts].filter(([k]) => k.startsWith(`${code}|`)).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, q]) => `${k.split("|")[1]} ${Math.round(q)}`).join(" · ") || "none"}`);
      console.log(`  each fighter at combat 25, 28, 30, 35 (task 011; or where it ends):`);
      for (const c of r.world.characters) {
        for (const L of [25, 28, 30, 35]) { const l = r.run.atLevel.get(`${c.name}:${L}`); if (l) console.log(`     ${pad(c.name, 7)} ${l}`); }
        if (c.level < 35) console.log(`     ${pad(c.name, 7)} at the end — ${levelLine(c, r.world)}`);
      }
    }
    console.log(`  gear made (${r.run.made.length}):`);
    for (const g of r.run.made) console.log(`     ${g.code} for ${g.for} — ${g.work}; asked day ${day(g.asked)}, in the bank day ${day(g.bank!)}, worn ${g.worn != null ? `day ${day(g.worn)}` : "never"}; chain ${g.parts ? `supply ${f1(g.parts.supply)} h, crafts ${f1(g.parts.crafts)} h, crafter's levels ${f1(g.parts.levels)} h` : "?"}`);
    for (const l of wornCheck(r.run, r.world)) console.log(`     not worn within a day: ${l}`);
    if (row.risk === "win") console.log(`  hours fought on wins that are not safe: ${f1(r.run.unsafeHours)}`);
    const groups = new Map<string, { pts: number; codes: string[] }>();
    for (const x of waitingOf(r.world)) { const g = groups.get(x.waits) ?? { pts: 0, codes: [] }; g.pts += x.points; g.codes.push(x.achievement); groups.set(x.waits, g); }
    console.log(`  open at the deadline:`);
    for (const [k, g] of [...groups].sort((a, b) => b[1].pts - a[1].pts)) console.log(`     ${pad(k, 38)} ${pad(g.pts, 4)} ${g.codes.join(", ")}`);
    console.log(`  filler not reached (task 011): ${groups.get("filler not reached")?.pts ?? 0} points`);
    if (row.label.startsWith("A")) for (const n of NAMES) {
      const lines = stepsTable(r.played, n);
      console.log(`  ${n}: ${lines.length} runs of steps; the first 15:`);
      for (const l of lines.slice(0, 15)) console.log(`     ${l}`);
    }
    if (row.label.startsWith("A")) safeTable(r.world, "where row A leaves each fighter");
    return pointsOf(r.world);
  }
}

// ── 8. what a potion costs (task 010) ────────────────────────────────────────
/** The executor's choice of set (jobgear.ts jobGear): the pool's best, or the set with brewable potions when that wins
 *  where it did not, is safe where it was not, or kills faster — all under `price`. */
function execSet(ch: Character, bank: BankItem[], monster: string, price: (code: string) => number): GearRecommendation | undefined {
  const qty = ownedQtyOf(ch, bank);
  const opts = { owned: new Set(qty.keys()), ownedQty: qty, includeCraftable: false, potionPrice: price };
  const rec = bestInSlot(ch, monster, opts)[0];
  const brews = brewablePotions(ch, bank);
  const recB = rec && brews.length ? bestInSlot(ch, monster, { ...opts, extraCandidates: brews })[0] : undefined;
  return recB && rec && ((recB.forecast.win && !rec.forecast.win) || (recB.safe && !rec.safe) || (recB.forecast.win && killSeconds(recB.forecast, price) < killSeconds(rec.forecast, price))) ? recB : rec;
}
/** Task 011 section 2 (report 010's table, again): per fighter, its XP monsters with the executor's set, kill seconds as the
 *  planner prices them (potionSec) and the potions a fight drinks — `before` the pool report 010's table solved, `after`
 *  the same fighters in the sets the log shows (REAL_SETS) — and the pick (the best XP/s among safe wins). */
function potionTable(before: World, after: World, label: string): void {
  console.log(`\n## What a fight drinks, per fighter — ${label}`);
  console.log(`  per unit: ${[...catalog().items.values()].filter((it) => it.type === "utility").map((it) => `${it.code} ${f1(potionSec(it.code))} s${it.craft ? "" : " (floor)"}`).join(" · ")}`);
  console.log(`  before: the pool report 010's table solved (the bank of 2026-11-17) · after: the sets logs/dev.log shows (task 011, verdict (c)); the executor's set (owned + brewable potions); s/kill × ${KILL_LOG} + bank trips`);
  for (const chB of before.characters) {
    const chA = after.characters.find((c) => c.name === chB.name)!;
    const picks: Record<"b" | "a", { code: string; rate: number } | undefined> = { b: undefined, a: undefined };
    const rows: string[] = [];
    for (const m of [...catalog().monsters.values()].filter((x) => x.type !== "boss" && x.type !== "raid_boss" && x.level <= chB.level + 10 && fightXp(x.level, x.hp, x.type, chB.level) > 0 && nearestSpot(placeOf(chB), "monster", x.code, before)).sort((a, b) => a.level - b.level)) {
      const xp = fightXp(m.level, m.hp, m.type, chB.level);
      const cell = (k: "b" | "a", ch: Character, w: World): string => {
        const r = execSet(ch, w.bank, m.code, potionSec);
        if (!r?.forecast.win) return "no win";
        const sec = killSeconds(r.forecast) * KILL_LOG + killWalk(ch, w, m.code);
        if (r.safe && (!picks[k] || xp / sec > picks[k]!.rate)) picks[k] = { code: m.code, rate: xp / sec };
        const pots = Object.entries(r.forecast.used).filter(([, n]) => n > 0).map(([c, n]) => `${n} ${c.replace(/_potion$/, "")}`).join(" + ");
        return `${r.safe ? "safe" : "win "} ${pad(Math.round(sec), 4)} s ${pad(Math.round((xp / sec) * 3600), 5)} XP/h ${pots ? `drinks ${pots}` : "no potion"}`;
      };
      rows.push(`     ${pad(`${m.code} (${m.level})`, 24)} before: ${pad(cell("b", chB, before), 50)} after: ${cell("a", chA, after)}`);
    }
    const p = (x?: { code: string; rate: number }): string => (x ? `${x.code} ${Math.round(x.rate * 3600)} XP/h` : "none");
    console.log(`  ${chB.name} (combat ${chB.level}; ${chB.max_hp} HP before, ${chA.max_hp} after) — pick before: ${p(picks.b)} · after: ${p(picks.a)}`);
    for (const r of rows) console.log(r);
  }
}

/** Task 011 section 2: what a pig fight drinks — the log (PIG_LOG) against the simulator on the set worn (REAL_SETS) and
 *  on the set report 010's table solved: the expected mode (what killSeconds prices), Monte Carlo over 4,000 fights
 *  (mean ± sd, and the fights a stack of 16 lasts), the pessimistic pass. */
function drinkTable(): void {
  const POT = "small_health_potion", N = 4000;
  let seed = 11; const rnd = (): number => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); // seeded: the same print every run
  const pig = monsterOfCode("pig")!;
  const cols = (ch: Character, codes: string[]): string => {
    const f = applyGear(baseStats(ch), codes);
    const ev = simulate(f, pig), pe = simulate(f, pig, { pessimistic: true });
    const draws: number[] = [];
    let lost = 0;
    for (let i = 0; i < N; i++) { const r = simulate(f, pig, { rng: rnd }); draws.push(r.used[POT] ?? 0); lost += r.maxHp - r.hpRemaining; }
    const mean = draws.reduce((s, x) => s + x, 0) / N, sd = Math.sqrt(draws.reduce((s, x) => s + (x - mean) ** 2, 0) / N);
    let fights = 0, k = 0;
    if (mean > 0) for (let st = 0; st < 1000; st++) for (let left = 16; left > 0; fights++) left -= draws[k++ % N];
    return `${pad(ev.maxHp, 4)} HP | expected ${ev.used[POT] ?? 0} (lost ${ev.maxHp - ev.hpRemaining}) | MC ${mean.toFixed(2)} ± ${sd.toFixed(2)}${mean > 0 ? `, a 16-stack ${(fights / 1000).toFixed(1)} fights` : ""} (lost ${Math.round(lost / N)}) | pessimistic ${pe.win ? pe.used[POT] ?? 0 : "loss"}`;
  };
  console.log(`\n## What a pig fight drinks (task 011 section 2): logs/dev.log 2026-11-19 13:43–14:57 UTC against simulate`);
  for (const [name, g] of Object.entries(PIG_LOG)) {
    const ch = chAt(chars.find((c) => c.name === name)!, g.level);
    const n = g.lasted.length, F = g.lasted.reduce((s, x) => s + x, 0);
    const log = n ? `${n} stacks of 16 lasted ${g.lasted.join(", ")} fights: ${(16 * n / F).toFixed(2)}–${(16 * n / (F - n)).toFixed(2)} a fight` : "no potion";
    const real = REAL_SETS[name] ? [...Object.values(REAL_SETS[name]), "novice_guide"] : GEAR_SLOTS.map((s) => (ch as unknown as Record<string, string>)[`${s}_slot`]).filter(Boolean);
    const solved = execSet(ch, fx.bankItems, "pig", potionSec);
    console.log(`  ${name} (combat ${g.level}) — log: ${log}; HP lost a fight ${g.lost}`);
    console.log(`     the set worn:          ${cols(ch, n ? [...real, POT] : real)}`);
    if (n) console.log(`     report 010's solved set: ${cols(ch, solved?.codes ?? [])}  [${(solved?.codes ?? []).filter((c) => c !== POT).join(", ")}]`);
  }
}

/** Task 011 section 2, read-only: every potion whose price is half or more one by-product ingredient — its price with
 *  that ingredient free, the snapshot bank's stock of it (the replay's row A prints who makes it on the way). */
function byproductTable(): void {
  console.log(`\n## By-products in a potion's price (task 011; potionSec is the field price) — task 012: covered now (${COVER_RUNS} runs in the bank: the ingredient is free)`);
  for (const b of BYPRODUCT_POTIONS) {
    const stock = fx.bankItems.find((x) => x.code === b.code)?.quantity ?? 0;
    const per = item(b.potion)!.craft!.items.find((g) => g.code === b.code)!.quantity;
    const cov = (q: number | undefined): string => (q == null ? "unknown" : q >= COVER_RUNS * per ? "covered" : "not");
    console.log(`  ${pad(b.potion, 24)} ${pad(f1(potionSec(b.potion)), 6)} s · ${pad(b.code, 16)} (${b.from}) ${pad(f1(b.part), 6)} s of it · ${pad(f1(potionSec(b.potion) - b.part), 6)} s if it were free · the snapshot bank ${pad(stock, 5)} ${pad(cov(stock), 7)} · the log's bank ${LOG_BANK[b.code] ?? "unknown"} ${cov(LOG_BANK[b.code])}`);
  }
}

/** Task 011 section 4: every gear need (gear.ts gearNeeds) — for whom, the work, the pieces, H0, H1, G. */
function needsTable(w: World, label: string): void {
  const { needs } = gearNeeds(w);
  console.log(`\n## Gear by need — ${label}: ${needs.length} need(s)`);
  for (const n of needs) console.log(`  ${pad(n.for, 7)} ${pad(n.work, 34)} ${pad([...n.pieces].map(([c, k]) => (k > 1 ? `${c}×${k}` : c)).join(" + "), 52)} H0 ${pad(f1(n.H0), 5)} h · H1 ${pad(f1(n.H1), 5)} h · G ${f1(n.G)} h${n.offered ? "" : " (crafter not on)"}`);
}

// ── 7b. task 012's tables ────────────────────────────────────────────────────
/** Section 2: the log's fights against fightXp as the planner called it, and the wisdom each XP implies under both rules. */
function xpEvidenceTable(): void {
  console.log(`\n## What a fight gives (task 012 section 2): the won fights of logs/dev.log 2026-11-19 09:15–20:19 UTC against fightXp`);
  console.log(`  monster (level, HP) | gap | favor | fights | who, combat | XP seen (fights) | fightXp as the planner called it before → the repaired rule, wisdom 0 | wisdom implied: before · after`);
  const w = (r?: [number, number]): string => (!r ? "impossible" : !Number.isFinite(r[0]) ? "any" : `${Math.round(r[0])}…${Math.round(r[1])}`);
  for (const row of XP_LOG) {
    const m = monsterOfCode(row.monster)!, L = m.level + row.gap, xs = Object.keys(row.xp).map(Number);
    const n = Object.values(row.xp).reduce((s, x) => s + x, 0);
    const span = (rule: keyof typeof RULES): string => xs.map((x) => w(impliedW(row, rule, x))).join(", ");
    console.log(`  ${pad(`${row.monster} (${m.level}, ${m.hp})`, 24)} ${pad(row.gap, 3)} ×${pad(row.favor, 4)} ${pad(n, 4)} ${pad(row.who, 31)} ${pad(Object.entries(row.xp).map(([x, k]) => `${x} (${k})`).join(" "), 26)} ${pad(`${Math.round(oldFightXp(m, L) * row.favor)} → ${Math.round(fightXp(m.level, m.hp, m.type, L) * row.favor)}`, 9)} ${span("before")} · ${span("after")}`);
  }
  console.log(`  the pig (19) gives no XP from combat ${pigStop(oldFightXp)} before, from ${pigStop((m, L) => fightXp(m.level, m.hp, m.type, L))} after`);
}

/** Section 2: per fighter, the XP monsters it wins safely, XP a kill and XP an hour before → after (the old rule without
 *  wisdom → the repaired rule with the wisdom of the set solved), the kill's seconds as the planner prices them now. */
function xpTable(w: World, label: string): void {
  console.log(`\n## What a fight gives, per fighter — ${label}: XP a kill before → after section 2; kill seconds before → after section 3 (rest at 5 HP/s × 1.3 → the docs' rest × ${KILL_LOG}); XP an hour with both before → section 2 only → both after`);
  for (const ch of w.characters) {
    const rows: string[] = [];
    const picks: ({ code: string; r: number } | undefined)[] = [undefined, undefined, undefined];
    const take = (i: number, code: string, r: number): void => { if (!picks[i] || r > picks[i]!.r) picks[i] = { code, r }; };
    for (const m of [...catalog().monsters.values()].filter((x) => x.type !== "boss" && x.type !== "raid_boss" && x.level <= ch.level + 10 && (oldFightXp(x, ch.level) > 0 || fightXp(x.level, x.hp, x.type, ch.level) > 0) && nearestSpot(placeOf(ch), "monster", x.code, w) && safeWin(ch, w, x.code)).sort((a, b) => a.level - b.level)) {
      const r = fightRec(ch, w, m.code)!, wis = setWisdom(ch, r);
      const sec = actionSec({ kind: "kill", monster: m.code }, ch, w);
      const secB = oldKillSec(r.forecast, potionPrice(w, ch.name).price) * 1.3 + killWalk(ch, w, m.code); // shortcut: the same set under both prices
      const xb = oldFightXp(m, ch.level), xa = fightXp(m.level, m.hp, m.type, ch.level, wis);
      take(0, m.code, xb / secB); take(1, m.code, xa / secB); take(2, m.code, xa / sec);
      rows.push(`     ${pad(`${m.code} (${m.level})`, 22)} XP ${pad(`${xb} → ${xa}`, 9)} (wisdom ${pad(wis, 3)}) · ${pad(`${Math.round(secB)} → ${Math.round(sec)} s`, 13)} · ${Math.round((xb / secB) * 3600)} → ${Math.round((xa / secB) * 3600)} → ${Math.round((xa / sec) * 3600)} XP/h`);
    }
    const p = (x?: { code: string; r: number }): string => (x ? `${x.code} ${Math.round(x.r * 3600)} XP/h` : "none");
    console.log(`  ${ch.name} (combat ${ch.level}) — the pick before: ${p(picks[0])} · with section 2: ${p(picks[1])} · with sections 2 and 3: ${p(picks[2])}`);
    for (const r of rows) console.log(r);
  }
}

/** Section 3: every kill sample of the planner's era against the repaired estimate (no factor), in parts; the median. */
function killTable(): void {
  console.log(`\n## What a kill takes (task 012 section 3): every kill sample of the planner's era against the repaired estimate`);
  console.log(`  the estimate in the sets logs/dev.log shows (realWorld at the level then): fightSec(turns) + rest (1 s per 1% of max HP) + potions (field price) + bank trips, no factor; before: rest at 5 HP/s, all × 1.3`);
  const rows = KILL_SAMPLES.map((x) => ({ x, k: killParts(x.who, x.level, x.monster, x.pieces) })).filter((r) => r.k).map((r) => ({ ...r, ratio: r.x.s / r.k!.est }));
  for (const r of [...rows].sort((a, b) => a.ratio - b.ratio)) {
    const k = r.k!;
    console.log(`  ${r.x.t} ${pad(r.x.who, 6)} ${pad(r.x.level, 2)} ${pad(r.x.monster, 12)} measured ${pad(r.x.s, 3)} s · estimate ${pad(Math.round(k.est), 3)} s = fight ${k.turns} turns ${k.fight} s + rest ${k.rest} s (${k.lost} of ${k.maxHp} HP) + potions ${Math.round(k.pots)} s + walk ${f1(k.walk)} s · before ${Math.round(k.estOld)} s · measured ÷ estimate ${r.ratio.toFixed(2)}`);
  }
  const med = median(rows.map((r) => r.ratio));
  const brewing = (r: (typeof rows)[number]): boolean => r.x.monster === "pig" && r.x.s > 150; // the pig steps of 13:43–16:02 that brewed potions under the old objective
  console.log(`  median ${med.toFixed(3)} over ${rows.length} samples → KILL_LOG ${Math.abs(med - 1) > 0.1 ? med.toFixed(2) : "none (inside 0.9–1.1)"} (config.ts KILL_LOG = ${KILL_LOG}); without the three pig steps that brewed potions under the old objective: ${median(rows.filter((r) => !brewing(r)).map((r) => r.ratio)).toFixed(3)}`);
  console.log(`  cross-check on the planner's own estimates then (rest at 5 HP/s, × 1.3): measured ÷ (estimate ÷ 1.3), median ${median(KILL_SAMPLES.map((x) => (1.3 * x.s) / x.est)).toFixed(3)} (the rest rule moves it by at most ±9% at 460–550 max HP)`);
  cases.push(["task 012: KILL_LOG is the median of measured ÷ the repaired estimate over every kill sample", Math.abs(med - 1) > 0.1 ? Math.abs(KILL_LOG - Number(med.toFixed(2))) < 1e-9 : (KILL_LOG as number) === 1]);
  console.log(`\n## A kill step's parts (task 012 section 3): the log (per kill) against the estimate's parts — steps since 16:22 UTC`);
  for (const s of STEPS_LOG) {
    const k = killParts(s.who, s.level, s.monster, s.pieces);
    console.log(`  ${s.t} ${pad(s.who, 6)} ${pad(s.key, 20)} ${pad(s.monster, 12)} ${pad(s.kills, 3)} kills · log: fight ${s.fight} s, rest ${s.rest} s (${s.restHp} HP a rest), eat ${s.eat} s (${s.foodHp} HP), the food's making ${s.food} s, walks and bank ${s.walk} s = ${s.total} s`);
    if (k) console.log(`     estimate: fight ${k.fight} s (${k.turns} turns), rest ${k.rest} s for ${k.lost} HP (before ${k.restOld} s), potions ${Math.round(k.pots)} s, walk ${f1(k.walk)} s → ${Math.round(k.est)} × ${KILL_LOG} = ${Math.round((k.est - k.walk) * KILL_LOG + k.walk)} s now; before ${Math.round(k.estOld)} s`);
  }
  // healing as it is (settled point 3, read-only)
  console.log(`\n## Healing as it is (task 012 section 3, read-only): per fighter, a fight's healing (eating + rest) and the food's own making against the rest the price assumes`);
  const by = new Map<string, { kills: number; heal: number; food: number; price: number }>();
  for (const s of STEPS_LOG) {
    const k = killParts(s.who, s.level, s.monster, s.pieces);
    if (!k) continue;
    const e = by.get(s.who) ?? { kills: 0, heal: 0, food: 0, price: 0 };
    e.kills += s.kills; e.heal += (s.rest + s.eat) * s.kills; e.food += s.food * s.kills; e.price += k.rest * s.kills;
    by.set(s.who, e);
  }
  for (const [who, e] of by) {
    const real = (e.heal + e.food) / e.kills, price = e.price / e.kills;
    console.log(`  ${pad(who, 7)} ${pad(e.kills, 3)} kills · healing ${f1(e.heal / e.kills)} s a fight + the food's making ${f1(e.food / e.kills)} s = ${f1(real)} s · the price's rest ${f1(price)} s · ${((100 * (real - price)) / price).toFixed(0)}%${Math.abs(real - price) <= 0.15 * price ? " (within 15%)" : ""}`);
  }
}

/** Section 3, settled point 4: the log's mat: and gear: steps against the new price of a step's fixed seconds. */
function makeTable(): void {
  console.log(`\n## A step's fixed cost (task 012 section 3): the log's mat: and gear: steps (planned 0.0 h) against cost.ts stepSec`);
  for (const m of MAKE_LOG) {
    const code = m.key.split(":")[1];
    const work = item(code)?.craft ? { kind: "craft" as const, code } : tradeOf(code)?.work;
    const place = work && makePlace(work, base);
    const from = { x: m.from[0], y: m.from[1], layer: "overworld" };
    const price = stepSec(place, from);
    console.log(`  ${m.t} ${pad(m.who, 6)} ${pad(m.key, 26)} took ${pad(m.total, 3)} s: runs ${pad(m.run, 3)} s, walks ${pad(m.walk, 3)} s, bank moves ${pad(m.bank, 3)} s · fixed ${pad(m.total - m.run, 3)} s against the price ${Math.round(price)} s (walks ${Math.round(price - STEP_BANK_SEC)} s + bank ${STEP_BANK_SEC} s); planned before: ${m.run} s of runs at most`);
  }
  console.log(`  bank moves: median ${median(MAKE_LOG.map((m) => m.bank))} s (${MAKE_LOG.map((m) => m.bank).sort((a, b) => a - b).join(", ")})`);
}

/** Section 4: per fighter at combat 25, 28, 30, 35 — the pick, its kill seconds and the potions a fight drinks with the
 *  price the stock covers and at the field's, on a bank that holds the two potions the fleet brews. */
function coverTable(): void {
  const bank = bankPlus(fx.bankItems, new Map([["minor_health_potion", 100], ["small_health_potion", 100]]));
  const W: World = { ...base, bank }, F: World = { ...W, config: { ...W.config, potionStock: 0 } };
  console.log(`\n## Stock is free, per fighter (task 012 section 4): the snapshot bank + 100 minor and 100 small health potions (what alchemy brews into the bank); covered: algae ${stockOf(W, "algae")}, sunflower ${stockOf(W, "sunflower")}, nettle ${stockOf(W, "nettle_leaf")} → ${coveredIn(W).filter((c) => /health_potion/.test(c)).join(", ") || "none"}`);
  const line = (c: Character, w: World): string => {
    const p = pickMonster(c, w, new Set());
    const f = p && fightRec(c, w, p.monster)?.forecast;
    const d = f ? Object.entries(f.used).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k.replace(/_potion$/, "")}`).join(" + ") : "";
    return p ? `${p.monster} ${Math.round(p.sec)} s${d ? `, ${d}` : ", no potion"}` : "no safe XP monster";
  };
  for (const ch of chars) console.log(`  ${pad(ch.name, 7)} ${[25, 28, 30, 35].map((L) => { const c = chAt(ch, L); return `${L}: ${line(c, W)} | field: ${line(c, F)}`; }).join(" · ")}`);
}

/** Section 5: diamond_in_the_sky's chain before (one static node, no gate) and after, every other gated chain, and what the
 *  coal of the chosen node would be worth to the open bills (read-only). */
function nodeTable(w: World, label: string): void {
  console.log(`\n## The node and the gate (task 012 section 5) — ${label}`);
  const calH = (DEADLINE - NOW) / 3.6e6;
  const st = sourceFor("diamond_stone");
  for (const ch of w.characters) {
    const s = pickSource("diamond_stone", ch, w);
    console.log(`  ${pad(ch.name, 7)} mining ${levelOf(ch, "mining")}${(rolesFor(w)[ch.name] ?? []).includes("mining") ? " (the role)" : ""}: before ${typeof st === "string" ? st : (st.work as { resource: string }).resource} · after ${s ? `${s.work.kind === "gather" ? s.work.resource : s.work.monster}, ${s.xp} XP an action, ${f1(s.sec)} s an action, share ${s.share.toFixed(2)}, net ${f1(s.net)} s a stone (gross ${f1(s.sec * s.per)} s)${s.over ? `, over ${s.over}` : ""}` : "none"}`);
  }
  for (const t of targetsOf(w)) {
    if (!t.achievement || (t.work.kind !== "craft" && t.work.kind !== "buy")) continue;
    const bill = billOf(w, "Fourth", (t.inputs ?? []).map((i) => [i.code, i.per * t.left]));
    const r = t.work.kind === "craft" ? item(t.work.code)?.craft : undefined;
    const self = r && gateRoad(r.skill as Lane, r.level, w);
    if (!bill.gated.length && !self) continue;
    const par = objectiveParents(w, "Fourth", calH).find((p) => p.key === t.key);
    const roads = [...bill.gated, ...(self ? [{ code: (t.work as { code: string }).code, ...self }] : [])];
    const before = bill.hours - bill.gated.reduce((s, g) => s + g.hours, 0);
    const why = t.filler ? "filler, no parent of supply" : bill.out.length ? `waits: ${bill.out[0]}` : !Number.isFinite(before) ? "waits: a leaf nobody that is on sources yet" : roads.some((g) => !Number.isFinite(g.hours)) ? "waits: no XP source on the way" : "sourced inside its own step (no parent of supply)";
    console.log(`  ${t.key}: the bill ${f1(before)} h without the road → ${par ? `the parent ${f1(par.hours)} h, fit ${par.fit.toPrecision(3)}` : why}; roads: ${roads.map((g) => `${g.lane} ${g.level} for ${g.code}: ${f1(g.hours)} h by ${g.who ?? "nobody"}`).join("; ")}`);
    for (const ch of w.characters) {
      const lv = (rolesFor(w)[ch.name] ?? []).some((l) => roads.some((g) => g.lane === l)) ? rank(ch.name, w).levels.find((c) => roads.some((g) => c.target.key === `lvl:${g.lane}:${g.level}`)) : undefined;
      if (lv) console.log(`     ${pad(ch.name, 7)} level candidate ${lv.target.key}, score ${lv.fit.toPrecision(3)}: ${lv.step.why}`);
    }
  }
  // read-only: what the coal of the coal rocks is worth — the coal the open bills are short of against 42 h there
  let short = 0;
  for (const p of objectiveParents(w, "Fourth", calH)) for (const l of billOf(w, "Fourth", p.demand, undefined, false).leaves.values()) if (l.code === "coal") short += l.qty;
  for (const n of gearNeeds(w).needs) for (const [code, k] of n.pieces) for (const l of billOf(w, n.for, recipeDemand(code, k), undefined, false).leaves.values()) if (l.code === "coal") short += l.qty;
  const miner = w.characters.find((c) => c.name === "Fourth")!;
  const coalSec = actionSec({ kind: "gather", resource: "coal_rocks", drop: "coal" }, miner, w);
  console.log(`  the coal the open bills (objectives and gear needs) are short of: ${f1(short)}; 42 h at the coal rocks bring ${f1((42 * 3600) / coalSec)} coal (${f1(coalSec)} s a gather, Fourth) — no credit in task 012`);
}

// ── 7. safe: a wall or a price ───────────────────────────────────────────────
function safeTable(w: World, label: string): void {
  {
    console.log(`\n## Safe: a wall or a price — ${label}`);
    for (const ch of w.characters) {
      console.log(`  ${ch.name} (combat ${ch.level}, ${ch.max_hp} HP):`);
      for (const m of [...catalog().monsters.values()].filter((x) => x.type !== "boss" && x.type !== "raid_boss" && x.level <= ch.level + 10 && fightXp(x.level, x.hp, x.type, ch.level) > 0 && nearestSpot(placeOf(ch), "monster", x.code, w)).sort((a, b) => a.level - b.level)) {
        const r = fightRec(ch, w, m.code);
        if (!r) continue;
        const f = r.forecast;
        const sec = killSeconds(f) * KILL_LOG + killWalk(ch, w, m.code);
        const xph = f.win ? (fightXp(m.level, m.hp, m.type, ch.level) / sec) * 3600 : 0;
        let end = "";
        if (f.win && !r.safe) {
          const trace: TurnEvent[] = [];
          simulate(applyGear(baseStats(ch), r.codes), m, { pessimistic: true, trace });
          const last = trace[trace.length - 1];
          end = `; pessimistic: dies on turn ${last?.turn}, the monster at ${last?.monsterHp} HP`;
        }
        let make = "";
        if (!r.safe) { const p = piecesFor(ch, w, m.code); make = p ? `; section 4: ${[...p.pieces].map(([c, k]) => (k > 1 ? `${c}×${k}` : c)).join(" + ")} in ${f1(p.G)} h` : "; section 4: nothing craftable flips it"; }
        console.log(`     ${pad(`${m.code} (${m.level})`, 26)} win ${f.win ? "yes" : "no "} safe ${r.safe ? "yes" : "no "} ${f.win ? `${pad(Math.round(sec), 4)} s/kill ${pad(Math.round(xph), 6)} XP/h` : ""}${end}${make}`);
      }
    }
  }
}

// ── verdict ──────────────────────────────────────────────────────────────────
console.log("\n## Invariants");
let bad = 0, n = 0;
for (const [k, r] of inv) {
  n += r.n;
  console.log(`  ${r.fails ? "FAIL" : "ok  "} ${pad(k, 52)} ${r.n} checks${r.fails ? `, ${r.fails} failed: ${r.bad.join(" | ")}` : ""}`);
  if (r.fails || (!r.n && k !== INV[15])) bad++;
}
for (const [why, ok] of cases) { n++; if (!ok) { bad++; console.log(`MISMATCH ${why}`); } }
console.log(`\nMemo: ${JSON.stringify(memoSizes())}. ${((performance.now() - T0) / 1000).toFixed(1)} s in all`);
console.log(bad ? "FAILED" : `OK (${n} invariant checks, ${cases.length} made-up cases${VERBOSE ? `; deadline points ${results.join(" / ")}` : ""})`);
process.exit(bad ? 1 : 0);
