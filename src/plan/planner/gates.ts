// Whether a character meets a gate (design A.2 rule 1), shared by decide, supply and gear. Pure.

import { monster as monsterOf } from "../../catalog";
import { nearestSpot, placeOf, safeWin } from "./reach";
import { levelOf } from "./cost";
import { isDone } from "./targets";
import type { Character } from "../../types/api";
import type { Gate, World } from "./types";

/** Whether a character meets a gate now. */
export function met(g: Gate, ch: Character, world: World): boolean {
  switch (g.kind) {
    case "level": return levelOf(ch, g.lane) >= g.level;
    // shortcut: a monster 10+ levels above is never a safe win from the bank (as pickMonster's cutoff), not solved
    case "win": return (monsterOf(g.monster)?.level ?? 99) <= ch.level + 10 && safeWin(ch, world, g.monster);
    case "achievement": return world.achievements.some((a) => a.code === g.code && isDone(a));
    case "event": return world.events.some((e) => e.code === g.code && Date.parse(e.expiration) > world.now);
    // task 017, settled point 2: a route through the transitions this character's plan may open (reach.ts mayOf)
    case "layer": return !!nearestSpot(placeOf(ch), g.type, g.code, world, ch.name);
    case "group": return false;
  }
}

/** A target's gates this character does not meet; a safe win is solved only when every other gate missing is a level
 *  (task 013: or an event — an event achievement sits behind its win like any other, bundle.ts). */
export function unmetGates(gates: Gate[], ch: Character, world: World): Gate[] {
  const out: Gate[] = gates.filter((g) => g.kind !== "win" && !met(g, ch, world));
  const ev = !!(world.config.events ?? 1);
  return out.some((g) => g.kind !== "level" && !(ev && g.kind === "event")) ? out : [...out, ...gates.filter((g) => g.kind === "win" && !met(g, ch, world))];
}

/** Why a field source is out of reach for everyone for now (an event that is not live, a boss, another layer, an
 *  achievement-gated tile), or undefined when only levels and wins stand in the way. */
export function outOfReach(gates: Gate[], world: World): string | undefined {
  for (const g of gates) {
    if (g.kind === "event" && !world.events.some((e) => e.code === g.code && Date.parse(e.expiration) > world.now)) return `an event (${g.code})`;
    if (g.kind === "group") return "a boss (group fight)";
    // task 017: another layer is out of reach only while no character that is on may open the way there
    if (g.kind === "layer" && !world.characters.some((c) => isOn(c.name, world) && met(g, c, world))) return "another layer";
    if (g.kind === "achievement" && !world.achievements.some((a) => a.code === g.code && isDone(a))) return `the achievement ${g.code}`;
  }
  return undefined;
}

/** Whether the planner plans for this character (config.on; settled point 9 of task 009). */
export const isOn = (name: string, world: World): boolean => !!world.config.on[name];
