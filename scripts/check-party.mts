// Task 039: a boss fought by two or three — the party's fight (sim/combat.ts simulateParty), its verdict (sim/monte.ts
// partyRate) and the solver's party (plan/planner/party.ts partyPlan), on made-up fighters and made-up bosses:
//   1. a party of one is the solo fight: the expected pass and 300 rolled fights (one seeded stream each) give simulate()'s
//      win, turns and HP to the unit, a barrier, reconstitution, healing and a restore potion among the fights;
//   2. every actor's action is one turn: three fighters that kill a harmless boss in ten hits take 13 turns, one takes 19;
//   3. whom the boss hits: the highest threat (the expected pass hits only it), equal threat the lowest HP, and rolled, a
//      tenth of its hits on the lowest HP while the threat holder stands; a member that falls is passed over and the rest win;
//   4. a pair wins where one loses: one fighter's rolled win rate under the floor, two of them at it or over it;
//   5. the solver's party on the World of 09:46 on 11-28 against a made-up lich of 4,000 HP: First alone not admitted, First
//      and Fifth admitted, each in a set of the bank's, no piece in both that the pair holds once; at 5,500 HP the lowest level
//      of Second that admits the trio is 30 (at its own 29, p 0.02).
// On 8d8d9ec none exists. node --import tsx scripts/check-party.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { loadAtlas } from "../src/catalog/atlas";
import * as combat from "../src/sim/combat";
import * as monte from "../src/sim/monte";
import type { Fighter } from "../src/sim/types";
import { zeroStats } from "../src/sim/types";
import type { Monster } from "../src/types/catalog";
import type { World } from "../src/plan/planner/types";
import { DEFAULTS } from "../src/plan/planner/config";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
await loadAtlas();

type Party = { fighter: Fighter; threat: number }[];
const C = combat as unknown as typeof combat & { simulateParty?: (m: Party, mon: Monster, o?: { rng?: () => number }) => { win: boolean; turns: number; timedOut: boolean; hp: number[] } };
const M = monte as unknown as typeof monte & { partyRate?: (m: Party, mon: Monster, n?: number) => { p: number; turns: number; lost: number[] } };
const cases: [string, boolean, string][] = [];
const ok = (name: string, pass: boolean, said: string): void => void cases.push([name, pass, said]);

/** mulberry32 — the check's own seeded stream (monte.ts keeps its one private). */
const seeded = (seed: number): (() => number) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const fighter = (o: Partial<ReturnType<typeof zeroStats>>, effects: Fighter["effects"] = []): Fighter => ({ stats: { ...zeroStats(), initiative: 100, ...o }, effects });
const boss = (o: Partial<Monster>): Monster => ({ name: "Check Boss", code: "check_boss", level: 30, type: "boss", hp: 3000, attack_fire: 0, attack_earth: 0, attack_water: 0, attack_air: 0, res_fire: 0, res_earth: 0, res_water: 0, res_air: 0, critical_strike: 0, initiative: 50, effects: [], min_gold: 0, max_gold: 0, drops: [], ...o } as Monster);

