// Routes across the map's layers. Pure: static map data only (catalog maps).
//
// The game's `move` path-finds inside ONE layer around blocked tiles (5 s per
// map crossed) and never changes layer; `transition` (5 s) is the only way
// between layers — and into an area only a transition enters. A REGION is a
// set of tiles `move` can travel between: a flood fill over the four
// neighbours of the same layer, where (access.type)
//   - blocked     is never entered;
//   - standard    joins its standard and conditional neighbours;
//   - restricted  joins only restricted neighbours: the Enchanted Forest is
//                 entered through its 5,000-gold transition, never on foot
//                 (else the toll would buy nothing);
//   - conditional (an achievement gate: Tasks Trader, Rosenblood, the island's
//                 bank) belongs to its neighbour's region as a destination,
//                 never as a corridor; whether its condition is met stays the
//                 server's call, as before.
// Regions are built once per catalog (memo on the maps array), never per call.

import { catalog } from "../catalog";
import type { GameMap, Transition } from "../types/catalog";

export interface Place {
  x: number;
  y: number;
  layer: string;
}

/** One action of a route: a `move` (`tiles` = maps crossed) or a `transition` on (x, y) of `layer`. */
export type Leg =
  | { kind: "walk"; x: number; y: number; layer: string; tiles: number }
  | { kind: "transition"; x: number; y: number; layer: string; to: Transition };

/** Whether a transition is open to this traveller. */
export type May = (t: Transition) => boolean;

/** The transitions without conditions — all this client opens until keys and tolls come. */
export const FREE: May = (t) => !t.conditions?.length;

const key = (p: Place): string => `${p.layer}:${p.x},${p.y}`;
const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

interface Regions {
  tiles: Map<string, GameMap>; // every tile that is not blocked
  region: Map<string, number>; // tile → region id
  exits: Map<number, GameMap[]>; // region → its tiles that carry a transition
  dist: Map<string, Map<string, number>>; // source tile → maps crossed to every tile of its region (filled on demand)
  hops: WeakMap<May, Map<string, GameMap[] | null>>; // "a>b" → the transition tiles from region a to b
}

const memo = new WeakMap<GameMap[], Regions>();

function regions(): Regions {
  const maps = catalog().maps;
  const had = memo.get(maps);
  if (had) return had;
  const tiles = new Map<string, GameMap>();
  for (const m of maps) if (m.access?.type !== "blocked") tiles.set(key(m), m);
  const region = new Map<string, number>();
  const exits = new Map<number, GameMap[]>();
  // Conditional tiles seed last: each joins a neighbour's region instead of starting one.
  const cond = (m: GameMap): boolean => m.access?.type === "conditional";
  const seeds = [...tiles.values()].sort((a, b) => Number(cond(a)) - Number(cond(b)));
  let next = 0;
  for (const seed of seeds) {
    if (region.has(key(seed))) continue;
    const id = next++;
    region.set(key(seed), id);
    const stack = [seed];
    while (stack.length) {
      const t = stack.pop()!;
      if (t.interactions?.transition) exits.set(id, [...(exits.get(id) ?? []), t]);
      for (const n of neighbours(tiles, t)) {
        if (region.has(key(n))) continue;
        region.set(key(n), id);
        stack.push(n);
      }
    }
  }
  const r: Regions = { tiles, region, exits, dist: new Map(), hops: new WeakMap() };
  memo.set(maps, r);
  return r;
}

/** The tiles `move` steps to from `t`: same layer, not blocked, restricted only with restricted — none out of a
 *  conditional tile unless the walk starts there. */
function neighbours(tiles: Map<string, GameMap>, t: GameMap, start = false): GameMap[] {
  if (t.access?.type === "conditional" && !start) return [];
  const restricted = t.access?.type === "restricted";
  const out: GameMap[] = [];
  for (const [dx, dy] of STEPS) {
    const n = tiles.get(key({ x: t.x + dx, y: t.y + dy, layer: t.layer }));
    if (n && (n.access?.type === "restricted") === restricted) out.push(n);
  }
  return out;
}

/** Maps crossed walking from `a` to `b` in one region: a breadth-first search from `a`, kept per source tile. */
function walkTiles(R: Regions, a: Place, b: Place): number {
  let d = R.dist.get(key(a));
  if (!d) {
    d = new Map([[key(a), 0]]);
    const start = R.tiles.get(key(a));
    const queue = start ? [start] : [];
    for (let i = 0; i < queue.length; i++) {
      const t = queue[i];
      const here = d.get(key(t))!;
      for (const n of neighbours(R.tiles, t, i === 0)) {
        if (d.has(key(n))) continue;
        d.set(key(n), here + 1);
        queue.push(n);
      }
    }
    R.dist.set(key(a), d);
  }
  return d.get(key(b)) ?? Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // unreachable on foot only if the regions are wrong
}

/**
 * The transition tiles to use, in order, from region `a` to region `b`:
 * breadth-first over regions, fewest transitions. Kept per (may, a, b).
 * shortcut: where two transitions join the same pair of regions the first
 * found is taken, not the nearer one (only the lava cave's two keyed ones today).
 */
function hopsBetween(R: Regions, a: number, b: number, may: May): GameMap[] | undefined {
  let byPair = R.hops.get(may);
  if (!byPair) R.hops.set(may, (byPair = new Map()));
  const k = `${a}>${b}`;
  const had = byPair.get(k);
  if (had !== undefined) return had ?? undefined;
  const via = new Map<number, GameMap>([[a, undefined as unknown as GameMap]]);
  const queue = [a];
  for (let i = 0; i < queue.length && !via.has(b); i++) {
    for (const t of R.exits.get(queue[i]) ?? []) {
      const tr = t.interactions.transition!;
      const n = R.region.get(key(tr));
      if (n == null || via.has(n) || !may(tr)) continue;
      via.set(n, t);
      queue.push(n);
    }
  }
  let path: GameMap[] | null = null;
  if (via.has(b)) {
    path = [];
    for (let r = b; r !== a; r = R.region.get(key(via.get(r)!))!) path.unshift(via.get(r)!);
  }
  byPair.set(k, path);
  return path ?? undefined;
}

/**
 * How to get from `from` to `to`: walk to a transition tile, transition, …,
 * walk to `to`. [] = already there; undefined = no route through the
 * transitions `may` opens (or either end is not a tile anyone stands on).
 */
export function route(from: Place, to: Place, may: May): Leg[] | undefined {
  const R = regions();
  const a = R.region.get(key(from));
  const b = R.region.get(key(to));
  if (a == null || b == null) return undefined;
  const hops = hopsBetween(R, a, b, may);
  if (!hops) return undefined;
  const legs: Leg[] = [];
  let at: Place = from;
  const walk = (p: Place): void => {
    if (key(p) === key(at)) return;
    legs.push({ kind: "walk", x: p.x, y: p.y, layer: p.layer, tiles: walkTiles(R, at, p) });
    at = p;
  };
  for (const t of hops) {
    walk(t);
    const tr = t.interactions.transition!;
    legs.push({ kind: "transition", x: t.x, y: t.y, layer: t.layer, to: tr });
    at = { x: tr.x, y: tr.y, layer: tr.layer };
  }
  walk(to);
  return legs;
}

/** Seconds a route takes: 5 s per map crossed, 5 s per transition (docs, maps and movement). */
export const travelSec = (legs: Leg[]): number => legs.reduce((s, l) => s + 5 * (l.kind === "walk" ? l.tiles : 1), 0);
