// Automation cycle #1 — an infinite gather loop per character.
//
// Give a character a gather order at the tile it's standing on; it then gathers
// on repeat, pausing only to bank when its inventory fills (move → deposit all →
// move back), until stopped. Paced entirely by the cooldown each action returns,
// so it adds no polling — one request per action, same no-poll contract as the
// rest of the client.

import { effect, signal } from "@preact/signals";
import * as actions from "../api/actions";
import { catalog, tileAt } from "../catalog";
import { ApiError } from "../api/client";
import { characters, pushLog } from "./store";
import { cooldownRemaining } from "../lib/util";
import type { Character } from "../types/api";
import type { GameMap } from "../types/catalog";

export type GatherStatus = "gathering" | "banking";

export interface GatherJob {
  /** The tile being worked, remembered so we can return after a bank trip. */
  x: number;
  y: number;
  resource: string; // resource code at the gather tile
  bankX: number;
  bankY: number;
  status: GatherStatus;
  note: string; // short human status shown on the card
}

const STORE_KEY = "ammo:v1:gather";
function loadStored(): Record<string, GatherJob> {
  try {
    return (JSON.parse(localStorage.getItem(STORE_KEY) || "{}") as Record<string, GatherJob>) || {};
  } catch {
    return {};
  }
}

/**
 * Active gather jobs, keyed by character name. Presence ⇒ the loop is running.
 * Hydrated from localStorage at load so orders survive a page reload; the loops
 * themselves are re-launched by resumeGather() after the boot sync.
 */
export const gatherJobs = signal<Record<string, GatherJob>>(loadStored());
const stopFlags = new Set<string>();

// Mirror jobs to localStorage on every change so a reload can resume them.
effect(() => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(gatherJobs.value));
  } catch {
    /* quota / unavailable — non-fatal */
  }
});

const layerOf = (ch: Character): string => (ch as { layer?: string }).layer ?? "overworld";
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function setJob(name: string, patch: Partial<GatherJob>): void {
  const cur = gatherJobs.value[name];
  if (!cur) return;
  gatherJobs.value = { ...gatherJobs.value, [name]: { ...cur, ...patch } };
}
function clearJob(name: string): void {
  const { [name]: _gone, ...rest } = gatherJobs.value;
  gatherJobs.value = rest;
}

