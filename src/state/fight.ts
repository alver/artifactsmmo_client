// Automation cycle #3 — an infinite fight loop per character.
//
// Give a character a fight order on the monster tile it's standing on; it fights
// on repeat, resting to heal whenever its HP drops below a threshold (then back
// to full before resuming), until stopped or it loses a fight. Paced entirely by
// the cooldown each action returns — no polling, same no-poll contract as the
// rest of the client. Mutually exclusive with the gather / refine loops.

import { effect, signal } from "@preact/signals";
import * as actions from "../api/actions";
import { monster as monsterOf, tileAt } from "../catalog";
import { currentFighter } from "../sim/stats";
import { simulate } from "../sim/combat";
import { characters, pushLog } from "./store";
import { gatherJobs } from "./gather";
import { refineJobs } from "./refine";
import { campaignJobs } from "./campaign";
import { queueActive } from "./queue";
import { desiredForJob, gearSwapStep } from "./exec";
import { depositAll, isInventoryFull, layerOf, moveTo, nearestBank, waitCooldown } from "./loopkit";

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

// Stop the loop after this many losses in a row. One loss is often crit/variance
// on a marginal fight, so we walk back from spawn, heal to full, and retry once;
// a second consecutive loss means it's genuinely unwinnable — stop, don't flail.
const MAX_CONSECUTIVE_LOSSES = 2;

// Mirror jobs to localStorage on every change so a reload can resume them.
effect(() => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(fightJobs.value));
  } catch {
    /* quota / unavailable — non-fatal */
  }
});

function setJob(name: string, patch: Partial<FightJob>): void {
  const cur = fightJobs.value[name];
  if (!cur) return;
  fightJobs.value = { ...fightJobs.value, [name]: { ...cur, ...patch } };
}
function clearJob(name: string): void {
  const { [name]: _gone, ...rest } = fightJobs.value;
  fightJobs.value = rest;
}

// Move → deposit everything → move back to the monster tile. Runs to completion
// so the character is left ready to resume fighting. Throws if a step fails.
async function bankRun(name: string, job: FightJob): Promise<void> {
  const bank = nearestBank(job.x, job.y);
  if (!bank) throw new Error("inventory full and no bank found on the map");

  setJob(name, { status: "banking", note: "→ bank" });
  await moveTo(name, bank.x, bank.y);

  setJob(name, { note: "depositing" });
  await depositAll(name); // items + pocket gold

  setJob(name, { status: "banking", note: "→ monster" });
  await moveTo(name, job.x, job.y);
}

async function runLoop(name: string): Promise<void> {
  try {
    let consecutiveLosses = 0;
    while (!stopFlags.has(name)) {
      await waitCooldown(name, () => stopFlags.has(name)); // respect any pending cooldown before acting
      if (stopFlags.has(name)) break;

      const job = fightJobs.value[name];
      const ch = characters.value[name];
      if (!job || !ch) break;

      // Wear the best combat set the bank offers vs this monster. Runs before
      // the position recovery so the swap's bank trip doesn't ping-pong against
      // the walk back; BIS re-runs only when the bank contents change.
      const desired = desiredForJob(name, ch, { kind: "fight", monster: job.monster });
      if (desired) {
        try {
          if ((await gearSwapStep(name, ch, desired, { note: (t) => setJob(name, { note: t }) })) === "acted") continue;
        } catch (e) {
          pushLog({ ts: Date.now(), character: name, action: "fight", text: `loop stopped: ${(e as Error).message}`, kind: "bad" });
          break;
        }
      }

      // Recover from a teleport: a lost fight (and some in-game events) resurrect
      // the character at spawn (0,0). Walk back to the monster tile before acting
      // so the run self-heals instead of stranding there.
      if (ch.x !== job.x || ch.y !== job.y) {
        setJob(name, { status: "banking", note: "→ monster" });
        try {
          await moveTo(name, job.x, job.y);
        } catch (e) {
          pushLog({ ts: Date.now(), character: name, action: "fight", text: `loop stopped: ${(e as Error).message}`, kind: "bad" });
          break;
        }
        continue;
      }

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
        const won = r.fight?.result === "win";
        const cur = fightJobs.value[name];
        if (cur) setJob(name, { fights: cur.fights + 1, wins: cur.wins + (won ? 1 : 0) });
        if (won) {
          consecutiveLosses = 0;
        } else {
          consecutiveLosses += 1;
          if (consecutiveLosses >= MAX_CONSECUTIVE_LOSSES) {
            pushLog({ ts: Date.now(), character: name, action: "fight", text: `loop stopped: lost ${consecutiveLosses} fights in a row`, kind: "bad" });
            break;
          }
          // Recoverable loss — the next iteration walks back from spawn, heals to
          // full, and retries once before giving up.
          pushLog({ ts: Date.now(), character: name, action: "fight", text: "lost a fight — healing and retrying", kind: "bad" });
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
  if (gatherJobs.value[name] || refineJobs.value[name] || campaignJobs.value[name] || queueActive(name)) {
    pushLog({ ts: Date.now(), character: name, action: "fight", text: "stop the other loop first", kind: "bad" });
    return;
  }
  const content = tileAt(ch.x, ch.y, layerOf(ch))?.interactions.content;
  if (content?.type !== "monster") {
    pushLog({ ts: Date.now(), character: name, action: "fight", text: "not standing on a monster", kind: "bad" });
    return;
  }

  // Advisory forecast — warn on a predicted loss but don't block (the simulator
  // is not yet validated enough to veto). The loop still stops on a real loss.
  const m = monsterOf(content.code);
  if (m) {
    const f = simulate(currentFighter(ch), m);
    if (!f.win) {
      pushLog({
        ts: Date.now(), character: name, action: "fight",
        text: `⚠ forecast: likely ${f.timedOut ? "can't kill in time" : "loss"} vs ${m.name} — starting anyway`,
        kind: "bad",
      });
    }
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
    if (characters.value[name] && !gatherJobs.value[name] && !refineJobs.value[name] && !campaignJobs.value[name] && !queueActive(name)) {
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
