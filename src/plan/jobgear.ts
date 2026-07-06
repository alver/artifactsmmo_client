// Bank-centric job gear — the bank is the single source of truth for equipment.
//
// jobGear() maps a job (fight a monster / gather a skill / craft) to the best
// gear set available RIGHT NOW in bank ∪ inventory ∪ equipped: fights go
// through the combat BIS solver; gather/craft jobs use a per-slot argmax over
// the non-combat effects (tool cooldown reduction, prospecting = drop chance,
// wisdom = XP). nextGearAction() is the stateless differ that turns "worn vs
// desired" into the ONE next swap action — re-derived from live state every
// tick, so it is reload-idempotent and self-heals when two characters race the
// same bank item. Utility slots are never managed here (the potion restock
// machinery owns them); the bag slot is always "best bag owned", never
// job-dependent, and is swapped last (capacity shrink is only safe with a
// light inventory at the bank).
//
// Pure module: catalog lookups only — no signals, no API.

import { item, tileAt } from "../catalog";
import { bestInSlot, canEquip } from "./bis";
import { GEAR_SLOTS, SLOTS_FOR_TYPE, slotCode, slotQuantity } from "../types/api";
import type { BankItem, Character, GearSlot } from "../types/api";
import type { Item } from "../types/catalog";
import type { GearJob, GearRecommendation } from "./types";

/** The slots the swap manages — everything but the utility potion stacks. */
export const MANAGED_SLOTS: GearSlot[] = GEAR_SLOTS.filter((s) => !s.startsWith("utility"));

/** Every gear slot mapped to "" — the desired map for a full strip. */
export function stripAllMap(): Partial<Record<GearSlot, string>> {
  const out: Partial<Record<GearSlot, string>> = {};
  for (const g of GEAR_SLOTS) out[g] = "";
  return out;
}

/** Overlay that adds the (normally unmanaged) utility slots to a reset strip. */
export const RESET_UTILITY_STRIP: Partial<Record<GearSlot, string>> = { utility1: "", utility2: "" };

const layerOf = (ch: Character): string => (ch as { layer?: string }).layer ?? "overworld";

export const effectValue = (it: Item, code: string): number => {
  let v = 0;
  for (const e of it.effects ?? []) if (e.code === code) v += e.value;
  return v;
};

/** Everything the character can draw on: inventory + bank + worn gear, by count. */
export function ownedQtyOf(ch: Character, bank: BankItem[]): Map<string, number> {
  const q = new Map<string, number>();
  const add = (code: string, n: number) => {
    if (code && n > 0) q.set(code, (q.get(code) ?? 0) + n);
  };
  for (const s of ch.inventory ?? []) add(s.code, s.quantity);
  for (const b of bank) add(b.code, b.quantity);
  for (const s of MANAGED_SLOTS) add(slotCode(ch, s), 1);
  return q;
}

/** Best owned bag by inventory_space; ties keep the worn one. Never "" while a bag is worn. */
function bestBag(ch: Character, qty: Map<string, number>): string {
  const worn = slotCode(ch, "bag");
  const wornIt = worn ? item(worn) : undefined;
  let best = worn;
  // An unknown worn bag (catalog gap) is never replaced — Infinity keeps it.
  let bestVal = worn ? (wornIt ? effectValue(wornIt, "inventory_space") : Infinity) : -1;
  for (const code of qty.keys()) {
    const it = item(code);
    if (!it || it.type !== "bag" || !canEquip(ch, it)) continue;
    const v = effectValue(it, "inventory_space");
    if (v > bestVal) {
      best = code;
      bestVal = v;
    }
  }
  return best;
}

/** A BIS recommendation as a full desired slot map: utilities dropped, bag rule applied. */
export function jobSetFromRecommendation(ch: Character, bank: BankItem[], rec: GearRecommendation): Partial<Record<GearSlot, string>> {
  const out: Partial<Record<GearSlot, string>> = {};
  for (const g of MANAGED_SLOTS) out[g] = rec.slots[g] ?? "";
  out.bag = bestBag(ch, ownedQtyOf(ch, bank));
  return out;
}

/**
 * The best gear set for a job from what is owned right now (bank ∪ inventory ∪
 * equipped — nothing is crafted here). Absent slots in the result are
 * unmanaged; "" means "strip this slot to the bank". Fights always get a set —
 * the solver falls back to the best-effort (longest-surviving) set when
 * nothing owned can win; whether to fight is the runner's forecast gate's
 * call. `undefined` = no set at all (unknown monster / job "none") — callers
 * keep the current gear.
 */
