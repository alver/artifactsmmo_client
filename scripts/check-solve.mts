// Task 021, settled points 3 and 9: the fight solve is right (src/plan/bis.ts bestInSlot).
// 1. Every character of two snapshots (scripts/fixtures/world-2026-11-20.json and world-2026-11-21.json, a copy of
//    logs/world/2026-11-21.json; their bags banked, as road.ts plays them) against every monster of the catalog, solved with
//    fightRec's options (reach.ts fightOptions: its pool, its price, the set worn not read) at caps 3/3, 6/6 and 12/10:
//    - every answer is a fixpoint: no change of one slot (the weapon too, among unarmed and its candidates) and no change of
//      one group (the ring pair, the artifacts, the utility pair, among the group's fillings) scores higher;
//    - nested: 6/6 never scores below 3/3, 12/10 never below 6/6.
// 2. The sample: 45 fights with the tier (safe, win, lost) of the best set known at each caps — found once for report 021
//    by a far dearer search (every set where the options' product is under two million, else the best of 400 random starts
//    climbed to a fixpoint); the answer must be safe where that set is safe and win where it wins. The wall World's fights
//    and Third of 11-22 come from scripts/fixtures/solve-sample.json (the character, the pool and the potion prices
//    fightRec solved with); the highwayman of the replay rows' first decisions from the World check-planner starts from.
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { catalog, loadCatalog, monster as monsterOf } from "../src/catalog";
import { ARTIFACT_SLOTS, RING_SLOTS, SINGLE_SLOTS, UTILITY_SLOTS, bestInSlot, bisPools, MIN_WIN, groupCombos, makeEvaluator } from "../src/plan/bis";
import type { BisOptions } from "../src/plan/bis";
import { DEFAULTS } from "../src/plan/planner/config";
import { bankPlus } from "../src/plan/planner/forward";
import { fightOptions } from "../src/plan/planner/reach";
import { baseStats } from "../src/sim/stats";
import { GEAR_SLOTS, slotCode } from "../src/types/api";
import type { Character, GearSlot } from "../src/types/api";
import type { GearRecommendation } from "../src/plan/types";
import type { World } from "../src/plan/planner/types";

setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
const t0 = performance.now();
const VERBOSE = process.env.AMMO_CHECK_VERBOSE === "1";
const CAPS: [number, number][] = [[3, 3], [6, 6], [12, 10]];
const TIER: Record<string, number> = { lost: 0, win: 1, safe: 2 };
// Task 025: the top tier is "admitted" — the rolled win rate p at least the floor (bis.ts MIN_WIN); the table keeps the
// label "safe": a set known safe (its pessimistic pass wins) has p = 1, so wherever it stands an admitted set exists.
const tierOf = (r: GearRecommendation | undefined): string => (!r ? "lost" : r.forecast.win && !r.forecast.timedOut && r.p >= MIN_WIN ? "safe" : r.forecast.win && !r.forecast.timedOut ? "win" : "lost");
let failed = 0;
const fail = (what: string): void => { failed++; if (failed <= 20) console.log(`FAIL ${what}`); };

/** The first move that scores higher than the answer (undefined: a fixpoint) — the same moves the search makes. */
function improving(ch: Character, monster: string, opts: BisOptions, r: GearRecommendation): string | undefined {
  const m = monsterOf(monster)!;
  const pools = bisPools(ch, m, opts);
  const worn: Partial<Record<GearSlot, string>> = {};
  if (opts.worn !== false) for (const g of GEAR_SLOTS) worn[g] = slotCode(ch, g);
  const score = ((ev) => (s: Record<GearSlot, string>) => ev(s).score)(makeEvaluator(baseStats(ch), m, worn, opts.potionPrice, opts.minWin, opts.wayBack));
  const at = score(r.slots);
  if (at !== r.score) return `the answer scores ${at}, not ${r.score}`;
  const singles: [GearSlot, string[]][] = [["weapon", [...new Set(["", ...pools.weapon, ...(worn.weapon ? [worn.weapon] : [])])]], ...SINGLE_SLOTS.map((s): [GearSlot, string[]] => [s, ["", ...pools[s]]])];
  for (const [s, options] of singles) for (const o of options) if (o !== r.slots[s] && score({ ...r.slots, [s]: o }) > at) return `${s}: ${r.slots[s] || "-"} → ${o || "-"}`;
  const countOf = (code: string): number => opts.ownedQty?.get(code) ?? 3;
  const groups: [GearSlot[], string[][]][] = [[RING_SLOTS, groupCombos(pools.ring1, 2, countOf)], [ARTIFACT_SLOTS, groupCombos(pools.artifact1, 3)], ...(opts.noUtilities ? [] : [[UTILITY_SLOTS, groupCombos(pools.utility1, 2)] as [GearSlot[], string[][]]])];
  for (const [g, combos] of groups) for (const c of combos) {
    const t = { ...r.slots };
    for (let i = 0; i < g.length; i++) t[g[i]] = c[i] ?? "";
    if (score(t) > at) return `${g[0]}…: ${g.map((x) => r.slots[x] || "-").join(",")} → ${g.map((x) => t[x] || "-").join(",")}`;
  }
  return undefined;
}

