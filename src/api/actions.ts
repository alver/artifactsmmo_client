// Typed action calls. Each POSTs to /my/{name}/action/{action} and routes the
// response through applyActionResult, so local state stays current with zero
// extra reads. Throwing on error is left to callers (the UI shows it in the log).

import { api } from "./client";
import { applyActionResult } from "../state/apply";
import { pushLog } from "../state/store";
import type { ActionResult } from "../types/api";
import type { ItemStack } from "../types/catalog";

async function act(name: string, action: string, body?: unknown): Promise<ActionResult> {
  try {
    const data = await api<ActionResult>(`/my/${name}/action/${action}`, { method: "POST", body });
    applyActionResult(name, action, data);
    return data;
  } catch (e) {
    pushLog({ ts: Date.now(), character: name, action, text: (e as Error).message, kind: "bad" });
    throw e;
  }
}

export const move = (name: string, x: number, y: number) => act(name, "move", { x, y });
export const rest = (name: string) => act(name, "rest");
export const gather = (name: string) => act(name, "gathering");
export const fight = (name: string) => act(name, "fight");

// Secondary actions (verified array bodies from the original client). Not wired
// into step-1 buttons beyond "deposit all", but available for the next step.
export const equip = (name: string, code: string, slot: string, quantity = 1) =>
  act(name, "equip", [{ code, slot, quantity }]);
export const unequip = (name: string, slot: string, quantity = 1) =>
  act(name, "unequip", [{ slot, quantity }]);
export const depositItems = (name: string, items: ItemStack[]) => act(name, "bank/deposit/item", items);
export const withdrawItems = (name: string, items: ItemStack[]) => act(name, "bank/withdraw/item", items);

// Workshop / NPC actions (verified against the API openapi). Wired here for the
// next step; the catalog panel's Craft/Buy/Sell buttons are not yet calling them.
// All require the character to be standing on the matching workshop / NPC tile.
export const craft = (name: string, code: string, quantity = 1) => act(name, "crafting", { code, quantity });
export const recycle = (name: string, code: string, quantity = 1) => act(name, "recycling", { code, quantity });
export const npcBuy = (name: string, code: string, quantity = 1) => act(name, "npc/buy", { code, quantity });
export const npcSell = (name: string, code: string, quantity = 1) => act(name, "npc/sell", { code, quantity });
