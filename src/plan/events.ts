// Standing orders for time-limited map events, pure half: what the fleet does
// while an event is up, as plain queue items — sell surplus to an event
// merchant and buy the wishlist, or farm an event monster / node. The runtime
// (state/eventorders.ts) picks who runs them and puts them ahead of a queue.

import { item, itemName, monster as monsterOf, npc as npcOf, resource as resourceOf } from "../catalog";
import { canEquip, killSeconds } from "./bis";
import { ownedFightRec } from "./jobgear";
import { GEAR_SLOTS, slotCode } from "../types/api";
import type { QueueItemInput } from "./queue";
import type { ActiveEvent, BankItem, Character } from "../types/api";

/** What an event merchant may take from the bank, down to a floor — a
 *  whitelist: nothing else is ever sold. Floors keep what recipes still use
 *  (sap: small antidote + health potions; shell: iron knife); eggs and golden
 *  shrimp feed no recipe. */
export const SELL_FLOORS: Record<string, number> = { sap: 300, shell: 50, golden_shrimp: 0, golden_egg: 0 };

/** Gold the vault keeps after a shopping trip (tolls, runes, the next merchant). */
export const GOLD_FLOOR = 20_000;

const canWear = (ch: Character, code: string): boolean => {
  const it = item(code);
  return !!it && canEquip(ch, it);
};

/** Event-merchant buys in priority order, as copies the fleet should own. */
const WISHLIST: { code: string; want: (fleet: Character[]) => number }[] = [
  // Artifacts are distinct per wearer: one each, kept worn by PINNED_ARTIFACTS.
  { code: "lost_world_map", want: (f) => f.filter((c) => canWear(c, "lost_world_map")).length },
  // +35 bag space; jobgear's bestBag equips it at the next gear swap.
  { code: "backpack", want: (f) => f.filter((c) => canWear(c, "backpack")).length },
];

/** Copies of `code` the account owns: bank + every bag + every worn slot. */
function owned(code: string, bank: BankItem[], fleet: Character[]): number {
  let n = bank.reduce((t, b) => t + (b.code === code ? b.quantity : 0), 0);
  for (const ch of fleet) {
    n += (ch.inventory ?? []).reduce((t, s) => t + (s.code === code ? s.quantity : 0), 0);
    n += GEAR_SLOTS.filter((g) => slotCode(ch, g) === code).length;
  }
  return n;
}

export interface EventOrder {
  character: string;
  items: QueueItemInput[];
  text: string;
}

/**
 * A shopping trip to an event merchant: sell every whitelisted item above its
 * floor, then buy the wishlist in priority order with bank gold + the sales,
 * keeping GOLD_FLOOR — stopping at the first wish it can't fully pay for, so
 * the gold waits for that one. undefined = nothing to trade.
 */
export function merchantOrder(npc: string, bank: BankItem[], bankGold: number, fleet: Character[]): Omit<EventOrder, "character"> | undefined {
  const shop = npcOf(npc)?.items ?? [];
  const items: QueueItemInput[] = [];
  const text: string[] = [];
  let budget = bankGold - GOLD_FLOOR;
  for (const o of shop) {
    const qty = owned(o.code, bank, []) - (SELL_FLOORS[o.code] ?? Infinity);
    if (!o.sell_price || o.currency !== "gold" || qty <= 0) continue;
    items.push({ kind: "sell", code: o.code, quantity: qty, done: 0, npc, partial: true });
    text.push(`sell ${qty} ${itemName(o.code)}`);
    budget += qty * o.sell_price;
  }
  for (const w of WISHLIST) {
    const price = shop.find((o) => o.code === w.code && o.currency === "gold")?.buy_price;
    if (!price) continue;
    const missing = w.want(fleet) - owned(w.code, bank, fleet);
    if (missing <= 0) continue;
    const n = Math.min(missing, Math.floor(Math.max(0, budget) / price));
    if (n > 0) {
      items.push({ kind: "buy", code: w.code, quantity: n, npc });
      text.push(`buy ${n} ${itemName(w.code)}`);
      budget -= n * price;
    }
    if (n < missing) break;
  }
  return items.length ? { items, text: text.join(" · ") } : undefined;
}

/**
 * The farming leg of a monster or resource event, on the candidate that does
 * it best: the fastest SAFE win from owned gear (the live gate pauses a queue
 * on a non-win, so risky never goes), or the highest skill for the node.
 * times 0 runs until the event tile disappears, which skips the item.
 */
export function fieldOrder(e: ActiveEvent, bank: BankItem[], candidates: Character[]): EventOrder | undefined {
  const c = e.map.interactions?.content;
  if (c?.type === "monster") {
    let best: { ch: Character; s: number } | undefined;
    for (const ch of candidates) {
      const rec = ownedFightRec(ch, bank, c.code);
      if (!rec?.safe) continue;
      const s = killSeconds(rec.forecast);
      if (!best || s < best.s) best = { ch, s };
    }
    if (!best) return undefined;
    const name = monsterOf(c.code)?.name ?? c.code;
    return { character: best.ch.name, items: [{ kind: "fight", monster: c.code, times: 0, done: 0, gear: true }], text: `fight ${name} until the event ends` };
  }
  if (c?.type === "resource") {
    const res = resourceOf(c.code);
    if (!res) return undefined;
    const lv = (ch: Character): number => (ch as unknown as Record<string, number>)[`${res.skill}_level`] ?? 0;
    const ch = candidates.filter((x) => lv(x) >= res.level).sort((a, b) => lv(b) - lv(a))[0];
    const drop = [...res.drops].sort((a, b) => a.rate - b.rate)[0]?.code;
    if (!ch || !drop) return undefined;
    return { character: ch.name, items: [{ kind: "gather", code: drop, resource: res.code, times: 0, done: 0, gear: true }], text: `gather ${res.name} until the event ends` };
  }
  return undefined;
}
