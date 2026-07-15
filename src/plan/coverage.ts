// Fleet gear coverage — the 🛡 drawer's domain: can the bank dress the whole
// party, and what's missing at the characters' CURRENT levels?
//
// The model is a virtual bank reset for everyone at once: every character is
// handed their level-best owned item per slot group from a shared pool with
// real quantities. Ranking is item level (monster-agnostic, zero simulate()
// calls) — combat-BIS "what should we craft" stays the hive's job. Contested
// copies go to the character with the worst fallback (a greedy heuristic, not
// exact matching — fine for a status view, and deterministic: every ordering
// tie-breaks by code / account order).
//
// Deliberate exclusions: utility slots (consumable stacks, brew-managed) and
// tools (type weapon, subtype tool) — tools out-level combat weapons in a
// level ranking and would show a pickaxe as everyone's "best weapon"; they're
// job gear, picked per-job by jobGear's argmax.
//
// Pure: no signals, no API, no state/ imports.

import { canEquip } from "./bis";
import { fleetOwned } from "./hive/ctx";
import { PINNED_ARTIFACTS } from "./jobgear";
import { catalog } from "../catalog";
import { SLOTS_FOR_TYPE, slotCode } from "../types/api";
import type { BankItem, Character, GearSlot } from "../types/api";
import type { Item } from "../types/catalog";

/** One character's outcome for one concrete slot instance. */
export interface SlotAssign {
  /** What the virtual reset hands them (null = the pool ran dry / nothing wearable). */
  code: string | null;
  /** Its item level (0 when empty). */
  level: number;
  /** Their unconstrained best (infinite copies); null = nothing owned is equippable. */
  bestCode: string | null;
  /** Assigned worse than bestCode — or empty while a bestCode exists. */
  short: boolean;
}

export interface CoverageRow {
  /** Slot group = the equippable item type ("weapon" … "ring", "artifact"). */
  group: string;
  /** Concrete slots per character (ring 2, artifact 3, else 1). */
  capacity: number;
  /** Character name → `capacity` entries, best first. */
  cells: Record<string, SlotAssign[]>;
}

export interface Shortage {
  code: string;
  group: string;
  /** Fleet-owned copies (bank + inventories + worn). */
  have: number;
  /** Σ multiplicity across all unconstrained best sets (a best ring counts twice). */
  need: number;
  /** Characters whose best set wants it. */
  wanters: string[];
}

export interface FleetCoverage {
  /** GEAR_SLOTS display order, utilities skipped. */
  rows: CoverageRow[];
  /** Deficit desc, then item level desc, then code. */
  shortages: Shortage[];
  /** Character × group pairs where nothing owned is equippable at all. */
  unfillable: { character: string; group: string }[];
}

/** Slot groups in GEAR_SLOTS display order; capacity = concrete slots each. */
const GROUPS: { group: string; capacity: number }[] = [
  "weapon", "rune", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring", "amulet", "artifact", "bag",
].map((t) => ({ group: t, capacity: SLOTS_FOR_TYPE[t].length }));

const ARTIFACT_SLOTS: GearSlot[] = ["artifact1", "artifact2", "artifact3"];

// Static-catalog work cached once at module level (the itemsForSlot pattern):
// all items of one type, level desc then code — the rank order everything uses.
const _typePools = new Map<string, Item[]>();
function typePool(type: string): Item[] {
  let pool = _typePools.get(type);
  if (!pool) {
    pool = [...catalog().items.values()]
      .filter((it) => it.type === type && !(type === "weapon" && it.subtype === "tool"))
      .sort((a, b) => b.level - a.level || a.code.localeCompare(b.code));
    _typePools.set(type, pool);
  }
  return pool;
}

