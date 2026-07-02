// Automation cycle #2 — refine raw materials from the bank into refined goods.
//
// Give a character a recipe (Copper Bar, Ash Plank, Cooked Gudgeon, …); it then
// shuttles between the bank and the matching workshop: withdraw a batch of raw
// materials, walk to the workshop, craft, walk back, deposit the products — on
// repeat until the bank runs out of materials or the player stops it.
//
// Same no-poll contract as the gather loop (state/gather.ts): paced entirely by
// the cooldown each action returns, one request per action.

import { effect, signal } from "@preact/signals";
import * as actions from "../api/actions";
import { catalog, item } from "../catalog";
import { bankItems, characters, pushLog } from "./store";
import { gatherJobs } from "./gather";
import { campaignJobs } from "./campaign";
import { depositAll, moveTo, nearest, step, waitCooldownFull } from "./loopkit";
import type { Character } from "../types/api";
import type { ItemStack } from "../types/catalog";

/** Skills whose recipes turn raw gathered materials into refined goods. */
const REFINE_SKILLS = ["mining", "woodcutting", "cooking", "alchemy"] as const;

export type RefineStatus = "withdrawing" | "crafting" | "banking";

export interface RefineJob {
  product: string; // refined item code being crafted
  skill: string;
  wx: number; // workshop tile
  wy: number;
  bankX: number;
  bankY: number;
  status: RefineStatus;
  note: string; // short human status shown on the card
  crafted: number; // products produced so far (for display)
}

const STORE_KEY = "ammo:v1:refine";
function loadStored(): Record<string, RefineJob> {
  try {
    return (JSON.parse(localStorage.getItem(STORE_KEY) || "{}") as Record<string, RefineJob>) || {};
  } catch {
    return {};
  }
}

/**
 * Active refine jobs, keyed by character name. Presence ⇒ the loop is running.
 * Hydrated from localStorage at load so orders survive a page reload; the loops
 * are re-launched by resumeRefine() after the boot sync.
 */
export const refineJobs = signal<Record<string, RefineJob>>(loadStored());
const stopFlags = new Set<string>();

// Mirror jobs to localStorage on every change so a reload can resume them.
effect(() => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(refineJobs.value));
  } catch {
    /* quota / unavailable — non-fatal */
  }
});

const skillLevel = (ch: Character, skill: string): number =>
  (ch as unknown as Record<string, number>)[`${skill}_level`] ?? 0;

function setJob(name: string, patch: Partial<RefineJob>): void {
  const cur = refineJobs.value[name];
  if (!cur) return;
  refineJobs.value = { ...refineJobs.value, [name]: { ...cur, ...patch } };
}
function clearJob(name: string): void {
  const { [name]: _gone, ...rest } = refineJobs.value;
  refineJobs.value = rest;
}

/** Total quantity of an item currently sitting in the bank. */
export function bankQty(code: string): number {
  return bankItems.value.reduce((s, b) => s + (b.code === code ? b.quantity : 0), 0);
}

export interface RefineOption {
  code: string;
  name: string;
  skill: string;
  level: number;
  /** How many can be made from current bank stock (ignores skill level). */
  maxCraft: number;
  /** Whether the character meets the recipe's skill level. */
  levelOk: boolean;
}

/**
 * Refining recipes the bank currently holds materials for, annotated with how
 * many are makeable and whether this character has the required skill level.
 * Drives the panel dropdown — recomputed from bank stock on every render.
 */
export function refineOptions(ch: Character): RefineOption[] {
  const out: RefineOption[] = [];
  for (const it of catalog().items.values()) {
    const craft = it.craft;
    if (!craft || !REFINE_SKILLS.includes(craft.skill as (typeof REFINE_SKILLS)[number])) continue;
    let max = Infinity;
    for (const ing of craft.items) max = Math.min(max, Math.floor(bankQty(ing.code) / ing.quantity));
    if (!Number.isFinite(max) || max < 1) continue;
    out.push({
      code: it.code,
      name: it.name,
      skill: craft.skill,
      level: craft.level,
      maxCraft: max,
      levelOk: skillLevel(ch, craft.skill) >= craft.level,
    });
  }
  out.sort((a, b) => a.skill.localeCompare(b.skill) || a.level - b.level || a.name.localeCompare(b.name));
  return out;
}

