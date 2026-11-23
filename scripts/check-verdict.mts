// Task 025, settled points 2, 4, 5 and 10: the verdict on made-up fights of the core (pure, no harness).
//   1. the floor: a fight is admitted at its rolled win rate p ≥ config.risk.minWin (0.75), refused below — the same set
//      admitted at the floor 0.7 and refused at 0.75; a fight the pessimistic pass loses (the old "not safe") admitted at p
//      0.98; a set at p 0.8 admitted, one at p 0.7 refused;
//   2. the price of a kill with a loss in it, by hand against the function (reach.ts winSecOf): (p × a won attempt +
//      (1 − p) × a lost one) ÷ p, a lost one walking back from (0, 0) and resting from 1 HP;
//   3. a loss behind a toll: the way back's fare in the price, and a fight refused when the gold budget cannot pay the fares
//      its losses ask (reach.ts strands);
//   4. a potion at its chain's price: no stocked potion where resting is cheaper, one where it lifts p over the floor;
//   5. the healing rune: bought where it pays, not past Alex's 50,000 gold, not below the gold the floor and a due
//      expansion need (consumables.ts runePays), and the forward model's purchase (runeBought);
//   6. food at its chain: a step takes the food where eating beats resting (consumables.ts fightTake) — trout for a big loss.
//   node --import tsx scripts/check-verdict.mts
// On 0f94809 (the safe rule, stocked potions free, no rune) cases 1, 2, 4 and 5 fail; they read the old names where the new
// ones are missing so that the red run runs.
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import * as reach from "../src/plan/planner/reach";
import * as cons from "../src/plan/planner/consumables";
import { applyGear, baseStats } from "../src/sim/stats";
import { simulate } from "../src/sim/combat";
import { restSeconds } from "../src/sim/cost";
import { fightSec } from "../src/plan/xp";
import { killLog } from "../src/plan/planner/config";
import { GEAR_SLOTS } from "../src/types/api";
import type { Character } from "../src/types/api";
import type { GearRecommendation } from "../src/plan/types";
import type { World } from "../src/plan/planner/types";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();

const R = reach as Record<string, any>, C = cons as Record<string, any>;
const admitted = (ch: Character, w: World, m: string): boolean => (R.admitted ?? R.safeWin)(ch, w, m);
const fixture = (JSON.parse(await readFile("scripts/fixtures/world-2026-11-21.json", "utf8")) as { world: World }).world;
const STATS = ["attack_fire", "attack_earth", "attack_water", "attack_air", "dmg", "dmg_fire", "dmg_earth", "dmg_water", "dmg_air", "res_fire", "res_earth", "res_water", "res_air", "critical_strike", "haste", "wisdom", "prospecting"];
/** A made-up fighter: the fixture's first character stripped, at combat L, on the city bank (4, 1). */
function hero(name: string, L: number, extra: Record<string, unknown> = {}): Character {
  const c: Record<string, unknown> = { ...fixture.characters[0], name, level: L, max_hp: 115 + 5 * L, hp: 115 + 5 * L, initiative: 100, x: 4, y: 1, layer: "overworld", inventory: [], ...extra };
  for (const s of STATS) c[s] = 0;
  for (const g of GEAR_SLOTS) c[`${g}_slot`] = "";
  c.utility1_slot_quantity = 0; c.utility2_slot_quantity = 0;
  return c as unknown as Character;
}
/** A World of the fixture with these characters on, this bank and gold, and a config patch. */
function worldOf(chars: Character[], bank: Record<string, number>, gold = 0, config: Record<string, unknown> = {}): World {
  return { ...fixture, characters: chars, bank: Object.entries(bank).map(([code, quantity]) => ({ code, quantity })), bankGold: gold, current: {}, blocked: {}, bags: {}, bankSlots: undefined, nextExpansion: undefined, config: { ...fixture.config, on: Object.fromEntries(chars.map((c) => [c.name, true])), ...config } as World["config"] };
}
const cases: [string, boolean, string][] = [];
const f1 = (x: number | undefined): string => (x == null || !Number.isFinite(x) ? String(x) : x.toFixed(2));

