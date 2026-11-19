// Gear by need (task 009 section 4). One rule for flips and speed-ups alike: a set of craftable pieces is needed
// for a work when making them and then doing the work takes at most NEED_RATIO of the work's hours without them
// (G + H1 ≤ 0.85 × H0; a win that is not there is ∞ hours, so a flip always qualifies).
//
// The work a piece can serve:
//   (a) per character that is on, its road to its next combat gate (rule 3's bundle) — the XP monster;
//   (b) task 011: an open kill or drop objective is the fleet's work, not each fighter's — what is left of it less the
//       units of the others' running steps on it, done by whoever is best placed: H0 is the least hours among the
//       characters that are on, meet its other gates and win the monster as config.risk asks with their own pool (∞
//       only when none does); a need of X holds when G + H1(X) ≤ NEED_RATIO × that H0, and an objective has at most
//       one need — the character with the least G + H1, ties to the name;
//   (c) per gathering role, the road to that lane's next gate or an open gathering objective of the lane — a tool
//       (still per role holder: one objective can ask a tool of each, report 011).
// Candidates: pieces with a recipe the character can equip now (a piece its pool already holds is simply not new),
// no rune, artifact, utility or bag, at most ten levels below it, whose bill of materials is in reach (bank stock
// counts), that someone who is on can source and that have a crafter; the rest are listed as rejected, with why.
//
// Restated from the hive (src/plan/hive/gear.ts, which the core may not import; it is deleted in the clean-up):
// the candidate filter of `accountCraftableCandidates` (:72-98: equippable, a recipe, the level window, a crafter),
// the planning-grade solve of `fleetBis` (src/plan/hive/ctx.ts:105-129: capped pools, the new pieces as
// extraCandidates — here reach.ts planRec) and the drop pass of `proposeGearGoals` (:154-178: drop the dearest piece,
// keep the drop when it still pays — here: while the need still holds).
//
// Bounds (the service has one thread): (a) solves only the current pick (a speed-up) and the four monsters at most two
// levels above the character with the most XP at its level that it does not win now (a flip) — every such monster
// when it wins none — all reachable and giving XP; (b) only objectives on monsters at most ten levels above, and none whose hours no piece could cut enough;
// per slot the three highest-level candidates; at most three drops. What that can miss: a speed-up against a monster
// other than the pick, a flip of a fifth monster or of one three levels up, a lower-level piece whose element suits a
// monster better than a higher one. Pure.

import { catalog, item, itemName, monster as monsterOf } from "../../catalog";
import { canEquip, killSeconds } from "../bis";
import { ownedQtyOf } from "../jobgear";
import { CRAFT_SEC, fightXp } from "../xp";
import { atlas } from "../../catalog/atlas";
import { GATHER_LANES, KILL_LOG, NEED_RATIO } from "./config";
import { actionSec, hoursOf, hoursToLevel, killWalk, levelHoursEstimate, levelOf, perOf } from "./cost";
import { achHours, bundleOf, bundleScore } from "./bundle";
import { isOn, met } from "./gates";
import { pickMonster } from "./pick";
import { gatherCut, nearestSpot, placeOf, planRec, potionPrice, safeWin, toolCut, wins } from "./reach";
import { crafterOf, rolesFor } from "./roles";
import { poolBank } from "./stock";
import { billOf, fleetSec, recipeDemand } from "./supply";
import { targetsOf } from "./targets";
import { SLOTS_FOR_TYPE } from "../../types/api";
import type { Character } from "../../types/api";
import type { GearRecommendation } from "../types";
import type { Lane, World } from "./types";

export interface Need {
  for: string;
  work: string;                    // "combat 20 → 25", "highway_patrol (highwayman)", "mining 24 → 30 (tool)"
  key: string;                     // the work's target: lvl:<lane>:<gate> or the objective's key
  monster?: string;                // the monster the pieces are for (a fight)
  pieces: Map<string, number>;     // code → copies, the cheapest set that still qualifies
  H0: number; H1: number; G: number;
  parts: { supply: number; crafts: number; levels: number };
  points: number;                  // the points behind the work
  fit: number; any: number;        // score: points (that fit the deadline) ÷ (G + H1 + the bundle's own hours)
  hours: number;                   // G + H1 + the bundle's own hours
  offered: boolean;                // every piece's crafter is on (section 7)
}
export interface Rejected { for: string; piece: string; why: string }

