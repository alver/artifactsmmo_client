// Shared execution primitives for the plan-driven runners (campaign + queue).
//
// Extracted from campaign.ts so both the self-healing campaign loop and the
// static user-edited queue execute steps through the SAME code — the risky
// mechanics (bank-off, food-first healing, forecast gating, craft chunking,
// unequip-then-equip) live once here and can't drift between runners.
//
// This module is deliberately signal-free with respect to loop jobs: it may
// import actions/catalog/sim/store/loopkit but never a loop's job signal, so
// it can never participate in an import cycle. Callers pass a StepCtx with a
// `note` callback instead of writing to their own job record directly.

import * as actions from "../api/actions";
import { ApiError } from "../api/client";
import { item, itemName, monster as monsterOf, npc as npcOf } from "../catalog";
import { currentFighter } from "../sim/stats";
import { simulate } from "../sim/combat";
import { jobGear, nextGearAction } from "../plan/jobgear";
import { bankDetails, bankItems, characters } from "./store";
import { depositAll, moveTo, nearest, nearestBank, step, waitCooldownFull } from "./loopkit";
import type { AcquisitionStep, FoodSpec, GearJob } from "../plan/types";
import type { Character, GearSlot } from "../types/api";
import type { Monster } from "../types/catalog";

export const invCount = (ch: Character): number => (ch.inventory || []).reduce((s, it) => s + (it.quantity || 0), 0);
export const invQty = (ch: Character, code: string): number =>
  (ch.inventory || []).reduce((s, it) => s + (it.code === code ? it.quantity : 0), 0);
export const freeSpace = (ch: Character): number => Math.max(0, ch.inventory_max_items - invCount(ch));

/** Recipe executions of `code` possible from materials in hand (≤ wantItems). */
export function craftableTimes(ch: Character, code: string, wantItems: number): number {
  const recipe = item(code)?.craft;
  if (!recipe) return 0;
  let times = Math.ceil(wantItems / Math.max(1, recipe.quantity));
  for (const ing of recipe.items) times = Math.min(times, Math.floor(invQty(ch, ing.code) / ing.quantity));
  return Math.max(0, times);
}

/** How a runner surfaces live status + protects working stock while a step runs. */
export interface StepCtx {
  keep?: string[]; // never auto-deposited when banking off overflow
  food?: FoodSpec; // eat this before resting
  note: (text: string) => void; // short human status shown on the card
}

/**
 * Move to the nearest bank and deposit everything but the protected working
 * stock. Throws when depositing would free nothing (the whole bag is
 * protected) — a clean stop beats a bank↔tile livelock.
 */
export async function bankOff(name: string, fromX: number, fromY: number, keep: string[] | undefined, note: StepCtx["note"]): Promise<void> {
  const bank = nearestBank(fromX, fromY);
  if (!bank) throw new Error("inventory full and no bank found on the map");
  const ch = characters.value[name];
  if (keep?.length && ch && !(ch.inventory || []).some((it) => it.code && it.quantity > 0 && !keep.includes(it.code))) {
    throw new Error("inventory full of protected working stock");
  }
  note("→ bank (full)");
  await moveTo(name, bank.x, bank.y);
  await depositAll(name, keep?.length ? new Set(keep) : undefined);
}

/** One healing action: eat the given food when it covers the deficit, else rest. */
export async function healOnce(name: string, ch: Character, food: FoodSpec | undefined, note: StepCtx["note"]): Promise<void> {
  const deficit = ch.max_hp - ch.hp;
  if (food && deficit >= food.heal) {
    const held = invQty(ch, food.code);
    if (held > 0) {
      const n = Math.max(1, Math.min(Math.floor(deficit / food.heal), held));
      note(`eat ${itemName(food.code)}`);
      await step(name, () => actions.use(name, food.code, n));
      return;
    }
  }
  note("healing");
  await step(name, () => actions.rest(name));
}

/** Walk to the given Tasks Master. "there" ⇒ standing on it; "moving" ⇒ a move was issued. */
export async function goToMaster(name: string, ch: Character, type: "monsters" | "items", note: StepCtx["note"]): Promise<"missing" | "moving" | "there"> {
  const master = nearest("tasks_master", type, ch.x, ch.y);
  if (!master) return "missing";
  if (ch.x === master.x && ch.y === master.y) return "there";
  note("→ tasks master");
  await moveTo(name, master.x, master.y);
  return "moving";
}

// ── Bank-centric gear swapping (see plan/jobgear.ts for the planning side) ───

/**
 * One step of the gear-swap ceremony toward `desired`: unequip mismatches →
 * equip from hand → withdraw from bank → stow replaced/junk gear → bag last.
 * Batched season-8 equip/unequip calls keep a full swap at ~5 requests.
 * Returns "done" (converged — no action, no cooldown) or "acted".
 */
