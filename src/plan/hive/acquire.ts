// The fleet-level acquisition resolver — the deleted per-character resolver
// (git 8e21cd2) rebuilt as a PURE COMPILER. planAcquire prices a set of item
// demands against a virtual copy of the bank and decides, per missing item,
// who produces it and how (gather → craft → fight → buy); acquireWaves turns
// the result into per-character queue-item waves. Nothing here executes —
// the queue runner owns all bagfuls, bank trips, travel and gear.
//
// Quantities are EXPECTED counts with a small buffer where drops are random;
// the runtime's recompile-at-barrier loop turns any shortfall into a top-up
// wave, so precision is deliberately not attempted here.

import { catalog, item, itemName } from "../../catalog";
import { titleCase } from "../../lib/util";
import { bankStock, crafterFor, fleetBis, skillLevel } from "./ctx";
import { queueItemText, type QueueItem, type QueueItemInput } from "../queue";
import type { AcquirePlan, AcquireTask, Blocker, HiveCtx, HiveWave, ItemDemand } from "./types";

const MAX_DEPTH = 12;
/** Expected-count buffer on random drops — makes recompile top-ups rare. */
const DROP_BUFFER = 1.2;
/** Prefer a gold buy over grinding when a unit costs this many fights or more. */
const BUY_OVER_FIGHT_RATIO = 8;
/** A skill gap this small becomes a level-skill suggestion instead of a dead end. */
export const TRAIN_GAP = 5;
/** Split a raw task across characters once it exceeds ~this many actions. */
const SPLIT_ACTIONS = 60;

export interface AcquireOptions {
  /** Gold the plan may spend (default: ctx.bankGold). */
  goldBudget?: number;
  /** Cheap feasibility probe: quantities collapse to 1, fight sims skipped. */
  probe?: boolean;
}

interface GatherAgg { qty: number; resource: string; skill: string; level: number; rate: number; candidates: string[] }
interface FightAgg { qty: number; monster: string; rate: number; avgQty: number; candidates: string[] }
interface BuyAgg { qty: number; npc: string; currency: string; unitCost: number }
interface CraftAgg { runs: number; skill: string; level: number; per: number; candidates: string[]; depth: number }

/** Whether an NPC's tile gate is met. null (unknown / no achievements loaded)
 *  counts as met — the server stays the judge (same rule as state/access.ts,
 *  re-derived here so the pure domain doesn't import signal-reading modules). */
function npcGateMet(npcCode: string, ctx: HiveCtx): boolean | null {
  const tile = catalog().maps.find(
    (m) => m.interactions?.content?.type === "npc" && m.interactions.content.code === npcCode,
  );
  if (!tile || tile.access?.type !== "conditional") return true;
  let met: boolean | null = true;
  for (const c of (tile.access.conditions ?? []) as { code: string; operator: string; value: number }[]) {
    if (c.operator !== "achievement_unlocked") continue;
    if (!ctx.achievements) {
      met = null;
      continue;
    }
    const done = !!ctx.achievements.find((a) => a.code === c.code)?.completed_at;
    if (done !== (c.value !== 0)) return false;
  }
  return met;
}

