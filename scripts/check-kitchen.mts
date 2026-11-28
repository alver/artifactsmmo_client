// Task 031 (D.1): no potions, a kitchen — on the World of 11-26 (scripts/fixtures/world-2026-11-26.json: logs/world/2026-11-26.json
// as the forward model reads it, its config the snapshot's patch over this tree's DEFAULTS). "030" is config.potions on,
// config.kitchen off and 030's roles (Third alchemy and fishing, Fourth cooking).
//   1. 030 makes Health Potion a parent of supply (an egg or sap step for one) → POTIONS off: no potion parent, no such step;
//   2. Cultist Acolyte, admitted only with a potion: the bank without potions → 030 makes its potions parents of supply,
//      POTIONS off no parent and no candidate of it at all; the same fight with 300 Minor and 300 Small Health Potions in the bank → it drinks them;
//   3. Fifth's step at the Rat rests, the bank holds raw trout and no cooked food → Third's step is the cook step (rule `cook`)
//      before its other (1a) work; raw rat meat → cooked by Third at cooking 32, not offered at cooking 29;
//   4. Third's roles (gearcrafting, cooking, fishing; nobody holds alchemy); Third at fishing 22 / cooking 32 → its tier (3)
//      names fishing 30; at 30 / 32 → fishing and cooking 40.
// The kitchen's cases pass its roles (KITCHEN: committed off by report 031, on since 031b). On d2fd93c every case fails (no config.potions,
// no kitchen). node --import tsx scripts/check-kitchen.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { item, loadCatalog } from "../src/catalog";
import { DEFAULTS, KITCHEN } from "../src/plan/planner/config";
import { WEAR_SLOTS, rank } from "../src/plan/planner/decide";
import { consParents } from "../src/plan/planner/consumables";
import { fightRec } from "../src/plan/planner/reach";
import { rolesFor } from "../src/plan/planner/roles";
import { craftTarget } from "../src/plan/planner/train";
import type { Candidate } from "../src/plan/planner/decide";
import type { BankItem } from "../src/types/api";
import type { Step, World } from "../src/plan/planner/types";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();

const fx = JSON.parse(await readFile("scripts/fixtures/world-2026-11-26.json", "utf8")) as { world: World };
const ROLES_030 = { First: { role: "fighter" }, Second: { role: "worker", craft: ["weaponcrafting"], gather: ["woodcutting"] }, Third: { role: "worker", craft: ["gearcrafting"], gather: ["alchemy", "fishing"] }, Fourth: { role: "worker", craft: ["jewelrycrafting", "cooking"], gather: ["mining", "woodcutting"] }, Fifth: { role: "fighter" } } as World["config"]["roles"];
const C030 = { potions: true, kitchen: false, roles: ROLES_030 };
// the kitchen as task 031 (B.1) wrote it, whatever the constants say (KITCHEN: committed off by report 031, on since 031b)
const ROLES_KITCHEN = { First: { role: "fighter" }, Second: { role: "worker", craft: ["weaponcrafting"], gather: ["woodcutting"] }, Third: { role: "worker", craft: ["gearcrafting", "cooking"], gather: ["fishing"] }, Fourth: { role: "worker", craft: ["jewelrycrafting"], gather: ["mining", "woodcutting"] }, Fifth: { role: "fighter" } } as World["config"]["roles"];
const NEW = { potions: false, kitchen: true, roles: ROLES_KITCHEN };
const of = (cfg: Partial<World["config"]>, patch: Partial<World> = {}): World => ({
  ...fx.world, config: { ...DEFAULTS, ...fx.world.config, on: { ...DEFAULTS.on, ...fx.world.config.on }, ...cfg } as World["config"], ...patch,
});
const cands = (r: ReturnType<typeof rank>): Candidate[] => [...r.objectives, ...r.levels, ...r.supply, ...r.fillers];
const said = (s: Step): string => `${s.target} [${s.reason?.rule}] — ${s.why.slice(0, 120)}`;
const potion = (code: string): boolean => item(code)?.type === "utility";
const codeOf = (parent = ""): string => (parent.startsWith("cons:") ? parent.split(":")[1] : "");
const NAMES = fx.world.characters.map((c) => c.name);
const cases: [string, boolean, string][] = [];

