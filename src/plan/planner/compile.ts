// A step → today's queue items (design C.1): at most four, none infinite, ids `pl:<step.key>:<i>`. Pure.

import { item, resource as resourceOf } from "../../catalog";
import { perOf } from "./cost";
import type { Character } from "../../types/api";
import type { GearJob } from "../types";
import type { QueueItem, QueueItemInput } from "../queue";
import type { Step, Work } from "./types";

const jobOf = (w: Work): GearJob =>
  w.kind === "kill" ? { kind: "fight", monster: w.monster }
  : w.kind === "gather" ? { kind: "gather", skill: resourceOf(w.resource)?.skill ?? "" }
  : w.kind === "train" ? { kind: "craft", skill: w.lane }
  : w.kind === "craft" ? { kind: "craft", skill: item(w.code)?.craft?.skill }
  : { kind: "none" };

/** The field item of a kill or a gather work, `times` actions. Task 014: a planner's fight item carries `take`, the
 *  consumables its step planned (none: {}) — the plan is their one writer. */
const fieldItem = (w: Work, times: number, take: Record<string, number> = {}, wear?: Record<string, string>, toll?: Record<string, number>): QueueItemInput =>
  w.kind === "kill" ? { kind: "fight", monster: w.monster, times, done: 0, gear: true, take, ...(wear ? { wear } : {}) }
  : w.kind === "gather" ? { kind: "gather", code: w.drop, resource: w.resource, times, done: 0, gear: true, ...(toll ? { take: toll } : {}) }
  : (() => { throw new Error(`no field item for ${w.kind}`); })();

/** Task 017, settled point 6: what a toll takes along — the fares (`gold`), the keys and the carried item. */
const tollTake = (step: Step): Record<string, number> | undefined => {
  const t = step.toll;
  if (!t?.via.length) return undefined;
  const out: Record<string, number> = { ...t.keys, ...t.carried };
  if (t.gold) out.gold = t.gold;
  return out;
};

/** The queue items of a step for its character. */
export function itemsOf(step: Step, ch: Character): QueueItem[] {
  if (step.character !== ch.name) throw new Error(`step ${step.key} is not ${ch.name}'s`);
  const w = step.work;
  // task 017, settled point 13: a kill step's reset and fight item wear the set the step planned (`wear`)
  const wear = w.kind === "kill" && step.wear && Object.keys(step.wear).length ? step.wear : undefined;
  const reset = (x: Work): QueueItemInput => ({ kind: "gear", job: jobOf(x), reset: true, ...(wear && x === w ? { wear } : {}) });
  const sources = (step.sources ?? []).map((s) => fieldItem(s.work, s.times));
  let out: QueueItemInput[];
  // Task 009: a supply step (src:, mat:, gear:) is [gear reset, the field item or the craft, deposit-all] — what it
  // makes is in the bank when it ends; a src: step's units are actions. The craft item takes its materials from the
  // bank. A mat: step that is a trade (hard leather for cowhide) is [withdraw the currency, buy, deposit-all].
  const supply = step.as === "supply";
  // task 027d: the visit to the tasks master, before the work or after the fights (its coins banked by the deposit or the reset)
  const visit = (at: "start" | "end"): QueueItemInput[] => (step.visit?.at === at ? [{ kind: "task-visit", done: 0, ...(step.visit.cancel ? { cancel: step.visit.cancel } : {}) }] : []);
  switch (w.kind) {
    case "kill": case "gather":
      // task 017: a fight item's take is the step's withdraw (its consumables and its toll); a gather item's, its toll
      out = [...visit("start"), reset(w), fieldItem(w, supply ? step.units : Math.max(1, Math.ceil(step.units * perOf(w) - 1e-9)), step.withdraw, wear, tollTake(step)), ...visit("end"), ...(supply ? [{ kind: "deposit-all" } as const] : [])];
      break;
    case "craft": {
      if (supply) {
        out = [reset(w), { kind: "craft", code: w.code, quantity: step.units, done: 0 }, { kind: "deposit-all" }];
        break;
      }
      const tail: QueueItemInput[] = [...sources, { kind: "craft", code: w.code, quantity: step.units, done: 0 }];
      out = tail.length < 4 ? [reset(step.sources?.[0]?.work ?? w), ...tail] : tail;
      break;
    }
    case "buy": {
      if (supply) { // a trade for a material: withdraw the currency, buy, bank what was bought
        out = [{ kind: "withdraw", code: w.currency, quantity: w.price * step.units }, { kind: "buy", code: w.code, quantity: step.units, npc: w.npc }, { kind: "deposit-all" }];
        break;
      }
      const tail: QueueItemInput[] = [...sources, { kind: "withdraw", code: w.currency, quantity: w.price * step.units }, { kind: "buy", code: w.code, quantity: step.units, npc: w.npc }];
      out = sources.length && tail.length < 4 ? [reset(step.sources![0].work), ...tail] : tail;
      break;
    }
    case "task": // task 027d: a supply step of a task is its visit alone (src:tasks_coin with no task to work)
      out = [...visit("start"), ...(supply ? [] : [{ kind: "task-loop", master: "monsters", times: step.units, done: 0, gear: true } as const])];
      break;
    case "train": // task 029: `runs` of the recipe the step's picker named (train.ts), within its level
      out = [reset(w), { kind: "train", skill: w.lane, toLevel: 0, levels: 1, gear: true, ...(w.code && w.runs ? { code: w.code, runs: w.runs, done: 0 } : {}) }];
      break;
    case "recycle": {
      // task 015, settled point 4: a tidy step — every copy of each code recycled (the item withdraws them a bagful at a
      // time), what came back banked. No reset: a craft job's reset strips the worn set into a bank that is nearly full,
      // and its wisdom pick can be the very piece to recycle (copper boots: wisdom 10).
      const codes = Object.entries(w.codes ?? {});
      const skill = item(codes[0]?.[0] ?? "")?.craft?.skill;
      if (!codes.length || !skill) throw new Error(`a recycle step ${step.key} has no codes`);
      out = [...codes.map(([code, quantity]): QueueItemInput => ({ kind: "recycle", code, quantity, done: 0, skill })), { kind: "deposit-all" }];
      break;
    }
    default:
      throw new Error(`a ${w.kind} step has no queue items`);
  }
  if (out.length > 4) throw new Error(`step ${step.key} needs ${out.length} items`);
  return out.map((it, i) => ({ ...it, id: `pl:${step.key}:${i}` }) as QueueItem);
}
