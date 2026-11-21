// Shared mechanics for the queue runner (and any future runner).
//
// These are the cooldown-paced primitives: wait out a cooldown (interruptible
// or full), move-if-not-there, find the nearest tile of a kind, deposit the
// whole inventory, detect an inventory-full error. They are job-type
// independent — a runner keeps its own job signal, stopFlags and control flow;
// only these building blocks are shared.

import * as actions from "../api/actions";
import { catalog } from "../catalog";
import { ApiError, api, getAllPages } from "../api/client";
import { achievements, bankDetails, bankItems, characters } from "./store";
import { liveEvents } from "./events";
import { cooldownRemaining } from "../lib/util";
import { devlog } from "../lib/devlog";
import { journal } from "../lib/journal";
import { FREE, route, travelSec } from "../plan/route";
import type { May, Place } from "../plan/route";
import { GEAR_SLOTS, slotCode } from "../types/api";
import type { BankDetails, BankItem, Character } from "../types/api";
import type { GameMap, Transition } from "../types/catalog";

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const layerOf = (ch: Character): string => (ch as { layer?: string }).layer ?? "overworld";

/** Interruptible cooldown wait — a stop request takes effect within ~½s even mid-cooldown. */
export async function waitCooldown(name: string, shouldStop: () => boolean): Promise<void> {
  for (;;) {
    if (shouldStop()) return;
    const ch = characters.value[name];
    const left = ch ? cooldownRemaining(ch, Date.now()) : 0;
    if (left <= 0) return;
    await sleep(Math.min(500, left * 1000) + 50);
  }
}

/** Full (non-interruptible) cooldown wait — keeps an atomic multi-step round from being stranded. */
export async function waitCooldownFull(name: string): Promise<void> {
  for (;;) {
    const ch = characters.value[name];
    const left = ch ? cooldownRemaining(ch, Date.now()) : 0;
    if (left <= 0) return;
    await sleep(left * 1000 + 50);
  }
}

/** Run one action then wait out the cooldown it incurs. */
export async function step(name: string, fn: () => Promise<unknown>): Promise<void> {
  await fn();
  await waitCooldownFull(name);
}

export const placeOf = (ch: Character): Place => ({ x: ch.x, y: ch.y, layer: layerOf(ch) });
/** Standing on `p`: the same x, y AND layer. */
export const isAt = (ch: Character, p: Place): boolean => ch.x === p.x && ch.y === p.y && layerOf(ch) === p.layer;

/** No route from where the character stands to `to` through the transitions it may use. */
export class NoRouteError extends Error {}

const at = (p: Place): string => `(${p.x}, ${p.y}) ${p.layer}`;

const backMemo = new WeakMap<Transition, boolean>();
/** Whether a free route leads home (the city bank) from where a transition lands: then its fare is all it takes. */
const freeBack = (t: Transition): boolean => {
  let b = backMemo.get(t);
  if (b === undefined) backMemo.set(t, (b = !!route({ x: t.x, y: t.y, layer: t.layer }, { x: 4, y: 1, layer: "overworld" }, FREE)));
  return b;
};
const mays = new Map<string, May>([["", FREE]]);
/**
 * Task 017, settled point 6: the transitions a character may take NOW — the free ones, and every one whose conditions it
 * meets: a fare the gold in its pocket pays with the way back (shortcut: a paid way back costs what the way in did — the
 * island's boat, the only one on the map), a key in its bag, a carried item in its bag or worn, an achievement of the
 * account. So nobody is stranded: a character goes behind a paid transition only with its way out in its pocket.
 */
export function mayFor(ch: Character): May {
  const held = (code: string, worn: boolean): number =>
    (ch.inventory ?? []).reduce((s, i) => s + (i.code === code ? i.quantity : 0), 0) + (worn ? GEAR_SLOTS.filter((g) => slotCode(ch, g) === code).length : 0);
  const open: string[] = [];
  for (const m of catalog().maps) {
    const t = m.interactions?.transition;
    if (!t?.conditions?.length) continue;
    const ok = t.conditions.every((c) =>
      c.operator === "achievement_unlocked" ? !!achievements.value?.find((a) => a.code === c.code)?.completed_at
      : c.operator === "cost" && c.code === "gold" ? ch.gold >= c.value * (freeBack(t) ? 1 : 2)
      : c.operator === "cost" ? held(c.code, false) >= c.value
      : c.operator === "has_item" ? held(c.code, true) >= c.value
      : false);
    if (ok) open.push(`${m.layer}:${m.x},${m.y}`);
  }
  const key = open.join(";");
  let may = mays.get(key);
  if (!may) {
    const set = new Set(open);
    const byT = new Map(catalog().maps.filter((m) => m.interactions?.transition).map((m) => [m.interactions.transition!, `${m.layer}:${m.x},${m.y}`]));
    mays.set(key, (may = (t) => FREE(t) || set.has(byT.get(t) ?? "")));
  }
  return may;
}

