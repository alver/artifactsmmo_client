// Task 042, A: the party's kit in the fight and in the solver.
//   1. the healing aura: a tank and a striker that lose to a made-up boss win once the striker wears an aura of 10 (every 2 of
//      its own turns the tank heals 10% of its max HP); the aura heals no caster: a party of one with it is the fight without it;
//   2. a splash potion heals the other member that has lost the most, only while that one is under half its HP: a boss that
//      drains every member (void drain) — the bearer, the most hurt, is not healed by its own splash, the member that lost the
//      most is, and the one under half that lost less is not; one potion a proc (`used`);
//   3. shell: a solo fight against a boss with the protection rune's shell (40) loses less HP than without it; against a
//      monster that is no boss nothing changes;
//   4. the solver's kit on the World of 14:04 on 11-28 (Second at 30, stage 1 with the four pieces, no splash nor greater
//      health potion in the bank; each member at its own level in the stage's pieces): without the kit the trio is not admitted against the lich; with it (a rune a merchant sells for gold, a potion the
//      fleet brews at alchemy 37) it is, a member wearing the healing_aura_rune the bank does not hold, and the same party with
//      healing_rune in its place loses (p under the floor);
//   5. POTIONS off keeps the kit out of a fight alone: the solo solve's options (reach.ts fightOptions) offer none of the kit's
//      potions, and First's solo verdict against its pick wears no potion the bank does not hold.
// On fed9a7c (041) all five fail (5: there is no kit). node --import tsx scripts/check-party-kit.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog, item } from "../src/catalog";
import { loadAtlas } from "../src/catalog/atlas";
import * as combat from "../src/sim/combat";
import { partyRate } from "../src/sim/monte";
import type { Fighter } from "../src/sim/types";
import { zeroStats } from "../src/sim/types";
import { applyGear, baseStats } from "../src/sim/stats";
import type { Monster } from "../src/types/catalog";
import type { Character } from "../src/types/api";
import type { World } from "../src/plan/planner/types";
import { DEFAULTS } from "../src/plan/planner/config";
import * as party from "../src/plan/planner/party";
import { chAt, fightOptions, fightRec } from "../src/plan/planner/reach";
import { pickMonster } from "../src/plan/planner/pick";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
await loadAtlas();

const cases: [string, boolean, string][] = [];
const ok = (name: string, pass: boolean, said: string): void => void cases.push([name, pass, said]);
const fighter = (o: Partial<ReturnType<typeof zeroStats>>, effects: Fighter["effects"] = []): Fighter => ({ stats: { ...zeroStats(), initiative: 100, ...o }, effects });
const boss = (o: Partial<Monster>): Monster => ({ name: "Check Boss", code: "check_boss", level: 30, type: "boss", hp: 3000, attack_fire: 0, attack_earth: 0, attack_water: 0, attack_air: 0, res_fire: 0, res_earth: 0, res_water: 0, res_air: 0, critical_strike: 0, initiative: 50, effects: [], min_gold: 0, max_gold: 0, drops: [], ...o } as Monster);

// ── 1. the healing aura ──
{
  const b = boss({ hp: 1600, attack_earth: 90 });
  const tank = { fighter: fighter({ hp: 1000, attack_fire: 20 }), threat: 10 };
  const striker = (aura: boolean) => ({ fighter: fighter({ hp: 600, attack_fire: 60 }, aura ? [{ code: "healing_aura", value: 10 }] : []), threat: 0 });
  const off = partyRate([tank, striker(false)], b), on = partyRate([tank, striker(true)], b);
  const solo = combat.simulateParty([striker(true)], b), soloOff = combat.simulateParty([striker(false)], b);
  ok("1. a tank and a striker lose; the striker's aura makes it a win; it heals no caster", off.p < 0.75 && on.p >= 0.75 && solo.hp[0] === soloOff.hp[0] && solo.turns === soloOff.turns,
    `without p ${off.p}, with p ${on.p} (${Math.round(on.turns)} turns, the tank loses ${Math.round(on.lost[0])}); alone with it ${solo.hp[0]} HP left, without ${soloOff.hp[0]}`);
}

// ── 2. a splash potion ──
{
  const b = boss({ hp: 1e6, effects: [{ code: "void_drain", value: 60 }] });
  const run = (splash: boolean) => combat.simulateParty([
    { fighter: fighter({ hp: 2000 }, splash ? [{ code: "splash_restore", value: 150, potion: "health_splash_potion" }] : []), threat: 0 }, // the bearer, the most hurt
    { fighter: fighter({ hp: 1000 }), threat: 0 }, // loses the most of the others
    { fighter: fighter({ hp: 500 }), threat: 0 }, // under half, loses less
  ], b);
  const a = run(false), s = run(true);
  ok("2. the splash heals the other member that lost the most, under half its HP; not its bearer, not the one that lost less", s.hp[0] === a.hp[0] && s.hp[1] > a.hp[1] && s.hp[2] === a.hp[2] && (s.used[0].health_splash_potion ?? 0) > 0,
    `HP at the end without / with: bearer ${a.hp[0]} / ${s.hp[0]}, the most hurt ${a.hp[1]} / ${s.hp[1]}, the other ${a.hp[2]} / ${s.hp[2]}; potions ${s.used[0].health_splash_potion ?? 0}`);
}

