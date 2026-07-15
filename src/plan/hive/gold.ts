// earn-gold goals — "generate the money": a user-directed vault target. Each
// participant works its best gold-per-action LANE, estimated from live ctx:
//   gather+sell   best resource node by Σ(drop EV × NPC sell price) — the top
//                 raw gold/hour in the data (magic sap ≈ 16 g/action);
//   tasks         bounded task-loop batches — turn-ins pay 150–500g direct;
//   fight+sell    combat gold + loot sell value on a safely-winnable monster.
// Waves are bounded batches ending in deposit-all (items AND pocket gold), so
// the barrier's fresh ctx.bankGold reflects earnings; recompile shrinks the
// next batch as the vault fills, and goldSatisfied ends the run. HivePlan
// .progress carries fleet gold so the runtime's stall guard tolerates a capped
// lane re-emitting an identical batch while it is still earning.
//
// Sell quantities must be PROVABLY coverable — the sell exec pauses when hand
// and bank both run dry — so they count only guaranteed (rate === 1) drops of
// this wave's own actions, plus compile-time bank stock claimed by exactly ONE
// earner per code (no cross-character stock races). Random-drop surplus
// deposits at wave end and is swept by the next wave's claimer.
//
// Known accepted edge: a fight lane's food self-provisioning may cook with
// bank stock of a code a seller claimed — vanishingly rare; the failure mode
// is a paused sell with Retry/Skip, self-healing at the next barrier.

import { catalog } from "../../catalog";
import { npcForSell } from "../acquire";
import { npcGateMet } from "./acquire";
import { bankStock, fleetBis, skillLevel } from "./ctx";
import { ACTIONS_PER_TASK, taskSuitability } from "./tasks";
import { SCORE, estMinutes } from "./score";
import type { QueueItemInput } from "../queue";
import type { Character } from "../../types/api";
import type { DropRate } from "../../types/catalog";
import type { AccountGoal, Blocker, HiveCtx, HivePlan } from "./types";

type EarnGold = Extract<AccountGoal, { kind: "earn-gold" }>;

/** Floor so tiny remainders still amortize the travel to a node/master. */
const MIN_ACTIONS = 24;
/** ~20 min/wave — keeps barriers (and satisfied-checks) frequent. */
const CAP_ACTIONS = 240;
/** Heal/food/travel overhead per kill. */
const FIGHT_ACTIONS_PER_KILL = 1.3;
/** BIS solves per character per compile — top gold monsters first. */
const MAX_FIGHT_EVALS = 8;
/** Task-loop batch ceiling per wave. */
const MAX_TASK_TURNINS = 6;

interface LaneSell {
  code: string;
  /** Guaranteed (rate === 1) min_quantity per unit; 0 for random drops. */
  perUnit: number;
}

type GoldLane = { goldPerAction: number; label: string } & (
  | { kind: "gather"; resource: string; primaryDrop: string; sells: LaneSell[] }
  | { kind: "fight"; monster: string; sells: LaneSell[] }
  | { kind: "tasks"; master: "monsters" | "items" }
);

// Event tiles come and go — lanes only target the STATIC map, or a wave could
// compile against a vanished node and skip everything (a zero-gold stall).
let _staticMap: Set<string> | undefined;
function onStaticMap(type: string, code: string): boolean {
  if (!_staticMap) {
    _staticMap = new Set(
      catalog()
        .maps.map((m) => m.interactions?.content)
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map((c) => `${c.type}:${c.code}`),
    );
  }
  return _staticMap.has(`${type}:${code}`);
}

/** Gold per unit (action/kill) from a drop table, valued at the best gold
 *  buyer whose tile gate isn't known-unmet; plus the sell legs it implies. */
function sellValue(ctx: HiveCtx, drops: DropRate[]): { gpa: number; sells: LaneSell[] } {
  let gpa = 0;
  const sells: LaneSell[] = [];
  for (const d of drops) {
    const buyer = npcForSell(d.code);
    if (!buyer || npcGateMet(buyer.code, ctx) === false) continue;
    const avgQty = (d.min_quantity + d.max_quantity) / 2 || 1;
    gpa += (avgQty / Math.max(1, d.rate)) * buyer.price;
    sells.push({ code: d.code, perUnit: d.rate === 1 ? d.min_quantity : 0 });
  }
  return { gpa, sells };
}

function gatherLane(ctx: HiveCtx, ch: Character): GoldLane | undefined {
  let best: (GoldLane & { kind: "gather" }) | undefined;
  for (const r of catalog().resources.values()) {
    if (skillLevel(ch, r.skill) < r.level || !onStaticMap("resource", r.code)) continue;
    const { gpa, sells } = sellValue(ctx, r.drops);
    if (gpa <= 0) continue;
    if (!best || gpa > best.goldPerAction) {
      const primary = r.drops
        .filter((d) => sells.some((s) => s.code === d.code))
        .sort((a, b) => {
          const v = (d: DropRate) => (((d.min_quantity + d.max_quantity) / 2 || 1) / Math.max(1, d.rate)) * (npcForSell(d.code)?.price ?? 0);
          return v(b) - v(a) || a.code.localeCompare(b.code);
        })[0];
      best = { kind: "gather", resource: r.code, primaryDrop: primary.code, sells, goldPerAction: gpa, label: `gather ${r.name}` };
    }
  }
  return best;
}

