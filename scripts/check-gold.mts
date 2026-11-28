// Task 041: gold in — the sell list, the cut, the tidy — on the zero-call service's World of 14:04 UTC on 11-28
// (scripts/fixtures/world-2026-11-28-1404.json: 20 slots free of 150, 483 ruby / 449 sapphire / 309 emerald / 514 topaz stones,
// every character wearing a Lost World Map), every character on, nothing running, DEFAULTS' roles (Fourth holds mining):
//   0. stage.json's `sell` and `cut` are read with the stages; a code the catalog does not know, one no merchant buys for
//      gold, one not made of one material are left out and named;
//   1. A.1: a listed code is sold down to its count (to the merchant that buys it); the sap in the same bank is off the list
//      and stays; a listed shell is sold though a recipe uses it (the list replaces "no recipe uses it");
//   2. A.1: no `sell` — today's order (SELL_FLOORS less what a recipe uses: the golden egg, not the shell, not the sap);
//   3. A.2: sales under 1,000 gold make no order (with no purchase);
//   4. A.3: a listed gear code a solve of today picks is kept (the Wooden Club: First's set for the Sand Snake), and one a
//      running step's `wear` names;
//   5. A.2: more than a bagful is cut to the most gold;
//   6. B: stones for 7 gems make the mining holder's cut step — whole batches withdrawn, the remainder stays, ranked first
//      with nothing to tidy —, stones for 5 make none; four products go in two steps, the second one after the first
//      whatever is left; no `cut`, no step;
//   7. C: an outdated ring with 19 slots free is tidied; with 40 free, no tidy.
// On 8953554 (039c) the check does not load (no cutStep, no soldKept; merchantOrder takes no list). node --import tsx scripts/check-gold.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { loadAtlas } from "../src/catalog/atlas";
import { DEFAULTS } from "../src/plan/planner/config";
import { rank } from "../src/plan/planner/decide";
import { itemsOf } from "../src/plan/planner/compile";
import { cutStep, soldKept, tidyStep, tidyVerdicts } from "../src/plan/planner/bank";
import { parseStages } from "../src/plan/planner/stage";
import { merchantOrder } from "../src/plan/events";
import type { BankItem, Character } from "../src/types/api";
import type { Step, World } from "../src/plan/planner/types";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
await loadAtlas();

const fx = (JSON.parse(await readFile("scripts/fixtures/world-2026-11-28-1404.json", "utf8")) as { world: World }).world;
const ALL = ["First", "Second", "Third", "Fourth", "Fifth"];
const CUT = ["ruby", "sapphire", "emerald", "topaz"];
/** stage.json's list of 11-28 (the planning chat's). */
const SELL = { ruby: 8, sapphire: 8, emerald: 8, topaz: 8, shell: 0, golden_egg: 0, golden_shrimp: 0, highwayman_dagger: 0, forest_staff: 0, forest_ring: 0, wooden_club: 0 };
const worldOf = (o: { bank?: Record<string, number>; free?: number; cut?: string[]; current?: World["current"] } = {}): World => {
  const bank = [...fx.bank.filter((b) => !(o.bank && b.code in o.bank)), ...Object.entries(o.bank ?? {}).filter(([, q]) => q > 0).map(([code, quantity]) => ({ code, quantity }))];
  return {
    ...fx, current: o.current ?? {}, costs: {}, bags: undefined, market: undefined, blocked: {}, bank, bankSlots: new Set(bank.map((b) => b.code)).size + (o.free ?? 60),
    ...(o.cut ? { cut: o.cut } : {}),
    config: { ...DEFAULTS, ...fx.config, on: Object.fromEntries(ALL.map((n) => [n, true])), roles: DEFAULTS.roles } as World["config"],
  };
};
/** The order a merchant gets on a World, as eventorders.ts asks it: the list, the keep test, the bag. */
const order = (w: World, npc: string, sell?: Record<string, number>, bag = Infinity, keep = (c: string): boolean => !!soldKept(w, c)) =>
  merchantOrder(npc, w.bank as BankItem[], w.bankGold, w.characters, sell, keep, bag);
const sells = (o: ReturnType<typeof order>): Record<string, number> => Object.fromEntries((o?.items ?? []).flatMap((it) => (it.kind === "sell" ? [[it.code, it.quantity]] : [])));
const eq = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const cases: [string, boolean, string][] = [];