export function planAcquire(targets: ItemDemand[], ctx: HiveCtx, opts: AcquireOptions = {}): AcquirePlan {
  const stock = bankStock(ctx);
  let gold = opts.goldBudget ?? ctx.bankGold;
  const fromBank = new Map<string, number>();
  const gathers = new Map<string, GatherAgg>();
  const fights = new Map<string, FightAgg>();
  const buys = new Map<string, BuyAgg>();
  const crafts = new Map<string, CraftAgg>();
  const blockers: Blocker[] = [];

  const blocked = (reason: string, suggest?: Blocker["suggest"]): void => {
    if (!blockers.some((b) => b.reason === reason)) blockers.push({ reason, suggest });
  };

  /** Resolve one demand; returns the production depth (0 = bank/raw) or -1 when blocked. */
  const need = (code: string, qty: number, path: string[]): number => {
    if (qty <= 0) return 0;

    // 1. Virtual bank stock first — earlier demands claim it before later ones.
    const banked = Math.min(qty, stock.get(code) ?? 0);
    if (banked > 0) {
      stock.set(code, (stock.get(code) ?? 0) - banked);
      fromBank.set(code, (fromBank.get(code) ?? 0) + banked);
      qty -= banked;
    }
    if (qty <= 0) return 0;

    // tasks_coin can't be produced by any field source — only task turn-ins.
    if (code === "tasks_coin") {
      blocked(`${qty}× Tasks Coin short — only task turn-ins produce them`, {
        kind: "farm-tasks",
        perCharacter: ctx.characters.slice(0, 2).map((c) => ({
          character: c.name,
          master: "monsters" as const,
          times: Math.max(1, Math.ceil(qty / 2)),
        })),
      });
      return -1;
    }

    // 2. Gather — the surest node (lowest drop rate, then lowest level) any
    //    participant's skill reaches.
    let gatherGap: { skill: string; level: number } | undefined;
    {
      let best: { r: GatherAgg; reachable: boolean } | undefined;
      for (const r of catalog().resources.values()) {
        const d = r.drops?.find((x) => x.code === code);
        if (!d) continue;
        const candidates = ctx.characters.filter((c) => skillLevel(c, r.skill) >= r.level).map((c) => c.name);
        const agg: GatherAgg = { qty: 0, resource: r.code, skill: r.skill, level: r.level, rate: d.rate, candidates };
        const reachable = candidates.length > 0;
        if (!best || (reachable && !best.reachable) || (reachable === best.reachable && d.rate < best.r.rate)) {
          best = { r: agg, reachable };
        }
      }
      if (best?.reachable) {
        const cur = gathers.get(code) ?? { ...best.r };
        cur.qty += qty;
        gathers.set(code, cur);
        return 0;
      }
      if (best) gatherGap = { skill: best.r.skill, level: best.r.level };
    }

    // 3. Craft — recurse into ingredients (post-order depth), when a fleet
    //    crafter's skill reaches the recipe.
    const it = item(code);
    if (it?.craft && !path.includes(code) && path.length < MAX_DEPTH) {
      const rec = it.craft;
      const crafter = crafterFor(ctx, rec.skill);
      const qualified = ctx.characters.filter((c) => skillLevel(c, rec.skill) >= rec.level).map((c) => c.name);
      if (qualified.length > 0) {
        // Preferred crafter first (the pin's whole point), then other qualified.
        const candidates =
          crafter && qualified.includes(crafter.ch.name)
            ? [crafter.ch.name, ...qualified.filter((n) => n !== crafter.ch.name)]
            : qualified;
        const runs = Math.ceil(qty / rec.quantity);
        let depth = 1;
        for (const ing of rec.items) {
          const d = need(ing.code, ing.quantity * runs, [...path, code]);
          if (d < 0) return -1; // ingredient blocked — the blocker is already recorded
          depth = Math.max(depth, d + 1);
        }
        const cur = crafts.get(code) ?? { runs: 0, skill: rec.skill, level: rec.level, per: rec.quantity, candidates, depth };
        cur.runs += runs;
        cur.depth = Math.max(cur.depth, depth);
        crafts.set(code, cur);
        return cur.depth;
      }
      const have = crafter ? crafter.level : 0;
      if (rec.level - have <= TRAIN_GAP && crafter) {
        blocked(`${itemName(code)} needs ${titleCase(rec.skill)} Lv ${rec.level} (${crafter.ch.name} has ${have})`, {
          kind: "level-skill",
          skill: rec.skill,
          character: crafter.ch.name,
          toLevel: rec.level,
        });
        return -1;
      }
    }

    // 4. Fight the best dropper — someone must actually win the forecast.
    //    5. Buy — gold-affordable shop offers; item currencies must be covered
    //    by stock (tasks_coin & co. are produced by other GOALS, not waves).
    let fight: FightAgg | undefined;
    for (const m of catalog().monsters.values()) {
      const d = m.drops?.find((x) => x.code === code);
      if (!d) continue;
      if (!fight || d.rate < fight.rate) {
        fight = { qty: 0, monster: m.code, rate: d.rate, avgQty: (d.min_quantity + d.max_quantity) / 2 || 1, candidates: [] };
      }
    }
    if (fight && !opts.probe) {
      const safe = ctx.characters.filter((c) => fleetBis(ctx, c, fight!.monster)?.safe).map((c) => c.name);
      const winners = safe.length
        ? safe
        : ctx.characters.filter((c) => fleetBis(ctx, c, fight!.monster)?.forecast.win).map((c) => c.name);
      fight.candidates = winners;
    } else if (fight && opts.probe) {
      fight.candidates = ctx.characters.map((c) => c.name);
    }
    const expectedFights = fight ? Math.ceil((qty * fight.rate * DROP_BUFFER) / fight.avgQty) : 0;

    let buy: BuyAgg | undefined;
    for (const n of catalog().npcs.values()) {
      for (const o of n.items ?? []) {
        if (o.code !== code || o.buy_price == null) continue;
        if (buy && !(buy.currency !== "gold" && o.currency === "gold")) continue; // first gold offer wins
        if (npcGateMet(n.code, ctx) === false) continue;
        buy = { qty: 0, npc: n.code, currency: o.currency, unitCost: o.buy_price };
      }
    }
    const buyFeasible =
      buy &&
      (buy.currency === "gold"
        ? gold >= buy.unitCost * qty
        : (stock.get(buy.currency) ?? 0) >= buy.unitCost * qty);

    const fightFeasible = fight && fight.candidates.length > 0;
    // A pathological grind (≥ ~8 fights per unit) yields to an affordable buy.
    const preferBuy = buyFeasible && (!fightFeasible || expectedFights >= BUY_OVER_FIGHT_RATIO * qty);

    if (preferBuy && buy) {
      if (buy.currency === "gold") gold -= buy.unitCost * qty;
      else stock.set(buy.currency, (stock.get(buy.currency) ?? 0) - buy.unitCost * qty);
      const cur = buys.get(code) ?? { ...buy };
      cur.qty += qty;
      buys.set(code, cur);
      return 0;
    }
    if (fightFeasible && fight) {
      const cur = fights.get(code) ?? { ...fight };
      cur.qty += qty;
      fights.set(code, cur);
      return 0;
    }
    if (buyFeasible && buy) {
      if (buy.currency === "gold") gold -= buy.unitCost * qty;
      else stock.set(buy.currency, (stock.get(buy.currency) ?? 0) - buy.unitCost * qty);
      const cur = buys.get(code) ?? { ...buy };
      cur.qty += qty;
      buys.set(code, cur);
      return 0;
    }

    // Dead end — the most actionable hint we collected wins.
    if (buy && buy.currency !== "gold") {
      // The currency itself is short: express the shortfall as a demand so the
      // right blocker (e.g. farm-tasks for tasks_coin) is recorded.
      return need(buy.currency, buy.unitCost * qty - (stock.get(buy.currency) ?? 0), [...path, code]);
    }
    if (gatherGap) {
      const bestCh = ctx.characters.slice().sort((a, b) => skillLevel(b, gatherGap!.skill) - skillLevel(a, gatherGap!.skill))[0];
      const have = bestCh ? skillLevel(bestCh, gatherGap.skill) : 0;
      const suggest =
        bestCh && gatherGap.level - have <= TRAIN_GAP
          ? ({ kind: "level-skill", skill: gatherGap.skill, character: bestCh.name, toLevel: gatherGap.level } as const)
          : undefined;
      blocked(`${itemName(code)} needs ${titleCase(gatherGap.skill)} Lv ${gatherGap.level} (best is ${have})`, suggest);
      return -1;
    }
    if (fight && !fightFeasible) {
      blocked(`${itemName(code)} drops from ${itemName(fight.monster)} — nobody wins that fight yet`);
      return -1;
    }
    if (buy && !buyFeasible) {
      blocked(`${itemName(code)} costs ${buy.unitCost * qty} ${buy.currency === "gold" ? "gold" : itemName(buy.currency)} — can't afford it`);
      return -1;
    }
    blocked(`${itemName(code)}: no known way to obtain (need ${qty})`);
    return -1;
  };

  for (const t of targets) need(t.code, opts.probe ? 1 : t.quantity, []);

  const tasks: AcquireTask[] = [];
  let estActions = 0;
  for (const [code, g] of gathers) {
    const est = Math.ceil(g.qty * (g.rate > 1 ? g.rate * DROP_BUFFER : 1));
    tasks.push({ how: "gather", code, qty: g.qty, resource: g.resource, skill: g.skill, level: g.level, estActions: est, candidates: g.candidates });
    estActions += est;
  }
  for (const [code, f] of fights) {
    const expected = Math.ceil((f.qty * f.rate * DROP_BUFFER) / f.avgQty);
    tasks.push({ how: "fight", code, qty: f.qty, monster: f.monster, expectedFights: expected, candidates: f.candidates });
    estActions += expected;
  }
  for (const [code, b] of buys) {
    tasks.push({ how: "buy", code, qty: b.qty, npc: b.npc, currency: b.currency, unitCost: b.unitCost });
    estActions += 2;
  }
  for (const [code, c] of [...crafts].sort((a, b) => a[1].depth - b[1].depth)) {
    tasks.push({ how: "craft", code, runs: c.runs, produced: c.runs * c.per, skill: c.skill, level: c.level, candidates: c.candidates, depth: c.depth });
    estActions += c.runs;
  }

  return {
    fromBank: [...fromBank].map(([code, quantity]) => ({ code, quantity })),
    tasks,
    estActions,
    feasible: blockers.length === 0,
    blockers,
  };
}

