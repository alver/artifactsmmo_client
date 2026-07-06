// NPC market lookups over the static catalog. Pure and offline.
//
// This module once held the full acquisition resolver (demand-map DFS turning
// target items into withdraw/gather/craft/... steps). That planner layer was
// removed — the queue's simple items are the only execution vocabulary now — so
// just the lookups the queue still needs live here.

import { catalog } from "../catalog";

/** The NPC that buys `code` for gold (best price first), with that price. */
export function npcForSell(code: string): { code: string; price: number } | undefined {
  try {
    let best: { code: string; price: number } | undefined;
    for (const n of catalog().npcs.values()) {
      const s = n.items?.find((i) => i.code === code && i.currency === "gold" && i.sell_price != null);
      if (s && (!best || (s.sell_price as number) > best.price)) best = { code: n.code, price: s.sell_price as number };
    }
    return best;
  } catch {
    return undefined;
  }
}
