// Task 032 (decision 83, Alex: let us try the market — be careful with prices): a need may be bought on the Grand Exchange.
// The runtime's World carries the last read's sell orders and the references the service has (state/market.ts,
// `world.market`); the forward model's World has none, so the outlook, the roads and the replay buy nothing and every
// decision without a market is the one of before. A need — rank()'s: a gear piece of the plan, one copy a wearer; a mat: or
// src: leaf of a first-tier or an objective's parent, its shortfall — with a sell order is bought from its lowest ask when
//   (1) it is no potion, food or their ingredient (decision 56 stands; nothing for stock, nothing sold, no buy order);
//   (2) its gold at config.goldPerHour plus the trip (bank → the Grand Exchange → bank) is at most MARKET_PAYS of the hours
//       its own chain gives the same units (billOf as it prices today, a level road left out);
//   (3) the ask is at most MARKET_FAIR × the code's reference (no reference: not bought);
//   (4) it costs at most config.market.piece, the day's purchases (the steps in flight counted) at most config.market.day,
//       and the bank's gold after it covers what runePays asks (the floor, the fares, a due expansion) — a need that passes
//       1–3 and fails only here is wanted: shown, never bought.
// A purchase larger than (4) allows is cut to the units that fit (and judged on (2) again).
// Task 032b (B.2): a material with no source of ours (a drop of a monster or a boss nobody that is on is admitted against
// alone; not an event's) is priced in a bill by the market (`marketQuote`: its fair asks hold the units and the purse takes
// one), else it is out with the market's answer; its purchase skips rule 2 ("no source of ours": no chain to compare with).
// Task 032c: a piece the fleet cannot make is a bought candidate (gear.ts candidatesOf, `MarketNeed.bought`): rule 2 has no
// chain for it either. (B) Where rule 2 has nothing to compare with, the reference must come from at least MARKET_MIN_TRADES
// trades of 7 days — one from asks (the sellers' own standing price) or fewer trades holds no ask: not bought. And the units
// the others' purchases in flight take from an order are not on sale to this one (`bestOrder`).
// Pure.

import { item, itemName } from "../../catalog";
import { MARKET_DAY_GOLD, MARKET_FAIR, MARKET_MIN_TRADES, MARKET_PAYS, MARKET_PIECE_GOLD } from "./config";
import { stepSec } from "./cost";
import { CITY, nearestSpot, placeOf } from "./reach";
import { available } from "./stock";
import { billOf } from "./supply";
import type { MarketOrder, MarketRef, Place, World } from "./types";

/** A need as rank() hands it over: its key (gear:, mat:, src:), the units it is short of, its parent's label and score;
 *  `cons`: a potion, a food or their ingredient (rule 1). */
export interface MarketNeed { key: string; code: string; units: number; label: string; fit: number; any: number; cons?: boolean; via?: string[]; bought?: boolean }
/** A need with a sell order and the market's verdict: `rule` 0 = buy, else the first rule that refuses (4 = wanted). */
export interface Offer extends MarketNeed { order: MarketOrder; ask: number; gold: number; buyH: number; ownH: number; ref?: MarketRef | null; rule: 0 | 1 | 2 | 3 | 4; why: string; place?: Place }

/** The GE's single tile (the bank beside it: the trip, bank → exchange → bank, is about a minute with the bank's moves). */
const GE = "grand_exchange";
const fmtH = (h: number): string => (!Number.isFinite(h) ? "∞" : h < 10 ? h.toFixed(1) : String(Math.round(h)));
const g = (n: number): string => Math.round(n).toLocaleString("en-US");
export const refText = (r: MarketRef): string => `${g(r.price)} (the median of ${r.n} ${r.from === "trades" ? `trade${r.n === 1 ? "" : "s"} of 7 days` : "lowest asks over 72 h"})`;
/** Task 032c (B): with no chain of ours to compare with, a reference holds an ask only when it comes from MARKET_MIN_TRADES
 *  trades or more; else why not (undefined: it serves). */
const thin = (r: MarketRef): string | undefined => (r.from === "trades" && r.n >= MARKET_MIN_TRADES ? undefined : `${r.from === "trades" ? r.n : 0} trade${r.from === "trades" && r.n === 1 ? "" : "s"} in 7 days, no price to hold the ask against`);

/** Hours the plan's own chain takes for `units` of a code from here: billOf as it prices today, the code itself opened (not
 *  taken from the bank), a level road left out; ∞ when it cannot be had or a road is all it lacks. */