const FLIPS = 4, PER_SLOT = 3, DROPS = 3;
const calHOf = (world: World): number => Math.max(0, (Date.parse(world.config.deadline) - world.now) / 3.6e6);
const solve = planRec;

/** Seconds per kill as cost.ts prices it, for a solved set: the fight and the rest × the log, plus the bank trips. */
const killSec = (ch: Character, world: World, monster: string, r: GearRecommendation): number =>
  killSeconds(r.forecast, potionPrice(world)) * KILL_LOG + killWalk(ch, world, monster);

interface Cands { fight: string[]; tools: string[]; rejected: Rejected[] }
const candMemo = new WeakMap<World, Map<string, Cands>>();
/** The craftable pieces this character could be given now, and the ones rejected with why. */
export function candidatesOf(ch: Character, world: World): Cands {
  let byName = candMemo.get(world);
  if (!byName) candMemo.set(world, (byName = new Map()));
  const hit = byName.get(ch.name);
  if (hit) return hit;
  // The candidates do not depend on the pool (a piece the pool holds is in the solve anyway, and newPieces counts
  // only what it lacks), so the solves' key holds still while pieces are made and change hands.
  const bySlot = new Map<string, string[]>();
  const tools: string[] = [];
  const rejected: Rejected[] = [];
  for (const it of catalog().items.values()) {
    if (!it.craft || !SLOTS_FOR_TYPE[it.type] || ["utility", "bag", "rune", "artifact"].includes(it.type)) continue;
    if (!canEquip(ch, it) || it.level < ch.level - 10) continue;
    const crafter = crafterOf(it.craft.skill, world);
    if (!crafter) { rejected.push({ for: ch.name, piece: it.code, why: `no crafter of ${it.craft.skill}` }); continue; }
    // in reach = nothing in its tree out of reach (bank stock counts), and someone that is on can source every leaf
    const bill = billOf(world, ch.name, recipeDemand(it.code, 1));
    if (bill.out.length) { rejected.push({ for: ch.name, piece: it.code, why: bill.out.join("; ") }); continue; }
    if (!Number.isFinite(bill.hours)) {
      const who = [...bill.leaves.values()].filter((l) => l.kind === "src" && !Number.isFinite(fleetSec(l.work, l.gates, world))).map((l) => itemName(l.code));
      rejected.push({ for: ch.name, piece: it.code, why: `nobody that is on sources ${who.join(", ")} yet` });
      continue;
    }
    if (it.subtype === "tool") tools.push(it.code);
    else bySlot.set(it.type, [...(bySlot.get(it.type) ?? []), it.code]);
  }
  const fight = [...bySlot.values()].flatMap((cs) => cs.sort((a, b) => (item(b)!.level - item(a)!.level) || (a < b ? -1 : 1)).slice(0, PER_SLOT));
  const out = { fight, tools, rejected };
  byName.set(ch.name, out);
  return out;
}

/** G: the hours to make these pieces — their bill (supply), the crafts, and each crafter's levels where its skill is short. */
function makeHours(pieces: Map<string, number>, ch: Character, world: World): { G: number; parts: Need["parts"]; offered: boolean } {
  const demand: [string, number][] = [];
  let crafts = 0, offered = true;
  const lv = new Map<string, number>(); // crafter|skill → the highest recipe level asked
  for (const [code, n] of pieces) {
    const r = item(code)!.craft!;
    demand.push(...recipeDemand(code, n));
    crafts += (n * CRAFT_SEC) / 3600;
    const who = crafterOf(r.skill, world)!;
    if (!isOn(who, world)) offered = false;
    const k = `${who}|${r.skill}`;
    lv.set(k, Math.max(lv.get(k) ?? 0, r.level));
  }
  const bill = billOf(world, ch.name, demand);
  let levels = 0;
  for (const [k, L] of lv) {
    const [who, skill] = k.split("|");
    const c = world.characters.find((x) => x.name === who)!;
    if (levelOf(c, skill as Lane) < L) levels += hoursToLevel(skill as Lane, levelOf(c, skill as Lane), L, world, c);
  }
  return { G: bill.hours + crafts + levels, parts: { supply: bill.hours - bill.crafts, crafts: crafts + bill.crafts, levels }, offered };
}

