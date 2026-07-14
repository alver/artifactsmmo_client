// achievement goals — compile an achievement's remaining objectives into one
// coordinated push. Progress is ACCOUNT-level and server-side: the compile
// reads the snapshot in ctx.achievements, the runtime refetches at each wave
// boundary, and any shortfall becomes a top-up wave. Objective types map onto
// the queue vocabulary almost 1:1; the two that don't (use, combat_level) are
// surfaced as manual/passive blockers instead of pretending.

import { catalog, item, itemName, monster as monsterOf } from "../../catalog";
import { queueItemText, type QueueItem, type QueueItemInput } from "../queue";
import { npcForSell } from "../acquire";
import { acquireWaves, planAcquire } from "./acquire";
import { crafterFor, fleetBis, skillLevel } from "./ctx";
import { ratioOf } from "./objectives";
import { SCORE, estMinutes, perHour } from "./score";
import { taskSuitability } from "./tasks";
import type { AccountAchievement, AchievementObjectiveProgress } from "../../types/api";
import type { AccountGoal, Blocker, HiveCtx, HivePlan, HiveWave, ScoredGoal } from "./types";

const DROP_BUFFER = 1.2;
const SPLIT_ACTIONS = 60;
/** Keep the proposal list focused on the closest/richest few. */
const MAX_PROPOSALS = 5;

// ── shared source estimates ──────────────────────────────────────────────────

interface GatherEst { resource: string; skill: string; level: number; actions: number; candidates: string[] }
function gatherEst(ctx: HiveCtx, code: string, qty: number): GatherEst | undefined {
  let best: GatherEst | undefined;
  for (const r of catalog().resources.values()) {
    const d = r.drops?.find((x) => x.code === code);
    if (!d) continue;
    const candidates = ctx.characters.filter((c) => skillLevel(c, r.skill) >= r.level).map((c) => c.name);
    if (candidates.length === 0) continue;
    const actions = Math.ceil(qty * (d.rate > 1 ? d.rate * DROP_BUFFER : 1));
    if (!best || actions < best.actions) best = { resource: r.code, skill: r.skill, level: r.level, actions, candidates };
  }
  return best;
}

interface DropEst { monster: string; fights: number }
function dropEst(code: string, qty: number): DropEst | undefined {
  let best: { monster: string; rate: number; avgQty: number } | undefined;
  for (const m of catalog().monsters.values()) {
    const d = m.drops?.find((x) => x.code === code);
    if (d && (!best || d.rate < best.rate)) best = { monster: m.code, rate: d.rate, avgQty: (d.min_quantity + d.max_quantity) / 2 || 1 };
  }
  return best ? { monster: best.monster, fights: Math.ceil((qty * best.rate * DROP_BUFFER) / best.avgQty) } : undefined;
}

/** Fight candidates: safe winners first, else EV winners. */
function fighters(ctx: HiveCtx, monsterCode: string): string[] {
  const safe = ctx.characters.filter((c) => fleetBis(ctx, c, monsterCode)?.safe).map((c) => c.name);
  if (safe.length) return safe;
  return ctx.characters.filter((c) => fleetBis(ctx, c, monsterCode)?.forecast.win).map((c) => c.name);
}

/** Cheapest NPC selling `code` for gold (npc_buy objectives are gold-only). */
function goldOffer(code: string): { npc: string; price: number } | undefined {
  let offer: { npc: string; price: number } | undefined;
  for (const n of catalog().npcs.values()) {
    const x = n.items?.find((i) => i.code === code && i.currency === "gold" && i.buy_price != null);
    if (x && (!offer || x.buy_price! < offer.price)) offer = { npc: n.code, price: x.buy_price! };
  }
  return offer;
}

const bankQtyOf = (ctx: HiveCtx, code: string): number => ctx.bank.find((b) => b.code === code)?.quantity ?? 0;

/** Chunk-and-LPT: split `total` across candidates, least-loaded first. */
function splitAcross(
  candidates: string[],
  total: number,
  load: Map<string, number>,
): { name: string; share: number }[] {
  const pool = candidates.filter((n) => load.has(n));
  if (pool.length === 0 || total <= 0) return [];
  const chunks = Math.max(1, Math.min(pool.length, Math.ceil(total / SPLIT_ACTIONS)));
  const share = Math.ceil(total / chunks);
  const out = new Map<string, number>();
  let left = total;
  for (let i = 0; i < chunks && left > 0; i++) {
    const name = pool.sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0))[0];
    const take = Math.min(share, left);
    out.set(name, (out.get(name) ?? 0) + take);
    load.set(name, (load.get(name) ?? 0) + take);
    left -= take;
  }
  return [...out].map(([name, s]) => ({ name, share: s }));
}

