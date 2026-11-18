// The same rule played forward (design B.4, task 007 section 9): advance() applies a finished step by the
// estimates, forward() runs decide/advance until a time, outlook() is what the Roadmap will show. Pure.
//
// What the forward model leaves out, on purpose: the XP of offerings (conservative); events (none spawn);
// bank stock other than what a step withdraws (gathered and dropped items are not deposited); gear (none is
// made — the fighters level on what the bank holds, task 010). A level-up adds 5 max HP (the atlas's 115 + 5·L).

import { atlas } from "../../catalog/atlas";
import { item, monster as monsterOf, resource as resourceOf } from "../../catalog";
import { fightXp } from "../xp";
import { craftsPerLevel, levelOf, perOf } from "./cost";
import { decide, met } from "./decide";
import { isDone, targetsOf, unhandledOf } from "./targets";
import { craftXpOf, gatherXp } from "./xp";
import type { AccountAchievement, Character } from "../../types/api";
import type { Lane, Step, Work, World } from "./types";

const DAY = 864e5;

/** When a step that starts at `start` ends: its hours, then each UTC midnight crossed adds that character's
 *  share of the day's offerings (config.offeringsPerDay ÷ characters, offeringMin each). */
export function finish(start: number, hours: number, world: World): { end: number; offerings: number } {
  const per = world.config.offeringsPerDay / Math.max(1, world.characters.length);
  let end = start + hours * 3.6e6;
  let offerings = 0;
  for (let m = Math.floor(start / DAY) * DAY + DAY; m <= end; m += DAY) {
    offerings += per;
    end += per * world.config.offeringMin * 6e4;
  }
  return { end, offerings };
}

/** Achievement points of the account: every achievement with all objectives done. */
export const pointsOf = (world: World): number => world.achievements.reduce((t, a) => t + (isDone(a) ? a.points : 0), 0);

/** The world after a step has finished, by the estimates. */
export function advance(world: World, step: Step): World {
  const idx = world.characters.findIndex((c) => c.name === step.character);
  if (idx < 0) return world;
  const ch = { ...world.characters[idx] } as Character & Record<string, number>;
  const start = world.clock?.[ch.name] ?? world.now;
  const { end, offerings } = finish(start, step.hours, world);
  const prog = new Map<string, number>(); // "<objective type>:<target>" → units
  const add = (k: string, n: number): void => void prog.set(k, (prog.get(k) ?? 0) + n);
  const xp = new Map<Lane, number>();
  const gain = (lane: Lane, n: number): void => void xp.set(lane, (xp.get(lane) ?? 0) + n);
  const odds = (d: { rate: number; min_quantity: number; max_quantity: number }): number => (d.min_quantity + d.max_quantity) / 2 / d.rate;
  const field = (w: Work, actions: number): void => {
    if (w.kind === "kill") {
      const m = monsterOf(w.monster);
      if (!m) return;
      add(`combat_kill:${m.code}`, actions);
      for (const d of m.drops) add(`combat_drop:${d.code}`, actions * odds(d));
      gain("combat", actions * fightXp(m.level, m.hp, m.type, ch.level));
    } else if (w.kind === "gather") {
      const r = resourceOf(w.resource);
      if (!r) return;
      for (const d of r.drops) add(`gathering:${d.code}`, actions * odds(d));
      gain(r.skill as Lane, actions * gatherXp(r.level, levelOf(ch, r.skill as Lane)));
    }
  };
  const w = step.work;
  if (w.kind === "kill" || w.kind === "gather") field(w, step.units * perOf(w));
  for (const s of step.sources ?? []) field(s.work, s.times);
  if (w.kind === "craft") {
    const r = item(w.code)?.craft;
    add(`crafting:${w.code}`, step.units);
    if (r) gain(r.skill as Lane, (step.units / Math.max(1, r.quantity)) * craftXpOf(w.code, levelOf(ch, r.skill as Lane)));
  }
  if (w.kind === "buy") add(`npc_buy:${w.code}`, step.units);
  if (w.kind === "task") add("task:", step.units);
  add("favor:", offerings);

  const need = atlas()?.xpNeeded ?? [];
  for (const [lane, n] of xp) {
    const lk = lane === "combat" ? "level" : `${lane}_level`, xk = lane === "combat" ? "xp" : `${lane}_xp`;
    ch[xk] = (ch[xk] ?? 0) + n;
    while (ch[lk] < 50 && need[ch[lk]] && ch[xk] >= need[ch[lk]]) {
      ch[xk] -= need[ch[lk]];
      ch[lk]++;
      if (lane === "combat") ch.max_hp += 5;
    }
  }
  if (w.kind === "train") {
    add("recycling:", craftsPerLevel(w.lane, levelOf(ch, w.lane)).recycled);
    ch[`${w.lane}_level`] = Math.min(50, levelOf(ch, w.lane) + 1);
    ch[`${w.lane}_xp`] = 0;
  }
  ch.hp = ch.max_hp;
  if (step.place) Object.assign(ch, { x: step.place.x, y: step.place.y, layer: step.place.layer });

  const characters = world.characters.map((c, i) => (i === idx ? (ch as Character) : c));
  const top = Math.max(...characters.map((c) => c.level));
  const achievements = world.achievements.map((a): AccountAchievement => {
    if (isDone(a)) return a;
    let changed = false;
    const objectives = a.objectives.map((o) => {
      const n = o.type === "combat_level" ? (top >= o.total ? o.total - o.progress : 0) : (prog.get(`${o.type}:${o.target ?? ""}`) ?? 0);
      if (n <= 0 || o.progress >= o.total) return o;
      changed = true;
      return { ...o, progress: Math.min(o.total, o.progress + n) };
    });
    if (!changed) return a;
    const b = { ...a, objectives };
    return isDone(b) ? { ...b, completed_at: new Date(end).toISOString() } : b;
  });
  let bank = world.bank;
  if (step.withdraw && Object.keys(step.withdraw).length) {
    bank = bank.map((x) => (step.withdraw![x.code] ? { ...x, quantity: Math.max(0, x.quantity - step.withdraw![x.code]) } : x));
  }
  return { ...world, characters, achievements, bank, clock: { ...world.clock, [ch.name]: end } };
}

