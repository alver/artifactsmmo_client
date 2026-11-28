// Task 042, D: the party's table with its kit — the lich, the goblin priestess and rosenblood against the trio (First, Fifth,
// Second) at today's levels and with all three at 36, 38, 40, 42, 44, 46, each member in the best set of its pool, the stage's
// craftable pieces of its level and the kit (party.ts partyPlan with `kit`: a rune a merchant sells for gold, a potion the
// fleet's alchemy brews now or the bank holds; the aura rune and the splash potions placed on the party). A row: the rolled win
// rate (✓ at the floor), a won fight's turns, each member's XP an hour there (the fight XP at the party's average level, rounded
// down, with its set's wisdom, over the party's cycle: the fight and the slowest member's healing, over p) against its own pick
// alone (pickMonster at that level in the bank's gear, at least its pick today), the kit (runes, potions a win) and what of it is missing (pieces not in
// the pool with their hours — gear.ts makeHours —, runes with their gold, potions beyond the bank's stock with their brewing
// hours a win); then the day each boss first pays (admitted, and every member's XP there at least its own pick's), from the
// service's last road (the first day the trio's average combat level reaches the row's). Reads a World snapshot (default the
// newest logs/world/) with a live /events snapshot's characters, bank, bags and outlook over it, and stage.json; writes
// nothing, makes no request.
//   node --import tsx --experimental-webstorage --localstorage-file=<scratch>/p.db scripts/party-kit.mts --snap <events.json> [--world <file>] [--boss a,b] [--levels 36,38]
import { readFile, readdir } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog, catalog, item, monster as monsterOf } from "../src/catalog";
import { loadAtlas } from "../src/catalog/atlas";
import { DEFAULTS } from "../src/plan/planner/config";
import { bankPlus } from "../src/plan/planner/forward";
import { parseStages, stageOf } from "../src/plan/planner/stage";
import { brews, partyPlan, partyCycle } from "../src/plan/planner/party";
import { partyRate } from "../src/sim/monte";
import { applyGear, baseStats } from "../src/sim/stats";
import type { PartyPlan } from "../src/plan/planner/party";
import { pickMonster } from "../src/plan/planner/pick";
import { chAt } from "../src/plan/planner/reach";
import { makeHours } from "../src/plan/planner/gear";
import { poolBank } from "../src/plan/planner/stock";
import { ownedQtyOf } from "../src/plan/jobgear";
import { fightXp, potionSec, wisdomOf } from "../src/plan/xp";
import type { World } from "../src/plan/planner/types";
import type { Character } from "../src/types/api";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
await loadAtlas();

const arg = (k: string): string | undefined => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const file = arg("--world") ?? `logs/world/${(await readdir("logs/world")).filter((f) => f.endsWith(".json")).sort().pop()}`;
type Snap = { characters: Record<string, Character>; bankItems: World["bank"]; bankDetails?: { gold: number }; planner?: { config?: Partial<World["config"]> }; outlook?: { road?: { from: number; byDay: { day: string; levels: Record<string, number[]> }[] } } };
const snap = arg("--snap") ? (JSON.parse(await readFile(arg("--snap")!, "utf8")) as Snap) : undefined;
const raw = (JSON.parse(await readFile(file, "utf8")) as { world: World }).world;
const chars = snap ? Object.values(snap.characters) : raw.characters;
const bags = new Map<string, number>();
for (const c of chars) for (const s of c.inventory ?? []) if (s.code) bags.set(s.code, (bags.get(s.code) ?? 0) + s.quantity);
const world: World = {
  ...raw, characters: chars, bank: bankPlus(snap?.bankItems ?? raw.bank, snap ? bags : new Map(Object.entries(raw.bags ?? {}))), bankGold: snap?.bankDetails?.gold ?? raw.bankGold,
  stages: parseStages(await readFile("stage.json", "utf8")).stages,
  current: {}, blocked: {}, costs: {}, bags: undefined, bankSlots: undefined, nextExpansion: undefined, market: undefined,
  // the live patch over this code's DEFAULTS (a World file carries the config of its day: 11-28 00:00 held Second a worker)
  config: { ...DEFAULTS, ...(snap?.planner?.config ?? raw.config), on: { ...DEFAULTS.on, ...(snap?.planner?.config ?? raw.config).on } } as World["config"],
};
const BOSSES = (arg("--boss") ?? "lich,goblin_priestess,rosenblood").split(",");
const FLOOR = (world.config.risk as { minWin?: number })?.minWin ?? 0.75;
const TRIO = ["First", "Fifth", "Second"], LEVELS = (arg("--levels") ?? "36,38,40,42,44,46").split(",").map(Number);
const ch = (w: World, n: string): Character => w.characters.find((c) => c.name === n)!;
const atWorld = (L: number): World => ({ ...world, characters: world.characters.map((c) => (TRIO.includes(c.name) ? chAt(c, L) : c)) });
const k = (x: number): string => (x >= 1000 ? `${(x / 1000).toFixed(1)}k` : String(Math.round(x)));
const gold = new Map<string, number>();
for (const n of catalog().npcs.values()) for (const o of n.items ?? []) if (o.currency === "gold" && o.buy_price != null) gold.set(o.code, o.buy_price);
const PINNED = new Set(["novice_guide", "lost_world_map"]);
const own = new Map<string, number>(); // `${name}@${L}` → its own pick's XP an hour alone
/** Its own pick alone at its level in the bank's gear, at least its pick today (the bank's gear of today wins little ten
 *  levels up). */