/** The new pieces of a solved set (codes the pool does not hold, with their copies). */
function newPieces(r: GearRecommendation, ch: Character, world: World): Map<string, number> {
  const pool = ownedQtyOf(ch, poolBank(world, ch.name));
  const used = new Map<string, number>();
  for (const c of r.codes) used.set(c, (used.get(c) ?? 0) + 1);
  const out = new Map<string, number>();
  for (const [c, n] of used) if (n > (pool.get(c) ?? 0)) out.set(c, n - (pool.get(c) ?? 0));
  return [...out.keys()].every((c) => item(c)?.craft) ? out : new Map(); // a copy short that no recipe makes: no set
}

/**
 * The cheapest set that qualifies for a fight work: solve with every candidate, then drop the dearest new piece
 * while the need holds. `h1` prices the work with a solved set (∞ when it does not win as config.risk asks).
 */
function fightNeed(ch: Character, world: World, monster: string, cands: string[], H0: number, h1: (r: GearRecommendation) => number): { pieces: Map<string, number>; H1: number; mk: ReturnType<typeof makeHours> } | undefined {
  let extra = cands;
  let best: { pieces: Map<string, number>; H1: number; mk: ReturnType<typeof makeHours> } | undefined;
  for (let d = 0; d <= DROPS && extra.length; d++) {
    const r = solve(ch, world, monster, extra);
    if (!r || !wins(r, world)) break;
    const pieces = newPieces(r, ch, world);
    if (!pieces.size) break; // it wins without a new piece
    const H1 = h1(r), mk = makeHours(pieces, ch, world);
    if (mk.G + H1 <= NEED_RATIO * H0) best = { pieces, H1, mk };
    else if (best) break; // the set without the dearest piece no longer pays: keep the last that did
    // the dearest new piece goes (a piece nobody can source yet is ∞) and the solve looks again
    const dear = [...pieces.keys()].map((c) => ({ c, g: makeHours(new Map([[c, pieces.get(c)!]]), ch, world).G })).sort((a, b) => b.g - a.g || (a.c < b.c ? -1 : 1))[0].c;
    extra = extra.filter((c) => c !== dear);
  }
  return best;
}

/** What section 4 would make for a fight with this monster, whatever it pays (the check's "safe: a wall or a price"
 *  table): the cheapest flipping set and the hours to make it. */
export function piecesFor(ch: Character, world: World, monster: string): { pieces: Map<string, number>; G: number } | undefined {
  const n = fightNeed(ch, world, monster, candidatesOf(ch, world).fight, Infinity, () => 0);
  return n && { pieces: n.pieces, G: n.mk.G };
}

const needMemo = new WeakMap<World, Map<string, { needs: Need[]; rejected: Rejected[] }>>();
/** Every character's gear needs (characters that are on), and the candidates rejected. `name` is the deciding
 *  character: its `current` is the step it just finished, so only the others' steps count as in flight (rank()'s
 *  inFlight). Memoised per World and name. */