export interface Played { at: number; step: Step }
export interface Forward { world: World; played: Played[]; completed: { code: string; points: number; at: number }[] }

/**
 * decide → advance until `until`: the character free first decides next (ties in account order), seeing the
 * others' running steps as `current` and its own last one; a step is applied when it ends. Steps still running
 * at `until` are not counted.
 */
export function forward(world: World, until: number, onDecide?: (w: World, step: Step) => void): Forward {
  const names = world.characters.map((c) => c.name);
  let w: World = { ...world, clock: { ...world.clock } };
  const free: Record<string, number> = Object.fromEntries(names.map((n) => [n, w.clock![n] ?? w.now]));
  const pending: Record<string, Step | undefined> = {};
  const last: Record<string, Step | undefined> = { ...world.current };
  const played: Played[] = [];
  const completed: Forward["completed"] = [];
  for (;;) {
    let name = names[0];
    for (const n of names) if (free[n] < free[name]) name = n;
    const t = free[name];
    if (t >= until) break;
    if (pending[name]) {
      const before = new Set(w.achievements.filter(isDone).map((a) => a.code));
      w = advance(w, pending[name]!);
      for (const a of w.achievements) if (isDone(a) && !before.has(a.code)) completed.push({ code: a.code, points: a.points, at: t });
    }
    const current = Object.fromEntries(names.map((n) => [n, n === name ? last[n] : pending[n]]));
    w = { ...w, now: t, current, clock: { ...w.clock, [name]: t } };
    const step = decide(name, w);
    onDecide?.(w, step);
    played.push({ at: t, step });
    last[name] = pending[name] = step;
    free[name] = finish(t, step.hours, w).end;
  }
  return { world: w, played, completed };
}

/**
 * The open achievements and what each waits for, fleet-wide (a gate counts as met when any character meets
 * it): unhandled, another layer, an event, a group, use, offerings, a level, gear (no safe win from the
 * bank), filler not reached, does not fit.
 */
export function waitingOf(world: World): { achievement: string; points: number; waits: string; why?: string }[] {
  const targets = targetsOf(world);
  const unhandled = unhandledOf(world);
  const top = (lane: Lane): number => Math.max(...world.characters.map((c) => levelOf(c, lane)));
  const out: ReturnType<typeof waitingOf> = [];
  for (const a of world.achievements) {
    if (isDone(a)) continue;
    const u = unhandled.find((x) => x.achievement === a.code);
    if (u) { out.push({ achievement: a.code, points: a.points, waits: u.why.includes("raid") ? "a raid" : "unhandled", why: u.why }); continue; }
    const ts = targets.filter((t) => t.achievement === a.code);
    const gs = ts.flatMap((t) => [...t.gates, ...(t.inputs ?? []).flatMap((i) => i.gates)]).filter((g) => !world.characters.some((c) => met(g, c, world)));
    const has = (k: string): boolean => gs.some((g) => g.kind === k);
    const waits =
      has("layer") ? "another layer" : has("event") ? "an event" : has("group") ? "a group"
      : ts.some((t) => t.work.kind === "use") ? "use" : ts.every((t) => t.work.kind === "favor") ? "offerings"
      : gs.some((g) => (g.kind === "level" && g.level > top(g.lane)) || (g.kind === "win" && g.level > top("combat"))) ? "a level"
      : has("win") ? "gear (no safe win from the bank)" : ts.some((t) => t.filler) ? "filler not reached" : "does not fit";
    out.push({ achievement: a.code, points: a.points, waits });
  }
  return out;
}

export interface Outlook { next: Record<string, Step[]>; expected: number; completed: Forward["completed"]; notes: string[] }

/** The next `n` steps of each character and the points expected at config.deadline, from decide and advance run forward. */
export function outlook(world: World, n: number): Outlook {
  const r = forward(world, Date.parse(world.config.deadline));
  const next: Record<string, Step[]> = {};
  for (const p of r.played) if ((next[p.step.character] ??= []).length < n) next[p.step.character].push(p.step);
  return {
    next, expected: pointsOf(r.world), completed: r.completed,
    notes: ["offerings count their favors and their time, not their XP", "events are not simulated", "no gear is made: the fighters level on what the bank holds"],
  };
}
