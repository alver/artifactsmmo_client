// Task 017, settled point 14: the market read — a second standing poll beside refreshEvents (sync.ts). Every 10 minutes
// while the service is up (every 20 when the orders take more than MARKET_PAGES pages): GET /grandexchange/orders, every
// page, sell and buy orders — a public data endpoint (the docs' `data` bucket: 200 a minute, 2,000 an hour per IP; the
// account's 300 an hour are not touched) — summed up per item code into one line of logs/market/<day>.jsonl through the
// journal's file sinks (lib/journal.ts writeMarket; the harness: a Map). Nothing is bought or sold; the planner does not
// read it. A failed poll writes nothing and breaks nothing: the next one is scheduled whatever happened.
//
// A line: { t, run, n (orders), pages, full?, c: { code: [ask, at ask, on sale, sells, bid, at bid, wanted, buys] }, gone? }
// — per code the lowest ask, the quantity at it, the whole quantity on sale and the number of sell orders, then the same
// four for the highest bid (null price, zeros: no order of that side). The first line of a run and of a UTC day is whole
// (`full`); a later one holds only the codes whose numbers changed, and `gone` the codes no order names any more.
//
// Task 032 (decision 83): the market as one more source of a need. The last read's sell orders (id, code, price, quantity,
// account) are kept and handed to the runtime's World (planner.ts worldOf → marketOf) with the references the service has:
// per code that passed the core's rules 1 and 2 (plan/planner/market.ts), the median unit price of its trades of 7 days
// (GET /grandexchange/history/{code}, a public data endpoint, at most once an hour a code), else the median of its lowest
// ask over 72 h of logs/market/ once it has been on sale for 24 h, else none. The day's gold is the `spend` records' (what
// "market"); the wanted list is the latest decisions'. The synced `marketState` and the status's `market` show them.

import { signal } from "@preact/signals";
import { ApiError, getAllPages } from "../api/client";
import { RUN, devlog } from "../lib/devlog";
import { journal, journalDay, marketDay, onRecord, writeMarket } from "../lib/journal";
import type { Rec } from "../lib/journal";
import { MARKET_WINDOWS } from "../plan/planner/config";
import { refText } from "../plan/planner/market";
import type { Offer } from "../plan/planner/market";
import type { Market, MarketOrder, MarketRef } from "../plan/planner/types";
import { account, characters } from "./store";

export interface Order { id: string; type: "sell" | "buy"; code: string; quantity: number; price: number; account?: string | null }
export type Row = [ask: number | null, atAsk: number, onSale: number, sells: number, bid: number | null, atBid: number, wanted: number, buys: number];

export const MARKET_MS = 10 * 60_000;
export const MARKET_SLOW_MS = 20 * 60_000;
export const MARKET_PAGES = 10;
const PAGE = 100; // getAllPages' page size

/** Per code: the lowest ask and the quantity at it, the quantity on sale, the sell orders; the same for the highest bid. */
export function marketRows(orders: Order[]): Record<string, Row> {
  const out: Record<string, Row> = {};
  for (const o of orders) {
    const r: (number | null)[] = (out[o.code] ??= [null, 0, 0, 0, null, 0, 0, 0]);
    const i = o.type === "sell" ? 0 : 4;
    const p = r[i];
    if (p == null || (o.type === "sell" ? o.price < p : o.price > p)) { r[i] = o.price; r[i + 1] = o.quantity; }
    else if (o.price === p) r[i + 1] = (r[i + 1] ?? 0) + o.quantity;
    r[i + 2] = (r[i + 2] ?? 0) + o.quantity;
    r[i + 3] = (r[i + 3] ?? 0) + 1;
  }
  return out;
}

export interface Last { day: string; rows: Record<string, Row> }
/** The line a poll writes, against what the last line left: whole at a run's first poll and a day's, else the changes. */
export function marketLine(orders: Order[], t: number, pages: number, last: Last | undefined): { rec: Record<string, unknown>; last: Last } {
  const rows = marketRows(orders), day = new Date(t).toISOString().slice(0, 10);
  const full = !last || last.day !== day;
  const c: Record<string, Row> = {};
  for (const [code, r] of Object.entries(rows)) if (full || JSON.stringify(last!.rows[code]) !== JSON.stringify(r)) c[code] = r;
  const gone = full ? [] : Object.keys(last!.rows).filter((code) => !rows[code]);
  const rec = { t: new Date(t).toISOString(), run: RUN, n: orders.length, pages, ...(full ? { full: true } : {}), c, ...(gone.length ? { gone } : {}) };
  return { rec, last: { day, rows } };
}