export function fleetCoverage(chars: Character[], bank: BankItem[]): FleetCoverage {
  const { ownedQty } = fleetOwned({ characters: chars, bank });
  const rows: CoverageRow[] = [];
  const shortages: Shortage[] = [];
  const unfillable: { character: string; group: string }[] = [];

  for (const { group, capacity } of GROUPS) {
    // The owned pool for this group, rank order preserved. Codes the catalog
    // snapshot doesn't know can't enter (typePool only yields catalog items).
    const pool = typePool(group)
      .filter((it) => (ownedQty.get(it.code) ?? 0) > 0)
      .map((it) => ({ it, qty: ownedQty.get(it.code)! }));

    // Per-character wishlist (equippable subset, rank order) + unconstrained
    // best set: the ranked instances they'd wear given infinite copies.
    const wish = new Map<string, Item[]>();
    const best = new Map<string, (Item | null)[]>();
    const need = new Map<string, { need: number; wanters: Set<string> }>();
    for (const ch of chars) {
      const list = pool.map((p) => p.it).filter((it) => canEquip(ch, it));
      wish.set(ch.name, list);
      if (list.length === 0) unfillable.push({ character: ch.name, group });
      // Rings duplicate the single best; artifacts take the top distinct codes
      // (a wishlist never repeats a code, so slicing IS the distinct rule).
      const set = Array.from({ length: capacity }, (_, i) => (group === "ring" ? (list[0] ?? null) : (list[i] ?? null)));
      best.set(ch.name, set);
      for (const it of set) {
        if (!it) continue;
        const cur = need.get(it.code) ?? { need: 0, wanters: new Set<string>() };
        cur.need++;
        cur.wanters.add(ch.name);
        need.set(it.code, cur);
      }
    }

    const assigned = new Map<string, Item[]>(chars.map((c) => [c.name, []]));

    // Pinned artifacts stay put: reality never moves a worn pin (jobgear), so
    // the virtual reset seeds each worn pinned copy onto its current wearer.
    if (group === "artifact") {
      for (const ch of chars) {
        for (const g of ARTIFACT_SLOTS) {
          const worn = slotCode(ch, g);
          if (!worn || !PINNED_ARTIFACTS.has(worn)) continue;
          const p = pool.find((x) => x.it.code === worn);
          if (!p || p.qty <= 0) continue;
          p.qty--;
          assigned.get(ch.name)!.push(p.it);
        }
      }
    }

    // Item-major greedy: walk copies in rank order; a contested copy goes to
    // the eligible character with the worst fallback (their next-ranked
    // equippable item — none at all wins outright), then the lower character
    // level, then account order. Total capacity is ≤ 3×|chars|, so the inner
    // loop is tiny.
    for (const p of pool) {
      while (p.qty > 0) {
        const eligible = chars.filter((ch) => {
          const mine = assigned.get(ch.name)!;
          if (mine.length >= capacity) return false;
          if (group === "artifact" && mine.some((x) => x.code === p.it.code)) return false; // distinct (rule 485)
          return wish.get(ch.name)!.some((x) => x.code === p.it.code);
        });
        if (eligible.length === 0) break;
        const fallbackOf = (ch: Character): number => {
          const list = wish.get(ch.name)!;
          const i = list.findIndex((x) => x.code === p.it.code);
          return list[i + 1]?.level ?? -1;
        };
        let winner = eligible[0];
        let wFall = fallbackOf(winner);
        for (const ch of eligible.slice(1)) {
          const f = fallbackOf(ch);
          if (f < wFall || (f === wFall && ch.level < winner.level)) {
            winner = ch;
            wFall = f;
          }
        }
        assigned.get(winner.name)!.push(p.it);
        p.qty--;
      }
    }

    // Cells: rank-align what they got against their unconstrained best. A
    // pinned occupant is a choice, not poverty — never marked short (it sorts
    // last anyway at level 1, so real picks align with their best ranks).
    const cells: Record<string, SlotAssign[]> = {};
    for (const ch of chars) {
      const got = assigned.get(ch.name)!.sort((a, b) => b.level - a.level || a.code.localeCompare(b.code));
      const bestSet = best.get(ch.name)!;
      cells[ch.name] = Array.from({ length: capacity }, (_, i) => {
        const a = got[i] ?? null;
        const b = bestSet[i] ?? null;
        const pinned = !!a && PINNED_ARTIFACTS.has(a.code);
        return {
          code: a?.code ?? null,
          level: a?.level ?? 0,
          bestCode: b?.code ?? null,
          short: !!b && !pinned && (a?.level ?? -1) < b.level,
        };
      });
    }
    rows.push({ group, capacity, cells });

    for (const [code, n] of need) {
      const have = ownedQty.get(code) ?? 0;
      if (n.need > have) shortages.push({ code, group, have, need: n.need, wanters: [...n.wanters] });
    }
  }

  shortages.sort(
    (a, b) =>
      b.need - b.have - (a.need - a.have) ||
      (catalog().items.get(b.code)?.level ?? 0) - (catalog().items.get(a.code)?.level ?? 0) ||
      a.code.localeCompare(b.code),
  );
  return { rows, shortages, unfillable };
}
