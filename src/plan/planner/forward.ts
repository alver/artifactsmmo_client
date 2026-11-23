// The same rule played forward (design B.4, task 007 section 9): advance() applies a finished step by the
// estimates, forward() runs decide/advance until a time (road.ts gives it to the Roadmap). Pure.
//
// Task 009 section 8: gear is worn — when a step starts, its set (Step.wear) leaves the bank and what the character
// wore before goes back (a step with no set — craft, train, task, buy — returns it all); what a step gathers, drops
// and crafts is in the bank when it ends, at the expected quantities (fractions kept); a craft takes its materials
// from the bank, a buy its currency; a crafted gear piece is bank stock.
// Left out, on purpose: the XP of offerings and of an active favor (conservative; the favors are dropped from the
// World); what a `train` step sources and recycles inside its item; utility potions, runes,
// artifacts and bags (not worn by the model). Task 012: a kill step's potions leave the bank when it ends (drinksOf:
// the brewed potion first, then its ingredients), so a covered ingredient's stock runs out as in play; a combat XP gain
// counts the worn set's wisdom. A level-up adds 5 max HP (the atlas's 115 + 5·L). Task 013, settled point 8: events
// are attended by expectation, no dice — per event code with open demand that can still pay, each member (the rule of
// settled point 3, the spawn assumed live: events.ts sharesOf) gives the share usable seconds a spawn ÷ the mean seconds
// between spawns of its time; the step under it takes that much longer (stretch) and the event's work — kills, drops at
// their expected rates, XP, the potions drunk — is applied after it as a kill or gather step's; demand met, the share ends.

import { atlas } from "../../catalog/atlas";
import { item, monster as monsterOf, resource as resourceOf } from "../../catalog";
import { STAT_CODES } from "../../sim/types";
import { GEAR_SLOTS, slotCode } from "../../types/api";
import { fightXp } from "../xp";
import { craftsPerLevel, hoursToLevel, levelOf, perOf } from "./cost";
import { decide, met } from "./decide";
import { isOn } from "./gates";
import { calendar, eventStep, eventWork, materialCal, possibleMembers, sharesOf, stretch } from "./events";
import { consFree, consumed, potionSet, runeBought, runePays } from "./consumables";
import { fareShort, fightRec, homeBankOf, winLevel } from "./reach";
import { available } from "./stock";
import { billOf } from "./supply";
import { isDone, targetsOf, unhandledOf } from "./targets";
import { craftXpOf, gatherXp } from "./xp";
import type { AccountAchievement, BankItem, Character, GearSlot } from "../../types/api";
import type { Gate, Lane, Step, Target, Work, World } from "./types";

/** The slots the model wears (runes, artifacts, utilities and bags stay as they are). */
const WORN: GearSlot[] = GEAR_SLOTS.filter((g) => !g.startsWith("artifact") && !g.startsWith("utility") && g !== "bag");

/** A bank with `delta` added (code → quantity, may be fractional or negative). */
export function bankPlus(bank: BankItem[], delta: Map<string, number>): BankItem[] {
  if (!delta.size) return bank;
  const out = bank.map((b) => (delta.has(b.code) ? { ...b, quantity: b.quantity + delta.get(b.code)! } : b));
  for (const [code, q] of delta) if (!bank.some((b) => b.code === code)) out.push({ code, quantity: q });
  return out.filter((b) => Math.abs(b.quantity) > 1e-9);
}

