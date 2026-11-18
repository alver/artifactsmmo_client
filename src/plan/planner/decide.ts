// decide(name, world): the next chunk of work for one free character — rules 1–5 of design A.2.
//   1. Targets are the open objectives and the level gates; one is in reach when the character meets every gate.
//   2. An in-reach objective scores points × fit ÷ the achievement's remaining hours.
//   3. A level gate scores Σ (points × fit) of the open achievements behind this lane's gates up to it
//      ÷ (hours to the gate + their hours); candidates: the next gate of each lane the character has.
//   4. The highest score wins; filler is scored only when nothing else scores above zero.
//   5. When nothing fits the deadline, fit is dropped and the same rule runs on points per hour.
// It always returns a step (C.4): else filler, else a gather chunk on the best node of the character's highest
// gathering skill. Built in: × 1.25 in pickMonster for a monster with an open objective (E), + 10% for the
// target the character was on last (B.4). Ties go to the target key. Pure.

import { atlas } from "../../catalog/atlas";
import { achievement as achievementOf, item, itemName, monster as monsterOf } from "../../catalog";
import { CHUNK_SEC, GATHER_LANES, TRAIN_LANES } from "./config";
import { actionSec, craftsPerLevel, hoursOf, hoursToLevel, levelOf, perOf, recycleLane, unitSec } from "./cost";
import { monsterName, pickMonster, pickNode } from "./pick";
import { nearestSpot, placeOf, safeWin } from "./reach";
import { rolesOf } from "./roles";
import { available } from "./stock";
import { isDone, targetsOf } from "./targets";
import type { Character } from "../../types/api";
import type { Answer, Gate, Lane, Place, Source, Step, Target, Work, World } from "./types";

const fmt = (h: number): string => (!Number.isFinite(h) ? "∞" : h < 10 ? h.toFixed(1) : String(Math.round(h)));
const monsterLevel = (code: string): number | undefined => monsterOf(code)?.level;

/** A target's gates this character does not meet; a safe win is solved only when every other gate is met. */
function unmetGates(gates: Gate[], ch: Character, world: World): Gate[] {
  const out: Gate[] = gates.filter((g) => g.kind !== "win" && !met(g, ch, world));
  return out.some((g) => g.kind !== "level") ? out : [...out, ...gates.filter((g) => g.kind === "win" && !met(g, ch, world))];
}

/** Whether a character meets a gate now. */
export function met(g: Gate, ch: Character, world: World): boolean {
  switch (g.kind) {
    case "level": return levelOf(ch, g.lane) >= g.level;
    // shortcut: a monster 10+ levels above is never a safe win from the bank (as pickMonster's cutoff), not solved
    case "win": return (monsterLevel(g.monster) ?? 99) <= ch.level + 10 && safeWin(ch, world, g.monster);
    case "achievement": return world.achievements.some((a) => a.code === g.code && isDone(a));
    case "event": return world.events.some((e) => e.code === g.code && Date.parse(e.expiration) > world.now);
    case "layer": return !!nearestSpot(placeOf(ch), g.type, g.code, world);
    case "group": return false;
  }
}

interface Plan { work: Work; units: number; hours: number; place?: Place; until?: number; sources?: Source[]; withdraw?: Record<string, number> }

/** A chunk of an action work (kills, gathers): about CHUNK_SEC, at least 1, at most `left`, and inside an event's time. */
function chunk(work: Work, sec: number, left: number, world: World, spot: { place: Place; until?: number }): Plan | undefined {
  if (!Number.isFinite(sec) || sec <= 0) return undefined;
  let units = Math.min(left, Math.max(1, Math.round(CHUNK_SEC / sec)));
  if (spot.until) units = Math.min(units, Math.floor((spot.until - world.now) / 1000 / sec));
  return units >= 1 ? { work, units, hours: (units * sec) / 3600, place: spot.place, until: spot.until } : undefined;
}

