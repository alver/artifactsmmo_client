// Automation cycle #4 — the campaign runner: drive a character toward a goal
// (gather → craft → equip → fight) end-to-end, reload-safe.
//
// Unlike the infinite gather/refine/fight loops, a campaign is FINITE: it runs a
// frozen goal (a fixed gear target + optional monster grind) to completion. It is
// self-healing by *re-deriving* the acquisition steps from live inventory/bank
// each tick (so a reload/crash resumes from wherever it left off), while the gear
// choice stays frozen so it never thrashes. Fights are gated by a fresh forecast
// each time — it refuses to enter a fight that is no longer a safe win.
//
// Mutually exclusive with the other three loops. Same no-poll contract.

import { effect, signal } from "@preact/signals";
import * as actions from "../api/actions";
import { itemName, monster as monsterOf } from "../catalog";
import { currentFighter } from "../sim/stats";
import { simulate } from "../sim/combat";
import { resolve } from "../plan/acquire";
import { bankItems, characters, pushLog } from "./store";
import { gatherJobs } from "./gather";
import { refineJobs } from "./refine";
import { fightJobs } from "./fight";
import { depositAll, isInventoryFull, moveTo, nearest, nearestBank, step } from "./loopkit";
import type { AcquisitionStep, Plan, Target } from "../plan/types";
import type { Character } from "../types/api";

export type CampaignPhase = "acquiring" | "fighting";

export interface CampaignJob {
  label: string; // human summary of the goal
  targets: Target[]; // frozen gear/item targets to obtain + equip
  monster?: string; // combat target, if the goal ends in fighting
  repeat: number; // fights to perform
  done: number; // fights performed
  phase: CampaignPhase;
  note: string; // short human status shown on the card
}

const STORE_KEY = "ammo:v1:campaign";
function loadStored(): Record<string, CampaignJob> {
  try {
    return (JSON.parse(localStorage.getItem(STORE_KEY) || "{}") as Record<string, CampaignJob>) || {};
  } catch {
    return {};
  }
}

/** Active campaigns, keyed by character name. Presence ⇒ the loop is running. */
export const campaignJobs = signal<Record<string, CampaignJob>>(loadStored());
const stopFlags = new Set<string>();

effect(() => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(campaignJobs.value));
  } catch {
    /* quota / unavailable — non-fatal */
  }
});

function setJob(name: string, patch: Partial<CampaignJob>): void {
  const cur = campaignJobs.value[name];
  if (!cur) return;
  campaignJobs.value = { ...campaignJobs.value, [name]: { ...cur, ...patch } };
}
function clearJob(name: string): void {
  const { [name]: _gone, ...rest } = campaignJobs.value;
  campaignJobs.value = rest;
}
function finish(name: string, text: string, kind: "ok" | "bad" | "info" = "info"): void {
  pushLog({ ts: Date.now(), character: name, action: "campaign", text, kind });
  clearJob(name);
}

const invCount = (ch: Character): number => (ch.inventory || []).reduce((s, it) => s + (it.quantity || 0), 0);

/** Move to the nearest bank and deposit everything (used when the inventory fills). */
async function bankOff(name: string, fromX: number, fromY: number): Promise<void> {
  const bank = nearestBank(fromX, fromY);
  if (!bank) throw new Error("inventory full and no bank found on the map");
  setJob(name, { note: "→ bank (full)" });
  await moveTo(name, bank.x, bank.y);
  await depositAll(name);
}