const ownPick = (w: World, n: string): number => {
  const c = ch(w, n), key = `${n}@${c.level}`;
  if (!own.has(key)) own.set(key, Math.max((pickMonster(c, w, new Set())?.rate ?? 0) * 3600, c === ch(world, n) ? 0 : ownPick(world, n)));
  return own.get(key)!;
};

/** The previous row's sets at this row's levels (the solver's sets are solo solves — 039's shortcut — and a stage with no
 *  list can lead it to a weaker party than the sets it still allows): p, turns, losses and potions rolled again. */
function rerate(w: World, boss: string, plan: PartyPlan): PartyPlan {
  const party = plan.members.map((x) => ({ fighter: applyGear(baseStats(ch(w, x.name)), x.codes), threat: x.threat }));
  const r = partyRate(party, monsterOf(boss)!);
  const members = plan.members.map((x, i) => ({ ...x, level: ch(w, x.name).level, maxHp: party[i].fighter.stats.hp, lost: r.lost[i], fell: r.fell[i], use: r.used[i] }));
  const wake = r.p > 0 ? (1 - r.p) / r.p : Infinity;
  return { ...plan, p: r.p, admitted: r.p >= FLOOR, turns: r.turns, members, hpPerWin: members.reduce((t, x) => t + x.lost + wake * (x.maxHp - 1), 0), left: r.left };
}
/** What picks between two plans, as party.ts kitBetter: at the floor; then the fewer potions a win nobody brews; then the fewer
 *  seconds a win with the potions at their chain. */
const potsOf = (w: World, p: PartyPlan, brewn: boolean): number => p.members.reduce((s, x) => s + Object.entries(x.use).reduce((t, [c, q]) => t + (brews(w, c) === brewn ? (brewn ? q * potionSec(c) : q) : 0), 0), 0);
const costOf = (w: World, p: PartyPlan): number => (p.p > 0 ? partyCycle(w, p) + potsOf(w, p, true) / p.p : Infinity);
const better = (w: World, a: PartyPlan | undefined, b: PartyPlan | undefined): boolean => !!a && (!b || (a.admitted !== b.admitted ? a.admitted : !a.admitted ? a.p > b.p
  : Math.abs(potsOf(w, a, false) - potsOf(w, b, false)) > 0.05 ? potsOf(w, a, false) < potsOf(w, b, false) : costOf(w, a) < costOf(w, b)));