/** Section 6: the step's set goes on at its start, what was worn before goes back to the bank; stats follow the gear. */
export function wear(world: World, step: Step): World {
  const idx = world.characters.findIndex((c) => c.name === step.character);
  if (idx < 0) return world;
  const ch = { ...world.characters[idx] } as Character & Record<string, number | string>;
  const delta = new Map<string, number>();
  const add = (code: string, q: number): void => void delta.set(code, (delta.get(code) ?? 0) + q);
  const stats = (code: string, sign: number): void => {
    for (const e of item(code)?.effects ?? []) {
      if (!STAT_CODES.has(e.code) || (e.code === "initiative" && ch.initiative == null)) continue; // task 025: the API's total follows the gear
      const f = e.code === "hp" ? "max_hp" : e.code;
      ch[f] = ((ch[f] as number) ?? 0) + sign * e.value;
    }
  };
  for (const g of WORN) {
    // task 025, settled point 5: a worn rune stays on (a reset does not strip it, a gathering step keeps it) unless a step's
    // set names one
    const now = slotCode(ch, g), want = g === "rune" ? step.wear?.rune ?? now : step.wear?.[g] ?? "";
    if (now === want) continue;
    if (now) { add(now, 1); stats(now, -1); }
    if (want) { add(want, -1); stats(want, 1); }
    ch[`${g}_slot`] = want;
  }
  if (!delta.size) return world;
  ch.hp = ch.max_hp as number;
  return { ...world, characters: world.characters.map((c, i) => (i === idx ? (ch as Character) : c)), bank: bankPlus(world.bank, delta) };
}

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

/**
 * Task 012, settled point 6: what a step's fights drink, leaving the bank when it ends — per kill work (the step's own
 * and its sources'), the potions the forecast of the set it is planned with drinks (reach.ts fightRec, `used`) × the
 * kills: the brewed potion first while the bank holds it (down to one unit), then its recipe's ingredients for the rest;
 * never below zero, a floor or what the others' running steps reserved. So the stock runs out as it will in play, and
 * the price (reach.ts potionPrice) returns to the field's.
 */
export function drinksOf(world: World, step: Step): Map<string, number> {
  // task 014, settled point 8: a step's consumables leave the bank with its withdraw (the mat: steps put them there); the
  // two shortcuts below (the one-unit stack, the ingredients drunk as if brewed) are report 013's model, consumables 0 only
  if (world.config.consumables ?? 1) return consFree(world) ? new Map() : consumed(world, step);
  const out = new Map<string, number>();
  const ch = world.characters.find((c) => c.name === step.character);
  if (!ch) return out;
  const kills: [string, number][] = [];
  if (step.work.kind === "kill") kills.push([step.work.monster, step.as === "supply" ? step.units : step.units * perOf(step.work)]);
  for (const s of step.sources ?? []) if (s.work.kind === "kill") kills.push([s.work.monster, s.times]);
  // what no running step reserved — the others' (stock.ts available, less the floor) and this one's own withdrawal (an
  // alchemy step that hunts its slimeballs drinks while it brews: the slimeballs it withdrew are the brew's)
  const left = (code: string): number => Math.max(0, available(code, world, step.character) - (step.withdraw?.[code] ?? 0) - (out.get(code) ?? 0));
  const take = (code: string, q: number, keep = 0): number => { const n = Math.min(q, Math.max(0, left(code) - keep)); if (n > 0) out.set(code, (out.get(code) ?? 0) + n); return n; };
  for (const [monster, n] of kills) {
    for (const [potion, k] of Object.entries(fightRec(ch, world, monster)?.forecast.used ?? {})) {
      // shortcut: a brewed stack is drunk down to one unit, not to none — the model plans a potion only while the pool holds
      // one, and in play the executor brews more from the bank (exec.ts provisionPotions); the rest comes from the
      // ingredients, and once they are gone the price is the field's. Upgrade with potions as supply through the bank.
      const rest = k * n - take(potion, k * n, 1);
      const r = item(potion)?.craft;
      if (rest <= 1e-9 || !r) continue;
      for (const g of r.items) take(g.code, (g.quantity * rest) / Math.max(1, r.quantity));
    }
  }
  return out;
}

