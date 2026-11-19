// The work that levels a lane now (design E): the best monster and the best node, plus the docs' XP
// formulas the forward model uses as well. Pure.
//
// For 008: state/queue.ts `trainingMonsterFor` and plan/hive/skills.ts `trainingResourceFor` answer the same
// questions (win instead of safe win; the highest node instead of XP per hour).

import { catalog, monster as monsterOf } from "../../catalog";
import { CRAFT_SEC, fightXp } from "../xp";
import { actionSec, levelOf, perOf } from "./cost";
import { rolesFor } from "./roles";
import { CHUNK_SEC } from "./config";
import { fightRec, nearestSpot, placeOf, safeWin, setWisdom } from "./reach";
import { available } from "./stock";
import { inputsOf, placeGates } from "./targets";
import { met } from "./gates";
import { craftXpOf, gatherXp } from "./xp";
import type { Character } from "../../types/api";
import type { Input, Lane, Place, Work, World } from "./types";

export interface MonsterPick { monster: string; xp: number; sec: number; rate: number; place: Place; until?: number }

/** Task 010: the XP multiplier of the character's active favor on this target (an accepted offering's), else 1. */
const favorXp = (world: World, name: string, type: "monster" | "resource", code: string): number =>
  world.favors?.[name]?.find((f) => f.type === type && f.code === code && f.until > world.now)?.xp ?? 1;

/**
 * The monster to level combat on: XP per second (the docs' fight XP with the wisdom of the set solved for it — task
 * 012 — over the kill's cost: fight, rest, the log factor, the bank trips) among monsters on the map now (static or a live event's), that the character
 * reaches by a free route and wins SAFELY with bank + own gear; × 1.25 for a monster with an open kill or drop
 * objective (`bonus`); the XP × an active favor's multiplier while it lasts (task 010; pickNode likewise). Bosses are
 * group work. Candidates stop at level + 10, as `trainingMonsterFor`.
 * The solves behind it are memoised in reach.ts `fightRec` (bank gear, name, level, max HP, worn set).
 */
export function pickMonster(ch: Character, world: World, bonus: Set<string>): MonsterPick | undefined {
  let best: MonsterPick | undefined;
  for (const m of catalog().monsters.values()) {
    if (m.type === "boss" || m.type === "raid_boss" || m.level > ch.level + 10) continue;
    if (fightXp(m.level, m.hp, m.type, ch.level) <= 0) continue;
    const spot = nearestSpot(placeOf(ch), "monster", m.code, world);
    if (!spot || !safeWin(ch, world, m.code)) continue;
    // task 012: with the wisdom of the set the fight is planned with
    const xp = fightXp(m.level, m.hp, m.type, ch.level, setWisdom(ch, fightRec(ch, world, m.code))) * favorXp(world, ch.name, "monster", m.code);
    const sec = actionSec({ kind: "kill", monster: m.code }, ch, world);
    const rate = (xp / sec) * (bonus.has(m.code) ? 1.25 : 1);
    if (!best || rate > best.rate || (rate === best.rate && m.code < best.monster)) best = { monster: m.code, xp, sec, rate, place: spot.place, until: spot.until };
  }
  return best;
}

export interface NodePick { resource: string; drop: string; xp: number; sec: number; xph: number; place: Place; until?: number }

/**
 * The node to level a gathering skill on: XP per hour (docs formula) over the gather's cost, among nodes of
 * the skill that exist now (static or a live event's) and that the character reaches. `any` = also nodes that
 * give no XP (the fallback chunk: the highest such node).
 */
export function pickNode(skill: string, level: number, ch: Character, world: World, any = false): NodePick | undefined {
  let best: NodePick | undefined;
  for (const r of catalog().resources.values()) {
    if (r.skill !== skill || r.level > level) continue;
    const xp = gatherXp(r.level, level) * favorXp(world, ch.name, "resource", r.code);
    if (xp <= 0 && !any) continue;
    const spot = nearestSpot(placeOf(ch), "resource", r.code, world);
    if (!spot) continue;
    const sec = actionSec({ kind: "gather", resource: r.code, drop: "" }, ch, world);
    const xph = (xp / sec) * 3600 + (any ? r.level / 1000 : 0); // the fallback: XP first, then the highest node
    const drop = [...r.drops].sort((a, b) => a.rate - b.rate)[0]?.code ?? r.code;
    if (!best || xph > best.xph || (xph === best.xph && r.code < best.resource)) best = { resource: r.code, drop, xp, sec, xph, place: spot.place, until: spot.until };
  }
  return best;
}

export interface RecipePick { code: string; inputs: Input[]; xp: number; sec: number; xph: number }

/**
 * Section 5 (task 009): the recipe of a gathering skill with the best XP per hour that the character can feed —
 * every input from the bank it may plan with, or from a field source whose gates it meets (one level deep, gathered
 * inside the step). Seconds per run: 5 s plus each input's field seconds, nothing for what the bank holds for
 * about a chunk of runs. For a lane whose nodes give no XP (alchemy 12–19).
 */
