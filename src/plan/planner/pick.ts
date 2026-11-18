// The work that levels a lane now (design E): the best monster and the best node, plus the docs' XP
// formulas the forward model uses as well. Pure.
//
// For 008: state/queue.ts `trainingMonsterFor` and plan/hive/skills.ts `trainingResourceFor` answer the same
// questions (win instead of safe win; the highest node instead of XP per hour).

import { catalog, monster as monsterOf } from "../../catalog";
import { fightXp } from "../xp";
import { actionSec } from "./cost";
import { nearestSpot, placeOf, safeWin } from "./reach";
import { gatherXp } from "./xp";
import type { Character } from "../../types/api";
import type { Place, World } from "./types";

export interface MonsterPick { monster: string; xp: number; sec: number; rate: number; place: Place; until?: number }

/**
 * The monster to level combat on: XP per second (the docs' fight XP over the kill's cost — fight, rest, the
 * log factor, the bank trips) among monsters on the map now (static or a live event's), that the character
 * reaches by a free route and wins SAFELY with bank + own gear; × 1.25 for a monster with an open kill or drop
 * objective (`bonus`). Bosses are group work. Candidates stop at level + 10, as `trainingMonsterFor`.
 * The solves behind it are memoised in reach.ts `fightRec` (bank gear, name, level, max HP, worn set).
 */
export function pickMonster(ch: Character, world: World, bonus: Set<string>): MonsterPick | undefined {
  let best: MonsterPick | undefined;
  for (const m of catalog().monsters.values()) {
    if (m.type === "boss" || m.type === "raid_boss" || m.level > ch.level + 10) continue;
    const xp = fightXp(m.level, m.hp, m.type, ch.level);
    if (xp <= 0) continue;
    const spot = nearestSpot(placeOf(ch), "monster", m.code, world);
    if (!spot || !safeWin(ch, world, m.code)) continue;
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
    const xp = gatherXp(r.level, level);
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

/** A monster's display name (why lines). */
export const monsterName = (code: string): string => monsterOf(code)?.name ?? code;