export function ownHours(world: World, name: string, code: string, units: number): number {
  const b = billOf(world, name, [[code, units]], new Map([[code, 0]]), true, undefined, false); // the own chain: no market in it
  if (b.out.length) return Infinity;
  const h = b.hours - b.gated.reduce((s, x) => s + x.hours, 0);
  return Number.isFinite(h) ? h : Infinity;
}

/** The lowest ask of a code that is not this account's (then the most units, then the id) — task 032c: less the units the
 *  others' purchases in flight take from it (`name` the deciding character). */
export function bestOrder(world: World, code: string, name = ""): MarketOrder | undefined {
  const m = world.market;
  const taken = new Map<string, number>();
  for (const [n, x] of Object.entries(world.current)) if (n !== name && x?.work.kind === "buy" && x.work.order) taken.set(x.work.order, (taken.get(x.work.order) ?? 0) + x.units);
  return m?.orders.filter((o) => o.code === code && (!m.account || o.account !== m.account)).map((o) => (taken.has(o.id) ? { ...o, quantity: o.quantity - taken.get(o.id)! } : o)).filter((o) => o.quantity > 0)
    .sort((a, b) => a.price - b.price || b.quantity - a.quantity || (a.id < b.id ? -1 : 1))[0];
}

/** Rule 4's numbers: the gold a purchase may cost, what is left of the day (the others' purchases in flight counted as
 *  spent) and the bank's gold after the floor, the fares and a due expansion. */
function purseOf(world: World, name: string): { day: number; piece: number; left: number; purse: number } {
  const m = world.market!, cfg = world.config;
  const day = cfg.market?.day ?? MARKET_DAY_GOLD, piece = cfg.market?.piece ?? MARKET_PIECE_GOLD;
  const flying = Object.entries(world.current).reduce((s, [n, x]) => s + (n !== name && x?.target.startsWith("buy:") ? x.withdraw?.gold ?? 0 : 0), 0);
  const due = (world.nextExpansion ?? Infinity) <= cfg.expansionCap ? world.nextExpansion! : 0;
  return { day, piece, left: day - m.spent - flying, purse: available("gold", world, name) - due };
}

/** Task 032b (B.2): `q` units of a code with no source of ours, as a bill prices them — the fair sell orders (not this
 *  account's, at most MARKET_FAIR × the reference; one unread yet counts as fair here, the purchase itself waits for it) hold
 *  them, cheapest first, and the purse takes one today: their gold at goldPerHour plus the trip (`hours`); else only the
 *  market's answer. Undefined without a market (the forward model) or with config.market.day 0: no source, as before. */
