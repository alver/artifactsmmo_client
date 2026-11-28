// Task 032b (D.1): a boss is a source of its drops, the market the other one — on the World of 11-26
// (scripts/fixtures/world-2026-11-26.json, its config under this tree's DEFAULTS; First at combat 29, Fifth at 30, both
// wearing an iron shield; the bank holds no king slimeball):
//   1. a character admitted against the King Slime alone (as its kill step would fight it: with POTIONS off, the pool without the
//      bank's potions — the stacks worn stay; here Third, a worker) and a fighter whose solve prefers the slime shield → the shield is a need, the
//      King Slime's kills a src:king_slimeball step's work, the cloth a mat: trade by today's rules; with the material in the
//      bank Third (the gearcrafter) has the craft as a candidate; with two shields in the bank the fighters' next fight steps
//      wear one;
//   2. king slimeballs on sale at a fair ask for less than half the kills' hours → a worker's purchase; at an ask whose gold
//      is more than half → not bought (rule 2), the kills stay a candidate;
//   3. nobody admitted alone (the World without its potions and healing runes, bank and worn: p 0) and a fair ask → the shield a need, its
//      slimeballs bought under B.2 ("no source of ours"); the ask above 1.25 × the reference, or no sell order → no need, no
//      leaf, the fighters' whys say the market's answer;
//   4. nobody admitted alone and no market → every decision is 032's tree's (scripts/fixtures/boss-none-032.json, recorded
//      by this file's `--record <tree> <out>` on 163d6c3); task 033 (the fighters' XP pick where they took a training's kill):
//      033's tree's, scripts/fixtures/boss-none-033.json; task 038 (a fighter's kill priced with the food it is sent with):
//      038's tree's, scripts/fixtures/boss-none-038.json.
// On 032's tree (163d6c3) cases 1–3 fail: a boss is no source (`a boss (group fight)`).
//   node --import tsx scripts/check-boss.mts [--record <tree> <out.json>]
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const rec = process.argv.indexOf("--record");
const tree = rec > 0 ? process.argv[rec + 1] : ".";
const imp = (p: string) => import(pathToFileURL(`${tree}/${p}`).href);
const { setDataReader } = await imp("src/catalog/load.ts");
const { loadCatalog } = await imp("src/catalog/index.ts");
const { loadAtlas } = await imp("src/catalog/atlas.ts");
const { DEFAULTS } = await imp("src/plan/planner/config.ts");
const { rank } = await imp("src/plan/planner/decide.ts");
setDataReader(async (name: string) => JSON.parse(await readFile(`${tree}/public/data/${name}.json`, "utf8")));
await loadCatalog();
await loadAtlas();

const fx = JSON.parse(await readFile("scripts/fixtures/world-2026-11-26.json", "utf8"));
const config = { ...DEFAULTS, ...fx.world.config, on: { ...DEFAULTS.on, ...fx.world.config.on }, roles: DEFAULTS.roles };
const w0 = { ...fx.world, config };
const NAMES: string[] = w0.characters.map((c: { name: string }) => c.name);
// nobody admitted against the King Slime alone: the World without its potions and healing runes (in the bank and worn) — with
// POTIONS off (task 031) a boss is judged on the pool without the bank's potions, as its kill step would fight it (the worn
// stacks stay): p 0 for everyone without them
const { item } = await imp("src/catalog/index.ts");
const bare = (c: Record<string, unknown>) => ({ ...c, rune_slot: "", utility1_slot: "", utility1_slot_quantity: 0, utility2_slot: "", utility2_slot_quantity: 0 });
const NONE = { ...w0, bank: w0.bank.filter((b: { code: string }) => !["utility", "rune"].includes(item(b.code)?.type ?? "")), characters: w0.characters.map(bare) };
const POT = w0;
const stepsOf = (w: unknown) => NAMES.map((n) => { const s = rank(n, w).step; return { who: n, target: s.target, units: s.units, why: s.why }; });

if (rec > 0) {
  await writeFile(process.argv[rec + 2], JSON.stringify(stepsOf(NONE), null, 1));
  console.log(`recorded ${NAMES.length} decisions of ${tree} → ${process.argv[rec + 2]}`);
  process.exit(0);
}

const { admitted: admitted0 } = await imp("src/plan/planner/reach.ts");
const { bossWorld } = await imp("src/plan/planner/consumables.ts");
// admitted alone as a source judges it (task 032b: a boss on the World its kill step would fight in)
const admitted = (c: unknown, w: W, m: string): boolean => admitted0(c, bossWorld(w, m), m);
const { gearPieces } = await imp("src/plan/planner/gear.ts");
const { billOf, recipeDemand } = await imp("src/plan/planner/supply.ts");
type W = typeof w0;
const bank = (w: W, add: Record<string, number>): W => ({ ...w, bank: [...w.bank.filter((b: { code: string }) => !(b.code in add)), ...Object.entries(add).map(([code, quantity]) => ({ code, quantity }))] });
const market = (w: W, ask: number | undefined, ref: number | null): W => ({ ...w, market: { orders: ask == null ? [{ id: "x", code: "copper_ore", price: 1, quantity: 1, account: "someone" }] : [{ id: "k1", code: "king_slimeball", price: ask, quantity: 100, account: "someone" }], refs: { king_slimeball: ref == null ? null : { price: ref, n: 30, from: "trades" } }, spent: 0, account: "alverus" } });
const shieldFor = (w: W): string[] => [...(gearPieces(w).get("slime_shield")?.copies.keys() ?? [])];
const cand = (w: W, n: string, key: string) => [...rank(n, w).supply].find((c: { target: { key: string } }) => c.target.key === key);
const cases: [string, boolean, string][] = [];