if (!C.simulateParty || !M.partyRate) {
  ok("the party's fight exists", false, "no simulateParty / partyRate in src/sim");
} else {
  const sim = C.simulateParty, rate = M.partyRate;
  // ── 1. a party of one is the solo fight ──
  {
    const fights: [Fighter, Monster][] = [
      [fighter({ hp: 900, attack_fire: 60, critical_strike: 20, res_fire: 10 }), boss({ hp: 1500, attack_earth: 70, critical_strike: 10, effects: [{ code: "barrier", value: 150 }] })],
      [fighter({ hp: 1200, attack_water: 90, dmg: 20, critical_strike: 35 }, [{ code: "restore", value: 120, potion: "check_potion" }]), boss({ hp: 2600, attack_fire: 95, critical_strike: 5, initiative: 300, effects: [{ code: "reconstitution", value: 20 }] })],
      [fighter({ hp: 800, attack_air: 75, critical_strike: 10, initiative: 50 }), boss({ hp: 1800, attack_air: 40, attack_water: 40, critical_strike: 20, effects: [{ code: "healing", value: 10 }] })],
    ];
    let bad = "";
    for (const [f, m] of fights) {
      const a = combat.simulate(f, m), b = sim([{ fighter: f, threat: 0 }], m);
      if (a.win !== b.win || a.turns !== b.turns || a.hpRemaining !== b.hp[0]) bad ||= `expected: solo ${a.win} ${a.turns} ${a.hpRemaining}, party ${b.win} ${b.turns} ${b.hp[0]}`;
      for (let s = 1; s <= 300 && !bad; s++) {
        const x = combat.simulate(f, m, { rng: seeded(s) }), y = sim([{ fighter: f, threat: 0 }], m, { rng: seeded(s) });
        if (x.win !== y.win || x.turns !== y.turns || x.hpRemaining !== y.hp[0]) bad = `seed ${s}: solo ${x.win} ${x.turns} ${x.hpRemaining}, party ${y.win} ${y.turns} ${y.hp[0]}`;
      }
    }
    ok("1. a party of one is the solo fight", !bad, bad || "3 fights, expected and 300 rolled each: equal");
  }
  // ── 2. every actor's action is one turn ──
  {
    const f = fighter({ hp: 500, attack_fire: 100 }), m = boss({ hp: 1000 }); // 100 a hit, ten hits; the boss strikes last and hits nothing
    const one = sim([{ fighter: f, threat: 0 }], m), three = sim([0, 1, 2].map(() => ({ fighter: f, threat: 0 })), m);
    ok("2. every actor's action is one turn", one.win && three.win && one.turns === 19 && three.turns === 13, `one fighter ${one.turns} turns (19), three ${three.turns} (13)`);
  }
  // ── 3. whom the boss hits ──
  {
    const m = boss({ hp: 1200, attack_earth: 50 }); // 30 hits of 40: 15 strikes of its own, 750 HP
    const a = fighter({ hp: 3000, attack_fire: 40 }), b = fighter({ hp: 900, attack_fire: 40 });
    const byThreat = sim([{ fighter: a, threat: 10 }, { fighter: b, threat: 0 }], m), byHp = sim([{ fighter: a, threat: 0 }, { fighter: b, threat: 0 }], m);
    let lowHit = 0, n = 0;
    for (let s = 1; s <= 400; s++) { const r = sim([{ fighter: a, threat: 10 }, { fighter: b, threat: 0 }], m, { rng: seeded(s) }); n++; if (r.hp[1] < 900) lowHit++; }
    // a tenth of 15 strikes: the lower HP is struck at least once in 1 − 0.9^15 = 79% of the fights
    // a tank of 300 HP falls; the two others finish the boss
    const tank = fighter({ hp: 300, attack_fire: 10 }), dps = fighter({ hp: 1000, attack_fire: 80 });
    const fall = sim([{ fighter: tank, threat: 20 }, { fighter: dps, threat: 0 }, { fighter: dps, threat: 0 }], boss({ hp: 2400, attack_earth: 60 }));
    const pass = byThreat.hp[0] < 3000 && byThreat.hp[1] === 900 && byHp.hp[1] < 900 && byHp.hp[0] === 3000 && lowHit > 0.65 * n && lowHit < 0.9 * n && fall.win && fall.hp[0] === 0 && fall.hp[1] < 1000;
    ok("3. whom the boss hits", pass, `threat 10 vs 0: HP ${byThreat.hp.join(" / ")}; equal threat: ${byHp.hp.join(" / ")}; rolled, the lower HP hit in ${lowHit} of ${n} fights; the tank falls: ${fall.win ? "won" : "lost"}, HP ${fall.hp.join(" / ")}`);
  }
  // ── 4. a pair wins where one loses ──
  {
    // 99 a hit with its crits: one fighter does 1,485 before the boss's 15th turn heals it whole, two 2,970
    const f = fighter({ hp: 1100, attack_fire: 90, critical_strike: 20, res_earth: 10 });
    const m = boss({ hp: 2400, attack_earth: 60, critical_strike: 10, initiative: 200, effects: [{ code: "reconstitution", value: 15 }] });
    const one = rate([{ fighter: f, threat: 0 }], m), two = rate([{ fighter: f, threat: 1 }, { fighter: f, threat: 0 }], m);
    ok("4. a pair wins where one loses", one.p < 0.75 && two.p >= 0.75, `one fighter p ${one.p.toFixed(2)}, two p ${two.p.toFixed(2)} (${two.turns.toFixed(1)} turns, HP lost ${two.lost.map((x) => Math.round(x)).join(" / ")})`);
  }
}