// ── 3. shell ──
{
  const f = (shell: boolean) => fighter({ hp: 2000, attack_fire: 40 }, shell ? [{ code: "shell", value: 40 }] : []);
  const mon = (type: string) => boss({ hp: 1000, attack_earth: 60, type });
  const bossOn = combat.simulate(f(true), mon("boss")), bossOff = combat.simulate(f(false), mon("boss"));
  const plainOn = combat.simulate(f(true), mon("normal")), plainOff = combat.simulate(f(false), mon("normal"));
  ok("3. shell: less HP lost against a boss, nothing changes against another monster", bossOn.hpRemaining > bossOff.hpRemaining && plainOn.hpRemaining === plainOff.hpRemaining && plainOn.turns === plainOff.turns,
    `boss: ${bossOff.hpRemaining} → ${bossOn.hpRemaining} HP left; a normal monster: ${plainOff.hpRemaining} → ${plainOn.hpRemaining}`);
}

// ── 4. the solver's kit, and 5. POTIONS off keeps it out of a fight alone ──
{
  const fx = (JSON.parse(await readFile("scripts/fixtures/world-2026-11-28-1404.json", "utf8")) as { world: World }).world;
  const four = ["conjurer_skirt", "gold_shield", "gold_helm", "greater_dreadful_amulet"];
  const ALL = ["First", "Second", "Third", "Fourth", "Fifth"];
  const w: World = {
    ...fx, current: {}, costs: {}, bags: undefined, market: undefined, blocked: {}, bank: fx.bank.filter((b) => b.code !== "health_splash_potion" && b.code !== "greater_health_potion"),
    stages: fx.stages!.map((s, i) => (i === 0 ? { ...s, pieces: [...s.pieces!, ...four] } : s)),
    characters: fx.characters.map((c) => (c.name === "Second" ? ({ ...c, level: 30, max_hp: c.max_hp + 5 } as Character) : c)),
    config: { ...DEFAULTS, ...fx.config, on: Object.fromEntries(ALL.map((n) => [n, true])), roles: DEFAULTS.roles } as World["config"],
  };
  const P = party as typeof party & { kitOf?: (w: World) => string[] };
  const plan = party.partyPlan as unknown as (w: World, n: string[], b: string, l?: Record<string, number>, kit?: boolean) => party.PartyPlan | undefined;
  const trio = ["First", "Fifth", "Second"];
  const own = Object.fromEntries(trio.map((n) => [n, w.characters.find((c) => c.name === n)!.level])); // in the stage's pieces of its level
  const bare = plan(w, trio, "lich", own), kitted = plan(w, trio, "lich", own, true);
  const auraOn = kitted?.members.filter((x) => x.slots.rune === "healing_aura_rune") ?? [];
  let without = NaN;
  if (kitted && auraOn.length) {
    const swapped = kitted.members.map((x) => {
      const c = chAt(w.characters.find((y) => y.name === x.name)!, x.level), codes = x.codes.map((code) => (code === "healing_aura_rune" ? "healing_rune" : code));
      return { fighter: applyGear(baseStats(c), codes), threat: x.threat };
    });
    without = partyRate(swapped, (await import("../src/catalog")).monster("lich")!).p;
  }
  ok("4. the kit: the trio admitted only with it, the aura rune on a member; healing_rune in its place loses",
    !!bare && !bare.admitted && !!kitted?.admitted && auraOn.length > 0 && !w.bank.some((b) => b.code === "healing_aura_rune") && without < 0.75,
    `without the kit ${bare ? Math.round(bare.p * 100) : "—"}%, with it ${kitted ? Math.round(kitted.p * 100) : "—"}% (${kitted?.members.map((x) => `${x.name} ${x.as} ${x.slots.rune ?? "no rune"} ${[x.slots.utility1, x.slots.utility2].filter(Boolean).join(" ")}`).join("; ")}); with healing_rune for the aura ${Number.isNaN(without) ? "—" : `${Math.round(without * 100)}%`}`);

  const kitPotions = (P.kitOf?.(w) ?? []).filter((c) => item(c)?.type === "utility");
  const first = w.characters.find((c) => c.name === "First")!;
  const pick = pickMonster(first, w, new Set())?.monster ?? "owlbear";
  const o = fightOptions(first, w, pick), solo = fightRec(first, w, pick);
  const banked = new Set(w.bank.map((b) => b.code));
  const strange = (solo?.codes ?? []).filter((c) => item(c)?.type === "utility" && !banked.has(c));
  ok("5. POTIONS off: a fight alone is offered none of the kit's potions and wears none the bank lacks",
    kitPotions.length > 0 && !kitPotions.some((c) => (o.extraCandidates ?? []).includes(c)) && !strange.length,
    `the kit's potions: ${kitPotions.join(", ") || "none"}; First alone at the ${pick}: ${(solo?.codes ?? []).filter((c) => item(c)?.type === "utility").join(", ") || "no potion"}`);
}

let failed = 0;
for (const [name, pass, said] of cases) {
  console.log(`${pass ? "ok  " : "FAIL"} ${name}: ${said}`);
  if (!pass) failed++;
}
console.log(failed ? `check-party-kit: ${failed} of ${cases.length} failed` : `check-party-kit: ${cases.length} cases ok`);
if (failed) process.exit(1);
