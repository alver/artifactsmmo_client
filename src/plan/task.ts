// Task-plan compiler — turn the character's current Tasks Master task (or the
// intent to go accept one) into a complete, self-sufficient preparation +
// execution Plan:
//
//   fight tasks  → best gear vs that monster (with a "needs in bank" report for
//                  ideal items only another character can provide), food to cook
//                  for between-fight healing, a health potion to brew (training
//                  alchemy by gathering first if needed);
//   items tasks  → the best gathering tool for the resource's skill, then the
//                  full sourcing chain for the deliverable (or fight prep, when
//                  the task item is a monster drop).
//
// Pure and offline like the rest of src/plan — the campaign runner executes it.

import { itemName, monster as monsterOf, resource as resourceOf, task as taskOf } from "../catalog";
import { titleCase } from "../lib/util";
import { simulate } from "../sim/combat";
import { equippedCodes, fighterForGear } from "../sim/stats";
import { bestInSlot } from "./bis";
import { resolve } from "./acquire";
import { jobGear, jobSetFromRecommendation } from "./jobgear";
import { bestFood, bestTool, foodPerFight, foodQuantity, potionCandidate } from "./consumables";
import { GEAR_SLOTS, slotCode } from "../types/api";
import type { BankItem, Character, GearSlot } from "../types/api";
import type { FoodSpec, GearRecommendation, Goal, Plan, Target } from "./types";

/** Item codes the character can use right now: inventory ∪ bank ∪ equipped. */
export function ownedCodes(ch: Character, bank: { code: string; quantity: number }[]): Set<string> {
  const owned = new Set<string>();
  for (const s of ch.inventory ?? []) if (s.code) owned.add(s.code);
  for (const b of bank) owned.add(b.code);
  for (const c of equippedCodes(ch)) owned.add(c);
  return owned;
}

/**
 * Utility stacks are batched to a quarter of the inventory: brewing a bigger
 * stack would need more raw materials in hand at once than the bag can hold.
 * Shared by the compiler and the runner's live re-stocking.
 */
export function utilityStackSize(remaining: number, invMax: number): number {
  return Math.min(100, Math.max(1, remaining), Math.max(1, Math.floor(invMax / 4)));
}

/** Turn a BIS recommendation's slot map into acquisition targets (with equip slots). */
export function gearTargets(slots: Record<GearSlot, string>, repeat: number, invMax?: number): Target[] {
  const out: Target[] = [];
  for (const g of GEAR_SLOTS) {
    const code = slots[g];
    if (!code) continue;
    const qty = g.startsWith("utility") ? utilityStackSize(repeat, invMax ?? 400) : 1;
    out.push({ code, quantity: qty, slot: g, role: "gear" });
  }
  return out;
}

/** Everything a fight needs beyond the fight itself: gear, food, potions. */
interface FightPrep {
  gear?: GearRecommendation; // executable set (obtainable by this character)
  ideal?: GearRecommendation; // unrestricted best set (report only)
  needsInBank: string[]; // ideal items only another character can provide
  targets: Target[]; // gear + food acquisition targets
  food?: FoodSpec;
  keep: string[]; // never auto-deposit these while running
  blockers: string[];
  notes: string[];
}