// ── 5. the solver's party on the World of 09:46 on 11-28 ──
{
  const P = (await import("../src/plan/planner/party.ts").catch(() => ({}))) as { partyPlan?: (w: World, names: string[], m: Monster | string, levels?: Record<string, number>) => { p: number; admitted: boolean; members: { name: string; codes: string[] }[] } | undefined; lowestThird?: (w: World, pair: string[], third: string, m: Monster | string, levels?: Record<string, number>) => number | undefined };
  if (!P.partyPlan) ok("5. the solver's party", false, "no partyPlan in src/plan/planner/party.ts");
  else {
    const fx = (JSON.parse(await readFile("scripts/fixtures/world-2026-11-28-0946.json", "utf8")) as { world: World }).world;
    const w: World = { ...fx, current: {}, blocked: {}, costs: {}, bags: undefined, market: undefined, config: { ...DEFAULTS, ...fx.config } as World["config"] };
    // a lich of 4,000 HP: whole again at its 20th turn, so one member never wins
    const m = boss({ level: 30, hp: 4000, attack_fire: 110, attack_earth: 55, critical_strike: 5, initiative: 350, res_fire: 20, res_earth: 20, res_water: 15, res_air: 15, effects: [{ code: "reconstitution", value: 20 }] });
    const one = P.partyPlan(w, ["First"], m), two = P.partyPlan(w, ["First", "Fifth"], m);
    // the copies the pair may wear of a code: the bank's and the slots of the two that hold it
    const copies = (c: string): number => (w.bank.find((b) => b.code === c)?.quantity ?? 0) + w.characters.filter((ch) => ["First", "Fifth"].includes(ch.name)).reduce((t, ch) => t + Object.entries(ch).filter(([k, v]) => k.endsWith("_slot") && v === c).length, 0);
    const dup = two ? two.members[0].codes.filter((c) => two.members[1].codes.includes(c) && copies(c) < 2) : [];
    // at 5,500 HP the pair loses and Second at 29 too (p 0.02); at 30 the bank's level-30 pieces are its
    const third = P.lowestThird?.(w, ["First", "Fifth"], "Second", boss({ ...m, code: "check_boss_5500", hp: 5500 }));
    const said = `First alone p ${one?.p.toFixed(2)}; First + Fifth p ${two?.p.toFixed(2)} (${two?.members.map((x) => `${x.name}: ${x.codes.length} pieces`).join(", ")}); a piece in both sets held once: ${dup.join(", ") || "none"}; at 5,500 HP Second's lowest level for a trio: ${third ?? "none"} (30)`;
    ok("5. the solver's party", !!one && !!two && !one.admitted && two.admitted && two.members.every((x) => x.codes.length > 0) && !dup.length && third === 30, said);
  }
}

let failed = 0;
for (const [name, pass, said] of cases) { console.log(`${pass ? "ok  " : "FAIL"} ${name}: ${said}`); if (!pass) failed++; }
console.log(failed ? `check-party: ${failed} of ${cases.length} failed` : `check-party: ${cases.length} cases ok`);
process.exit(failed ? 1 : 0);