export function jobGear(ch: Character, bank: BankItem[], job: GearJob): Partial<Record<GearSlot, string>> | undefined {
  if (job.kind === "none") return undefined;
  const qty = ownedQtyOf(ch, bank);

  if (job.kind === "fight") {
    // noUtilities: this set feeds the bank swap, which never equips potion
    // stacks — a forecast counting them would let fightRound's live gate
    // refuse fights the solver called winnable. ownedQty lets the ring pair
    // use two copies of the same ring.
    const rec = bestInSlot(ch, job.monster, { owned: new Set(qty.keys()), ownedQty: qty, includeCraftable: false, noUtilities: true })[0];
    return rec ? jobSetFromRecommendation(ch, bank, rec) : undefined;
  }

  // Gather/craft: per-slot argmax. Gathering wants drops first, XP second;
  // crafting only gains from wisdom. Score 0 ⇒ the slot is stripped (combat
  // gear goes back to the bank for whoever fights next).
  const score = (it: Item): number => {
    const w = effectValue(it, "wisdom");
    const p = effectValue(it, "prospecting");
    return job.kind === "gather" ? p * 1e6 + w : w;
  };

  const bySlot = new Map<GearSlot, { code: string; s: number }[]>();
  for (const code of qty.keys()) {
    const it = item(code);
    if (!it) continue;
    const slots = SLOTS_FOR_TYPE[it.type];
    if (!slots || it.type === "utility" || it.type === "bag") continue;
    if (!canEquip(ch, it)) continue;
    const s = score(it);
    if (s <= 0) continue;
    for (const g of slots) {
      if (!bySlot.has(g)) bySlot.set(g, []);
      bySlot.get(g)!.push({ code, s });
    }
  }

  // Gathering tool: the weapon slot is scored by cooldown reduction instead
  // (tools carry a negative `<skill>` effect; most negative = fastest).
  // Deterministic ties (worn first, then code) — map order moves with the
  // swap's own actions and must never decide the winner.
  let tool = "";
  if (job.kind === "gather") {
    const wornWeapon = slotCode(ch, "weapon");
    let bestVal = 0;
    for (const code of [...qty.keys()].sort((a, b) => (a === wornWeapon ? -1 : b === wornWeapon ? 1 : a.localeCompare(b)))) {
      const it = item(code);
      if (!it || it.subtype !== "tool" || !canEquip(ch, it)) continue;
      const v = -effectValue(it, job.skill);
      if (v > bestVal) {
        bestVal = v;
        tool = code;
      }
    }
  }

  const remaining = new Map(qty);
  const take = (code: string): void => {
    remaining.set(code, (remaining.get(code) ?? 0) - 1);
  };
  const pick = (g: GearSlot): string => {
    const worn = slotCode(ch, g);
    const top = (bySlot.get(g) ?? [])
      .filter((c) => (remaining.get(c.code) ?? 0) > 0)
      .sort((a, b) => b.s - a.s || (b.code === worn ? 1 : 0) - (a.code === worn ? 1 : 0) || a.code.localeCompare(b.code))[0];
    if (!top) return "";
    take(top.code);
    return top.code;
  };

  const desired: Partial<Record<GearSlot, string>> = {};
  for (const g of MANAGED_SLOTS) {
    if (g === "bag") continue;
    if (g === "weapon" && tool) {
      desired.weapon = tool;
      take(tool);
      continue;
    }
    desired[g] = pick(g);
  }
  desired.bag = bestBag(ch, qty);
  return desired;
}

// ── The swap differ ──────────────────────────────────────────────────────────

export interface GearActionOpts {
  /** Never deposited by the junk leg (task deliverables, food). */
  keep?: string[];
  /** false ⇒ skip the junk-deposit leg entirely. */
  junk?: boolean;
  /**
   * Full bank reset (job start): everything happens at the bank — the WHOLE
   * inventory (not just gear) plus all pocket gold is deposited first, and the
   * strip extends to the utility slots. Combine with a total desired map
   * (stripAllMap() / RESET_UTILITY_STRIP) so every unneeded slot is emptied.
   */
  reset?: boolean;
}

export type GearAction =
  | { kind: "goto-bank" }
  | { kind: "unequip"; slots: { slot: GearSlot; quantity: number }[] }
  | { kind: "equip"; items: { code: string; slot: GearSlot; quantity: number }[] }
  | { kind: "withdraw"; items: { code: string; quantity: number }[] }
  | { kind: "deposit"; items: { code: string; quantity: number }[] }
  | { kind: "deposit-gold"; quantity: number };

const LIKE_SLOT_GROUPS: GearSlot[][] = [
  ["ring1", "ring2"],
  ["artifact1", "artifact2", "artifact3"],
];

/** Permute desired values within interchangeable slot groups to keep worn
 *  items where they are (returns a copy — frozen plans are never mutated). */