/** A snapshot's World as road.ts plays it: the bags banked. */
const played = (w: World): World => ({ ...w, bank: bankPlus(w.bank, new Map(Object.entries(w.bags ?? {}))), bags: undefined, bankSlots: undefined, nextExpansion: undefined });
const snapshot = async (file: string): Promise<World> => played((JSON.parse(await readFile(file, "utf8")) as { world: World }).world);

// ── 1. every character × every monster of two snapshots, three caps: a fixpoint, nested ─────────────────────────────
let solves = 0, fixpoints = 0, nested = 0;
const monsters = [...catalog().monsters.keys()];
for (const file of ["scripts/fixtures/world-2026-11-20.json", "scripts/fixtures/world-2026-11-21.json"]) {
  const world = await snapshot(file);
  for (const ch of world.characters) {
    const opts = fightOptions(ch, world);
    for (const m of monsters) {
      const rs = CAPS.map(([s, w]) => ({ s, w, r: bestInSlot(ch, m, { ...opts, perSlotCap: s, weaponCap: w })[0] }));
      for (const { s, w, r } of rs) {
        solves++;
        if (!r) { fail(`${file} ${ch.name} ${m} ${s}/${w}: no answer`); continue; }
        const why = improving(ch, m, { ...opts, perSlotCap: s, weaponCap: w }, r);
        if (why) fail(`${file} ${ch.name} ${m} ${s}/${w}: not a fixpoint — ${why}`);
        else fixpoints++;
      }
      for (let i = 1; i < rs.length; i++) {
        const a = rs[i - 1].r, b = rs[i].r;
        if (a && b && b.score < a.score) fail(`${file} ${ch.name} ${m}: ${rs[i].s}/${rs[i].w} scores ${b.score} below ${rs[i - 1].s}/${rs[i - 1].w}'s ${a.score}`);
        else nested++;
      }
    }
  }
}
console.log(`${failed ? "FAIL" : "ok  "} every answer a fixpoint, the caps nested — ${solves} solves (two snapshots, ${monsters.length} monsters, three caps): ${fixpoints} fixpoints, ${nested} of ${(solves / 3) * 2} pairs nested`);

