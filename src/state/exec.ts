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
import { item, itemName, monster as monsterOf, npc as npcOf } from "../catalog";
import { currentFighter, equippedCodes, fighterForGear } from "../sim/stats";
import { simulate } from "../sim/combat";
import { winRate } from "../sim/monte";
import { MIN_WIN, fightSig } from "../plan/bis";
import { journal } from "../lib/journal";
import { fightWinSeconds, jobGear, jobSetFromRecommendation, nextGearAction, ownedFightRec } from "../plan/jobgear";
import { carriedFood, foodPlan, foodQuantity, gatherSourceFor } from "../plan/consumables";
import { bankDetails, bankItems, characters, isOwned } from "./store";
import { BankFullError, NoRouteError, bankQty, deposit, depositAll, isAt, moveTo, nearest, nearestBank, noSlotFor, reportNoSlot, step } from "./loopkit";
import { slotCode, slotQuantity } from "../types/api";
import type { AcquisitionStep, FoodSpec, GearJob } from "../plan/types";
import type { Place } from "../plan/route";
import type { BankItem, Character, GearSlot } from "../types/api";
import type { CraftRecipe, Monster } from "../types/catalog";
import type { FightForecast } from "../sim/combat";

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
  gold?: number; // task 017: a trip's fares — pocket gold no bank-off sweeps
  bought?: () => void; // called the moment an npc/buy succeeds, before its cooldown is waited out
  note: (text: string) => void; // short human status shown on the card
}

/**
 * Move to the nearest bank and deposit everything but the protected working
 * stock. Throws when depositing would free nothing (the whole bag is
 * protected) — a clean stop beats a bank↔tile livelock. A bank more than one
 * leg away takes several calls: each walks one leg, the one that arrives
 * deposits (callers re-check the full bag first thing every tick).
 */
export async function bankOff(name: string, keep: string[] | undefined, note: StepCtx["note"], gold = 0): Promise<void> {
  const ch = characters.value[name];
  const bank = ch && nearestBank(ch);
  // task 017: no bank reachable (behind a transition it cannot pay) ends the item (runLoop skips it), never a pause
  if (!bank) throw new NoRouteError("inventory full and no bank reachable — behind a transition it cannot pass now");
  const loose = (ch.inventory || []).filter((it) => it.code && it.quantity > 0 && !keep?.includes(it.code)).map((it) => it.code);
  if (keep?.length && !loose.length) {
    throw new Error("inventory full of protected working stock");
  }
  // task 015, settled point 1: nothing in the bag the bank has a slot for — no walk; the item ends (runLoop)
  const stuck = noSlotFor(loose);
  if (loose.length && stuck.length === loose.length) {
    reportNoSlot(name, stuck);
    throw new BankFullError(`the bag is full and the bank has no slot for ${stuck.map(itemName).join(", ")}`);
  }
  note("→ bank (full)");
  if (await moveTo(name, bank)) await depositAll(name, keep?.length ? new Set(keep) : undefined, gold);
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
  const master = nearest("tasks_master", type, ch);
  if (!master) return "missing";
  if (isAt(ch, master)) return "there";
  note("→ tasks master");
  await moveTo(name, master);
  return "moving";
}

// ── Bank-centric gear swapping (see plan/jobgear.ts for the planning side) ───

/**
 * Working stock of a brew in progress: for each desired utility potion with no
 * supply anywhere (the differ's unavailability guard skips its slot while
 * provisionPotions produces it), the potion code and its recipe ingredients.
 * Mirrors provisionPotions' pending-brew conditions. Used by a RESET's stash
 * (a job start in the middle of a brew keeps the ingredients) and by a swap
 * that has to make room at the bank (jobgear roomOf). A plain swap no longer
 * banks loot, so a mismatch here costs one re-fetch at worst — it used to be
 * the withdraw/deposit livelock of 2026-07-14, when the swap swept the bag.
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
 * brewKeep, with the same two users (a reset's stash, a swap making room).
 * When the fighter's next meal must be cooked (or gathered+cooked),
 * provisionFood withdraws the recipe's stocked ingredients; raw ingredients
 * are NOT healing food, so keepOf's carried-food protection never covers them
 * (under the old bag sweep that was the raw-beef loop of 2026-07-14).
 * Recomputes the same deterministic foodPlan the provisioner uses.
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
 * Not a bank-off: outside a reset it never deposits loot beyond the room the
 * swap itself needs (plan/jobgear.ts roomOf).
 * Batched season-8 equip/unequip calls keep a full swap at ~5 requests.
 * Returns "done" (converged — no action, no cooldown) or "acted".
 */
