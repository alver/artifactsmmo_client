// Atlas economics: seconds per unit of any item, requirement trees, skill-training XP rates.
import { C, sourcesOf, obtain, availability } from "./model.mts";
import { fight, minLevel } from "./combat.mts";
import { gatherSec, CRAFT_SEC } from "../../src/plan/xp";

// XP to go from level L to L+1 (docs table), L = 1..49.
export const XP_NEEDED = [0, 150, 250, 350, 450, 700, 950, 1200, 1450, 1700, 2100, 2500, 2900, 3300, 3700, 4400, 5100, 5800, 6500, 7200, 8200, 9200, 10200, 11200, 12200, 13400, 14600, 15800, 17000, 18200, 19700, 21200, 22700, 24200, 25700, 27500, 29300, 31100, 32900, 34700, 36500, 38600, 40700, 42800, 44900, 47000, 48800, 50600, 52400, 54200];

/** A just-strong-enough fighter's kill seconds for monster m (realistic tier, else special). */
const killMemo = new Map<string, { sec: number; L: number; T: number } | null>();
export function killFor(m: string): { sec: number; L: number; T: number } | null {
  if (killMemo.has(m)) return killMemo.get(m)!;
  const mon = C.monsters.get(m)!;
  let res: { sec: number; L: number; T: number } | null = null;
  if (mon.type !== "raid_boss") {
    for (const T of [1, 2]) {
      const ml = minLevel(m, T);
      const lv = ml.safe ?? ml.win;
      if (lv == null) continue;
      const L = Math.min(50, Math.max(lv, mon.level));
      const f = fight(L, m, T);
      if (f.win) { res = { sec: f.killSec, L, T }; break; }
    }
  }
  killMemo.set(m, res);
  return res;
}

export interface Cost { sec: number; gold: number; via: string }
const costMemo = new Map<string, Cost>();
const INF: Cost = { sec: Infinity, gold: Infinity, via: "none" };
/** Seconds (and gold) of one character's time per unit, cheapest always-available path
 *  (tier ≤ maxTier). Gold purchases are a separate currency: chosen only when no
 *  time-only path exists. */
export function cost(code: string, maxTier = 2, depth = 0): Cost {
  const k = `${code}|${maxTier}`;
  const hit = costMemo.get(k);
  if (hit) return hit;
  if (depth > 8) return INF;
  costMemo.set(k, INF);
  const opts: Cost[] = [];
  for (const s of sourcesOf.get(code) ?? []) {
    if (s.tier > maxTier) continue;
    const d = s.detail;
    if (s.kind === "gather") opts.push({ sec: (gatherSec(d.level) * d.rate) / d.qty, gold: 0, via: s.label });
    else if (s.kind === "drop") {
      const kf = killFor(d.monster);
      if (kf) opts.push({ sec: (kf.sec * d.rate) / d.qty, gold: 0, via: s.label });
    } else if (s.kind === "npc") {
      if (d.currency === "gold") opts.push({ sec: 0, gold: d.price, via: s.label });
      else { const c = cost(d.currency, maxTier, depth + 1); opts.push({ sec: c.sec * d.price, gold: c.gold * d.price, via: s.label }); }
    } else if (s.kind === "task") opts.push({ sec: COIN_SEC, gold: 0, via: s.label });
  }
  const it = C.items.get(code);
  if (it?.craft && obtain(code).tier <= maxTier) {
    let sec = CRAFT_SEC, gold = 0;
    for (const g of it.craft.items) { const c = cost(g.code, maxTier, depth + 1); sec += c.sec * g.quantity; gold += c.gold * g.quantity; }
    opts.push({ sec: sec / it.craft.quantity, gold: gold / it.craft.quantity, via: `craft ${it.craft.skill} ${it.craft.level}` });
  }
  const time = opts.filter((o) => o.gold === 0 && Number.isFinite(o.sec)).sort((a, b) => a.sec - b.sec)[0];
  const best = time ?? opts.filter((o) => Number.isFinite(o.sec) && Number.isFinite(o.gold)).sort((a, b) => a.gold - b.gold || a.sec - b.sec)[0] ?? INF;
  costMemo.set(k, best);
  return best;
}

// Tasks coin cost: median over tasks of (task work seconds / coins paid). Computed lazily
// with a provisional value so task-item costs that recurse into coins stay finite.
export let COIN_SEC = 3000;
export function calibrateCoin(): { median: number; rows: { code: string; type: string; level: number; secPerCoin: number }[] } {
  const rows: { code: string; type: string; level: number; secPerCoin: number }[] = [];
  for (const t of C.tasks.values()) {
    const coins = t.rewards.items.find((i) => i.code === "tasks_coin")?.quantity ?? 0;
    if (!coins) continue;
    const qty = (t.min_quantity + t.max_quantity) / 2;
    let unit = Infinity;
    if (t.type === "monsters") unit = killFor(t.code)?.sec ?? Infinity;
    else unit = cost(t.code, 1).sec;
    if (Number.isFinite(unit)) rows.push({ code: t.code, type: t.type, level: t.level, secPerCoin: (unit * qty) / coins });
  }
  const s = rows.map((r) => r.secPerCoin).sort((a, b) => a - b);
  const median = s[Math.floor(s.length / 2)];
  COIN_SEC = median;
  costMemo.clear();
  return { median, rows };
}