/** One row: the plan, each member's XP an hour there and alone, the kit and what of it is missing. */
function row(w: World, boss: string, plan: PartyPlan | undefined): { text: string; pays: boolean } {
  if (!plan) return { text: "— | — | — | — | —", pays: false };
  const m = monsterOf(boss)!;
  const avg = Math.floor(plan.members.reduce((s, x) => s + x.level, 0) / plan.members.length);
  const cycle = plan.p > 0 ? partyCycle(w, plan) : Infinity;
  const xp = plan.members.map((x) => (fightXp(m.level, m.hp, m.type, avg, wisdomOf(x.codes)) / cycle) * 3600);
  const alone = plan.members.map((x) => ownPick(w, x.name));
  const pays = plan.admitted && xp.every((v, i) => v > 0 && v >= alone[i]);
  const runes = plan.members.map((x) => `${x.name.slice(0, 3)} ${x.as} ${(x.slots.rune || "no rune").replace(/_rune$/, "")}${x.fell > 0.005 ? ` (falls in ${Math.round(x.fell * 100)}%)` : ""}`).join(", ");
  const pots = new Map<string, number>();
  for (const x of plan.members) for (const [c, q] of Object.entries(x.use)) if (q > 0) pots.set(c, (pots.get(c) ?? 0) + q);
  const potText = [...pots].map(([c, q]) => `${q.toFixed(1)} ${c.replace(/_potion$/, "")}`).join(", ") || "none";
  // what is missing: pieces and runes beyond the pool (the copies the members before took counted), potions beyond the bank's stock
  const miss: string[] = [];
  let hours = 0, runeGold = 0;
  const took = new Map<string, number>(), all = new Map<string, number>(); // the pieces of all three: one bill, the level roads once
  for (const x of plan.members) {
    const c = ch(w, x.name), stock = ownedQtyOf(c, poolBank(w, c.name));
    const pieces = new Map<string, number>();
    for (const code of x.codes) {
      if (PINNED.has(code) || item(code)?.type === "utility") continue;
      const have = (stock.get(code) ?? 0) - (took.get(code) ?? 0);
      took.set(code, (took.get(code) ?? 0) + 1);
      if (have > 0) continue;
      if (item(code)?.type === "rune") { runeGold += gold.get(code) ?? Infinity; miss.push(`${x.name} ${code} (${k(gold.get(code) ?? Infinity)} gold)`); continue; }
      pieces.set(code, (pieces.get(code) ?? 0) + 1);
    }
    for (const [p, n] of pieces) all.set(p, (all.get(p) ?? 0) + n);
    if (pieces.size) miss.push(`${x.name} ${[...pieces.keys()].join(" ")}`);
  }
  if (all.size) { hours = makeHours(all, ch(w, plan.members[0].name), w).G; miss.push(`the pieces ${hours.toFixed(1)} h`); }
  for (const [c, q] of pots) {
    const held = w.bank.find((b) => b.code === c)?.quantity ?? 0;
    const brew = (item(c)?.craft?.level ?? 99) <= Math.max(...w.characters.map((x) => x.alchemy_level ?? 0));
    miss.push(`${c.replace(/_potion$/, "")}: the bank's ${held} for ${Math.floor(held / q)} wins${brew ? `, brewing ${((q * potionSec(c)) / 3600).toFixed(2)} h a win` : ", nobody brews it"}`);
  }
  const xpText = plan.members.map((x, i) => `${x.name} ${k(xp[i])} / ${k(alone[i])}`).join(", ");
  const head = `${Math.round(plan.p * 100)}%${plan.admitted ? " ✓" : ""} | ${plan.p > 0 ? Math.round(plan.turns) : "—"}`;
  return { text: `${head} | ${plan.p > 0 ? xpText : "—"} | ${runes}; a win: ${potText} | ${miss.join("; ") || "nothing"}${hours || runeGold ? ` — ${hours.toFixed(1)} h, ${k(runeGold)} gold` : ""}`, pays };
}

const road = snap?.outlook?.road;
const dayOf = (L: number): string => {
  const d = road?.byDay.find((x) => Math.floor(TRIO.reduce((s, n) => s + (x.levels[n]?.[0] ?? 0), 0) / TRIO.length) >= L);
  return d ? d.day : road ? `after ${road.byDay[road.byDay.length - 1].day}` : "no road";
};
console.log(`World ${new Date(world.now).toISOString()}${snap ? ` + live snapshot (${arg("--snap")}), road from ${road ? new Date(road.from).toISOString() : "—"}` : ""}; ${TRIO.map((n) => `${n} ${ch(world, n).level}`).join(", ")}; floor ${Math.round(((world.config.risk as { minWin?: number })?.minWin ?? 0.75) * 100)}%; stage ${stageOf(world)?.name ?? "—"}`);
console.log("| boss, trio | p | turns | XP an hour there / alone | runes; potions a win | missing |\n|---|---|---|---|---|---|");
const t0 = Date.now(), first: string[] = [];
for (const b of BOSSES) {
  let paid: string | undefined;
  const now = row(world, b, partyPlan(world, TRIO, b, {}, true));
  console.log(`| ${b}, now (${TRIO.map((n) => ch(world, n).level).join("/")}) | ${now.text} |`);
  if (now.pays) paid = "today";
  let prev: PartyPlan | undefined, prevL = 0;
  for (const L of LEVELS) {
    const w = atWorld(L), own = partyPlan(world, TRIO, b, Object.fromEntries(TRIO.map((n) => [n, L])), true), carried = prev && rerate(w, b, prev);
    const plan = better(w, carried, own) ? carried : own;
    const r = row(w, b, plan);
    console.log(`| ${b}, all at ${L} (${stageOf(w)?.name.split(":")[0] ?? "—"}${plan === carried ? `, the sets of ${prevL}` : ""}) | ${r.text} |`);
    prev = plan; prevL = plan === carried ? prevL : L;
    if (r.pays && !paid) paid = `at ${L}: ${dayOf(L)}`;
  }
  first.push(`${b}: ${paid ?? "none to " + LEVELS[LEVELS.length - 1]}`);
}
console.log(`\nThe first that pays (admitted, each member's XP there ≥ its own pick's; the day the road's trio averages that level): ${first.join("; ")}`);
console.log(`(${Math.round((Date.now() - t0) / 1000)} s)`);
