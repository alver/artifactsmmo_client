// Shared mechanics for the queue runner (and any future runner).
//
// These are the cooldown-paced primitives: wait out a cooldown (interruptible
// or full), move-if-not-there, find the nearest tile of a kind, deposit the
// whole inventory, detect an inventory-full error. They are job-type
// independent — a runner keeps its own job signal, stopFlags and control flow;
// only these building blocks are shared.

import * as actions from "../api/actions";
import { catalog } from "../catalog";
import { ApiError } from "../api/client";
import { bankItems, characters } from "./store";
import { liveEvents } from "./events";
import { cooldownRemaining } from "../lib/util";
import { FREE, route, travelSec } from "../plan/route";
import type { Place } from "../plan/route";
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

export const placeOf = (ch: Character): Place => ({ x: ch.x, y: ch.y, layer: layerOf(ch) });
/** Standing on `p`: the same x, y AND layer. */
export const isAt = (ch: Character, p: Place): boolean => ch.x === p.x && ch.y === p.y && layerOf(ch) === p.layer;

/** No route from where the character stands to `to` through the transitions it may use. */
export class NoRouteError extends Error {}

const at = (p: Place): string => `(${p.x}, ${p.y}) ${p.layer}`;

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
  const legs = route(from, to, FREE);
  if (!legs) throw new NoRouteError(`${at(to)} is not reachable from ${at(from)} — another layer, behind a transition this client does not use`);
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
  let best: GameMap | undefined;
  let bestT = Infinity;
  const consider = (m: GameMap) => {
    const c = m.interactions?.content;
    if (!c || c.type !== type || (code != null && c.code !== code) || (ok && !ok(m))) return;
    const legs = route(from, m, FREE);
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
    ? `no ${code} reachable — only on another layer, behind a transition this client does not use (from ${at(placeOf(who))})`
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

/**
 * Deposit everything the character is carrying (a no-op with empty inventory).
 * `except` protects working stock — food/potions/task items — from being
 * banked off with the loot. Pocket gold is swept into the vault on
 * every visit too (buy steps withdraw their cost back on demand — see
 * exec.ts runStep "buy").
 */
export async function depositAll(name: string, except?: Set<string>): Promise<void> {
  const ch = characters.value[name];
  const items = (ch?.inventory || [])
    .filter((s) => s.code && s.quantity > 0 && !except?.has(s.code))
    .map((s) => ({ code: s.code, quantity: s.quantity }));
  if (items.length) await step(name, () => actions.depositItems(name, items));
  const gold = characters.value[name]?.gold ?? 0;
  if (gold > 0) await step(name, () => actions.depositGold(name, gold));
}