/** The chunk of an objective this character can do now, or undefined when it is not in reach. */
function planObjective(t: Target, ch: Character, world: World, left: number): Plan | undefined {
  if (!t.gates.every((g) => met(g, ch, world))) return undefined;
  const w = t.work;
  const here = placeOf(ch);
  switch (w.kind) {
    case "kill": case "gather": {
      const spot = w.kind === "kill" ? nearestSpot(here, "monster", w.monster, world) : nearestSpot(here, "resource", w.resource, world);
      return spot && chunk(w, unitSec(t, ch, world), left, world, spot);
    }
    case "craft": case "buy": {
      const recipe = w.kind === "craft" ? item(w.code)?.craft : undefined;
      const spot = w.kind === "craft" ? recipe && nearestSpot(here, "workshop", recipe.skill, world) : nearestSpot(here, "npc", w.npc, world);
      if (!spot) return undefined;
      const ins = (t.inputs ?? []).map((i) => {
        const field = i.gates.every((g) => met(g, ch, world));
        const per = perOf(i.source);
        return { i, avail: available(i.code, world, ch.name), field, per, margin: per > 1 ? 1.5 : 1, act: field ? actionSec(i.source, ch, world) : Infinity };
      });
      let max = left;
      for (const x of ins) if (!x.field) max = Math.min(max, Math.floor(x.avail / x.i.per));
      if (max < 1) return undefined;
      // shortcut: a drop or a rare gather is sourced at 1.5 × its expected actions, so a step rarely comes up short
      const times = (x: (typeof ins)[number], n: number): number => Math.ceil(Math.max(0, n * x.i.per - x.avail) * x.per * x.margin - 1e-9);
      const own = w.kind === "craft" ? 5 / Math.max(1, recipe!.quantity) : 5;
      const field = (n: number): number => ins.reduce((s, x) => s + (times(x, n) ? times(x, n) * x.act : 0), 0) + n * own;
      let lo = 1, hi = field(1) > CHUNK_SEC ? 1 : max;
      while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (field(mid) <= CHUNK_SEC) lo = mid; else hi = mid - 1; }
      if (!Number.isFinite(field(lo))) return undefined;
      return {
        work: w, units: lo, hours: field(lo) / 3600, place: spot.place,
        sources: ins.filter((x) => times(x, lo) > 0).map((x) => ({ code: x.i.code, work: x.i.source, times: times(x, lo) })),
        withdraw: Object.fromEntries(ins.filter((x) => x.avail > 0).map((x) => [x.i.code, Math.min(x.avail, Math.ceil(lo * x.i.per))])),
      };
    }
    case "task": return { work: w, units: 1, hours: unitSec(t, ch, world) / 3600 };
    case "recycle": {
      const lane = recycleLane(ch), L = levelOf(ch, lane);
      const spot = nearestSpot(here, "workshop", lane, world);
      const hours = hoursToLevel(lane, L, L + 1, world);
      const { recycled } = craftsPerLevel(lane, L);
      if (!spot || !recycled || !Number.isFinite(hours)) return undefined;
      return { work: { kind: "train", lane }, units: Math.min(left, recycled), hours, place: spot.place };
    }
    default: return undefined; // favor, use, sell, level: interrupts, stage 5, events, level gates
  }
}

/** The work that levels a lane now: the best monster, the best node, or one level of `train`. */
function planLevel(lane: Lane, ch: Character, world: World, bonus: Set<string>): (Plan & { what: string }) | undefined {
  const L = levelOf(ch, lane);
  if (lane === "combat") {
    const p = pickMonster(ch, world, bonus);
    const c = p && chunk({ kind: "kill", monster: p.monster }, p.sec, Infinity, world, p);
    return c && { ...c, what: `${monsterName(p.monster)} at ${(p.xp / p.sec).toFixed(2)} XP/s` };
  }
  if (GATHER_LANES.includes(lane)) {
    const p = pickNode(lane, L, ch, world);
    const w: Work | undefined = p && { kind: "gather", resource: p.resource, drop: p.drop };
    const c = p && w && chunk(w, p.sec * perOf(w), Infinity, world, p);
    return c && { ...c, what: `${itemName(p.drop)} at ${Math.round(p.xph)} XP/h` };
  }
  if (TRAIN_LANES.includes(lane)) {
    const spot = nearestSpot(placeOf(ch), "workshop", lane, world);
    const hours = hoursToLevel(lane, L, L + 1, world);
    return spot && Number.isFinite(hours) ? { work: { kind: "train", lane }, units: 1, hours, place: spot.place, what: `one level of ${lane} training` } : undefined;
  }
  return undefined;
}

export interface Candidate { target: Target; step: Step; fit: number; any: number }
export interface Ranking { step: Step; objectives: Candidate[]; levels: Candidate[]; fillers: Candidate[]; lanes: Lane[] }

