// Shared stock at plan time (design D.1): what the other characters' current steps will take from the bank,
// and what is left for this one. No spending rule (task 007, settled point 2). Pure.
//
// Task 009 section 6: a step's gear set (`Step.wear`, fixed when the step was decided) is reserved only for the
// pieces its character does not wear or hold yet — a piece already on it is not in the bank. The pool a character
// plans its gear with is the bank less every reservation of the others, plus what it holds (`poolBank`).

import { item } from "../../catalog";
import { GOLD_FLOOR, SELL_FLOORS } from "../events";
import { ownedQtyOf } from "../jobgear";
import { SLOTS_FOR_TYPE } from "../../types/api";
import type { BankItem } from "../../types/api";
import type { World } from "./types";

/** What the bank keeps of a code: the merchant's sell floors and the gold floor (src/plan/events.ts). */
export const floor = (code: string): number => (code === "gold" ? GOLD_FLOOR : (SELL_FLOORS[code] ?? 0));

const memo = new WeakMap<World, Map<string, Map<string, number>>>();
/** What the current steps of every character but `except` will withdraw: materials, a buy's currency, and the
 *  pieces of the set their job wears that they do not wear or hold yet. */
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
    if (!step.wear) continue;
    const ch = world.characters.find((c) => c.name === name);
    const has = ch ? ownedQtyOf(ch, []) : new Map<string, number>();
    const want = new Map<string, number>();
    for (const code of Object.values(step.wear)) want.set(code, (want.get(code) ?? 0) + 1);
    for (const [code, n] of want) if (n > (has.get(code) ?? 0)) add(code, n - (has.get(code) ?? 0));
  }
  byName.set(except ?? "", out);
  return out;
}

/** Bank stock of a code this character may plan with: bank − what the others' steps reserved − the floor. */
export function available(code: string, world: World, forName: string): number {
  const bank = world.bank.reduce((t, b) => t + (b.code === code ? b.quantity : 0), 0);
  return Math.max(0, bank - (reserved(world, forName).get(code) ?? 0) - floor(code));
}

const pools = new WeakMap<World, Map<string, BankItem[]>>();
const wholeGear = new WeakMap<BankItem[], BankItem[]>();
/** The bank a character plans its gear with (section 6): the bank less what the others' current steps reserved, and
 *  whole copies of gear only (the forward model banks expected drops: 0.3 of a dropped ring is no ring). */
export function poolBank(world: World, name: string): BankItem[] {
  let byName = pools.get(world);
  if (!byName) pools.set(world, (byName = new Map()));
  let b = byName.get(name);
  if (!b) {
    const res = reserved(world, name);
    let whole = wholeGear.get(world.bank);
    if (!whole) {
      whole = world.bank.some((x) => !Number.isInteger(x.quantity) && SLOTS_FOR_TYPE[item(x.code)?.type ?? ""])
        ? world.bank.map((x) => (SLOTS_FOR_TYPE[item(x.code)?.type ?? ""] ? { ...x, quantity: Math.floor(x.quantity + 1e-9) } : x)).filter((x) => x.quantity > 0)
        : world.bank;
      wholeGear.set(world.bank, whole);
    }
    b = res.size ? whole.map((x) => (res.has(x.code) ? { ...x, quantity: Math.max(0, x.quantity - res.get(x.code)!) } : x)).filter((x) => x.quantity > 0) : whole;
    byName.set(name, b);
  }
  return b;
}
