// Self-check: the combat effects simulate() models, each on a synthetic 1v1 with round numbers
// (no crits, no catalog), so a broken mechanic shows up as a wrong exact HP figure:
//   node --import tsx scripts/check-effects.mts
import { simulate } from "../src/sim/combat";
import type { TurnEvent } from "../src/sim/combat";
import type { EffectEntry, Fighter } from "../src/sim/types";
import type { Monster } from "../src/types/catalog";

const fighter = (o: Partial<Fighter["stats"]> = {}, effects: EffectEntry[] = []): Fighter => ({
  stats: { hp: 1000, attack_fire: 100, attack_earth: 0, attack_water: 0, attack_air: 0, dmg: 0, dmg_fire: 0, dmg_earth: 0, dmg_water: 0, dmg_air: 0, res_fire: 0, res_earth: 0, res_water: 0, res_air: 0, critical_strike: 0, haste: 0, initiative: 100, wisdom: 0, prospecting: 0, ...o },
  effects,
});
const mon = (o: Partial<Monster> = {}, effects: { code: string; value: number }[] = []): Monster =>
  ({ code: "dummy", name: "Dummy", level: 1, type: "normal", hp: 1000, attack_fire: 0, attack_earth: 0, attack_water: 0, attack_air: 0, res_fire: 0, res_earth: 0, res_water: 0, res_air: 0, critical_strike: 0, initiative: 0, effects: effects.map((e) => ({ ...e, description: "" })), min_gold: 0, max_gold: 0, drops: [], ...o }) as unknown as Monster;
/** Player hits in order (exact no-crit run). */
const hits = (f: Fighter, m: Monster): number[] => {
  const t: TurnEvent[] = [];
  simulate(f, m, { rng: () => 1, trace: t });
  return t.filter((e) => e.actor === "player").map((e) => e.dmg);
};
const run = (f: Fighter, m: Monster) => simulate(f, m, { rng: () => 1 });