// ── 1. the floor ─────────────────────────────────────────────────────────────
{
  const L10 = hero("Ann", 10), L11 = hero("Ann", 11);
  const w = worldOf([L10], { copper_dagger: 1 }), w7 = worldOf([L10], { copper_dagger: 1 }, 0, { risk: { minWin: 0.7 } }), w11 = worldOf([L11], { copper_dagger: 1 });
  const r10 = R.fightRec(L10, w, "green_slime") as GearRecommendation | undefined, r11 = R.fightRec(L11, w11, "green_slime") as GearRecommendation | undefined;
  cases.push(["combat 10, a copper dagger vs the green slime: p 0.735 — refused at the floor 0.75", !admitted(L10, w, "green_slime"), `p ${f1(r10?.p)}`]);
  cases.push(["…and admitted at the floor 0.7 (config.risk.minWin)", admitted(L10, w7, "green_slime"), `p ${f1((R.fightRec(L10, w7, "green_slime") as GearRecommendation | undefined)?.p)}`]);
  const pess = r11 ? simulate(applyGear(baseStats(L11), r11.codes), (await import("../src/catalog")).monster("green_slime")!, { pessimistic: true }).win : true;
  cases.push(["combat 11: the pessimistic pass loses, p 0.98 — admitted (the old rule refused it)", admitted(L11, w11, "green_slime") && !pess, `p ${f1(r11?.p)}, pessimistic pass ${pess ? "wins" : "loses"}`]);
  if (R.admits && r11) {
    cases.push(["a set at p 0.8 is admitted", R.admits({ ...r11, p: 0.8 }, w), ""]);
    cases.push(["a set at p 0.7 is refused", !R.admits({ ...r11, p: 0.7 }, w), ""]);
  } else cases.push(["admits() exists (task 025)", false, "no reach.ts admits"]);
}

// ── 2. the price of a kill with a loss in it, by hand ────────────────────────
{
  const L11 = hero("Ann", 11), w = worldOf([L11], { copper_dagger: 1 });
  const r = R.fightRec(L11, w, "green_slime") as GearRecommendation;
  const f = r.forecast, p = r.p;
  const walk = (R.nearestSpot(R.WAKE ?? { x: 0, y: 0, layer: "overworld" }, "monster", "green_slime", w, "Ann") as { sec: number }).sec;
  const won = fightSec(f.turns) + restSeconds(f.maxHp - f.hpRemaining, f.maxHp);
  const lost = fightSec(f.turns) + restSeconds(f.maxHp - 1, f.maxHp) + walk;
  const hand = ((p * won + (1 - p) * lost) / p) * killLog(w);
  const fn = R.winSecOf ? R.winSecOf(r, w, "Ann", "green_slime") : R.fightSecOf(f, w, "Ann");
  cases.push(["the price of a kill: (p × won + (1 − p) × lost) ÷ p, lost = the fight + the walk back from (0, 0) + the rest from 1 HP", Math.abs(fn - hand) < 1e-6, `by hand ${f1(hand)} s (p ${f1(p)}, won ${won} s, lost ${lost} s: walk ${walk} s), the function ${f1(fn)} s`]);
}

// ── 3. a loss behind a toll ──────────────────────────────────────────────────
if (R.wayBack && R.strands) {
  const L50 = hero("Ann", 50), rich = worldOf([L50], {}, 200_000), poor = worldOf([L50], {}, 21_000);
  const b = R.wayBack(rich, "Ann", "sand_snake") as { sec: number; gold: number } | undefined;
  cases.push(["the sand snake's way back from (0, 0) takes the island boat: 1,000 gold", b?.gold === 1000, JSON.stringify(b)]);
  const fake: GearRecommendation = { slots: {} as GearRecommendation["slots"], codes: [], forecast: { win: true, turns: 20, hpRemaining: 300, hpLostPct: 0.5, timedOut: false, playerFirst: true, restSeconds: 50, hpRestored: 0, margin: 0.5, maxHp: 365, used: {} }, worst: undefined as never, p: 0.9, score: 0 };
  const withFare = R.winSecOf(fake, rich, "Ann", "sand_snake");
  const fare = (1000 * 3600) / (rich.config.goldPerHour || 300);
  const noFare = ((0.9 * (fightSec(20) + restSeconds(65, 365)) + 0.1 * (fightSec(20) + restSeconds(364, 365) + b!.sec + fare)) / 0.9) * killLog(rich);
  cases.push(["…its fare is part of a loss's price (at config.goldPerHour)", Math.abs(withFare - noFare) < 1e-6, `${f1(withFare)} s against ${f1(noFare)} s by hand`]);
  cases.push(["…a fight whose losses' fares the budget pays is not stranded (200,000 gold)", !R.strands(L50, rich, "sand_snake", fake), ""]);
  cases.push(["…and one whose budget cannot pay them is (21,000 gold: 1,000 over the floor)", R.strands(L50, poor, "sand_snake", fake), ""]);
} else cases.push(["a loss's way back and its fares (task 025)", false, "no reach.ts wayBack / strands"]);