export function gearNeeds(world: World, name = ""): { needs: Need[]; rejected: Rejected[] } {
  let byName = needMemo.get(world);
  if (!byName) needMemo.set(world, (byName = new Map()));
  const hit = byName.get(name);
  if (hit) return hit;
  const needs: Need[] = [];
  const rejected: Rejected[] = [];
  const calH = calHOf(world);
  const xpNeeded = atlas()?.xpNeeded ?? [];
  const gMins = new Map<string, number>(); // per character: no set of its candidates is cheaper to make
  const gMin = (ch: Character, fight: string[]): number => {
    let g = gMins.get(ch.name);
    if (g == null) gMins.set(ch.name, (g = Math.min(...fight.map((code) => makeHours(new Map([[code, 1]]), ch, world).G))));
    return g;
  };
  for (const ch of world.characters) {
    if (!isOn(ch.name, world)) continue;
    const c = candidatesOf(ch, world);
    rejected.push(...c.rejected);
    const L = ch.level;
    const push = (n: Omit<Need, "for">): void => void needs.push({ for: ch.name, ...n });

    // (a) the road to the next combat gate, judged on its next ten levels at most (the levels section 2 solves; a far
    // gate — grand_master at 50 — is reached a wall at a time); the score's hours run to the gate or the wall
    const b = bundleOf("combat", ch.name, world);
    if (b && c.fight.length) {
      const end = Math.min(b.next, L + 10);
      const own = (l: number): number => levelHoursEstimate("combat", l, world, ch);
      let H0 = 0, rest = 0, pace = Infinity, unpaced = 0; // past the horizon: each level at the pace of the last one priced
      for (let l = L; l < b.next; l++) {
        const h = own(l);
        if (Number.isFinite(h)) pace = h;
        if (l < end) H0 += h;
        else if (Number.isFinite(pace)) rest += Number.isFinite(h) ? h : pace;
        else unpaced++;
      }
      const cur = pickMonster(ch, world, new Set());
      const ok = (code: string): boolean => {
        const m = monsterOf(code);
        return !!m && m.type !== "boss" && m.type !== "raid_boss" && fightXp(m.level, m.hp, m.type, L) > 0 && !!nearestSpot(placeOf(ch), "monster", code, world);
      };
      // the current pick (a speed-up), and the four monsters at most two levels up with the most XP at this level that
      // it does not win now (a flip) — all of them when it wins none (no XP source at all: any flip is the way on)
      const flips = [...catalog().monsters.values()].filter((m) => m.level <= L + 2 && ok(m.code) && !safeWin(ch, world, m.code))
        .sort((x, y) => fightXp(y.level, y.hp, y.type, L) - fightXp(x.level, x.hp, x.type, L) || (x.code < y.code ? -1 : 1)).slice(0, cur ? FLIPS : Infinity).map((m) => m.code);
      const short = [...new Set([cur?.monster ?? "", ...flips])].filter(Boolean);
      let best: { monster: string; pieces: Map<string, number>; H1: number; mk: ReturnType<typeof makeHours> } | undefined;
      for (const m of short) {
        const mon = monsterOf(m)!;
        // H1: per level to the gate, the better of the pool's own pick and this monster with the new set
        const h1 = (r: GearRecommendation): number => {
          if (!wins(r, world)) return Infinity;
          const sec = killSec(ch, world, m, r);
          let h = 0;
          for (let l = L; l < end; l++) {
            const xp = fightXp(mon.level, mon.hp, mon.type, l);
            h += Math.min(own(l), xp > 0 ? (xpNeeded[l] ?? Infinity) / ((xp / sec) * 3600) : Infinity);
          }
          return h;
        };
        const n = fightNeed(ch, world, m, c.fight, H0, h1);
        if (n && (!best || n.mk.G + n.H1 < best.mk.G + best.H1)) best = { monster: m, ...n };
      }
      if (best) {
        const s = bundleScore(b, best.mk.G + best.H1 + rest + (unpaced * best.H1) / Math.max(1, end - L), calH);
        push({ work: `combat ${L} → ${end}${end < b.next ? ` (of ${b.next})` : ""}`, key: `lvl:combat:${b.next}`, monster: best.monster, pieces: best.pieces, H0, H1: best.H1, G: best.mk.G, parts: best.mk.parts, points: s.points, fit: s.fit, any: s.any, hours: s.hours, offered: best.mk.offered });
      }
    }

    // (c) a tool per gathering role: the lane's next gate, or an open gathering objective of the lane
    for (const lane of rolesFor(world)[ch.name] ?? []) {
      if (!GATHER_LANES.includes(lane) || !c.tools.length) continue;
      const cut0 = gatherCut(ch, world, lane);
      const tool = c.tools.map((code) => ({ code, cut: toolCut(code, lane) })).filter((x) => x.cut > cut0).sort((a, b) => b.cut - a.cut || (a.code < b.code ? -1 : 1))[0];
      if (!tool) continue;
      const pieces = new Map([[tool.code, 1]]);
      const mk = makeHours(pieces, ch, world);
      const ratio = (1 - tool.cut) / (1 - cut0); // shortcut: the whole work's hours scale with the gather cooldown
      const lb = bundleOf(lane, ch.name, world);
      if (lb && Number.isFinite(lb.hGate)) {
        const H0 = lb.hGate, H1 = H0 * ratio;
        if (mk.G + H1 <= NEED_RATIO * H0) {
          const s = bundleScore(lb, mk.G + H1, calH);
          push({ work: `${lane} ${levelOf(ch, lane)} → ${lb.next} (tool)`, key: `lvl:${lane}:${lb.next}`, pieces, H0, H1, G: mk.G, parts: mk.parts, points: s.points, fit: s.fit, any: s.any, hours: s.hours, offered: mk.offered });
        }
      }
      for (const t of targetsOf(world)) {
        if (t.work.kind !== "gather" || !t.achievement || t.filler || !t.gates.every((g) => met(g, ch, world))) continue;
        const r = catalog().resources.get(t.work.resource);
        if (r?.skill !== lane) continue;
        const H0 = hoursOf(t, ch, world), H1 = H0 * ratio;
        if (!(mk.G + H1 <= NEED_RATIO * H0)) continue;
        const pts = t.points * (world.config.weight[t.achievement] ?? 1), hours = mk.G + H1;
        push({ work: `${t.achievement} (${t.work.resource}, tool)`, key: t.key, pieces, H0, H1, G: mk.G, parts: mk.parts, points: pts, fit: hours <= calH ? pts / hours : 0, any: pts / hours, hours, offered: mk.offered });
      }
    }
  }

  // (b) open kill and drop objectives: the fleet's work (settled point 4 of task 011)
  const inFlight = (key: string): number => Object.entries(world.current).reduce((s, [n, x]) => s + (n !== name && x && x.target === key && x.as !== "level" && x.as !== "fallback" ? x.units : 0), 0);
  for (const t of targetsOf(world)) {
    if (t.work.kind !== "kill" || !t.achievement || t.filler) continue;
    const m = monsterOf(t.work.monster);
    const left = t.left - inFlight(t.key);
    if (!m || left <= 0) continue;
    const per = perOf(t.work);
    const able = world.characters.filter((ch) => isOn(ch.name, world) && t.gates.every((g) => g.kind === "win" || met(g, ch, world)));
    let H0 = Infinity;
    for (const ch of able) if (safeWin(ch, world, m.code)) H0 = Math.min(H0, (left * actionSec(t.work, ch, world) * per) / 3600);
    let best: Need | undefined;
    for (const ch of able) {
      const c = candidatesOf(ch, world);
      if (!c.fight.length || m.level > ch.level + 10 || !(gMin(ch, c.fight) <= NEED_RATIO * H0)) continue; // G + H1 ≤ 0.85 × H0 cannot hold: no solve
      const n = fightNeed(ch, world, m.code, c.fight, H0, (r) => Math.min(H0, (left * killSec(ch, world, m.code, r) * per) / 3600));
      if (!n || (best && (n.mk.G + n.H1 > best.G + best.H1 || (n.mk.G + n.H1 === best.G + best.H1 && ch.name > best.for)))) continue;
      const pts = t.points * (world.config.weight[t.achievement] ?? 1);
      const rest = achHours(t.achievement, ch.name, world) - hoursOf(t, ch, world); // the achievement's other objectives
      const hours = n.mk.G + n.H1 + Math.max(0, Number.isFinite(rest) ? rest : 0);
      best = { for: ch.name, work: `${t.achievement} (${m.code})`, key: t.key, monster: m.code, pieces: n.pieces, H0, H1: n.H1, G: n.mk.G, parts: n.mk.parts, points: pts, fit: hours <= calH ? pts / hours : 0, any: pts / hours, hours, offered: n.mk.offered };
    }
    if (best) needs.push(best);
  }
  const out = { needs, rejected };
  byName.set(name, out);
  return out;
}
