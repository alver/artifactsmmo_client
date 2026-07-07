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
// Season-8 batch forms: one request swaps many slots (cooldown 3s × items).
export const equipMany = (name: string, items: { code: string; slot: string; quantity?: number }[]) =>
  act(name, "equip", items.map((i) => ({ code: i.code, slot: i.slot, quantity: i.quantity ?? 1 })));
export const unequipMany = (name: string, slots: { slot: string; quantity?: number }[]) =>
  act(name, "unequip", slots.map((s) => ({ slot: s.slot, quantity: s.quantity ?? 1 })));
export const depositItems = (name: string, items: ItemStack[]) => act(name, "bank/deposit/item", items);
export const withdrawItems = (name: string, items: ItemStack[]) => act(name, "bank/withdraw/item", items);

// Workshop / NPC actions (verified against the API openapi). All require the
// character to be standing on the matching workshop / NPC tile.
export const craft = (name: string, code: string, quantity = 1) => act(name, "crafting", { code, quantity });
export const recycle = (name: string, code: string, quantity = 1) => act(name, "recycling", { code, quantity });
export const npcBuy = (name: string, code: string, quantity = 1) => act(name, "npc/buy", { code, quantity });
export const npcSell = (name: string, code: string, quantity = 1) => act(name, "npc/sell", { code, quantity });

// Bank gold + expansion. Body field names verified against the openapi
// (DepositWithdrawGoldSchema = { quantity }). The gold ops echo the new bank
// total as data.bank = { quantity }; buy_expansion echoes no bank details, so
// callers should reconcile() once after it succeeds.
export const depositGold = (name: string, quantity: number) => act(name, "bank/deposit/gold", { quantity });
export const withdrawGold = (name: string, quantity: number) => act(name, "bank/withdraw/gold", { quantity });
export const buyExpansion = (name: string) => act(name, "bank/buy_expansion");

// Inventory item actions. use/delete bodies are SimpleItemSchema { code, quantity }.
export const use = (name: string, code: string, quantity = 1) => act(name, "use", { code, quantity });
export const deleteItem = (name: string, code: string, quantity = 1) => act(name, "delete", { code, quantity });

// Map transition (enter/exit an interior). Only valid on a tile whose
// interactions.transition is non-null. No body.
export const transition = (name: string) => act(name, "transition");

// Tasks. The task master tile must match the task type (items / monsters).
// new/complete/exchange/cancel take no body; trade is SimpleItemSchema.
export const taskNew = (name: string) => act(name, "task/new");
export const taskComplete = (name: string) => act(name, "task/complete");
export const taskExchange = (name: string) => act(name, "task/exchange");
export const taskCancel = (name: string) => act(name, "task/cancel");
export const taskTrade = (name: string, code: string, quantity: number) => act(name, "task/trade", { code, quantity });

// Claim a pending account reward (achievement payout — see /my/pending_items).
// The items drop into THIS character's inventory; echoes { cooldown, item,
// character }, so applyActionResult keeps state current.
export const claimItem = (name: string, id: string) => act(name, `claim_item/${id}`);

// Give gold / items to another character. Verified field names: { quantity,
// character } and { items, character } (NOT character_name). Both the giver
// (data.character) and recipient (data.receiver_character) are echoed, so
// applyActionResult folds both — no staleness, no extra read.
export const giveGold = (name: string, toCharacter: string, quantity: number) =>
  act(name, "give/gold", { quantity, character: toCharacter });
export const giveItems = (name: string, toCharacter: string, items: ItemStack[]) =>
  act(name, "give/item", { items, character: toCharacter });
