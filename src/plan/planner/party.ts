// Task 039: a boss fought by two or three of ours — the solver's party and its verdict. Pure; nothing decides with it yet
// (the party's step is task 039b).
//
// Each member wears the set the solver gives it (bis.ts bestInSlot on fightOptions' pool — the bank less what the members
// before it took, plus its own worn set; the stage's craftable pieces too where the member's level is given), and the party
// fights the boss by the game's rules (sim/combat.ts simulateParty). A solo solve against a boss nobody beats alone ranks its
// sets by turns survived (bis.ts), so it dresses a tank and never a striker. So each member is solved two ways — against the
// boss as it is (the tank) and against its share of the boss's HP with no attack nor self-heal (a striker: the fewest seconds a
// win, its damage) — and of the 2^n parties the one with the best verdict is kept: the highest p, then the fewest turns (a party that never wins:
// the least of the boss's HP left).
// shortcut: no search over the party's sets as one (threat and HP as a tank's), and the best of 2^n by p is a little
// optimistic (each p has 2.2 points of standard error at 0.75); upgrade if a boss sits on the floor.

import { item, monster as monsterOf } from "../../catalog";
import { bestInSlot } from "../bis";
import { applyGear, baseStats } from "../../sim/stats";
import { partyRate } from "../../sim/monte";
import type { PartyMember } from "../../sim/combat";
import { ownedQtyOf } from "../jobgear";
import { candidatesOf } from "./gear";
import { MEMO_CAP, chAt, fightOptions, minWinOf, potionPrice } from "./reach";
import { stageOf } from "./stage";
import { poolBank } from "./stock";
import type { Character } from "../../types/api";
import type { Monster } from "../../types/catalog";
import type { World } from "./types";

export interface PartyPlan {
  boss: string;
  p: number;
  admitted: boolean; // p at the floor (config.risk.minWin), as a solo fight
  /** A won fight's turns, every actor's action one turn; each member's cooldown is turns × 2 s. */
  turns: number;
  members: { name: string; level: number; as: "tank" | "striker"; codes: string[]; threat: number; maxHp: number; lost: number; fell: number }[];
  /** The HP a win costs the party: each member's loss in a win and, (1 − p) ÷ p times, its waking at 1 HP. */
  hpPerWin: number;
  /** Over all its fights, the share of the boss's HP left: what ranks parties that never win. */
  left: number;
}

/** The threat of a set: its pieces' `threat` (the API's Character.threat is the worn items' sum, 0 bare). */
const threatOf = (codes: string[]): number => codes.reduce((t, c) => t + (item(c)?.effects ?? []).reduce((s, e) => s + (e.code === "threat" ? e.value : 0), 0), 0);
/** A striker's share of the boss: its HP over the party, no attack and no self-heal (a share one member cannot finish before
 *  the boss heals whole loses whatever the set, and a lost solve ranks by turns survived), a code of its own. */
const share = (m: Monster, n: number): Monster => ({ ...m, code: `${m.code}/${n}`, hp: Math.ceil(m.hp / n), attack_fire: 0, attack_earth: 0, attack_water: 0, attack_air: 0, effects: m.effects.filter((e) => e.code !== "reconstitution" && e.code !== "healing") });

/** The stage's craftable pieces for a member at its level (gear.ts candidatesOf, crafts at the stage's numbers), no market. */
function stagePieces(ch: Character, world: World): string[] {
  const crafts = stageOf(world)?.crafts;
  return candidatesOf(ch, world).fight.filter((c) => { const r = item(c)?.craft; return !r || !crafts?.[r.skill] || r.level <= crafts[r.skill]; });
}

const memo = new WeakMap<World, Map<string, string[]>>();
/** One member's set: the solver on its pool less what the members before it took (`taken`). */
function setOf(ch: Character, world: World, base: World, m: Monster, taken: Map<string, number>, extra: string[]): string[] {
  let byKey = memo.get(base);
  if (!byKey) memo.set(base, (byKey = new Map()));
  const key = `${ch.name}@${ch.level}|${m.code}|${[...taken].sort().join(",")}|${extra.join(",")}`;
  const hit = byKey.get(key);
  if (hit) return hit;
  const o = fightOptions(ch, world, m.code.split("/")[0]);
  // the pool caps a code at the copies one fighter wears; what the members before it took counts against the stock
  const qty = new Map(o.ownedQty), stock = ownedQtyOf(ch, poolBank(world, ch.name));
  for (const [c, q] of taken) { if (!qty.has(c)) continue; const left = (stock.get(c) ?? 0) - q; if (left > 0) qty.set(c, Math.min(qty.get(c)!, left)); else qty.delete(c); }
  const codes = bestInSlot(ch, m, { ...o, owned: new Set(qty.keys()), ownedQty: qty, extraCandidates: [...(o.extraCandidates ?? []), ...extra], wayBack: 0 })[0]?.codes ?? [];
  byKey.set(key, codes);
  return codes;
}

/**
 * The party of `names` against a boss (a catalog code, or a made-up monster), each member at its level now or at `levels`'
 * (chAt: the same character at another combat level; a member given a level may wear the stage's craftable pieces of that
 * level — the stage in force with the members at their levels). Undefined for a monster the catalog does not know.
 */
