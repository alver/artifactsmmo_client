// The queue item vocabulary — the user-editable "planned list of actions" a
// character works through one item at a time (src/state/queue.ts runs it).
// These simple items are the ONLY execution vocabulary; any future planner
// compiles down to them instead of running its own machinery.
//
// Pure module: item types and the row text/icon helpers the UI renders with.
// No signals, no API.

import { itemName, monster as monsterOf } from "../catalog";
import { titleCase } from "../lib/util";
import type { GearJob } from "./types";
import type { GearSlot } from "../types/api";

export type QueueItem = { id: string; error?: string } & (
  | { kind: "move"; x: number; y: number }
  | { kind: "rest" }
  // times 0 = infinite (fight until stopped / paused). `gear` ⇒ re-derive the
  // best bank set vs the monster each round and swap when it improves.
  // `food` defaults ON (false disables): eat between fights and self-provision
  // when the hand runs dry — bank stock, else cook from stock, else gather.
  | { kind: "fight"; monster: string; times: number; done: number; food?: boolean; keep?: string[]; gear?: boolean }
  // times 0 = infinite. `gear` ⇒ keep the bank gathering set for the resource's skill on.
  | { kind: "gather"; code: string; resource: string; times: number; done: number; x?: number; y?: number; gear?: boolean }
  // quantity 0 = infinite: withdraw a bagful of materials from the bank, craft,
  // deposit, repeat — completes when the bank can no longer feed the recipe.
  // `wait` (hive pipelining): when bag + bank can't feed one run, hold and look
  // again instead of pausing — producers are still depositing; the hive drops
  // the item once nobody is left to feed it.
  | { kind: "craft"; code: string; quantity: number; done: number; skill?: string; x?: number; y?: number; wait?: boolean }
  | { kind: "withdraw"; code: string; quantity: number; x?: number; y?: number }
  | { kind: "deposit-all" }
  | { kind: "buy"; code: string; quantity: number; npc?: string; x?: number; y?: number }
  // Sell to the NPC that buys the item; pulls stock from the BANK bag-sized
  // piece by piece when the hand is empty (the bank-cleanup action).
  | { kind: "sell"; code: string; quantity: number; done: number; npc?: string; x?: number; y?: number }
  // Recycle at the workshop that crafts the item (returns a share of the
  // materials); like sell, pulls bank stock when the hand is empty.
  | { kind: "recycle"; code: string; quantity: number; done: number; skill?: string; x?: number; y?: number }
  // Level a skill. Gathering skills work the best node for the current level
  // (re-picked per tick; `resource` pins one); workshop skills loop source
  // materials → craft a batch → recycle → repeat on the best in-window recipe
  // the character can feed alone. toLevel 0 = forever; `levels` = +N from the
  // level the item STARTED at (`from`, recorded on first run — a 🔁 rotation
  // wipes it so every lap gains the next level). `gear` ⇒ keep the bank
  // gathering set on while gathering. `for` = HELP that character train the
  // skill instead: keep the bank stocked with its current recipe's materials
  // (level target measured on the crafter).
  | { kind: "train"; skill: string; toLevel: number; levels?: number; from?: number; resource?: string; x?: number; y?: number; gear?: boolean; for?: string }
  // Swap to the best job gear from the bank (see plan/jobgear.ts): `desired` =
  // slot map frozen at compile; `job` = live spec recomputed from the bank at
  // run time (hand-added). `reset` ⇒ full bank reset first: deposit EVERYTHING
  // (inventory + gold), strip every slot incl. utilities, then wear the job
  // set from the bank. Completes when the worn gear matches desired ∩ available.
  | { kind: "gear"; desired?: Partial<Record<GearSlot, string>>; job?: GearJob; keep?: string[]; reset?: boolean }
  // Accept a new task from the given Tasks Master. Skip-if-satisfied: already
  // carrying ANY task (either type) counts as done.
  | { kind: "accept-task"; master: "monsters" | "items" }
  // Work the CURRENT task in the field, whatever it turns out to be (the item
  // is only known once accept-task runs). Monsters task ⇒ fight the task
  // monster; items task ⇒ acquire ch.task where it lives (gather it, or gather
  // the recipe's materials and craft it) and hand bagfuls straight to the items
  // master — stock NEVER moves through the bank. `gear` ⇒ full bank reset into
  // the phase's job set when the task starts (`geared` remembers which task so
  // a reload doesn't repeat it), then per-round self-heal swaps.
  | { kind: "work-task"; gear?: boolean; geared?: string }
  // taskTrade the current ch.task (code read live), inventory + bank stock in
  // bag-sized pieces. `partial` ⇒ complete when the stock runs out (production
  // items follow); without it, running out with the task unfinished is an error.
  | { kind: "deliver"; keep?: string[]; partial?: boolean }
  | { kind: "turn-in" }
  // Complete tasks in a loop: accept at the given master → work the task in
  // the field (work-task rules) → turn it in → repeat. times 0 = forever;
  // `done` counts turn-ins. `gear`/`geared` exactly as in work-task.
  | { kind: "task-loop"; master: "monsters" | "items"; times: number; done: number; gear?: boolean; geared?: string }
  // Today's seasonal offerings at the Seasonal Altar: accept each category's
  // offering for the character's level bracket first (its favor boosts the
  // farming), then get each requirement (bank → favored target → field) and
  // complete it. A category with no way through is skipped for that UTC day
  // (`skip`, valid while `day` matches); done when nothing is left today.
  | { kind: "offering"; day?: string; skip?: string[] }
  // Boss prep for a manual group fight: one bank reset into the best set vs the
  // monster (`geared` remembers it; utility potions included, brewed when the
  // bank has none), walk to it, rest to full — then the queue STOPS (never
  // re-appended by 🔁) so the character waits on the tile for the group fight.
  | { kind: "prepare"; monster: string; geared?: boolean }
);

