// Shared execution primitives for the queue runner — the risky mechanics
// (bank-off, food-first healing, forecast gating, craft chunking,
// unequip-then-equip) live once here, so any future runner built on top
// executes steps through the SAME code and the rules can't drift.
//
// This module is deliberately signal-free with respect to loop jobs: it may
// import actions/catalog/sim/store/loopkit but never a loop's job signal, so
// it can never participate in an import cycle. Callers pass a StepCtx with a
// `note` callback instead of writing to their own job record directly.

import * as actions from "../api/actions";
import { ApiError } from "../api/client";
import { item, itemName, npc as npcOf } from "../catalog";
import { currentFighter } from "../sim/stats";
import { simulate } from "../sim/combat";
import { jobGear, nextGearAction } from "../plan/jobgear";
import { carriedFood, foodPlan, foodQuantity, gatherSourceFor } from "../plan/consumables";
import { bankDetails, bankItems, characters } from "./store";
import { bankQty, depositAll, moveTo, nearest, nearestBank, step } from "./loopkit";
import { slotCode } from "../types/api";
import type { AcquisitionStep, FoodSpec, GearJob } from "../plan/types";
import type { Character, GearSlot } from "../types/api";
import type { CraftRecipe, Monster } from "../types/catalog";

export const invCount = (ch: Character): number => (ch.inventory || []).reduce((s, it) => s + (it.quantity || 0), 0);
const skillLevel = (ch: Character, skill: string): number => (ch as unknown as Record<string, number>)[`${skill}_level`] ?? 0;
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
  food?: boolean; // keep the fighter fed: eat before resting, provision when out (bank → cook → gather)
  fightsLeft?: number; // fights the current item still owes — sizes the food restock
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
 * Working stock of a brew in progress: for each desired utility potion with no
 * supply anywhere (the differ's unavailability guard skips its slot while
 * provisionPotions produces it), the potion code and its recipe ingredients.
 * MUST mirror provisionPotions' pending-brew conditions exactly. Without this
 * the swap ceremony's bank sweep deposits the very ingredients the brewer just
 * withdrew and the two ping-pong the stack forever (the withdraw/deposit
 * livelock caught in logs/dev.log, 2026-07-14).
 */
function brewKeep(ch: Character, desired: Partial<Record<GearSlot, string>>): string[] {
  const out: string[] = [];
  for (const g of ["utility1", "utility2"] as const) {
    const want = desired[g];
    if (!want || slotCode(ch, g) === want) continue;
    if (invQty(ch, want) > 0 || bankQty(want) > 0) continue; // differ equips it — no brew pending
    const recipe = item(want)?.craft;
    if (!recipe || skillLevel(ch, recipe.skill) < recipe.level) continue; // can't brew — nothing pending
    out.push(want, ...recipe.items.map((i) => i.code));
  }
  return out;
}

/**
 * Working stock of a cook in progress — the food-provisioning twin of
 * brewKeep. When the fighter's next meal must be cooked (or gathered+cooked),
 * provisionFood withdraws the recipe's stocked ingredients; raw ingredients
 * are NOT healing food, so keepOf's carried-food protection never covers them
 * and the swap sweep would stash them right back (the raw-beef loop, caught in
 * logs/dev.log 2026-07-14). Recomputes the same deterministic foodPlan the
 * provisioner uses, so the two can't disagree.
 */
