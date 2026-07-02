// Shared mechanics for the automation loops (gather / refine / fight / campaign).
//
// These are the cooldown-paced primitives every loop copy-pasted: wait out a
// cooldown (interruptible or full), move-if-not-there, find the nearest tile of a
// kind, deposit the whole inventory, detect an inventory-full error. They are
// job-type independent — each loop keeps its own job signal, stopFlags and
// control flow; only these building blocks are shared.

import * as actions from "../api/actions";
import { catalog } from "../catalog";
import { ApiError } from "../api/client";
import { characters } from "./store";
import { cooldownRemaining } from "../lib/util";
import type { Character } from "../types/api";
import type { GameMap } from "../types/catalog";

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

/** Move to (x,y), skipping the call (and its cooldown) if already there. */
export async function moveTo(name: string, x: number, y: number): Promise<void> {
  const ch = characters.value[name];
  if (ch && ch.x === x && ch.y === y) return;
  await step(name, () => actions.move(name, x, y));
}

/** Nearest map tile whose content matches `type` (and `code`, if given), by Manhattan distance. */
export function nearest(type: string, code: string | null, x: number, y: number): GameMap | undefined {
  let best: GameMap | undefined;
  let bestD = Infinity;
  for (const m of catalog().maps) {
    const c = m.interactions?.content;
    if (!c || c.type !== type || (code != null && c.code !== code)) continue;
    const d = Math.abs(m.x - x) + Math.abs(m.y - y);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

export const nearestBank = (x: number, y: number): GameMap | undefined => nearest("bank", null, x, y);

export const isInventoryFull = (e: unknown): boolean =>
  e instanceof ApiError && (e.code === 497 || /inventor/i.test(e.message));

/**
 * Deposit everything the character is carrying (a no-op with empty inventory).
 * `except` protects working stock — the campaign's food/potions/task items —
 * from being banked off with the loot.
 */
export async function depositAll(name: string, except?: Set<string>): Promise<void> {
  const ch = characters.value[name];
  const items = (ch?.inventory || [])
    .filter((s) => s.code && s.quantity > 0 && !except?.has(s.code))
    .map((s) => ({ code: s.code, quantity: s.quantity }));
  if (items.length) await step(name, () => actions.depositItems(name, items));
}