export async function gearSwapStep(
  name: string,
  ch: Character,
  desired: Partial<Record<GearSlot, string>>,
  ctx: StepCtx,
  opts?: { junk?: boolean; reset?: boolean; utility?: Record<string, number>; gold?: number },
): Promise<"done" | "acted"> {
  // Provisioning-in-progress stock is working stock — neither a reset's stash
  // nor a make-room deposit may take a pending brew's ingredients or the next
  // meal being cooked.
  // task 015, settled point 1: a code the bank has no slot for stays in the bag — never a deposit the bank refuses
  const extra = [...brewKeep(ch, desired), ...(ctx.food ? foodKeep(ch) : []), ...noSlotFor((ch.inventory ?? []).filter((s) => s.code && s.quantity > 0 && !ctx.keep?.includes(s.code)).map((s) => s.code))];
  const keep = extra.length ? [...new Set([...(ctx.keep ?? []), ...extra])] : ctx.keep;
  const act = nextGearAction(ch, bankItems.value, desired, { keep, junk: opts?.junk, reset: opts?.reset, utility: opts?.utility, gold: opts?.gold });
  if (!act) return "done";

  const toBank = async (): Promise<boolean> => {
    const bank = nearestBank(ch);
    if (!bank) throw new NoRouteError("no bank reachable — behind a transition it cannot pass now"); // task 017: a skip, not a pause
    if (isAt(ch, bank)) return false;
    ctx.note("→ bank (gear)");
    await moveTo(name, bank);
    return true;
  };

  switch (act.kind) {
    case "goto-bank":
      await toBank();
      return "acted";
    case "unequip":
      ctx.note("swap gear");
      try {
        await step(name, () => actions.unequipMany(name, act.slots));
      } catch (e) {
        // 483: stripping +HP gear at low health would drop the character to
        // 0 HP and the game refuses ("does not have enough HP to unequip").
        // Heal a step (food first, else rest) and let the next tick retry —
        // full HP always clears it, since an item's HP bonus is always
        // smaller than the max HP that includes it.
        if (e instanceof ApiError && e.code === 483) {
          await healOnce(name, ch, foodInHand(ch), ctx.note);
          return "acted";
        }
        throw e;
      }
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
      await deposit(name, act.items);
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
 * Task 023: what the planner's running steps hold for themselves — stock.ts reserved on the live World, every character's
 * but `name`'s (state/planner.ts sets it). An owned character's own fight solves and its offerings leave it in the bank.
 * Nothing until the planner runs (a check, the tab).
 */
let reservedOf: (name: string) => Map<string, number> = () => new Map();
export const setReservedOf = (f: (name: string) => Map<string, number>): void => void (reservedOf = f);
/** Bank stock of a code a character may take for its own fights and offerings: for an owned one, the bank less what the
 *  others' running steps reserved. */
export const freeQty = (name: string, code: string): number => Math.max(0, bankQty(code) - (isOwned(name) ? (reservedOf(name).get(code) ?? 0) : 0));

const freeMemo = new Map<string, { bank: BankItem[]; sig: string; free: BankItem[] }>();
/** The bank an owned character's own fight solve reads (freeQty for every code), and the reservations' signature. */
function freeBank(name: string): { bank: BankItem[]; sig: string } {
  const res = reservedOf(name);
  const sig = [...res].filter(([, q]) => q > 0).map(([c, q]) => `${c}:${q}`).sort().join(",");
  if (!sig) return { bank: bankItems.value, sig };
  const m = freeMemo.get(name);
  if (m && m.bank === bankItems.value && m.sig === sig) return { bank: m.free, sig };
  const q = new Map<string, number>();
  for (const b of bankItems.value) q.set(b.code, (q.get(b.code) ?? 0) + b.quantity);
  const free = [...q].map(([code, n]) => ({ code, quantity: n - (res.get(code) ?? 0) })).filter((b) => b.quantity > 0);
  freeMemo.set(name, { bank: bankItems.value, sig, free });
  return { bank: free, sig };
}

/** A fight's set, the forecast of exactly that set (what the gate sees once it is worn) and its seconds a kill. */
export interface FightSet { desired?: Partial<Record<GearSlot, string>>; forecast?: FightForecast; sec?: number; p?: number }
const UTILITY = ["utility1", "utility2"] as const;
/**
 * jobGear for the live-job callers. Fight sets run the BIS solver (thousands of simulate calls), so they are memoized per
 * character and job until the bank contents (by reference — replaced wholesale on every bank echo), the others' reservations
 * or the level change — task 023, settled point 2 (a): or a utility stack the set named is gone (not worn, not in the bag,
 * none the bank may give): a drained stack re-solves. Gather/craft sets are a cheap scan and computed fresh.
 */
const fightSetMemo = new Map<string, FightSet & { bank: unknown; sig: string; level: number }>();
/** Task 014: `take` — an owned step's planned consumables (the fight item's): its solve counts only those potions. */
export function desiredForJob(name: string, ch: Character, job: GearJob, take?: Record<string, number>): Partial<Record<GearSlot, string>> | undefined {
  if (job.kind !== "fight") return jobGear(ch, bankItems.value, job);
  return fightSetFor(name, ch, job.monster, take).desired;
}
/**
 * Task 023, settled point 2: one verdict. The set a character's fight wears and the forecast of that very set — what
 * chooses a fight (queue.ts canBeat: a train loop's recipe, an offering's dry run) and what the gate admits it by
 * (fightRound) judge the same set with the same stacks. An owned character outside a planned take (a train loop's hunt,
 * an offering's, a task's) gets no brew set (b): the best set of what it holds and the bank may give it (freeQty), its
 * potions priced as the executor prices them; with a take, the take's solve (task 014); a character the planner does not
 * own, today's jobGear with its brew escalation (provisionPotions brews for it).
 */
export function fightSetFor(name: string, ch: Character, monster: string, take?: Record<string, number>): FightSet {
  const own = !take && isOwned(name);
  const { bank, sig } = own ? freeBank(name) : { bank: bankItems.value, sig: "" };
  const free = (c: string): number => (own ? freeQty(name, c) : bankQty(c));
  const key = `${name}|${monster}${take ? `|${JSON.stringify(take)}` : ""}`;
  const m = fightSetMemo.get(key);
  const gone = (d: FightSet["desired"]): boolean => UTILITY.some((g) => {
    const c = d?.[g];
    return !!c && !UTILITY.some((u) => slotCode(ch, u) === c) && invQty(ch, c) === 0 && free(c) === 0;
  });
  if (m && m.bank === bankItems.value && m.sig === sig && m.level === ch.level && !gone(m.desired)) return m;
  let desired: FightSet["desired"];
  if (own) {
    const rec = ownedFightRec(ch, bank, monster, minWin);
    desired = rec && jobSetFromRecommendation(ch, bankItems.value, rec);
  } else desired = jobGear(ch, bankItems.value, { kind: "fight", monster }, take);
  const mon = monsterOf(monster);
  const fighter = desired && mon ? fighterForGear(ch, Object.values(desired).filter((c): c is string => !!c)) : undefined;
  const forecast = fighter && mon ? simulate(fighter, mon) : undefined;
  // task 025: the verdict of exactly that set — p (what the gate reads once it is worn) and its expected seconds a win
  const p = fighter && mon && forecast?.win && !forecast.timedOut ? winRate(fighter, mon) : 0;
  const v = { bank: bankItems.value, sig, level: ch.level, desired, forecast, p, sec: forecast && fightWinSeconds(forecast, p, bank) };
  fightSetMemo.set(key, v);
  return v;
}
/** Task 023, settled point 2 (b): what a swap toward an owned character's own fight set (no take) may put in its utility
 *  slots — what it wears and holds of a potion plus what the bank may give it (freeQty), one stack at most; undefined for a
 *  character the planner does not own (a whole stack, as before). */
export function stackCaps(name: string, ch: Character, desired: Partial<Record<GearSlot, string>> | undefined): Record<string, number> | undefined {
  if (!isOwned(name) || !desired) return undefined;
  const out: Record<string, number> = {};
  for (const g of UTILITY) {
    const c = desired[g];
    if (c) out[c] = Math.min(100, UTILITY.reduce((t, u) => t + (slotCode(ch, u) === c ? slotQuantity(ch, u) : 0), 0) + invQty(ch, c) + freeQty(name, c));
  }
  return out;
}

/** What one runStep call actually did — the queue counts it toward the item's progress. */
export type StepResult =
  | { did: "acted" } // withdrew / bought / gathered (or withdrew the gold for a buy)
  | { did: "moved" } // walked one leg of a longer route; the action comes on a later tick
  | { did: "banked" } // a bank-off ran instead of the action
  | { did: "crafted"; produced: number }; // items produced this call (times × recipe.quantity)

/** Execute one acquisition step (one cooldown action). Throws on failure (caller decides). */
export async function runStep(name: string, ch: Character, s: AcquisitionStep, ctx: StepCtx): Promise<StepResult> {
  const keep = ctx.keep;

  switch (s.kind) {
    case "withdraw": {
      ctx.note(`withdraw ${itemName(s.code)}`);
      if (!(await moveTo(name, s.at))) return { did: "moved" };
      const cur = characters.value[name] ?? ch;
      const qty = Math.min(s.quantity, freeSpace(cur));
      if (qty <= 0) { await bankOff(name, keep, ctx.note); return { did: "banked" }; } // make room (throws if all-protected)
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
      // Pocket gold is swept into the bank on every deposit (see depositAll),
      // so a buy self-funds: withdraw the shortfall from the vault first.
      const unit = npcOf(s.npc)?.items?.find((i) => i.code === s.code && i.currency === "gold")?.buy_price;
      const cost = unit != null ? unit * s.quantity : s.cost;
      const cur0 = characters.value[name] ?? ch;
      if (cost > 0 && cur0.gold < cost) {
        const missing = cost - cur0.gold;
        if ((bankDetails.value?.gold ?? 0) < missing) throw new Error(`not enough gold for ${s.quantity}× ${itemName(s.code)} (need ${cost.toLocaleString()}g)`);
        const bank = nearestBank(cur0);
        if (!bank) throw new Error("no bank found on the map");
        ctx.note("withdraw gold");
        if (!(await moveTo(name, bank))) return { did: "moved" };
        await step(name, () => actions.withdrawGold(name, missing));
        return { did: "acted" };
      }
      ctx.note(`buy ${itemName(s.code)}`);
      if (!(await moveTo(name, s.at))) return { did: "moved" };
      await step(name, async () => {
        await actions.npcBuy(name, s.code, s.quantity);
        ctx.bought?.(); // recorded before the cooldown: a restart inside it must not buy again
      });
      return { did: "acted" };
    }
    case "gather":
    case "train": {
      // For "train": one gather per tick; the caller notices the level echo
      // and drops the step by itself (no polling).
      // The full bag first: a bank trip of several legs must not turn back toward the node between them.
      if (invCount(characters.value[name] ?? ch) >= ch.inventory_max_items) { await bankOff(name, keep, ctx.note, ctx.gold); return { did: "banked" }; }
      ctx.note(s.kind === "train" ? `train ${s.skill}${s.toLevel > 0 ? ` → Lv ${s.toLevel}` : ""}` : `gather ${itemName(s.code)}`);
      if (!(await moveTo(name, s.at))) return { did: "moved" };
      await step(name, () => actions.gather(name));
      return { did: "acted" };
    }
    case "craft": {
      ctx.note(`craft ${itemName(s.code)}`);
      if (!(await moveTo(name, s.at))) return { did: "moved" };
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
 * At most this many potions a brew (task 010; a guess: three of the old 15-potion batches). A brew starts only when
 * the potion has NO supply anywhere; the batch is what the item's remaining fights drink by the forecast — a restore
 * potion fires every own turn under half HP, so 16 small health potions lasted four to six pig fights (dev.log
 * 2026-11-19 14:50–14:58) and the old cap of 15 sent the fighter back to the sunflowers every few minutes.
 */
const BREW_MAX = 45;

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
    const bank = nearestBank(ch);
    if (!bank) return "none";
    // The food is working stock while provisioning runs.
    const kctx: StepCtx = { ...ctx, keep: [...new Set([...(ctx.keep ?? []), plan.code])] };
    ctx.note(`restock ${itemName(plan.code)}`);
    await runStep(name, ch, { kind: "withdraw", code: plan.code, quantity: want, at: bank }, kctx);
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
    const tile = nearest("workshop", recipe.skill, ch);
    if (!tile) return "none";
    ctx.note(`craft ${itemName(code)}`);
    await runStep(name, ch, { kind: "craft", code, quantity: batch * per, skill: recipe.skill, level: 0, at: tile }, kctx);
    return "acted";
  }
  if (bankQty(missing.code) > 0) {
    const bank = nearestBank(ch);
    if (!bank) return "none";
    const short = missing.quantity * batch - invQty(ch, missing.code);
    ctx.note(`withdraw ${itemName(missing.code)}`);
    await runStep(name, ch, { kind: "withdraw", code: missing.code, quantity: Math.min(short, bankQty(missing.code)), at: bank }, kctx);
    return "acted";
  }
  const res = gatherSourceFor(ch, missing.code);
  const tile = res ? nearest("resource", res.code, ch) : undefined;
  if (!res || !tile) return "none";
  if (freeSpace(ch) === 0) { await bankOff(name, keep, ctx.note); return "acted"; }
  ctx.note(`gather ${itemName(missing.code)} ${invQty(ch, missing.code)}/${missing.quantity * batch}`);
  await runStep(name, ch, { kind: "gather", code: missing.code, quantity: 1, resource: res.code, level: 0, at: tile }, kctx);
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
    // Units a fight drinks, by the forecast of the set being brewed for (desiredForJob's memo knows its monster).
    const memo = [...fightSetMemo].find(([k, v]) => k.startsWith(`${name}|`) && v.desired === desired);
    const mon = memo ? monsterOf(memo[0].split("|")[1]) : undefined;
    const perFight = mon ? simulate(fighterForGear(ch, Object.values(desired).filter((c): c is string => !!c)), mon).used[want] ?? 0 : 1;
    const target = Math.min(BREW_MAX, Math.max(1, Math.ceil((ctx.fightsLeft ?? 1) * perFight)));
    if ((await produceOnce(name, ch, want, recipe, target, ctx)) === "acted") return "acted";
  }
  return "none";
}

// ── task 025, settled point 2: the verdict in the executor ───────────────────

/** The floor the gate admits a fight at — the planner's config.risk.minWin (state/planner.ts sets it), MIN_WIN without it. */
let minWin = MIN_WIN;
export const setMinWin = (v: number): void => void (minWin = v);
export const minWinNow = (): number => minWin;
/** The gate's p: the rolled win rate (sim/monte.ts winRate) of the character as the API gives it — its stats, its worn set
 *  and stacks — against the monster; 0 when the expected fight is no win. The planner's solve folds the same set on the same
 *  base stats (scripts/check-stats.mts), so the same fight gives it the same number (the seed is the fight). */
export function gateP(ch: Character, m: Monster): number {
  const f = currentFighter(ch);
  const ev = simulate(f, m);
  return ev.win && !ev.timedOut ? winRate(f, m) : 0;
}
/** One item's fights against its monster, for the brake: the fights, the losses and the forecast's p summed. */
export interface FightTally { item: string; fights: number; losses: number; pSum: number }
/** P(X ≥ k) for X ~ Binomial(n, q): the chance of k or more losses in n fights at a loss rate q. */
export function lossTail(n: number, k: number, q: number): number {
  if (k <= 0) return 1;
  if (q <= 0) return 0;
  if (q >= 1) return 1;
  let term = Math.pow(1 - q, n), below = 0; // P(X = 0)
  for (let i = 0; i < k; i++) { below += term; term *= ((n - i) / (i + 1)) * (q / (1 - q)); }
  return Math.max(0, 1 - below);
}
/** Task 025, settled point 2: the brake is play against the forecast — at least BRAKE_LOSSES losses, and that many or more
 *  in that many fights had a chance below BRAKE_TAIL at the forecast's p (its mean over the fights). */
export const BRAKE_LOSSES = 3;
export const BRAKE_TAIL = 0.05;
export function braking(t: FightTally): boolean {
  return t.losses >= BRAKE_LOSSES && lossTail(t.fights, t.losses, 1 - t.pSum / Math.max(1, t.fights)) < BRAKE_TAIL;
}
/** The brake's why: forecast and observed, e.g. "forecast 82%, won 3 of 9". */
export const brakeWhy = (t: FightTally): string => `forecast ${Math.round((100 * t.pSum) / Math.max(1, t.fights))}%, won ${t.fights - t.losses} of ${t.fights}`;

/** Who blocks a monster for a character (state/planner.ts: an owned character's block until its set or level changes or
 *  24 h pass; nothing for the others) and who reads that block (canBeat, an offering's dry run). */
let onFightBlock: (name: string, monster: string, why: string, set: string, level: number) => void = () => {};
let fightBlockOf: (name: string, monster: string) => { set?: string; level?: number; until: number; why: string } | undefined = () => undefined;
export const setFightBlocks = (write: typeof onFightBlock, read: typeof fightBlockOf): void => { onFightBlock = write; fightBlockOf = read; };
/** Task 025: block `monster` for this character — the brake or a gate that refuses (the why says which). */
export const blockFight = (name: string, ch: Character, monster: string, why: string): void =>
  onFightBlock(name, monster, why, fightSig(equippedCodes(ch)), ch.level);
/** Whether a block holds for this character and the set it would wear (`codes`). */
export function fightBlocked(name: string, ch: Character, monster: string, codes: string[]): boolean {
  const b = fightBlockOf(name, monster);
  return !!b && b.until > Date.now() && (b.level == null || b.level === ch.level) && (b.set == null || b.set === fightSig(codes));
}
/** Task 025: a character beaten to 1 HP cannot unequip (the game's 483 "not enough HP to unequip", the log of 11-20 and
 *  11-21): before any gear swap, a fighter under a quarter of its HP heals first. True ⇒ the tick was spent. */
export async function recoverFirst(name: string, ch: Character, ctx: StepCtx): Promise<boolean> {
  if (ch.hp >= ch.max_hp / 4) return false;
  await healOnce(name, ch, foodInHand(ch), ctx.note);
  return true;
}

/**
 * A fight round's outcome. "acted" ⇒ an intermediate action (move/heal/bank)
 * ran; "won"/"lost" ⇒ a fight happened (task 025: a loss is an outcome — the
 * next rounds heal at (0, 0), walk back and fight); the terminal outcomes are
 * RETURNED for the caller to decide:
 *   "no-win" — the gate refuses: the worn set's p is below the floor
 *   "brake"  — play against the forecast (braking): the monster is blocked for
 *              this character already (blockFight); the item ends
 */
export type FightOutcome = "acted" | "won" | "lost" | "no-win" | "brake";

/**
 * One combat-phase action: heal (food first — provisioning more when the hand
 * is empty and ctx.food is on), bank off overflow, walk to the tile, re-gate
 * on a fresh forecast, then fight once. All the combat safety rules in one
 * place. The full bag comes before the walk: a bank trip of several legs must
 * not turn back toward the monster between them.
 */
export async function fightRound(
  name: string,
  ch: Character,
  m: Monster,
  tile: Place,
  T: FightTally,
  ctx: StepCtx,
): Promise<FightOutcome> {
  if (ch.hp < ch.max_hp) {
    const food = foodInHand(ch);
    if (!food && ctx.food && (await provisionFood(name, ch, m, ctx)) === "acted") return "acted";
    await healOnce(name, ch, food, ctx.note);
    return "acted";
  }
  if (invCount(ch) >= ch.inventory_max_items) { await bankOff(name, ctx.keep, ctx.note, ctx.gold); return "acted"; }
  // Task 025: the gate before the walk — a beaten character wakes at (0, 0), and the log of 11-20 to 11-22 walked back eight
  // times to a fight the gate then refused. The worn set's p at the floor (gateP), not "a win".
  const p = gateP(ch, m);
  if (p < minWin) return "no-win";
  if (!isAt(ch, tile)) { ctx.note("→ monster"); await moveTo(name, tile); return "acted"; }

  const before = equippedCodes(ch), hp = ch.hp;
  const stacks = (c: Character): Record<string, number> => Object.fromEntries((["utility1", "utility2"] as const).map((g) => [slotCode(c, g), slotQuantity(c, g)]).filter(([c]) => c));
  const s0 = stacks(ch);
  const r = await actions.fight(name);
  const won = r.fight?.result === "win";
  T.fights++;
  T.pSum += p;
  if (!won) {
    T.losses++;
    // Task 025, settled point 2: a lost fight is an outcome, not a fault — a `loss` record, and the step goes on
    const now = characters.value[name] ?? ch, s1 = stacks(now);
    const drunk = Object.fromEntries(Object.entries(s0).map(([c, q]) => [c, q - (s1[c] ?? 0)]).filter(([, q]) => (q as number) > 0));
    journal("loss", { who: name, monster: m.code, set: before, p: Math.round(p * 1000) / 1000, hp, max: ch.max_hp, turns: r.fight?.turns, drunk: Object.keys(drunk).length ? drunk : undefined, item: T.item, fights: T.fights, losses: T.losses });
  }
  await step(name, () => Promise.resolve()); // wait out the fight cooldown
  if (!won && braking(T)) {
    blockFight(name, ch, m.code, brakeWhy(T));
    return "brake";
  }
  return won ? "won" : "lost";
}