export async function gearSwapStep(
  name: string,
  ch: Character,
  desired: Partial<Record<GearSlot, string>>,
  ctx: StepCtx,
  opts?: { junk?: boolean; reset?: boolean },
): Promise<"done" | "acted"> {
  const act = nextGearAction(ch, bankItems.value, desired, { keep: ctx.keep, junk: opts?.junk, reset: opts?.reset });
  if (!act) return "done";

  const toBank = async (): Promise<boolean> => {
    const bank = nearestBank(ch.x, ch.y);
    if (!bank) throw new Error("no bank found on the map");
    if (ch.x === bank.x && ch.y === bank.y) return false;
    ctx.note("→ bank (gear)");
    await moveTo(name, bank.x, bank.y);
    return true;
  };

  switch (act.kind) {
    case "goto-bank":
      await toBank();
      return "acted";
    case "unequip":
      ctx.note("swap gear");
      await step(name, () => actions.unequipMany(name, act.slots));
      return "acted";
    case "equip":
      ctx.note("equip gear");
      await step(name, () => actions.equipMany(name, act.items));
      return "acted";
    case "withdraw": {
      if (await toBank()) return "acted";
      ctx.note("withdraw gear");
      try {
        await step(name, () => actions.withdrawItems(name, act.items));
      } catch (e) {
        if (e instanceof ApiError && e.code === 478) {
          // Another character raced this bank stock away. Drop the raced codes
          // locally (the next bank echo restores authority) so the next tick
          // re-plans with the next-best set instead of hammering the same call.
          const raced = new Set(act.items.map((i) => i.code));
          bankItems.value = bankItems.value.filter((b) => !raced.has(b.code));
          ctx.note("bank changed — replanning");
          return "acted";
        }
        throw e;
      }
      return "acted";
    }
    case "deposit": {
      if (await toBank()) return "acted";
      ctx.note("stow gear");
      await step(name, () => actions.depositItems(name, act.items));
      return "acted";
    }
    case "deposit-gold": {
      if (await toBank()) return "acted";
      ctx.note("deposit gold");
      await step(name, () => actions.depositGold(name, act.quantity));
      return "acted";
    }
  }
}

/**
 * jobGear for the live-job callers (standalone loops, hand-added queue items).
 * Fight sets run the BIS solver (thousands of simulate calls), so they are
 * memoized per character until the bank contents (by reference — replaced
 * wholesale on every bank echo), level, or job change; gather/craft sets are a
 * cheap scan and computed fresh.
 */
const fightSetMemo = new Map<string, { bank: unknown; level: number; key: string; desired?: Partial<Record<GearSlot, string>> }>();
export function desiredForJob(name: string, ch: Character, job: GearJob): Partial<Record<GearSlot, string>> | undefined {
  if (job.kind !== "fight") return jobGear(ch, bankItems.value, job);
  const key = job.monster;
  const m = fightSetMemo.get(name);
  if (m && m.bank === bankItems.value && m.level === ch.level && m.key === key) return m.desired;
  const desired = jobGear(ch, bankItems.value, job);
  fightSetMemo.set(name, { bank: bankItems.value, level: ch.level, key, desired });
  return desired;
}

/**
 * What one runStep call actually did. The campaign ignores it (it re-derives
 * from live state every tick); the queue counts it toward the item's progress.
 */
export type StepResult =
  | { did: "acted" } // moved / withdrew / bought / gathered
  | { did: "banked" } // a bank-off ran instead of the action
  | { did: "healed" } // farm path healed instead of fighting
  | { did: "crafted"; produced: number } // items produced this call (times × recipe.quantity)
  | { did: "fought"; won: boolean }; // farm path fought once