// ── scoring ──────────────────────────────────────────────────────────────────

const rewardValue = (a: AccountAchievement): number => {
  let v = SCORE.ACH_POINT * a.points + SCORE.GOLD * (a.rewards?.gold ?? 0);
  for (const it of a.rewards?.items ?? []) {
    v += it.code === "tasks_coin" ? SCORE.TASK_COIN * it.quantity : SCORE.GOLD * (npcForSell(it.code)?.price ?? 0) * it.quantity;
  }
  return v;
};

export function proposeAchievementGoals(ctx: HiveCtx): ScoredGoal[] {
  if (!ctx.achievements) return []; // not loaded — the UI offers the fetch
  const maxLevel = Math.max(0, ...ctx.characters.map((c) => c.level));
  const out: ScoredGoal[] = [];

  for (const a of ctx.achievements) {
    if (a.completed_at) continue;
    let actions = 0;
    let compilable = 0;
    const notes: Blocker[] = [];
    for (const o of a.objectives) {
      const remaining = Math.max(0, o.total - Math.min(o.progress, o.total));
      if (remaining === 0) continue;
      switch (o.type) {
        case "combat_kill": {
          // Cheap level gate for scoring; compile runs the real forecast.
          const m = o.target ? monsterOf(o.target) : undefined;
          if (m && m.level <= maxLevel + 2) {
            actions += remaining;
            compilable++;
          } else notes.push({ reason: `${m?.name ?? o.target}: out of the fleet's league for now` });
          break;
        }
        case "gathering": {
          const g = o.target ? gatherEst(ctx, o.target, remaining) : undefined;
          if (g) {
            actions += g.actions;
            compilable++;
          } else notes.push({ reason: `${itemName(o.target ?? "?")}: no reachable gathering node` });
          break;
        }
        case "crafting": {
          const rec = o.target ? item(o.target)?.craft : undefined;
          const crafter = rec ? crafterFor(ctx, rec.skill) : undefined;
          if (rec && crafter && crafter.level >= rec.level) {
            const runs = Math.ceil(remaining / rec.quantity);
            actions += runs + planAcquire(rec.items.map((g) => ({ code: g.code, quantity: g.quantity * runs })), ctx).estActions;
            compilable++;
          } else notes.push({ reason: `${itemName(o.target ?? "?")}: no qualified crafter` });
          break;
        }
        case "combat_drop": {
          const d = o.target ? dropEst(o.target, remaining) : undefined;
          const m = d ? monsterOf(d.monster) : undefined;
          if (d && m && m.level <= maxLevel + 2) {
            actions += d.fights;
            compilable++;
          } else notes.push({ reason: `${itemName(o.target ?? "?")}: no beatable source monster` });
          break;
        }
        case "recycling": {
          actions += remaining * 2;
          compilable++; // compile checks actual bank junk
          break;
        }
        case "npc_buy": {
          // Mirror the compile's feasibility exactly — a rich reward on an
          // unbuyable item must not top the list with an unlaunchable plan.
          const offer = o.target ? goldOffer(o.target) : undefined;
          if (offer && offer.price * remaining <= ctx.bankGold) {
            actions += 3;
            compilable++;
          } else notes.push({ reason: `${itemName(o.target ?? "?")}: no affordable gold offer` });
          break;
        }
        case "npc_sell": {
          if (o.target && bankQtyOf(ctx, o.target) > 0) {
            actions += 3;
            compilable++;
          } else notes.push({ reason: `${itemName(o.target ?? "?")}: nothing in the bank to sell` });
          break;
        }
        case "task": {
          actions += remaining * 40;
          compilable++;
          break;
        }
        case "combat_level":
          notes.push({ reason: `reach combat level ${o.total} — advances with any fighting` });
          break;
        default:
          notes.push({ reason: `${o.type} objectives need a human (no automation)` });
      }
    }
    if (compilable === 0) continue;
    const value = rewardValue(a) * (0.5 + ratioOf(a) / 2);
    out.push({
      goal: { kind: "achievement", code: a.code },
      label: `🏆 ${a.name}`,
      score: perHour(value, Math.max(1, actions)) * (notes.length ? SCORE.BLOCKED_DISCOUNT : 1),
      rationale: `${Math.round(ratioOf(a) * 100)}% done — ${a.points} pt${a.points === 1 ? "" : "s"}${(a.rewards?.gold ?? 0) > 0 ? ` + ${a.rewards!.gold} gold` : ""}`,
      blockers: notes,
      estActions: actions,
      estMinutes: estMinutes(actions),
    });
  }
  return out.sort((x, y) => y.score - x.score).slice(0, MAX_PROPOSALS);
}

