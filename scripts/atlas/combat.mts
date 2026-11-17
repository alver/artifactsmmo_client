// Atlas combat: hypothetical characters, tiered progressive pools, memoized BIS, min safe levels.
import { C, obtain, EQUIP_TYPES, sourcesOf, availability } from "./model.mts";
import { bestInSlot, killSeconds } from "../../src/plan/bis";
import { STAT_CODES, isCombatEffect } from "../../src/sim/types";
import { fightXp } from "../../src/plan/xp";
import type { Character } from "../../src/types/api";
import { GEAR_SLOTS } from "../../src/types/api";

const SKILLS = ["mining", "woodcutting", "fishing", "weaponcrafting", "gearcrafting", "jewelrycrafting", "cooking", "alchemy"];
export const baseHp = (L: number) => 115 + 5 * L;
export function hypo(L: number): Character {
  const c: Record<string, unknown> = { name: `L${L}`, level: L, max_hp: baseHp(L), hp: baseHp(L) };
  for (const k of ["attack_fire", "attack_earth", "attack_water", "attack_air", "dmg", "dmg_fire", "dmg_earth", "dmg_water", "dmg_air", "res_fire", "res_earth", "res_water", "res_air", "critical_strike", "haste", "wisdom", "prospecting"]) c[k] = 0;
  for (const s of SKILLS) c[`${s}_level`] = L;
  for (const s of GEAR_SLOTS) c[`${s}_slot`] = "";
  c.utility1_slot_quantity = 0; c.utility2_slot_quantity = 0;
  return c as unknown as Character;
}

const COMBAT_STATS = new Set([...STAT_CODES].filter((s) => !["wisdom", "prospecting", "haste"].includes(s)));
export const combatRelevant = (code: string): boolean => {
  const it = C.items.get(code)!;
  return (it.effects ?? []).some((e) => COMBAT_STATS.has(e.code as never) || isCombatEffect(e.code));
};

/** Candidate combat items with obtain tier ≤ T (bags/non-combat excluded), any level. */
const basePoolMemo = new Map<string, Set<string>>();
export function pool(T: number, utilities: boolean): Set<string> {
  const k = `${T}:${utilities}`;
  let p = basePoolMemo.get(k);
  if (p) return p;
  p = new Set();
  for (const it of C.items.values()) {
    if (!EQUIP_TYPES.has(it.type) || it.type === "bag") continue;
    if (!utilities && it.type === "utility") continue;
    if (obtain(it.code).tier > T) continue;
    if (!combatRelevant(it.code)) continue;
    p.add(it.code);
  }
  basePoolMemo.set(k, p);
  return p;
}

// ---------- progressive (self-sufficient fleet) pools ----------
// An item counts at level L only when every monster drop in its recipe tree comes from a
// monster that the same tier's gear already beat (EV win) at some level <= L.
const MONS = [...C.monsters.values()].filter((m) => m.type !== "raid_boss" && availability("monster", m.code).kind !== "none");
export const unlocked: Record<number, Map<string, number>> = { 0: new Map(), 1: new Map(), 2: new Map() };
const doneUpTo: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
function farmable(code: string, T: number, L: number, memo: Map<string, boolean>, depth = 0): boolean {
  const hit = memo.get(code);
  if (hit != null) return hit;
  if (depth > 8) return false;
  memo.set(code, false);
  let ok = false;
  for (const s of sourcesOf.get(code) ?? []) {
    if (s.tier > T) continue;
    const d = s.detail;
    if (s.kind === "gather" || s.kind === "task") ok = true;
    else if (s.kind === "drop") ok = (unlocked[T].get(d.monster) ?? 99) <= L;
    else if (s.kind === "npc") ok = d.currency === "gold" || farmable(d.currency, T, L, memo, depth + 1);
    else if (s.kind === "achievement") {
      const a = C.achievements.get(d.ach)!;
      ok = a.objectives.every((o) => (o.type === "combat_level" ? L >= o.total : o.type === "combat_kill" && o.target ? (unlocked[T].get(o.target) ?? 99) <= L : false));
    }
    if (ok) break;
  }
  const it = C.items.get(code);
  if (!ok && it?.craft && obtain(code).tier <= T) ok = it.craft.items.every((g) => farmable(g.code, T, L, memo, depth + 1));
  memo.set(code, ok);
  return ok;
}
function buildPool(T: number, L: number, util: boolean): Set<string> {
  const memo = new Map<string, boolean>();
  const out = new Set<string>();
  for (const c of pool(T, util)) {
    if (C.items.get(c)!.level > L) continue;
    if (farmable(c, T, L, memo)) out.add(c);
  }
  return out;
}
const poolAtMemo = new Map<string, Set<string>>();
export function ensure(T: number, L: number): void {
  for (let l = doneUpTo[T] + 1; l <= L; l++) {
    for (;;) {
      const P = buildPool(T, l, true); // potions allowed: fighters brew and wear them
      let any = false;
      for (const m of MONS) {
        if (unlocked[T].has(m.code) || m.level > l + 12) continue;
        // Farmable = a gear-only win, or a SAFE potion-assisted win that burns at most one
        // health bar of potions per kill (potion-chugging stalemates are not a farm).
        const r = bestInSlot(hypo(l), m.code, { owned: P, includeCraftable: false })[0];
        const f = r.forecast;
        let ok = f.win && !f.timedOut && (f.hpRestored === 0 || (r.safe && f.hpRestored <= f.maxHp));
        if (!ok && f.win && !f.timedOut) { const g = bestInSlot(hypo(l), m.code, { owned: P, includeCraftable: false, noUtilities: true })[0].forecast; ok = g.win && !g.timedOut; }
        if (ok) { unlocked[T].set(m.code, l); any = true; }
      }
      const P2 = buildPool(T, l, true);
      if (!any || P2.size === P.size) { poolAtMemo.set(`${T}|${l}|true`, P2); break; }
    }
    doneUpTo[T] = l;
  }
}
export function poolAt(T: number, L: number, util: boolean): Set<string> {
  ensure(T, L);
  const k = `${T}|${L}|${util}`;
  let p = poolAtMemo.get(k);
  if (!p) { p = buildPool(T, L, util); poolAtMemo.set(k, p); }
  return p;
}

