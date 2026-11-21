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

import { getAllPages } from "../api/client";
import { RUN } from "../lib/devlog";
import { writeMarket } from "../lib/journal";

export interface Order { id: string; type: "sell" | "buy"; code: string; quantity: number; price: number }
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