function nearestBank(x: number, y: number): GameMap | undefined {
  let best: GameMap | undefined;
  let bestD = Infinity;
  for (const m of catalog().maps) {
    if (m.interactions?.content?.type !== "bank") continue;
    const d = Math.abs(m.x - x) + Math.abs(m.y - y);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

function inventoryCount(ch: Character): number {
  return (ch.inventory || []).reduce((s, it) => s + (it.quantity || 0), 0);
}

// Interruptible cooldown wait — used between gathers so a stop request takes
// effect within ~half a second even mid-cooldown.
async function waitCooldown(name: string): Promise<void> {
  for (;;) {
    if (stopFlags.has(name)) return;
    const ch = characters.value[name];
    const left = ch ? cooldownRemaining(ch, Date.now()) : 0;
    if (left <= 0) return;
    await sleep(Math.min(500, left * 1000) + 50);
  }
}

// Full (non-interruptible) cooldown wait — used inside a bank run so the whole
// round-trip completes and the character ends back on its resource even if the
// user hits stop midway.
async function waitCooldownFull(name: string): Promise<void> {
  for (;;) {
    const ch = characters.value[name];
    const left = ch ? cooldownRemaining(ch, Date.now()) : 0;
    if (left <= 0) return;
    await sleep(left * 1000 + 50);
  }
}

// Run one action then wait out the cooldown it incurs (bank-run steps complete).
async function step(name: string, fn: () => Promise<unknown>): Promise<void> {
  await fn();
  await waitCooldownFull(name);
}

async function moveTo(name: string, x: number, y: number): Promise<void> {
  const ch = characters.value[name];
  if (ch && ch.x === x && ch.y === y) return; // already there — no move (and no cooldown)
  await step(name, () => actions.move(name, x, y));
}

// Always runs to completion (move → deposit all → move back) so the character
// is left standing on its resource, ready to resume or to be cleanly stopped.
async function bankRun(name: string, job: GatherJob): Promise<void> {
  setJob(name, { status: "banking", note: "→ bank" });
  await moveTo(name, job.bankX, job.bankY);

  const ch = characters.value[name];
  const items = (ch?.inventory || [])
    .filter((s) => s.code && s.quantity > 0)
    .map((s) => ({ code: s.code, quantity: s.quantity }));
  if (items.length) {
    setJob(name, { note: "depositing" });
    await step(name, () => actions.depositItems(name, items));
  }

  setJob(name, { status: "gathering", note: "→ resource" });
  await moveTo(name, job.x, job.y);
}

const isInventoryFull = (e: unknown): boolean =>
  e instanceof ApiError && (e.code === 497 || /inventor/i.test(e.message));

async function runLoop(name: string): Promise<void> {
  try {
    while (!stopFlags.has(name)) {
      await waitCooldown(name); // respect any pending cooldown before acting
      if (stopFlags.has(name)) break;

      const job = gatherJobs.value[name];
      const ch = characters.value[name];
      if (!job || !ch) break;

      if (inventoryCount(ch) >= ch.inventory_max_items) {
        await bankRun(name, job);
        continue;
      }

      // Ensure we're standing on the resource — covers resuming after a reload
      // that interrupted a bank run (no-op, no cooldown, when already there).
      await moveTo(name, job.x, job.y);

      setJob(name, { status: "gathering", note: "" });
      try {
        await actions.gather(name);
      } catch (e) {
        if (isInventoryFull(e)) {
          await bankRun(name, job);
          continue;
        }
        pushLog({ ts: Date.now(), character: name, action: "gather", text: `loop stopped: ${(e as Error).message}`, kind: "bad" });
        break;
      }
    }
  } finally {
    stopFlags.delete(name);
    clearJob(name);
  }
}

/** Start gathering at the character's current tile (must be a resource). */
export function startGather(name: string): void {
  if (gatherJobs.value[name]) return; // already running
  const ch = characters.value[name];
  if (!ch) return;

  const content = tileAt(ch.x, ch.y, layerOf(ch))?.interactions.content;
  if (content?.type !== "resource") {
    pushLog({ ts: Date.now(), character: name, action: "gather", text: "not standing on a resource", kind: "bad" });
    return;
  }
  const bank = nearestBank(ch.x, ch.y);
  if (!bank) {
    pushLog({ ts: Date.now(), character: name, action: "gather", text: "no bank found on the map", kind: "bad" });
    return;
  }

  stopFlags.delete(name);
  gatherJobs.value = {
    ...gatherJobs.value,
    [name]: { x: ch.x, y: ch.y, resource: content.code, bankX: bank.x, bankY: bank.y, status: "gathering", note: "" },
  };
  pushLog({ ts: Date.now(), character: name, action: "gather", text: `gathering ${content.code} at (${ch.x}, ${ch.y})`, kind: "info" });
  void runLoop(name);
}

/** Ask the loop to stop after the current action completes. */
export function stopGather(name: string): void {
  if (!gatherJobs.value[name]) return;
  stopFlags.add(name);
  setJob(name, { note: "stopping…" });
}

/**
 * Re-launch loops for jobs restored from localStorage. Call once after the boot
 * sync so loops act on fresh character state. Drops jobs whose character is gone.
 */
export function resumeGather(): void {
  const kept: Record<string, GatherJob> = {};
  let dropped = false;
  for (const [name, job] of Object.entries(gatherJobs.value)) {
    if (characters.value[name]) {
      kept[name] = job;
      stopFlags.delete(name);
    } else {
      dropped = true; // stale order for a character that no longer exists
    }
  }
  if (dropped) gatherJobs.value = kept;
  for (const name of Object.keys(kept)) {
    pushLog({ ts: Date.now(), character: name, action: "gather", text: "resumed after reload", kind: "info" });
    void runLoop(name);
  }
}
