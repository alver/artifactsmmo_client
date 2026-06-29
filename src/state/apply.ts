// The single chokepoint that folds a server action response into local state.
//
// This is what makes the no-poll design work: every action endpoint returns the
// full authoritative `character` (and bank item moves echo `bank`), so we never
// have to GET state back — we just adopt what the action already told us.

import type { ActionResult } from "../types/api";
import { bankItems, pushLog, setCharacter } from "./store";
import { saveState } from "./persist";

export function applyActionResult(name: string, action: string, data: ActionResult): void {
  if (data.character) setCharacter(data.character);
  if (Array.isArray(data.bank)) bankItems.value = data.bank; // free + authoritative
  pushLog({ ts: Date.now(), character: name, action, text: summarize(action, data), kind: "ok" });
  saveState();
}

/** Short human-readable summary of an action result, for the activity log. */
export function summarize(action: string, data: ActionResult): string {
  if (action === "gathering") {
    const items = data.details?.items ?? [];
    return items.length ? "+" + items.map((i) => `${i.quantity} ${i.code}`).join(", ") : "nothing gathered";
  }
  if (action === "fight") {
    const f = data.fight;
    return f ? `fight ${f.result} · +${f.xp} xp${f.gold ? ` · +${f.gold}g` : ""}` : "fight";
  }
  if (action === "rest") return `rested +${data.hp_restored ?? 0} hp`;
  if (action === "move") {
    const d = data.destination;
    return d ? `moved to (${d.x}, ${d.y})` : "moved";
  }
  if (action.startsWith("bank/deposit")) return "deposited to bank";
  if (action.startsWith("bank/withdraw")) return "withdrew from bank";
  if (action === "equip" || action === "unequip") return `${action}ped`;
  return action;
}
