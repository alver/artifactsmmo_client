// Task 027c: gathering tools by need (gear.ts work (c)) on made-up worlds of the core (pure, no harness), from the fixture of
// 11-21 — its five characters at their levels, the roles table of 027:
//   1. a holder with an iron tool, the steel one craftable and its materials banked → the need holds and the crafter makes it
//      (Second, a worker at weaponcrafting 20: its first tier, before its craft to 30); 1b. iron held, steel and gold both
//      craftable → the steel one (Alex: the lowest-level tool that improves and pays);
//   2. the tool dearer than what it saves → no need;
//   3. a fighter (no lane) → no tool;
//   4. two workers pinned to one lane → one copy (and with no pins, an event lane's extra gatherers ask for none);
//   5. the next gather step of the holder wears it;
//   1c. a worker hunts its own lane's tool's materials in a fight it is admitted to, not in one it is not (Alex);
//   6. task 027d (Alex): a tool ranks by its payback — on the World of 11-24 (scripts/fixtures/world-2026-11-24.json) at
//      fishing 20 with one Ogre Skin short, the skin's hunt is Third's first-tier pick over a fighter's need.
//   node --import tsx scripts/check-tools.mts
// On 00151c3 (G + H1 ≤ 0.85 × H0 over the lane's next gate, the highest cut, a fighter forging a fighter's piece only) cases
// 1, 1b, 1c and 4 fail (8 of 11; from iron to steel the ratio is 0.875), 2, 3 and 5 hold. On 9375a24 (027c: the bundle over
// G + H1) case 6 fails.
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { rank } from "../src/plan/planner/decide";
import { gearNeeds, gearPieces } from "../src/plan/planner/gear";
import { admitted } from "../src/plan/planner/reach";
import type { AccountAchievement, Character } from "../src/types/api";
import type { Step, World } from "../src/plan/planner/types";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();

const fixture = (JSON.parse(await readFile("scripts/fixtures/world-2026-11-21.json", "utf8")) as { world: World }).world;
const ROLES = {
  First: { role: "fighter" },
  Second: { role: "worker", craft: ["weaponcrafting"], gather: ["woodcutting"], fighterFrom: { skill: "weaponcrafting", level: 30 } },
  Third: { role: "worker", craft: ["gearcrafting", "cooking"], gather: ["alchemy", "fishing"] },
  Fourth: { role: "worker", craft: ["jewelrycrafting"], gather: ["mining", "woodcutting"] },
  Fifth: { role: "fighter" },
};
const ALL = ["First", "Second", "Third", "Fourth", "Fifth"];
const made = (code: string, points: number, type: string, target: string, total: number): AccountAchievement =>
  ({ code, name: code, description: "", points, completed_at: null, objectives: [{ type, target, total, progress: 0 }] }) as unknown as AccountAchievement;
/** The fixture with these achievements and this bank, every character on, the characters patched. */
function worldOf(achievements: AccountAchievement[], bank: Record<string, number>, patch: Record<string, Record<string, unknown>> = {}, roles: object = ROLES): World {
  return {
    ...fixture, achievements, current: {}, blocked: {}, bags: {}, bankSlots: undefined, nextExpansion: undefined, favors: undefined,
    bank: Object.entries(bank).map(([code, quantity]) => ({ code, quantity })),
    characters: fixture.characters.map((c) => ({ ...c, ...patch[c.name] }) as Character),
    config: { ...fixture.config, roles, on: Object.fromEntries(ALL.map((n) => [n, true])) } as unknown as World["config"],
  };
}
const said = (s: Step): string => `${s.target} (${s.work.kind}) — ${s.why.slice(0, 220)}`;
const toolNeeds = (w: World, code: string) => gearNeeds(w).needs.filter((n) => n.pieces.has(code));
const cases: [string, boolean, string][] = [];

// Fourth (mining 29, the lane's holder) wears an iron pickaxe; a mining road to 35 and an iron objective are open
const ROAD = [made("made_up_gold", 5, "gathering", "gold_ore", 100), made("made_up_iron", 5, "gathering", "iron_ore", 300)];
const MATS = { steel_bar: 7, pig_skin: 3, spider_leg: 3, astralyte_crystal: 2 }; // one Steel Pickaxe

// ── 1. the need holds and the crafter makes it ──────────────────────────────
{
  const w = worldOf(ROAD, MATS);
  const n = toolNeeds(w, "steel_pickaxe");
  const s = rank("Second", w).step;
  cases.push(["a holder with an iron tool, the steel one craftable and its materials banked → the need holds", n.length === 1 && n[0].for === "Fourth" && n[0].G <= n[0].H0 - n[0].H1, n.map((x) => `${x.for}: ${x.work}: H0 ${x.H0.toFixed(1)} h, H1 ${x.H1.toFixed(1)} h, G ${x.G.toFixed(2)} h`).join("; ") || "no need"]);
  cases.push(["…and the crafter (Second, weaponcrafting 20) makes it", s.target === "gear:steel_pickaxe", `Second: ${said(s)}`]);
}

