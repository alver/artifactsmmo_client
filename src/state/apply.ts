// The single chokepoint that folds a server action response into local state.
//
// This is what makes the no-poll design work: every action endpoint returns the
// full authoritative `character` (and bank item moves echo `bank`), so we never
// have to GET state back — we just adopt what the action already told us.

import type { ActionResult, Character } from "../types/api";
import { bankDetails, bankItems, characters, pushLog, setCharacter } from "./store";
import { mapAt, monster as monsterOf } from "../catalog";
import { recordFight } from "../sim/validate";
import { saveState } from "./persist";

export function applyActionResult(name: string, action: string, data: ActionResult): void {
  // Snapshot the PRE-fight character before we overwrite it — the sim validator
  // needs its position (to resolve the monster) and max HP to rebuild the fighter.
  const prevForFight: Character | undefined = data.fight ? characters.value[name] : undefined;

  if (data.character) setCharacter(data.character);
  // The fight action echoes the updated fighter(s) under `characters` (plural),
  // not `character`; without this, combat HP/cooldown never reach local state.
  if (Array.isArray(data.characters)) for (const c of data.characters) setCharacter(c);
  if (data.receiver_character) setCharacter(data.receiver_character); // give/* echoes the recipient
  if (Array.isArray(data.bank)) {
    bankItems.value = data.bank; // item moves echo the full bank contents — free + authoritative
  } else if (data.bank && typeof data.bank === "object" && bankDetails.value) {
    // gold moves echo only the new bank gold total as { quantity }
    bankDetails.value = { ...bankDetails.value, gold: data.bank.quantity };
  }
  // Passive, zero-cost simulator validation: compare the forecast for this fight
  // against what actually happened. Never throws into the action path.
  if (data.fight && prevForFight) {
    try {
      const mcode = data.fight.opponent || mapAt(prevForFight.x, prevForFight.y)?.interactions.content?.code;
      const m = mcode ? monsterOf(mcode) : undefined;
      if (m) recordFight(prevForFight, m, data.fight);
    } catch {
      /* diagnostics only — must not disturb state folding */
    }
  }

  pushLog({ ts: Date.now(), character: name, action, text: summarize(name, action, data), kind: "ok" });
  saveState();
}

/** Short human-readable summary of an action result, for the activity log. */
export function summarize(name: string, action: string, data: ActionResult): string {
  const items = data.details?.items ?? [];
  const list = items.map((i) => `${i.quantity} ${i.code}`).join(", ");

  if (action === "gathering") return items.length ? "+" + list : "nothing gathered";
  if (action === "crafting") return items.length ? "crafted " + list : "crafted";
  if (action === "recycling") return items.length ? "recycled → " + list : "recycled";
  if (action === "fight") {
    const f = data.fight;
    if (!f) return "fight";
    const mine = f.characters?.find((c) => c.character_name === name) ?? f.characters?.[0];
    const xp = mine?.xp ?? 0;
    const gold = mine?.gold ?? 0;
    return `fight ${f.result} · +${xp} xp${gold ? ` · +${gold}g` : ""}`;
  }
  if (action === "rest") return `rested +${data.hp_restored ?? 0} hp`;
  if (action === "move") {
    const d = data.destination;
    return d ? `moved to (${d.x}, ${d.y})` : "moved";
  }
  if (action === "transition") return "transitioned";
  if (action === "use") return "used item";
  if (action === "delete") return "deleted item";
  if (action === "bank/deposit/gold") return "deposited gold to bank";
  if (action === "bank/withdraw/gold") return "withdrew gold from bank";
  if (action === "bank/buy_expansion") return "bought a bank expansion";
  if (action.startsWith("bank/deposit")) return "deposited to bank";
  if (action.startsWith("bank/withdraw")) return "withdrew from bank";
  if (action === "npc/buy") return "bought from NPC";
  if (action === "npc/sell") return "sold to NPC";
  if (action === "equip" || action === "unequip") return `${action}ped`;
  if (action === "give/gold") return "gave gold";
  if (action === "give/item") return "gave items";
  if (action === "task/new") return "accepted a new task";
  if (action === "task/complete") return "completed task";
  if (action === "task/exchange") return "exchanged task coins";
  if (action === "task/cancel") return "cancelled task";
  if (action === "task/trade") return "traded task items";
  return action;
}
