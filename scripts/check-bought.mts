// Task 032c (E.1): what the fleet cannot make is bought — a piece on sale is a candidate; with no chain to compare, trades are
// the judge. On the Worlds of 11-26 (scripts/fixtures/world-2026-11-26.json: Fifth at combat 30) and 11-27 (…-11-27.json, the
// live World of 00:00 UTC: First and Fifth at 31), each under this tree's DEFAULTS, with a made-up Grand Exchange:
//   1. the Death Knight Sword (no recipe: a drop) on sale at 2,979, fair by 5 trades (reference 3,000) → a bought candidate of
//      Fifth's and a need (`Need.bought`), each worker's step the purchase of one copy (rule `market`, "no source of ours", its
//      gold reserved, [deposit-all, ge-buy, deposit-all]); the fighters' steps as without a market;
//   2. two fighters who need it (11-27 with a Perfect Bow banked: First for the Goblin Wolfrider, Fifth for the Goblin Guard) and
//      two orders of one unit → a copy each: Second buys one, and with Second's purchase in flight Third buys the other order's;
//      one unit → one copy, nobody else buys it while it is in flight, and once it is banked and worn by one fighter's step the
//      other fighter's decision is the one without a market;
//   3. the same sword at 3,800 (above 1.25 × 3,000), at a reference of 2 trades, at one from asks only → no candidate, nobody
//      buys it, and Fifth's why says which ("ask 3,800 above 1.25 × 3,000 …", "2 trades in 7 days, no price to hold the ask
//      against", "0 trades …");
//   4. a material with no source of ours (king slimeballs where nobody wins the King Slime alone: check-boss's World without
//      potions) and a reference from asks only → not bought, the shield no need (B); from 3 trades → bought, as 032b;
//   5. a piece on sale that has a chain in reach (an Elderwood Staff, 27 h to make) → no bought candidate; 032's rule 2 judges it
//      on its chain ("against … h to make") and it is bought as on 032b's tree;
//   6. no market → every decision is 032b's tree's (scripts/fixtures/bought-none-032b.json, recorded by this file's
//      `--record <tree> <out>` on 122a769); task 033 (the fighters' XP pick where they took a training's kill): 033's tree's,
//      scripts/fixtures/bought-none-033.json; task 038 (a fighter's kill priced with the food it is sent with): 038's tree's,
//      scripts/fixtures/bought-none-038.json.
// On 032b's tree (122a769) cases 1–4 fail: a piece with no recipe is no candidate, and an asks-only reference holds an ask.
//   node --import tsx scripts/check-bought.mts [--record <tree> <out.json>]
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const rec = process.argv.indexOf("--record");
const tree = rec > 0 ? process.argv[rec + 1] : ".";
const imp = (p: string) => import(pathToFileURL(`${tree}/${p}`).href);
const { setDataReader } = await imp("src/catalog/load.ts");
const { loadCatalog, item } = await imp("src/catalog/index.ts");
const { loadAtlas } = await imp("src/catalog/atlas.ts");
const { DEFAULTS } = await imp("src/plan/planner/config.ts");
// 038's roles (Second a worker): what this check tests is not Second's role (task 039b made it a fighter)
const ROLES_038 = { ...DEFAULTS.roles, Second: { role: "worker", craft: ["weaponcrafting"], gather: ["woodcutting"] } };
const { rank } = await imp("src/plan/planner/decide.ts");
setDataReader(async (name: string) => JSON.parse(await readFile(`${tree}/public/data/${name}.json`, "utf8")));
await loadCatalog();
await loadAtlas();

type W = Record<string, any>;
const worldOf = async (file: string): Promise<W> => {
  const fx = JSON.parse(await readFile(file, "utf8"));
  return { ...fx.world, config: { ...DEFAULTS, ...fx.world.config, on: { ...DEFAULTS.on, ...fx.world.config.on }, roles: ROLES_038, market: DEFAULTS.market } };
};
const W26 = await worldOf("scripts/fixtures/world-2026-11-26.json"), W27 = await worldOf("scripts/fixtures/world-2026-11-27.json");
const NAMES: string[] = W26.characters.map((c: { name: string }) => c.name);
const WORKERS = ["Second", "Third", "Fourth"], FIGHTERS = ["First", "Fifth"];
const stepsOf = (w: W) => NAMES.map((n) => { const s = rank(n, w).step; return { who: n, target: s.target, units: s.units, why: s.why }; });

if (rec > 0) {
  await writeFile(process.argv[rec + 2], JSON.stringify({ w26: stepsOf(W26), w27: stepsOf(W27) }, null, 1));
  console.log(`recorded ${NAMES.length * 2} decisions of ${tree} → ${process.argv[rec + 2]}`);
  process.exit(0);
}