const cases: [string, unknown, unknown][] = [
  // 100 fire vs 1000 HP = 10 player turns; the monster (atk 0) poisons 20 from ITS first turn (after the player's first).
  ["poison ticks from the turn after the bearer's first", run(fighter(), mon({}, [{ code: "poison", value: 20 }])).hpRemaining, 1000 - 20 * 9],
  ["a monster that moves first poisons before the player's first turn", run(fighter({ initiative: 0 }), mon({ initiative: 50 }, [{ code: "poison", value: 20 }])).hpRemaining, 1000 - 20 * 10],
  ["antipoison 20 cancels poison 20 entirely", run(fighter({}, [{ code: "antipoison", value: 20 }]), mon({}, [{ code: "poison", value: 20 }])).hpRemaining, 1000],
  ["antipoison 20 vs poison 50 leaves 30 for one tick, then 10", run(fighter({}, [{ code: "antipoison", value: 20 }]), mon({}, [{ code: "poison", value: 50 }])).hpRemaining, 1000 - 30 - 10],
  ["corrupted: −10 res per hit taken, per element", hits(fighter(), mon({ res_fire: 50 }, [{ code: "corrupted", value: 10 }])).slice(0, 4).join(), "50,60,70,80"],
  ["sun shield halves every hit the bearer takes", hits(fighter(), mon({}, [{ code: "sun_shield", value: 50 }]))[0], 50],
  // the monster hits 100 a turn = 10% of the player's 1000 HP: greed +15% dmg per hit taken
  ["greed adds to dmg% per 10% of max HP lost", hits(fighter({}, [{ code: "greed", value: 15 }]), mon({ attack_fire: 100, initiative: 200 })).slice(0, 3).join(), "115,130,145"],
  // the player hits 100 on odd fight turns; the mirror sends 50 back on turns 1 and 5 (≥ 3 turns apart; turn 9's hit kills it)
  ["enchanted mirror reflects 50% once every 3 turns", run(fighter(), mon({ hp: 500 }, [{ code: "enchanted_mirror", value: 50 }])).hpRemaining, 1000 - 50 * 2],
  // the monster drains 10% of the player's CURRENT HP on its 4th and 8th turns (its heal stretches the fight): 1000 → 900 → 810
  ["void drain takes 10% of current HP every 4 own turns", run(fighter(), mon({ hp: 1000 }, [{ code: "void_drain", value: 10 }])).hpRemaining, 810],
  // EV: 50% crit = ×1.25; frenzy 20 adds 0.5·20 = +10 dmg% from the 2nd attack → round(110 × 1.25)
  ["frenzy in EV mode: +crit×value% dmg from the 2nd attack", (() => { const t: TurnEvent[] = []; simulate(fighter({ critical_strike: 50 }, [{ code: "frenzy", value: 20 }]), mon({ hp: 1e6 }), { trace: t }); return t.filter((e) => e.actor === "player").slice(0, 2).map((e) => e.dmg).join(); })(), "125,138"],
  ["protective bubble EV: a quarter of hits shielded (65%)", hits(fighter(), mon({}, [{ code: "protective_bubble", value: 65 }]))[0] > 0, true],
];
// EV bubble: exact expected first hit = 0.75·100 + 0.25·35 = 83.75
{
  const t: TurnEvent[] = [];
  simulate(fighter(), mon({ hp: 1e6 }, [{ code: "protective_bubble", value: 65 }]), { trace: t });
  cases.push(["protective bubble EV first hit = 0.75·100 + 0.25·35", t[0].dmg, Math.round(83.75)]);
}
// Task 027: restore potions. The player (1000 HP, 100 fire, first) kills a 500-HP monster on fight turn 9; the monster hits
// 300 on turns 2, 4, 6, 8 — the player starts turns 5, 7, 9 under half (400, then what the potions leave less 300).
{
  const m = mon({ hp: 500, attack_fire: 300 });
  const two = (q?: number): Fighter => fighter({}, [{ code: "restore", value: 200, potion: "a", ...(q != null ? { qty: q } : {}) }, { code: "restore", value: 50, potion: "b" }]);
  // slot order: 400 → +200 = 600, not under half, b waits; 300 → 500; 200 → 400 → +50 = 450 (both). Summed (the old
  // reading) they gave 550 and drank 3 of each.
  const f = run(two(), m);
  cases.push(["two restore potions fire in slot order, the second only while HP is still under half", `${f.hpRemaining} ${f.used.a} ${f.used.b}`, "450 3 1"]);
  // a stack of one: a fires on turn 5 (600), is spent; turn 7: 300 → b 350; turn 9: 50 → b 100
  const s = run(two(1), m);
  cases.push(["a worn stack stops when it is spent (qty 1), the next potion takes over", `${s.hpRemaining} ${s.used.a} ${s.used.b}`, "100 1 2"]);
  const z = run(fighter({}, [{ code: "restore", value: 200, potion: "a", qty: 0 }]), m);
  cases.push(["an empty stack never fires: the fight is lost on turn 8", `${z.win} ${z.used.a}`, "false 0"]);
}
// Roll mode bubble: the element never repeats two turns in a row (seeded rng).
{
  let s = 7;
  const rng = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const t: TurnEvent[] = [];
  simulate(fighter({ attack_earth: 100, critical_strike: 0 }), mon({ hp: 1e6 }, [{ code: "protective_bubble", value: 100 }]), { rng, trace: t });
  const p = t.filter((e) => e.actor === "player").map((e) => e.dmg);
  cases.push(["bubble (roll) shields one element at a time: hits are 200 or 100", p.every((d) => d === 200 || d === 100), true]);
}
let bad = 0;
for (const [why, got, want] of cases) if (got !== want) { bad++; console.log(`MISMATCH ${why}: got ${got}, want ${want}`); }
console.log(bad ? "FAILED" : `OK (${cases.length} checks)`);
process.exit(bad ? 1 : 0);