/** First character level at which a self-sufficient fleet on tier-T gear can make/obtain `code`
 *  (its own level reached AND every drop in its tree farmable). null = never by Lv 50. */
export function availableAt(code: string, T: number): number | null {
  ensure(T, 50);
  const it = C.items.get(code);
  if (!it || obtain(code).tier > T) return null;
  for (let L = Math.max(1, it.level); L <= 50; L++) if (farmable(code, T, L, new Map())) return L;
  return null;
}

export interface Fight {
  L: number; m: string; T: number; util: boolean;
  win: boolean; safe: boolean; turns: number; hpLeft: number; maxHp: number; hpRestored: number;
  killSec: number; xp: number; xps: number; slots: Record<string, string>;
}
const memo = new Map<string, Fight>();
export function fight(L: number, m: string, T: number, util = false): Fight {
  const k = `${L}|${m}|${T}|${util}`;
  const hit = memo.get(k);
  if (hit) return hit;
  const r = bestInSlot(hypo(L), m, { owned: poolAt(T, L, util), includeCraftable: false, noUtilities: !util })[0];
  const mon = C.monsters.get(m)!;
  const f = r.forecast;
  const ks = killSeconds(f);
  const xp = fightXp(mon.level, mon.hp, mon.type, L);
  const slots: Record<string, string> = {};
  for (const [s, c] of Object.entries(r.slots)) if (c) slots[s] = c;
  const out: Fight = {
    L, m, T, util, win: f.win && !f.timedOut, safe: r.safe, turns: f.turns, hpLeft: f.hpRemaining, maxHp: f.maxHp, hpRestored: f.hpRestored,
    killSec: ks, xp, xps: f.win && !f.timedOut ? xp / ks : 0, slots,
  };
  memo.set(k, out);
  return out;
}

/** Catalog-ideal fight: every special-tier item up to level L (+ potions), ignoring whether the fleet can farm it. */
const idealMemo = new Map<string, Fight>();
export function fightIdeal(L: number, m: string): Fight {
  const k = `${L}|${m}`;
  const hit = idealMemo.get(k);
  if (hit) return hit;
  const P = new Set([...pool(2, true)].filter((c) => C.items.get(c)!.level <= L));
  const r = bestInSlot(hypo(L), m, { owned: P, includeCraftable: false })[0];
  const mon = C.monsters.get(m)!;
  const f = r.forecast;
  const ks = killSeconds(f);
  const xp = fightXp(mon.level, mon.hp, mon.type, L);
  const slots: Record<string, string> = {};
  for (const [s, c] of Object.entries(r.slots)) if (c) slots[s] = c;
  const out: Fight = { L, m, T: 3, util: true, win: f.win && !f.timedOut, safe: r.safe, turns: f.turns, hpLeft: f.hpRemaining, maxHp: f.maxHp, hpRestored: f.hpRestored, killSec: ks, xp, xps: f.win && !f.timedOut ? xp / ks : 0, slots };
  idealMemo.set(k, out);
  return out;
}
export function minLevelIdeal(m: string): { win: number | null; safe: number | null } {
  const find = (pred: (f: Fight) => boolean): number | null => {
    if (!pred(fightIdeal(50, m))) return null;
    let lo = 1, hi = 50;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (pred(fightIdeal(mid, m))) hi = mid; else lo = mid + 1; }
    return lo;
  };
  return { win: find((f) => f.win), safe: find((f) => f.win && f.safe) };
}

/** Lowest character level (1..50) at which the tier-T progressive pool beats `m` (EV win / safe win). */
export function minLevel(m: string, T: number, util = false): { win: number | null; safe: number | null } {
  ensure(T, 50);
  let win: number | null = null, safe: number | null = null;
  const start = unlocked[T].get(m);
  if (start == null) return { win, safe };
  for (let L = start; L <= 50; L++) {
    const f = fight(L, m, T, util);
    if (f.win && win == null) win = L;
    if (f.win && f.safe) { safe = L; break; }
  }
  return { win, safe };
}
