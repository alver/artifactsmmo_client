// The queue item vocabulary — the user-editable "planned list of actions" a
// character works through one item at a time (src/state/queue.ts runs it).
//
// Pure module: item types, the Plan → items flattener, and the row text/icon
// helpers the UI renders with. No signals, no API.

import { itemName, monster as monsterOf } from "../catalog";
import { slotLabel, titleCase } from "../lib/util";
import type { FoodSpec, GearJob, Plan } from "./types";
import type { GearSlot } from "../types/api";

export type QueueItem = { id: string; error?: string } & (
  | { kind: "move"; x: number; y: number }
  | { kind: "rest" }
  | { kind: "fight"; monster: string; times: number; done: number; food?: FoodSpec; keep?: string[] }
  | { kind: "gather"; code: string; resource: string; times: number; done: number; x?: number; y?: number }
  | { kind: "craft"; code: string; quantity: number; done: number; skill?: string; x?: number; y?: number }
  | { kind: "withdraw"; code: string; quantity: number; x?: number; y?: number }
  | { kind: "deposit-all" }
  | { kind: "buy"; code: string; quantity: number; npc?: string; x?: number; y?: number }
  // Sell to the NPC that buys the item; pulls stock from the BANK bag-sized
  // piece by piece when the hand is empty (the bank-cleanup action).
  | { kind: "sell"; code: string; quantity: number; done: number; npc?: string; x?: number; y?: number }
  | { kind: "equip"; code: string; slot: GearSlot; quantity: number }
  | { kind: "train"; skill: string; toLevel: number; resource: string; x?: number; y?: number }
  // Swap to the best job gear from the bank (see plan/jobgear.ts): `desired` =
  // slot map frozen at compile (task expansions); `job` = live spec recomputed
  // from the bank at run time (hand-added). Completes when the worn gear
  // matches desired ∩ available.
  | { kind: "gear"; desired?: Partial<Record<GearSlot, string>>; job?: GearJob; keep?: string[] }
  | { kind: "new-task"; master: "monsters" | "items" } // dynamic expander: accept → insert the task's items → re-append itself
  // taskTrade the current ch.task (code read live), inventory + bank stock in
  // bag-sized pieces. `partial` ⇒ complete when the stock runs out (production
  // items follow); without it, running out with the task unfinished is an error.
  | { kind: "deliver"; keep?: string[]; partial?: boolean }
  | { kind: "turn-in" }
);

export type QueueItemKind = QueueItem["kind"];

export const QUEUE_KINDS: QueueItemKind[] = [
  "move", "rest", "fight", "gather", "craft", "withdraw", "deposit-all",
  "buy", "sell", "equip", "train", "gear", "new-task", "deliver", "turn-in",
];

export const newId = (): string => Math.random().toString(36).slice(2, 10);

/** QueueItem without its id — distributes over the union so every variant keeps its fields. */
export type QueueItemInput = QueueItem extends infer T ? (T extends { id: string } ? Omit<T, "id"> : never) : never;

/** A new item with a fresh id (spread-friendly helper for the UI and the flattener). */
export const withId = (it: QueueItemInput): QueueItem => ({ ...it, id: newId() }) as QueueItem;

/**
 * Flatten a compiled Plan into editable queue rows — a static snapshot of the
 * acquisition steps plus what the plan's execution spec would do afterwards.
 * (`farm` becomes a fight ×expectedFights; task-loop plans compiled with
 * loop=false get their deliver/turn-in tail; a looping task-loop plan is just
 * the 🔁 expander, which re-compiles per task at run time.)
 */
