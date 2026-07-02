// The queue item vocabulary — the user-editable "planned list of actions" a
// character works through one item at a time (src/state/queue.ts runs it).
//
// Pure module: item types, the Plan → items flattener, and the row text/icon
// helpers the UI renders with. No signals, no API.

import { itemName, monster as monsterOf } from "../catalog";
import { slotLabel, titleCase } from "../lib/util";
import type { FoodSpec, Plan } from "./types";
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
  | { kind: "equip"; code: string; slot: GearSlot; quantity: number }
  | { kind: "train"; skill: string; toLevel: number; resource: string; x?: number; y?: number }
  | { kind: "new-task"; master: "monsters" | "items" } // dynamic expander: accept → insert the task's items → re-append itself
  | { kind: "deliver"; keep?: string[] } // taskTrade the current ch.task (code read live)
  | { kind: "turn-in" }
);

export type QueueItemKind = QueueItem["kind"];

export const QUEUE_KINDS: QueueItemKind[] = [
  "move", "rest", "fight", "gather", "craft", "withdraw", "deposit-all",
  "buy", "equip", "train", "new-task", "deliver", "turn-in",
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
    for (const s of plan.acquisition.steps) {
      switch (s.kind) {
        case "withdraw": items.push(withId({ kind: "withdraw", code: s.code, quantity: s.quantity, x: s.x, y: s.y })); break;
        case "buy": items.push(withId({ kind: "buy", code: s.code, quantity: s.quantity, npc: s.npc, x: s.x, y: s.y })); break;
        case "gather": items.push(withId({ kind: "gather", code: s.code, resource: s.resource, times: s.quantity, done: 0, x: s.x, y: s.y })); break;
        case "farm": items.push(withId({ kind: "fight", monster: s.monster, times: s.expectedFights, done: 0, food: ex.food, keep: ex.keep })); break;
        case "craft": items.push(withId({ kind: "craft", code: s.code, quantity: s.quantity, done: 0, skill: s.skill, x: s.x, y: s.y })); break;
        case "equip": items.push(withId({ kind: "equip", code: s.code, slot: s.slot, quantity: s.quantity })); break;
        case "train": items.push(withId({ kind: "train", skill: s.skill, toLevel: s.toLevel, resource: s.resource, x: s.x, y: s.y })); break;
      }
    }
  }

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
    case "equip": return `Equip ${itemName(it.code)} → ${slotLabel(it.slot)}`;
    case "train": return `Train ${titleCase(it.skill)} to Lv ${it.toLevel}`;
    case "new-task": return `New ${it.master === "items" ? "item" : "fight"} task`;
    case "deliver": return "Deliver task items";
    case "turn-in": return "Turn in the task";
  }
}

export const queueItemIcon: Record<QueueItemKind, string> = {
  "move": "🚶", "rest": "💤", "fight": "⚔", "gather": "⛏", "craft": "⚙",
  "withdraw": "🏦", "deposit-all": "📦", "buy": "🪙", "equip": "🛡",
  "train": "🎓", "new-task": "🔁", "deliver": "🤝", "turn-in": "✅",
};
