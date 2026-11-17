// Self-check: the roadmap milestones + next steps + fleet analysis over a saved fleet snapshot
// (scripts/fixtures/roadmap-fleet.json, the fleet on 2026-11-17: combat 20–21, weaponcrafting 20,
// jewelrycrafting 20, gearcrafting 17, no steel gear yet). Pass -v to print every milestone.
//   node --import tsx --experimental-webstorage --localstorage-file=/tmp/x.db --disable-warning=ExperimentalWarning scripts/check-roadmap.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { atlas } from "../src/catalog/atlas";
import { coinDemand, nextSteps, roadmap } from "../src/plan/roadmap";
import { analyzeFleet } from "../src/plan/fleetcheck";
import type { BankItem, Character } from "../src/types/api";

setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
const a = atlas();
if (!a) { console.log("no public/data/atlas.json — run npm run atlas"); process.exit(1); }
const fx = JSON.parse(await readFile("scripts/fixtures/roadmap-fleet.json", "utf8")) as { characters: Character[]; bankItems: BankItem[]; skillPins: Record<string, string[]> };
const inp = { characters: fx.characters, bank: fx.bankItems, pins: fx.skillPins, achievements: null, atlas: a };

let t = Date.now();
const ms = roadmap(inp);
const msTime = Date.now() - t;
const steps = nextSteps(ms, fx.characters.map((c) => c.name));
const byId = new Map(ms.map((m) => [m.id, m]));
const charDone = (id: string, name: string) => byId.get(id)?.chars?.[name]?.done;
const acctDone = (id: string) => byId.get(id)?.account?.done;

if (process.argv.includes("-v")) {
  for (const m of ms) {
    const st = m.account ? `${m.account.done} ${m.account.detail}` : Object.entries(m.chars ?? {}).map(([n, c]) => `${n}:${c.done ? "✓" : Math.round(c.progress * 100) + "%"}`).join(" ");
    console.log(`[${a.bands[m.band].a}] ${m.id} — ${st}`);
  }
  console.log("fleet next:", steps.fleet.map((s) => `${s.title} (${s.hours?.toFixed(1)} h)`));
  for (const [n, s] of Object.entries(steps.chars)) console.log(n, "next:", s.map((x) => `${x.title}: ${x.detail}`));
}

t = Date.now();
const an = analyzeFleet(fx.characters, fx.bankItems, a);
const anTime = Date.now() - t;
if (process.argv.includes("-v")) {
  for (const c of an.chars) console.log(c.name, c.target, "worn", c.worn, "bank", c.bank.killSec, c.bank.win, "atlas", c.atlas.killSec, "swap", c.swap);
  for (const x of an.items) console.log(x.code, x.have, x.blockers.join(" · "));
}
const demand = coinDemand(inp);
console.log(`roadmap ${ms.length} milestones in ${msTime} ms · analysis ${anTime} ms · coin demand ${demand}`);

const all = fx.characters.map((c) => c.name);
const cases: [string, boolean][] = [
  ["everyone has combat 20", all.every((n) => charDone("combat-20", n) === true)],
  ["nobody has combat 25", all.every((n) => charDone("combat-25", n) === false)],
  ["weaponcrafting 20 is done (Second)", acctDone("skill-weaponcrafting-20") === true],
  ["gearcrafting 20 is open (Third 17)", acctDone("skill-gearcrafting-20") === false],
  ["nobody wears the Lv 20 set yet", all.every((n) => charDone("gear-20", n) === false)],
  ["the Lv 15 set is ticked for the jacket wearers", ["Third", "Fourth", "Fifth"].every((n) => charDone("gear-15", n) === true)],
  ["…and not for the two in adventurer vests (3 jackets owned)", ["First", "Second"].every((n) => charDone("gear-15", n) === false)],
  ["an iron pickaxe holder needs no copper pickaxe", charDone("tool-copper_pickaxe", "Fourth") === true],
  ["the fleet can order steel battleaxes today", byId.get("stock-20")?.account?.actions?.some((x) => x.kind === "hive" && x.goal.kind === "craft-order" && x.goal.targets.some((t) => t.code === "steel_battleaxe")) === true],
  ["achievements unknown without a load", acctDone("ach-novice") === null],
  ["a steel pickaxe milestone for the mining pins", Object.keys(byId.get("tool-steel_pickaxe")?.chars ?? {}).sort().join() === "Fourth,Third"],
  ["the fleet's next steps include gearcrafting 20", steps.fleet.some((s) => s.milestone === "skill-gearcrafting-20")],
  ["every character has a next step", all.every((n) => (steps.chars[n] ?? []).length > 0)],
  ["coin demand is a finite positive number", Number.isFinite(demand) && demand > 0],
  ["the analysis has a target per character", an.chars.length === all.length && an.chars.every((c) => !!c.target)],
  ["the analysis runs in a few seconds", anTime < 15000],
];
let bad = 0;
for (const [why, ok] of cases) if (!ok) { bad++; console.log(`MISMATCH ${why}`); }
console.log(bad ? "FAILED" : `OK (${cases.length} checks)`);
process.exit(bad ? 1 : 0);