/** Every candidate this character has now, scored, and the step decide() returns. */
export function rank(name: string, world: World): Ranking {
  const ch = world.characters.find((c) => c.name === name);
  if (!ch) throw new Error(`no character ${name}`);
  const cfg = world.config;
  const targets = targetsOf(world);
  const lanes = rolesOf(world.characters, cfg, targets)[name] ?? ["combat"];
  const calH = Math.max(0, (Date.parse(cfg.deadline) - world.now) / 3.6e6);
  const last = world.current[name];
  const others = Object.entries(world.current).filter(([n, s]) => n !== name && s && (s.as === "objective" || s.as === "filler")).map(([, s]) => s!);
  const inFlight = (key: string): number => others.reduce((t, s) => t + (s.target === key ? s.units : 0), 0);
  const bonus = new Set(targets.flatMap((t) => (t.work.kind === "kill" ? [t.work.monster] : [])));
  const blocked = (key: string): boolean => (world.blocked[`${key}@${name}`]?.until ?? 0) > world.now;
  const pts = (code: string, p: number): number => p * (cfg.weight[code] ?? 1);
  const byAch = new Map<string, Target[]>();
  for (const t of targets) if (t.achievement) byAch.set(t.achievement, [...(byAch.get(t.achievement) ?? []), t]);
  const hoursMemo = new Map<string, number>();
  /** The achievement's remaining character-hours for this character (its level objectives are the gates' hours). */
  const achHours = (code: string): number => {
    let h = hoursMemo.get(code);
    if (h == null) {
      h = 0;
      for (const t of byAch.get(code) ?? []) if (t.work.kind !== "level") h += hoursOf(t, ch, world);
      hoursMemo.set(code, h);
    }
    return h;
  };
  /** Event work also needs the spawns: one character's floor, as the map's evDays. */
  const floorH = (t: Target, h: number): number => {
    const ev = t.gates.find((g) => g.kind === "event");
    const rate = ev && atlas()?.events.find((e) => e.code === (ev as { code: string }).code)?.rate;
    return rate ? (h / (55 / 60)) * (rate / 60) : 0;
  };
  const stepOf = (t: Target, p: Plan, as: Answer, score: number, why: string): Step => {
    const n = last?.target === t.key ? Number(last.key.split("#").pop()) + 1 : 1;
    return { key: `${t.key}@${name}#${n}`, target: t.key, character: name, as, work: p.work, units: p.units, hours: p.hours, score, why, place: p.place, sources: p.sources, withdraw: p.withdraw, until: p.until };
  };

  const objectives: Candidate[] = [];
  const fillers: Candidate[] = [];
  for (const t of targets) {
    if (!t.achievement || blocked(t.key)) continue;
    const left = t.left - inFlight(t.key);
    if (left <= 0) continue;
    const p = planObjective(t, ch, world, left);
    if (!p) continue;
    const h = achHours(t.achievement);
    const fit = Math.max(h, floorH(t, h)) <= calH ? 1 : 0;
    const any = (pts(t.achievement, t.points) / Math.max(h, 0.01)) * (last?.target === t.key ? 1.1 : 1);
    const what = p.work.kind === "train" ? "recycled" : unitWord(t.work);
    const why = `${achievementOf(t.achievement)?.name ?? t.achievement}: ${left} ${what} left, +${t.points} pts in ~${fmt(h)} h; ${p.units} now (${fmt(p.hours)} h)`;
    (t.filler ? fillers : objectives).push({ target: t, step: stepOf(t, p, t.filler ? "filler" : "objective", any * fit, why), fit: any * fit, any });
  }

  // Rule 3: per lane, the next gate behind which open achievements sit, and the bundle up to it.
  const unmet = new Map<string, Gate[]>();
  for (const [code, ts] of byAch) {
    const gs: Gate[] = [];
    for (const t of ts) {
      gs.push(...unmetGates(t.gates, ch, world));
      for (const i of t.inputs ?? []) if (available(i.code, world, name) < t.left * i.per) gs.push(...unmetGates(i.gates, ch, world));
    }
    unmet.set(code, gs);
  }
  const levels: Candidate[] = [];
  for (const lane of lanes) {
    const L = levelOf(ch, lane);
    const inLane = (g: Gate): number | undefined =>
      g.kind === "level" && g.lane === lane && g.level > L ? g.level : lane === "combat" && g.kind === "win" && g.level > L ? g.level : undefined;
    const behind: { code: string; at: number; points: number }[] = [];
    for (const [code, gs] of unmet) {
      const at = gs.map(inLane);
      if (!gs.length || at.some((x) => x == null)) continue;
      behind.push({ code, at: Math.max(...(at as number[])), points: pts(code, byAch.get(code)![0].points) });
    }
    if (!behind.length) continue;
    const next = Math.min(...behind.map((b) => b.at));
    const bundle = behind.filter((b) => b.at <= next);
    const t = targets.find((x) => x.key === `lvl:${lane}:${next}`) ?? { key: `lvl:${lane}:${next}`, points: 0, work: { kind: "level", lane, to: next }, left: 1, gates: [], filler: false };
    if (blocked(t.key)) continue;
    const p = planLevel(lane, ch, world, bonus);
    if (!p) continue;
    const hGate = hoursToLevel(lane, L, next, world);
    const hs = bundle.map((b) => achHours(b.code));
    const total = hGate + hs.reduce((s, x) => s + x, 0);
    const boost = last?.target === t.key ? 1.1 : 1;
    const fit = (bundle.reduce((s, b, i) => s + (hGate + hs[i] <= calH ? b.points : 0), 0) / total) * boost;
    const any = (bundle.reduce((s, b) => s + b.points, 0) / total) * boost;
    const sum = bundle.reduce((s, b) => s + b.points, 0);
    const why = `${lane} ${L} → ${next}: +${sum} pts behind it (${bundle.map((b) => b.code).join(", ")}), ${fmt(hGate)} h to the gate; ${p.what}, ${p.units} now (${fmt(p.hours)} h)`;
    levels.push({ target: t, step: stepOf(t, p, "level", fit, why), fit, any });
  }

  const byScore = (k: "fit" | "any") => (a: Candidate, b: Candidate): number => b[k] - a[k] || (a.target.key < b.target.key ? -1 : a.target.key > b.target.key ? 1 : 0);
  const pick = (pool: Candidate[]): Candidate | undefined => {
    for (const k of ["fit", "any"] as const) {
      const best = pool.filter((c) => c[k] > 0).sort(byScore(k))[0];
      if (best) return { ...best, step: { ...best.step, score: best[k], why: k === "any" ? `${best.step.why} (nothing fits the deadline: points per hour)` : best.step.why } };
    }
    return undefined;
  };
  const real = [...objectives, ...levels];
  const firsts = real.filter((c) => c.target.achievement && cfg.first.includes(c.target.achievement));
  const best = pick(firsts) ?? pick(real);
  if (best) return { step: { ...best.step, why: `${best.step.as}: ${best.step.why}` }, objectives, levels, fillers, lanes };
  const fill = pick(fillers);
  if (fill) return { step: { ...fill.step, why: `filler (nothing else scores): ${fill.step.why}` }, objectives, levels, fillers, lanes };
  return { step: fallback(ch, world, last), objectives, levels, fillers, lanes };
}

