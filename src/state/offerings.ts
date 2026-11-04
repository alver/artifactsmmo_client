// Seasonal offerings (season 9's Seasonal Altar): the once-a-day read and the
// per-category view that the `offering` queue item and the UI share.
//
// Budget: /my/{name}/offerings is a per-account READ — at most one per
// character per UTC day (the cache in store.ts, kept current by the
// accept/complete echoes in apply.ts). Never polled.

import { api } from "../api/client";
import { offerings } from "./store";
import { saveState } from "./persist";
import type { CachedOfferings } from "./store";
import type { Character, CharacterOfferings, OfferingFavor } from "../types/api";
import type { ItemStack } from "../types/catalog";

/** Today's cached state for a character; undefined when never read or from a past day. */
export function todayOfferings(name: string): CachedOfferings | undefined {
  const st = offerings.value[name];
  // A just-read entry stays fresh even if the local clock runs past the server's
  // reset — a skewed clock must never turn into a read per tick.
  return st && (Date.parse(st.expires_at) > Date.now() || Date.now() - st.fetchedAt < 60_000) ? st : undefined;
}

/** One read of the character's offerings for today. */
export async function loadOfferings(name: string): Promise<CachedOfferings> {
  const st = { ...(await api<CharacterOfferings>(`/my/${name}/offerings`)), fetchedAt: Date.now() };
  offerings.value = { ...offerings.value, [name]: st };
  saveState();
  return st;
}

/** The level an offering bracket is matched against: combat level, else the skill's. */
export const categoryLevel = (ch: Character, category: string): number =>
  category === "combat" ? ch.level : ((ch as unknown as Record<string, number>)[`${category}_level`] ?? 0);

export interface OfferingSlot {
  category: string;
  /** done = completed today · accepted = favor on, requirement owed · open = can accept · none = no bracket at this level */
  status: "done" | "accepted" | "open" | "none";
  id?: string;
  requirement?: ItemStack;
  favor?: OfferingFavor;
  xp?: number | null; // a completed one's reward
}

/** Today's categories (combat + the two rotating skills) and where this character stands in each. */
export function offeringSlots(ch: Character, st: CharacterOfferings): OfferingSlot[] {
  return ["combat", ...st.skills].map((category): OfferingSlot => {
    const sel = st.selected_offerings.find((s) => s.category === category);
    if (st.completed_categories.includes(category) || sel?.status === "completed") {
      return { category, status: "done", id: sel?.offering_id, requirement: sel?.requirement, favor: sel?.favor, xp: sel?.reward_xp };
    }
    if (sel) return { category, status: "accepted", id: sel.offering_id, requirement: sel.requirement, favor: sel.favor };
    const lv = categoryLevel(ch, category);
    const o = st.offerings.find((x) => x.category === category && lv >= x.level_min && lv <= x.level_max);
    return o ? { category, status: "open", id: o.id, requirement: o.requirement, favor: o.favor } : { category, status: "none" };
  });
}
