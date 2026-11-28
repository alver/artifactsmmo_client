// Gear by need (task 009 section 4). One rule for flips and speed-ups alike: a set of craftable pieces is needed
// for a work when making them and then doing the work takes at most NEED_RATIO of the work's hours without them
// (G + H1 ≤ 0.85 × H0; a win that is not there is ∞ hours, so a flip always qualifies). Task 037: with a stage's `pieces`,
// (a) and (b) take (c)'s rule, G ≤ H0 − H1 (ratioOf).
//
// The work a piece can serve:
//   (a) per character that is on, its road to its next combat gate (rule 3's bundle) — the XP monster;
//   (b) task 011: an open kill or drop objective is the fleet's work, not each fighter's — what is left of it less the
//       units of the others' running steps on it, done by whoever is best placed: H0 is the least hours among the
//       characters that are on, meet its other gates and win the monster as config.risk asks with their own pool (∞
//       only when none does); a need of X holds when G + H1(X) ≤ NEED_RATIO × that H0, and an objective has at most
//       one need — the character with the least G + H1, ties to the name;
//   (c) task 027c: per gathering lane, all that is left of it — the road to its last open gate and its open gathering
//       objectives — a tool for its one holder, needed when it pays for itself over that work: G ≤ H0 − H1 (NEED_RATIO
//       is (a)'s and (b)'s: from iron to steel H1 is 0.875 × H0, so G + H1 ≤ 0.85 × H0 could never hold). One need a lane.
//       Task 027d (Alex): it ranks by its payback — the bundle's points × the share of the lane's hours it saves ÷ the hours
//       to make it, `points × (H0 − H1) ÷ H0 ÷ G`, fit when G fits the calendar.
// Task 027: (a) and (b) are the fighters' (roles.ts fights: a character with no role too) — a worker has no combat road
// and takes no kill objective. The same in consumables.ts consumableNeeds.
// Candidates: pieces with a recipe the character can equip now (a piece its pool already holds is simply not new),
// no rune, artifact, utility or bag, at most ten levels below it (task 032b: or below, where its slot has none inside the ten
// levels and it beats the piece worn there), whose bill of materials is in reach (bank stock
// counts), that someone who is on can source and that have a crafter; the rest are listed as rejected, with why.
// Task 032c (decision 87, Alex: the market, carefully — what the fleet cannot make): a wearable in that window that is no such
// candidate (no recipe, no crafter, a bill out or infinite) and stands in `world.market` is a bought candidate when its lowest
// ask passes the market's fair price (a reference from trades) and purse (market.ts marketQuote; a reference unread yet counts
// as fair, the purchase waits for it) — never a tool, at most BOUGHT_PER_SLOT a slot beside PER_SLOT's (the highest level,
// then the lowest ask); its G is its gold at goldPerHour plus the trip (no bill, crafter or level road), it is a need by the
// same rule and bought by the market's step, never made (`Need.bought`, `Piece.bought`: no recipe demand). No market: none.
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
import { canEquip } from "../bis";
import { ownedQtyOf } from "../jobgear";
import { CRAFT_SEC, fightSec, fightXp } from "../xp";
import { atlas } from "../../catalog/atlas";
import { GATHER_LANES, NEED_RATIO } from "./config";
import { actionSec, hoursOf, hoursToLevel, killWalk, levelHoursEstimate, levelOf, makePlace, perOf, stepSec } from "./cost";
import { achHours, bundleOf, bundleScore } from "./bundle";
import { isOn, met } from "./gates";
import { pickMonster } from "./pick";
import { fightSecOf, gatherCut, nearestSpot, placeOf, planRec, admitted, setWisdom, toolCut, admits } from "./reach";
import { crafterOf, fights, rolesOf } from "./roles";
import { poolBank } from "./stock";
import { billOf, fleetSec, recipeDemand } from "./supply";
import type { Parent } from "./supply";
import { perUnit, targetsOf } from "./targets";
import { smallestParty } from "./party";
import { stageOf } from "./stage";
import { bestOrder, marketQuote } from "./market";
import { GEAR_SLOTS, SLOTS_FOR_TYPE, slotCode } from "../../types/api";
import type { Character } from "../../types/api";
import type { GearRecommendation } from "../types";
import type { Lane, Target, World } from "./types";

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
  bought?: string[];               // task 032c: the pieces bought on the market, not made
}
export interface Rejected { for: string; piece: string; why: string }