// ── Waves: who does what, in what order ──────────────────────────────────────

const labelOf = (items: QueueItemInput[]): string =>
  items
    .filter((it) => it.kind !== "deposit-all")
    .map((it) => queueItemText({ ...it, id: "" } as QueueItem))
    .join(" · ") || "idle";

/** Append `add` to a character's item list inside `byChar`, creating it lazily. */
const push = (byChar: Map<string, QueueItemInput[]>, name: string, ...add: QueueItemInput[]): void => {
  const cur = byChar.get(name) ?? [];
  cur.push(...add);
  byChar.set(name, cur);
};

/**
 * Turn an AcquirePlan into waves with the fewest barriers:
 * - raw tasks (gather / fight / buy) split chunk-and-LPT across their
 *   candidates and run in wave 0, each producer ending with deposit-all;
 * - a craft whose gathered ingredients all belong to craft-capable gatherers
 *   chains into their own wave-0 queues (gather → smelt, no barrier) —
 *   remaining ingredients must already be bank stock (the craft item
 *   self-withdraws them);
 * - all other crafts form later waves by depth, one barrier per layer, so a
 *   consumer craft only compiles once its producers' deposits are in the bank.
 */
export function acquireWaves(plan: AcquirePlan, ctx: HiveCtx): HiveWave[] {
  const load = new Map<string, number>(ctx.characters.map((c) => [c.name, 0]));
  const wave0 = new Map<string, QueueItemInput[]>();
  /** code → per-character gathered quantity (for craft chaining). */
  const gatheredBy = new Map<string, Map<string, number>>();
  const bankCover = new Map(plan.fromBank.map((s) => [s.code, s.quantity]));

  const assign = (candidates: string[], actions: number): string | undefined => {
    const pool = candidates.filter((n) => load.has(n));
    if (pool.length === 0) return undefined;
    const name = pool.sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0))[0];
    load.set(name, (load.get(name) ?? 0) + actions);
    return name;
  };

  // Raw tasks, biggest first (LPT), split into candidate-sized chunks when large.
  const raw = plan.tasks.filter((t) => t.how !== "craft");
  const sizeOf = (t: AcquireTask): number =>
    t.how === "gather" ? t.estActions : t.how === "fight" ? t.expectedFights : 2;
  for (const t of raw.sort((a, b) => sizeOf(b) - sizeOf(a))) {
    if (t.how === "buy") {
      const buyer = assign(ctx.characters.map((c) => c.name), 2);
      if (!buyer) continue;
      const items: QueueItemInput[] =
        t.currency === "gold"
          ? [{ kind: "buy", code: t.code, quantity: t.qty, npc: t.npc }]
          : [
              { kind: "withdraw", code: t.currency, quantity: t.unitCost * t.qty },
              { kind: "buy", code: t.code, quantity: t.qty, npc: t.npc },
            ];
      push(wave0, buyer, ...items);
      continue;
    }
    const total = sizeOf(t);
    const chunks = Math.max(1, Math.min(t.candidates.length, Math.ceil(total / SPLIT_ACTIONS)));
    for (let i = 0; i < chunks; i++) {
      const share = Math.ceil(total / chunks);
      const actions = Math.min(share, total - share * i);
      if (actions <= 0) break;
      const who = assign(t.candidates, actions);
      if (!who) continue;
      if (t.how === "gather") {
        push(wave0, who, { kind: "gather", code: t.code, resource: t.resource, times: actions, done: 0, gear: true });
        const per = gatheredBy.get(t.code) ?? new Map<string, number>();
        // Expected items this chunk yields (times are ACTIONS; rate>1 drops less).
        per.set(who, (per.get(who) ?? 0) + Math.floor(actions / (t.estActions / t.qty)));
        gatheredBy.set(t.code, per);
      } else {
        push(wave0, who, { kind: "fight", monster: t.monster, times: actions, done: 0, gear: true });
      }
    }
  }

  // Chain crafts into wave 0 where the gatherers can smelt their own haul.
  const crafts = plan.tasks.filter((t): t is Extract<AcquireTask, { how: "craft" }> => t.how === "craft");
  const chained = new Set<string>();
  for (const c of crafts.sort((a, b) => a.depth - b.depth)) {
    const rec = item(c.code)?.craft;
    if (!rec) continue;
    const gatheredIngs = rec.items.filter((g) => gatheredBy.has(g.code));
    const rest = rec.items.filter((g) => !gatheredBy.has(g.code));
    // Chainable: exactly one gathered ingredient, everything else pre-existing
    // bank stock, and every gatherer of it can run the craft.
    if (gatheredIngs.length !== 1) continue;
    if (!rest.every((g) => (bankCover.get(g.code) ?? 0) >= g.quantity * c.runs)) continue;
    const per = gatheredBy.get(gatheredIngs[0].code)!;
    const gatherers = [...per.keys()];
    const capable = gatherers.every((n) => {
      const ch = ctx.characters.find((x) => x.name === n);
      return !!ch && skillLevel(ch, c.skill) >= c.level;
    });
    if (!capable || gatherers.length === 0) continue;
    // Split runs proportional to gathered quantities; remainder to the biggest.
    const totalGathered = [...per.values()].reduce((s, n) => s + n, 0) || 1;
    let left = c.runs;
    const shares = gatherers
      .map((n) => ({ n, runs: Math.floor((c.runs * (per.get(n) ?? 0)) / totalGathered) }))
      .sort((a, b) => (per.get(b.n) ?? 0) - (per.get(a.n) ?? 0));
    for (const s of shares) left -= s.runs;
    if (shares.length) shares[0].runs += left;
    for (const s of shares) {
      if (s.runs <= 0) continue;
      push(wave0, s.n, { kind: "craft", code: c.code, quantity: s.runs * (c.produced / c.runs), done: 0 });
      load.set(s.n, (load.get(s.n) ?? 0) + s.runs);
    }
    chained.add(c.code);
    // Its produce is now "gathered by" those characters — deeper crafts may chain on.
    const out = gatheredBy.get(c.code) ?? new Map<string, number>();
    for (const s of shares) if (s.runs > 0) out.set(s.n, (out.get(s.n) ?? 0) + s.runs * (c.produced / c.runs));
    gatheredBy.set(c.code, out);
  }

  const waves: HiveWave[] = [];
  if (wave0.size > 0) {
    for (const items of wave0.values()) items.push({ kind: "deposit-all" });
    waves.push({
      label: "Produce materials",
      assignments: [...wave0].map(([character, items]) => ({ character, label: labelOf(items), items })),
    });
  }

  // Remaining crafts: one wave per depth layer (compressed to consecutive waves).
  const remaining = crafts.filter((c) => !chained.has(c.code)).sort((a, b) => a.depth - b.depth);
  const depths = [...new Set(remaining.map((c) => c.depth))];
  for (const d of depths) {
    const byChar = new Map<string, QueueItemInput[]>();
    for (const c of remaining.filter((x) => x.depth === d)) {
      const who = c.candidates[0];
      if (!who) continue;
      push(byChar, who, { kind: "craft", code: c.code, quantity: c.produced, done: 0 });
    }
    if (byChar.size === 0) continue;
    for (const items of byChar.values()) items.push({ kind: "deposit-all" });
    waves.push({
      label: depths.length > 1 ? `Craft (stage ${waves.length + 1})` : "Craft",
      assignments: [...byChar].map(([character, items]) => ({ character, label: labelOf(items), items })),
    });
  }

  return waves;
}
