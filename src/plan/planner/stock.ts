// Shared stock at plan time (design D.1): what the other characters' current steps will take from the bank,
// and what is left for this one. No spending rule (task 007, settled point 2). Pure.

import { item, resource as resourceOf } from "../../catalog";
import { GOLD_FLOOR, SELL_FLOORS } from "../events";
import { jobGear } from "../jobgear";
import { fightRec } from "./reach";
import type { GearJob } from "../types";
import type { Step, World } from "./types";

/** What the bank keeps of a code: the merchant's sell floors and the gold floor (src/plan/events.ts). */
export const floor = (code: string): number => (code === "gold" ? GOLD_FLOOR : (SELL_FLOORS[code] ?? 0));

/** The gear codes a step's job wears (one each): the fight solve's set, else the gather/craft argmax. */
function gearOf(step: Step, world: World): string[] {
  const ch = world.characters.find((c) => c.name === step.character);
  const w = step.work;
  if (!ch) return [];
  if (w.kind === "kill") return fightRec(ch, world, w.monster)?.codes ?? [];
  const job: GearJob | undefined =
    w.kind === "gather" ? { kind: "gather", skill: resourceOf(w.resource)?.skill ?? "" }
    : w.kind === "train" ? { kind: "craft", skill: w.lane }
    : w.kind === "craft" ? { kind: "craft", skill: item(w.code)?.craft?.skill }
    : undefined;
  return job ? Object.values(jobGear(ch, world.bank, job) ?? {}).filter((c): c is string => !!c) : [];
}

const memo = new WeakMap<World, Map<string, Map<string, number>>>();
/** What the current steps of every character but `except` will withdraw: materials, a buy's currency, the gear set their job wears. */
export function reserved(world: World, except?: string): Map<string, number> {
  let byName = memo.get(world);
  if (!byName) memo.set(world, (byName = new Map()));
  const hit = byName.get(except ?? "");
  if (hit) return hit;
  const out = new Map<string, number>();
  const add = (code: string, q: number): void => void out.set(code, (out.get(code) ?? 0) + q);
  for (const [name, step] of Object.entries(world.current)) {
    if (!step || name === except) continue;
    for (const [code, q] of Object.entries(step.withdraw ?? {})) add(code, q);
    for (const code of gearOf(step, world)) add(code, 1);
  }
  byName.set(except ?? "", out);
  return out;
}

/** Bank stock of a code this character may plan with: bank − what the others' steps reserved − the floor. */
export function available(code: string, world: World, forName: string): number {
  const bank = world.bank.reduce((t, b) => t + (b.code === code ? b.quantity : 0), 0);
  return Math.max(0, bank - (reserved(world, forName).get(code) ?? 0) - floor(code));
}