/**
 * One leg toward `to` (a `move` or a `transition`, and its cooldown); true once
 * the character stands on `to` — at once, with no call, when it already does.
 * One leg per call, so a route is interruptible between legs like every other
 * action: the next tick routes again from wherever the character is.
 */
export async function moveTo(name: string, to: Place): Promise<boolean> {
  const ch = characters.value[name];
  if (!ch) return false;
  if (isAt(ch, to)) return true;
  const from = placeOf(ch);
  const legs = route(from, to, mayFor(ch));
  if (!legs) throw new NoRouteError(`${at(to)} is not reachable from ${at(from)} — another layer, behind a transition it cannot pass now (no key, carried item or fare for the way there and back)`);
  const leg = legs[0];
  if (leg.kind === "transition") await step(name, () => actions.transition(name));
  else {
    try {
      await step(name, () => actions.move(name, leg.x, leg.y));
    } catch (e) {
      // route() said these two tiles are one region; the game says no path / blocked.
      if (e instanceof ApiError && (e.code === 595 || e.code === 596)) throw new Error(`move ${at(from)} → ${at(leg)} answered ${e.code} (${e.message}) though route() found a path — the map's regions are wrong`);
      throw e;
    }
  }
  return legs.length === 1;
}

/** Every leg to `to` in one call — only for a sequence that must not be split across ticks. */
export async function walkTo(name: string, to: Place): Promise<void> {
  for (let i = 0; i < 12; i++) if (await moveTo(name, to)) return;
  throw new Error(`still not at ${at(to)} after 12 legs`);
}

/**
 * The map tile whose content matches `type` (and `code`, if given) that `who`
 * reaches soonest — by route, through free transitions only, ranked by travel
 * time; a tile with no route is not a candidate. Active event tiles count too,
 * on their own layer — a queued fight/gather can target an event
 * monster/resource while its event runs.
 */
export function nearest(type: string, code: string | null, who: Character, ok?: (m: GameMap) => boolean): GameMap | undefined {
  const from = placeOf(who);
  const may = mayFor(who); // task 017: through the transitions it may take now
  let best: GameMap | undefined;
  let bestT = Infinity;
  const consider = (m: GameMap) => {
    const c = m.interactions?.content;
    if (!c || c.type !== type || (code != null && c.code !== code) || (ok && !ok(m))) return;
    const legs = route(from, m, may);
    const t = legs ? travelSec(legs) : Infinity;
    if (t < bestT) {
      bestT = t;
      best = m;
    }
  };
  for (const m of catalog().maps) consider(m);
  for (const e of liveEvents()) consider(e.map);
  return best;
}

/** Why nearest() found nothing: the content is nowhere on the map, or only where `who` has no route to. */
export function missingText(type: string, code: string, who: Character): string {
  const is = (m: GameMap) => m.interactions?.content?.type === type && m.interactions.content.code === code;
  return catalog().maps.some(is) || liveEvents().some((e) => is(e.map))
    ? `no ${code} reachable — only on another layer, behind a transition it cannot pass now (from ${at(placeOf(who))})`
    : `no ${code} on the map (event over?)`;
}

/** Nearest bank, never an achievement-gated one (season 9: the Sandwhisper Isle bank — also only
 *  reachable by boat). */
export const nearestBank = (who: Character): GameMap | undefined =>
  nearest("bank", null, who, (m) => m.access?.type !== "conditional");

export const isInventoryFull = (e: unknown): boolean =>
  e instanceof ApiError && (e.code === 497 || /inventor/i.test(e.message));

/** Total quantity of `code` in the bank (live signal read). */
export function bankQty(code: string): number {
  return bankItems.value.filter((b) => b.code === code).reduce((s, b) => s + b.quantity, 0);
}

// ── Task 015: the bank's slots. A slot is a code, whatever the quantity; a stack the bank holds needs none. ──