const { candidatesOf, gearNeeds } = await imp("src/plan/planner/gear.ts");
const { itemsOf } = await imp("src/plan/planner/compile.ts");
const trades = (price: number, n: number) => ({ price, n, from: "trades" });
const asks = (price: number) => ({ price, n: 40, from: "asks" });
const market = (w: W, orders: [code: string, price: number, qty: number][], refs: Record<string, unknown>): W =>
  ({ ...w, market: { orders: orders.map(([code, price, quantity], i) => ({ id: `o${i}:${code}`, code, price, quantity, account: "someone" })), refs, spent: 0, account: "alverus" } });
const bank = (w: W, add: Record<string, number>): W => ({ ...w, bank: [...w.bank.filter((b: { code: string }) => !(b.code in add)), ...Object.entries(add).map(([code, quantity]) => ({ code, quantity }))] });
const ch = (w: W, n: string) => w.characters.find((c: { name: string }) => c.name === n);
const same = (w: W, base: W, names: string[]): string[] => names.filter((n) => { const s = rank(n, w).step, b = rank(n, base).step; return s.target !== b.target || s.units !== b.units; });
const DK = "death_knight_sword";
const cases: [string, boolean, string][] = [];

// ── 1. a piece with no recipe, fair by 5 trades ──
{
  const w = market(W26, [[DK, 2979, 3]], { [DK]: trades(3000, 5) });
  const cand = candidatesOf(ch(w, "Fifth"), w).bought?.has(DK);
  const need = gearNeeds(w).needs.find((n: { for: string; bought?: string[] }) => n.for === "Fifth" && n.bought?.includes(DK));
  const steps = WORKERS.map((n) => rank(n, w).step);
  const items = itemsOf(steps[0], ch(w, "Second"));
  const ok = !!cand && !!need && steps.every((s) => s.target === `buy:${DK}` && s.reason?.rule === "market" && s.units === 1 && s.withdraw?.gold === 2979 && /no source of ours; for Death Knight Sword for Fifth/.test(s.why))
    && JSON.stringify(items.map((it: { kind: string; order?: string; quantity?: number }) => [it.kind, it.order, it.quantity].filter((x) => x != null))) === JSON.stringify([["deposit-all"], ["ge-buy", `o0:${DK}`, 1], ["deposit-all"]])
    && !same(w, W26, FIGHTERS).length;
  cases.push(["1. a piece with no recipe on sale, fair by 5 trades → Fifth's bought candidate and need; each worker buys one copy; the fighters as without a market", ok,
    `candidate ${cand}; need ${need?.work} (G ${need?.G.toFixed(1)} h, H1 ${need?.H1.toFixed(1)}, H0 ${need?.H0.toFixed(1)}); ${steps.map((s) => `${s.target} [${s.reason?.rule}] ×${s.units}`).join(" | ")}; ${steps[0].why.slice(0, 200)}`]);
}

// ── 2. two fighters, two units; one unit ──
{
  const wb = bank(W27, { perfect_bow: 1 });
  const two = market(wb, [[DK, 2979, 1], [DK, 2990, 1]], { [DK]: trades(3000, 5) });
  const wants = gearNeeds(two).needs.filter((n: { bought?: string[] }) => n.bought?.includes(DK)).map((n: { for: string }) => n.for);
  const s1 = rank("Second", two).step;
  const s2 = rank("Third", { ...two, current: { ...two.current, Second: s1 } }).step;
  const one = market(wb, [[DK, 2979, 1]], { [DK]: trades(3000, 5) });
  const o1 = rank("Second", one).step, o2 = rank("Third", { ...one, current: { ...one.current, Second: o1 } }).step;
  // the copy banked, worn by First's running step; the order sold: Fifth decides as without a market
  const first = rank("First", bank(wb, { perfect_bow: 1, [DK]: 1 })).step;
  const after = { ...bank(wb, { perfect_bow: 1, [DK]: 1 }), current: { ...wb.current, First: { ...first, wear: { ...first.wear, weapon: DK } } } };
  const sold = market(after, [], { [DK]: trades(3000, 5) });
  const fifth = rank("Fifth", sold).step, fifth0 = rank("Fifth", after).step;
  const ok = wants.includes("First") && wants.includes("Fifth") && s1.target === `buy:${DK}` && s1.units === 1 && s1.work.order === `o0:${DK}` && s2.target === `buy:${DK}` && s2.units === 1 && s2.work.order === `o1:${DK}`
    && o1.target === `buy:${DK}` && o1.units === 1 && o2.target !== `buy:${DK}` && fifth.target === fifth0.target && fifth.units === fifth0.units;
  cases.push(["2. two fighters, two orders of one → a copy each (the second from the other order); one unit → one copy, the other fighter as without a market", ok,
    `wanted by ${wants.join(",")}; Second ${s1.target} ×${s1.units} ${s1.work.order}, then Third ${s2.target} ×${s2.units} ${s2.work.order}; one unit: Second ${o1.target} ×${o1.units}, Third ${o2.target}; Fifth ${fifth.target} ×${fifth.units} (no market: ${fifth0.target} ×${fifth0.units})`]);
}