const w0 = (s: Step): Work => s.work;
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
  const delta = new Map<string, number>(); // the bank at the step's end
  const put = (code: string, q: number): void => void delta.set(code, (delta.get(code) ?? 0) + q);
  // Task 017, settled point 9: the gold moves (config.tolls 1) — a kill earns its monster's mean gold (min..max), a
  // round trip pays its fares and consumes its keys. Tasks' gold, sales and expansions are left out.
  const tolls = !!(world.config.tolls ?? 1);
  let gold = tolls ? -(step.toll?.gold ?? 0) : 0;
  if (tolls) for (const [k, q] of Object.entries(step.toll?.keys ?? {})) put(k, -q);
  // task 025, settled point 2: the forward model throws no dice — a kill step's expected losses, (1 − p) ÷ p a win, walk
  // back through the fares and keys of the way back (step.fight.back); their seconds and potions are in the step's price
  const back = tolls && w0(step).kind === "kill" ? step.fight?.back : undefined;
  if (back && step.fight!.p > 0) {
    const losses = (step.as === "supply" ? step.units : step.units * perOf(step.work)) * ((1 - step.fight!.p) / step.fight!.p);
    gold -= losses * back.gold;
    for (const [k, q] of Object.entries(back.keys)) put(k, -losses * q);
  }
  const field = (w: Work, actions: number): void => {
    if (w.kind === "kill") {
      const m = monsterOf(w.monster);
      if (!m) return;
      if (tolls) gold += (actions * ((m.min_gold ?? 0) + (m.max_gold ?? 0))) / 2;
      add(`combat_kill:${m.code}`, actions);
      for (const d of m.drops) { add(`combat_drop:${d.code}`, actions * odds(d)); put(d.code, actions * odds(d)); }
      gain("combat", actions * fightXp(m.level, m.hp, m.type, ch.level, ch.wisdom ?? 0)); // task 012: the worn set's wisdom (wear keeps the stat)
    } else if (w.kind === "gather") {
      const r = resourceOf(w.resource);
      if (!r) return;
      for (const d of r.drops) { add(`gathering:${d.code}`, actions * odds(d)); put(d.code, actions * odds(d)); }
      gain(r.skill as Lane, actions * gatherXp(r.level, levelOf(ch, r.skill as Lane)));
    }
  };
  const w = step.work;
  if (w.kind === "kill" || w.kind === "gather") field(w, step.as === "supply" ? step.units : step.units * perOf(w));
  for (const s of step.sources ?? []) field(s.work, s.times);
  if (w.kind === "craft") {
    const r = item(w.code)?.craft;
    add(`crafting:${w.code}`, step.units);
    put(w.code, step.units);
    if (r) {
      const runs = step.units / Math.max(1, r.quantity);
      for (const g of r.items) put(g.code, -g.quantity * runs);
      gain(r.skill as Lane, runs * craftXpOf(w.code, levelOf(ch, r.skill as Lane)));
    }
  }
  if (w.kind === "buy") { add(`npc_buy:${w.code}`, step.units); put(w.code, step.units); put(w.currency, -w.price * step.units); }
  if (w.kind === "task") add("task:", step.units);
  add("favor:", offerings);
  for (const [code, q] of drinksOf(world, step)) put(code, -q); // task 012, settled point 6: the fights drank

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
  // task 023 (022's P0s): a tolled step's last item walks back to a bank on the home side, as in play — never stranded
  const at = step.place && step.toll?.via.length ? homeBankOf(step.place) ?? step.place : step.place;
  if (at) Object.assign(ch, { x: at.x, y: at.y, layer: at.layer });

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
  return { ...world, characters, achievements, bank: bankPlus(world.bank, delta), clock: { ...world.clock, [ch.name]: end }, ...(gold ? { bankGold: world.bankGold + gold } : {}) };
}

/** Task 013: an event the character attended while the step ran — its share of the time, the actions and hours it took. */
export interface Attended { code: string; share: number; actions: number; hours: number; perKill?: Record<string, number> }
export interface Played { at: number; step: Step; events?: Attended[] }
export interface Forward { world: World; played: Played[]; steps: number; completed: { code: string; points: number; at: number }[] }

/**
 * decide → wear → advance until `until`: the character free first decides next (ties in account order), seeing the
 * others' running steps as `current` and its own last one; its set goes on at once; a step is applied when it ends.
 * Steps still running at `until` are not counted. `onEnd` sees the world just after a step was applied — and after each
 * event step (task 013: the events the character attended while its step ran, by expectation — events.ts sharesOf; the
 * step takes that much longer, events.ts stretch, and the event's work is applied after it like a kill or gather step's).
 * Task 019, settled point 2: `seed` — per character a step in flight, what is left of it (road.ts leftOf): it does not
 * decide at its clock, its step ends first, its hours after the clock, and is applied like any other.
 * Task 020: a character that is off (config.on) is not played — no decision, no step, its gear stays on it; `keep` false
 * keeps no played step (`played` empty, `steps` counts them: road.ts reads the count only).
 */
