// Who levels what (design B.3). Pure.
//   - Everyone fights: combat is a lane of every character.
//   - Crafting stays where it is: the highest level of each workshop skill.
//   - One specialist per gathering skill: the highest level among characters without a gathering role yet;
//     a tie goes to the character with fewer roles, then account order.
//   - A second and third gatherer for a skill while an open target behind it needs a live event (mining and
//     woodcutting 35: the Strange and Magic Apparitions).
//   - config.roles pins a specialist; a pinned skill is not computed.

//   - Task 009: DEFAULTS.roles pins every role of this fleet (config.ts), so nothing here moves with levels for it;
//     the rule stays for a fleet without pins (the made-up worlds).

import { CRAFT_LANES, GATHER_LANES } from "./config";
import { levelOf } from "./cost";
import { targetsOf } from "./targets";
import type { Character } from "../../types/api";
import type { Lane, PlannerConfig, Target, World } from "./types";

const memo = new WeakMap<World, Record<string, Lane[]>>();
/** rolesOf for a world, once per world. */
export function rolesFor(world: World): Record<string, Lane[]> {
  let r = memo.get(world);
  if (!r) memo.set(world, (r = rolesOf(world.characters, world.config, targetsOf(world))));
  return r;
}

/** The holder of a crafting skill (the first character whose roles carry it). */
export const crafterOf = (lane: string, world: World): string | undefined =>
  world.characters.find((c) => rolesFor(world)[c.name]?.includes(lane as Lane))?.name;

export function rolesOf(characters: Character[], config: PlannerConfig, targets: Target[]): Record<string, Lane[]> {
  const out: Record<string, Lane[]> = Object.fromEntries(characters.map((c) => [c.name, ["combat"] as Lane[]]));
  const order = new Map(characters.map((c, i) => [c.name, i]));
  const add = (name: string, lane: Lane): void => { if (!out[name].includes(lane)) out[name].push(lane); };
  const pinned = (lane: Lane): string[] =>
    characters.filter((c) => [...(config.roles[c.name]?.gather ?? []), ...(config.roles[c.name]?.craft ?? [])].includes(lane)).map((c) => c.name);
  const rank = (lane: Lane, pool: Character[]): Character[] =>
    [...pool].sort((a, b) => levelOf(b, lane) - levelOf(a, lane) || out[a.name].length - out[b.name].length || order.get(a.name)! - order.get(b.name)!);
  const hasGather = (c: Character): boolean => out[c.name].some((l) => GATHER_LANES.includes(l));

  for (const lane of CRAFT_LANES) {
    const pins = pinned(lane);
    if (pins.length) pins.forEach((n) => add(n, lane));
    else if (characters.length) add(rank(lane, characters)[0].name, lane);
  }
  for (const lane of GATHER_LANES) {
    const pins = pinned(lane);
    if (pins.length) { pins.forEach((n) => add(n, lane)); continue; }
    const free = characters.filter((c) => !hasGather(c));
    const pick = rank(lane, free.length ? free : characters)[0];
    if (pick) add(pick.name, lane);
  }
  const eventLanes = new Set<Lane>();
  for (const t of targets) {
    if (!t.gates.some((g) => g.kind === "event")) continue;
    for (const g of t.gates) if (g.kind === "level" && GATHER_LANES.includes(g.lane)) eventLanes.add(g.lane);
  }
  for (const lane of GATHER_LANES) {
    if (!eventLanes.has(lane) || pinned(lane).length) continue;
    for (const c of rank(lane, characters.filter((x) => !out[x.name].includes(lane))).slice(0, 2)) add(c.name, lane);
  }
  return out;
}