export function partyPlan(world: World, names: string[], boss: Monster | string, levels: Record<string, number> = {}): PartyPlan | undefined {
  const m = typeof boss === "string" ? monsterOf(boss) : boss;
  if (!m) return undefined;
  // task 039b (B): the members at their own levels are the World's (its market's bought candidates too, as gear by need has them)
  const own = Object.entries(levels).every(([n, L]) => world.characters.find((c) => c.name === n)?.level === L);
  const at = own ? world : { ...world, market: undefined, characters: world.characters.map((c) => (levels[c.name] != null ? chAt(c, levels[c.name]) : c)) };
  const chars = names.map((n) => at.characters.find((c) => c.name === n)).filter((c): c is Character => !!c);
  if (chars.length !== names.length) return undefined;
  // a member's craftable pieces on a World of its own (candidatesOf keeps one answer per World and name), once a level and stage
  let byKey = memo.get(world);
  if (!byKey) memo.set(world, (byKey = new Map()));
  const extras = chars.map((c) => {
    if (levels[c.name] == null) return [];
    const k = `pieces|${c.name}@${c.level}|${stageOf(at)?.name ?? ""}`;
    let v = byKey!.get(k);
    if (!v) byKey!.set(k, (v = stagePieces(c, at === world ? world : { ...at })));
    return v;
  });
  // task 039b (B): one answer a party's content — what each member's solves read (its base stats, its pool and the stock behind
  // it, the free extras, the potions' prices, the pinned artifacts, the floor, the stage's pieces) — so the forward model, a new
  // World every decision, solves a party again only when one of them moves
  const key = `${m.code}:${m.hp}#` + chars.map((c, i) => {
    const o = fightOptions(c, at, m.code), stock = ownedQtyOf(c, poolBank(at, c.name));
    return [c.name, c.level, Object.values(baseStats(c)).join(","), [...o.ownedQty!.keys()].sort().map((k) => `${k}:${stock.get(k)}`).join(","), (o.extraCandidates ?? []).join(","), potionPrice(at, c.name).key, (o.fixed ?? []).join(","), o.minWin, extras[i].join(",")].join("|");
  }).join("&");
  if (plans.has(key)) return plans.get(key);
  if (plans.size >= MEMO_CAP) plans.clear();
  const modes = [m, share(m, chars.length)];
  let best: PartyPlan | undefined;
  for (let combo = 0; combo < 1 << chars.length; combo++) {
    const taken = new Map<string, number>();
    const sets = chars.map((c, i) => {
      const codes = setOf(c, at, world, modes[(combo >> i) & 1], taken, extras[i]);
      for (const x of codes) taken.set(x, (taken.get(x) ?? 0) + 1);
      return codes;
    });
    const party: PartyMember[] = chars.map((c, i) => ({ fighter: applyGear(baseStats(c), sets[i]), threat: threatOf(sets[i]) }));
    const r = partyRate(party, m);
    if (best && (r.p < best.p || (r.p === best.p && (r.p > 0 ? r.turns >= best.turns : r.left >= best.left)))) continue;
    const members = chars.map((c, i) => ({ name: c.name, level: c.level, as: (((combo >> i) & 1) ? "striker" : "tank") as "tank" | "striker", codes: sets[i], threat: party[i].threat, maxHp: party[i].fighter.stats.hp, lost: r.lost[i], fell: r.fell[i] }));
    const wake = r.p > 0 ? (1 - r.p) / r.p : Infinity;
    best = { boss: m.code, p: r.p, admitted: r.p >= minWinOf(world), turns: r.turns, members, hpPerWin: members.reduce((t, x) => t + x.lost + wake * (x.maxHp - 1), 0), left: r.left };
  }
  plans.set(key, best);
  return best;
}
const plans = new Map<string, PartyPlan | undefined>();

/** Task 039b (B, C.1): the smallest party of `members` (two, then three) admitted against the boss, each at its own level in
 *  the stage's pieces; of one size the highest p, then the fewest turns. */
export function smallestParty(world: World, boss: Monster | string, members: Character[]): PartyPlan | undefined {
  const names = members.map((c) => c.name);
  for (const n of [2, 3]) {
    const parties: string[][] = [];
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      if (n === 2) parties.push([names[i], names[j]]);
      else for (let k = j + 1; k < names.length; k++) parties.push([names[i], names[j], names[k]]);
    }
    let best: PartyPlan | undefined;
    for (const party of parties) {
      const r = partyPlan(world, party, boss, Object.fromEntries(members.filter((c) => party.includes(c.name)).map((c) => [c.name, c.level])));
      if (r?.admitted && (!best || r.p > best.p || (r.p === best.p && r.turns < best.turns))) best = r;
    }
    if (best) return best;
  }
  return undefined;
}

/** The lowest level of `third` — from its own to the level cap (50) — at which it and `pair` are admitted against the boss,
 *  the pair at `levels` (now when left out) and the third wearing the stage's pieces of its level; undefined: none. */
export function lowestThird(world: World, pair: string[], third: string, boss: Monster | string, levels: Record<string, number> = {}): number | undefined {
  const from = world.characters.find((c) => c.name === third)?.level ?? 1;
  for (let k = from; k <= 50; k++) if (partyPlan(world, [...pair, third], boss, { ...levels, [third]: k })?.admitted) return k;
  return undefined;
}