// ── 1. the boss a source ──
{
  const adm = NAMES.filter((n) => admitted(POT.characters.find((c: { name: string }) => c.name === n), POT, "king_slime"));
  const kill = NAMES.map((n) => ({ n, c: cand(POT, n, "src:king_slimeball") })).find((x) => x.c);
  const bill = billOf(POT, "First", recipeDemand("slime_shield", 1));
  const leaves = [...bill.leaves.values()].map((l: { key: string; work: { kind: string; monster?: string } }) => `${l.key} (${l.work.kind}${l.work.monster ? ` ${l.work.monster}` : ""})`);
  const made = bank(POT, { king_slimeball: 12, cloth: 6, hardwood_plank: 100 });
  const third = cand(made, "Third", "gear:slime_shield"), others = NAMES.filter((n) => n !== "Third" && cand(made, n, "gear:slime_shield"));
  const worn = bank(POT, { slime_shield: 2 });
  const wears = ["First", "Fifth"].map((n) => { const s = rank(n, worn).step; return `${n}: ${s.target} ${s.wear?.shield ?? "—"}`; });
  const ok = adm.length > 0 && adm.includes(kill?.n ?? "") && shieldFor(POT).some((n) => n === "First" || n === "Fifth") && kill?.c.step.work.kind === "kill" && kill.c.step.work.monster === "king_slime"
    && leaves.some((l) => l.startsWith("src:king_slimeball (kill king_slime")) && leaves.some((l) => l.startsWith("mat:cloth")) && !!third && !others.length && wears.every((x) => x.endsWith("slime_shield"));
  cases.push(["1. admitted alone → the slime shield a fighter's need, the King Slime's kills a src: step of the one admitted, the cloth a trade, Third's craft, worn next", ok,
    `admitted ${adm.join(",")}; shield for ${shieldFor(POT).join(",")}; kill candidate of ${kill?.n}: ${kill?.c.step.why.slice(0, 120)}; bill ${leaves.join(", ")}; Third's craft ${!!third}, others ${others.join(",") || "none"}; ${wears.join(" · ")}`]);
}

// ── 2. the market beside the kills ──
{
  const cheap = market(POT, 50, 50), dear = market(POT, 2500, 2500);
  const buy = NAMES.map((n) => rank(n, cheap).step).find((s: { target: string }) => s.target === "buy:king_slimeball");
  const offer = (rank("Second", dear).market ?? []).find((o: { code: string }) => o.code === "king_slimeball");
  const noBuy = NAMES.every((n) => rank(n, dear).step.target !== "buy:king_slimeball");
  const still = NAMES.some((n) => cand(dear, n, "src:king_slimeball"));
  const ok = !!buy && /against [\d.]+ h to make/.test(buy.why) && offer?.rule === 2 && /more than half/.test(offer.why) && noBuy && still;
  cases.push(["2. a fair ask under half the kills' hours → bought; over half → killed", ok, `bought: ${buy?.character} ${buy?.why.slice(0, 170)} · dear: ${offer?.why} · the kill candidate stays: ${still}`]);
}

// ── 3. no source of ours ──
{
  const adm = NAMES.filter((n) => admitted(NONE.characters.find((c: { name: string }) => c.name === n), NONE, "king_slime"));
  const fair = market(NONE, 50, 50);
  const offer = (rank("Second", fair).market ?? []).find((o: { code: string }) => o.code === "king_slimeball");
  const buy = NAMES.map((n) => rank(n, fair).step).find((s: { target: string }) => s.target === "buy:king_slimeball");
  const refused = (w: W, said: RegExp): string => {
    const why = ["First", "Fifth"].map((n) => rank(n, w).step.why).find((x: string) => /market, no source of ours: .*King Slimeball — [^(]*\(.*Slime Shield/.test(x)) ?? "";
    return !shieldFor(w).length && !NAMES.some((n) => cand(w, n, "src:king_slimeball")) && said.test(why) ? "ok" : `pieces ${shieldFor(w).join(",")}; why …${why.slice(why.indexOf("market: "), why.indexOf("market: ") + 160)}`;
  };
  const r1 = refused(market(NONE, 100, 50), /ask 100 above 1.25 × 50/), r2 = refused(market(NONE, undefined, null), /none on sale/);
  const ok = !adm.length && shieldFor(fair).length > 0 && offer?.rule === 0 && /no source of ours/.test(offer.why) && !!buy && r1 === "ok" && r2 === "ok";
  cases.push(["3. nobody admitted alone: a fair ask → bought (B.2); above 1.25 × the reference or none on sale → no need, no leaf, the why says it", ok,
    `admitted ${adm.join(",") || "nobody"}; shield for ${shieldFor(fair).join(",")}; offer ${offer?.why}; ${buy ? `${buy.character}: ${buy.target}` : "no buy step"} · above: ${r1} · none: ${r2}`]);
}

// ── 4. nobody admitted, no market: 032's decisions ──
{
  const gold = JSON.parse(await readFile("scripts/fixtures/boss-none-038.json", "utf8")) as ReturnType<typeof stepsOf>;
  const now = stepsOf(NONE);
  const moved = now.filter((s, i) => JSON.stringify(s) !== JSON.stringify(gold[i]));
  cases.push(["4. nobody admitted alone, no market → every decision is 038's tree's", !moved.length && now.length === gold.length, moved.map((s) => `${s.who}: ${s.target} — ${s.why.slice(0, 100)}`).join(" | ") || `${now.length} decisions equal`]);
}

let bad = 0;
for (const [name, ok, detail] of cases) {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok || process.env.AMMO_CHECK_VERBOSE === "1") console.log(`     ${detail}`);
  if (!ok) bad++;
}
console.log(bad ? `${bad} of ${cases.length} cases failed` : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