let last: Last | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

async function poll(): Promise<void> {
  let wait = MARKET_MS;
  try {
    const orders = await getAllPages<Order>("/grandexchange/orders");
    const pages = Math.max(1, Math.ceil(orders.length / PAGE));
    if (pages > MARKET_PAGES) wait = MARKET_SLOW_MS;
    const l = marketLine(orders, Date.now(), pages, last);
    writeMarket(l.rec);
    last = l.last;
    sells = orders.filter((o) => o.type === "sell").map(({ id, code, price, quantity, account: a }) => ({ id, code, price, quantity, account: a }));
  } catch {
    /* a failed poll writes nothing; the next one retries */
  }
  timer = setTimeout(() => void poll(), wait);
}

/** The market poll: one read at once (a whole line at boot), then every 10 (or 20) minutes. Server only, started once. */
export function startMarket(): void {
  if (timer) return;
  timer = setTimeout(() => void poll(), 0);
}

// ── task 032: the market as a source of a need ──────────────────────────────

let sells: MarketOrder[] | undefined; // the last read's sell orders; none before the first read: no market in the World
const refs = new Map<string, { ref?: MarketRef | null; at: number }>(); // by code: the reference and when it was read

/** The Grand Exchange as the runtime's World carries it (undefined before the first read). */
export function marketOf(now: number): Market | undefined {
  if (!sells) return undefined;
  const r: Record<string, MarketRef | null> = {};
  for (const [code, x] of refs) if (x.ref !== undefined) r[code] = x.ref;
  return { orders: sells, refs: r, spent: today(now).reduce((s, b) => s + (Number(b.q) || 0), 0), account: account.value?.username ?? Object.values(characters.value)[0]?.account };
}
/** An order the counter found gone or at another price: no decision takes it again before the next read. */
export const dropOrder = (id: string): void => void (sells = sells?.filter((o) => o.id !== id));
/** Task 032c: an order bought from holds what the counter read less what was bought — the next decision does not take the
 *  units again before the next read (11-27 14:13: an emptied order picked again, "the order is gone", a 6 h block). */
export const soldFrom = (id: string, left: number): void => void (sells = sells?.map((o) => (o.id === id ? { ...o, quantity: left } : o)).filter((o) => o.quantity > 0));