function fightLane(ctx: HiveCtx, ch: Character): GoldLane | undefined {
  const candidates = [...catalog().monsters.values()]
    .filter((m) => m.level <= ch.level && onStaticMap("monster", m.code))
    .map((m) => ({ m, value: (m.min_gold + m.max_gold) / 2 + sellValue(ctx, m.drops).gpa }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value || a.m.code.localeCompare(b.m.code))
    .slice(0, MAX_FIGHT_EVALS);
  for (const { m, value } of candidates) {
    if (!fleetBis(ctx, ch, m.code)?.safe) continue;
    return {
      kind: "fight",
      monster: m.code,
      sells: sellValue(ctx, m.drops).sells,
      goldPerAction: value / FIGHT_ACTIONS_PER_KILL,
      label: `fight ${m.name}`,
    };
  }
  return undefined;
}

function taskLane(ctx: HiveCtx, ch: Character): GoldLane | undefined {
  const fit = taskSuitability(ctx, ch);
  if (!fit) return undefined;
  const doable = [...catalog().tasks.values()].filter((t) => t.type === fit.master && t.level <= ch.level);
  if (doable.length === 0) return undefined;
  const avgGold = doable.reduce((s, t) => s + (t.rewards?.gold ?? 0), 0) / doable.length;
  if (avgGold <= 0) return undefined;
  return { kind: "tasks", master: fit.master, goldPerAction: avgGold / ACTIONS_PER_TASK, label: `run ${fit.master} tasks` };
}

/** v2 seam: a gem-craft evaluator slots in here iff it fits the
 *  per-character-independent GoldLane shape — multi-character craft chains
 *  would need their own wave builder instead. */
const LANE_EVALS = [gatherLane, taskLane, fightLane] as const;

function bestLane(ctx: HiveCtx, ch: Character): GoldLane | undefined {
  let best: GoldLane | undefined;
  for (const evalLane of LANE_EVALS) {
    const lane = evalLane(ctx, ch);
    if (lane && (!best || lane.goldPerAction > best.goldPerAction)) best = lane;
  }
  return best;
}

const fleetGold = (ctx: HiveCtx): number => ctx.bankGold + ctx.characters.reduce((s, c) => s + c.gold, 0);

export function goldSatisfied(goal: EarnGold, ctx: HiveCtx): boolean {
  return fleetGold(ctx) >= goal.target;
}

const perHourOf = (gpa: number): number => Math.round(gpa * (3600 / SCORE.SEC_PER_ACTION));

export function compileGoldGoal(goal: EarnGold, ctx: HiveCtx): HivePlan {
  const progress = fleetGold(ctx);
  const remaining = goal.target - progress;
  if (remaining <= 0) {
    return { goal, waves: [], summary: `vault at ${progress}g — target ${goal.target}g reached`, blockers: [], progress };
  }

  const lanes: { ch: Character; lane: GoldLane }[] = [];
  const blockers: Blocker[] = [];
  for (const ch of ctx.characters) {
    const lane = bestLane(ctx, ch);
    if (lane) lanes.push({ ch, lane });
    // Informational — the runtime's idle filler covers laneless characters.
    else blockers.push({ reason: `${ch.name}: no gold lane (no sellable node, no safe gold monster, no task fit)` });
  }
  if (lanes.length === 0) {
    return { goal, waves: [], summary: `earn ${remaining}g — no viable lanes`, blockers, progress };
  }

  // Equal wall-clock lanes: shares ∝ gold/action means everyone works the same
  // action count; the batch shrinks with the remainder so successive waves
  // differ while the target is honestly approached.
  const sumGpa = lanes.reduce((s, l) => s + l.lane.goldPerAction, 0);
  const actionsWave = Math.max(MIN_ACTIONS, Math.min(CAP_ACTIONS, Math.ceil(remaining / sumGpa)));
  const stock = bankStock(ctx);
  const bankClaimed = new Set<string>();

  const assignments = lanes.map(({ ch, lane }) => {
    const perUnit = lane.kind === "fight" ? FIGHT_ACTIONS_PER_KILL : lane.kind === "tasks" ? ACTIONS_PER_TASK : 1;
    const unitsCap = lane.kind === "tasks" ? MAX_TASK_TURNINS : CAP_ACTIONS;
    const units = Math.max(1, Math.min(unitsCap, Math.ceil(actionsWave / perUnit)));
    const items: QueueItemInput[] = [];
    if (lane.kind === "gather") {
      items.push({ kind: "gather", code: lane.primaryDrop, resource: lane.resource, times: units, done: 0, gear: true });
    } else if (lane.kind === "fight") {
      items.push({ kind: "fight", monster: lane.monster, times: units, done: 0, gear: true });
    } else {
      items.push({ kind: "task-loop", master: lane.master, times: units, done: 0, gear: true });
    }
    if (lane.kind !== "tasks") {
      for (const s of lane.sells) {
        let qty = units * s.perUnit;
        if (!bankClaimed.has(s.code)) {
          bankClaimed.add(s.code);
          qty += stock.get(s.code) ?? 0;
        }
        if (qty > 0) items.push({ kind: "sell", code: s.code, quantity: qty, done: 0 });
      }
    }
    items.push({ kind: "deposit-all" });
    return { character: ch.name, label: `${lane.label} ×${units} (~${perHourOf(lane.goldPerAction)}g/h)`, items };
  });

  const waveGold = Math.round(Math.min(remaining, actionsWave * sumGpa));
  const summary =
    `earn ${remaining}g → ${goal.target}g vault — ${lanes.length} lane${lanes.length === 1 ? "" : "s"}, ` +
    `~${perHourOf(sumGpa)}g/h, ~${estMinutes(Math.ceil(remaining / sumGpa))}m total (repeats each barrier until the target holds)`;
  return { goal, waves: [{ label: `earn ~${waveGold}g`, assignments }], summary, blockers, progress };
}
