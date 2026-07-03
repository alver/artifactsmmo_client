// Automation cycle #1 — an infinite gather loop per character.
//
// Give a character a gather order at the tile it's standing on; it then gathers
// on repeat, pausing only to bank when its inventory fills (move → deposit all →
// move back), until stopped. Paced entirely by the cooldown each action returns,
// so it adds no polling — one request per action, same no-poll contract as the
// rest of the client.

import { effect, signal } from "@preact/signals";
import * as actions from "../api/actions";
import { resource as resourceOf, tileAt } from "../catalog";
import { characters, pushLog } from "./store";
import { campaignJobs } from "./campaign";
import { queueActive } from "./queue";
import { desiredForJob, gearSwapStep } from "./exec";
import { depositAll, isInventoryFull, layerOf, moveTo, nearestBank, waitCooldown } from "./loopkit";
import type { Character } from "../types/api";

export type GatherStatus = "gathering" | "banking";

export interface GatherJob {
  /** The tile being worked, remembered so we can return after a bank trip. */
  x: number;
  y: number;
  resource: string; // resource code at the gather tile
  skill?: string; // the resource's gathering skill — drives the bank gear swap
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

function setJob(name: string, patch: Partial<GatherJob>): void {
  const cur = gatherJobs.value[name];
  if (!cur) return;
  gatherJobs.value = { ...gatherJobs.value, [name]: { ...cur, ...patch } };
}
function clearJob(name: string): void {
  const { [name]: _gone, ...rest } = gatherJobs.value;
  gatherJobs.value = rest;
}

function inventoryCount(ch: Character): number {
  return (ch.inventory || []).reduce((s, it) => s + (it.quantity || 0), 0);
}

// Always runs to completion (move → deposit all → move back) so the character
// is left standing on its resource, ready to resume or to be cleanly stopped.
async function bankRun(name: string, job: GatherJob): Promise<void> {
  setJob(name, { status: "banking", note: "→ bank" });
  await moveTo(name, job.bankX, job.bankY);

  setJob(name, { note: "depositing" });
  await depositAll(name); // items + pocket gold

  setJob(name, { status: "gathering", note: "→ resource" });
  await moveTo(name, job.x, job.y);
}

async function runLoop(name: string): Promise<void> {
  try {
    while (!stopFlags.has(name)) {
      await waitCooldown(name, () => stopFlags.has(name)); // respect any pending cooldown before acting
      if (stopFlags.has(name)) break;

      const job = gatherJobs.value[name];
      const ch = characters.value[name];
      if (!job || !ch) break;

      // Wear the best gathering set the bank offers (tool + drop/XP gear) —
      // converged checks are free, and any better gear banked mid-run is
      // picked up on the next iteration after the bank echo.
      if (job.skill) {
        const desired = desiredForJob(name, ch, { kind: "gather", skill: job.skill });
        if (desired) {
          try {
            if ((await gearSwapStep(name, ch, desired, { note: (t) => setJob(name, { note: t }) })) === "acted") continue;
          } catch (e) {
            pushLog({ ts: Date.now(), character: name, action: "gather", text: `loop stopped: ${(e as Error).message}`, kind: "bad" });
            break;
          }
        }
      }

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
  if (campaignJobs.value[name] || queueActive(name)) {
    pushLog({ ts: Date.now(), character: name, action: "gather", text: `stop the ${campaignJobs.value[name] ? "campaign" : "queue"} first`, kind: "bad" });
    return;
  }
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
    [name]: {
      x: ch.x, y: ch.y, resource: content.code, skill: resourceOf(content.code)?.skill,
      bankX: bank.x, bankY: bank.y, status: "gathering", note: "",
    },
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
    if (characters.value[name] && !campaignJobs.value[name] && !queueActive(name)) {
      kept[name] = job;
      stopFlags.delete(name);
    } else {
      dropped = true; // stale order (character gone, or a campaign owns it)
    }
  }
  if (dropped) gatherJobs.value = kept;
  for (const name of Object.keys(kept)) {
    pushLog({ ts: Date.now(), character: name, action: "gather", text: "resumed after reload", kind: "info" });
    void runLoop(name);
  }
}