/** Execute one acquisition step (one cooldown action). Throws on failure (caller decides). */
export async function runStep(name: string, ch: Character, s: AcquisitionStep, ctx: StepCtx): Promise<StepResult> {
  const keep = ctx.keep;
  const needTile = (): { x: number; y: number } => {
    if ((s as { x?: number }).x == null) throw new Error(`no map tile for ${s.kind} ${(s as { code?: string }).code ?? ""}`);
    return { x: (s as { x: number }).x, y: (s as { y: number }).y };
  };

  switch (s.kind) {
    case "withdraw": {
      const t = needTile();
      ctx.note(`withdraw ${itemName(s.code)}`);
      await moveTo(name, t.x, t.y);
      const cur = characters.value[name] ?? ch;
      const qty = Math.min(s.quantity, freeSpace(cur));
      if (qty <= 0) { await bankOff(name, t.x, t.y, keep, ctx.note); return { did: "banked" }; } // make room (throws if all-protected)
      await step(name, () => actions.withdrawItems(name, [{ code: s.code, quantity: qty }]));
      return { did: "acted" };
    }
    case "buy": {
      const t = needTile();
      // Pocket gold is swept into the bank on every deposit (see depositAll),
      // so a buy self-funds: withdraw the shortfall from the vault first.
      const unit = npcOf(s.npc)?.items?.find((i) => i.code === s.code && i.currency === "gold")?.buy_price;
      const cost = unit != null ? unit * s.quantity : s.cost;
      const cur0 = characters.value[name] ?? ch;
      if (cost > 0 && cur0.gold < cost) {
        const missing = cost - cur0.gold;
        if ((bankDetails.value?.gold ?? 0) < missing) throw new Error(`not enough gold for ${s.quantity}× ${itemName(s.code)} (need ${cost.toLocaleString()}g)`);
        const bank = nearestBank(cur0.x, cur0.y);
        if (!bank) throw new Error("no bank found on the map");
        ctx.note("withdraw gold");
        await moveTo(name, bank.x, bank.y);
        await step(name, () => actions.withdrawGold(name, missing));
        return { did: "acted" };
      }
      ctx.note(`buy ${itemName(s.code)}`);
      await moveTo(name, t.x, t.y);
      await step(name, () => actions.npcBuy(name, s.code, s.quantity));
      return { did: "acted" };
    }
    case "gather":
    case "train": {
      // For "train": one gather per tick; the caller notices the level echo
      // and drops the step by itself (no polling).
      const t = needTile();
      ctx.note(s.kind === "train" ? `train ${s.skill} → Lv ${s.toLevel}` : `gather ${itemName(s.code)}`);
      await moveTo(name, t.x, t.y);
      if (invCount(characters.value[name] ?? ch) >= ch.inventory_max_items) { await bankOff(name, t.x, t.y, keep, ctx.note); return { did: "banked" }; }
      await step(name, () => actions.gather(name));
      return { did: "acted" };
    }
    case "farm": {
      const t = needTile();
      ctx.note(`farm ${itemName(s.code)}`);
      await moveTo(name, t.x, t.y);
      const cur = characters.value[name] ?? ch;
      const m = monsterOf(s.monster);
      if (m && !simulate(currentFighter(cur), m).win) throw new Error(`can't farm ${m.name} — not a safe win`);
      if (cur.hp < cur.max_hp) { await healOnce(name, cur, ctx.food, ctx.note); return { did: "healed" }; }
      if (invCount(cur) >= cur.inventory_max_items) { await bankOff(name, t.x, t.y, keep, ctx.note); return { did: "banked" }; }
      const r = await actions.fight(name);
      await waitCooldownFull(name);
      return { did: "fought", won: r.fight?.result === "win" };
    }
    case "craft": {
      const t = needTile();
      ctx.note(`craft ${itemName(s.code)}`);
      await moveTo(name, t.x, t.y);
      const recipe = item(s.code)?.craft;
      if (recipe) {
        // The step's quantity counts items PRODUCED; the API's counts recipe
        // executions. Convert, and chunk by the materials actually in hand —
        // the caller sources the remainder.
        const times = craftableTimes(characters.value[name] ?? ch, s.code, s.quantity);
        if (times <= 0) throw new Error(`missing materials to craft ${itemName(s.code)}`);
        await step(name, () => actions.craft(name, s.code, times));
        return { did: "crafted", produced: times * Math.max(1, recipe.quantity) };
      }
      await step(name, () => actions.craft(name, s.code, s.quantity));
      return { did: "crafted", produced: s.quantity };
    }
  }
}

/**
 * A fight round's outcome. "acted" ⇒ an intermediate action (move/heal/bank)
 * ran; "won"/"lost" ⇒ a fight happened; the terminal outcomes are RETURNED
 * for the caller to decide (the campaign finishes, the queue pauses):
 *   "no-win"  — the fresh forecast refuses the fight
 *   "gave-up" — 2 losses in a row
 */
export type FightOutcome = "acted" | "won" | "lost" | "no-win" | "gave-up";

/**
 * One combat-phase action: walk to the tile, heal (food first), re-gate on a
 * fresh forecast, bank off overflow, then fight once. Shared by the campaign
 * and the queue so the combat safety rules can't drift between them.
 */
export async function fightRound(
  name: string,
  ch: Character,
  m: Monster,
  tile: { x: number; y: number },
  S: { losses: number },
  ctx: StepCtx,
): Promise<FightOutcome> {
  if (ch.x !== tile.x || ch.y !== tile.y) { ctx.note("→ monster"); await moveTo(name, tile.x, tile.y); return "acted"; }
  if (ch.hp < ch.max_hp) { await healOnce(name, ch, ctx.food, ctx.note); return "acted"; }
  // Re-forecast with actual current gear; refuse a fight that isn't a win.
  if (!simulate(currentFighter(ch), m).win) return "no-win";
  if (invCount(ch) >= ch.inventory_max_items) { await bankOff(name, tile.x, tile.y, ctx.keep, ctx.note); return "acted"; }

  const r = await actions.fight(name);
  const won = r.fight?.result === "win";
  if (won) {
    S.losses = 0;
  } else {
    S.losses += 1;
    if (S.losses >= 2) return "gave-up";
    // A single loss is usually variance — the caller logs it; the next tick
    // walks back from spawn, heals, re-forecasts, and retries once.
  }
  await step(name, () => Promise.resolve()); // wait out the fight cooldown
  return won ? "won" : "lost";
}