export type QueueItemKind = QueueItem["kind"];

export const QUEUE_KINDS: QueueItemKind[] = [
  "move", "rest", "fight", "gather", "craft", "withdraw", "deposit-all",
  "buy", "sell", "recycle", "train", "gear", "accept-task", "work-task", "deliver", "turn-in", "task-loop", "offering",
];

export const newId = (): string => Math.random().toString(36).slice(2, 10);

/** QueueItem without its id — distributes over the union so every variant keeps its fields. */
export type QueueItemInput = QueueItem extends infer T ? (T extends { id: string } ? Omit<T, "id"> : never) : never;

/** A new item with a fresh id (spread-friendly helper for the UI and the flattener). */
export const withId = (it: QueueItemInput): QueueItem => ({ ...it, id: newId() }) as QueueItem;

export function queueItemText(it: QueueItem): string {
  switch (it.kind) {
    case "move": return `Move to (${it.x}, ${it.y})`;
    case "rest": return "Rest to full HP";
    case "fight": return `Fight ${it.times > 0 ? `${it.times}× ` : "(∞) "}${monsterOf(it.monster)?.name ?? titleCase(it.monster)}`;
    case "gather": return `Gather ${it.times > 0 ? `${it.times}× ` : "(∞) "}${itemName(it.code)}`;
    case "craft": return `Craft ${it.quantity > 0 ? `${it.quantity}× ` : "(∞) "}${itemName(it.code)}${it.wait ? " (as materials arrive)" : ""}`;
    case "withdraw": return `Withdraw ${it.quantity}× ${itemName(it.code)}`;
    case "deposit-all": return "Deposit everything";
    case "buy": return `Buy ${it.quantity}× ${itemName(it.code)}`;
    case "sell": return `Sell ${it.quantity}× ${itemName(it.code)}`;
    case "recycle": return `Recycle ${it.quantity}× ${itemName(it.code)}`;
    case "train": return `${it.for ? `Help ${it.for} train` : "Train"} ${titleCase(it.skill)} ${it.levels ? `+${it.levels} level${it.levels === 1 ? "" : "s"}` : it.toLevel > 0 ? `to Lv ${it.toLevel}` : "(∞)"}`;
    case "gear": {
      const what = it.job
        ? it.job.kind === "fight"
          ? `equip to fight ${monsterOf(it.job.monster)?.name ?? titleCase(it.job.monster)}`
          : it.job.kind === "gather"
            ? `equip for ${titleCase(it.job.skill)}`
            : it.job.kind === "craft"
              ? `equip for ${it.job.skill ? `${titleCase(it.job.skill)} ` : ""}crafting`
              : "equip job gear"
        : "equip job gear";
      return it.reset ? `Bank reset + ${what}` : what.charAt(0).toUpperCase() + what.slice(1);
    }
    case "accept-task": return `Get a task (${it.master})`;
    case "work-task": return "Work the task (acquire & deliver)";
    case "deliver": return it.partial ? "Deliver task items from stock" : "Deliver task items";
    case "turn-in": return "Turn in the task";
    case "task-loop": return `Complete ${it.times > 0 ? `${it.times}× ` : "(∞) "}tasks (${it.master})`;
    case "offering": return "Today's seasonal offerings";
    case "prepare": return `Prepare to fight ${monsterOf(it.monster)?.name ?? titleCase(it.monster)} (gear, potions, walk, rest — then stop)`;
  }
}

export const queueItemIcon: Record<QueueItemKind, string> = {
  "move": "🚶", "rest": "💤", "fight": "⚔", "gather": "⛏", "craft": "⚙",
  "withdraw": "🏦", "deposit-all": "📦", "buy": "🪙", "sell": "💰", "recycle": "♻",
  "train": "🎓", "gear": "🧰", "accept-task": "📜", "work-task": "⚒", "deliver": "🤝", "turn-in": "✅",
  "task-loop": "🔁", "offering": "🛐", "prepare": "🛡",
};