// ── 0. the file ──
{
  const p = parseStages(JSON.stringify({ sell: { ruby: 8, no_such_code: 1, feather: 0 }, cut: ["ruby", "iron_sword", 7], stages: [{ name: "s", fighters: 35 }] }));
  const want = ["sell no_such_code (unknown)", "sell feather (no merchant buys it for gold)", "cut iron_sword (not made of one material)", "cut 7 (not a code)"];
  const none = parseStages(JSON.stringify({ stages: [{ name: "s", fighters: 35 }] }));
  cases.push(["0. `sell` and `cut` are read with the stages; the codes that cannot be are left out and named; no field, none", eq(p.sell, { ruby: 8 }) && eq(p.cut, ["ruby"]) && eq(p.unknown, want) && !("sell" in none) && !("cut" in none),
    `sell ${JSON.stringify(p.sell)}, cut ${JSON.stringify(p.cut)}; left out: ${p.unknown.join("; ")}`]);
}

// ── 1. A.1: a listed code down to its count; the sap stays ──
{
  const w = worldOf({ bank: { ruby: 30 } });
  const gem = order(w, "gemstone_merchant", SELL, 170), timber = order(w, "timber_merchant", SELL, 170), fish = order(w, "fish_merchant", SELL, 170);
  cases.push(["1. a listed code is sold down to its count; the sap off the list stays; a listed shell is sold though a recipe uses it", eq(sells(gem), { ruby: 22 }) && timber === undefined && eq(sells(fish), { shell: 87 }),
    `gemstone: ${gem?.text ?? "none"} (30 rubies, 3 sapphires, 7 emeralds, the list keeps 8); timber: ${timber?.text ?? "none"} (sap 1,688 in the bank); fish: ${fish?.text ?? "none"}`]);
}

// ── 2. A.1: no `sell` — today's order ──
{
  const w = worldOf({ bank: { golden_egg: 2 } });
  const got = ["nomadic_merchant", "fish_merchant", "timber_merchant", "gemstone_merchant"].map((n) => [n, sells(order(w, n))]);
  cases.push(["2. no `sell`: today's order — the golden egg; not the shell, the sap or the gems (a recipe uses them)", eq(got, [["nomadic_merchant", { golden_egg: 2 }], ["fish_merchant", {}], ["timber_merchant", {}], ["gemstone_merchant", {}]]),
    got.map(([n, s]) => `${n}: ${JSON.stringify(s)}`).join("; ")]);
}

// ── 3. A.2: under 1,000 gold, no order ──
{
  const w = worldOf();
  const under = order(w, "fish_merchant", { shell: 80 }), at = order(w, "fish_merchant", { shell: 78 });
  cases.push(["3. sales under 1,000 gold make no order (7 shells, 840 gold); 9 shells (1,080) do", under === undefined && eq(sells(at), { shell: 9 }), `7: ${under?.text ?? "none"}; 9: ${at?.text ?? "none"}`]);
}

// ── 4. A.3: a listed gear code a solve picks is kept ──
{
  const w = worldOf();
  const kept = soldKept(w, "wooden_club") ?? "";
  const nomadic = sells(order(w, "nomadic_merchant", SELL));
  const step = { key: "kill:owlbear@First#1", target: "kill:owlbear", character: "First", as: "level", work: { kind: "kill", monster: "owlbear" }, units: 1, hours: 1, score: 0, why: "", wear: { weapon: "forest_staff" } } as unknown as Step;
  const ws = worldOf({ current: { First: step } });
  const worn = sells(order(ws, "nomadic_merchant", SELL));
  cases.push(["4. a listed gear code a solve picks is kept (the Wooden Club), and one a running step wears (a Forest Staff)", kept.startsWith("in a solve") && !("wooden_club" in nomadic) && nomadic.highwayman_dagger === 13 && nomadic.forest_staff === 31 && !("forest_staff" in worn) && worn.forest_ring === 25,
    `Wooden Club: ${kept}; nomadic: ${JSON.stringify(nomadic)}; with a step wearing a Forest Staff: ${JSON.stringify(worn)}`]);
}