function foodKeep(ch: Character): string[] {
  const plan = foodPlan(ch, bankItems.value, foodExclude(ch));
  if (!plan) return [];
  if (plan.source === "bank") return [plan.code];
  return [plan.code, ...plan.recipe.items.map((g) => g.code)];
}

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
  // Provisioning-in-progress stock is working stock — the sweep must not
  // stash a pending brew's ingredients or the next meal being cooked.
  const extra = [...brewKeep(ch, desired), ...(ctx.food ? foodKeep(ch) : [])];
  const keep = extra.length ? [...new Set([...(ctx.keep ?? []), ...extra])] : ctx.keep;
  const act = nextGearAction(ch, bankItems.value, desired, { keep, junk: opts?.junk, reset: opts?.reset });
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
        if (e instanceof ApiError && (e.code === 404 || e.code === 478)) {
          // Another character raced this bank stock away (404: the whole stack
          // is gone, 478: not enough left). Drop the raced codes locally (the
          // next bank echo restores authority) so the next tick re-plans with
          // the next-best set instead of hammering the same call.
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

/** What one runStep call actually did — the queue counts it toward the item's progress. */
export type StepResult =
  | { did: "acted" } // moved / withdrew / bought / gathered
  | { did: "banked" } // a bank-off ran instead of the action
  | { did: "crafted"; produced: number }; // items produced this call (times × recipe.quantity)

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
      try {
        await step(name, () => actions.withdrawItems(name, [{ code: s.code, quantity: qty }]));
      } catch (e) {
        if (e instanceof ApiError && (e.code === 404 || e.code === 478)) {
          // Another character raced this bank stock away (404: the whole stack
          // is gone, 478: not enough left). Drop the code locally (the next
          // bank echo restores authority) so the caller re-plans from the
          // corrected stock instead of pausing the queue.
          bankItems.value = bankItems.value.filter((b) => b.code !== s.code);
          ctx.note("bank changed — replanning");
          return { did: "acted" };
        }
        throw e;
      }
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

// ── Food provisioning (bank → cook → gather; see plan/consumables.ts) ────────

/** Never eat (or plan to cook) the item-task deliverable. */
const foodExclude = (ch: Character): string | undefined => (ch.task_type === "items" ? ch.task : undefined);

/** Best food already in hand — what a hurt fighter eats right now. */
export const foodInHand = (ch: Character): FoodSpec | undefined => carriedFood(ch, foodExclude(ch));

/** Restock horizon for infinite fight items — enough for a long stretch, re-provisioned when dry. */
const FOOD_HORIZON = 50;

/**
 * Potions brewed per expedition. Deliberately small: a brew only starts when
 * the potion has NO supply anywhere, so the fighter is standing around NOT
 * fighting while ingredients are gathered — a horizon-sized batch (50 × up to
 * 3 ingredients each) meant half an hour of sunflower picking before the first
 * swing. A small batch reaches the fights in minutes; when the worn stack
 * drains dry the next expedition brews the next batch.
 */
const BREW_BATCH = 15;

/**
 * One provisioning action toward having between-fight food in hand: withdraw
 * stocked food from the bank, else cook the best recipe the current stock can
 * feed, else gather the raw materials in the field and cook them. Returns
 * "none" when no source is feasible (missing workshop/resource/skill) — the
 * caller heals by rest instead; provisioning never pauses a queue.
 */
export async function provisionFood(name: string, ch: Character, m: Monster, ctx: StepCtx): Promise<"acted" | "none"> {
  const plan = foodPlan(ch, bankItems.value, foodExclude(ch));
  if (!plan) return "none";
  // Size the batch by the forecast's expected HP loss over the fights left.
  const f = simulate(currentFighter(ch), m);
  const perFight = Math.max(1, f.maxHp - f.hpRemaining);
  const fights = Math.min(ctx.fightsLeft ?? 1, FOOD_HORIZON);
  const stock = plan.source === "bank" ? plan.stock : Number.MAX_SAFE_INTEGER;
  const want = foodQuantity({ code: plan.code, heal: plan.heal, stock }, perFight, fights, ch);

  if (plan.source === "bank") {
    const bank = nearestBank(ch.x, ch.y);
    if (!bank) return "none";
    // The food is working stock while provisioning runs.
    const kctx: StepCtx = { ...ctx, keep: [...new Set([...(ctx.keep ?? []), plan.code])] };
    ctx.note(`restock ${itemName(plan.code)}`);
    await runStep(name, ch, { kind: "withdraw", code: plan.code, quantity: want, x: bank.x, y: bank.y }, kctx);
    return "acted";
  }
  return produceOnce(name, ch, plan.code, plan.recipe, want, ctx);
}

/**
 * One action toward producing `want`× `code` via `recipe` in the field:
 * assemble a bag-sized batch of ingredients (withdraw stocked ones from the
 * bank, gather the gatherable ones), then craft at the recipe's workshop.
 * Shared by food (cook) and utility-potion (brew) provisioning. "none" ⇒
 * infeasible right now (missing workshop/resource) — never an error.
 */
async function produceOnce(
  name: string,
  ch: Character,
  code: string,
  recipe: CraftRecipe,
  want: number,
  ctx: StepCtx,
): Promise<"acted" | "none"> {
  // The produce and its ingredients are working stock while provisioning runs.
  const keep = [...new Set([...(ctx.keep ?? []), code, ...recipe.items.map((g) => g.code)])];
  const kctx: StepCtx = { ...ctx, keep };
  const per = Math.max(1, recipe.quantity);
  const matsPerRun = Math.max(1, recipe.items.reduce((s, g) => s + g.quantity, 0));
  const matsHeld = recipe.items.reduce((s, g) => s + invQty(ch, g.code), 0);
  // Gatherable ingredients can always be topped up in the field; the others
  // cap the batch at what hand + bank actually supply (≥1 by plan feasibility).
  const runsCap = Math.min(
    ...recipe.items.map((g) => (gatherSourceFor(ch, g.code) ? Infinity : Math.floor((invQty(ch, g.code) + bankQty(g.code)) / g.quantity))),
  );
  const batch = Math.max(1, Math.min(Math.ceil(want / per), Math.floor((freeSpace(ch) + matsHeld) / matsPerRun), runsCap));
  const missing = recipe.items.find((g) => invQty(ch, g.code) < g.quantity * batch);
  if (!missing) {
    const tile = nearest("workshop", recipe.skill, ch.x, ch.y);
    if (!tile) return "none";
    ctx.note(`craft ${itemName(code)}`);
    await runStep(name, ch, { kind: "craft", code, quantity: batch * per, skill: recipe.skill, level: 0, x: tile.x, y: tile.y }, kctx);
    return "acted";
  }
  if (bankQty(missing.code) > 0) {
    const bank = nearestBank(ch.x, ch.y);
    if (!bank) return "none";
    const short = missing.quantity * batch - invQty(ch, missing.code);
    ctx.note(`withdraw ${itemName(missing.code)}`);
    await runStep(name, ch, { kind: "withdraw", code: missing.code, quantity: Math.min(short, bankQty(missing.code)), x: bank.x, y: bank.y }, kctx);
    return "acted";
  }
  const res = gatherSourceFor(ch, missing.code);
  const tile = res ? nearest("resource", res.code, ch.x, ch.y) : undefined;
  if (!res || !tile) return "none";
  if (freeSpace(ch) === 0) { await bankOff(name, ch.x, ch.y, keep, ctx.note); return "acted"; }
  ctx.note(`gather ${itemName(missing.code)} ${invQty(ch, missing.code)}/${missing.quantity * batch}`);
  await runStep(name, ch, { kind: "gather", code: missing.code, quantity: 1, resource: res.code, level: 0, x: tile.x, y: tile.y }, kctx);
  return "acted";
}

/**
 * One brewing action toward the desired set's utility potions: when a wanted
 * potion has NO supply anywhere (not in hand, not banked — the differ's
 * unavailability guard is leaving its slot as-is) but the character can brew
 * it, produce a fight-horizon batch; the next gear tick equips it. jobGear
 * only plans unowned potions in when they materially improve the forecast, so
 * getting here means the brew is worth the trip. "none" ⇒ nothing to brew.
 */
export async function provisionPotions(
  name: string,
  ch: Character,
  desired: Partial<Record<GearSlot, string>>,
  ctx: StepCtx,
): Promise<"acted" | "none"> {
  for (const g of ["utility1", "utility2"] as const) {
    const want = desired[g];
    if (!want || slotCode(ch, g) === want) continue;
    if (invQty(ch, want) > 0 || bankQty(want) > 0) continue; // the differ's job
    const recipe = item(want)?.craft;
    if (!recipe || skillLevel(ch, recipe.skill) < recipe.level) continue;
    // One potion fires (and is consumed) per fight at most — never brew more
    // than the fights left, and never more than a batch per expedition.
    const target = Math.min(ctx.fightsLeft ?? 1, BREW_BATCH);
    if ((await produceOnce(name, ch, want, recipe, target, ctx)) === "acted") return "acted";
  }
  return "none";
}

/**
 * A fight round's outcome. "acted" ⇒ an intermediate action (move/heal/bank)
 * ran; "won"/"lost" ⇒ a fight happened; the terminal outcomes are RETURNED
 * for the caller to decide (the queue pauses):
 *   "no-win"  — the fresh forecast refuses the fight
 *   "gave-up" — 2 losses in a row
 */
export type FightOutcome = "acted" | "won" | "lost" | "no-win" | "gave-up";

/**
 * One combat-phase action: walk to the tile, heal (food first — provisioning
 * more when the hand is empty and ctx.food is on), re-gate on a fresh
 * forecast, bank off overflow, then fight once. All the combat safety rules
 * in one place.
 */
export async function fightRound(
  name: string,
  ch: Character,
  m: Monster,
  tile: { x: number; y: number },
  S: { losses: number },
  ctx: StepCtx,
): Promise<FightOutcome> {
  if (ch.hp < ch.max_hp) {
    const food = foodInHand(ch);
    if (!food && ctx.food && (await provisionFood(name, ch, m, ctx)) === "acted") return "acted";
    await healOnce(name, ch, food, ctx.note);
    return "acted";
  }
  if (ch.x !== tile.x || ch.y !== tile.y) { ctx.note("→ monster"); await moveTo(name, tile.x, tile.y); return "acted"; }
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
