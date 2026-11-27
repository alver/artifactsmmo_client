// Task 032 (A): the first shopping list — read-only. Today's live World (the newest logs/world/ file, this tree's DEFAULTS under
// the snapshot's config patch, as `npm run outlook` reads it) with a market: the sell orders of the newest whole line of
// logs/market/ (one order a code: its lowest ask and the units at it; `--orders <file>`: a saved GET /grandexchange/orders
// read instead, with ids and sellers) and the references of `--refs <file>` (code → { price, n, from } or null; none given:
// none read). For every character that is on, rank()'s market verdicts (plan/planner/market.ts), deduplicated by code — the
// worker's verdict first. Prints the table, largest gain first, and `--json` the rows. No request, no file written.
//   node --import tsx --experimental-webstorage --localstorage-file=<scratch>/m.db scripts/market-list.mts [--world <file>] [--market <file>]
//     [--orders <file>] [--refs <file>] [--json]
import { readFile, readdir } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { loadAtlas } from "../src/catalog/atlas";
import { DEFAULTS } from "../src/plan/planner/config";
import { rank } from "../src/plan/planner/decide";
import { roleOf } from "../src/plan/planner/roles";
import { isOn } from "../src/plan/planner/gates";
import type { Offer } from "../src/plan/planner/market";
import type { MarketOrder, MarketRef, World } from "../src/plan/planner/types";

const arg = (k: string): string | undefined => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
await loadAtlas();
const newest = async (dir: string, ext: string): Promise<string> => `${dir}/${(await readdir(dir)).filter((f) => f.endsWith(ext)).sort().pop()}`;
const snap = JSON.parse(await readFile(arg("--world") ?? (await newest("logs/world", ".json")), "utf8")) as { t: string; world: World; planner?: { config?: Partial<World["config"]> } };
const patch = snap.planner?.config ?? {};
const config = { ...DEFAULTS, ...patch, on: { ...DEFAULTS.on, ...patch.on } } as World["config"];

let orders: MarketOrder[];
let at: string;
const sells = new Map<string, number>(); // the sell orders a code (the line's count; a read's orders below)
if (arg("--orders")) {
  const raw = JSON.parse(await readFile(arg("--orders")!, "utf8")) as { t: string; orders: (MarketOrder & { type: string })[] };
  orders = raw.orders.filter((o) => o.type === "sell");
  at = raw.t;
} else {
  const lines = (await readFile(arg("--market") ?? (await newest("logs/market", ".jsonl")), "utf8")).trim().split("\n").map((l) => JSON.parse(l));
  const full = lines.filter((l) => l.full).pop();
  at = full.t;
  orders = Object.entries(full.c as Record<string, (number | null)[]>).filter(([, r]) => r[0] != null).map(([code, r]) => ({ id: `row:${code}`, code, price: r[0]!, quantity: r[1]! }));
  for (const [code, r] of Object.entries(full.c as Record<string, number[]>)) if (r[3]) sells.set(code, r[3]);
}
const refs = arg("--refs") ? (JSON.parse(await readFile(arg("--refs")!, "utf8")) as Record<string, MarketRef | null>) : {};
const account = snap.world.characters[0]?.account;
const world: World = { ...snap.world, config, market: { orders, refs, spent: 0, account } };

const rows = new Map<string, Offer & { who: string; role: string; sells?: number }>();
const names = world.characters.map((c) => c.name).filter((n) => isOn(n, world)).sort((a, b) => Number(roleOf(b, world) === "worker") - Number(roleOf(a, world) === "worker"));
for (const name of names) {
  for (const o of rank(name, world).market ?? []) if (!rows.has(o.code)) rows.set(o.code, { ...o, who: name, role: roleOf(name, world) ?? "" });
}
const sellers = sells.size ? sells : new Map<string, number>();
if (!sells.size) for (const o of orders) sellers.set(o.code, (sellers.get(o.code) ?? 0) + 1);
const list = [...rows.values()].sort((a, b) => (b.ownH - b.buyH) - (a.ownH - a.buyH) || (a.code < b.code ? -1 : 1));
const g = (n: number): string => Math.round(n).toLocaleString("en-US");
const h = (x: number): string => (!Number.isFinite(x) ? "∞" : x < 10 ? x.toFixed(2) : x.toFixed(0));
const verdict = (o: Offer): string => (o.rule === 0 ? "buy" : o.rule === 1 ? "1: potion, food or ingredient" : o.rule === 2 ? "2: does not pay" : o.rule === 3 ? (o.ref === undefined ? "3: no reference read" : o.ref === null ? "3: no reference" : "3: above 1.25 × ref") : "4: wanted");
if (process.argv.includes("--json")) console.log(JSON.stringify({ world: snap.t, market: at, rows: list.map((o) => ({ code: o.code, key: o.key, for: o.label, who: o.who, ask: o.ask, units: o.units, atAsk: o.order.quantity, sellers: sellers.get(o.code), seller: o.order.account, ref: o.ref, buyH: o.buyH, ownH: o.ownH, rule: o.rule, why: o.why })) }));
else {
  console.log(`World ${snap.t} · market ${at} · ${orders.length} sell orders · refs ${Object.keys(refs).length}`);
  console.log("| code | for what | ask × units at it (sellers) | reference | gold ÷ goldPerHour + trip, h | own chain, h | verdict |\n|---|---|---|---|---|---|---|");
  for (const o of list.slice(0, 25)) console.log(`| ${o.code} | ${o.key} → ${o.label} (${o.who}) | ${g(o.ask)} × ${o.order.quantity} (${sellers.get(o.code) ?? "?"}) | ${o.ref ? `${g(o.ref.price)} (${o.ref.from === "trades" ? `${o.ref.n} trades` : `${o.ref.n} asks`})` : o.ref === null ? "none" : "—"} | ${h(o.buyH)} (${o.units} u) | ${h(o.ownH)} | ${verdict(o)} |`);
  console.log(`${list.length} needs with a sell order; ${list.filter((o) => o.rule === 0).length} buy (a leaf whose every parent is a piece bought itself is not: the step takes the piece)`);
}