// ── 1b. Alex: the lowest-level tool that improves on the one held and pays, not the highest cut ──────────────────
{
  // Second (woodcutting 34, weaponcrafting 30, kept a worker) holds an iron axe; the bank feeds a Steel Axe and a Gold Axe
  const wood = [made("made_up_dead", 5, "gathering", "dead_wood", 300), made("made_up_ash", 5, "gathering", "ash_wood", 1000)];
  const mats = { steel_bar: 7, ogre_eye: 4, flying_wing: 2, astralyte_crystal: 2, dead_wood_plank: 2, gold_bar: 7, ruby: 1, magical_cure: 2, red_cloth: 3 };
  const roles = { ...ROLES, Second: { role: "worker", craft: ["weaponcrafting"], gather: ["woodcutting"] } };
  const wcNeed = (held: string) => gearNeeds(worldOf(wood, { ...mats, [held]: 1 }, { Second: { woodcutting_level: 34, weaponcrafting_level: 30, weapon_slot: "" } }, roles)).needs.filter((x) => x.work.startsWith("woodcutting"));
  const say = (n: ReturnType<typeof wcNeed>) => n.map((x) => `${x.for}: ${[...x.pieces.keys()]}: ${x.work}: G ${x.G.toFixed(2)} h`).join("; ") || "no woodcutting tool need";
  const n = wcNeed("iron_axe"), g = wcNeed("steel_axe");
  cases.push(["iron held, steel and gold both craftable (and paying) → the steel one", n.length === 1 && n[0].pieces.has("steel_axe"), say(n)]);
  cases.push(["…and with the steel one held, the gold one", g.length === 1 && g[0].pieces.has("gold_axe"), say(g)]);
}