const FLIPS = 4, PER_SLOT = 3, DROPS = 3, BOUGHT_PER_SLOT = 2;
// Task 037 (Alex, 11-27: six minutes of work is nothing — such things are to be made): with a stage's `pieces` every fight
// candidate is a listed piece (candidatesOf), and (a) and (b) take (c)'s rule, G ≤ H0 − H1 — written G + H1 ≤ 1 × H0, so ∞
// reads as before; NEED_RATIO for a World with no stage or a stage with no list.
const ratioOf = (world: World): number => (stageOf(world)?.pieces ? 1 : NEED_RATIO);
const calHOf = (world: World): number => Math.max(0, (Date.parse(world.config.deadline) - world.now) / 3.6e6);
const solve = planRec;

/** Seconds per kill as cost.ts prices it, for a solved set: the fight and the rest × the log, plus the bank trips. */
const killSec = (ch: Character, world: World, monster: string, r: GearRecommendation): number =>
  fightSecOf(r, world, ch.name, monster) + killWalk(ch, world, monster);

interface Cands { fight: string[]; tools: string[]; rejected: Rejected[]; bought: Set<string> }
type OnSale = { code: string; level: number; ask: number };
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
  // task 032b: more than ten levels below the character, a piece is a candidate only where its slot has none inside the ten
  // levels and it beats the piece worn there (the slime shield at combat 31: no shield of 21–31 in reach, an iron shield worn);
  // an empty slot takes none, as before
  const worn = (type: string): number => Math.min(...(SLOTS_FOR_TYPE[type] ?? []).map((s) => item(slotCode(ch, s) ?? "")?.level ?? 0));
  const low = new Map<string, string[]>(), lowRejected = new Map<string, Rejected[]>();
  const buyIn = new Map<string, OnSale[]>(), buyLow = new Map<string, OnSale[]>(); // task 032c: bought, inside and below the window
  const listed = stageOf(world)?.pieces; // task 036 (A.2): with a stage's pieces, only a wearable on the list (made or bought)
  for (const it of catalog().items.values()) {
    if (!SLOTS_FOR_TYPE[it.type] || ["utility", "bag", "rune", "artifact"].includes(it.type)) continue;
    if (listed && it.subtype !== "tool" && !listed.includes(it.code)) continue;
    const order = world.market && it.subtype !== "tool" ? bestOrder(world, it.code, ch.name) : undefined; // task 032c: never a tool
    if (!it.craft && !order) continue;
    const below = it.level < ch.level - 10;
    if (!canEquip(ch, it) || (below && (it.subtype === "tool" || !(it.level > worn(it.type)) || !(worn(it.type) > 0)))) continue;
    const reject = (why: string): void => void (below ? lowRejected.set(it.type, [...(lowRejected.get(it.type) ?? []), { for: ch.name, piece: it.code, why }]) : rejected.push({ for: ch.name, piece: it.code, why }));
    // task 032c (A.1): what the fleet cannot make is a bought candidate while it is on sale and the market takes it
    const buy = (why: string): void => {
      const q = order && marketQuote(world, ch.name, it.code, 1);
      if (!q) return void (it.craft && reject(why));
      if (q.hours == null) return reject(`${itemName(it.code)}: ${q.why}`);
      const m = below ? buyLow : buyIn;
      m.set(it.type, [...(m.get(it.type) ?? []), { code: it.code, level: it.level, ask: order!.price }]);
    };
    if (!it.craft) { buy("no recipe"); continue; }
    const crafter = crafterOf(it.craft.skill, world);
    if (!crafter) { buy(`no crafter of ${it.craft.skill}`); continue; }
    // in reach = nothing in its tree out of reach (bank stock counts), and someone that is on can source every leaf
    const bill = billOf(world, ch.name, recipeDemand(it.code, 1));
    if (bill.out.length) { buy(bill.out.join("; ")); continue; }
    if (!Number.isFinite(bill.hours)) {
      const who = [...bill.leaves.values()].filter((l) => l.kind === "src" && !l.gates.some((g) => g.kind === "event") && !Number.isFinite(fleetSec(l.work, l.gates, world))).map((l) => itemName(l.code));
      const road = bill.gated.filter((g) => !Number.isFinite(g.hours)).map((g) => `${g.lane} ${g.level} for ${itemName(g.code)}`); // task 012
      const ev = bill.events.filter((e) => !Number.isFinite(e.hours)).map((e) => `${itemName(e.code)} (${e.event})`); // task 013
      buy([who.length ? `nobody that is on sources ${who.join(", ")} yet` : "", road.length ? `no XP source on the way to ${road.join(", ")}` : "", ev.length ? `nobody can ever be a member of the event for ${ev.join(", ")}` : ""].filter(Boolean).join("; "));
      continue;
    }
    if (it.subtype === "tool") tools.push(it.code);
    else (below ? low : bySlot).set(it.type, [...((below ? low : bySlot).get(it.type) ?? []), it.code]);
  }
  const inside = new Set(bySlot.keys());
  for (const [type, cs] of low) if (!inside.has(type)) bySlot.set(type, cs);
  for (const [type, rs] of lowRejected) if (!inside.has(type)) rejected.push(...rs);
  const fight = [...bySlot.values()].flatMap((cs) => cs.sort((a, b) => (item(b)!.level - item(a)!.level) || (a < b ? -1 : 1)).slice(0, PER_SLOT));
  // task 032c (A.4): beside them at most BOUGHT_PER_SLOT bought a slot (the window as above: below only where nothing is inside)
  for (const [type, cs] of buyLow) if (!inside.has(type) && !buyIn.has(type)) buyIn.set(type, cs);
  const bought = new Set<string>();
  for (const cs of buyIn.values()) {
    cs.sort((a, b) => b.level - a.level || a.ask - b.ask || (a.code < b.code ? -1 : 1));
    for (const c of cs.slice(0, BOUGHT_PER_SLOT)) { bought.add(c.code); fight.push(c.code); }
    for (const c of cs.slice(BOUGHT_PER_SLOT)) rejected.push({ for: ch.name, piece: c.code, why: `on sale, beyond the ${BOUGHT_PER_SLOT} bought candidates a slot` });
  }
  const out = { fight, tools, rejected, bought };
  byName.set(ch.name, out);
  return out;
}

