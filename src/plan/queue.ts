// The queue item vocabulary — the list of actions a character works through one
// item at a time (src/state/queue.ts runs it). These simple items are the ONLY
// execution vocabulary: the planner (src/plan/planner/compile.ts, state/planner.ts)
// compiles down to them instead of running its own machinery. Task 018: the kinds
// no writer writes any more (move, rest, accept-task, work-task, deliver, turn-in)
// are gone.
//
// Pure module: item types and the row text/icon helpers the UI renders with.
// No signals, no API.

import { itemName, monster as monsterOf } from "../catalog";
import { titleCase } from "../lib/util";
import type { GearJob } from "./types";
import type { GearSlot } from "../types/api";

// An x, y saved without `layer` is on the overworld (queues saved before layers were stored).
export type QueueItem = { id: string; error?: string } & (
  // times 0 = infinite (fight until stopped / paused). `gear` ⇒ re-derive the
  // best bank set vs the monster each round and swap when it improves.
  // `food` defaults ON (false disables): eat between fights and self-provision
  // when the hand runs dry — bank stock, else cook from stock, else gather.
  // `take` (task 014, the planner's items only): the potions and food its step planned — the step's bank reset puts
  // exactly those into the utility slots and the bag; the item never brews, cooks or gathers them, and it ends when they
  // are gone and its fresh forecast is no win. Present (even empty) = the plan is the consumables' one writer.
  // Task 017: `take` may hold the trip's toll too — `gold` (the fares, kept in the pocket), the keys a transition consumes
  // and the item one wants carried (kept in the bag); `wear` (the planner's items): the set its step planned, worn instead
  // of a fresh solve (a piece nowhere to be had: the executor's own solve, one raw line).
  | { kind: "fight"; monster: string; times: number; done: number; food?: boolean; keep?: string[]; gear?: boolean; take?: Record<string, number>; wear?: Record<string, string> }
  // times 0 = infinite. `gear` ⇒ keep the bank gathering set for the resource's skill on. `take` (task 017): a toll, as a fight's.
  | { kind: "gather"; code: string; resource: string; times: number; done: number; x?: number; y?: number; layer?: string; gear?: boolean; take?: Record<string, number> }
  // quantity 0 = infinite: withdraw a bagful of materials from the bank, craft,
  // deposit, repeat — completes when the bank can no longer feed the recipe.
  // `wait` (the hive's pipelining; the hive was deleted in task 018 and nothing
  // writes it now): when bag + bank can't feed one run, hold and look again
  // instead of pausing — producers are still depositing.
  | { kind: "craft"; code: string; quantity: number; done: number; skill?: string; x?: number; y?: number; layer?: string; wait?: boolean }
  | { kind: "withdraw"; code: string; quantity: number; x?: number; y?: number; layer?: string }
  | { kind: "deposit-all" }
  // `bought` is set the moment npc/buy succeeds and checked first on every
  // tick: the item is done only when the purchase happened, and never twice.
  | { kind: "buy"; code: string; quantity: number; npc?: string; x?: number; y?: number; layer?: string; bought?: boolean }
  // Sell to the NPC that buys the item; pulls stock from the BANK bag-sized
  // piece by piece when the hand is empty (the bank-cleanup action). `partial`
  // (event trips): stock running out completes the item instead of pausing.
  | { kind: "sell"; code: string; quantity: number; done: number; npc?: string; x?: number; y?: number; layer?: string; partial?: boolean }
  // Recycle at the workshop that crafts the item (returns a share of the
  // materials); like sell, pulls bank stock when the hand is empty.
  | { kind: "recycle"; code: string; quantity: number; done: number; skill?: string; x?: number; y?: number; layer?: string }
  // Level a workshop skill: loop source materials → craft a batch → recycle →
  // repeat on the best in-window recipe the character can feed. toLevel 0 =
  // forever; `levels` = +N from the level the item STARTED at (`from`, recorded
  // on first run). `gear` ⇒ keep the bank set on while sourcing. Task 018: the
  // planner writes only this form (a crafting level); a combat or gathering
  // skill and `for` (a helper) had their writers and handlers deleted — the
  // fields stay for the branches that still read them (`resource`, x, y, `for`).
  // task 029: `code` and `runs` — the planner's recipe and how many runs (`done` counts them); the item ends at either
  | { kind: "train"; skill: string; toLevel: number; levels?: number; from?: number; resource?: string; x?: number; y?: number; layer?: string; gear?: boolean; for?: string; code?: string; runs?: number; done?: number }
  // Swap to the best job gear from the bank (see plan/jobgear.ts): `desired` =
  // slot map frozen at compile; `job` = live spec recomputed from the bank at
  // run time (hand-added). `reset` ⇒ full bank reset first: deposit EVERYTHING
  // (inventory + gold), strip every slot incl. utilities, then wear the job
  // set from the bank. Completes when the worn gear matches desired ∩ available.
  | { kind: "gear"; desired?: Partial<Record<GearSlot, string>>; job?: GearJob; keep?: string[]; reset?: boolean; wear?: Record<string, string> }
  // Complete tasks in a loop: accept at the given master → work the CURRENT task
  // in the field (monsters task ⇒ fight the task monster; items task ⇒ acquire
  // ch.task where it lives and hand bagfuls straight to the items master — stock
  // NEVER moves through the bank) → turn it in → repeat. times 0 = forever;
  // `done` counts turn-ins. `gear` ⇒ full bank reset into the phase's job set
  // when a task starts (`geared` remembers which task so a reload doesn't repeat
  // it), then per-round self-heal swaps.
  | { kind: "task-loop"; master: "monsters" | "items"; times: number; done: number; gear?: boolean; geared?: string }
  // Task 027d (the planner's): one visit to the tasks master — turn a finished task in, cancel `cancel` while it is the
  // task held (a coin from the bag or the bank; with none, kept), take a monsters task when none is held. `done` 1 at the end.
  | { kind: "task-visit"; done: number; cancel?: string }
  // Today's seasonal offerings at the Seasonal Altar: accept each category's
  // offering for the character's level bracket first (its favor boosts the
  // farming), then get each requirement (bank → favored target → field) and
  // complete it. A category with no way through is skipped for that UTC day
  // (`skip`, valid while `day` matches); done when nothing is left today.
  | { kind: "offering"; day?: string; skip?: string[] }
  // Boss prep for a manual group fight: one bank reset into the best set vs the
  // monster (`geared` remembers it; utility potions included, brewed when the
  // bank has none), walk to it, rest to full — then the queue STOPS so the
  // character waits on the tile for the group fight.
  // Claim every pending reward (achievement payouts) at the bank, then deposit what was claimed (`got`: the
  // codes, "gold" for pocket gold). The planner's `claim` interrupt; done when no row and nothing claimed is left.
  | { kind: "claim"; got?: string[] }
  // Task 015: buy one bank expansion (+20 slots) at the bank, paying the price from the character's gold (withdrawn
  // first). The planner's `bank` interrupt; `price` is what it agreed to pay — a higher next price ends the item unbought.
  // `bought` as for `buy`: set the moment the purchase succeeds, checked first, never twice.
  | { kind: "expand"; price: number; bought?: boolean }
  // Task 032: one purchase on the Grand Exchange, the planner's market step — exactly price × quantity withdrawn at the bank,
  // the order read again by its id at the exchange and bought only at `price` (fewer units: what it holds); `ref` is the
  // reference it was judged on. `bought` (the units) is set the moment the purchase succeeds, checked first, never twice;
  // `ended` — the market's answer (the order gone, another price, 404/434/435/436, the bank short of the gold): nothing bought.
  | { kind: "ge-buy"; code: string; quantity: number; order: string; price: number; ref?: number; bought?: number; ended?: string }
);