function prepareFight(ch: Character, bank: BankItem[], monsterCode: string, fights: number, taskItem?: string): FightPrep {
  const owned = ownedCodes(ch, bank);
  const m = monsterOf(monsterCode);
  const name = m?.name ?? titleCase(monsterCode);

  // Pass 1 — the unrestricted ideal: anything equippable, however obtained.
  const ideal = bestInSlot(ch, monsterCode, { pool: "all" })[0];

  // Obtainability probes walk the whole recipe tree — memoize per code.
  const obtCache = new Map<string, boolean>();
  const obtainable = (code: string): boolean => {
    let v = obtCache.get(code);
    if (v === undefined) {
      v = owned.has(code) || resolve(ch, bank, [{ code, quantity: 1 }], { train: true }).blockers.length === 0;
      obtCache.set(code, v);
    }
    return v;
  };
  const idealObtainable = ideal ? ideal.codes.filter(obtainable) : [];

  // Pass 2 — the executable set: owned + self-craftable, plus any ideal items
  // the character can farm/buy/train for, plus the self-brewable health potion.
  // When the ideal set is already fully obtainable, it IS the executable set —
  // its pool is a superset of pass 2's, so a second search can't beat it.
  const potion = potionCandidate(ch);
  let gear: GearRecommendation | undefined;
  if (ideal && idealObtainable.length === ideal.codes.length) {
    gear = ideal;
  } else {
    const extras = potion ? [...idealObtainable, potion.code] : idealObtainable;
    gear = bestInSlot(ch, monsterCode, { owned, extraCandidates: extras })[0];
  }

  const needsInBank =
    ideal && (!gear || ideal.score > gear.score)
      ? ideal.codes.filter((c) => !obtainable(c) && !(gear?.codes ?? []).includes(c))
      : [];

  // If BIS left both utility slots empty, slot the health potion in anyway —
  // restore only helps — and re-simulate so the shown forecast stays honest.
  if (gear && potion && m && !gear.slots.utility1 && !gear.slots.utility2) {
    const slots = { ...gear.slots, utility1: potion.code };
    const codes: string[] = [];
    for (const s of GEAR_SLOTS) if (slots[s]) codes.push(slots[s]);
    const fighter = fighterForGear(ch, codes);
    const forecast = simulate(fighter, m);
    if (forecast.win) {
      const worst = simulate(fighter, m, { pessimistic: true });
      gear = { slots, codes, forecast, worst, safe: worst.win, score: gear.score };
    }
  }

  const blockers: string[] = [];
  const notes: string[] = [];
  if (!gear) {
    blockers.push(
      needsInBank.length
        ? `No winnable gear set vs ${name} with what this character can get alone.`
        : `No feasible gear set found to beat ${name} at your current level/skills.`,
    );
  }

  // Food: cook the best self-producible heal item, sized to the expected HP
  // loss. Never the task deliverable itself — the loop would eat what it must
  // hand in.
  let food: FoodSpec | undefined;
  const targets = gear ? gearTargets(gear.slots, fights, ch.inventory_max_items) : [];
  if (gear) {
    const loss = Math.max(0, gear.forecast.maxHp - gear.forecast.hpRemaining);
    const pick = loss > 0 ? bestFood(ch, bank, taskItem) : undefined;
    if (pick) {
      const qty = foodQuantity(pick, loss, fights, ch);
      if (qty > 0) {
        food = { code: pick.code, heal: pick.heal, perFight: foodPerFight(pick, loss), producible: pick.producible };
        targets.push({ code: pick.code, quantity: qty, role: "food" });
      }
    } else if (loss > 0) {
      notes.push("no cookable food — healing by rest");
    }
  }

  const keep: string[] = [];
  if (food) keep.push(food.code);
  for (const u of ["utility1", "utility2"] as const) if (gear?.slots[u]) keep.push(gear.slots[u]);

  return { gear, ideal, needsInBank, targets, food, keep, blockers, notes };
}

export const NEEDS_IN_BANK_MSG = (codes: string[]): string =>
  `This character needs these items to be available in bank: ${codes.map(itemName).join(", ")}`;

/**
 * Compile the plan for the character's current task. With no task and
 * `loop: true` (the default), returns a runnable stub whose campaign walks to
 * the Tasks Master and accepts one, then recompiles.
 */
