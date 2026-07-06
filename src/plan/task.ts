// Task-plan compiler — turn the character's current Tasks Master task (or the
// intent to go accept one) into a Plan the campaign runs ONE-SHOT (accept if
// missing → prep → execute → deliver → turn in → done):
//
//   fight tasks  → the best gear set available in the bank vs that monster
//                  (bank-only BIS — nothing is crafted for gear), plus banked
//                  food for between-fight healing;
//   items tasks  → the sourcing chain for the deliverable (or fight prep, when
//                  the task item is a monster drop) with the bank-only gather/
//                  craft gear set.
//
// Pure and offline like the rest of src/plan — the campaign runner executes it.

import { itemName, monster as monsterOf, resource as resourceOf, task as taskOf } from "../catalog";
import { titleCase } from "../lib/util";
import { equippedCodes } from "../sim/stats";
import { bestInSlot } from "./bis";
import { resolve } from "./acquire";
import { jobGear, jobSetFromRecommendation } from "./jobgear";
import { bestFood, foodPerFight, foodQuantity } from "./consumables";
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

/** Everything a fight needs beyond the fight itself: bank gear + banked food. */
interface FightPrep {
  gear?: GearRecommendation; // best set available in the bank right now
  gearPlan?: Partial<Record<GearSlot, string>>; // the same set as a swap map
  targets: Target[]; // food acquisition targets (never gear)
  food?: FoodSpec;
  keep: string[]; // never auto-deposit these while running
  blockers: string[];
  notes: string[];
}

function prepareFight(ch: Character, bank: BankItem[], monsterCode: string, fights: number, taskItem?: string): FightPrep {
  const owned = ownedCodes(ch, bank);
  const m = monsterOf(monsterCode);
  const name = m?.name ?? titleCase(monsterCode);

  // Bank-only: the best set from what is owned RIGHT NOW. noUtilities keeps the
  // forecast honest — the bank swap never equips potion stacks.
  const gear = bestInSlot(ch, monsterCode, { owned, includeCraftable: false, noUtilities: true })[0];

  const blockers: string[] = [];
  const notes: string[] = [];
  if (!gear) blockers.push(`No winnable gear set vs ${name} in the bank.`);

  // Food: the best heal item already stocked in bank ∪ inventory, sized to the
  // expected HP loss. Never the task deliverable itself — the loop would eat
  // what it must hand in.
  let food: FoodSpec | undefined;
  const targets: Target[] = [];
  if (gear) {
    const loss = Math.max(0, gear.forecast.maxHp - gear.forecast.hpRemaining);
    const pick = loss > 0 ? bestFood(ch, bank, taskItem) : undefined;
    if (pick) {
      const qty = foodQuantity(pick, loss, fights, ch);
      if (qty > 0) {
        food = { code: pick.code, heal: pick.heal, perFight: foodPerFight(pick, loss) };
        targets.push({ code: pick.code, quantity: qty, role: "food" });
      }
    } else if (loss > 0) {
      notes.push("no banked food — healing by rest");
    }
  }

  return {
    gear,
    gearPlan: gear ? jobSetFromRecommendation(ch, bank, gear) : undefined,
    targets,
    food,
    keep: food ? [food.code] : [],
    blockers,
    notes,
  };
}

/**
 * Compile the plan for the character's current task (one-shot). With no task,
 * returns a runnable stub whose campaign walks to the Tasks Master, accepts
 * one, then recompiles.
 */
export function compileTaskPlan(
  ch: Character,
  bank: BankItem[],
  opts: { master?: "monsters" | "items"; goal?: Goal } = {},
): Plan {
  const goal: Goal = opts.goal ?? { kind: "complete-task", master: opts.master };
  const empty = { steps: [], estActions: 0, estSeconds: 0 };

  if (!ch.task) {
    const master = opts.master ?? "monsters";
    return {
      goal,
      acquisition: { ...empty, feasible: true, blockers: [] },
      execution: { targets: [], repeat: 0, mode: "task", master },
      summary: `Accept a task at the ${master} Tasks Master, then run it once.`,
    };
  }

  const remaining = Math.max(1, ch.task_total - ch.task_progress);

  // ── Fight task ────────────────────────────────────────────────────────────
  if (ch.task_type === "monsters") {
    const prep = prepareFight(ch, bank, ch.task, remaining);
    const acquisition = resolve(ch, bank, prep.targets);
    acquisition.blockers.push(...prep.blockers);
    acquisition.feasible = acquisition.blockers.length === 0;
    const f = prep.gear?.forecast;
    const mName = monsterOf(ch.task)?.name ?? titleCase(ch.task);
    const extra = prep.notes.length ? ` · ${prep.notes.join(" · ")}` : "";
    const summary =
      prep.gear && f
        ? `Task: defeat ${remaining}× ${mName} — ${prep.gear.safe ? "safe win" : "risky win"}, ~${f.turns} turns, −${Math.round(f.hpLostPct * 100)}% HP/fight${extra}.`
        : `Task: defeat ${remaining}× ${mName} — no winnable gear set in the bank.`;
    return {
      goal,
      gear: prep.gear,
      acquisition,
      execution: {
        targets: prep.targets, monster: ch.task, repeat: remaining, mode: "task",
        food: prep.food, keep: prep.keep, master: "monsters", gearPlan: prep.gearPlan,
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
    const acquisition = resolve(ch, bank, targets, { train: true });
    acquisition.blockers.push(...prep.blockers);
    acquisition.feasible = acquisition.blockers.length === 0;
    return {
      goal,
      gear: prep.gear,
      acquisition,
      execution: {
        targets, repeat: 0, mode: "task", food: prep.food, keep: [...prep.keep, ch.task],
        master: "items", stockFirst: stock > 0, gearPlan: prep.gearPlan,
      },
      summary: `Task: deliver ${remaining}× ${itemName(ch.task)}${stockNote} — farm ${monsterOf(farmStep.monster)?.name ?? farmStep.monster} (~${farmStep.expectedFights} fights).`,
    };
  }

  // Gather/craft path: the bank-only job set (best owned tool in the weapon
  // slot + prospecting/wisdom gear) — but only when the plan actually gathers
  // (training counts); a craft-only plan gets the wisdom set; a task fully
  // covered by existing stock is a bank→master shuttle and needs no gear.
  let gearPlan: Partial<Record<GearSlot, string>> | undefined;
  if (probe.steps.some((s) => s.kind === "gather" || s.kind === "train")) {
    const skills: string[] = [];
    const taskSkill = taskOf(ch.task)?.skill;
    if (taskSkill) skills.push(taskSkill);
    for (const s of probe.steps) {
      if (s.kind === "train" && !skills.includes(s.skill)) skills.push(s.skill);
      if (s.kind !== "gather") continue;
      const r = resourceOf(s.resource);
      if (r && !skills.includes(r.skill)) skills.push(r.skill);
    }
    gearPlan = jobGear(ch, bank, { kind: "gather", skill: skills[0] ?? "mining" });
  } else if (probe.steps.some((s) => s.kind === "craft")) {
    gearPlan = jobGear(ch, bank, { kind: "craft", skill: taskOf(ch.task)?.skill ?? undefined });
  }

  const targets: Target[] = [itemTarget];
  const acquisition = resolve(ch, bank, targets, { train: true });
  return {
    goal,
    acquisition,
    execution: { targets, repeat: 0, mode: "task", keep: [ch.task], master: "items", stockFirst: stock > 0, gearPlan },
    summary: `Task: deliver ${remaining}× ${itemName(ch.task)}${stockNote}.`,
  };
}