// ── 1c. Alex: a worker hunts its own lane's tool's materials, in a fight it is admitted to ──────────────────────
{
  // Third (fishing 20, the lane's holder, gearcrafting 30) and the fixture's bank less its ogre skins; the Steel Fishing Rod
  // lacks 3 Ogre Skins — an ogre the fighters are admitted to as well
  const fish = [made("made_up_trout", 5, "gathering", "trout", 300), made("made_up_bass", 5, "gathering", "bass", 300)];
  const bank = { ...Object.fromEntries(fixture.bank.filter((b) => b.code !== "ogre_skin").map((b) => [b.code, b.quantity])), steel_bar: 7, green_cloth: 3, astralyte_crystal: 2 };
  const third = { fishing_level: 20, gearcrafting_level: 30 };
  const s = rank("Third", worldOf(fish, bank, { Third: third })).step;
  cases.push(["a worker hunts the materials of its own lane's tool when it is admitted (a fighter is admitted too)", s.target === "src:ogre_skin" && s.work.kind === "kill" && s.why.startsWith("worker, a need"), `Third: ${said(s)}`]);
  const strip = Object.fromEntries(["weapon", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring1", "ring2", "amulet", "rune"].map((g) => [`${g}_slot`, ""]));
  const w0 = worldOf(fish, { steel_bar: 7, green_cloth: 3, astralyte_crystal: 2 }, { Third: { ...third, ...strip } });
  const s0 = rank("Third", w0).step, rod = toolNeeds(w0, "steel_fishing_rod").some((x) => x.for === "Third"), adm = admitted(w0.characters.find((c) => c.name === "Third")!, w0, "ogre");
  cases.push(["…and not when it is not admitted", rod && !adm && s0.target !== "src:ogre_skin", `Third stripped (rod need ${rod}, admitted to the ogre ${adm}): ${said(s0)}`]);
}

// ── 2. the tool dearer than what it saves ───────────────────────────────────
{
  const w = worldOf([made("made_up_copper", 1, "gathering", "copper_ore", 5)], {}); // a few minutes of mining, nothing banked
  const all = gearNeeds(w).needs.filter((x) => x.pieces.has("steel_pickaxe") || x.work.includes("(tool"));
  cases.push(["the tool dearer than what it saves → no need", !all.length, all.map((x) => `${x.for}: ${x.work}: G ${x.G.toFixed(2)} h`).join("; ") || "no tool need"]);
}

// ── 3. a fighter (no lane) → no tool ─────────────────────────────────────────
{
  const w = worldOf(ROAD, MATS);
  const f = gearNeeds(w).needs.filter((x) => (x.for === "First" || x.for === "Fifth") && x.work.includes("(tool"));
  cases.push(["a fighter (no lane) → no tool", !f.length, f.map((x) => `${x.for}: ${x.work}`).join("; ") || "none for First and Fifth"]);
}

// ── 4. one copy a lane holder ────────────────────────────────────────────────
{
  const both = { ...ROLES, Third: { ...ROLES.Third, gather: [...ROLES.Third.gather, "mining"] } }; // Third and Fourth pinned to mining
  const w = worldOf(ROAD, MATS, {}, both);
  const n = toolNeeds(w, "steel_pickaxe"), copies = [...(gearPieces(w).get("steel_pickaxe")?.copies.values() ?? [])].reduce((a, b) => a + b, 0);
  cases.push(["two workers pinned to one lane → one copy", n.length === 1 && copies === 1, `${n.map((x) => x.for).join(", ") || "nobody"}; ${copies} copies`]);
  // no pins: the Strange Apparition's ore makes mining an event lane — its second and third gatherer are no holders
  const ev = worldOf([...ROAD, made("made_up_strange", 5, "gathering", "strange_ore", 10)], MATS, {}, {});
  const ne = gearNeeds(ev).needs.filter((x) => x.work.startsWith("mining"));
  cases.push(["…and with no pins an event lane's extra gatherers ask for no copy", ne.length === 1, ne.map((x) => `${x.for}: ${[...x.pieces.keys()]}`).join("; ") || "no mining tool need"]);
}

// ── 5. the holder's next gather step wears it ────────────────────────────────
{
  const w = worldOf([made("made_up_iron", 5, "gathering", "iron_ore", 30)], { steel_pickaxe: 1, iron_pickaxe: 1 }, { Fourth: { jewelrycrafting_level: 30 } });
  const s = rank("Fourth", w).step;
  cases.push(["the holder's next gather step wears the tool", s.work.kind === "gather" && s.wear?.weapon === "steel_pickaxe", `Fourth: ${said(s)}; wears ${s.wear?.weapon ?? "nothing"}`]);
}

// ── 6. task 027d (Alex): a tool ranks by its payback ────────────────────────────
{
  // the World of 11-24, where 027c's road starts, as on that road's day 2: the Steel Pickaxe and Steel Axe made (day 0.04),
  // Third at fishing 20 wearing the Spruce Fishing Rod (the iron tier), the Steel Fishing Rod's materials banked but one
  // Ogre Skin — on 027c's road the skins ranked 12th of 12 in Third's first tier
  const live = (JSON.parse(await readFile("scripts/fixtures/world-2026-11-24.json", "utf8")) as { world: World }).world;
  const bank = new Map(live.bank.map((b) => [b.code, b.quantity]));
  for (const [c, q] of Object.entries(live.bags ?? {})) bank.set(c, (bank.get(c) ?? 0) + q);
  bank.set("ogre_skin", 2).set("astralyte_crystal", 2);
  const w: World = {
    ...live, bank: [...bank].map(([code, quantity]) => ({ code, quantity })), bags: {}, current: {}, blocked: {}, favors: undefined, bankSlots: undefined, nextExpansion: undefined,
    characters: live.characters.map((c) => ({ ...c, ...({ Third: { fishing_level: 20 }, Fourth: { weapon_slot: "steel_pickaxe" }, Second: { weapon_slot: "steel_axe" } } as Record<string, object>)[c.name] }) as Character),
    config: { ...live.config, roles: ROLES, on: Object.fromEntries(ALL.map((n) => [n, true])) } as unknown as World["config"],
  };
  const r = rank("Third", w), all = [...r.objectives, ...r.levels, ...r.supply];
  const skin = all.find((c) => c.target.key === "src:ogre_skin");
  const other = all.filter((c) => c.need && c !== skin && c.step.parent !== skin?.step.parent).sort((a, b) => b.fit - a.fit || b.any - a.any)[0];
  const sc = (c: typeof skin) => (c ? `${c.target.key} fit ${c.fit.toExponential(2)} any ${c.any.toExponential(2)} (${c.step.why.slice(0, 110)})` : "none");
  cases.push(["fishing 20, an iron rod, one Ogre Skin short → the skin's hunt is the worker's first-tier pick (the rod ranked by its payback)", r.step.target === "src:ogre_skin", `Third: ${said(r.step)}; the skin: ${sc(skin)}; the best other need: ${sc(other)}`]);
}

let bad = 0;
for (const [why, ok, detail] of cases) {
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${why}\n       ${detail}`);
}
console.log(bad ? `FAILED (${bad} of ${cases.length})` : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
