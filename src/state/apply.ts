// The single chokepoint that folds a server action response into local state.
//
// This is what makes the no-poll design work: every action endpoint returns the
// full authoritative `character` (and bank item moves echo `bank`), so we never
// have to GET state back — we just adopt what the action already told us.

import type { ActionResult, Character } from "../types/api";
import { bankDetails, bankItems, characters, offerings, pendingRewards, pushLog, setCharacter } from "./store";
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
  if (data.offering) foldOffering(name, action, data);
  if (action.startsWith("claim_item/")) {
    const id = action.slice("claim_item/".length);
    pendingRewards.value = pendingRewards.value.filter((p) => p.id !== id); // claimed — no re-read
  }
  // Passive, zero-cost simulator validation: compare the forecast for this fight
  // against what actually happened. Never throws into the action path.
  // Group fights are skipped: the sim is 1v1, so it would log a bogus deviation.
  if (data.fight && prevForFight && (data.fight.characters?.length ?? 1) <= 1) {
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

/** Offering accept/complete echo → today's cached offering state (no re-read). */
function foldOffering(name: string, action: string, data: ActionResult): void {
  const st = offerings.value[name];
  const o = data.offering!;
  if (!st) return; // not loaded yet — the first read will carry it
  const now = new Date().toISOString();
  const next =
    action === "offering/accept"
      ? {
          ...st,
          selected_offerings: [
            ...st.selected_offerings.filter((s) => s.category !== o.category),
            { offering_id: o.id, category: o.category, status: "accepted" as const, accepted_at: now, requirement: o.requirement, favor: o.favor, expires_at: data.favor_expires_at ?? st.expires_at },
          ],
          active_favors: [...st.active_favors, o.favor],
        }
      : {
          ...st,
          selected_offerings: st.selected_offerings.map((s) =>
            s.offering_id === o.id ? { ...s, status: "completed" as const, completed_at: now, reward_xp: data.reward?.xp ?? null } : s,
          ),
          completed_categories: [...new Set([...st.completed_categories, o.category])],
        };
  offerings.value = { ...offerings.value, [name]: next };
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
    if ((f.characters?.length ?? 0) > 1) return `group fight ${f.result} · ${f.characters!.map((c) => `${c.character_name} +${c.xp} xp`).join(", ")}`;
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
  if (action.startsWith("claim_item")) return "claimed a pending reward";
  if (action === "offering/accept" && data.offering) {
    const f = data.offering.favor;
    return `accepted ${data.offering.category} offering — favor ×${f.xp_multiplier} xp on ${f.target_code}`;
  }
  if (action === "offering") return `completed ${data.reward?.category ?? "an"} offering · +${data.reward?.xp ?? 0} xp`;
  return action;
}
