// Task 039: a boss fought by two or three of ours — the solver's party and its verdict; task 039b: its pieces are needs (gear.ts
// work (d)); task 039c: the party's step (partyChoice, below; decide.ts takes it, state/planner.ts writes it into every member's
// queue, state/queue.ts runs it). Pure.
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
import { MEMO_CAP, chAt, fightOptions, minWinOf, nearestSpot, placeOf, potionPrice, withToll } from "./reach";
import { healSeconds } from "../bis";
import { fightSec, fightXp, wisdomOf } from "../xp";
import { CHUNK_SEC, MARGIN } from "./config";
import { isOn, met } from "./gates";
import { roleOf } from "./roles";
import { targetsOf } from "./targets";
import { pickMonster } from "./pick";
import { monstersTask } from "./tasks";
import { STACK, poolFood } from "./consumables";
import { available } from "./stock";
import { WEAR_SLOTS } from "./decide";
import { stageOf } from "./stage";
import { poolBank } from "./stock";
import type { Character, GearSlot } from "../../types/api";
import type { Monster } from "../../types/catalog";
import type { Place, Target, Toll, World } from "./types";

export interface PartyPlan {
  boss: string;
  p: number;
  admitted: boolean; // p at the floor (config.risk.minWin), as a solo fight
  /** A won fight's turns, every actor's action one turn; each member's cooldown is turns × 2 s. */
  turns: number;
  members: { name: string; level: number; as: "tank" | "striker"; codes: string[]; slots: Partial<Record<GearSlot, string>>; threat: number; maxHp: number; lost: number; fell: number; use: Record<string, number> }[];
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
const slotMemo = new WeakMap<World, Map<string, Partial<Record<GearSlot, string>>>>();
/** One member's set: the solver on its pool less what the members before it took (`taken`); its slots kept beside (slotsOf). */
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
  const r = bestInSlot(ch, m, { ...o, owned: new Set(qty.keys()), ownedQty: qty, extraCandidates: [...(o.extraCandidates ?? []), ...extra], wayBack: 0 })[0];
  const codes = r?.codes ?? [];
  byKey.set(key, codes);
  let slots = slotMemo.get(base);
  if (!slots) slotMemo.set(base, (slots = new Map()));
  slots.set(codes.join(","), r?.slots ?? {});
  return codes;
}
/** Task 039c: the slots of a set setOf solved (the step's `wear`). */
const slotsOf = (base: World, codes: string[]): Partial<Record<GearSlot, string>> => slotMemo.get(base)?.get(codes.join(",")) ?? {};

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
    const members = chars.map((c, i) => ({ name: c.name, level: c.level, as: (((combo >> i) & 1) ? "striker" : "tank") as "tank" | "striker", codes: sets[i], slots: slotsOf(world, sets[i]), threat: party[i].threat, maxHp: party[i].fighter.stats.hp, lost: r.lost[i], fell: r.fell[i], use: r.used[i] }));
    const wake = r.p > 0 ? (1 - r.p) / r.p : Infinity;
    best = { boss: m.code, p: r.p, admitted: r.p >= minWinOf(world), turns: r.turns, members, hpPerWin: members.reduce((t, x) => t + x.lost + wake * (x.maxHp - 1), 0), left: r.left };
  }
  plans.set(key, best);
  return best;
}
const plans = new Map<string, PartyPlan | undefined>();

/** Task 039b (B, C.1): the smallest party of `members` (two, then three) admitted against the boss, each at its own level in
 *  the stage's pieces (task 039c: `craft` false — in what each holds, the party's step); of one size the highest p, then the
 *  fewest turns. */