function canonicalizeGroups(ch: Character, desired: Partial<Record<GearSlot, string>>): Partial<Record<GearSlot, string>> {
  let out: Partial<Record<GearSlot, string>> | null = null;
  for (const grp of LIKE_SLOT_GROUPS) {
    const present = grp.filter((g) => desired[g] !== undefined);
    if (present.length < 2) continue;
    const wants = present.map((g) => desired[g]!);
    const assigned = new Map<GearSlot, string>();
    for (const g of present) {
      const worn = slotCode(ch, g);
      const i = worn ? wants.indexOf(worn) : -1;
      if (i >= 0) {
        assigned.set(g, worn);
        wants.splice(i, 1);
      }
    }
    if (assigned.size === 0) continue; // nothing worn matches — keep as compiled
    for (const g of present) if (!assigned.has(g)) assigned.set(g, wants.shift() ?? "");
    for (const [g, code] of assigned) {
      if (desired[g] === code && !out) continue;
      out ??= { ...desired };
      out[g] = code;
    }
  }
  return out ?? desired;
}

const onBankTile = (ch: Character): boolean => {
  try {
    return tileAt(ch.x, ch.y, layerOf(ch))?.interactions.content?.type === "bank";
  } catch {
    return false;
  }
};

/** Equippable gear in hand that no desired slot wants — bound for the bank. */
function junkOf(inv: Map<string, number>, desired: Partial<Record<GearSlot, string>>, opts: GearActionOpts): { code: string; quantity: number }[] {
  if (opts.junk === false) return [];
  const keep = new Set(opts.keep ?? []);
  const wanted = new Set(Object.values(desired).filter(Boolean));
  const out: { code: string; quantity: number }[] = [];
  for (const [code, n] of inv) {
    if (n <= 0 || keep.has(code) || wanted.has(code)) continue;
    const it = item(code);
    if (!it || !SLOTS_FOR_TYPE[it.type] || it.type === "utility") continue; // gear only; potions stay
    out.push({ code, quantity: n });
  }
  return out;
}

/**
 * The ONE next action that moves the character toward `desired`, or null when
 * converged. Priority: unequip mismatches → equip from hand → withdraw from
 * bank → stow replaced/junk gear (only at the bank — never a dedicated trip
 * for a stray looted drop) → bag swap last. A desired item that is nowhere to
 * be found (not worn, not in hand, not banked) leaves its slot as-is, so
 * frozen plans containing not-yet-crafted gear are safe.
 */