export function pickRecipe(lane: Lane, ch: Character, world: World): RecipePick | undefined {
  const S = levelOf(ch, lane);
  let best: RecipePick | undefined;
  for (const it of catalog().items.values()) {
    const r = it.craft;
    if (!r || r.skill !== lane || r.level > S) continue;
    const xp = craftXpOf(it.code, S);
    const inputs = xp > 0 ? inputsOf(it.code) : undefined;
    if (!inputs || typeof inputs === "string" || !nearestSpot(placeOf(ch), "workshop", lane, world)) continue;
    let sec = CRAFT_SEC;
    for (const i of inputs) {
      // shortcut: an input counts as paid for when the bank holds 100 runs of it; upgrade if a pick flips on stock
      const bank = available(i.code, world, ch.name) >= i.per * 100;
      const field = i.source.kind !== "craft" && i.gates.every((g) => g.kind === "level" ? levelOf(ch, g.lane) >= g.level : g.kind === "win" ? safeWin(ch, world, g.monster) : false);
      if (!bank && !field) { sec = Infinity; break; }
      if (!bank) sec += i.per * actionSec(i.source, ch, world) * perOf(i.source);
    }
    const xph = (xp / sec) * 3600;
    if (xph > 0 && (!best || xph > best.xph || (xph === best.xph && it.code < best.code))) best = { code: it.code, inputs, xp, sec, xph };
  }
  return best;
}

export interface SourcePick {
  work: Work & { kind: "gather" | "kill" };
  place: Place; until?: number;
  sec: number;      // seconds an action
  per: number;      // actions an item
  net: number;      // seconds an item × (1 − share)
  share: number;    // the XP share (0 for a lane the character holds no role in)
  xp: number;       // XP an action
  lane: Lane;
  over?: string;    // the source with fewer seconds an item that the XP share passed over
}
const NO_BONUS = new Set<string>();
/**
 * Task 012, settled point 7: where this character gets more of `code` — among the nodes and monsters that drop it, that
 * exist now (static or a live event's), that it reaches by a free route and whose gates it meets (the skill level; a
 * safe win; no boss): the least NET seconds an item, the action's seconds × actions an item × (1 − the XP share). The
 * XP share is the source's XP per second over that of the character's best XP source of the lane (pickNode;
 * pickMonster without the objective bonus), at most 1, and counts only when the character holds that lane's role
 * (combat is everyone's): a specialist's level is wanted anyway, so a gather that is also its levelling work costs
 * nothing extra. Ties: fewer gross seconds an item, then the code. A source whose one action takes more than two
 * chunks is none (a step holds at least one). supply.ts sourceFor stays the static answer for gates, inputs and bills.
 */
export function pickSource(code: string, ch: Character, world: World): SourcePick | undefined {
  const roles = rolesFor(world)[ch.name] ?? [];
  // the place's own gates (an achievement-gated tile, an event that is not live, another layer) as sourceFor's were met
  const open = (type: string, c: string): boolean => { const g = placeGates(type, c); return typeof g !== "string" && g.every((x) => met(x, ch, world)); };
  let best: SourcePick | undefined, cheap: { gross: number; name: string } | undefined;
  const consider = (p: Omit<SourcePick, "net" | "over">, name: string): void => {
    const gross = p.sec * p.per, net = gross * (1 - p.share);
    if (!cheap || gross < cheap.gross) cheap = { gross, name };
    const k = (x: SourcePick): string => (x.work.kind === "gather" ? x.work.resource : x.work.monster);
    if (!best || net < best.net - 1e-9 || (Math.abs(net - best.net) <= 1e-9 && (gross < best.sec * best.per || (gross === best.sec * best.per && k(p as SourcePick) < k(best))))) best = { ...p, net };
  };
  for (const r of catalog().resources.values()) {
    const lane = r.skill as Lane, L = levelOf(ch, lane);
    if (!r.drops.some((d) => d.code === code) || L < r.level) continue;
    const spot = nearestSpot(placeOf(ch), "resource", r.code, world);
    if (!spot || !open("resource", r.code)) continue;
    const work = { kind: "gather" as const, resource: r.code, drop: code };
    const sec = actionSec(work, ch, world), xp = gatherXp(r.level, L) * favorXp(world, ch.name, "resource", r.code);
    if (!(sec <= 2 * CHUNK_SEC)) continue; // a step holds at least one action (decide.ts planMake's guard)
    const top = roles.includes(lane) && xp > 0 ? pickNode(lane, L, ch, world) : undefined;
    consider({ work, place: spot.place, until: spot.until, sec, per: perOf(work), xp, lane, share: top?.xph ? Math.min(1, ((xp / sec) * 3600) / top.xph) : 0 }, r.name);
  }
  for (const m of catalog().monsters.values()) {
    if (m.type === "boss" || m.type === "raid_boss" || !m.drops.some((d) => d.code === code)) continue;
    const spot = nearestSpot(placeOf(ch), "monster", m.code, world);
    if (!spot || !open("monster", m.code) || !safeWin(ch, world, m.code)) continue;
    const work = { kind: "kill" as const, monster: m.code, drop: code };
    const sec = actionSec(work, ch, world), xp = fightXp(m.level, m.hp, m.type, ch.level, setWisdom(ch, fightRec(ch, world, m.code))) * favorXp(world, ch.name, "monster", m.code);
    if (!(sec <= 2 * CHUNK_SEC)) continue; // a kill longer than two chunks (potions at the field price) is no source of a step
    const top = xp > 0 ? pickMonster(ch, world, NO_BONUS) : undefined;
    consider({ work, place: spot.place, until: spot.until, sec, per: perOf(work), xp, lane: "combat", share: top ? Math.min(1, xp / sec / (top.xp / top.sec)) : 0 }, m.name);
  }
  const b = best as SourcePick | undefined, c = cheap as { gross: number; name: string } | undefined;
  return b && c && c.gross < b.sec * b.per - 1e-9 ? { ...b, over: c.name } : b;
}

/** A monster's display name (why lines). */
export const monsterName = (code: string): string => monsterOf(code)?.name ?? code;
