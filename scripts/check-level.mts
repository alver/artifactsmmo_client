// Task 027e: level first — a fighter levels, the workers serve its road; the wall at 45. Made-up worlds of the core (pure,
// no harness) from the fixture of 11-21 — its five characters, its bank, the roles of 027:
//   1. a fighter's order: a ranked kill objective and an admitted XP fight → the XP pick; the objective's monster within
//      25% of the pick's rate → that monster; a config.first achievement → first; a need's kill → before the pick; no
//      admitted XP fight → today's rule; at the level cap → today's rule;
//   2. a worker: a need of a kill objective is not its first tier, a need of a fighter's road is; its craft target follows
//      the highest fighter (26 → 30, 30 → 35, 36 → 40);
//   3. the sliver: the kill step stands without that potion; a potion-only XP fight → the potion is a first-tier need;
//   4. a walled road: the need's score is finite; a candidate dropped for its score is said (the why, so the journal).
//   node --import tsx scripts/check-level.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { rank } from "../src/plan/planner/decide";
import { gearNeeds } from "../src/plan/planner/gear";
import { consParents, consumableNeeds, gearWorld, noStock } from "../src/plan/planner/consumables";
import { supplyNeeds } from "../src/plan/planner/supply";
import { pickMonster } from "../src/plan/planner/pick";
import { admitted, fightRec } from "../src/plan/planner/reach";
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
type Patch = Record<string, Record<string, unknown>>;
/** Task 029: Third's and Fourth's crafts at their target (30), so no training is a need of these worlds unless a case lowers them
 *  — 027e's order alone (Second keeps the fixture's weaponcrafting: at 30 it is a fighter here). */
const AT_TARGET: Patch = { Third: { gearcrafting_level: 30 }, Fourth: { jewelrycrafting_level: 30 } };
/** The fixture with these achievements, every character on, the characters patched, the bank replaced when given. */
function worldOf(achievements: AccountAchievement[], patch: Patch = {}, bank?: Record<string, number>, config: object = {}): World {
  return {
    ...fixture, achievements, current: {}, blocked: {}, bags: {}, bankSlots: undefined, nextExpansion: undefined, favors: undefined,
    bank: bank ? Object.entries(bank).map(([code, quantity]) => ({ code, quantity })) : fixture.bank,
    characters: fixture.characters.map((c) => ({ ...c, ...AT_TARGET[c.name], ...patch[c.name] }) as Character),
    config: { ...fixture.config, roles: ROLES, on: Object.fromEntries(ALL.map((n) => [n, true])), ...config } as unknown as World["config"],
  };
}
const withBank = (codes: Record<string, number>): Record<string, number> => ({ ...Object.fromEntries(fixture.bank.map((b) => [b.code, b.quantity])), ...codes });
const step = (w: World, name: string): Step => rank(name, w).step;
const said = (s: Step): string => `${s.target} (${s.work.kind}${s.work.kind === "kill" ? ` ${s.work.monster}` : ""}) — ${s.why.slice(0, 170)}`;
const monsterOf = (s: Step): string | undefined => (s.work.kind === "kill" ? s.work.monster : undefined);
const cases: [string, boolean, string][] = [];
const LEVEL = made("made_up_level", 5, "combat_level", "", 30); // a combat gate: the fighters' road has points behind it

