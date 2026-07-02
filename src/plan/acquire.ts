// Acquisition resolver — turn a target gear set into an ordered, quantity-aware
// list of steps to obtain and equip it, given what the character already has.
// Pure and offline (extends the catalog scans behind itemSources()).
//
// Algorithm: a demand-map DFS. For each needed item, satisfy from inventory first
// (free), then bank (a withdraw step), else PRODUCE it — craft (recursing into
// its ingredients), gather, farm (monster drop, expressed as expected fights),
// or buy. Crafts are collected in post-order so ingredients always precede the
// item that consumes them; raw steps are aggregated by code and emitted first.

import { catalog, item, itemName } from "../catalog";
import { titleCase } from "../lib/util";
import { equippedCodes } from "../sim/stats";
import { bankSeconds, craftSeconds, gatherSeconds } from "../sim/cost";
import { slotCode, slotQuantity } from "../types/api";
import type { Character, GearSlot } from "../types/api";
import type { AcquisitionPlan, AcquisitionStep, ResolveOptions, Target } from "./types";

const MAX_DEPTH = 12;
const UTILITY_SLOTS: GearSlot[] = ["utility1", "utility2"];
/** Rough gathers per missing skill level (XP curves aren't in the catalog). */
const GATHERS_PER_LEVEL = 25;

const skillLevel = (ch: Character, skill: string): number =>
  (ch as unknown as Record<string, number>)[`${skill}_level`] ?? 0;

function tileForContent(type: string, code: string): { x: number; y: number } | undefined {
  try {
    const t = catalog().maps.find((m) => m.interactions?.content?.type === type && m.interactions.content.code === code);
    return t ? { x: t.x, y: t.y } : undefined;
  } catch {
    return undefined;
  }
}