export function forward(world: World, until: number, onDecide?: (w: World, step: Step) => void, onEnd?: (w: World, step: Step, before: World) => void, seed?: Record<string, Step>, keep = true): Forward {
  const names = world.characters.map((c) => c.name).filter((n) => isOn(n, world));
  let w: World = { ...world, clock: { ...world.clock }, favors: undefined }; // the forward model ignores favors
  const free: Record<string, number> = Object.fromEntries(names.map((n) => [n, w.clock![n] ?? w.now]));
  const pending: Record<string, Step | undefined> = {};
  const attends: Record<string, { hours: number; events: Attended[] } | undefined> = {};
  const last: Record<string, Step | undefined> = { ...world.current };
  for (const [n, s] of Object.entries(seed ?? {})) if (n in free) { w.clock![n] = free[n]; pending[n] = last[n] = s; free[n] = finish(free[n], s.hours, w).end; }
  const played: Played[] = [];
  let steps = 0;
  const completed: Forward["completed"] = [];
  for (;;) {
    if (!names.length) break;
    let name = names[0];
    for (const n of names) if (free[n] < free[name]) name = n;
    const t = free[name];
    if (t >= until) break;
    if (pending[name]) {
      const before = new Set(w.achievements.filter(isDone).map((a) => a.code));
      // task 012: every running step as `current`, so what a step's fights drink leaves the others' reservations alone
      let prev: World = { ...w, current: { ...pending } };
      const at = attends[name];
      w = advance(prev, at ? { ...pending[name]!, hours: at.hours } : pending[name]!);
      onEnd?.(w, pending[name]!, prev);
      for (const e of at?.events ?? []) {
        const s = eventStep(name, e.code, e.actions, e.perKill);
        if (!s) continue;
        prev = { ...w, current: { ...pending } };
        w = advance(prev, s);
        onEnd?.(w, s, prev);
      }
      for (const a of w.achievements) if (isDone(a) && !before.has(a.code)) completed.push({ code: a.code, points: a.points, at: t });
    }
    const current = Object.fromEntries(names.map((n) => [n, n === name ? last[n] : pending[n]]));
    w = { ...w, now: t, current, clock: { ...w.clock, [name]: t } };
    // task 025, settled point 5: the planner buys a healing rune where it pays (consumables.ts runePays) — in play the
    // merchant interrupt's buy and equip (state/planner.ts runeCheck)
    if (runePays(w, name).pays) w = runeBought(w, name);
    const step = decide(name, w);
    onDecide?.(w, step);
    const st = stretch(step.hours, sharesOf(name, w));
    w = wear(w, step);
    steps++;
    if (keep) played.push(st.events.length ? { at: t, step, events: st.events } : { at: t, step });
    last[name] = pending[name] = step;
    attends[name] = st.events.length ? st : undefined;
    free[name] = finish(t, st.hours, w).end;
  }
  return { world: w, played, steps, completed };
}

/**
 * The open achievements and what each waits for, fleet-wide (a gate counts as met when any character meets
 * it): unhandled, another layer, an event, a group, use, offerings, a level, gear (no admitted win, task 025, from the
 * bank), filler not reached, does not fit.
 */
