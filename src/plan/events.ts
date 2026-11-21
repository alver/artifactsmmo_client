// Standing orders for time-limited map events, pure half: what the fleet does
// while a merchant event is up, as plain queue items — sell surplus to an event
// merchant and buy the wishlist. The runtime (state/eventorders.ts) picks who
// runs them (the planner's `merchant` interrupt). Task 018: the farming order of
// a monster or resource event (fieldOrder) is gone — the planner's core decides
// those (src/plan/planner/events.ts).

import { item, itemName, itemUses, npc as npcOf } from "../catalog";
import { canEquip } from "./bis";
import { GEAR_SLOTS, slotCode } from "../types/api";
import type { QueueItemInput } from "./queue";
import type { BankItem, Character } from "../types/api";

/** What an event merchant may take from the bank, down to a floor — a
 *  whitelist: nothing else is ever sold. Task 015, settled point 6: and never a
 *  code any recipe uses (merchantOrder), so sap (potions) and shell (iron knife)
 *  are no longer sold; eggs and golden shrimp feed no recipe. */
export const SELL_FLOORS: Record<string, number> = { sap: 300, shell: 50, golden_shrimp: 0, golden_egg: 0 };

/** Gold the vault keeps after a shopping trip (tolls, runes, the next merchant). */
export const GOLD_FLOOR = 20_000;

const canWear = (ch: Character, code: string): boolean => {
  const it = item(code);
  return !!it && canEquip(ch, it);
};

/** Event-merchant buys in priority order, as copies the fleet should own. Backpacks are no longer
 *  bought (report 005, decision 2): the gold is kept for boat and forest fares. */
const WISHLIST: { code: string; want: (fleet: Character[]) => number }[] = [
  // Artifacts are distinct per wearer: one each, kept worn by PINNED_ARTIFACTS.
  { code: "lost_world_map", want: (f) => f.filter((c) => canWear(c, "lost_world_map")).length },
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
    // task 015, settled point 6: nothing a recipe can use is sold
    if (!o.sell_price || o.currency !== "gold" || qty <= 0 || itemUses(o.code).recipes.length) continue;
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
