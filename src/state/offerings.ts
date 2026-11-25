// Seasonal offerings (season 9's Seasonal Altar): the once-a-day read and the
// per-category view that the `offering` queue item and the UI share.
//
// Budget: /my/{name}/offerings is a per-account READ — at most one per
// character per UTC day (the cache in store.ts, kept current by the
// accept/complete echoes in apply.ts). Never polled.

import { api } from "../api/client";
import { catalog, item } from "../catalog";
import { RARE_ACTIONS } from "../plan/xp";
import { placeGates } from "../plan/planner/targets";
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

// ── Task 023, settled point 3: what an offering may give away ────────────────

/** Actions per unit of `code` from its cheapest field source — xp.ts unitActions, which is private there (the rule
 *  `RARE_ACTIONS` reads): the best drop rate, a craft's ingredients summed, an NPC trade priced in drops (gold prices do
 *  not count). shortcut: a copy of xp.ts's function; one rule if xp.ts ever exports it. */
function unitActions(code: string, depth = 0): number {
  let best = Infinity;
  for (const s of [...catalog().resources.values(), ...catalog().monsters.values()])
    for (const d of s.drops) if (d.code === code) best = Math.min(best, d.rate / ((d.min_quantity + d.max_quantity) / 2));
  if (depth < 3) {
    const r = item(code)?.craft;
    if (r) best = Math.min(best, r.items.reduce((t, g) => t + g.quantity * unitActions(g.code, depth + 1), 0) / Math.max(1, r.quantity));
    for (const n of catalog().npcs.values())
      for (const o of n.items ?? []) if (o.code === code && o.buy_price != null && o.currency !== "gold") best = Math.min(best, o.buy_price * unitActions(o.currency, depth + 1));
  }
  return best;
}

let keptMemo: Map<string, string[]> | undefined;
/**
 * Settled point 3: the codes an offering never takes from the bank — as its requirement or as a craft's ingredient at
 * any depth — with why: a code some recipe uses that cannot be had again at will — event-only (every monster or node that
 * drops it stands on an event's tiles, or it is only an achievement's reward), a boss or raid drop (no other monster or
 * node drops it), bought with tasks coins, or rare by xp.ts's rule (more than RARE_ACTIONS actions a unit). Static per
 * catalog: built once.
 */
export function keptFromOfferings(): Map<string, string[]> {
  if (keptMemo) return keptMemo;
  const out = new Map<string, string[]>();
  const used = new Set<string>();
  for (const it of catalog().items.values()) for (const g of it.craft?.items ?? []) used.add(g.code);
  const rewards = new Set<string>();
  for (const a of catalog().achievements.values()) for (const x of a.rewards?.items ?? []) rewards.add(x.code);
  for (const code of used) {
    const why: string[] = [];
    const sources: { boss: boolean; event: boolean }[] = [];
    for (const r of catalog().resources.values()) {
      if (!r.drops.some((d) => d.code === code)) continue;
      const g = placeGates("resource", r.code);
      if (typeof g !== "string") sources.push({ boss: false, event: g.some((x) => x.kind === "event") });
    }
    for (const m of catalog().monsters.values()) {
      if (!m.drops.some((d) => d.code === code)) continue;
      const g = placeGates("monster", m.code);
      if (typeof g !== "string") sources.push({ boss: m.type === "boss" || m.type === "raid_boss", event: g.some((x) => x.kind === "event") });
    }
    const sold = [...catalog().npcs.values()].some((n) => (n.items ?? []).some((o) => o.code === code && o.buy_price != null));
    if (sources.length && sources.every((s) => s.event)) why.push("event-only");
    else if (!sources.length && !item(code)?.craft && !sold && rewards.has(code)) why.push("an achievement's reward only");
    if (sources.length && sources.every((s) => s.boss)) why.push("a boss or raid drop");
    if ([...catalog().npcs.values()].some((n) => (n.items ?? []).some((o) => o.code === code && o.currency === "tasks_coin" && o.buy_price != null))) why.push("bought with tasks coins");
    if (unitActions(code) > RARE_ACTIONS) why.push(`rare (${Number.isFinite(unitActions(code)) ? Math.round(unitActions(code)) : "∞"} actions a unit)`);
    if (why.length) out.set(code, why);
  }
  keptMemo = out;
  return out;
}
/** Whether an offering may take `code` from the bank (settled point 3). */
export const offeringMayTake = (code: string): boolean => !keptFromOfferings().has(code);