/** The bank's free slots: its slots less the codes it holds (∞ before the first sync). */
export const freeSlots = (): number => (bankDetails.value?.slots ?? Infinity) - new Set(bankItems.value.map((b) => b.code)).size;

/** Of `codes`, the ones the bank cannot take now: a code it holds no stack of, beyond its free slots (in order). */
export function noSlotFor(codes: string[]): string[] {
  const held = new Set(bankItems.value.map((b) => b.code));
  let free = freeSlots();
  return [...new Set(codes)].filter((c) => !held.has(c) && free-- <= 0);
}

/** A bag full of codes the bank cannot take: the item ends (runLoop), never a pause, never a block. */
export class BankFullError extends Error {}

/** Who hears that the bank had no slot for a code (the planner, src/state/planner.ts): the character and the codes. */
let onNoSlot: ((name: string, codes: string[]) => void) | undefined;
export const setNoSlotHook = (fn: (name: string, codes: string[]) => void): void => void (onNoSlot = fn);
export const reportNoSlot = (name: string, codes: string[]): void => void (codes.length && onNoSlot?.(name, codes));

/**
 * Every deposit of items goes through here (settled point 1). A code the bank has no slot for stays in the bag: what
 * the bank holds a stack of is banked, the rest is kept, the caller goes on. Decided first from the bank as it is known;
 * a 462 the game answers anyway (the bank changed under us) is the same answer: the slots are corrected to the codes it
 * holds and the codes it holds a stack of go in one more call. Never a retry of the same deposit. Returns what was kept.
 */
export async function deposit(name: string, items: { code: string; quantity: number }[]): Promise<string[]> {
  const left = new Set(noSlotFor(items.map((i) => i.code)));
  let go = items.filter((i) => !left.has(i.code));
  if (go.length) {
    try {
      await step(name, () => actions.depositItems(name, go));
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 462)) throw e;
      const held = new Set(bankItems.value.map((b) => b.code));
      if (bankDetails.value) bankDetails.value = { ...bankDetails.value, slots: held.size };
      for (const i of go) if (!held.has(i.code)) left.add(i.code);
      go = go.filter((i) => held.has(i.code));
      if (go.length) await step(name, () => actions.depositItems(name, go));
      await readBankAfter462(); // task 016, settled point 11: the correction above is the answer of the moment
    }
  }
  reportNoSlot(name, [...left]);
  return [...left];
}

const BANK_READ_MS = 10 * 60_000;
let bankReadAt = -Infinity;
/**
 * Task 016, settled point 11: after a 462 the bank is read, not guessed — one read of its details and its items, at most
 * one in ten minutes (the account's reads are the scarce budget), so the slots and the codes are the game's again. A
 * read that fails leaves the local correction; nothing waits for it but this deposit.
 */
async function readBankAfter462(): Promise<void> {
  const now = Date.now();
  if (now - bankReadAt < BANK_READ_MS) return;
  bankReadAt = now;
  try {
    const [d, items] = await Promise.all([api<BankDetails>("/my/bank"), getAllPages<BankItem>("/my/bank/items")]);
    bankDetails.value = d;
    bankItems.value = items;
    const codes = new Set(items.map((b) => b.code)).size;
    devlog(`bank read after a 462: ${codes} codes of ${d.slots} slots (${d.slots - codes} free)`);
    journal("bank", { what: "read", used: codes, slots: d.slots, free: d.slots - codes, next: d.next_expansion_cost, gold: d.gold });
  } catch (e) {
    devlog(`bank read after a 462 failed: ${(e as Error).message} — the local count stands`);
  }
}

/**
 * Deposit everything the character is carrying (a no-op with empty inventory).
 * `except` protects working stock — food/potions/task items — from being
 * banked off with the loot. Pocket gold is swept into the vault on
 * every visit too (buy steps withdraw their cost back on demand — see
 * exec.ts runStep "buy"). A code the bank has no slot for stays in the bag (deposit).
 */
export async function depositAll(name: string, except?: Set<string>, keepGold = 0): Promise<void> {
  const ch = characters.value[name];
  const items = (ch?.inventory || [])
    .filter((s) => s.code && s.quantity > 0 && !except?.has(s.code))
    .map((s) => ({ code: s.code, quantity: s.quantity }));
  if (items.length) await deposit(name, items);
  // task 017, settled point 6: the sweep leaves a trip's fares in the pocket
  const gold = (characters.value[name]?.gold ?? 0) - keepGold;
  if (gold > 0) await step(name, () => actions.depositGold(name, gold));
}