const median = (xs: number[]): number => {
  const a = [...xs].sort((x, y) => x - y), m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const dayOf = (t: number): string => new Date(t).toISOString().slice(0, 10);

/** A code's lowest ask at each line of logs/market/ over the last 72 h, oldest first (the lines replayed from each day's whole one). */
export function asksOf(code: string, now: number): { t: number; ask: number }[] {
  const from = now - MARKET_WINDOWS.asksMs, out: { t: number; ask: number }[] = [];
  for (let d = Date.parse(dayOf(from)); d <= now; d += 86_400_000) {
    let row: Row | undefined;
    for (const l of marketDay(dayOf(d))) {
      const t = Date.parse(String(l.t)), c = (l.c as Record<string, Row> | undefined)?.[code];
      if (l.full || (l.gone as string[] | undefined)?.includes(code)) row = undefined;
      if (c) row = c;
      if (t >= from && t <= now && row?.[0] != null) out.push({ t, ask: row[0] });
    }
  }
  return out;
}

interface Trade { price: number; quantity: number; sold_at: string }
/** B.3: the median unit price of the code's trades of 7 days; with none, of its lowest asks over 72 h once it has been on sale
 *  for 24 h; else none. */
async function refOf(code: string, now: number): Promise<MarketRef | null> {
  let trades: Trade[] = [];
  try {
    trades = await getAllPages<Trade>(`/grandexchange/history/${code}`); // every page: the API answers oldest first (read of 11-27)
  } catch (e) {
    if (!(e instanceof ApiError && e.code === 404)) throw e; // 404: no history
  }
  const prices = trades.filter((t) => Date.parse(t.sold_at) >= now - MARKET_WINDOWS.tradesMs).map((t) => t.price);
  if (prices.length) return { price: median(prices), n: prices.length, from: "trades" };
  const asks = asksOf(code, now);
  return asks.length && asks[0].t <= now - MARKET_WINDOWS.onSaleMs && sells?.some((o) => o.code === code) ? { price: median(asks.map((a) => a.ask)), n: asks.length, from: "asks" } : null;
}

const pending = new Set<string>();
let reading = false;
/** The references the core asked for (codes that passed rules 1 and 2): each read at most once an hour, one at a time. */
export function wantRefs(codes: string[]): void {
  const now = Date.now();
  for (const c of codes) if (now - (refs.get(c)?.at ?? -Infinity) >= MARKET_WINDOWS.readMs) pending.add(c);
  if (!reading && pending.size) void readRefs();
}
async function readRefs(): Promise<void> {
  reading = true;
  try {
    for (const code of [...pending]) {
      pending.delete(code);
      const at = Date.now();
      refs.set(code, { at }); // a failed read waits its hour too
      const ref = await refOf(code, at).catch(() => undefined);
      refs.set(code, { ref, at });
      devlog(`market: ${code} — ${ref === undefined ? "the history read failed" : ref ? `reference ${refText(ref)}` : "no reference (no trade in 7 days, under 24 h on sale)"}`);
    }
  } finally {
    reading = false;
  }
}

// the day's purchases: today's `spend` records of the market (read from the day's journal once, then as they are written)
let spentDay = "";
const buys: Rec[] = [];
const isBuy = (r: Rec): boolean => r.k === "spend" && r.what === "market";
function today(now: number): Rec[] {
  const day = dayOf(now);
  if (spentDay !== day) {
    spentDay = day;
    buys.splice(0, buys.length, ...journalDay(day).filter(isBuy));
  }
  return buys;
}
onRecord((r) => {
  if (isBuy(r) && String(r.t).slice(0, 10) === spentDay) {
    buys.push(r);
    publish();
  }
});

export interface MarketState {
  day: string; spent: number;
  buys: { t: string; who: string; code: string; units: number; price: number; ref?: number; order: string }[];
  wanted: { code: string; ask: number; units: number; gold: number; saves: number; for: string; why: string }[];
}
/** Task 032 (B.7): the day's gold spent, the purchases, the wanted list — the page's season strip and the status's `market`. */
export const marketState = signal<MarketState>({ day: "", spent: 0, buys: [], wanted: [] });
const offersBy = new Map<string, Offer[]>();
const said = new Set<string>();
/** A decision's offers (decide.ts rank): the references it lacks are read, a wanted need is said once a day, the state shown. */
export function noteOffers(name: string, offers: Offer[] | undefined): void {
  const list = offers ?? [];
  offersBy.set(name, list);
  wantRefs(list.filter((o) => o.rule === 3 && o.ref === undefined).map((o) => o.code));
  const day = dayOf(Date.now());
  for (const o of list) {
    if (o.rule !== 4 || said.has(`${day}|${o.code}`)) continue;
    said.add(`${day}|${o.code}`);
    devlog(`market: wanted — ${o.why}; for ${o.label}`);
    journal("market", { what: "wanted", who: name, code: o.code, ask: o.ask, units: o.units, gold: o.gold, saves: Math.round((o.ownH - o.buyH) * 10) / 10, for: o.label, why: o.why, order: o.order.id });
  }
  publish();
}
function publish(): void {
  const now = Date.now(), b = today(now);
  const wanted = new Map<string, MarketState["wanted"][number]>();
  for (const list of offersBy.values()) for (const o of list) {
    const w = { code: o.code, ask: o.ask, units: o.units, gold: o.gold, saves: Math.round((o.ownH - o.buyH) * 10) / 10, for: o.label, why: o.why };
    if (o.rule === 4 && !(wanted.get(o.code)?.saves! >= w.saves)) wanted.set(o.code, w);
  }
  marketState.value = {
    day: spentDay, spent: b.reduce((s, x) => s + (Number(x.q) || 0), 0),
    buys: b.map((x) => ({ t: String(x.t), who: String(x.who), code: String(x.item), units: Number(x.units), price: Number(x.price), ...(x.ref != null ? { ref: Number(x.ref) } : {}), order: String(x.order) })),
    wanted: [...wanted.values()],
  };
}