export function smallestParty(world: World, boss: Monster | string, members: Character[], craft = true): PartyPlan | undefined {
  const names = members.map((c) => c.name);
  for (const n of [2, 3]) {
    const parties: string[][] = [];
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      if (n === 2) parties.push([names[i], names[j]]);
      else for (let k = j + 1; k < names.length; k++) parties.push([names[i], names[j], names[k]]);
    }
    let best: PartyPlan | undefined;
    for (const party of parties) {
      const r = partyPlan(world, party, boss, craft ? Object.fromEntries(members.filter((c) => party.includes(c.name)).map((c) => [c.name, c.level])) : {});
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

/** Task 039c: the party's step as decide.ts takes it — the boss, the plan, the first kill or a chunk, and each member's share. */
export interface PartyChoice {
  boss: string;
  plan: PartyPlan;
  first: boolean;         // the first kill of a listed kill objective (A.1, B.1); else the boss is every member's pick (B.2)
  target: string;         // the kill objective's key, or party:<boss>
  kills: number;
  cycle: number;          // seconds a win: the fight and the slowest member's healing, over p
  avg: number;            // the party's average level, rounded down
  members: { name: string; wear: Record<string, string>; withdraw: Record<string, number>; toll?: Toll; place: Place; xp: number; rate: number; own: number }[];
}

/**
 * Task 039c: the party's step for `name`, a fighter (undefined: none). For a boss a listed achievement asks (a kill objective
 * with a `group` gate), the smallest party of the fighters that are on, meet its other gates, reach its tile (the key its
 * transition asks, one a character each entry) and are not blocked for it (kill:<boss>@<name>), admitted in what they hold
 * (smallestParty, `craft` false), every member getting XP at the party's average level (035's guard), `name` among them:
 *   - the first kill (A.1, B.1): while the kill objective is open, as soon as the party passes;
 *   - after it (B.2): only while the boss is every member's XP pick — its rate there (the fight XP at the average level with
 *     its set's wisdom over the party's cycle: the fight and the slowest member's healing as 038 counts it, over p; × 1.25
 *     while a listed achievement still asks the boss, as a kill objective's monster is in the pick's bonus) at least its own
 *     pick's (pickMonster with its bonus); else each fights alone. A chunk of kills (CHUNK_SEC over the cycle).
 * Each member's share: its set's slots, the potions its set drinks over the kills (MARGIN kept, a stack at most, of the stock
 * its users share — they cap the chunk: the lich's tank drinks Greater Health Potions, report 039c), the food its losses take
 * (the pool's best food its loss covers, half its bag at most) and its tile's toll.
 * shortcut: the members' food shares overlap the one stock (each `available` less the running steps' reservations) — the bank
 * held about 1,000 trout on 11-28; upgrade if a party's take ever exceeds the stock.
 */
export function partyChoice(world: World, name: string): PartyChoice | undefined {
  if (!stageOf(world)?.achievements) return undefined;
  const inFlight = (key: string): number => Object.entries(world.current).reduce((s, [n, x]) => s + (n !== name && x && x.target === key ? x.units : 0), 0);
  const bosses = new Map<string, Target[]>();
  for (const t of targetsOf(world)) if (t.work.kind === "kill" && t.achievement && !t.filler && t.gates.some((g) => g.kind === "group") && t.left - inFlight(t.key) > 0) bosses.set(t.work.monster, [...(bosses.get(t.work.monster) ?? []), t]);
  const objMonsters = targetsOf(world).flatMap((t) => (t.work.kind === "kill" ? [t.work.monster] : []));
  for (const [boss, ts] of bosses) {
    const m = monsterOf(boss);
    const able = world.characters.filter((c) => isOn(c.name, world) && roleOf(c.name, world) === "fighter" && ts.every((t) => t.gates.every((g) => g.kind === "group" || met(g, c, world))) && !((world.blocked[`kill:${boss}@${c.name}`]?.until ?? 0) > world.now));
    if (!m || !able.some((c) => c.name === name)) continue;
    const plan = smallestParty(world, boss, able, false);
    if (!plan || !plan.members.some((x) => x.name === name)) continue;
    const chs = plan.members.map((x) => world.characters.find((c) => c.name === x.name)!);
    const avg = Math.floor(chs.reduce((s, c) => s + c.level, 0) / chs.length);
    const spots = chs.map((c) => nearestSpot(placeOf(c), "monster", boss, world, c.name));
    const xps = plan.members.map((x) => fightXp(m.level, m.hp, m.type, avg, wisdomOf(x.codes)));
    if (spots.some((s) => !s) || xps.some((x) => !(x > 0))) continue;
    const heal = plan.members.map((x) => { const pr = potionPrice(world, x.name); return healSeconds(x.lost, x.maxHp, pr.price, pr.food?.(x.lost, x.maxHp)); });
    const cycle = (fightSec(plan.turns) + Math.max(...heal)) / plan.p;
    const firstT = ts.find((t) => t.work.kind === "kill" && !t.work.drop && t.left - inFlight(t.key) > 0);
    const bonus = ts.some((t) => t !== firstT) ? 1.25 : 1;
    const rates = xps.map((x) => (x / cycle) * bonus);
    const own = chs.map((c) => { const task = monstersTask(c); return pickMonster(c, world, new Set(task ? [...objMonsters, task] : objMonsters))?.rate ?? 0; });
    if (!firstT && rates.some((r, i) => r < own[i])) continue; // B.2: the boss is every member's pick, else each fights alone
    // the potions each set drinks (a restore potion one a proc), from the stock its users share: they cap the chunk, and a set
    // whose potion the stock cannot give for one fight is no party (its verdict counted on it)
    const users = (code: string): number => plan.members.filter((x) => (x.use[code] ?? 0) > 0).length;
    const share = (code: string, who: string): number => Math.floor(available(code, world, who) / users(code));
    let kills = firstT ? firstT.left - inFlight(firstT.key) : Math.max(1, Math.floor(CHUNK_SEC / cycle));
    for (const [i, x] of plan.members.entries()) for (const [code, u] of Object.entries(x.use)) if (u > 0) kills = Math.min(kills, Math.floor(Math.min(STACK, share(code, chs[i].name)) / (u * MARGIN)));
    if (kills < 1) continue;
    const members = chs.map((c, i) => {
      const x = plan.members[i], f = poolFood(world, c.name, x.lost);
      const potions = Object.fromEntries(Object.entries(x.use).filter(([, u]) => u > 0).map(([code, u]) => [code, Math.min(STACK, share(code, c.name), Math.ceil(u * kills * MARGIN))]));
      const food = f && x.lost > 0 ? Math.min(Math.ceil((kills * x.lost) / f.hp), Math.floor(c.inventory_max_items / 2), Math.floor(available(f.code, world, c.name))) : 0;
      const wear = Object.fromEntries(Object.entries(x.slots).filter(([g, code]) => !!code && WEAR_SLOTS.includes(g as GearSlot))) as Record<string, string>;
      return { name: c.name, wear, withdraw: withToll({ ...potions, ...(food > 0 ? { [f!.code]: food } : {}) }, spots[i]!.toll) ?? {}, toll: spots[i]!.toll, place: spots[i]!.place, xp: xps[i], rate: rates[i], own: own[i] };
    });
    return { boss, plan, first: !!firstT, target: firstT?.key ?? `party:${boss}`, kills, cycle, avg, members };
  }
  return undefined;
}