export function waitingOf(world: World): { achievement: string; points: number; waits: string; why?: string }[] {
  const targets = targetsOf(world);
  const unhandled = unhandledOf(world);
  const top = (lane: Lane): number => Math.max(...world.characters.map((c) => levelOf(c, lane)));
  const calH = Math.max(0, (Date.parse(world.config.deadline) - world.now) / 3.6e6);
  const isEv = (g: Gate): boolean => g.kind === "event";
  /** Task 013, settled point 7: an event is waited for only when nobody can ever be a member or its calendar does not fit
   *  — an event objective's at its content, an event-only material's (a direct input or a leaf of a crafted one). */
  const evStuck = (ts: Target[]): boolean => !(world.config.events ?? 1) || ts.some((t) => {
    const w = eventWork(t);
    if (w && !(calendar(w.ev, w.actions, possibleMembers(w.ev, world)).hours <= calH)) return true;
    return (t.inputs ?? []).some((i) => {
      const leaves = i.source.kind === "craft" ? [...billOf(world, "", [[i.code, i.per * t.left]], undefined, false).leaves.values()] : [{ code: i.code, qty: i.per * t.left, gates: i.gates }];
      return leaves.some((l) => l.gates.some(isEv) && !(materialCal(l.code, l.qty, world).hours <= calH));
    });
  });
  const out: ReturnType<typeof waitingOf> = [];
  for (const a of world.achievements) {
    if (isDone(a)) continue;
    const u = unhandled.find((x) => x.achievement === a.code);
    if (u) { out.push({ achievement: a.code, points: a.points, waits: u.why.includes("raid") ? "a raid" : "unhandled", why: u.why }); continue; }
    const ts = targets.filter((t) => t.achievement === a.code);
    // task 012: a material made by another craft adds the gates of its bill (a craft gated at a level, settled point 8)
    const chain = (t: (typeof ts)[number]): Gate[] => (t.inputs ?? []).flatMap((i) => (i.source.kind === "craft" ? [...billOf(world, "", [[i.code, i.per * t.left]], undefined, false).leaves.values()].flatMap((l) => l.gates) : i.gates));
    const gs = ts.flatMap((t) => [...t.gates, ...chain(t)]).filter((g) => !world.characters.some((c) => met(g, c, world)));
    const has = (k: string): boolean => gs.some((g) => g.kind === k);
    // a gathering or crafting level nobody has an XP source on the way to
    const noRoad = gs.some((g) => g.kind === "level" && g.lane !== "combat" && g.level > top(g.lane) && !world.characters.some((c) => Number.isFinite(hoursToLevel(g.lane, levelOf(c, g.lane), g.level, world, c))));
    // Section 2: a combat gate nobody can price (no safe XP monster on the way) and a win nobody reaches within ten
    // levels wait for gear, not for a level.
    const combatGear = gs.some((g) =>
      (g.kind === "level" && g.lane === "combat" && g.level > top("combat") && !world.characters.some((c) => Number.isFinite(hoursToLevel("combat", c.level, g.level, world, c))))
      || (g.kind === "win" && !world.characters.some((c) => winLevel(c, world, g.monster) != null)));
    // task 020: a win the planner's potions make (consumables.ts potionSet, at the chain's price) waits for their stock, not gear
    const potions = combatGear && !!(world.config.consumables ?? 1) && gs.some((g) => g.kind === "win" && world.characters.some((c) => isOn(c.name, world) && !!potionSet(c, world, g.monster)));
    // task 017, settled points 4 and 11: a fare the gold budget cannot pay, coins the bank is short of
    const fare = has("layer") ? gs.map((g) => (g.kind === "layer" ? fareShort(world, g.type, g.code) : undefined)).find((s) => s != null && s > 0) : undefined;
    const coins = ts.flatMap((t) => (t.work.kind === "craft" || t.work.kind === "buy" ? billOf(world, "", (t.inputs ?? []).map((i): [string, number] => [i.code, i.per * t.left]), undefined, false).out : [])).find((o) => o.startsWith("tasks coins:"));
    const waits =
      fare != null ? `gold: ${Math.ceil(fare)} short for the fare`
      : has("layer") ? "another layer" : has("event") && evStuck(ts) ? "an event" : has("group") ? "a group"
      : coins ? coins
      : ts.some((t) => t.work.kind === "use") ? "use" : ts.every((t) => t.work.kind === "favor") ? "offerings"
      // task 025, settled point 9: a sale (turning_treasures_to_gold) is no step at all — not "does not fit"
      : ts.length && ts.every((t) => t.work.kind === "sell") ? "a sale (no step sources or sells it)"
      : potions ? "potions (an admitted win once they are made)"
      : combatGear ? "gear (no admitted win within ten levels)"
      : noRoad ? "a level with no XP source on the way"
      : gs.some((g) => g.kind === "level" && g.level > top(g.lane)) || has("win") ? "a level"
      : ts.some((t) => t.filler) ? "filler not reached" : "does not fit";
    out.push({ achievement: a.code, points: a.points, waits });
  }
  return out;
}
