// Task 039, B.2: the party table — each boss against the pair (First, Fifth) and the trio (with Second), at today's levels and
// gear and with all three at 35, 40 and 45 in the best sets the stage's lists allow (plan/planner/party.ts partyPlan): the
// rolled win rate against the floor, a won fight's turns (each member's cooldown is turns × 2 s), the food a win burns (the
// party's HP lost a win, its losses' waking at 1 HP counted, in Cooked Trout of 225 HP); then for each boss the lowest level of
// Second at which the trio passes the floor where the pair does not (the pair now, at 35, at 40, at 45). Reads a World snapshot
// (default the newest logs/world/), optionally with a live /events snapshot's characters, bank and bags over it; writes nothing,
// makes no request.
//   node --import tsx --experimental-webstorage --localstorage-file=<scratch>/p.db scripts/party.mts [--world <file>] [--snap <events.json>] [--boss a,b]
import { readFile, readdir } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog, item } from "../src/catalog";
import { loadAtlas } from "../src/catalog/atlas";
import { DEFAULTS } from "../src/plan/planner/config";
import { bankPlus } from "../src/plan/planner/forward";
import { stageOf } from "../src/plan/planner/stage";
import { partyPlan, lowestThird } from "../src/plan/planner/party";
import type { PartyPlan } from "../src/plan/planner/party";
import type { World } from "../src/plan/planner/types";
import type { Character } from "../src/types/api";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
await loadAtlas();

const arg = (k: string): string | undefined => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const file = arg("--world") ?? `logs/world/${(await readdir("logs/world")).filter((f) => f.endsWith(".json")).sort().pop()}`;
const snap = arg("--snap") ? (JSON.parse(await readFile(arg("--snap")!, "utf8")) as { characters: Record<string, Character>; bankItems: World["bank"]; bankDetails?: { gold: number } }) : undefined;
const raw = (JSON.parse(await readFile(file, "utf8")) as { world: World }).world;
const chars = snap ? Object.values(snap.characters) : raw.characters;
// the bags into the bank: what any character carries is the pool's
const bags = new Map<string, number>();
for (const c of chars) for (const s of c.inventory ?? []) if (s.code) bags.set(s.code, (bags.get(s.code) ?? 0) + s.quantity);
const world: World = {
  ...raw, characters: chars, bank: bankPlus(snap?.bankItems ?? raw.bank, snap ? bags : new Map(Object.entries(raw.bags ?? {}))), bankGold: snap?.bankDetails?.gold ?? raw.bankGold,
  current: {}, blocked: {}, costs: {}, bags: undefined, bankSlots: undefined, nextExpansion: undefined, market: undefined,
  config: { ...DEFAULTS, ...raw.config, on: { ...DEFAULTS.on, ...raw.config.on } } as World["config"],
};
const BOSSES = (arg("--boss") ?? "lich,goblin_priestess,rosenblood,duskworm").split(",");
const PAIR = ["First", "Fifth"], TRIO = [...PAIR, "Second"], LEVELS = [35, 40, 45];
const TROUT = 225;
const lv = (n: string): number => world.characters.find((c) => c.name === n)!.level;
const at = (L: number): Record<string, number> => Object.fromEntries(TRIO.map((n) => [n, L]));
const stageAt = (L: number): string => stageOf({ ...world, characters: world.characters.map((c) => (TRIO.includes(c.name) ? { ...c, level: L } : c)) })?.name ?? "—";
const cell = (r: PartyPlan | undefined): string => (!r ? "—" : `${Math.round(r.p * 100)}%${r.admitted ? " ✓" : ""} · ${r.p > 0 ? `${Math.round(r.turns)} t · ${Math.ceil(r.hpPerWin / TROUT)} trout` : "—"}`);
const who = (r: PartyPlan | undefined): string => (r ? r.members.map((m) => `${m.name} ${m.level} ${m.as}${m.threat ? ` threat ${m.threat}` : ""}, ${Math.round(m.maxHp)} HP, loses ${Math.round(m.lost)}${r.p > 0 ? " a win" : " a fight"}${m.fell > 0.005 ? `, falls in ${Math.round(m.fell * 100)}% of wins` : ""}: ${m.codes.join(" ")}`).join("\n    ") : "");

console.log(`World ${new Date(world.now).toISOString()}${snap ? ` + live snapshot (${arg("--snap")})` : ""}; ${TRIO.map((n) => `${n} ${lv(n)}`).join(", ")}; the floor ${Math.round(((world.config.risk as { minWin?: number })?.minWin ?? 0.75) * 100)}%; stage now ${stageOf(world)?.name ?? "—"}, at ${LEVELS.map((L) => `${L}: ${stageAt(L)}`).join(", ")}`);
console.log("cell: win rate (✓ at the floor) · a won fight's turns (each member's cooldown 2 s a turn) · Cooked Trout a win burns\n");
console.log(`| boss | pair now | trio now | ${LEVELS.map((L) => `pair ${L} | trio ${L}`).join(" | ")} |`);
console.log(`|---|---|---|${LEVELS.map(() => "---|---").join("|")}|`);
const sets: string[] = [];
const t0 = Date.now();
for (const b of BOSSES) {
  const row: string[] = [];
  const pairNow = partyPlan(world, PAIR, b), trioNow = partyPlan(world, TRIO, b);
  row.push(cell(pairNow), cell(trioNow));
  sets.push(`${b}, now — pair: ${who(pairNow)}\n  trio:\n    ${who(trioNow)}`);
  for (const L of LEVELS) {
    const pr = partyPlan(world, PAIR, b, at(L)), tr = partyPlan(world, TRIO, b, at(L));
    row.push(cell(pr), cell(tr));
    sets.push(`${b}, all at ${L} — pair:\n    ${who(pr)}\n  trio:\n    ${who(tr)}`);
  }
  console.log(`| ${item(b) ? b : b.replace(/_/g, " ")} | ${row.join(" | ")} |`);
}
console.log(`\nThe lowest level of Second at which the trio passes where the pair does not (Second in the stage's pieces of its level):`);
console.log(`| boss | pair now (${PAIR.map(lv).join(", ")}) | ${LEVELS.map((L) => `pair at ${L}`).join(" | ")} |`);
console.log(`|---|---|${LEVELS.map(() => "---").join("|")}|`);
for (const b of BOSSES) {
  const out: string[] = [];
  for (const L of [0, ...LEVELS]) {
    const lv0 = L ? Object.fromEntries(PAIR.map((n) => [n, L])) : {};
    if (partyPlan(world, PAIR, b, lv0)?.admitted) { out.push("the pair passes"); continue; }
    const k = lowestThird(world, PAIR, "Second", b, lv0);
    out.push(k == null ? "none to 50" : String(k));
  }
  console.log(`| ${b} | ${out.join(" | ")} |`);
}
console.log(`\n(${Math.round((Date.now() - t0) / 1000)} s) The sets:\n${sets.join("\n")}`);
