// Automation cycle #3 — an infinite fight loop per character.
//
// Give a character a fight order on the monster tile it's standing on; it fights
// on repeat, resting to heal whenever its HP drops below a threshold (then back
// to full before resuming), until stopped or it loses a fight. Paced entirely by
// the cooldown each action returns — no polling, same no-poll contract as the
// rest of the client. Mutually exclusive with the gather / refine loops.

import { effect, signal } from "@preact/signals";
import * as actions from "../api/actions";
import { tileAt } from "../catalog";
import { ApiError } from "../api/client";
import { characters, pushLog } from "./store";
import { gatherJobs, nearestBank } from "./gather";
import { refineJobs } from "./refine";
import { cooldownRemaining } from "../lib/util";
import type { Character } from "../types/api";

export type FightStatus = "fighting" | "resting" | "banking";

export interface FightJob {
  /** The tile being worked (where the monster is). */
  x: number;
  y: number;
  monster: string; // monster code at the tile
  status: FightStatus;
  fights: number; // total fights attempted this run
  wins: number;
  note: string; // short human status shown on the card
}

const STORE_KEY = "ammo:v1:fight";
function loadStored(): Record<string, FightJob> {
  try {
    return (JSON.parse(localStorage.getItem(STORE_KEY) || "{}") as Record<string, FightJob>) || {};
  } catch {
    return {};
  }
}

/**
 * Active fight jobs, keyed by character name. Presence ⇒ the loop is running.
 * Hydrated from localStorage at load so orders survive a reload; the loops are
 * re-launched by resumeFight() after the boot sync.
 */
export const fightJobs = signal<Record<string, FightJob>>(loadStored());
const stopFlags = new Set<string>();

// Mirror jobs to localStorage on every change so a reload can resume them.
effect(() => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(fightJobs.value));
  } catch {
    /* quota / unavailable — non-fatal */
  }
});

const layerOf = (ch: Character): string => (ch as { layer?: string }).layer ?? "overworld";
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function setJob(name: string, patch: Partial<FightJob>): void {
  const cur = fightJobs.value[name];
  if (!cur) return;
  fightJobs.value = { ...fightJobs.value, [name]: { ...cur, ...patch } };
}
function clearJob(name: string): void {
  const { [name]: _gone, ...rest } = fightJobs.value;
  fightJobs.value = rest;
}

// Interruptible cooldown wait — a stop request takes effect within ~half a second
// even mid-cooldown.
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
// round-trip completes and the character ends back on its monster tile.
async function waitCooldownFull(name: string): Promise<void> {
  for (;;) {
    const ch = characters.value[name];
    const left = ch ? cooldownRemaining(ch, Date.now()) : 0;
    if (left <= 0) return;
    await sleep(left * 1000 + 50);
  }
}

async function moveTo(name: string, x: number, y: number): Promise<void> {
  const ch = characters.value[name];
  if (ch && ch.x === x && ch.y === y) return; // already there — no move, no cooldown
  await actions.move(name, x, y);
  await waitCooldownFull(name);
}

const isInventoryFull = (e: unknown): boolean =>
  e instanceof ApiError && (e.code === 497 || /inventor/i.test(e.message));

// Move → deposit everything → move back to the monster tile. Runs to completion
// so the character is left ready to resume fighting. Throws if a step fails.
async function bankRun(name: string, job: FightJob): Promise<void> {
  const bank = nearestBank(job.x, job.y);
  if (!bank) throw new Error("inventory full and no bank found on the map");

  setJob(name, { status: "banking", note: "→ bank" });
  await moveTo(name, bank.x, bank.y);

  const ch = characters.value[name];
  const items = (ch?.inventory || [])
    .filter((s) => s.code && s.quantity > 0)
    .map((s) => ({ code: s.code, quantity: s.quantity }));
  if (items.length) {
    setJob(name, { note: "depositing" });
    await actions.depositItems(name, items);
    await waitCooldownFull(name);
  }

  setJob(name, { status: "banking", note: "→ monster" });
  await moveTo(name, job.x, job.y);
}