// ── 1. no potion is a parent of supply ──
{
  const w0 = of(C030), w1 = of(NEW);
  const pots = (w: World): string[] => [...new Set(NAMES.flatMap((n) => consParents(w, n).filter((p) => potion(codeOf(p.key))).map((p) => p.key)))];
  const brew = (w: World): string[] => [...new Set(NAMES.flatMap((n) => cands(rank(n, w)).filter((c) => /^src:(egg|sap)$/.test(c.target.key) && potion(codeOf(c.step.parent))).map((c) => `${c.target.key}@${n} for ${c.step.parent}`)))];
  const p0 = pots(w0), p1 = pots(w1), b0 = brew(w0), b1 = brew(w1);
  cases.push(["1. 030 makes Health Potion a parent of supply → POTIONS off: no potion parent, no egg or sap step for one",
    p0.some((k) => k.startsWith("cons:health_potion:")) && b0.length > 0 && !p1.length && !b1.length,
    `030: ${p0.length} potion parents (${p0.filter((k) => k.startsWith("cons:health_potion:")).join(", ")}), ${b0.length} egg/sap steps (${b0.slice(0, 2).join("; ")}) | off: ${p1.length} parents, ${b1.length} steps`]);
}

// ── 2. a fight admitted only with a potion ──
{
  const noPot: BankItem[] = fx.world.bank.filter((b) => !potion(b.code));
  const withPot: BankItem[] = [...noPot, { code: "minor_health_potion", quantity: 300 }, { code: "small_health_potion", quantity: 300 }];
  const KEY = "ach:cultist_purifier:0";
  const of2 = (w: World): string[] => NAMES.flatMap((n) => cands(rank(n, w)).filter((c) => c.target.key === KEY || (c.step.parent ?? "").includes(":ach:cultist_purifier:")).map((c) => `${c.target.key}@${n}`));
  const par = (w: World): string[] => [...new Set(NAMES.flatMap((n) => consParents(w, n).filter((p) => p.key.includes(":ach:cultist_purifier:")).map((p) => p.key)))];
  const on = par(of(C030, { bank: noPot })), off = [...par(of(NEW, { bank: noPot })), ...of2(of(NEW, { bank: noPot }))];
  const w2 = of(NEW, { bank: withPot });
  const fifth = cands(rank("Fifth", w2)).find((c) => c.target.key === KEY);
  const drinks = Object.keys(fifth?.step.withdraw ?? {}).filter(potion);
  cases.push(["2. a fight 030 admits only with a potion (the bank without potions) → POTIONS off: no candidate; with the potion in the bank → it drinks it",
    on.length > 0 && !off.length && drinks.length > 0,
    `030: its potions are parents (${on.join(", ")}) | off: ${off.length} parents or candidates | off, 300 + 300 in the bank: Fifth's ${KEY} withdraws ${JSON.stringify(fifth?.step.withdraw)}`]);
}