/** Execute one acquisition step. Throws on failure (caller decides what to do). */
async function runStep(name: string, ch: Character, s: AcquisitionStep): Promise<void> {
  const needTile = (): { x: number; y: number } => {
    if (s.kind === "equip") return { x: ch.x, y: ch.y };
    if ((s as { x?: number }).x == null) throw new Error(`no map tile for ${s.kind} ${(s as { code?: string }).code ?? ""}`);
    return { x: (s as { x: number }).x, y: (s as { y: number }).y };
  };

  switch (s.kind) {
    case "withdraw": {
      const t = needTile();
      setJob(name, { note: `withdraw ${itemName(s.code)}` });
      await moveTo(name, t.x, t.y);
      await step(name, () => actions.withdrawItems(name, [{ code: s.code, quantity: s.quantity }]));
      return;
    }
    case "buy": {
      const t = needTile();
      setJob(name, { note: `buy ${itemName(s.code)}` });
      await moveTo(name, t.x, t.y);
      await step(name, () => actions.npcBuy(name, s.code, s.quantity));
      return;
    }
    case "gather": {
      const t = needTile();
      setJob(name, { note: `gather ${itemName(s.code)}` });
      await moveTo(name, t.x, t.y);
      if (invCount(characters.value[name] ?? ch) >= ch.inventory_max_items) { await bankOff(name, t.x, t.y); return; }
      await step(name, () => actions.gather(name));
      return;
    }
    case "farm": {
      const t = needTile();
      setJob(name, { note: `farm ${itemName(s.code)}` });
      await moveTo(name, t.x, t.y);
      const cur = characters.value[name] ?? ch;
      const m = monsterOf(s.monster);
      if (m && !simulate(currentFighter(cur), m).win) throw new Error(`can't farm ${m.name} — not a safe win`);
      if (cur.hp < cur.max_hp) { await step(name, () => actions.rest(name)); return; }
      if (invCount(cur) >= cur.inventory_max_items) { await bankOff(name, t.x, t.y); return; }
      await step(name, () => actions.fight(name));
      return;
    }
    case "craft": {
      const t = needTile();
      setJob(name, { note: `craft ${itemName(s.code)}` });
      await moveTo(name, t.x, t.y);
      await step(name, () => actions.craft(name, s.code, s.quantity));
      return;
    }
    case "equip": {
      setJob(name, { note: `equip ${itemName(s.code)}` });
      await step(name, () => actions.equip(name, s.code, s.slot, s.quantity));
      return;
    }
  }
}

async function runLoop(name: string): Promise<void> {
  try {
    let consecutiveLosses = 0;
    while (!stopFlags.has(name)) {
      const job = campaignJobs.value[name];
      const ch = characters.value[name];
      if (!job || !ch) break;

      // Combat phase: grind the target monster with the (now-equipped) gear.
      if (job.phase === "fighting") {
        if (!job.monster || job.done >= job.repeat) { finish(name, `campaign complete — ${job.done} win${job.done === 1 ? "" : "s"}`, "ok"); break; }
        const m = monsterOf(job.monster);
        const tile = m ? nearest("monster", job.monster, ch.x, ch.y) : undefined;
        if (!m || !tile) { finish(name, `campaign stopped — no ${job.monster} on the map`, "bad"); break; }

        if (ch.x !== tile.x || ch.y !== tile.y) { setJob(name, { note: "→ monster" }); await moveTo(name, tile.x, tile.y); continue; }
        if (ch.hp < ch.max_hp) {
          setJob(name, { note: "healing" });
          try { await step(name, () => actions.rest(name)); } catch (e) { finish(name, `campaign stopped — rest failed: ${(e as Error).message}`, "bad"); break; }
          continue;
        }
        // Re-forecast with actual current gear; refuse a fight that isn't a safe win.
        if (!simulate(currentFighter(ch), m).win) { finish(name, `campaign stopped — no longer a safe win vs ${m.name}`, "bad"); break; }
        if (invCount(ch) >= ch.inventory_max_items) { try { await bankOff(name, tile.x, tile.y); } catch (e) { finish(name, `campaign stopped — ${(e as Error).message}`, "bad"); break; } continue; }

        setJob(name, { note: `fighting ${job.done + 1}/${job.repeat}` });
        try {
          const r = await actions.fight(name);
          if (r.fight?.result === "win") {
            consecutiveLosses = 0;
            setJob(name, { done: (campaignJobs.value[name]?.done ?? job.done) + 1 }); // count wins toward the target
          } else {
            consecutiveLosses += 1;
            if (consecutiveLosses >= 2) { finish(name, "campaign stopped — lost 2 fights in a row", "bad"); break; }
            // A single loss is usually variance — the next tick walks back from
            // spawn, heals, re-forecasts, and retries once.
            pushLog({ ts: Date.now(), character: name, action: "campaign", text: "lost a fight — healing and retrying", kind: "bad" });
          }
          await step(name, () => Promise.resolve()); // wait out the fight cooldown
        } catch (e) {
          if (isInventoryFull(e)) { try { await bankOff(name, tile.x, tile.y); } catch { /* handled next */ } continue; }
          finish(name, `campaign stopped — fight failed: ${(e as Error).message}`, "bad"); break;
        }
        continue;
      }

      // Acquisition phase: re-derive steps from live state and do the next one.
      const acq = resolve(ch, bankItems.value, job.targets);
      if (acq.blockers.length) { finish(name, `campaign stopped — blocked: ${acq.blockers[0]}`, "bad"); break; }
      if (acq.steps.length === 0) {
        if (job.monster) { setJob(name, { phase: "fighting", note: "gear ready → fighting" }); continue; }
        finish(name, "campaign complete — items acquired & equipped", "ok"); break;
      }
      try {
        await runStep(name, ch, acq.steps[0]);
      } catch (e) {
        if (isInventoryFull(e)) { try { await bankOff(name, ch.x, ch.y); } catch { /* next tick */ } continue; }
        finish(name, `campaign stopped — ${(e as Error).message}`, "bad"); break;
      }
    }
  } finally {
    stopFlags.delete(name);
  }
}

