// npm run market -- [--from <ISO>] [--to <ISO>] [--code a,b] [--all] [--dir <dir> | --file <file.jsonl>]
//
// Task 017, settled point 14: the reader of the market read (src/state/market.ts, logs/market/<day>.jsonl). Read-only. It
// replays the lines in order (a `full` line is the whole book; a later one the codes that changed and `gone`), and per code
// over the window (the last 24 hours by default) prints the lowest ask — first, last, lowest, median, highest — the
// quantity on sale and the highest bid at the window's end. By default the codes the planner makes or gathers for its
// fights: every potion and food with a recipe (consumables.ts potionCands, foodCands) and their ingredients; --code names
// codes, --all takes every code seen. Beside each, when logs/world/<day>.json (the day's snapshot) holds the World: the
// fleet's own seconds a unit (planner/consumables.ts chainSec: the bill of 100 units by the best-placed maker, ÷ 100 — on
// the snapshot's gear only, so stock does not make it free) and what a fleet-hour of that making would cost at the last
// ask (the ask × 3600 ÷ the seconds). Writes nothing.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

type Row = [number | null, number, number, number, number | null, number, number, number];
type Line = { t: string; run: string; n: number; pages: number; full?: boolean; c: Record<string, Row>; gone?: string[] };
const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const file = arg("file");
const dir = file ? path.dirname(file) : arg("dir") ?? "logs/market";
const to = arg("to") ? Date.parse(arg("to")!) : file ? Infinity : Date.now();
const from = arg("from") ? Date.parse(arg("from")!) : file ? -Infinity : to - 24 * 3_600_000;
if (Number.isNaN(from) || Number.isNaN(to)) { console.error("--from / --to: an ISO time, e.g. 2026-11-21T09:00Z"); process.exit(1); }

const day = (t: number): string => new Date(t).toISOString().slice(0, 10);
let names: string[];
try {
  names = file ? [path.basename(file)] : readdirSync(dir).filter((f) => /^\d{4}-\d\d-\d\d\.jsonl$/.test(f) && f.slice(0, 10) >= day(from - 864e5) && f.slice(0, 10) <= day(to)).sort();
} catch {
  console.error(`no market read at ${dir}`);
  process.exit(1);
}
const lines: Line[] = [];
for (const f of names) for (const l of readFileSync(path.join(dir, f), "utf8").split("\n")) {
  if (!l.trim()) continue;
  try { lines.push(JSON.parse(l) as Line); } catch { /* a torn line */ }
}
lines.sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));

// the book as each line leaves it; per code the asks seen inside the window
const book = new Map<string, Row>();
const asks = new Map<string, number[]>();
let seen = 0, firstT = "", lastT = "", lastN = 0;
for (const l of lines) {
  if (l.full) book.clear();
  for (const [c, r] of Object.entries(l.c)) book.set(c, r);
  for (const c of l.gone ?? []) book.delete(c);
  const t = Date.parse(l.t);
  if (t < from || t > to) continue;
  seen++;
  firstT ||= l.t;
  lastT = l.t;
  lastN = l.n;
  for (const [c, r] of book) if (r[0] != null) (asks.get(c) ?? asks.set(c, []).get(c)!).push(r[0]);
}

const items = JSON.parse(readFileSync("public/data/items.json", "utf8")) as { code: string; name: string; type: string; subtype?: string; craft?: { items: { code: string }[] } }[];
const byCode = new Map(items.map((i) => [i.code, i]));
const made = items.filter((i) => i.craft && (i.type === "utility" || (i.type === "consumable" && i.subtype === "food")));
const defaults = new Set([...made.map((i) => i.code), ...made.flatMap((i) => i.craft!.items.map((g) => g.code))]);
const want = arg("code")?.split(",") ?? (process.argv.includes("--all") ? [...book.keys(), ...asks.keys()] : [...defaults]);
const codes = [...new Set(want)].filter((c) => asks.has(c) || book.has(c)).sort();

// the fleet's own seconds a unit, from the day's snapshot (the World decide() reads), when there is one
const chain = new Map<string, number>();
const snap = `logs/world/${day(lastT ? Date.parse(lastT) : Date.now())}.json`;
if (codes.length && existsSync(snap)) {
  try {
    (globalThis as { localStorage?: unknown }).localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    const { setDataReader } = await import("../src/catalog/load");
    const { loadCatalog } = await import("../src/catalog");
    const { chainSec } = await import("../src/plan/planner/consumables");
    setDataReader(async (n) => JSON.parse(readFileSync(`public/data/${n}.json`, "utf8")));
    await loadCatalog();
    // what making costs, not what the stock saves: the snapshot's World with the bank's gear only (no stock, no bags)
    const GEAR = new Set(["weapon", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring", "amulet", "artifact", "bag", "rune"]);
    const w0 = JSON.parse(readFileSync(snap, "utf8")).world;
    const world = { ...w0, bank: w0.bank.filter((b: { code: string }) => GEAR.has(byCode.get(b.code)?.type ?? "")), bags: {} };
    const on = Object.keys(world.config.on).filter((n) => world.config.on[n]);
    for (const c of codes) {
      const s = Math.min(...on.map((n) => chainSec(world, n, c)));
      if (Number.isFinite(s)) chain.set(c, s);
    }
  } catch (e) {
    console.error(`(the chain's seconds left out: ${(e as Error).message})`);
  }
}

const med = (a: number[]): number => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const f = (x: number | null | undefined): string => (x == null || !Number.isFinite(x) ? "—" : Number.isInteger(x) ? String(x) : x.toFixed(1));
console.log(`# The market ${firstT ? `${firstT.slice(0, 16)}Z → ${lastT.slice(0, 16)}Z` : "(no line in the window)"}`);
console.log(`${seen} poll line(s) in the window of ${lines.length} in ${names.length} file(s) of ${dir}; the last saw ${lastN} orders, ${book.size} codes\n`);
if (!codes.length) { console.log("none\n"); process.exit(0); }
console.log("| code | ask first | last | lowest | median | highest | on sale (end) | sell orders | bid (end) | fleet s a unit | gold a fleet-hour at the ask |");
console.log("|---|---|---|---|---|---|---|---|---|---|---|");
for (const c of codes) {
  const a = asks.get(c) ?? [], r = book.get(c), s = chain.get(c);
  const last = a.length ? a[a.length - 1] : null;
  console.log(`| ${byCode.get(c)?.name ?? c} (${c}) | ${f(a[0])} | ${f(last)} | ${a.length ? f(Math.min(...a)) : "—"} | ${a.length ? f(med(a)) : "—"} | ${a.length ? f(Math.max(...a)) : "—"} | ${r ? r[2] : 0} | ${r ? r[3] : 0} | ${f(r?.[4])} | ${f(s)} | ${s && last != null ? f((last * 3600) / s) : "—"} |`);
}