// ── 3. refused: the ask, 2 trades, asks only ──
{
  const refused = (orders: [string, number, number][], ref: unknown, said: RegExp): string => {
    const w = market(W26, orders, { [DK]: ref });
    const c = candidatesOf(ch(w, "Fifth"), w);
    const why = rank("Fifth", w).step.why;
    const buys = NAMES.filter((n) => rank(n, w).step.target === `buy:${DK}`);
    return !c.bought?.has(DK) && c.rejected.some((r: { piece: string; why: string }) => r.piece === DK && said.test(r.why)) && !buys.length && said.test(why) && /market, no source of ours: [^;]*Death Knight Sword — /.test(why)
      ? "ok" : `bought ${[...(c.bought ?? [])]}; buys ${buys}; why …${why.slice(Math.max(0, why.indexOf("market, no source")), why.indexOf("market, no source") + 200)}`;
  };
  const a = refused([[DK, 3800, 3]], trades(3000, 5), /ask 3,800 above 1\.25 × 3,000 \(the median of 5 trades of 7 days\)/);
  const b = refused([[DK, 2979, 3]], trades(3000, 2), /2 trades in 7 days, no price to hold the ask against/);
  const c = refused([[DK, 2979, 3]], asks(3000), /0 trades in 7 days, no price to hold the ask against/);
  cases.push(["3. the ask above 1.25 × the reference, 2 trades, a reference from asks → no candidate, nobody buys it, Fifth's why says which", a === "ok" && b === "ok" && c === "ok", `above: ${a} · 2 trades: ${b} · asks: ${c}`]);
}

// ── 4. a material with no source of ours: asks only → not bought; 3 trades → bought ──
{
  const bare = (c: Record<string, unknown>) => ({ ...c, rune_slot: "", utility1_slot: "", utility1_slot_quantity: 0, utility2_slot: "", utility2_slot_quantity: 0 });
  const NONE = { ...W26, bank: W26.bank.filter((b: { code: string }) => !["utility", "rune"].includes(item(b.code)?.type ?? "")), characters: W26.characters.map(bare) };
  const ks = (ref: unknown) => market(NONE, [["king_slimeball", 50, 100]], { king_slimeball: ref });
  const shield = (w: W): boolean => gearNeeds(w).needs.some((n: { pieces: Map<string, number> }) => n.pieces.has("slime_shield"));
  const buys = (w: W): string[] => NAMES.filter((n) => rank(n, w).step.target === "buy:king_slimeball");
  const wa = ks(asks(50)), wt = ks(trades(50, 3));
  const why = ["First", "Fifth"].map((n) => rank(n, wa).step.why).find((x) => /King Slimeball — 0 trades in 7 days, no price to hold the ask against/.test(x));
  const ok = !shield(wa) && !buys(wa).length && !!why && shield(wt) && buys(wt).length > 0;
  cases.push(["4. king slimeballs with no source of ours: a reference from asks → not bought, the shield no need (B); from 3 trades → bought, as 032b", ok,
    `asks: shield ${shield(wa)}, buys ${buys(wa).join(",") || "none"}, why ${!!why}; 3 trades: shield ${shield(wt)}, buys ${buys(wt).join(",")}`]);
}

// ── 5. a piece with a chain in reach ──
{
  const w = market(W26, [["elderwood_staff", 1495, 3]], { elderwood_staff: trades(1700, 11) });
  const o = (rank("Second", w).market ?? []).find((x: { code: string }) => x.code === "elderwood_staff");
  const s = rank("Second", w).step;
  const ok = !candidatesOf(ch(w, "Fifth"), w).bought?.has("elderwood_staff") && !!o && Number.isFinite(o.ownH) && /against [\d.]+ h to make/.test(o.why) && o.rule === 0 && s.target === "buy:elderwood_staff";
  cases.push(["5. a piece with a chain in reach (Elderwood Staff) → no bought candidate; rule 2 judges it on its chain, as 032", ok, `${o?.why} → ${s.target}`]);
}

// ── 6. no market: 032b's decisions ──
{
  const gold = JSON.parse(await readFile("scripts/fixtures/bought-none-038.json", "utf8")) as { w26: ReturnType<typeof stepsOf>; w27: ReturnType<typeof stepsOf> };
  const now = { w26: stepsOf(W26), w27: stepsOf(W27) };
  const moved = (["w26", "w27"] as const).flatMap((k) => now[k].filter((s, i) => JSON.stringify(s) !== JSON.stringify(gold[k][i])).map((s) => `${k} ${s.who}: ${s.target} — ${s.why.slice(0, 100)}`));
  cases.push(["6. no market → every decision is 038's tree's (the Worlds of 11-26 and 11-27)", !moved.length && now.w26.length === gold.w26.length && now.w27.length === gold.w27.length, moved.join(" | ") || `${now.w26.length + now.w27.length} decisions equal`]);
}

let bad = 0;
for (const [name, ok, detail] of cases) {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok || process.env.AMMO_CHECK_VERBOSE === "1") console.log(`     ${detail}`);
  if (!ok) bad++;
}
console.log(bad ? `${bad} of ${cases.length} cases failed` : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