/** Start a campaign for `name` from a compiled plan. */
export function startCampaign(name: string, plan: Plan): void {
  if (campaignJobs.value[name]) return;
  if (gatherJobs.value[name] || refineJobs.value[name] || fightJobs.value[name]) {
    pushLog({ ts: Date.now(), character: name, action: "campaign", text: "stop the other loop first", kind: "bad" });
    return;
  }
  const ch = characters.value[name];
  if (!ch) return;
  if (plan.acquisition.blockers.length) {
    pushLog({ ts: Date.now(), character: name, action: "campaign", text: `can't start — ${plan.acquisition.blockers[0]}`, kind: "bad" });
    return;
  }
  if (plan.execution.targets.length === 0 && !plan.execution.monster) {
    pushLog({ ts: Date.now(), character: name, action: "campaign", text: "nothing to do for this goal", kind: "bad" });
    return;
  }

  stopFlags.delete(name);
  campaignJobs.value = {
    ...campaignJobs.value,
    [name]: { label: plan.summary, targets: plan.execution.targets, monster: plan.execution.monster, repeat: plan.execution.repeat, done: 0, phase: "acquiring", note: "starting…" },
  };
  pushLog({ ts: Date.now(), character: name, action: "campaign", text: `campaign started: ${plan.summary}`, kind: "info" });
  void runLoop(name);
}

/** Ask the campaign to stop after the current action completes. */
export function stopCampaign(name: string): void {
  if (!campaignJobs.value[name]) return;
  stopFlags.add(name);
  setJob(name, { note: "stopping…" });
}

/** Re-launch campaigns restored from localStorage after the boot sync. */
export function resumeCampaign(): void {
  const kept: Record<string, CampaignJob> = {};
  let dropped = false;
  for (const [name, job] of Object.entries(campaignJobs.value)) {
    if (characters.value[name] && !gatherJobs.value[name] && !refineJobs.value[name] && !fightJobs.value[name]) {
      kept[name] = job;
      stopFlags.delete(name);
    } else {
      dropped = true;
    }
  }
  if (dropped) campaignJobs.value = kept;
  for (const name of Object.keys(kept)) {
    pushLog({ ts: Date.now(), character: name, action: "campaign", text: "resumed after reload", kind: "info" });
    void runLoop(name);
  }
}