// ── 1. a fighter's order ─────────────────────────────────────────────────────
{
  // (a) a ranked kill objective on a monster outside 25% of the pick's rate (the highwayman) → the XP pick
  const w = worldOf([LEVEL, made("made_up_kill", 10, "combat_kill", "highwayman", 200)]);
  const first = w.characters.find((c) => c.name === "First")!;
  const r = rank("First", w), obj = r.objectives.find((c) => c.target.key === "ach:made_up_kill:0");
  const pick = pickMonster(first, w, new Set(["highwayman"]));
  cases.push(["a fighter with a ranked kill objective and an admitted XP fight → the XP pick", !!obj && obj.any > 0 && !!pick && pick.monster !== "highwayman" && monsterOf(r.step) === pick.monster && r.step.why.startsWith("fighter: the XP pick"), `objective ranked ${obj ? obj.any.toPrecision(3) : "no"}; pick ${pick?.monster}; First: ${said(r.step)}`]);
  // (b) the objective's monster within 25% of the pick's rate (the pig against the skeleton) → that monster, as the XP pick
  const wp = worldOf([LEVEL, made("made_up_pigs", 10, "combat_kill", "pig", 200)]);
  const p0 = pickMonster(first, wp, new Set()), pb = pickMonster(first, wp, new Set(["pig"]));
  const sp = step(wp, "First");
  cases.push(["…the objective's monster within 25% of the pick's rate → that monster", !!p0 && p0.monster !== "pig" && pb?.monster === "pig" && monsterOf(sp) === "pig" && sp.why.startsWith("fighter: the XP pick"), `pick ${p0?.monster} ${p0 ? (p0.xp / p0.sec).toFixed(3) : ""} XP/s, with the ×1.25 ${pb?.monster}; First: ${said(sp)}`]);
  // (c) a config.first achievement → first
  const wf = worldOf([LEVEL, made("made_up_kill", 10, "combat_kill", "highwayman", 200)], {}, undefined, { first: ["made_up_kill"] });
  const sf = step(wf, "First");
  cases.push(["…a config.first achievement → first", sf.target === "ach:made_up_kill:0" && sf.why.startsWith("fighter, first"), `First: ${said(sf)}`]);
  // (d) a need's kill → before the pick: First and Fifth unarmed, the bank empty — the fighters' Battlestaff (gear work (a));
  // Second a fighter at weaponcrafting 30 hunts its kill materials before its XP pick and before a kill objective of 50 points
  const unarmed: Patch = { First: { weapon_slot: "" }, Fifth: { weapon_slot: "" }, Second: { weaponcrafting_level: 30 } };
  const wn = worldOf([LEVEL, made("made_up_kill", 50, "combat_kill", "highwayman", 200)], unarmed, {});
  const sn = step(wn, "Second");
  // task 027g (A.2): the Battlestaff's slimeballs are Fourth's now (a worker admitted for them) — Second takes a road kill no
  // worker is admitted to
  cases.push(["…a need's kill (a src: kill no worker is admitted to, for the fighters' road) → before the pick and a 50-point kill objective", sn.work.kind === "kill" && sn.target.startsWith("src:") && sn.why.startsWith("fighter, a need's kill"), `Second: ${said(sn)}`]);
  // (e) no admitted fight that gives XP (First stripped, the bank empty) → today's rule (027b's free pass)
  const strip = Object.fromEntries(["weapon", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring1", "ring2", "amulet", "rune", "utility1", "utility2"].map((g) => [`${g}_slot`, ""]));
  const se = step(worldOf([made("made_up_ore", 10, "gathering", "copper_ore", 100)], { First: strip }, {}), "First");
  cases.push(["…no admitted XP fight → today's rule over the whole list", se.target === "ach:made_up_ore:0" && se.why.startsWith("fighter, no fight admitted"), `First stripped: ${said(se)}`]);
  // (f) at the game's level cap (50) → today's rule over the whole list, kill objectives included
  const sc = step(worldOf([made("made_up_ore", 10, "gathering", "copper_ore", 100), made("made_up_kill", 10, "combat_kill", "highwayman", 200)], { First: { level: 50 } }), "First");
  cases.push(["…at the level cap → today's rule over the whole list", sc.why.startsWith("fighter, at the level cap"), `First at 50: ${said(sc)}`]);
}

// ── 2. a worker's order ──────────────────────────────────────────────────────
{
  // (a) a kill objective nobody is admitted to on the gear alone (the vampire): its potion is a need (consumables.ts work
  // (b)), not the alchemist's first tier — Third levels its craft instead
  const w = worldOf([made("made_up_vampires", 5, "combat_kill", "vampire", 200)]);
  const need = consumableNeeds(w, "Third").find((n) => n.workKey === "ach:made_up_vampires:0");
  const s = step(w, "Third");
  cases.push(["a worker: a need of a kill objective (its potion) is not its first tier", !!need && !s.why.startsWith("worker, a need"), `need ${need ? `${need.code} for ${need.work}` : "none"}; Third: ${said(s)}`]);
  // (b) a need of a fighter's road is: the unarmed fighters' Battlestaff (gear work (a); Second, its smith, at weaponcrafting
  // 30), Fourth gathers for it
  const wr = worldOf([LEVEL], { First: { weapon_slot: "" }, Fifth: { weapon_slot: "" }, Second: { weaponcrafting_level: 30 } }, {});
  const road = gearNeeds(wr, "Fourth").needs.some((n) => n.key.startsWith("lvl:combat:") && n.pieces.has("battlestaff"));
  const sr = step(wr, "Fourth");
  cases.push(["…a need of a fighter's road (the Battlestaff of gear work (a)) is", road && sr.parent === "gear:battlestaff" && sr.why.startsWith("worker, a need"), `road need ${road}; Fourth: ${said(sr)}`]);
  // (c) the gear craft follows the highest fighter: 26 → 30, 30 → 35, 36 → 40 (no achievement: no need goes first)
  for (const [top, gc, to] of [[26, 22, 30], [30, 30, 35], [36, 30, 40]]) {
    const sc = step(worldOf([], { First: { level: top }, Third: { gearcrafting_level: gc } }), "Third");
    cases.push([`…its craft target follows the highest fighter: ${top} → ${to}`, sc.target === `lvl:gearcrafting:${to}` && sc.work.kind === "train" && sc.why.startsWith(`worker, craft to ${to}`), `First ${top}, Third gearcrafting ${gc}: ${said(sc)}`]);
  }
}

// ── 3. the sliver ────────────────────────────────────────────────────────────
{
  // (a) First, its worn stacks banked, 10,000 sunflowers in the bank (a Small Health Potion costs about its craft): at the
  // ogre its set drinks Small Health Potions; the bank holds 20 (two kills of a chunk) — the kill step stands, with the set
  // without that potion (Minor Health Potions, 205 held), admitted (100 points, Fifth off: no better work holds the 20 back)
  const noStacks = { utility1_slot: "", utility1_slot_quantity: 0, utility2_slot: "", utility2_slot_quantity: 0 };
  const w = worldOf([made("made_up_ogres", 100, "combat_kill", "ogre", 200)], { First: noStacks }, withBank({ sunflower: 10_000, small_health_potion: 20 }), { on: { First: true, Second: true, Third: true, Fourth: true } });
  const first0 = w.characters.find((c) => c.name === "First")!;
  const named = Object.keys(fightRec(first0, w, "ogre")?.forecast.used ?? {}).includes("small_health_potion");
  const c = rank("First", w).objectives.find((x) => x.target.key === "ach:made_up_ogres:0");
  cases.push(["the sliver: the kill step stands without that potion, where the set without it is admitted", named && admitted(first0, noStock(w, ["small_health_potion"]), "ogre") && !!c && !c.step.withdraw?.small_health_potion && c.step.units > 2, `the set names Small Health Potion ${named}; First's objective: ${c ? `${c.step.units} kills, withdraw ${JSON.stringify(c.step.withdraw ?? {})}` : "no candidate"}`]);
  // (b) First at 31: its XP pick (the vampire) is admitted only with Minor Health Potions, the bank holds 12 → a potion of
  // that fight (the one its chain prices best) is a need of the road, in the alchemist's first tier
  const wp = worldOf([made("made_up_level", 5, "combat_level", "", 40)], { First: { level: 31 } }, withBank({ minor_health_potion: 12 }));
  const first = wp.characters.find((x) => x.name === "First")!;
  const pick = pickMonster(first, wp, new Set()), bare = pickMonster(first, gearWorld(wp), new Set());
  const need = consumableNeeds(wp, "Third").find((n) => n.monster === "vampire" && n.workKey.startsWith("lvl:combat:") && n.for.includes("First"));
  // its leaves are the alchemist's first tier, though an event's reserve shares them and names them (supply.ts `via`)
  const par = need && consParents(wp, "Third").find((p) => p.key === need.key);
  const keys = par ? supplyNeeds(wp, "Third", [par], () => 0).map((x) => x.key) : [];
  const leaves = rank("Third", wp).supply.filter((c) => keys.includes(c.target.key));
  cases.push(["…a potion-only XP fight → the potion is a need of the road, a worker's first tier", pick?.monster === "vampire" && !bare && !!need && Number.isFinite(need.any) && need.any > 0 && leaves.length > 0 && leaves.every((c) => c.need), `pick ${pick?.monster}, bare ${bare?.monster ?? "none"}; need ${need ? `${need.key}, any ${need.any.toPrecision(3)}` : "none"}; Third's leaves: ${leaves.map((c) => `${c.target.key} (parent ${c.step.parent}, first tier ${!!c.need})`).join(", ") || "none"}`]);
}

// ── 4. a walled road ─────────────────────────────────────────────────────────
{
  // First at 35 on the fixture's gear: its road to combat 50 walls inside the ten levels gear work (a) judges — the need
  // scored 0 × ∞ (NaN) and was dropped without a word (report 027c, part C)
  const w = worldOf([made("made_up_level", 5, "combat_level", "", 50)], { First: { level: 35 } });
  const n = gearNeeds(w, "First").needs.find((x) => x.for === "First" && x.key.startsWith("lvl:combat:"));
  cases.push(["a walled road: the need's score is finite", !!n && Number.isFinite(n.fit) && Number.isFinite(n.any) && n.any > 0, n ? `${[...n.pieces.keys()].join(", ")}: H0 ${n.H0}, H1 ${n.H1.toFixed(1)}, fit ${n.fit}, any ${n.any}` : "no need"]);
  // a candidate whose score is 0 (an objective of no points) is dropped by every tier — and the step's why says so
  const s = step(worldOf([made("made_up_zero", 0, "gathering", "sunflower", 100)]), "Third");
  cases.push(["…a candidate dropped for its score is said (the step's why, so the journal)", s.why.includes("dropped for its score: ach:made_up_zero:0 (0)"), `Third: ${s.why.slice(-160)}`]);
}

let bad = 0;
for (const [why, ok, detail] of cases) {
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${why}\n       ${detail}`);
}
console.log(bad ? `FAILED (${bad} of ${cases.length})` : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