// ── 5. A.2: one bagful, the most gold first ──
{
  const w = worldOf();
  const o = order(w, "nomadic_merchant", SELL, 20, () => false), s = sells(o);
  const n = Object.values(s).reduce((a, b) => a + b, 0);
  cases.push(["5. more than a bagful is cut to the most gold: 13 daggers and 2 clubs (350), then 5 at 100 in a bag of 20", n === 20 && s.highwayman_dagger === 13 && s.wooden_club === 2 && (s.forest_staff ?? 0) + (s.forest_ring ?? 0) === 5,
    `${o?.text ?? "none"} (71 listed copies)`]);
}

// ── 6. B: the cut ──
{
  const stones = (r: number, t: number, s = 0, e = 0) => ({ ruby_stone: r, topaz_stone: t, sapphire_stone: s, emerald_stone: e });
  const w7 = worldOf({ cut: CUT, bank: stones(101, 82) }), w5 = worldOf({ cut: CUT, bank: stones(72 + 23, 48 + 23) });
  const s7 = cutStep(w7, "Fourth"), r7 = rank("Fourth", w7).step;
  const ch = w7.characters.find((c) => c.name === "Fourth") as Character;
  const items = s7 ? itemsOf(s7, ch).map((it) => (it.kind === "craft" ? `craft ${it.code} ${it.quantity}` : it.kind)) : [];
  const others = ALL.filter((n) => n !== "Fourth" && cutStep(w7, n));
  const five = ALL.filter((n) => cutStep(w5, n));
  const off = cutStep(worldOf({ bank: stones(101, 82) }), "Fourth");
  // four products, two batches each (8 gems): three in the first step, the fourth after it though 2 are fewer than 6
  const w8 = worldOf({ cut: CUT, bank: stones(48, 48, 48, 48) }), a = cutStep(w8, "Fourth");
  const left = Object.keys(stones(0, 0)).filter((c) => !(a?.withdraw ?? {})[c]);
  const after = worldOf({ cut: CUT, bank: { ...stones(48, 48, 48, 48), ...Object.fromEntries(Object.keys(a?.withdraw ?? {}).map((c) => [c, 0])) }, current: a ? { Fourth: a } : {} });
  const b = cutStep(after, "Fourth"), cold = cutStep({ ...after, current: {} }, "Fourth");
  cases.push(["6. stones for 7 gems: the mining holder's cut step, whole batches, the remainder stays, ranked first; for 5 none; four products in two steps; no `cut`, none",
    !!s7 && eq(s7.work.kind === "craft" && s7.work.codes, { ruby: 4, topaz: 3 }) && eq(s7.withdraw, { ruby_stone: 96, topaz_stone: 72 }) && eq(items, ["craft ruby 4", "craft topaz 3", "deposit-all"])
      && r7.as === "cut" && r7.reason?.rule === "cut" && !others.length && !five.length && !off
      && Object.keys(a?.withdraw ?? {}).length === 3 && left.length === 1 && !!b && eq(Object.keys(b.withdraw ?? {}), left) && !cold,
    `7 gems: ${s7?.why ?? "none"} — items ${items.join(", ")}; ranked: ${r7.reason?.rule} ${r7.key}; others: ${others.join(", ") || "none"}; 5 gems: ${five.join(", ") || "none"}; no cut: ${off?.key ?? "none"}; four products: ${a?.key ?? "none"} then ${b?.key ?? "none"} (cold: ${cold?.key ?? "none"})`]);
}

// ── 7. C: the tidy below 40 free ──
{
  const w19 = worldOf({ bank: { copper_ring: 3 }, free: 19 }), w40 = worldOf({ bank: { copper_ring: 3 }, free: 40 });
  const v = tidyVerdicts(w19).find((x) => x.code === "copper_ring");
  const s19 = ALL.map((n) => tidyStep(w19, n)).find(Boolean), s40 = ALL.map((n) => tidyStep(w40, n)).find(Boolean);
  cases.push(["7. an outdated ring with 19 slots free is tidied; with 40 free, no tidy", !!v?.outdated && !!s19 && s19.work.kind === "recycle" && !!s19.work.codes?.copper_ring && !s40,
    `Copper Ring: ${v?.why}; 19 free: ${s19?.key ?? "none"} — ${s19?.why ?? ""}; 40 free: ${s40?.key ?? "none"}`]);
}

let bad = 0;
for (const [name, ok, detail] of cases) {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}\n     ${detail}`);
  if (!ok) bad++;
}
console.log(bad ? `${bad} of ${cases.length} failed` : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