export function marketQuote(world: World, name: string, code: string, q: number): { hours?: number; why: string } | undefined {
  const m = world.market;
  if (!m || !((world.config.market?.day ?? MARKET_DAY_GOLD) > 0)) return undefined;
  const ref = m.refs[code], low = bestOrder(world, code, name), n = Math.ceil(q - 1e-9);
  const no = (why: string): { why: string } => ({ why: `no source of ours; market: ${why}` });
  if (!low) return no("none on sale");
  if (ref === null) return no(`ask ${g(low.price)}, no reference (no trade in 7 days, under 24 h on sale)`);
  if (ref && thin(ref)) return no(thin(ref)!); // task 032c (B)
  if (ref && low.price > MARKET_FAIR * ref.price) return no(`ask ${g(low.price)} above ${MARKET_FAIR} × ${refText(ref)}`);
  const fair = m.orders.filter((o) => o.code === code && o.quantity > 0 && (!m.account || o.account !== m.account) && (!ref || o.price <= MARKET_FAIR * ref.price)).sort((a, b) => a.price - b.price);
  let gold = 0, got = 0;
  for (const o of fair) { const k = Math.min(n - got, o.quantity); gold += k * o.price; got += k; if (got >= n) break; }
  if (got < n) return no(`only ${got} of ${n} on sale at a fair price`);
  const p = purseOf(world, name);
  if (low.price > Math.min(p.piece, p.left, p.purse)) return no(`${itemName(code)} at ${g(low.price)}: ${low.price > p.piece ? `a purchase at most ${g(p.piece)}` : low.price > p.left ? `${g(Math.max(0, p.left))} of today's ${g(p.day)} left` : "the bank's gold after it would not cover the floor, the fares and the next expansion"}`);
  const spot = nearestSpot(CITY, GE, GE, world);
  return { hours: gold / world.config.goldPerHour + (spot ? stepSec(spot.place) / 3600 : 0), why: `no source of ours: bought, ${n} for ${g(gold)}` };
}

/** Every need of `needs` with a sell order, with the market's verdict (rules 1–4 above). Empty without a market or with
 *  config.market.day 0. */
export function marketOffers(world: World, name: string, needs: MarketNeed[]): Offer[] {
  const m = world.market, cfg = world.config;
  const ch = world.characters.find((c) => c.name === name);
  if (!m || !ch || !((cfg.market?.day ?? MARKET_DAY_GOLD) > 0)) return [];
  const spot = nearestSpot(placeOf(ch), GE, GE, world);
  const trip = spot ? stepSec(spot.place) / 3600 : Infinity;
  const { day, piece, left, purse } = purseOf(world, name);
  const out: Offer[] = [];
  for (const n of needs) {
    const order = bestOrder(world, n.code, name);
    if (!order || n.units < 1) continue;
    const ask = order.price;
    const base = { ...n, order, ask, ref: m.refs[n.code], place: spot?.place };
    const judge = (units: number): { units: number; gold: number; buyH: number; ownH: number; pays: boolean } => {
      const gold = ask * units, buyH = gold / cfg.goldPerHour + trip, ownH = n.bought ? Infinity : ownHours(world, name, n.code, units); // 032c: never made
      return { units, gold, buyH, ownH, pays: buyH <= MARKET_PAYS * ownH };
    };
    const at = (units: number): string => `${itemName(n.code)} ×${units} at ${g(ask)}`;
    if (n.cons || ["utility", "consumable"].includes(item(n.code)?.type ?? "")) {
      out.push({ ...base, ...judge(Math.min(n.units, order.quantity, 100)), rule: 1, why: `${itemName(n.code)}: a potion, food or their ingredient is never bought` });
      continue;
    }
    const units0 = Math.min(n.units, order.quantity, 100); // the GE's 100 a buy
    const j0 = judge(units0);
    // task 032b (B.2): no chain of ours to compare with — rule 2 has nothing to say (∞ passes it), the why says so
    const hours = (j: typeof j0): string => `${g(j.gold)} gold is ${fmtH(j.buyH)} h with the trip ${Number.isFinite(j.ownH) ? `against ${fmtH(j.ownH)} h to make` : "— no source of ours"}`;
    if (!j0.pays) { out.push({ ...base, ...j0, rule: 2, why: `${at(units0)}: ${hours(j0)} — more than half` }); continue; }
    const ref = base.ref;
    if (!ref) { out.push({ ...base, ...j0, rule: 3, why: `${at(units0)}: ${ref === null ? "no reference — no trade in 7 days and under 24 h on sale" : "no reference read yet"}` }); continue; }
    if (!Number.isFinite(j0.ownH) && thin(ref)) { out.push({ ...base, ...j0, rule: 3, why: `${at(units0)}: ${thin(ref)}` }); continue; } // task 032c (B)
    if (ask > MARKET_FAIR * ref.price) { out.push({ ...base, ...j0, rule: 3, why: `ask ${g(ask)} above ${MARKET_FAIR} × ${refText(ref)}` }); continue; }
    // rule 4: the purse — a batch cut to what fits, else wanted
    const caps: [number, string][] = [[Math.floor(piece / ask), `a purchase at most ${g(piece)}`], [Math.floor(left / ask), `${g(Math.max(0, left))} of today's ${g(day)} left`], [Math.floor(purse / ask), `the bank's gold after it would not cover the floor, the fares and the next expansion`]];
    const units = Math.min(units0, ...caps.map(([k]) => k));
    if (units < 1) {
      const why = caps.find(([k]) => k < 1)![1];
      out.push({ ...base, ...j0, rule: 4, why: `${at(units0)} wanted (${fmtH(j0.ownH - j0.buyH)} h it would save): ${why}` });
      continue;
    }
    const j = units === units0 ? j0 : judge(units);
    if (!j.pays) { out.push({ ...base, ...j, rule: 2, why: `${at(units)}: ${hours(j)} — more than half` }); continue; }
    out.push({ ...base, ...j, rule: 0, why: `${at(units)} (reference ${refText(ref)}): ${hours(j)}` });
  }
  return out;
}