// ── compile ──────────────────────────────────────────────────────────────────

export function compileAchievementGoal(
  goal: Extract<AccountGoal, { kind: "achievement" }>,
  ctx: HiveCtx,
): HivePlan {
  const a = ctx.achievements?.find((x) => x.code === goal.code);
  if (!a) {
    return { goal, waves: [], summary: goal.code, blockers: [{ reason: "achievement progress not loaded — refresh achievements" }] };
  }
  const load = new Map<string, number>(ctx.characters.map((c) => [c.name, 0]));
  const wave0 = new Map<string, QueueItemInput[]>();
  const laterFromCrafting: HiveWave[][] = [];
  const blockers: Blocker[] = [];
  const push = (name: string, ...items: QueueItemInput[]): void => {
    const cur = wave0.get(name) ?? [];
    cur.push(...items);
    wave0.set(name, cur);
  };

  for (const o of a.objectives) {
    const remaining = Math.max(0, o.total - Math.min(o.progress, o.total));
    if (remaining === 0) continue;
    compileObjective(o, remaining, ctx, { load, push, laterFromCrafting, blockers });
  }

  // Assemble: direct work + every crafting objective's wave 0, then later
  // material/craft waves merged by index.
  const waves: HiveWave[] = [];
  if (wave0.size > 0) {
    for (const items of wave0.values()) if (items[items.length - 1]?.kind !== "deposit-all") items.push({ kind: "deposit-all" });
    waves.push({
      label: `${a.name}: field work`,
      assignments: [...wave0].map(([character, items]) => ({ character, label: labelIt(items), items })),
    });
  }
  const deepest = Math.max(0, ...laterFromCrafting.map((w) => w.length));
  for (let i = 0; i < deepest; i++) {
    const byChar = new Map<string, QueueItemInput[]>();
    for (const seq of laterFromCrafting) {
      for (const asg of seq[i]?.assignments ?? []) {
        const cur = byChar.get(asg.character) ?? [];
        cur.push(...asg.items);
        byChar.set(asg.character, cur);
      }
    }
    if (byChar.size === 0) continue;
    waves.push({
      label: `${a.name}: crafting`,
      assignments: [...byChar].map(([character, items]) => ({ character, label: labelIt(items), items })),
    });
  }
  return {
    goal,
    waves,
    summary: `${a.name} — ${Math.round(ratioOf(a) * 100)}% → 100%`,
    blockers,
  };
}

interface ObjectiveSink {
  load: Map<string, number>;
  push: (name: string, ...items: QueueItemInput[]) => void;
  laterFromCrafting: HiveWave[][];
  blockers: Blocker[];
}