// ---------- requirements (what an item needs: skills, monsters, special flags) ----------
export interface Req { skills: Record<string, number>; monsters: Record<string, number>; flags: string[] }
const reqMemo = new Map<string, Req>();
export function reqs(code: string, depth = 0): Req {
  const hit = reqMemo.get(code);
  if (hit) return hit;
  const out: Req = { skills: {}, monsters: {}, flags: [] };
  if (depth > 8) return out;
  reqMemo.set(code, out);
  const merge = (r: Req) => {
    for (const [s, l] of Object.entries(r.skills)) out.skills[s] = Math.max(out.skills[s] ?? 0, l);
    for (const [m, l] of Object.entries(r.monsters)) out.monsters[m] = l;
    out.flags.push(...r.flags);
  };
  const it = C.items.get(code);
  const o = obtain(code);
  if (it?.craft && o.via.startsWith("craft")) {
    out.skills[it.craft.skill] = Math.max(out.skills[it.craft.skill] ?? 0, it.craft.level);
    for (const g of it.craft.items) merge(reqs(g.code, depth + 1));
  } else {
    // best source of the same tier as obtain() picked, cheapest
    const srcs = (sourcesOf.get(code) ?? []).filter((s) => s.tier === o.tier);
    const ranked = srcs.map((s) => ({ s, c: s.kind === "drop" ? (killFor(s.detail.monster)?.sec ?? 1e9) * s.detail.rate : s.kind === "gather" ? s.detail.level * 1e3 + s.detail.rate : s.kind === "achievement" ? 1e15 : 0 })).sort((a, b) => a.c - b.c);
    const s = ranked[0]?.s;
    if (s?.kind === "gather") out.skills[s.detail.skill] = Math.max(out.skills[s.detail.skill] ?? 0, s.detail.level);
    else if (s?.kind === "drop") out.monsters[s.detail.monster] = s.detail.level;
    else if (s?.kind === "npc" && s.detail.currency !== "gold") merge(reqs(s.detail.currency, depth + 1));
    out.flags.push(...(s?.flags ?? o.flags));
  }
  out.flags = [...new Set(out.flags)];
  return out;
}

// ---------- skill XP formulas (docs) ----------
const CRAFT_TIERS: [number, number, number][] = [[5, 50, 25], [10, 100, 30], [15, 200, 35], [20, 325, 40], [25, 450, 45], [30, 550, 50], [35, 650, 55], [40, 750, 60], [45, 850, 65], [Infinity, 1000, 70]];
export function craftXpOf(code: string, S: number): number {
  const r = C.items.get(code)!.craft!;
  if (S - r.level > 10) return 0;
  const [, base, coef] = CRAFT_TIERS.find(([max]) => r.level < max)!;
  const n = r.items.reduce((t, g) => t + g.quantity, 0);
  const refine = r.skill === "mining" || r.skill === "woodcutting";
  const mult = refine ? 0.1 : Math.min(1.55, Math.max(0.5, 0.2832 + 0.2171 * Math.sqrt(Math.max(1, n))));
  return Math.round((base + (r.level / S) * coef) * mult);
}
const GATHER_BASE = (lvl: number) => (lvl < 10 ? 5 : lvl < 20 ? 10 : lvl < 30 ? 13 : lvl < 35 ? 16 : lvl < 40 ? 20 : lvl < 45 ? 28 : 36);
export const gatherXpOf = (resLvl: number, S: number) => (S - resLvl > 10 ? 0 : Math.round(GATHER_BASE(resLvl) + (resLvl / S) * 8));

/** Best gathering tool (cooldown cut %) usable at skill level S within tier T. */
export function bestTool(skill: string, S: number, T: number): { code: string; pct: number } | null {
  let best: { code: string; pct: number } | null = null;
  for (const it of C.items.values()) {
    const e = it.effects.find((x) => x.code === `${skill}_gathering`);
    if (!e || it.type !== "weapon") continue;
    if (obtain(it.code).tier > T) continue;
    const cond = it.conditions.find((c) => c.code === `${skill}_level`);
    if (cond && !(S > cond.value)) continue;
    if (it.conditions.some((c) => c.code === "level" && !(S > c.value))) continue; // assume combat ≈ skill
    const pct = -e.value;
    if (!best || pct > best.pct) best = { code: it.code, pct };
  }
  return best;
}

export const resAvail = (code: string) => availability("resource", code);
