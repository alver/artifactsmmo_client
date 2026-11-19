// Rule 3's bundle (design A.2), shared by decide (level targets) and gear by need (the points behind a combat or a
// gathering gate). Per character and lane: the next gate behind which open achievements sit, every achievement up
// to it whose every missing gate is a level of this lane, and the hours. Pure; memoised per World.
//
// Task 009 section 2: a win gate's level is solved for this character (reach.ts winLevel: the first level up to ten
// above at which its pool wins the monster safely) — none: the achievement waits for gear and is in no bundle. A
// material made by another craft adds the gates of its bill (supply.ts), as deep as the recipes go.

import { levelOf, hoursOf, hoursToLevel } from "./cost";
import { unmetGates } from "./gates";
import { winLevel } from "./reach";
import { available } from "./stock";
import { billOf } from "./supply";
import { targetsOf } from "./targets";
import type { Character } from "../../types/api";
import type { Gate, Lane, Target, World } from "./types";

export interface Bundle {
  lane: Lane;
  next: number;                                // the gate
  behind: { code: string; points: number }[];  // the achievements up to it (points × weight)
  hGate: number;                               // hours to the gate — or to the wall — for this character (∞: no candidate)
  wall?: number;                               // the first level on the road with no XP source (section 2): the level target stops there
  hs: number[];                                // their own hours, in `behind` order
}

interface Ctx {
  ch: Character;
  byAch: Map<string, Target[]>;
  hours: Map<string, number>;
  unmet?: Map<string, Gate[]>;
  bundles: Map<Lane, Bundle | null>;
}
const memo = new WeakMap<World, Map<string, Ctx>>();
function ctxOf(name: string, world: World): Ctx {
  let byName = memo.get(world);
  if (!byName) memo.set(world, (byName = new Map()));
  let c = byName.get(name);
  if (!c) {
    const ch = world.characters.find((x) => x.name === name);
    if (!ch) throw new Error(`no character ${name}`);
    const byAch = new Map<string, Target[]>();
    for (const t of targetsOf(world)) if (t.achievement) byAch.set(t.achievement, [...(byAch.get(t.achievement) ?? []), t]);
    byName.set(name, (c = { ch, byAch, hours: new Map(), bundles: new Map() }));
  }
  return c;
}

/** The achievement's remaining character-hours for this character (its level objectives are the gates' hours). */
export function achHours(code: string, name: string, world: World): number {
  const c = ctxOf(name, world);
  let h = c.hours.get(code);
  if (h == null) {
    h = 0;
    for (const t of c.byAch.get(code) ?? []) if (t.work.kind !== "level") h += hoursOf(t, c.ch, world);
    c.hours.set(code, h);
  }
  return h;
}

/** Per open achievement, the gates this character does not meet: its targets' own, and those of every material
 *  the bank cannot cover (a field source's gates; a material made by a craft: the gates of its bill). */
export function unmetOf(name: string, world: World): Map<string, Gate[]> {
  const c = ctxOf(name, world);
  if (c.unmet) return c.unmet;
  const out = new Map<string, Gate[]>();
  for (const [code, ts] of c.byAch) {
    const gs: Gate[] = [];
    for (const t of ts) {
      gs.push(...unmetGates(t.gates, c.ch, world));
      for (const i of t.inputs ?? []) {
        const short = t.left * i.per - available(i.code, world, name);
        if (short <= 0) continue;
        if (i.source.kind !== "craft") gs.push(...unmetGates(i.gates, c.ch, world));
        else for (const l of billOf(world, name, [[i.code, short]]).leaves.values()) gs.push(...unmetGates(l.gates, c.ch, world));
      }
    }
    out.set(code, gs);
  }
  return (c.unmet = out);
}

/** Rule 3 for one lane of this character: the next gate behind which open achievements sit, and the bundle up to it. */
export function bundleOf(lane: Lane, name: string, world: World): Bundle | undefined {
  const c = ctxOf(name, world);
  const hit = c.bundles.get(lane);
  if (hit !== undefined) return hit ?? undefined;
  const L = levelOf(c.ch, lane);
  const pts = (code: string, p: number): number => p * (world.config.weight[code] ?? 1);
  const inLane = (g: Gate): number | undefined => {
    if (g.kind === "level") return g.lane === lane && g.level > L ? g.level : undefined;
    if (g.kind === "win" && lane === "combat") { const at = winLevel(c.ch, world, g.monster); return at != null && at > L ? at : undefined; }
    return undefined;
  };
  const behind: { code: string; at: number; points: number }[] = [];
  for (const [code, gs] of unmetOf(name, world)) {
    // filler is scored only when nothing else scores (rule 4): its hours do not drag a bundle down, its points do not pull one
    if (world.config.filler.includes(code)) continue;
    // a win gate is looked at only when every other missing gate is a level of this lane (the solves are dear)
    if (!gs.length || !gs.every((g) => (g.kind === "level" && g.lane === lane) || (g.kind === "win" && lane === "combat"))) continue;
    const at = gs.map(inLane);
    if (at.some((x) => x == null)) continue;
    behind.push({ code, at: Math.max(...(at as number[])), points: pts(code, c.byAch.get(code)![0].points) });
  }
  let out: Bundle | undefined;
  if (behind.length) {
    const next = Math.min(...behind.map((b) => b.at));
    const bundle = behind.filter((b) => b.at <= next);
    // Section 2: a level with no XP source makes the gate ∞. Task 009's reading for a far gate (grand_master at 50):
    // the road is walked as far as it goes — the level target is the wall, priced to it — and gear by need (gear.ts
    // (a)) is asked for exactly there. A wall at the character's own level: no candidate.
    // The score still counts the whole road: the levels past the wall at the pace of the last level before it.
    let hGate = 0, wall: number | undefined, last = Infinity;
    for (let l = L; l < next; l++) {
      const h = hoursToLevel(lane, l, l + 1, world, c.ch);
      if (!Number.isFinite(h)) { wall = l; break; }
      hGate += last = h;
    }
    if (wall === L) hGate = Infinity;
    else if (wall != null) hGate += (next - wall) * last;
    out = { lane, next, behind: bundle.map(({ code, points }) => ({ code, points })), hGate, wall, hs: bundle.map((b) => achHours(b.code, name, world)) };
  }
  c.bundles.set(lane, out ?? null);
  return out;
}

/** The bundle's score parts over `hours` more than its own (the gate, or gear and the gate): Σ points that fit the
 *  deadline, and Σ points; both ÷ (extra + their own hours). */
export function bundleScore(b: Bundle, extra: number, calH: number): { fit: number; any: number; points: number; hours: number } {
  const hours = extra + b.hs.reduce((s, x) => s + x, 0);
  const fitPts = b.behind.reduce((s, x, i) => s + (extra + b.hs[i] <= calH ? x.points : 0), 0);
  const points = b.behind.reduce((s, x) => s + x.points, 0);
  return { fit: fitPts / hours, any: points / hours, points, hours };
}