export function planToItems(plan: Plan): QueueItem[] {
  const ex = plan.execution;
  const items: QueueItem[] = [];

  if (!(ex.mode === "task-loop" && ex.loop !== false)) {
    // Items task with stock on hand: trade it to the Tasks Master BEFORE
    // producing anything — the partial deliver drains inventory AND bank in
    // bag-sized pieces, so it REPLACES the deliverable's withdraw step (which
    // could demand more than the bag holds).
    const deliverCode =
      ex.mode === "task-loop" && ex.stockFirst ? ex.targets.find((t) => t.role === "deliver")?.code : undefined;
    if (deliverCode) items.push(withId({ kind: "deliver", partial: true, keep: ex.keep }));

    // Job gear: one dynamic swap item wears the compiled set from the bank, so
    // the pure withdraw+equip pairs it covers are dropped from the static
    // flattening — a frozen withdraw would otherwise re-demand gear the swap
    // already WEARS (invQty 0): a duplicate, or a queue pause on an empty bank.
    const gearDemand = new Map<string, number>(); // code → equips the swap covers
    if (ex.mode === "task-loop" && ex.gearPlan) {
      items.push(withId({ kind: "gear", desired: ex.gearPlan, keep: ex.keep }));
      const produced = new Set(
        plan.acquisition.steps
          .filter((s) => s.kind === "gather" || s.kind === "farm" || s.kind === "buy" || s.kind === "craft")
          .map((s) => (s as { code: string }).code),
      );
      const gearCodes = new Set(Object.values(ex.gearPlan).filter(Boolean));
      for (const s of plan.acquisition.steps) {
        if (s.kind !== "equip" || s.slot.startsWith("utility") || produced.has(s.code) || !gearCodes.has(s.code)) continue;
        gearDemand.set(s.code, (gearDemand.get(s.code) ?? 0) + 1);
      }
    }
    const swapCovers = new Set(gearDemand.keys());

    for (const s of plan.acquisition.steps) {
      switch (s.kind) {
        case "withdraw": {
          if (s.code === deliverCode) break;
          const covered = Math.min(gearDemand.get(s.code) ?? 0, s.quantity);
          if (covered > 0) gearDemand.set(s.code, gearDemand.get(s.code)! - covered);
          if (s.quantity - covered <= 0) break;
          items.push(withId({ kind: "withdraw", code: s.code, quantity: s.quantity - covered, x: s.x, y: s.y }));
          break;
        }
        case "buy": items.push(withId({ kind: "buy", code: s.code, quantity: s.quantity, npc: s.npc, x: s.x, y: s.y })); break;
        case "gather": items.push(withId({ kind: "gather", code: s.code, resource: s.resource, times: s.quantity, done: 0, x: s.x, y: s.y })); break;
        case "farm": items.push(withId({ kind: "fight", monster: s.monster, times: s.expectedFights, done: 0, food: ex.food, keep: ex.keep })); break;
        case "craft": items.push(withId({ kind: "craft", code: s.code, quantity: s.quantity, done: 0, skill: s.skill, x: s.x, y: s.y })); break;
        case "equip":
          if (!s.slot.startsWith("utility") && swapCovers.has(s.code)) break; // the gear item wears it
          items.push(withId({ kind: "equip", code: s.code, slot: s.slot, quantity: s.quantity }));
          break;
        case "train": items.push(withId({ kind: "train", skill: s.skill, toLevel: s.toLevel, resource: s.resource, x: s.x, y: s.y })); break;
      }
    }
  }

  // A production goal ends in the bank: crafted output is fleet stock, not
  // personal inventory. (Task deliverables instead end at the Tasks Master.)
  if (plan.goal.kind === "craft-item") items.push(withId({ kind: "deposit-all" }));

  if (ex.mode === "task-loop") {
    if (ex.loop !== false) {
      // Looping task plan — the expander recompiles per task at run time.
      items.push(withId({ kind: "new-task", master: ex.master ?? "monsters" }));
    } else {
      // A single task's execution tail (this is also what the expander appends).
      if (ex.monster && ex.repeat > 0) items.push(withId({ kind: "fight", monster: ex.monster, times: ex.repeat, done: 0, food: ex.food, keep: ex.keep }));
      else items.push(withId({ kind: "deliver", keep: ex.keep }));
      items.push(withId({ kind: "turn-in" }));
    }
  } else if (ex.monster && ex.repeat > 0) {
    items.push(withId({ kind: "fight", monster: ex.monster, times: ex.repeat, done: 0, food: ex.food, keep: ex.keep }));
  }

  return items;
}

export function queueItemText(it: QueueItem): string {
  switch (it.kind) {
    case "move": return `Move to (${it.x}, ${it.y})`;
    case "rest": return "Rest to full HP";
    case "fight": return `Fight ${it.times}× ${monsterOf(it.monster)?.name ?? titleCase(it.monster)}`;
    case "gather": return `Gather ${it.times}× ${itemName(it.code)}`;
    case "craft": return `Craft ${it.quantity}× ${itemName(it.code)}`;
    case "withdraw": return `Withdraw ${it.quantity}× ${itemName(it.code)}`;
    case "deposit-all": return "Deposit everything";
    case "buy": return `Buy ${it.quantity}× ${itemName(it.code)}`;
    case "sell": return `Sell ${it.quantity}× ${itemName(it.code)}`;
    case "equip": return `Equip ${itemName(it.code)} → ${slotLabel(it.slot)}`;
    case "train": return `Train ${titleCase(it.skill)} to Lv ${it.toLevel}`;
    case "gear":
      return it.job
        ? it.job.kind === "fight"
          ? `Equip to fight ${monsterOf(it.job.monster)?.name ?? titleCase(it.job.monster)}`
          : it.job.kind === "gather"
            ? `Equip for ${titleCase(it.job.skill)}`
            : it.job.kind === "craft"
              ? "Equip for crafting"
              : "Equip job gear"
        : "Equip job gear";
    case "new-task": return `New ${it.master === "items" ? "item" : "fight"} task`;
    case "deliver": return it.partial ? "Deliver task items from stock" : "Deliver task items";
    case "turn-in": return "Turn in the task";
  }
}

export const queueItemIcon: Record<QueueItemKind, string> = {
  "move": "🚶", "rest": "💤", "fight": "⚔", "gather": "⛏", "craft": "⚙",
  "withdraw": "🏦", "deposit-all": "📦", "buy": "🪙", "sell": "💰", "equip": "🛡",
  "train": "🎓", "gear": "🧰", "new-task": "🔁", "deliver": "🤝", "turn-in": "✅",
};
