// Task 032 (D.1): the market as one more source of a need, on the World of 11-26 (scripts/fixtures/world-2026-11-26.json, its
// config under this tree's DEFAULTS) with a made-up Grand Exchange. Every case against the same World without a market:
//   1. a gear need on sale that passes rules 1–4 (an Elderwood Staff for Fifth at 1,495, its 11 trades' median 1,700) → each
//      worker's step is the purchase of one copy (`buy:elderwood_staff`, rule `market`), its gold reserved (`withdraw`),
//      compiled to [deposit-all, ge-buy by the order's id, deposit-all]; the fighters' steps are the ones without a market;
//   2. the same ask above 1.25 × the reference (1,000) → every step as without a market; a need's own step says it (First's
//      blue slimeball kills — TRAIN_HUNT on for it, task 033 —, their slimeballs at 2 against a reference of 1: "market: ask 2
//      above 1.25 × 1 …");
//   3. no trade and under 24 h on sale (no reference) → not bought;
//   4. steel bars at 250 for a training batch → not bought (rule 2: 25,000 gold is 83 h against 2.5 h of its own chain);
//   5. an ask above a purchase's cap (an Obsidian Battleaxe at 12,000) → wanted, not bought; the day's budget spent (24,000 of
//      25,000) → the staff wanted; the next UTC day (nothing spent) → bought;
//   6. a food's or a potion's ingredient on sale (bass for catch_and_cook, glowstem leaf for potion_brewer) → not bought (rule 1);
//      config.market.day 0 → no verdict at all, every step as without a market.
// On the starting tree there is no market (rank() has no `market`, no `buy:` step): every case fails.
//   node --import tsx scripts/check-market.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { loadAtlas } from "../src/catalog/atlas";
import { DEFAULTS } from "../src/plan/planner/config";
import { rank } from "../src/plan/planner/decide";
import { itemsOf } from "../src/plan/planner/compile";
import type { Market, MarketRef, Step, World } from "../src/plan/planner/types";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
await loadAtlas();

const fx = JSON.parse(await readFile("scripts/fixtures/world-2026-11-26.json", "utf8")) as { world: World };
const config = { ...DEFAULTS, ...fx.world.config, on: { ...DEFAULTS.on, ...fx.world.config.on }, roles: DEFAULTS.roles, market: DEFAULTS.market } as World["config"];
const w0: World = { ...fx.world, config };
const NAMES = w0.characters.map((c) => c.name);
const WORKERS = ["Second", "Third", "Fourth"], FIGHTERS = ["First", "Fifth"];
const trades = (price: number, n = 11): MarketRef => ({ price, n, from: "trades" });
const of = (orders: [code: string, price: number, qty: number][], refs: Record<string, MarketRef | null>, extra: Partial<Market> = {}, cfg: Partial<World["config"]> = {}): World =>
  ({ ...w0, config: { ...config, ...cfg }, market: { orders: orders.map(([code, price, quantity], i) => ({ id: `o${i}:${code}`, code, price, quantity, account: "someone" })), refs, spent: 0, account: "alverus", ...extra } });
const base = new Map(NAMES.map((n) => [n, rank(n, w0).step]));
const same = (w: World, names = NAMES): string[] => names.filter((n) => { const s = rank(n, w).step, b = base.get(n)!; return s.target !== b.target || s.units !== b.units; });
const said = (s: Step): string => `${s.target} [${s.reason?.rule}] ×${s.units} wd ${JSON.stringify(s.withdraw)}`;
const cases: [string, boolean, string][] = [];

// ── 1. a gear need that passes 1–4 ──
{
  const w = of([["elderwood_staff", 1495, 3]], { elderwood_staff: trades(1700) });
  const steps = WORKERS.map((n) => rank(n, w).step);
  const items = itemsOf(steps[0], w.characters.find((c) => c.name === "Second")!);
  const ok = steps.every((s) => s.target === "buy:elderwood_staff" && s.reason?.rule === "market" && s.units === 1 && s.withdraw?.gold === 1495 && /reference 1,700 \(the median of 11 trades of 7 days\)/.test(s.why))
    && JSON.stringify(items.map((it) => it.kind === "ge-buy" ? [it.kind, it.order, it.price, it.quantity, it.ref] : [it.kind])) === JSON.stringify([["deposit-all"], ["ge-buy", "o0:elderwood_staff", 1495, 1, 1700], ["deposit-all"]])
    && !same(w, FIGHTERS).length;
  cases.push(["1. a gear need that passes 1–4 → each worker buys one copy (gold reserved, the order by its id); the fighters' steps unchanged", ok,
    `${steps.map(said).join(" | ")} · items ${items.map((it) => it.kind).join(", ")} · ${steps[0].why.slice(0, 160)}`]);
}