export type QueueItemKind = QueueItem["kind"];

export const QUEUE_KINDS: QueueItemKind[] = [
  "fight", "gather", "craft", "withdraw", "deposit-all",
  "buy", "sell", "recycle", "train", "gear", "task-loop", "offering", "task-visit", "ge-buy",
];

export const newId = (): string => Math.random().toString(36).slice(2, 10);

/** QueueItem without its id — distributes over the union so every variant keeps its fields. */
export type QueueItemInput = QueueItem extends infer T ? (T extends { id: string } ? Omit<T, "id"> : never) : never;

/** A new item with a fresh id (spread-friendly helper for the UI and the flattener). */
export const withId = (it: QueueItemInput): QueueItem => ({ ...it, id: newId() }) as QueueItem;

export function queueItemText(it: QueueItem): string {
  switch (it.kind) {
    case "fight": return `Fight ${it.times > 0 ? `${it.times}× ` : "(∞) "}${monsterOf(it.monster)?.name ?? titleCase(it.monster)}`;
    case "gather": return `Gather ${it.times > 0 ? `${it.times}× ` : "(∞) "}${itemName(it.code)}`;
    case "craft": return `Craft ${it.quantity > 0 ? `${it.quantity}× ` : "(∞) "}${itemName(it.code)}${it.wait ? " (as materials arrive)" : ""}`;
    case "withdraw": return `Withdraw ${it.quantity}× ${itemName(it.code)}`;
    case "deposit-all": return "Deposit everything";
    case "buy": return `Buy ${it.quantity}× ${itemName(it.code)}`;
    case "sell": return `Sell ${it.quantity}× ${itemName(it.code)}`;
    case "recycle": return `Recycle ${it.quantity}× ${itemName(it.code)}`;
    case "train": return it.code && it.runs ? `Train ${titleCase(it.skill)}: ${itemName(it.code)} ×${it.runs}` : `${it.for ? `Help ${it.for} train` : "Train"} ${titleCase(it.skill)} ${it.levels ? `+${it.levels} level${it.levels === 1 ? "" : "s"}` : it.toLevel > 0 ? `to Lv ${it.toLevel}` : "(∞)"}`;
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
    case "task-loop": return `Complete ${it.times > 0 ? `${it.times}× ` : "(∞) "}tasks (${it.master})`;
    case "task-visit": return `Tasks master: ${it.cancel ? `cancel ${monsterOf(it.cancel)?.name ?? itemName(it.cancel)}, ` : ""}turn in, take a monsters task`;
    case "offering": return "Today's seasonal offerings";
    case "claim": return "Claim pending rewards";
    case "expand": return `Buy a bank expansion (${it.price.toLocaleString("en-US")} gold)`;
    case "ge-buy": return `Buy ${it.quantity}× ${itemName(it.code)} on the Grand Exchange at ${it.price.toLocaleString("en-US")}`;
  }
}

export const queueItemIcon: Record<QueueItemKind, string> = {
  "fight": "⚔", "gather": "⛏", "craft": "⚙",
  "withdraw": "🏦", "deposit-all": "📦", "buy": "🪙", "sell": "💰", "recycle": "♻",
  "train": "🎓", "gear": "🧰",
  "task-loop": "🔁", "task-visit": "📜", "offering": "🛐", "claim": "🎁", "expand": "🏦", "ge-buy": "🪙",
};