/** A resource whose drop table yields `code` (prefer a guaranteed rate-1 drop). */
export function resourceForDrop(code: string): { code: string; skill: string; level: number } | undefined {
  try {
    let best: { code: string; skill: string; level: number; rate: number } | undefined;
    for (const r of catalog().resources.values()) {
      const d = r.drops?.find((x) => x.code === code);
      if (d && (!best || d.rate < best.rate)) best = { code: r.code, skill: r.skill, level: r.level, rate: d.rate };
    }
    return best ? { code: best.code, skill: best.skill, level: best.level } : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Best resource to *train* `skill` on at the current level: the highest-level
 * node the character can already gather (more level ≈ more XP per action).
 * Nodes 10+ levels below yield no XP at all — gathering them would train
 * forever — so they never qualify.
 */
export function trainingResource(skill: string, atLevel: number): { code: string; level: number } | undefined {
  try {
    let best: { code: string; level: number } | undefined;
    for (const r of catalog().resources.values()) {
      if (r.skill !== skill || r.level > atLevel || r.level <= atLevel - 10) continue;
      if (!best || r.level > best.level) best = { code: r.code, level: r.level };
    }
    return best;
  } catch {
    return undefined;
  }
}

/** A monster whose drop table yields `code`, with the expected fights per drop. */
function monsterForDrop(code: string): { code: string; rate: number; avgQty: number } | undefined {
  try {
    let best: { code: string; rate: number; avgQty: number } | undefined;
    for (const m of catalog().monsters.values()) {
      const d = m.drops?.find((x) => x.code === code);
      if (d && (!best || d.rate < best.rate)) best = { code: m.code, rate: d.rate, avgQty: (d.min_quantity + d.max_quantity) / 2 };
    }
    return best;
  } catch {
    return undefined;
  }
}

function npcForBuy(code: string): { code: string; price: number } | undefined {
  try {
    for (const n of catalog().npcs.values()) {
      const s = n.items?.find((i) => i.code === code && i.currency === "gold" && i.buy_price != null);
      if (s) return { code: n.code, price: s.buy_price as number };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve how to obtain (and equip) a set of target items given current state.
 * `bank` is the bank contents; the character's inventory and equipped gear are
 * read off `ch`.
 */
export function resolve(
  ch: Character,
  bank: { code: string; quantity: number }[],
  targets: Target[],
  opts: ResolveOptions = {},
): AcquisitionPlan {
  const inv = new Map<string, number>();
  for (const s of ch.inventory ?? []) if (s.code) inv.set(s.code, (inv.get(s.code) ?? 0) + s.quantity);
  const bankHave = new Map<string, number>();
  for (const b of bank) bankHave.set(b.code, (bankHave.get(b.code) ?? 0) + b.quantity);
  const equipped = new Set(equippedCodes(ch));

  // Utility targets top up a stack rather than replace it (opts.topUp — task
  // plans): re-point the target to whichever slot already holds the code and
  // demand only the shortfall (the equip action adds to an existing stack). If
  // the code isn't equipped and its compiled slot is occupied by something
  // else, prefer a free unclaimed utility slot over evicting a foreign stack.
  // Goal plans keep the legacy behavior below (equipped ⇒ satisfied).
  if (opts.topUp) {
    const claimed = new Set(targets.map((t) => t.slot).filter((s) => s?.startsWith("utility")));
    targets = targets
      .map((t) => {
        if (!t.slot || !t.slot.startsWith("utility")) return t;
        const inSlot = UTILITY_SLOTS.find((s) => slotCode(ch, s) === t.code);
        if (!inSlot) {
          if (slotCode(ch, t.slot)) {
            const free = UTILITY_SLOTS.find((s) => !slotCode(ch, s) && !claimed.has(s));
            if (free) return { ...t, slot: free };
          }
          return t;
        }
        return { ...t, slot: inSlot, quantity: t.quantity - slotQuantity(ch, inSlot) };
      })
      .filter((t) => t.quantity > 0);
  }

  const withdraw = new Map<string, number>();
  const gather = new Map<string, { qty: number; resource: string; level: number }>();
  const farm = new Map<string, { qty: number; monster: string; rate: number; avgQty: number }>();
  const buy = new Map<string, { qty: number; npc: string; price: number }>();
  const crafts: { code: string; qty: number; skill: string; level: number }[] = []; // post-order
  const trains = new Map<string, { toLevel: number; resource: string; level: number }>();
  const blockers: string[] = [];

  /**
   * Whether a small skill gap can be closed by training (opts.train): records
   * the train demand and reports the level as reachable. Shared by the craft
   * and gather gates so their training rules can't drift apart.
   */
  const trainable = (skill: string, needLevel: number): boolean => {
    if (!opts.train) return false;
    const have = skillLevel(ch, skill);
    if (needLevel - have > (opts.maxTrainGap ?? 5)) return false;
    const res = trainingResource(skill, have);
    if (!res) return false;
    const cur = trains.get(skill);
    if (!cur || needLevel > cur.toLevel) trains.set(skill, { toLevel: needLevel, resource: res.code, level: res.level });
    return true;
  };

  const need = (code: string, qty: number, path: string[]): void => {
    if (qty <= 0) return;

    // Already possessed: inventory first (free), then bank (a withdraw step).
    const fromInv = Math.min(qty, inv.get(code) ?? 0);
    if (fromInv > 0) { inv.set(code, (inv.get(code) ?? 0) - fromInv); qty -= fromInv; }
    if (qty <= 0) return;
    const fromBank = Math.min(qty, bankHave.get(code) ?? 0);
    if (fromBank > 0) {
      bankHave.set(code, (bankHave.get(code) ?? 0) - fromBank);
      withdraw.set(code, (withdraw.get(code) ?? 0) + fromBank);
      qty -= fromBank;
    }
    if (qty <= 0) return;

    const it = item(code);

    // Craft — recurse into ingredients (post-order), unless it would cycle /
    // too deep. A small trainable skill gap counts as reachable (so "gather
    // sunflower → alchemy 5 → brew potion" lands in one plan).
    if (it?.craft && !path.includes(code) && path.length < MAX_DEPTH) {
      if (skillLevel(ch, it.craft.skill) >= it.craft.level || trainable(it.craft.skill, it.craft.level)) {
        const times = Math.ceil(qty / it.craft.quantity);
        for (const ing of it.craft.items) need(ing.code, ing.quantity * times, [...path, code]);
        crafts.push({ code, qty: times * it.craft.quantity, skill: it.craft.skill, level: it.craft.level });
        return;
      }
    }
    if (it?.craft && skillLevel(ch, it.craft.skill) < it.craft.level) {
      blockers.push(`${itemName(code)}: needs ${titleCase(it.craft.skill)} Lv ${it.craft.level} (have ${skillLevel(ch, it.craft.skill)})`);
      return;
    }

    // Gather (guaranteed resource drop) — only if the character's gathering
    // skill reaches the node, or a small trainable gap when opted in.
    const rsrc = resourceForDrop(code);
    if (rsrc) {
      if (skillLevel(ch, rsrc.skill) >= rsrc.level || trainable(rsrc.skill, rsrc.level)) {
        const cur = gather.get(code) ?? { qty: 0, resource: rsrc.code, level: rsrc.level };
        cur.qty += qty;
        gather.set(code, cur);
        return;
      }
    }

    // Farm (monster drop — expected number of fights).
    const mon = monsterForDrop(code);
    if (mon) {
      const cur = farm.get(code) ?? { qty: 0, monster: mon.code, rate: mon.rate, avgQty: mon.avgQty };
      cur.qty += qty;
      farm.set(code, cur);
      return;
    }

    // Buy from an NPC for gold.
    const np = npcForBuy(code);
    if (np) {
      const cur = buy.get(code) ?? { qty: 0, npc: np.code, price: np.price };
      cur.qty += qty;
      buy.set(code, cur);
      return;
    }

    if (rsrc) {
      blockers.push(`${itemName(code)}: needs ${titleCase(rsrc.skill)} Lv ${rsrc.level} (have ${skillLevel(ch, rsrc.skill)})`);
      return;
    }
    blockers.push(`${itemName(code)}: no known way to obtain (need ${qty})`);
  };

  for (const t of targets) {
    // Top-up utility targets were normalized to their shortfall above — always
    // source them (the code matching the slot means "top the stack up").
    if (opts.topUp && t.slot?.startsWith("utility")) { need(t.code, t.quantity, []); continue; }
    if (equipped.has(t.code) && (t.slot ? slotCode(ch, t.slot) === t.code : true)) continue; // already equipped
    need(t.code, t.quantity, []);
  }

  // Emit steps in a valid execution order: raw acquisition, then skill
  // training (before the crafts it gates), then crafts (leaf→root), then equips.
  const steps: AcquisitionStep[] = [];
  for (const [code, qty] of withdraw) steps.push({ kind: "withdraw", code, quantity: qty, ...tileForContent("bank", "bank") });
  for (const [code, b] of buy) steps.push({ kind: "buy", code, quantity: b.qty, npc: b.npc, cost: b.qty * b.price, ...tileForContent("npc", b.npc) });
  for (const [code, g] of gather) steps.push({ kind: "gather", code, quantity: g.qty, resource: g.resource, level: g.level, ...tileForContent("resource", g.resource) });
  for (const [code, fm] of farm) {
    const p = 1 / Math.max(1, fm.rate);
    const expectedFights = Math.ceil(fm.qty / (p * Math.max(1, fm.avgQty)));
    steps.push({ kind: "farm", code, quantity: fm.qty, monster: fm.monster, expectedFights, ...tileForContent("monster", fm.monster) });
  }
  for (const [skill, tr] of trains) steps.push({ kind: "train", skill, toLevel: tr.toLevel, resource: tr.resource, level: tr.level, ...tileForContent("resource", tr.resource) });
  for (const c of crafts) steps.push({ kind: "craft", code: c.code, quantity: c.qty, skill: c.skill, level: c.level, ...tileForContent("workshop", c.skill) });
  for (const t of targets) {
    if (!t.slot) continue;
    const topUpUtility = opts.topUp && t.slot.startsWith("utility");
    if (!topUpUtility && slotCode(ch, t.slot) === t.code) continue; // already in the right slot
    steps.push({ kind: "equip", code: t.code, slot: t.slot, quantity: t.quantity });
  }

  // Cost estimate (a floor — ignores bank round-trips when the inventory fills
  // and any pathing beyond straight-line tile hops).
  let estActions = 0;
  let estSeconds = 0;
  for (const s of steps) {
    if (s.kind === "gather") { estActions += s.quantity; estSeconds += s.quantity * gatherSeconds(s.level); }
    else if (s.kind === "train") {
      const gathers = GATHERS_PER_LEVEL * Math.max(1, s.toLevel - skillLevel(ch, s.skill));
      estActions += gathers; estSeconds += gathers * gatherSeconds(s.level);
    }
    else if (s.kind === "craft") { estActions += s.quantity; estSeconds += craftSeconds(s.quantity); }
    else if (s.kind === "farm") { estActions += s.expectedFights; estSeconds += s.expectedFights * 25; }
    else if (s.kind === "withdraw" || s.kind === "buy") { estActions += 1; estSeconds += bankSeconds(1); }
    else if (s.kind === "equip") { estActions += 1; estSeconds += 3; }
  }

  return { steps, estActions, estSeconds: Math.round(estSeconds), feasible: blockers.length === 0, blockers };
}