// ── 3. the stock first ──
{
  const FOOD = (code: string): boolean => item(code)?.type === "consumable" && (item(code)?.effects ?? []).some((e) => e.code === "heal");
  const RAW = /^(trout|raw_|shrimp|gudgeon|bass|salmon|milk_bucket|egg|apple|mushroom)/;
  const fifth = fx.world.characters.find((c) => c.name === "Fifth")!;
  const base = fx.world.bank.filter((b) => !FOOD(b.code) && !RAW.test(b.code));
  const rat = (bank: BankItem[], cooking = 32): World => {
    const w = of(NEW, { bank, characters: fx.world.characters.map((c) => (c.name === "Third" ? { ...c, cooking_level: cooking } : c)) });
    const r = fightRec(fifth, w, "rat")!;
    const wear = Object.fromEntries(WEAR_SLOTS.filter((g) => r.slots[g]).map((g) => [g, r.slots[g]!]));
    const step: Step = { key: "lvl:combat:31@Fifth#1", target: "lvl:combat:31", character: "Fifth", as: "level", work: { kind: "kill", monster: "rat" }, units: 70, hours: 1.5, score: 0, why: "rests", wear, fight: { p: 1, sec: 77 } };
    return { ...w, current: { ...w.current, Fifth: step } };
  };
  const wT = rat([...base, { code: "trout", quantity: 4140 }]);
  const rT = rank("Third", wT), other = cands(rT).filter((c) => c.need && c.gear && c.target.key !== rT.step.target);
  cases.push(["3a. a fighter's step that rests, raw trout in the bank → Third's cook step before its other (1a) work",
    rT.step.target === "mat:cooked_trout" && rT.step.reason?.rule === "cook" && other.length > 0,
    `${said(rT.step)} | other (1a) work: ${other.length} (${other.slice(0, 2).map((c) => c.target.key).join(", ")})`]);
  const bank = [...base, { code: "trout", quantity: 4140 }, { code: "raw_rat_meat", quantity: 151 }];
  const r32 = rank("Third", rat(bank)).step, r29 = rank("Third", rat(bank, 29)).step;
  const offered = NAMES.filter((n) => cands(rank(n, rat(bank, 29))).some((c) => c.target.key === "mat:cooked_rat_meat"));
  cases.push(["3b. raw rat meat → cooked by a worker at cooking 30+, not offered to one under it",
    r32.target === "mat:cooked_rat_meat" && r32.reason?.rule === "cook" && r29.target !== "mat:cooked_rat_meat" && !offered.length,
    `cooking 32: ${said(r32)} | cooking 29: ${said(r29)}; offered to ${offered.join(", ") || "nobody"}`]);
}

// ── 4. the kitchen's roles and levels ──
{
  const w = of(NEW);
  const roles = rolesFor(w);
  const ok = JSON.stringify(roles.Third) === JSON.stringify(["combat", "gearcrafting", "cooking", "fishing"]) && JSON.stringify(roles.Fourth) === JSON.stringify(["combat", "jewelrycrafting", "mining"])
    && !Object.values(roles).some((l) => l.includes("alchemy")) && JSON.stringify(DEFAULTS.roles) === JSON.stringify({ ...(KITCHEN ? ROLES_KITCHEN : ROLES_030), Second: { role: "fighter", craft: ["weaponcrafting"] } });
  cases.push([`4a. Third's roles: gearcrafting and cooking, fishing; Fourth jewelrycrafting and mining (woodcutting is Second's); alchemy nobody's; DEFAULTS.roles ${KITCHEN ? "the kitchen's" : "030's (KITCHEN off)"}, Second a fighter (039b)`, ok,
    Object.entries(roles).map(([n, l]) => `${n}: ${l.join(", ")}`).join(" | ")]);
  // tier (3): every earlier candidate of Third blocked (its gear craft's train step and craft-ahead too), no fighter resting
  const tier3 = (fishing: number, extra: string[] = []): Step => {
    let wx: World = { ...of(NEW, { characters: fx.world.characters.map((c) => (c.name === "Third" ? { ...c, fishing_level: fishing, cooking_level: 32 } : c)) }), current: {} };
    const block = (keys: string[]): World => ({ ...wx, blocked: { ...wx.blocked, ...Object.fromEntries(keys.map((k) => [`${k}@Third`, { until: wx.now + 3.6e6, why: "check" }])) } });
    wx = block([`lvl:gearcrafting:${craftTarget(wx)}`, ...extra]);
    for (let i = 0; i < 4; i++) {
      const r = rank("Third", wx);
      if (r.step.reason?.rule === "craft-ahead") return r.step;
      wx = block(cands(r).map((c) => c.target.key).filter((k) => !/^lvl:(fishing|cooking):/.test(k)));
    }
    return rank("Third", wx).step;
  };
  const a = tier3(22), b = tier3(30), c = tier3(30, [b.target]);
  cases.push(["4b. Third at fishing 22 / cooking 32 → its tier (3) names fishing 30; at 30 / 32 → fishing and cooking 40",
    a.target === "lvl:fishing:30" && a.reason?.rule === "craft-ahead" && [b.target, c.target].sort().join() === "lvl:cooking:40,lvl:fishing:40",
    `22/32: ${said(a)} | 30/32: ${said(b)} ; then ${said(c)}`]);
}

let bad = 0;
for (const [why, ok, detail] of cases) {
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${why}\n       ${detail}`);
}
console.log(bad ? `FAILED (${bad} of ${cases.length})` : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