/** C.4: a gather chunk on the best node of the character's highest gathering skill — always possible. */
function fallback(ch: Character, world: World, last: Step | undefined): Step {
  const skills = [...GATHER_LANES].sort((a, b) => levelOf(ch, b) - levelOf(ch, a));
  for (const skill of skills) {
    const p = pickNode(skill, levelOf(ch, skill), ch, world, true);
    if (!p) continue;
    const work: Work = { kind: "gather", resource: p.resource, drop: p.drop };
    const c = chunk(work, p.sec * perOf(work), Infinity, world, p);
    if (!c) continue;
    const key = `fallback:${skill}`;
    const n = last?.target === key ? Number(last.key.split("#").pop()) + 1 : 1;
    return {
      key: `${key}@${ch.name}#${n}`, target: key, character: ch.name, as: "fallback", work, units: c.units, hours: c.hours, score: 0,
      why: `fallback (nothing else is open to ${ch.name}): ${itemName(p.drop)} at ${skill} ${levelOf(ch, skill)}, ${c.units} now`, place: c.place, until: c.until,
    };
  }
  throw new Error(`${ch.name} reaches no gathering node at all`);
}

const unitWord = (w: Work): string =>
  w.kind === "kill" ? (w.drop ? itemName(w.drop) : `${monsterName(w.monster)} kills`)
  : w.kind === "gather" ? itemName(w.drop)
  : w.kind === "craft" || w.kind === "buy" ? itemName(w.code)
  : w.kind === "task" ? "tasks" : w.kind;

/** The next step for one free character. The same World gives the same Step. */
export const decide = (name: string, world: World): Step => rank(name, world).step;