export function compileTaskPlan(
  ch: Character,
  bank: BankItem[],
  opts: { master?: "monsters" | "items"; loop?: boolean; goal?: Goal } = {},
): Plan {
  const loop = opts.loop ?? true;
  const goal: Goal = opts.goal ?? { kind: "task-loop", master: opts.master };
  const empty = { steps: [], estActions: 0, estSeconds: 0 };

  if (!ch.task) {
    if (!loop) {
      return {
        goal,
        acquisition: { ...empty, feasible: false, blockers: ["No active task — accept one from a Tasks Master first."] },
        execution: { targets: [], repeat: 0 },
        summary: "No active task.",
      };
    }
    const master = opts.master ?? "monsters";
    return {
      goal,
      acquisition: { ...empty, feasible: true, blockers: [] },
      execution: { targets: [], repeat: 0, mode: "task-loop", loop, master },
      summary: `Accept a task at the ${master} Tasks Master, then prepare and run it.`,
    };
  }

  const remaining = Math.max(1, ch.task_total - ch.task_progress);

  // ── Fight task ────────────────────────────────────────────────────────────
  if (ch.task_type === "monsters") {
    const prep = prepareFight(ch, bank, ch.task, remaining);
    const acquisition = resolve(ch, bank, prep.targets, { train: true, topUp: true });
    acquisition.blockers.push(...prep.blockers);
    acquisition.feasible = acquisition.blockers.length === 0;
    const f = prep.gear?.forecast;
    const mName = monsterOf(ch.task)?.name ?? titleCase(ch.task);
    const extra = prep.notes.length ? ` · ${prep.notes.join(" · ")}` : "";
    const summary =
      prep.gear && f
        ? `Task: defeat ${remaining}× ${mName} — ${prep.gear.safe ? "safe win" : "risky win"}, ~${f.turns} turns, −${Math.round(f.hpLostPct * 100)}% HP/fight${extra}.`
        : `Task: defeat ${remaining}× ${mName} — no winnable gear set yet.`;
    return {
      goal,
      gear: prep.gear,
      ideal: prep.ideal,
      needsInBank: prep.needsInBank.length ? prep.needsInBank : undefined,
      acquisition,
      execution: {
        targets: prep.targets, monster: ch.task, repeat: remaining, mode: "task-loop", loop,
        food: prep.food, keep: prep.keep, master: "monsters",
        gearPlan: prep.gear ? jobSetFromRecommendation(ch, bank, prep.gear) : undefined,
      },
      summary,
    };
  }

  // ── Items task ────────────────────────────────────────────────────────────
  // Stock already owned (inventory + bank) is traded to the Tasks Master FIRST
  // — the runners' deliver step drains it piece by piece, sized to the bag — so
  // production below only ever covers the shortfall (resolve() deducts the
  // stock from the target on its own).
  const held = (ch.inventory ?? []).reduce((s, it) => s + (it.code === ch.task ? it.quantity : 0), 0);
  const banked = bank.reduce((s, b) => s + (b.code === ch.task ? b.quantity : 0), 0);
  const stock = Math.min(remaining, held + banked);
  const stockNote = stock > 0 ? ` — ${stock} already in stock` : "";

  const itemTarget: Target = { code: ch.task, quantity: remaining, role: "deliver" };
  const probe = resolve(ch, bank, [itemTarget], { train: true });
  const farmStep = probe.steps.find((s) => s.kind === "farm");

  if (farmStep && farmStep.kind === "farm") {
    // The deliverable is a monster drop — prepare for that fight too.
    const prep = prepareFight(ch, bank, farmStep.monster, farmStep.expectedFights, ch.task);
    const targets = [...prep.targets, itemTarget];
    const acquisition = resolve(ch, bank, targets, { train: true, topUp: true });
    acquisition.blockers.push(...prep.blockers);
    acquisition.feasible = acquisition.blockers.length === 0;
    return {
      goal,
      gear: prep.gear,
      ideal: prep.ideal,
      needsInBank: prep.needsInBank.length ? prep.needsInBank : undefined,
      acquisition,
      execution: {
        targets, repeat: 0, mode: "task-loop", loop, food: prep.food, keep: [...prep.keep, ch.task],
        master: "items", stockFirst: stock > 0,
        gearPlan: prep.gear ? jobSetFromRecommendation(ch, bank, prep.gear) : undefined,
      },
      summary: `Task: deliver ${remaining}× ${itemName(ch.task)}${stockNote} — farm ${monsterOf(farmStep.monster)?.name ?? farmStep.monster} (~${farmStep.expectedFights} fights).`,
    };
  }

  // Gather/craft path: swap to the job set (best tool + prospecting/wisdom
  // gear from the bank) — but only when the plan actually gathers (training
  // counts); a craft-only plan gets the wisdom set; a task fully covered by
  // existing stock is a bank→master shuttle and needs no gear at all.
  let tool: string | undefined;
  let gearPlan: Partial<Record<GearSlot, string>> | undefined;
  if (probe.steps.some((s) => s.kind === "gather" || s.kind === "train")) {
    const owned = ownedCodes(ch, bank);
    const skills: string[] = [];
    const taskSkill = taskOf(ch.task)?.skill;
    if (taskSkill) skills.push(taskSkill);
    for (const s of probe.steps) {
      if (s.kind === "train" && !skills.includes(s.skill)) skills.push(s.skill);
      if (s.kind !== "gather") continue;
      const r = resourceOf(s.resource);
      if (r && !skills.includes(r.skill)) skills.push(r.skill);
    }
    for (const sk of skills) {
      tool = bestTool(ch, sk, bank, owned);
      if (tool) break;
    }
    gearPlan = jobGear(ch, bank, { kind: "gather", skill: skills[0] ?? "mining" });
    // The compiled tool may still need crafting — the swap's availability
    // guard simply leaves the weapon slot alone until the craft lands.
    if (gearPlan && tool) gearPlan.weapon = tool;
  } else if (probe.steps.some((s) => s.kind === "craft")) {
    gearPlan = jobGear(ch, bank, { kind: "craft", skill: taskOf(ch.task)?.skill ?? undefined });
  }

  const targets: Target[] = [];
  if (tool && slotCode(ch, "weapon") !== tool) targets.push({ code: tool, quantity: 1, slot: "weapon", role: "gear" });
  targets.push(itemTarget);
  const acquisition = resolve(ch, bank, targets, { train: true });
  return {
    goal,
    needsInBank: acquisition.blockers.length ? [ch.task] : undefined,
    acquisition,
    execution: { targets, repeat: 0, mode: "task-loop", loop, keep: [ch.task], master: "items", stockFirst: stock > 0, gearPlan },
    summary: `Task: deliver ${remaining}× ${itemName(ch.task)}${stockNote}${tool ? ` — gathering with ${itemName(tool)}` : ""}.`,
  };
}