function compileObjective(o: AchievementObjectiveProgress, remaining: number, ctx: HiveCtx, sink: ObjectiveSink): void {
  const { load, push, laterFromCrafting, blockers } = sink;
  switch (o.type) {
    case "combat_kill": {
      const m = o.target ? monsterOf(o.target) : undefined;
      if (!m) return void blockers.push({ reason: `unknown monster ${o.target ?? "?"}` });
      const who = fighters(ctx, m.code);
      if (who.length === 0) return void blockers.push({ reason: `${m.name}: nobody wins that fight yet` });
      for (const { name, share } of splitAcross(who, remaining, load)) {
        push(name, { kind: "fight", monster: m.code, times: share, done: 0, gear: true });
      }
      return;
    }
    case "gathering": {
      const g = o.target ? gatherEst(ctx, o.target, remaining) : undefined;
      if (!g || !o.target) return void blockers.push({ reason: `${itemName(o.target ?? "?")}: no reachable gathering node` });
      for (const { name, share } of splitAcross(g.candidates, g.actions, load)) {
        push(name, { kind: "gather", code: o.target, resource: g.resource, times: share, done: 0, gear: true });
      }
      return;
    }
    case "combat_drop": {
      const d = o.target ? dropEst(o.target, remaining) : undefined;
      if (!d) return void blockers.push({ reason: `${itemName(o.target ?? "?")}: nothing drops it` });
      const who = fighters(ctx, d.monster);
      if (who.length === 0) return void blockers.push({ reason: `${itemName(d.monster)}: nobody wins that fight yet` });
      for (const { name, share } of splitAcross(who, d.fights, load)) {
        push(name, { kind: "fight", monster: d.monster, times: share, done: 0, gear: true });
      }
      return;
    }
    case "crafting": {
      const rec = o.target ? item(o.target)?.craft : undefined;
      const crafter = rec ? crafterFor(ctx, rec.skill) : undefined;
      if (!rec || !crafter || crafter.level < rec.level || !o.target) {
        return void blockers.push({ reason: `${itemName(o.target ?? "?")}: no qualified crafter` });
      }
      const runs = Math.ceil(remaining / rec.quantity);
      const plan = planAcquire(rec.items.map((g) => ({ code: g.code, quantity: g.quantity * runs })), ctx);
      blockers.push(...plan.blockers);
      const matWaves = acquireWaves(plan, ctx);
      // deposit-all FIRST so a hand already holding the product can't trigger
      // the craft item's already-have skip (progress needs fresh crafts).
      const craftItems: QueueItemInput[] = [
        { kind: "deposit-all" },
        { kind: "craft", code: o.target, quantity: remaining, done: 0 },
        { kind: "deposit-all" },
      ];
      const craftWave: HiveWave = {
        label: "craft",
        assignments: [{ character: crafter.ch.name, label: `craft ${remaining}× ${itemName(o.target)}`, items: craftItems }],
      };
      if (matWaves.length === 0) {
        // materials already banked — the craft can join the field-work wave
        for (const it of craftItems) push(crafter.ch.name, it);
        load.set(crafter.ch.name, (load.get(crafter.ch.name) ?? 0) + runs);
      } else {
        for (const asg of matWaves[0].assignments) {
          push(asg.character, ...asg.items);
          load.set(asg.character, (load.get(asg.character) ?? 0) + 20);
        }
        laterFromCrafting.push([...matWaves.slice(1), craftWave]);
      }
      return;
    }
    case "recycling": {
      // Recycle bank junk: the most-stocked recyclable a crafter can work.
      let pick: { code: string; stock: number; skill: string; who: string } | undefined;
      for (const b of ctx.bank) {
        const it = item(b.code);
        if (!it?.recyclable || !it.craft) continue;
        const crafter = crafterFor(ctx, it.craft.skill);
        if (!crafter || crafter.level < it.craft.level) continue;
        if (!pick || b.quantity > pick.stock) pick = { code: b.code, stock: b.quantity, skill: it.craft.skill, who: crafter.ch.name };
      }
      if (!pick) return void blockers.push({ reason: "recycling: no recyclable stock in the bank" });
      const qty = Math.min(remaining, pick.stock);
      push(pick.who, { kind: "recycle", code: pick.code, quantity: qty, done: 0 });
      load.set(pick.who, (load.get(pick.who) ?? 0) + qty);
      if (qty < remaining) blockers.push({ reason: `recycling: only ${qty}/${remaining} recyclable items stocked` });
      return;
    }
    case "npc_buy": {
      if (!o.target) return void blockers.push({ reason: "npc_buy: no target item" });
      const offer = goldOffer(o.target);
      if (!offer) return void blockers.push({ reason: `${itemName(o.target)}: no NPC sells it for gold` });
      if (offer.price * remaining > ctx.bankGold) {
        return void blockers.push({ reason: `${itemName(o.target)}: costs ${offer.price * remaining} gold — can't afford it` });
      }
      const buyer = [...load.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
      if (buyer) push(buyer, { kind: "buy", code: o.target, quantity: remaining, npc: offer.npc });
      return;
    }
    case "npc_sell": {
      if (!o.target) return void blockers.push({ reason: "npc_sell: no target item" });
      const stock = bankQtyOf(ctx, o.target);
      if (stock === 0) return void blockers.push({ reason: `${itemName(o.target)}: nothing in the bank to sell` });
      const qty = Math.min(remaining, stock);
      const seller = [...load.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
      if (seller) push(seller, { kind: "sell", code: o.target, quantity: qty, done: 0 });
      if (qty < remaining) blockers.push({ reason: `${itemName(o.target)}: only ${qty}/${remaining} stocked to sell` });
      return;
    }
    case "task": {
      const suitable = ctx.characters
        .map((c) => ({ name: c.name, fit: taskSuitability(ctx, c) }))
        .filter((x) => x.fit);
      if (suitable.length === 0) return void blockers.push({ reason: "tasks: nobody suits either tasks master" });
      for (const { name, share } of splitAcross(suitable.map((s) => s.name), remaining, load)) {
        const master = suitable.find((s) => s.name === name)!.fit!.master;
        push(name, { kind: "task-loop", master, times: share, done: 0, gear: true });
      }
      return;
    }
    case "combat_level":
      return void blockers.push({ reason: `reach combat level ${o.total} — advances with any fighting (passive)` });
    default:
      return void blockers.push({ reason: `${o.type} objectives need a human (no automation)` });
  }
}

const labelIt = (items: QueueItemInput[]): string =>
  items
    .filter((it) => it.kind !== "deposit-all")
    .map((it) => queueItemText({ ...it, id: "" } as QueueItem))
    .join(" · ") || "idle";