// ── 2. above 1.25 × the reference ──
{
  // task 033: First's slimeball kills are a training's — TRAIN_HUNT on for this case (029's rule), its own base beside it
  const on = { trainHunt: true };
  const w = of([["elderwood_staff", 1495, 3], ["blue_slimeball", 2, 100]], { elderwood_staff: trades(1000), blue_slimeball: trades(1, 40) }, {}, on);
  const b2 = new Map(NAMES.map((n) => [n, rank(n, { ...w0, config: { ...config, ...on } }).step]));
  const moved = NAMES.filter((n) => { const s = rank(n, w).step, b = b2.get(n)!; return s.target !== b.target || s.units !== b.units; }), first = rank("First", w).step;
  const v = (rank("Second", w).market ?? []).find((o) => o.code === "elderwood_staff");
  const ok = !moved.length && v?.rule === 3 && /ask 1,495 above 1.25 × 1,000/.test(v.why) && b2.get("First")!.target === "src:blue_slimeball" && first.why.includes("; market: ask 2 above 1.25 × 1 (the median of 40 trades of 7 days)");
  cases.push(["2. the ask above 1.25 × the reference → made as today; the need's own step's why says it", ok, `moved ${JSON.stringify(moved)} · ${v?.why} · First: …${first.why.slice(first.why.indexOf("; market:"), first.why.indexOf("; market:") + 80)}`]);
}

// ── 3. no reference: no trade, under 24 h on sale ──
{
  const w = of([["elderwood_staff", 1495, 3]], { elderwood_staff: null });
  const v = (rank("Second", w).market ?? []).find((o) => o.code === "elderwood_staff");
  const moved = same(w);
  cases.push(["3. no trade and under 24 h on sale → not bought", !moved.length && v?.rule === 3 && /no reference — no trade in 7 days and under 24 h on sale/.test(v.why), `moved ${JSON.stringify(moved)} · ${v?.why}`]);
}

// ── 4. steel bars at 250 for a training batch ──
{
  const w = of([["steel_bar", 250, 100]], { steel_bar: trades(250, 30) });
  const v = (rank("Second", w).market ?? []).find((o) => o.code === "steel_bar");
  const moved = same(w);
  cases.push(["4. steel bars at 250 for a training batch → not bought (rule 2)", !moved.length && v?.rule === 2 && v.key === "mat:steel_bar" && v.buyH > 0.5 * v.ownH, `moved ${JSON.stringify(moved)} · ${v?.why} (for ${v?.label})`]);
}

// ── 5. the purse ──
{
  const wCap = of([["obsidian_battleaxe", 12_000, 1]], { obsidian_battleaxe: trades(12_000, 3) });
  const vCap = (rank("Second", wCap).market ?? []).find((o) => o.code === "obsidian_battleaxe");
  const day = (spent: number): World => of([["elderwood_staff", 1495, 3]], { elderwood_staff: trades(1700) }, { spent });
  const vDay = (rank("Second", day(24_000)).market ?? []).find((o) => o.code === "elderwood_staff");
  const next = rank("Second", day(0)).step;
  const ok = vCap?.rule === 4 && /wanted .*a purchase at most 10,000/.test(vCap.why) && !same(wCap).length
    && vDay?.rule === 4 && /1,000 of today's 25,000 left/.test(vDay.why) && !same(day(24_000)).length && next.target === "buy:elderwood_staff";
  cases.push(["5. above a purchase's cap → wanted; the day's budget spent → wanted; the next UTC day → bought", ok, `${vCap?.why} · ${vDay?.why} · next day: ${said(next)}`]);
}

// ── 6. a food's or a potion's ingredient; the market off ──
{
  const w = of([["bass", 1, 100], ["glowstem_leaf", 1, 100]], { bass: trades(1, 30), glowstem_leaf: trades(1, 30) });
  const vs = (rank("Third", w).market ?? []).filter((o) => o.code === "bass" || o.code === "glowstem_leaf");
  const off = of([["elderwood_staff", 1495, 3]], { elderwood_staff: trades(1700) }, {}, { market: { day: 0, piece: 10_000 } });
  const ok = vs.length === 2 && vs.every((o) => o.rule === 1) && !same(w).length && !same(off).length && NAMES.every((n) => !rank(n, off).market);
  cases.push(["6. a food's or a potion's ingredient → not bought (rule 1); config.market.day 0 → nothing", ok, vs.map((o) => `${o.code} for ${o.label}: ${o.why}`).join(" · ")]);
}

let bad = 0;
for (const [name, ok, detail] of cases) {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}\n     ${detail}`);
  if (!ok) bad++;
}
console.log(bad ? `${bad} of ${cases.length} cases failed` : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