export function nextGearAction(
  ch: Character,
  bank: BankItem[],
  desired: Partial<Record<GearSlot, string>>,
  opts: GearActionOpts = {},
): GearAction | null {
  // Like-slot groups are interchangeable: remap `desired` so wanted items the
  // character ALREADY wears stay in their current slot. Without this, a plan
  // whose ring1/ring2 assignment merely mirrors the worn one would strip and
  // re-equip both rings for nothing.
  desired = canonicalizeGroups(ch, desired);
  const bankQty = new Map<string, number>();
  for (const b of bank) bankQty.set(b.code, (bankQty.get(b.code) ?? 0) + b.quantity);
  const inv = new Map<string, number>();
  let load = 0;
  for (const s of ch.inventory ?? []) {
    if (!s.code || s.quantity <= 0) continue;
    inv.set(s.code, (inv.get(s.code) ?? 0) + s.quantity);
    load += s.quantity;
  }
  const free = Math.max(0, ch.inventory_max_items - load);

  // Reset legs (job start, always at the bank): stash the whole load except
  // protected stock and what the desired set itself needs, then sweep the
  // pocket gold. Runs before the strip so unequipped gear (next ticks) always
  // finds a near-empty bag, and the depositItems echo refreshes the bank
  // signal before the withdraw leg computes.
  if (opts.reset) {
    if (!onBankTile(ch)) return { kind: "goto-bank" };
    const keep = new Set(opts.keep ?? []);
    const wantCount = new Map<string, number>();
    for (const c of Object.values(desired)) if (c) wantCount.set(c, (wantCount.get(c) ?? 0) + 1);
    const stash: { code: string; quantity: number }[] = [];
    for (const [code, n] of inv) {
      if (n <= 0 || keep.has(code)) continue;
      const excess = n - (wantCount.get(code) ?? 0);
      if (excess > 0) stash.push({ code, quantity: excess });
    }
    if (stash.length) return { kind: "deposit", items: stash };
    if (ch.gold > 0) return { kind: "deposit-gold", quantity: ch.gold };
  }

  // Which desired slots actually need work, and is their item obtainable?
  // Supply counts inventory + bank + gear that this same swap will free up.
  // A reset also manages the utility slots (strip-only — nothing re-equips them).
  const scope = opts.reset ? GEAR_SLOTS : MANAGED_SLOTS;
  const slots = scope.filter((g) => g !== "bag" && desired[g] !== undefined);
  const supply = new Map<string, number>();
  const addSupply = (code: string, n: number) => supply.set(code, (supply.get(code) ?? 0) + n);
  for (const [c, n] of inv) addSupply(c, n);
  for (const [c, n] of bankQty) addSupply(c, n);
  for (const g of slots) {
    const w = slotCode(ch, g);
    if (w && desired[g] !== w) addSupply(w, 1);
  }

  const active: { slot: GearSlot; want: string }[] = [];
  const strip: GearSlot[] = [];
  for (const g of slots) {
    const want = desired[g]!;
    const worn = slotCode(ch, g);
    if (want === worn) continue;
    if (want === "") {
      if (worn) strip.push(g);
      continue;
    }
    const s = supply.get(want) ?? 0;
    if (s <= 0) continue; // unavailability guard: leave the slot as-is
    supply.set(want, s - 1);
    active.push({ slot: g, want });
    if (worn) strip.push(g);
  }

  const junkItems = junkOf(inv, desired, opts);

  // 1. Free the mismatched slots (one batched request). Utility stacks cost
  //    their whole quantity in inventory room, so the batch is capped by
  //    QUANTITY, not slot count — a too-big stack unequips partially and the
  //    next ticks (reset deposits between them) drain the rest.
  if (strip.length) {
    if (free === 0) {
      // No room for the unequipped gear — stow junk first; with nothing
      // depositable, yield and let the caller's normal bank-off make room.
      return junkItems.length ? { kind: "deposit", items: junkItems } : null;
    }
    const batch: { slot: GearSlot; quantity: number }[] = [];
    let room = free;
    for (const g of strip) {
      if (room <= 0) break;
      const qty = g.startsWith("utility") ? Math.min(Math.max(1, slotQuantity(ch, g)), room) : 1;
      batch.push({ slot: g, quantity: qty });
      room -= qty;
    }
    return { kind: "unequip", slots: batch };
  }

  // 2. Equip whatever is already in hand into the (now empty) slots.
  const equipNow: { code: string; slot: GearSlot; quantity: number }[] = [];
  const invLeft = new Map(inv);
  for (const a of active) {
    if (slotCode(ch, a.slot)) continue; // still occupied (capped unequip) — next tick
    const n = invLeft.get(a.want) ?? 0;
    if (n > 0) {
      invLeft.set(a.want, n - 1);
      equipNow.push({ code: a.want, slot: a.slot, quantity: 1 });
    }
  }
  if (equipNow.length) return { kind: "equip", items: equipNow };

  // 3. Withdraw the remainder from the bank (aggregate per code, capped by room).
  const need = new Map<string, number>();
  for (const a of active) {
    const n = invLeft.get(a.want) ?? 0;
    if (n > 0) {
      invLeft.set(a.want, n - 1); // covered by hand, waiting for its slot
      continue;
    }
    if ((bankQty.get(a.want) ?? 0) > (need.get(a.want) ?? 0)) need.set(a.want, (need.get(a.want) ?? 0) + 1);
  }
  if (need.size) {
    let room = free;
    const items: { code: string; quantity: number }[] = [];
    for (const [code, n] of need) {
      const q = Math.min(n, room);
      if (q > 0) {
        items.push({ code, quantity: q });
        room -= q;
      }
    }
    if (items.length) return { kind: "withdraw", items };
    return junkItems.length ? { kind: "deposit", items: junkItems } : null; // no room — stow junk or yield
  }

  // 4. Bag last: swap only at the bank, junk stowed, and only when the load
  //    survives the capacity shrink of removing the worn bag.
  const wantBag = desired.bag;
  if (wantBag !== undefined && wantBag !== "" && wantBag !== slotCode(ch, "bag") && ((inv.get(wantBag) ?? 0) > 0 || (bankQty.get(wantBag) ?? 0) > 0)) {
    if (!onBankTile(ch)) return { kind: "goto-bank" };
    if (junkItems.length) return { kind: "deposit", items: junkItems };
    const worn = slotCode(ch, "bag");
    if (worn) {
      const wornIt = item(worn);
      const shrunk = ch.inventory_max_items - (wornIt ? effectValue(wornIt, "inventory_space") : 0);
      if (load + 1 > shrunk) return null; // too heavy to drop the bag — retry when lighter
      return { kind: "unequip", slots: [{ slot: "bag", quantity: 1 }] };
    }
    if ((inv.get(wantBag) ?? 0) > 0) return { kind: "equip", items: [{ code: wantBag, slot: "bag", quantity: 1 }] };
    if (free > 0) return { kind: "withdraw", items: [{ code: wantBag, quantity: 1 }] };
    return null; // no room even for the bag — retry when lighter
  }

  // 5. Converged on slots — stow replaced/junk gear if we happen to be at the bank.
  if (junkItems.length && onBankTile(ch)) return { kind: "deposit", items: junkItems };
  return null;
}