// ── 4. a potion at its chain's price ─────────────────────────────────────────
{
  const L12 = hero("Ann", 12, { alchemy_level: 5 }), L10 = hero("Ann", 10, { alchemy_level: 5 });
  const w12 = worldOf([L12], { copper_dagger: 1, small_health_potion: 50 }), w10 = worldOf([L10], { copper_dagger: 1, small_health_potion: 50 });
  const r12 = R.fightRec(L12, w12, "green_slime") as GearRecommendation, r10 = R.fightRec(L10, w10, "green_slime") as GearRecommendation;
  cases.push(["combat 12 wins at p 0.99 without a potion: the stocked potion is not drunk (resting is cheaper at the chain's price)", !r12.codes.includes("small_health_potion"), `${r12.codes.join(" + ")}, p ${f1(r12.p)}`]);
  cases.push(["combat 10 wins at p 0.735 without one: the potion is drunk — it lifts p over the floor", r10.codes.includes("small_health_potion") && r10.p >= 0.75, `${r10.codes.join(" + ")}, p ${f1(r10.p)}`]);
}

// ── 5. the healing rune ──────────────────────────────────────────────────────
if (C.runePays) {
  const second = hero("Second", 26), bank = { iron_sword: 1, iron_helm: 1, iron_armor: 1, iron_legs_armor: 1, iron_boots: 1, iron_ring: 2, life_amulet: 1 };
  const w = worldOf([second], bank, 100_000);
  const v = C.runePays(w, "Second") as { pays: boolean; why: string };
  const capped = worldOf([second], { ...bank, healing_rune: 5 }, 100_000);
  const vc = C.runePays(capped, "Second") as { pays: boolean; why: string };
  const poor = worldOf([second], bank, 29_000);
  const vp = C.runePays(poor, "Second") as { pays: boolean; why: string };
  const bought = C.runeBought(w, "Second") as World;
  const held = { ...w, characters: [{ ...second, rune_slot: "healing_rune" }] } as World;
  cases.push(["the rune pays for a fighter whose fight work gets at least 5% cheaper a win with it (or crosses the floor)", v.pays, v.why]);
  cases.push(["…not past 50,000 gold: the fleet holds five", !vc.pays, vc.why]);
  cases.push(["…not below the gold floor (29,000 gold: 9,000 over the floor, a rune costs 10,000)", !vp.pays, vp.why]);
  cases.push(["…not for a character that holds one", !C.runePays(held, "Second").pays, C.runePays(held, "Second").why]);
  cases.push(["the forward model's purchase: 10,000 gold, worn", bought.bankGold === 90_000 && bought.characters[0].rune_slot === "healing_rune", `${bought.bankGold}, ${bought.characters[0].rune_slot}`]);
} else cases.push(["the healing rune is bought where it pays (task 025)", false, "no consumables.ts runePays"]);

// ── 6. food at its chain: taken where eating beats resting ───────────────────
{
  const cook = hero("Cook", 35, { cooking_level: 40, fishing_level: 40 });
  const w = worldOf([cook], { copper_dagger: 1, cooked_trout: 100 }, 0, { roles: { Cook: { craft: ["cooking"], gather: ["fishing"] } } });
  const lostOf = (m: string): number => { const r = R.fightRec(cook, w, m) as GearRecommendation | undefined; return r && R.admits?.(r, w) ? r.forecast.maxHp - r.forecast.hpRemaining : 0; };
  const big = ["blue_slime"].find((m) => lostOf(m) >= 230); // combat 35, a copper dagger: p 1, 255 of 290 HP lost
  const small = ["chicken", "yellow_slime", "green_slime", "cow"].find((m) => { const l = lostOf(m); return l > 0 && l < 225; });
  const tk = big ? (C.fightTake(w, cook, big, 20, 1, 1) as { withdraw?: Record<string, number> } | undefined) : undefined;
  cases.push([`a fight that loses ${big ? lostOf(big) : "?"} HP of 290 (${big}): the step takes cooked trout (225 HP, its chain 44 s) where resting the 225 takes ${restSeconds(225, 290)} s`, !!tk?.withdraw?.cooked_trout, JSON.stringify(tk?.withdraw ?? {})]);
  const tks = small ? (C.fightTake(w, cook, small, 20, 1, 1) as { withdraw?: Record<string, number> } | undefined) : undefined;
  cases.push([`a fight that loses ${small ? lostOf(small) : "?"} HP (${small}): no food — the loss covers no trout`, !!small && !tks?.withdraw?.cooked_trout, JSON.stringify(tks?.withdraw ?? {})]);
}

let bad = 0;
for (const [why, ok, detail] of cases) { if (!ok) bad++; console.log(`${ok ? "ok  " : "MISMATCH"} ${why}${detail ? ` — ${detail}` : ""}`); }
console.log(bad ? "FAILED" : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