// ── 2. the sample: the tier of the best set known ──────────────────────────────────────────────────────────────────
// [where, who, monster, the best known's tiers at 3/3 6/6 12/10] — report 021, section 2
const SAMPLE: [string, string, string, string][] = [
  ["wall", "First", "cyclops", "win win win"],
  ["wall", "First", "death_knight", "win win win"],
  ["wall", "First", "owlbear", "win win win"],
  ["wall", "First", "demon", "win win win"],
  ["wall", "First", "cultist_acolyte", "lost lost lost"], // task 027: won only on the summed restores (40/40 finds no win)
  ["wall", "First", "cursed_tree", "lost lost lost"],
  ["wall", "First", "goblin", "lost lost lost"],
  ["wall", "First", "orc", "lost lost lost"],
  ["wall", "Second", "cyclops", "win win win"],
  ["wall", "Second", "death_knight", "win safe safe"],
  ["wall", "Second", "owlbear", "win safe safe"],
  ["wall", "Second", "demon", "win win win"],
  ["wall", "Second", "cultist_acolyte", "lost win win"],
  ["wall", "Second", "cursed_tree", "lost win win"],
  ["wall", "Second", "goblin", "lost win win"],
  ["wall", "Second", "orc", "lost lost lost"],
  ["wall", "Third", "cyclops", "win win win"],
  ["wall", "Third", "death_knight", "win win win"],
  ["wall", "Third", "owlbear", "win win win"],
  ["wall", "Third", "demon", "win win win"],
  ["wall", "Third", "cultist_acolyte", "lost lost lost"], // task 027: won only on the summed restores (40/40 finds no win)
  ["wall", "Third", "cursed_tree", "lost lost lost"],
  ["wall", "Third", "goblin", "lost lost lost"],
  ["wall", "Third", "orc", "lost lost lost"],
  ["wall", "Fourth", "cyclops", "win win win"],
  ["wall", "Fourth", "death_knight", "win win win"],
  ["wall", "Fourth", "owlbear", "win win win"],
  ["wall", "Fourth", "demon", "win win win"],
  ["wall", "Fourth", "cultist_acolyte", "lost lost lost"], // task 027: won only on the summed restores (40/40 finds no win)
  ["wall", "Fourth", "cursed_tree", "lost lost lost"],
  ["wall", "Fourth", "goblin", "lost lost lost"],
  ["wall", "Fourth", "orc", "lost lost lost"],
  ["wall", "Fifth", "cyclops", "win win win"],
  ["wall", "Fifth", "death_knight", "win win win"],
  ["wall", "Fifth", "owlbear", "win win win"],
  ["wall", "Fifth", "demon", "win win win"],
  ["wall", "Fifth", "cultist_acolyte", "lost lost lost"], // task 027: won only on the summed restores (40/40 finds no win)
  ["wall", "Fifth", "cursed_tree", "lost lost lost"],
  ["wall", "Fifth", "goblin", "lost lost lost"],
  ["wall", "Fifth", "orc", "lost lost lost"],
  ["rows", "Second", "highwayman", "safe safe safe"],
  ["third22", "Third", "ogre", "win safe safe"],
  ["third22", "Third", "bandit_lizard", "win win win"],
  ["w20", "Second", "vampire", "win win win"],
  // task 027g (C): the solve reads Fourth's worn Novice Guide — with it the best set known (p 0.20 without) loses at turn 21
  ["w20", "Fourth", "vampire", "lost lost lost"],
];
interface Entry { character: Character; pool: Record<string, number>; prices: Record<string, number> }
const fx = JSON.parse(await readFile("scripts/fixtures/solve-sample.json", "utf8")) as { wall: { fighters: Record<string, Entry> }; third22: Entry };
const fromEntry = (e: Entry): { ch: Character; opts: BisOptions } => {
  const qty = new Map(Object.entries(e.pool));
  return { ch: e.character, opts: { owned: new Set(qty.keys()), ownedQty: qty, includeCraftable: false, extraCandidates: [], potionPrice: (c) => e.prices[c] ?? Infinity, worn: false } };
};
const w20 = await snapshot("scripts/fixtures/world-2026-11-20.json");
// the World the replay rows start from (scripts/check-planner.mts `base`): the snapshot of 2026-11-18 13:34 UTC
const snap = async (n: string): Promise<any> => JSON.parse(await readFile(`docs/design/snapshot/${n}.json`, "utf8")).data;
const chars = (await snap("characters")) as Character[];
const rows: World = { now: Date.parse((await snap("status")).server_time), characters: chars, bank: (JSON.parse(await readFile("scripts/fixtures/roadmap-fleet.json", "utf8")) as { bankItems: World["bank"] }).bankItems, bankGold: 155_976, achievements: await snap("achievements"), events: [], current: {}, costs: {}, blocked: {}, config: { ...DEFAULTS, on: Object.fromEntries(chars.map((c) => [c.name, true])) } };
const live = (w: World, who: string) => { const ch = w.characters.find((c) => c.name === who)!; return { ch, opts: fightOptions(ch, w) }; };
let atTier = 0, above = 0;
const sampleFails = failed;
for (const [where, who, m, tiers] of SAMPLE) {
  const { ch, opts } = where === "wall" ? fromEntry(fx.wall.fighters[who]) : where === "third22" ? fromEntry(fx.third22) : live(where === "w20" ? w20 : rows, who);
  const want = tiers.split(" ");
  CAPS.forEach(([s, w], i) => {
    const got = tierOf(bestInSlot(ch, m, { ...opts, perSlotCap: s, weaponCap: w })[0]);
    if (TIER[got] < TIER[want[i]]) fail(`sample ${where} ${who} ${m} ${s}/${w}: ${got}, the best set known is ${want[i]}`);
    else { atTier++; if (TIER[got] > TIER[want[i]]) above++; }
    if (VERBOSE) console.log(`  ${where.padEnd(7)} ${who.padEnd(6)} ${m.padEnd(16)} ${s}/${w}: ${got} (best known ${want[i]})`);
  });
}
console.log(`${failed > sampleFails ? "FAIL" : "ok  "} the sample at the tier of the best set known — ${SAMPLE.length} fights × 3 caps: ${atTier} of ${SAMPLE.length * 3}${above ? `, ${above} above it (a new best known)` : ""}`);

const sec = (performance.now() - t0) / 1000;
console.log(failed ? `FAIL — ${failed} check(s)` : `ok — the fight solve: ${solves} solves a fixpoint and nested, ${SAMPLE.length} sample fights at their tier, ${sec.toFixed(1)} s`);
process.exit(failed ? 1 : 0);
