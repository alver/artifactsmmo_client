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
const fieldItem = (w: Work, times: number, take: Record<string, number> = {}): QueueItemInput =>
  w.kind === "kill" ? { kind: "fight", monster: w.monster, times, done: 0, gear: true, take }
  : w.kind === "gather" ? { kind: "gather", code: w.drop, resource: w.resource, times, done: 0, gear: true }
  : (() => { throw new Error(`no field item for ${w.kind}`); })();

/** The queue items of a step for its character. */
export function itemsOf(step: Step, ch: Character): QueueItem[] {
  if (step.character !== ch.name) throw new Error(`step ${step.key} is not ${ch.name}'s`);
  const w = step.work;
  const reset = (x: Work): QueueItemInput => ({ kind: "gear", job: jobOf(x), reset: true });
  const sources = (step.sources ?? []).map((s) => fieldItem(s.work, s.times));
  let out: QueueItemInput[];
  // Task 009: a supply step (src:, mat:, gear:) is [gear reset, the field item or the craft, deposit-all] — what it
  // makes is in the bank when it ends; a src: step's units are actions. The craft item takes its materials from the
  // bank. A mat: step that is a trade (hard leather for cowhide) is [withdraw the currency, buy, deposit-all].
  const supply = step.as === "supply";
  switch (w.kind) {
    case "kill": case "gather":
      out = [reset(w), fieldItem(w, supply ? step.units : Math.max(1, Math.ceil(step.units * perOf(w) - 1e-9)), step.withdraw), ...(supply ? [{ kind: "deposit-all" } as const] : [])];
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
    case "task":
      out = [{ kind: "task-loop", master: "monsters", times: step.units, done: 0, gear: true }];
      break;
    case "train":
      out = [reset(w), { kind: "train", skill: w.lane, toLevel: 0, levels: 1, gear: true }];
      break;
    default:
      throw new Error(`a ${w.kind} step has no queue items`);
  }
  if (out.length > 4) throw new Error(`step ${step.key} needs ${out.length} items`);
  return out.map((it, i) => ({ ...it, id: `pl:${step.key}:${i}` }) as QueueItem);
}