async function runLoop(name: string): Promise<void> {
  try {
    const init = refineJobs.value[name];
    const recipe = init && item(init.product)?.craft;
    if (!init || !recipe) return;
    const perCraft = recipe.items.reduce((s, m) => s + m.quantity, 0); // raw items consumed per craft

    await waitCooldownFull(name); // respect any cooldown still pending from a prior action

    // Start from a clean slate: bank whatever the character is already carrying.
    setJob(name, { status: "banking", note: "→ bank" });
    await moveTo(name, init.bankX, init.bankY);
    setJob(name, { note: "depositing" });
    await depositAll(name);

    while (!stopFlags.has(name)) {
      const ch = characters.value[name];
      const job = refineJobs.value[name];
      if (!ch || !job) break;

      // How many can we make this round — limited by bank stock and inventory size.
      let bankCraftable = Infinity;
      for (const m of recipe.items) bankCraftable = Math.min(bankCraftable, Math.floor(bankQty(m.code) / m.quantity));
      const batch = Math.min(bankCraftable, Math.floor(ch.inventory_max_items / perCraft));

      if (bankCraftable <= 0) {
        pushLog({ ts: Date.now(), character: name, action: "refine", text: `done — bank out of materials for ${job.product}`, kind: "info" });
        break;
      }
      if (batch <= 0) {
        pushLog({ ts: Date.now(), character: name, action: "refine", text: `inventory too small to craft ${job.product}`, kind: "bad" });
        break;
      }

      // Withdraw a batch of raw materials (we're standing on the bank).
      setJob(name, { status: "withdrawing", note: `withdraw ×${batch}` });
      const mats: ItemStack[] = recipe.items.map((m) => ({ code: m.code, quantity: m.quantity * batch }));
      await step(name, () => actions.withdrawItems(name, mats));

      // Craft the whole batch in one call, then bank the products.
      setJob(name, { status: "crafting", note: `crafting ×${batch}` });
      await moveTo(name, job.wx, job.wy);
      await step(name, () => actions.craft(name, job.product, batch));
      setJob(name, { crafted: job.crafted + batch * recipe.quantity });

      setJob(name, { status: "banking", note: "→ bank" });
      await moveTo(name, job.bankX, job.bankY);
      setJob(name, { note: "depositing" });
      await depositAll(name);
    }
  } catch (e) {
    pushLog({ ts: Date.now(), character: name, action: "refine", text: `loop stopped: ${(e as Error).message}`, kind: "bad" });
  } finally {
    stopFlags.delete(name);
    clearJob(name);
  }
}

/** Start refining `product` for a character, sourcing materials from the bank. */
export function startRefine(name: string, product: string): void {
  if (refineJobs.value[name]) return; // already running
  if (gatherJobs.value[name] || campaignJobs.value[name]) {
    pushLog({ ts: Date.now(), character: name, action: "refine", text: `stop ${gatherJobs.value[name] ? "gathering" : "the campaign"} first`, kind: "bad" });
    return;
  }
  const ch = characters.value[name];
  if (!ch) return;
  const it = item(product);
  const recipe = it?.craft;
  if (!recipe) {
    pushLog({ ts: Date.now(), character: name, action: "refine", text: "unknown recipe", kind: "bad" });
    return;
  }

  const ws = nearest("workshop", recipe.skill, ch.x, ch.y);
  const bank = nearest("bank", null, ch.x, ch.y);
  if (!ws) {
    pushLog({ ts: Date.now(), character: name, action: "refine", text: `no ${recipe.skill} workshop on the map`, kind: "bad" });
    return;
  }
  if (!bank) {
    pushLog({ ts: Date.now(), character: name, action: "refine", text: "no bank found on the map", kind: "bad" });
    return;
  }

  stopFlags.delete(name);
  refineJobs.value = {
    ...refineJobs.value,
    [name]: { product, skill: recipe.skill, wx: ws.x, wy: ws.y, bankX: bank.x, bankY: bank.y, status: "banking", note: "starting…", crafted: 0 },
  };
  pushLog({ ts: Date.now(), character: name, action: "refine", text: `refining ${it!.name}`, kind: "info" });
  void runLoop(name);
}

/** Ask the loop to stop after the current round completes (inventory emptied). */
export function stopRefine(name: string): void {
  if (!refineJobs.value[name]) return;
  stopFlags.add(name);
  setJob(name, { note: "stopping…" });
}

/**
 * Re-launch loops for jobs restored from localStorage. Call once after the boot
 * sync. Drops jobs whose character is gone or is also (somehow) gathering — the
 * refine loop self-heals from any interruption point (it restarts each round
 * with a deposit-all + recompute).
 */
export function resumeRefine(): void {
  const kept: Record<string, RefineJob> = {};
  let dropped = false;
  for (const [name, job] of Object.entries(refineJobs.value)) {
    if (characters.value[name] && !gatherJobs.value[name] && !campaignJobs.value[name]) {
      kept[name] = job;
      stopFlags.delete(name);
    } else {
      dropped = true;
    }
  }
  if (dropped) refineJobs.value = kept;
  for (const name of Object.keys(kept)) {
    pushLog({ ts: Date.now(), character: name, action: "refine", text: "resumed after reload", kind: "info" });
    void runLoop(name);
  }
}