/** G: the hours to make these pieces — their bill (supply), the crafts, and each crafter's levels where its skill is short. */
function makeHours(pieces: Map<string, number>, ch: Character, world: World): { G: number; parts: Need["parts"]; offered: boolean } {
  const demand: [string, number][] = [];
  let crafts = 0, offered = true;
  const lv = new Map<string, number>(); // crafter|skill → the highest recipe level asked
  const bought = candidatesOf(ch, world).bought;
  let gold = 0; // task 032c: a bought piece's gold at goldPerHour plus the trip — no bill, crafter or level road
  for (const [code, n] of pieces) {
    if (bought.has(code)) { gold += marketQuote(world, ch.name, code, n)?.hours ?? Infinity; continue; }
    const r = item(code)!.craft!;
    demand.push(...recipeDemand(code, n));
    crafts += (n * CRAFT_SEC + stepSec(makePlace({ kind: "craft", code }, world))) / 3600; // task 012: once per piece code
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
  return { G: bill.hours + crafts + levels + gold, parts: { supply: bill.hours - bill.crafts + gold, crafts: crafts + bill.crafts, levels }, offered };
}

/** The new pieces of a solved set (codes the pool does not hold, with their copies). */
function newPieces(r: GearRecommendation, ch: Character, world: World): Map<string, number> {
  const pool = ownedQtyOf(ch, poolBank(world, ch.name));
  const used = new Map<string, number>();
  // task 031: a potion is no piece (candidatesOf leaves utilities out; row B's free potions are at hand, not made — with alchemy
  // nobody's lane its crafter is nobody)
  for (const c of r.codes) if (item(c)?.type !== "utility") used.set(c, (used.get(c) ?? 0) + 1);
  const out = new Map<string, number>();
  for (const [c, n] of used) if (n > (pool.get(c) ?? 0)) out.set(c, n - (pool.get(c) ?? 0));
  const bought = candidatesOf(ch, world).bought; // task 032c: or the market sells it
  return [...out.keys()].every((c) => item(c)?.craft || bought.has(c)) ? out : new Map(); // a copy short that no recipe makes: no set
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
    if (!r || !admits(r, world)) break;
    const pieces = newPieces(r, ch, world);
    if (!pieces.size) break; // it wins without a new piece
    const H1 = h1(r), mk = makeHours(pieces, ch, world);
    if (mk.G + H1 <= ratioOf(world) * H0) best = { pieces, H1, mk };
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

/** Task 032c: the bought pieces of a set, for its Need. */
const boughtOf = (pieces: Map<string, number>, c: Cands): { bought?: string[] } => { const b = [...pieces.keys()].filter((x) => c.bought.has(x)); return b.length ? { bought: b } : {}; };

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
  const holders = rolesOf(world.characters, world.config, []); // no targets: no event lane's second and third gatherer
  for (const ch of world.characters) {
    if (!isOn(ch.name, world)) continue;
    const c = candidatesOf(ch, world);
    rejected.push(...c.rejected);
    const L = ch.level;
    const push = (n: Omit<Need, "for">): void => void needs.push({ for: ch.name, ...n });

    // (a) the road to the next combat gate, judged on its next ten levels at most (the levels section 2 solves; a far
    // gate — grand_master at 50 — is reached a wall at a time); the score's hours run to the gate or the wall
    const b = fights(ch.name, world) ? bundleOf("combat", ch.name, world) : null; // task 027: a worker has no combat road
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
      const flips = [...catalog().monsters.values()].filter((m) => m.level <= L + 2 && ok(m.code) && !admitted(ch, world, m.code))
        .sort((x, y) => fightXp(y.level, y.hp, y.type, L) - fightXp(x.level, x.hp, x.type, L) || (x.code < y.code ? -1 : 1)).slice(0, cur ? FLIPS : Infinity).map((m) => m.code);
      const short = [...new Set([cur?.monster ?? "", ...flips])].filter(Boolean);
      let best: { monster: string; pieces: Map<string, number>; H1: number; mk: ReturnType<typeof makeHours> } | undefined;
      for (const m of short) {
        const mon = monsterOf(m)!;
        // H1: per level to the gate, the better of the pool's own pick and this monster with the new set
        const h1 = (r: GearRecommendation): number => {
          if (!admits(r, world)) return Infinity;
          const sec = killSec(ch, world, m, r), wis = setWisdom(ch, r); // task 012: XP with the new set's wisdom
          let h = 0, pace = Infinity;
          for (let l = L; l < end; l++) {
            const xp = fightXp(mon.level, mon.hp, mon.type, l, wis);
            const hl = Math.min(own(l), xp > 0 ? (xpNeeded[l] ?? Infinity) / ((xp / sec) * 3600) : Infinity);
            if (Number.isFinite(hl)) pace = hl;
            h += Number.isFinite(hl) ? hl : pace; // task 027e (C.2): a walled level at the pace of the last level priced, as `rest`
          }
          return h;
        };
        const n = fightNeed(ch, world, m, c.fight, H0, h1);
        if (n && (!best || n.mk.G + n.H1 < best.mk.G + best.H1)) best = { monster: m, ...n };
      }
      if (best) {
        const s = bundleScore(b, best.mk.G + best.H1 + rest + (unpaced ? (unpaced * best.H1) / Math.max(1, end - L) : 0), calH); // 027e: never 0 × ∞
        push({ work: `combat ${L} → ${end}${end < b.next ? ` (of ${b.next})` : ""}`, key: `lvl:combat:${b.next}`, monster: best.monster, pieces: best.pieces, H0, H1: best.H1, G: best.mk.G, parts: best.mk.parts, points: s.points, fit: s.fit, any: s.any, hours: s.hours, offered: best.mk.offered, ...boughtOf(best.pieces, c) });
      }
    }

    // (c) task 027c: a tool for the lane's one holder (no event lane's extra gatherer) when it pays for itself over all
    // that is left of the lane — the road to its last open gate and its open gathering objectives: G ≤ H0 − H1
    for (const lane of holders[ch.name] ?? []) {
      if (!GATHER_LANES.includes(lane) || !c.tools.length) continue;
      const cut0 = gatherCut(ch, world, lane);
      // Alex (027c): the lowest-level tool that improves on the one held and pays; the next tier is judged once that one is held
      const tools = c.tools.map((code) => ({ code, cut: toolCut(code, lane) })).filter((x) => x.cut > cut0).sort((a, b) => item(a.code)!.level - item(b.code)!.level || b.cut - a.cut || (a.code < b.code ? -1 : 1));
      if (!tools.length) continue;
      const L = levelOf(ch, lane);
      const objs = targetsOf(world).filter((t) => t.work.kind === "gather" && t.achievement && !t.filler && catalog().resources.get(t.work.resource)?.skill === lane && t.gates.every((g) => (g.kind === "level" && g.lane === lane) || met(g, ch, world)));
      const last = Math.max(L, ...targetsOf(world).map((t) => (t.work.kind === "level" && t.work.lane === lane ? t.work.to : 0)));
      let H0 = objs.reduce((s, t) => s + hoursOf(t, ch, world), 0);
      for (let l = L; l < last; l++) { const h = hoursToLevel(lane, l, l + 1, world, ch); if (!Number.isFinite(h)) break; H0 += h; } // the road as far as it goes
      if (!(H0 > 0)) continue;
      let pick: { tool: (typeof tools)[number]; H1: number; mk: ReturnType<typeof makeHours> } | undefined;
      for (const tool of tools) {
        const H1 = H0 * ((1 - tool.cut) / (1 - cut0)); // shortcut: the whole work's hours scale with the gather cooldown
        const mk = makeHours(new Map([[tool.code, 1]]), ch, world);
        if (mk.G <= H0 - H1) { pick = { tool, H1, mk }; break; }
      }
      if (!pick) continue;
      const { tool, H1, mk } = pick, pieces = new Map([[tool.code, 1]]);
      const lb = bundleOf(lane, ch.name, world);
      const s0 = lb && Number.isFinite(lb.hGate) ? bundleScore(lb, mk.G + H1, calH)
        : ((points, hours) => ({ points, hours }))(objs.reduce((p, t) => p + t.points * (world.config.weight[t.achievement!] ?? 1), 0), mk.G + H1);
      const any = (s0.points * (H0 - H1)) / H0 / Math.max(mk.G, 1e-6); // task 027d (Alex): its payback, not the lane's whole hours
      const s = { ...s0, any, fit: mk.G <= calH ? any : 0 };
      push({ work: `${lane} ${L} → ${last} and ${objs.length} gathering objective${objs.length === 1 ? "" : "s"} (tool: ${(H0 - H1).toFixed(1)} h saved)`, key: lb && Number.isFinite(lb.hGate) ? `lvl:${lane}:${lb.next}` : objs[0]?.key ?? `lvl:${lane}:${last}`, pieces, H0, H1, G: mk.G, parts: mk.parts, points: s.points, fit: s.fit, any: s.any, hours: s.hours, offered: mk.offered });
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
    // task 013: an event monster's kill objective is a need like any other — its work is done at the spawns
    const evOn = !!(world.config.events ?? 1);
    const able = world.characters.filter((ch) => isOn(ch.name, world) && fights(ch.name, world) && t.gates.every((g) => g.kind === "win" || (evOn && g.kind === "event") || met(g, ch, world)));
    let H0 = Infinity;
    for (const ch of able) if (admitted(ch, world, m.code)) H0 = Math.min(H0, (left * actionSec(t.work, ch, world) * per) / 3600);
    let best: Need | undefined;
    for (const ch of able) {
      const c = candidatesOf(ch, world);
      if (!c.fight.length || m.level > ch.level + 10 || !(gMin(ch, c.fight) <= ratioOf(world) * H0)) continue; // G + H1 ≤ ratio × H0 cannot hold: no solve
      const n = fightNeed(ch, world, m.code, c.fight, H0, (r) => Math.min(H0, (left * killSec(ch, world, m.code, r) * per) / 3600));
      if (!n || (best && (n.mk.G + n.H1 > best.G + best.H1 || (n.mk.G + n.H1 === best.G + best.H1 && ch.name > best.for)))) continue;
      const pts = t.points * (world.config.weight[t.achievement] ?? 1);
      const rest = achHours(t.achievement, ch.name, world) - hoursOf(t, ch, world); // the achievement's other objectives
      const hours = n.mk.G + n.H1 + Math.max(0, Number.isFinite(rest) ? rest : 0);
      best = { for: ch.name, work: `${t.achievement} (${m.code})`, key: t.key, monster: m.code, pieces: n.pieces, H0, H1: n.H1, G: n.mk.G, parts: n.mk.parts, points: pts, fit: hours <= calH ? pts / hours : 0, any: pts / hours, hours, offered: n.mk.offered, ...boughtOf(n.pieces, c) };
    }
    if (best) needs.push(best);
  }

  // (d) task 039b (B): a boss a listed achievement asks — the smallest party of fighters that passes the floor with every listed
  // piece made (party.ts smallestParty); the pieces of its winning set its members lack (on the stage's list, not in the bank)
  // are asked for the member the solver gives each to, one need a piece, so the cheapest chain goes first. Nothing for a boss
  // no party passes; nothing with no stage's achievements (a World with no stages decides as before).
  if (stageOf(world)?.achievements) {
    const listed = stageOf(world)?.pieces;
    const bosses = new Map<string, Target[]>();
    for (const t of targetsOf(world)) if (t.work.kind === "kill" && t.achievement && !t.filler && t.gates.some((g) => g.kind === "group") && t.left - inFlight(t.key) > 0) bosses.set(t.work.monster, [...(bosses.get(t.work.monster) ?? []), t]);
    for (const [boss, ts] of bosses) {
      const able = world.characters.filter((c) => isOn(c.name, world) && fights(c.name, world) && ts.every((t) => t.gates.every((g) => g.kind === "group" || met(g, c, world))));
      const plan = smallestParty(world, boss, able);
      if (!plan) continue;
      const pts = ts.reduce((s, t) => s + t.points * (world.config.weight[t.achievement!] ?? 1), 0);
      // shortcut: a drop at one roll a win (039's unread rule: a roll a member would take a third of it) and a kill at its
      // cooldown alone; upgrade once the first party fights are in the journal
      const kills = ts.reduce((s, t) => s + (t.left - inFlight(t.key)) * (t.work.kind === "kill" && t.work.drop ? perUnit(monsterOf(boss)!.drops, t.work.drop) : 1), 0);
      const H1 = (kills * fightSec(plan.turns)) / 3600;
      const work = `party: ${ts.map((t) => t.achievement).join(", ")} (${boss}: ${plan.members.map((x) => x.name).join(" + ")}, ${Math.round(plan.p * 100)}%)`;
      const took = new Map<string, number>(); // the bank's copies the members before took
      for (const mem of plan.members) {
        const c = world.characters.find((x) => x.name === mem.name)!, cands = candidatesOf(c, world);
        const stock = ownedQtyOf(c, poolBank(world, c.name));
        const used = new Map<string, number>();
        for (const code of mem.codes) if (item(code)?.type !== "utility") used.set(code, (used.get(code) ?? 0) + 1);
        for (const [code, n] of used) {
          const have = Math.max(0, (stock.get(code) ?? 0) - (took.get(code) ?? 0));
          const worn = GEAR_SLOTS.filter((g) => slotCode(c, g) === code).length;
          took.set(code, (took.get(code) ?? 0) + Math.max(0, Math.min(n, have) - worn));
          if (n <= have || (listed && !listed.includes(code)) || !(item(code)?.craft || cands.bought.has(code))) continue;
          const pieces = new Map([[code, n - have]]), mk = makeHours(pieces, c, world), hours = mk.G + H1;
          needs.push({ for: c.name, work, key: ts[0].key, monster: boss, pieces, H0: Infinity, H1, G: mk.G, parts: mk.parts, points: pts, fit: hours <= calH ? pts / hours : 0, any: pts / hours, hours, offered: mk.offered, ...boughtOf(pieces, cands) });
        }
      }
    }
  }
  const out = { needs, rejected };
  byName.set(name, out);
  return out;
}

/** A piece the offered needs ask for: the copies per fighter, whose work each copy is, the best-scoring need. */
export interface Piece { copies: Map<string, number>; works: Map<string, string>; best: Need; bought?: boolean }
/** The pieces of every offered need (rank()'s gear parents; task 013: also the event demand's, events.ts). */
export function gearPieces(world: World, name = ""): Map<string, Piece> {
  const pieces = new Map<string, Piece>();
  for (const n of gearNeeds(world, name).needs) {
    if (!n.offered) continue; // section 7: the crafter is not on
    for (const [code, k] of n.pieces) {
      const e: Piece = pieces.get(code) ?? { copies: new Map(), works: new Map(), best: n };
      e.copies.set(n.for, Math.max(e.copies.get(n.for) ?? 0, k));
      e.works.set(n.for, e.works.has(n.for) ? `${e.works.get(n.for)}; ${n.work}` : n.work); // task 011: each copy says whose work it is
      if (n.fit > e.best.fit || (n.fit === e.best.fit && n.any > e.best.any)) e.best = n;
      if (n.bought?.includes(code)) e.bought = true; // task 032c
      pieces.set(code, e);
    }
  }
  return pieces;
}
/** A piece as a parent of supply: its copies less `inFlight` (the others' gear steps on it), its recipe's materials (task 032c:
 *  none for a piece bought on the market). */
export function pieceParent(code: string, p: Piece, qty: number, world: World, name: string): Parent {
  const demand = p.bought ? [] : recipeDemand(code, qty);
  return { key: `gear:${code}`, label: `${itemName(code)} for ${p.best.for} (${p.best.work})`, points: p.best.points, fit: p.best.fit, any: p.best.any, hours: p.best.hours, demand, gated: billOf(world, name, demand).gated };
}