async function runLoop(name: string): Promise<void> {
  try {
    while (!stopFlags.has(name)) {
      await waitCooldown(name); // respect any pending cooldown before acting
      if (stopFlags.has(name)) break;

      const job = fightJobs.value[name];
      const ch = characters.value[name];
      if (!job || !ch) break;

      // Heal to full before every fight. Each fight resolves an entire battle in
      // one action, so entering below full HP risks a loss — which teleports the
      // character to spawn (0,0) at low HP. One rest restores all missing HP
      // (API: 1s per 5 HP, min 3s), so we simply top up whenever below max.
      if (ch.hp < ch.max_hp) {
        setJob(name, { status: "resting", note: "healing" });
        try {
          await actions.rest(name);
        } catch (e) {
          pushLog({ ts: Date.now(), character: name, action: "rest", text: `loop stopped: ${(e as Error).message}`, kind: "bad" });
          break;
        }
        continue;
      }

      setJob(name, { status: "fighting", note: "" });
      try {
        const r = await actions.fight(name);
        const cur = fightJobs.value[name];
        if (cur) setJob(name, { fights: cur.fights + 1, wins: cur.wins + (r.fight?.result === "win" ? 1 : 0) });
        if (r.fight?.result === "loss") {
          // On a loss the character is teleported away — stop rather than flail.
          pushLog({ ts: Date.now(), character: name, action: "fight", text: "loop stopped: lost a fight", kind: "bad" });
          break;
        }
      } catch (e) {
        // Inventory full → run to the bank, deposit, come back, keep fighting.
        if (isInventoryFull(e)) {
          try {
            await bankRun(name, job);
            continue;
          } catch (be) {
            pushLog({ ts: Date.now(), character: name, action: "fight", text: `loop stopped: ${(be as Error).message}`, kind: "bad" });
            break;
          }
        }
        pushLog({ ts: Date.now(), character: name, action: "fight", text: `loop stopped: ${(e as Error).message}`, kind: "bad" });
        break;
      }
    }
  } finally {
    stopFlags.delete(name);
    clearJob(name);
  }
}

/** Start auto-fighting the monster on the character's current tile. */
export function startFight(name: string): void {
  if (fightJobs.value[name]) return; // already running
  const ch = characters.value[name];
  if (!ch) return;
  if (gatherJobs.value[name] || refineJobs.value[name]) {
    pushLog({ ts: Date.now(), character: name, action: "fight", text: "stop gathering / refining first", kind: "bad" });
    return;
  }
  const content = tileAt(ch.x, ch.y, layerOf(ch))?.interactions.content;
  if (content?.type !== "monster") {
    pushLog({ ts: Date.now(), character: name, action: "fight", text: "not standing on a monster", kind: "bad" });
    return;
  }

  stopFlags.delete(name);
  fightJobs.value = {
    ...fightJobs.value,
    [name]: { x: ch.x, y: ch.y, monster: content.code, status: "fighting", fights: 0, wins: 0, note: "" },
  };
  pushLog({ ts: Date.now(), character: name, action: "fight", text: `auto-fighting ${content.code} at (${ch.x}, ${ch.y})`, kind: "info" });
  void runLoop(name);
}

/** Ask the loop to stop after the current action completes. */
export function stopFight(name: string): void {
  if (!fightJobs.value[name]) return;
  stopFlags.add(name);
  setJob(name, { note: "stopping…" });
}

/**
 * Re-launch loops for jobs restored from localStorage. Call once after the boot
 * sync so loops act on fresh character state. Drops jobs whose character is gone
 * or that somehow overlap a gather / refine order.
 */
export function resumeFight(): void {
  const kept: Record<string, FightJob> = {};
  let dropped = false;
  for (const [name, job] of Object.entries(fightJobs.value)) {
    if (characters.value[name] && !gatherJobs.value[name] && !refineJobs.value[name]) {
      kept[name] = job;
      stopFlags.delete(name);
    } else {
      dropped = true;
    }
  }
  if (dropped) fightJobs.value = kept;
  for (const name of Object.keys(kept)) {
    pushLog({ ts: Date.now(), character: name, action: "fight", text: "resumed after reload", kind: "info" });
    void runLoop(name);
  }
}
