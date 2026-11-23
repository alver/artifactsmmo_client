// Events in the planner (task 013; docs/design/planner.md F.2). Pure.
//
// Event work has one writer: for a live spawn of a monster or resource event, eventMembers(event, world) decides who
// goes (settled points 1–4) and the runtime (src/state/eventorders.ts) puts an `event` interrupt ahead of each member's
// step: [bank reset into the set for the work, fight or gather with times 0, deposit-all] (tripOf). A target with an
// event gate is never a step (decide.ts rank()).
//
// A spawn counts when its content serves open demand (eventDemand): an open objective whose work is to kill the
// event's monster (kills, or a drop of it) or to gather a drop of its node, and what an open parent's bill is short of
// of an event-only material whose source is this content. XP alone is none. One action serves every demand at once, so
// a spawn's demand in actions is the largest of them.
//
// In the score an event is a calendar, not a wall (settled point 7): calendar() = the spawns needed (actions ÷ the
// actions all members bring a spawn) × the mean time between spawns (gapSec). The same function prices an event
// achievement in its bundle (bundle.ts, membersAt), an event-only material in a bill (supply.ts, materialCal), the
// runtime's "can still pay" (eventDemand, possibleMembers) and the forward model's share (sharesOf, forward.ts).

import { catalog, item, itemName, monster as monsterOf, resource as resourceOf, tileAt } from "../../catalog";
import type { GameEvent } from "../../catalog";
import { killSeconds } from "../bis";
import { jobGear, ownedQtyOf } from "../jobgear";
import { EVENT_MIN_SEC, EVENT_SEEN_SEC, MARGIN, SPAWN_LOG, STEP_BANK_SEC, killLog } from "./config";
import { actionSec, killWalk, levelOf, perOf } from "./cost";
import { WEAR_SLOTS } from "./decide";
import { isOn } from "./gates";
import { gearPieces, pieceParent } from "./gear";
import { CITY, bankSec, chAt, fightRec, openOf, placeOf, planRec, potionPrice, safeWin, travel, winLevel, wins } from "./reach";
import { rolesFor } from "./roles";
import { available, poolBank, reserved } from "./stock";
import { STACK, potionSet, takeOf, useOf } from "./consumables";
import { objectiveParents, supplyNeeds } from "./supply";
import { perUnit, sourceFor, targetsOf, unhandledOf } from "./targets";
import type { Parent } from "./supply";
import type { QueueItemInput } from "../queue";
import type { ActiveEvent, Character } from "../../types/api";
import type { Lane, Place, Step, Target, Work, World } from "./types";

export interface Content { type: "monster" | "resource"; code: string }
/** A member of a spawn: seconds an action at the content (a kill: the fight, healing and walks, its potions brewed
 *  before the trip — free inside the hour, settled point 3; a gather: actionSec), from `level` (a monster won later). */
export interface Member { name: string; sec: number; level?: number }

const evOn = (world: World): boolean => !!(world.config.events ?? 1);
const pkey = (p: Place): string => `${p.layer}:${p.x},${p.y}`;

/** The event of events.json by code. */
export const eventOf = (code: string): GameEvent | undefined => catalog().events.get(code);
/** A monster or resource event's content (merchants have none here: settled point 10). */
export const contentOf = (ev: GameEvent): Content | undefined =>
  ev.content.type === "monster" || ev.content.type === "resource" ? { type: ev.content.type, code: ev.content.code } : undefined;
/** The event whose gate a target carries, with its content (a merchant's: none). */
export function eventGateOf(t: Pick<Target, "gates">): { ev: GameEvent; content: Content } | undefined {
  for (const g of t.gates) {
    if (g.kind !== "event") continue;
    const ev = eventOf(g.code), content = ev && contentOf(ev);
    if (ev && content) return { ev, content };
  }
  return undefined;
}

/** Settled point 7: the mean seconds between two spawns of an event (config.ts SPAWN_LOG). */
export const gapSec = (ev: GameEvent): number => (ev.rate + ev.duration) * 60 * SPAWN_LOG;

/** The event's tiles a free route reaches from `from`. */
const tilesOf = (ev: GameEvent, from: Place = CITY): Place[] =>
  ev.maps.map((m) => ({ x: m.x, y: m.y, layer: m.layer })).filter((p) => travel(from, p) != null);

/** Seconds a member works a spawn, in expectation: the duration less half a poll, the reset's bank moves and the walks
 *  (to the bank, and from it to the nearest of the event's tiles).
 *  shortcut: both walks are taken as the tile's own walk to its nearest bank; upgrade if members come from far away */
export function usableSec(ev: GameEvent): number {
  const walk = Math.min(...tilesOf(ev).map((p) => bankSec(p)));
  return Number.isFinite(walk) ? Math.max(0, ev.duration * 60 - EVENT_SEEN_SEC - STEP_BANK_SEC - 2 * walk) : 0;
}

/** Seconds one action at the content takes this character (∞: no win as config.risk asks); `level` for a monster it wins
 *  only later (the planning-grade solve there, reach.ts winLevel). */
export function contentSec(c: Content, ch: Character, world: World, level = ch.level): number {
  if (c.type === "resource") return actionSec({ kind: "gather", resource: c.code, drop: "" }, ch, world);
  const at = level === ch.level ? ch : chAt(ch, level);
  const r = at === ch ? (safeWin(ch, world, c.code) ? fightRec(ch, world, c.code) : undefined) : planRec(at, world, c.code);
  if (!r || !wins(r, world)) return Infinity;
  // task 014: the potions a member drinks are the event's reserve, made before the trip (free inside the hour); its food is eaten
  return killSeconds(r.forecast, () => 0, potionPrice(world, ch.name).food?.(r.forecast.maxHp - r.forecast.hpRemaining)) * killLog(world) + killWalk(ch, world, c.code);
}

const possibleMemo = new WeakMap<World, Map<string, Member[]>>();
/** Settled point 4: everybody that is on who can ever be a member of the event's spawns — a node: its skill met or the
 *  lane's role held; a monster (no boss): won safely now or within ten levels (reach.ts winLevel); a route from the city
 *  to one of its tiles. Nobody with config.events 0. Memoised per World. */
export function possibleMembers(ev: GameEvent, world: World): Member[] {
  let byCode = possibleMemo.get(world);
  if (!byCode) possibleMemo.set(world, (byCode = new Map()));
  const hit = byCode.get(ev.code);
  if (hit) return hit;
  const out: Member[] = [];
  const c = contentOf(ev);
  const fw = (world.config.consumables ?? 1) ? openOf(world) : world;
  if (c && evOn(world) && tilesOf(ev).length) {
    for (const ch of world.characters) {
      if (!isOn(ch.name, world)) continue;
      if (c.type === "resource") {
        const r = resourceOf(c.code), lane = r?.skill as Lane;
        if (r && (levelOf(ch, lane) >= r.level || rolesFor(world)[ch.name]?.includes(lane))) out.push({ name: ch.name, sec: contentSec(c, ch, world) });
        continue;
      }
      const m = monsterOf(c.code);
      if (!m || m.type === "boss" || m.type === "raid_boss" || m.level > ch.level + 20) continue; // ten levels up and ten more: no win
      // task 014 (consumables 1): whether it can ever be a member is judged on the fleet's gear (reach.ts openOf)
      let at = winLevel(ch, fw, m.code);
      let sec = at == null ? Infinity : contentSec(c, ch, fw, at);
      // task 014, settled point 7: a member with the potions its reserve would hold — the potion set at its level now
      // (consumables.ts potionSet, on the fleet's gear: reach.ts openOf); the spawn itself still asks for a safe win from
      // the pool (eventMembers)
      const r = !Number.isFinite(sec) && (world.config.consumables ?? 1) ? potionSet(ch, world, m.code, true) : undefined;
      if (r) { at = ch.level; sec = killSeconds(r.forecast, () => 0, potionPrice(world, ch.name).food?.(r.forecast.maxHp - r.forecast.hpRemaining)) * killLog(world) + killWalk(ch, world, m.code); }
      if (Number.isFinite(sec)) out.push({ name: ch.name, sec, level: at });
    }
  }
  byCode.set(ev.code, out);
  return out;
}

/** Settled point 7, a bundle's members: at `level` of `lane`, the role holders of a gathering lane, the fighters whose
 *  pool wins the monster safely by `level` (winLevel) — the characters that are on. */
export function membersAt(ev: GameEvent, lane: Lane, level: number, world: World): Member[] {
  const c = contentOf(ev);
  if (!c) return [];
  return possibleMembers(ev, world).filter((m) => (c.type === "resource" ? !!rolesFor(world)[m.name]?.includes(lane) : (m.level ?? Infinity) <= level));
}

export interface Calendar { spawns: number; hours: number; perSpawn: number; charH: number; members: number }
/** Settled point 7: `actions` at the event's content with these members — the spawns needed (whole spawns), the
 *  calendar hours (× the mean time between spawns), the actions all of them bring a spawn, and the character-hours they
 *  spend there (the exact share of spawns × each member's usable seconds). ∞ with nobody. */
export function calendar(ev: GameEvent, actions: number, members: Member[]): Calendar {
  const use = usableSec(ev);
  const perSpawn = members.reduce((s, m) => s + use / m.sec, 0);
  if (actions <= 1e-9) return { spawns: 0, hours: 0, perSpawn, charH: 0, members: members.length };
  if (!(perSpawn > 0)) return { spawns: Infinity, hours: Infinity, perSpawn: 0, charH: Infinity, members: 0 };
  const exact = actions / perSpawn;
  const spawns = Math.ceil(exact - 1e-9);
  return { spawns, hours: (spawns * gapSec(ev)) / 3600, perSpawn, charH: (exact * members.length * use) / 3600, members: members.length };
}

/** A target's event work: its event, content and actions left at that content. */
export function eventWork(t: Target): { ev: GameEvent; content: Content; actions: number } | undefined {
  const e = eventGateOf(t);
  return e && { ...e, actions: t.left * perOf(t.work) };
}

/** Settled point 7, a bill: `qty` of an event-only material at its source's content, with everybody that can ever be a
 *  member (supply.ts billOf). ∞ hours: nobody can. */
export function materialCal(code: string, qty: number, world: World): { event: string; hours: number; spawns: number } {
  const s = sourceFor(code);
  const e = typeof s === "string" ? undefined : eventGateOf(s);
  if (typeof s === "string" || !e) return { event: "?", hours: Infinity, spawns: Infinity };
  const c = calendar(e.ev, qty * perOf(s.work), possibleMembers(e.ev, world));
  return { event: e.ev.code, hours: c.hours, spawns: c.spawns };
}

// ── the demand of a spawn (settled point 2) ──────────────────────────────────

export interface DemandItem {
  what: string;       // "100 Bandit Lizard kills", "6 Lizard Skin"
  for: string;        // the achievement, or the parent's label
  key: string;        // the target's key, or the parent's
  actions: number;    // at this content
  points: number;
  hours: number;      // the achievement's calendar with everybody (the parent's whole chain)
  fits: boolean;      // settled point 4: it completes by the deadline
  spawns: number;     // the spawns it needs with everybody
}
export interface Demand { items: DemandItem[]; actions: number; score: number; expected: number }

const unitOf = (c: Content, w: Work): string =>
  w.kind === "kill" && !w.drop ? `${monsterOf(c.code)?.name ?? c.code} kills` : itemName(w.kind === "kill" || w.kind === "gather" ? w.drop ?? "" : "");

const matMemo = new WeakMap<World, Map<string, ReturnType<typeof supplyNeeds>>>();
/** The open parents' event-only materials short (rank()'s parents: the objective parents and the gear pieces). */
function materialNeeds(world: World, name: string): ReturnType<typeof supplyNeeds> {
  let byName = matMemo.get(world);
  if (!byName) matMemo.set(world, (byName = new Map()));
  let out = byName.get(name);
  if (!out) {
    const calH = Math.max(0, (Date.parse(world.config.deadline) - world.now) / 3.6e6);
    const parents: Parent[] = objectiveParents(world, name, calH);
    const others = Object.entries(world.current).filter(([n, s]) => n !== name && s).map(([, s]) => s!);
    for (const [code, p] of gearPieces(world, name)) {
      const qty = [...p.copies.values()].reduce((s, x) => s + x, 0) - others.reduce((t, s) => t + (s.target === `gear:${code}` ? s.units : 0), 0);
      if (qty > 0) parents.push(pieceParent(code, p, qty, world, name));
    }
    out = supplyNeeds(world, name, parents, () => 0).filter((s) => s.kind === "src" && s.gates.some((g) => g.kind === "event"));
    byName.set(name, out);
  }
  return out;
}

/**
 * Settled point 2: the open demand a spawn of this event serves, at its content, and settled point 4: which of it can
 * still pay — the achievement completes by the deadline at this event's calendar with everybody that can ever be a
 * member (and its other event objectives at theirs; an unhandled objective never completes); a material's parent fits
 * the deadline with its calendar in its hours. `name`: the deciding character of a forward model (its gear needs are
 * memoised), "" for the fleet.
 */
const demandMemo = new WeakMap<World, Map<string, Demand>>();
export function eventDemand(ev: GameEvent, world: World, name = ""): Demand {
  // task 014: memoised per World, name and event (the consumables' event work and the forward model's shares both ask)
  let byKey = demandMemo.get(world);
  if (!byKey) demandMemo.set(world, (byKey = new Map()));
  const k = `${name}|${ev.code}`;
  let d = byKey.get(k);
  if (!d) byKey.set(k, (d = demandOf(ev, world, name)));
  return d;
}
function demandOf(ev: GameEvent, world: World, name: string): Demand {
  const c = contentOf(ev);
  const calH = Math.max(0, (Date.parse(world.config.deadline) - world.now) / 3.6e6);
  const expected = (calH * 3600) / gapSec(ev);
  const out: Demand = { items: [], actions: 0, score: 0, expected };
  if (!c || !evOn(world)) return out;
  const m = c.type === "monster" ? monsterOf(c.code) : undefined;
  const r = c.type === "resource" ? resourceOf(c.code) : undefined;
  const drops = m?.drops ?? r?.drops ?? [];
  let mem: Member[] | undefined; // solved only when something is demanded
  const members = (): Member[] => (mem ??= possibleMembers(ev, world));
  const targets = targetsOf(world);
  const unhandled = new Set(unhandledOf(world).map((u) => u.achievement));
  /** Every other event objective of the achievement fits at its own event. */
  const othersFit = (t: Target): boolean => targets.every((o) => {
    if (o === t || o.achievement !== t.achievement || !o.gates.some((g) => g.kind === "event")) return true;
    const w = eventWork(o);
    return !!w && !o.gates.some((g) => g.kind === "layer" || g.kind === "group") && calendar(w.ev, w.actions, possibleMembers(w.ev, world)).hours <= calH;
  });
  for (const t of targets) {
    if (!t.achievement) continue;
    const w = t.work;
    const per =
      w.kind === "kill" && m && w.monster === m.code && !w.drop ? 1
      : w.kind === "kill" && m && w.drop && drops.some((d) => d.code === w.drop) ? perUnit(drops, w.drop)
      : w.kind === "gather" && r && drops.some((d) => d.code === w.drop) ? perUnit(drops, w.drop)
      : 0;
    if (!per || !Number.isFinite(per)) continue;
    const actions = t.left * per;
    const cal = calendar(ev, actions, members());
    const fits = cal.hours <= calH && !unhandled.has(t.achievement) && !t.gates.some((g) => g.kind === "layer" || g.kind === "group") && othersFit(t);
    const pts = t.points * (world.config.weight[t.achievement] ?? 1);
    out.items.push({ what: `${t.left} ${unitOf(c, w)}`, for: t.achievement, key: t.key, actions, points: pts, hours: cal.hours, fits, spawns: cal.spawns });
  }
  for (const s of materialNeeds(world, name)) {
    const sw = s.work;
    if (!((sw.kind === "kill" && sw.monster === c.code) || (sw.kind === "gather" && sw.resource === c.code))) continue;
    const cal = calendar(ev, s.short, members());
    out.items.push({ what: `${Math.ceil(s.short / perOf(sw) - 1e-9)} ${itemName(s.code)}`, for: s.parent.label, key: s.parent.key, actions: s.short, points: s.parent.points, hours: s.parent.hours, fits: s.parent.fit > 0, spawns: cal.spawns });
  }
  for (const i of out.items) if (i.fits) {
    out.actions = Math.max(out.actions, i.actions);
    out.score = Math.max(out.score, i.points / Math.max(0.01, i.hours));
  }
  return out;
}

// ── who goes to a spawn (settled point 3) ────────────────────────────────────

/** A member with the actions it brings in the `use` seconds of the spawn it works and its set; any other owned character
 *  with why not (the line's words). */
export interface Verdict { name: string; member: boolean; why: string; actions?: number; use?: number; set?: Record<string, string>; perKill?: Record<string, number>; take?: Record<string, number> }
export interface EventPlan {
  key: string;        // code@created_at, as state/events.ts eventKey
  code: string;
  content: Content;
  at: Place;
  until: number;
  demand: Demand;
  members: Verdict[]; // the members in the order chosen (one already on the trip first)
  others: Verdict[];  // every other owned character, with why not
  line: string;       // the dev log's `plan: event …` line (settled point 6)
}

const bankMemo = new Map<string, { place: Place; sec: number } | null>();
/** The bank nearest a place by a free route (the island's conditional bank is never taken, as reach.ts bankSec). */
function nearestBank(p: Place): { place: Place; sec: number } | undefined {
  const k = pkey(p);
  let b = bankMemo.get(k);
  if (b === undefined) {
    b = null;
    for (const t of catalog().maps) {
      if (t.interactions?.content?.type !== "bank" || t.access?.type === "conditional") continue;
      const place = { x: t.x, y: t.y, layer: t.layer }, sec = travel(p, place);
      if (sec != null && (!b || sec < b.sec)) b = { place, sec };
    }
    if (bankMemo.size > 5000) bankMemo.clear();
    bankMemo.set(k, b);
  }
  return b ?? undefined;
}
/** The trip's way in: to the nearest bank (the reset), then from it to the tile; undefined: no free route. */
function walkTo(ch: Character, tile: Place): number | undefined {
  const b = nearestBank(placeOf(ch));
  const leg = b && travel(b.place, tile);
  return b && leg != null ? b.sec + leg : undefined;
}

/** The set a member's trip wears (decide.ts wearOf's slots): the fight solve's, or the gather argmax. */
function setOf(c: Content, ch: Character, world: World): Record<string, string> {
  const set = c.type === "monster" ? fightRec(ch, world, c.code)?.slots : jobGear(ch, poolBank(world, ch.name), { kind: "gather", skill: resourceOf(c.code)?.skill ?? "" });
  const out: Record<string, string> = {};
  for (const g of WEAR_SLOTS) if (set?.[g]) out[g] = set[g]!;
  return out;
}
/** The world with a member's set out of the others' pool (its step underneath waits: its own reservations stay). Task 023,
 *  settled point 2 (d): the set is booked beside the step underneath's `wear`, never over it (the trip's reset banks the
 *  step's pieces, its way back wears them again) — a code as many times as the more of the two wears it; the take less what
 *  the member holds already (its reset banks its bag and worn stacks first). */
function withSet(world: World, ch: Character, set: Record<string, string>, take?: Record<string, number>): World {
  const name = ch.name, cur = world.current[name];
  const stub = { key: `event@${name}`, target: "event", character: name, as: "fallback", work: { kind: "task" }, units: 0, hours: 0, score: 0, why: "" } as Step;
  const count = (m: Record<string, string>): Map<string, number> => { const n = new Map<string, number>(); for (const c of Object.values(m)) n.set(c, (n.get(c) ?? 0) + 1); return n; };
  const under = count(cur?.wear ?? {}), trip = count(set);
  const wear: Record<string, string> = { ...(cur?.wear ?? {}) };
  for (const [c, n] of trip) for (let i = under.get(c) ?? 0; i < n; i++) wear[`event:${c}:${i}`] = c;
  const held = ownedQtyOf(ch, []);
  const left = take && Object.fromEntries(Object.entries(take).map(([c, q]) => [c, q - (held.get(c) ?? 0)]).filter(([, q]) => (q as number) > 0));
  return { ...world, current: { ...world.current, [name]: { ...(cur ?? stub), wear, ...(left ? { withdraw: { ...(cur?.withdraw ?? {}), ...left } } : {}) } } };
}

const isCons = (c: string): boolean => ["utility", "consumable"].includes(item(c)?.type ?? "");
const stockMemo = new WeakMap<World, Map<string, World>>();
/**
 * Task 023, settled point 2 (c): the World a member's set, kills and take are solved on — the stock its take may draw after
 * its reset: of a potion or a food, what the bank holds less the others' reservations (stock.ts available, the members
 * before it included), plus its own bag and worn stacks (the reset banks them first, then withdraws); its gear, the pool the
 * members before it left (stock.ts poolBank). `own`: a member already on its trip — what it carries (its take while its
 * reset is still to run, else what it holds), no bank: no second take inside a spawn. The World itself when that changes
 * nothing a solve reads (the forward model: no bags, no worn stacks — only a potion all reserved by the others differs).
 */
function stockWorld(w: World, ch: Character, own?: Record<string, number>): World {
  let m = stockMemo.get(w);
  if (!m) stockMemo.set(w, (m = new Map()));
  const fromBank = !own;
  const k = `${ch.name}|${own ? JSON.stringify(own) : ""}`;
  const hit = m.get(k);
  if (hit) return hit;
  const held = own ? new Map(Object.entries(own)) : ownedQtyOf(ch, []);
  const stock = (c: string): number => (fromBank ? available(c, w, ch.name) : 0) + (isCons(c) ? (held.get(c) ?? 0) : 0);
  const pool = poolBank(w, ch.name);
  const codes = new Set([...w.bank.map((b) => b.code), ...held.keys()].filter(isCons));
  // the World itself reads the bank's stock (available) for a take and a food, the pool (poolBank keeps a reserved potion)
  // for a potion: it differs with a consumable in the bag or a worn stack, or a pool potion the others reserved whole
  const differs = !fromBank || [...held].some(([c, q]) => isCons(c) && q > 0) || [...codes].some((c) => item(c)?.type === "utility" && pool.some((b) => b.code === c) && !(stock(c) > 0));
  let out = w;
  if (differs) {
    const bank = pool.filter((b) => !isCons(b.code));
    for (const c of codes) if (stock(c) > 0) bank.push({ code: c, quantity: stock(c) });
    // the reservations are off the bank already: none left to take off twice (the gold budget keeps the others' off)
    out = { ...w, bank, current: {}, bankGold: Math.max(0, w.bankGold - (reserved(w, ch.name).get("gold") ?? 0)) };
  }
  m.set(k, out);
  return out;
}
/** Task 023, settled point 2 (c): the kills a member's consumables pay for at its forecast's use a kill (useOf), MARGIN kept —
 *  as consumables.ts fightTake caps a fight step's. ∞: it uses none. */
const paidKills = (perKill: Record<string, number> | undefined, stock: (c: string) => number): number =>
  Object.entries(perKill ?? {}).reduce((k, [c, u]) => Math.min(k, Math.floor(stock(c) / (u * MARGIN) + 1e-9)), Infinity);
/** A member whose stacks pay for fewer kills is none (decide.ts SLIVER: a kill step's sliver, the same 5). */
const SLIVER = 5;

const fmtUntil = (ms: number): string => new Date(ms).toISOString().slice(11, 16);
const f0 = (x: number): string => (!Number.isFinite(x) ? "∞" : String(Math.round(x)));

/**
 * Settled points 1–4: who goes to this live spawn. Every owned character that is on and is not `busy` (the runtime's:
 * "group", "offering" after 22:00 UTC, or another spawn's key — its trip), meets the content's gate (a safe win from its
 * pool by safeWin, the node's skill level; a boss is nobody's), reaches the tile by a free route with EVENT_MIN_SEC of
 * it left after the walk and the bank reset; chosen one at a time, the one that brings the most actions first, each on
 * the pool less the sets of the members already chosen, while the demand left is more than the members so far bring.
 * A character `busy` with this spawn's key is on the trip already: it counts with what is left of the hour; one `busy`
 * with "done:<this key>" came back from it early and is not sent again. `demand` may be passed in (the forward model
 * computes it on its own World).
 */
export function eventMembers(e: ActiveEvent, world: World, busy: Record<string, string> = {}, demand?: Demand, trips: Trips = {}): EventPlan {
  return membersOf(e, world, busy, demand, trips).plan;
}
/** Task 023, settled point 2 (d): a member already on a spawn's trip — the set and the take its trip carries, and whether its
 *  reset is still to run (it has not withdrawn them yet) — the runtime's queue: state/eventorders.ts. */
export type Trips = Record<string, { wear?: Record<string, string>; take?: Record<string, number>; reset?: boolean }>;
/** eventMembers, and the World with its members' sets and takes booked (eventPlans hands it to the next spawn). */
function membersOf(e: ActiveEvent, world: World, busy: Record<string, string>, demand: Demand | undefined, trips: Trips): { plan: EventPlan; world: World } {
  const key = `${e.code}@${e.created_at}`;
  const ev = eventOf(e.code);
  const cc = e.map.interactions?.content;
  const content: Content = { type: cc?.type === "resource" ? "resource" : "monster", code: cc?.code ?? "" };
  const at: Place = { x: e.map.x, y: e.map.y, layer: e.map.layer ?? "overworld" };
  const until = Date.parse(e.expiration);
  const d = demand ?? (ev ? eventDemand(ev, world) : { items: [], actions: 0, score: 0, expected: 0 });
  const owned = world.characters.filter((ch) => isOn(ch.name, world));
  const members: Verdict[] = [], others: Verdict[] = [];
  const unit = content.type === "monster" ? "kills" : "gathers";
  const head = `event ${e.code} at (${at.x}, ${at.y}) until ${fmtUntil(until)}Z`;
  const what = (i: DemandItem): string => `${i.what} for ${i.for} (${f0(i.actions)} ${unit})`;
  const done = (why: string): { plan: EventPlan; world: World } => {
    for (const ch of owned) others.push({ name: ch.name, member: false, why });
    return { plan: { key, code: e.code, content, at, until, demand: d, members, others, line: `${head} — ${why}` }, world };
  };
  if (!ev || (cc?.type !== "monster" && cc?.type !== "resource")) return done("not a monster or resource event");
  if (!d.items.length) return done("nobody needs it: no open objective kills or gathers its content, no open parent is short of its drops");
  const fit = d.items.filter((i) => i.fits);
  const late = d.items.filter((i) => !i.fits).map((i) => `${what(i)} does not fit (${f0(i.spawns)} spawns needed, ${d.expected.toFixed(1)} expected by the deadline)`);
  if (!fit.length) return done(`does not fit: ${late.join("; ")}`);

  let left = d.actions;
  const rest: { ch: Character; sec: number }[] = []; // seconds of the spawn each candidate would work
  const onTrip: Character[] = [];
  for (const ch of owned) {
    const b = busy[ch.name]?.startsWith("done:") && busy[ch.name] !== `done:${key}` ? undefined : busy[ch.name]; // done elsewhere: free here
    if (b === `done:${key}`) { others.push({ name: ch.name, member: false, why: "its trip to this spawn ended early" }); continue; }
    if (b === key) { onTrip.push(ch); continue; }
    if (b === "group") { others.push({ name: ch.name, member: false, why: "in a group fight" }); continue; }
    if (b === "offering") { others.push({ name: ch.name, member: false, why: "its offering first (after 22:00 UTC)" }); continue; }
    if (b) { others.push({ name: ch.name, member: false, why: `on the trip to ${b.split("@")[0]}` }); continue; }
    if (content.type === "monster" && ["boss", "raid_boss"].includes(monsterOf(content.code)?.type ?? "")) { others.push({ name: ch.name, member: false, why: "a boss: group work" }); continue; }
    if (content.type === "resource") {
      const r = resourceOf(content.code)!, lv = levelOf(ch, r.skill as Lane);
      if (lv < r.level) { others.push({ name: ch.name, member: false, why: `gate: ${r.skill} ${lv} < ${r.level}` }); continue; }
    }
    const walk = walkTo(ch, at);
    if (walk == null) { others.push({ name: ch.name, member: false, why: "no free route to the tile" }); continue; }
    const sec = (until - world.now) / 1000 - walk - STEP_BANK_SEC;
    if (sec < EVENT_MIN_SEC) { others.push({ name: ch.name, member: false, why: `too far: ${Math.max(0, Math.floor(sec / 60))} min would be left` }); continue; }
    rest.push({ ch, sec });
  }
  let w = world;
  const capOn = !!(world.config.tolls ?? 1);
  // task 023, settled point 2 (d): a member already on the trip holds its set and its take, or takes them at its reset — none
  // of it is anyone else's (the 06:00 UTC trip of 11-22: Third's reset had not withdrawn the one Tromatising Mask by the next
  // poll, which booked it for Second as well)
  for (const ch of onTrip) w = withSet(w, ch, trips[ch.name]?.wear ?? {}, trips[ch.name]?.reset ? trips[ch.name]?.take : undefined);
  for (const ch of onTrip) {
    // (c): what it carries pays for its kills — its take while its reset is still to run, else what it holds; no second take
    const t = trips[ch.name];
    const own: Record<string, number> = t?.reset ? { ...t.take } : Object.fromEntries([...ownedQtyOf(ch, [])].filter(([c]) => isCons(c)));
    const use = Math.max(0, (until - world.now) / 1000);
    const wm = content.type === "monster" ? stockWorld(w, ch, own) : w;
    const sec = contentSec(content, ch, wm);
    const time = Number.isFinite(sec) ? use / sec : 0;
    const paid = capOn && content.type === "monster" ? paidKills(useOf(wm, ch, content.code), (c) => own[c] ?? 0) : Infinity;
    const n = Math.min(time, paid);
    members.push({ name: ch.name, member: true, why: `on the trip, ≈${f0(n)} ${unit} left${paid < time ? ` (its stacks buy ${f0(paid)})` : ""}`, actions: n, use: Number.isFinite(sec) ? n * sec : 0 });
    left -= n;
  }
  // one at a time: the most actions first — task 023 (c): the actions its stacks pay for — on the pool the members before it left
  const gate = new Map<string, string>();
  const sliver = world.config.sliver ?? SLIVER;
  while (rest.length && left > 1e-9) {
    type Pick = { i: number; n: number; s: number; time: number; paid: number; wm: World; perKill?: Record<string, number>; cap: (c: string) => number };
    let best: Pick | undefined;
    rest.forEach((x, i) => {
      // (c): the set, its kills and its take from one stock — what the take may draw after the reset
      const wm = content.type === "monster" ? stockWorld(w, x.ch) : w;
      const s = contentSec(content, x.ch, wm);
      if (!Number.isFinite(s)) return void gate.set(x.ch.name, members.length ? "gate: no safe win on the pool the members before it left" : "gate: no safe win");
      gate.delete(x.ch.name);
      const time = x.sec / s;
      // task 014, settled point 7: the trip's reset takes what the hour drinks and eats (its set's potions, its pool's food)
      const perKill = content.type === "monster" ? useOf(wm, x.ch, content.code) : undefined;
      // task 017, settled point 13: what the trip plans is what the bank holds for it — the stock this member may take (the
      // others' running steps and the members before it off), a potion one stack, the food at most a third of the bag (the
      // reset's cap); the full moon trip of 01:12 UTC on 11-21 planned 100 + 100 potions and 72 trout of a bank that held 54, 0 and 9
      const stock = (c: string): number => available(c, wm, x.ch.name);
      const cap = (c: string): number => Math.floor(Math.min(stock(c), item(c)?.type === "utility" ? STACK : x.ch.inventory_max_items / 3) + 1e-9);
      // task 023 (c): its kills are what the spawn's time gives and its take pays for, the lesser (consumables.ts fightTake)
      const paid = capOn ? paidKills(perKill, cap) : Infinity;
      const n = Math.min(time, paid);
      if (!best || n > best.n + 1e-9 || (Math.abs(n - best.n) <= 1e-9 && x.ch.name < rest[best.i].ch.name)) best = { i, n, s, time, paid, wm, perKill, cap };
    });
    if (!best) break;
    const b = best as Pick;
    const x = rest.splice(b.i, 1)[0];
    if (b.paid < sliver) { others.push({ name: x.ch.name, member: false, why: `its stacks buy ${f0(b.paid)} ${unit}` }); continue; }
    const set = setOf(content, x.ch, b.wm);
    const want = takeOf(b.perKill, b.n);
    const take = want && capOn ? Object.fromEntries(Object.entries(want).map(([c, q]) => [c, Math.min(q, b.cap(c))]).filter(([, q]) => (q as number) > 0)) : want;
    const use = b.n * b.s;
    const capped = b.paid < b.time ? ` (its stacks buy ${f0(b.paid)}; the spawn's time ${f0(b.time)})` : "";
    members.push({ name: x.ch.name, member: true, why: `≈${f0(b.n)} ${unit} in ${Math.round(use / 60)} min${take && Object.keys(take).length ? ` with ${Object.entries(take).map(([c, q]) => `${q} ${itemName(c)}`).join(" and ")}` : ""}${capped}`, actions: b.n, use, set, perKill: b.perKill, take });
    left -= b.n;
    w = withSet(w, x.ch, set, take);
  }
  for (const x of rest) others.push({ name: x.ch.name, member: false, why: gate.get(x.ch.name) ?? "not needed: the members bring the demand" });
  const line = `${head} — demand: ${fit.map(what).join("; ")}${late.length ? `; ${late.join("; ")}` : ""} → ${f0(d.actions)} ${unit}; members: ${members.map((m) => `${m.name} (${m.why})`).join(", ") || "none"}${others.length ? `; not: ${others.map((o) => `${o.name} — ${o.why}`).join(", ")}` : ""}`;
  return { plan: { key, code: e.code, content, at, until, demand: d, members, others, line }, world: w };
}

/** Settled point 3, two spawns at once: the demand with the better score takes its members first. */
export function eventPlans(events: ActiveEvent[], world: World, busy: Record<string, string> = {}, trips: Trips = {}): EventPlan[] {
  const field = events.filter((e) => ["monster", "resource"].includes(e.map.interactions?.content?.type ?? "") && Date.parse(e.expiration) > world.now);
  const scored = field.map((e) => { const ev = eventOf(e.code); return { e, d: ev ? eventDemand(ev, world) : undefined }; })
    .sort((a, b) => (b.d?.score ?? 0) - (a.d?.score ?? 0) || (a.e.code < b.e.code ? -1 : a.e.code > b.e.code ? 1 : 0));
  const taken = { ...busy };
  const out: EventPlan[] = [];
  let w = world; // task 023, settled point 2 (d): the next spawn's members plan on what this one's left
  for (const { e, d } of scored) {
    const r = membersOf(e, w, taken, d, trips);
    w = r.world;
    for (const m of r.plan.members) taken[m.name] = r.plan.key;
    out.push(r.plan);
  }
  return out;
}

/** Settled point 5: a member's trip — a bank reset into the set for the work, the work until the tile disappears (times
 *  0: the missing map target skips it), everything banked: `back`, the step underneath's own bank reset (it banks the
 *  drops too and puts the step's set back on — a craft item has no gear self-heal and resumed in the trip's set, the
 *  event-fleet-monster scenario), else deposit-all. */
export function tripOf(c: Content, back?: QueueItemInput, take?: Record<string, number>, wear?: Record<string, string>): QueueItemInput[] {
  const end: QueueItemInput = back ?? { kind: "deposit-all" };
  // task 017, settled point 13: the member's planned set is the trip's (`wear`, the executor's own solve only as a fallback)
  const w = wear && Object.keys(wear).length ? { wear } : {};
  if (c.type === "monster") return [{ kind: "gear", job: { kind: "fight", monster: c.code }, reset: true, ...w }, { kind: "fight", monster: c.code, times: 0, done: 0, gear: true, take: take ?? {}, ...w }, end];
  const r = resourceOf(c.code);
  const drop = [...(r?.drops ?? [])].sort((a, b) => a.rate - b.rate)[0]?.code ?? c.code;
  return [{ kind: "gear", job: { kind: "gather", skill: r?.skill ?? "" }, reset: true }, { kind: "gather", code: drop, resource: c.code, times: 0, done: 0, gear: true }, end];
}

// ── the forward model (settled point 8) ──────────────────────────────────────

/** An event a character attends while its step runs: the share of its time, seconds an action, the demand's actions. */
export interface Share { code: string; content: Content; share: number; sec: number; actions: number; perKill?: Record<string, number> }

/** A spawn of the event assumed live now at its first tile the city reaches, seen half a poll late. */
export function spawnOf(ev: GameEvent, now: number): ActiveEvent | undefined {
  const c = contentOf(ev), p = tilesOf(ev)[0];
  const tile = p && tileAt(p.x, p.y, p.layer);
  if (!c || !tile) return undefined;
  const created = new Date(now).toISOString();
  return { name: ev.name, code: ev.code, map: { ...tile, interactions: { content: { type: c.type, code: c.code }, transition: null } }, previous_map: tile, duration: ev.duration, expiration: new Date(now + (ev.duration * 60 - EVENT_SEEN_SEC) * 1000).toISOString(), created_at: created } as ActiveEvent;
}

/**
 * Settled point 8: the events this character attends by expectation while the step it decides runs — per event code
 * with open demand that can still pay, the rule of settled point 3 on this World with the spawn assumed live (no dice):
 * a member gives the share usable seconds ÷ the mean seconds between spawns of its time. None with config.events 0.
 */
export function sharesOf(name: string, world: World): Share[] {
  if (!evOn(world) || !isOn(name, world)) return [];
  const out: Share[] = [];
  for (const ev of catalog().events.values()) {
    const c = contentOf(ev);
    if (!c) continue;
    const d = eventDemand(ev, world, name);
    if (!(d.actions > 0)) continue;
    const e = spawnOf(ev, world.now);
    if (!e) continue;
    const w: World = { ...world, events: [...world.events, e] };
    const me = eventMembers(e, w, {}, d).members.find((m) => m.name === name);
    if (!me?.actions || !me.use) continue;
    out.push({ code: ev.code, content: c, share: me.use / gapSec(ev), sec: me.use / me.actions, actions: d.actions, perKill: me.perKill });
  }
  return out;
}

/** The step under the shares takes that much longer: its work `hours`, plus per share its time while its demand lasts
 *  (the uncapped event time is hours × share ÷ (1 − Σ shares)). */
export function stretch(hours: number, shares: Share[]): { hours: number; events: { code: string; share: number; actions: number; hours: number; perKill?: Record<string, number> }[] } {
  const S = shares.reduce((s, x) => s + x.share, 0);
  if (!shares.length) return { hours, events: [] };
  const free = Math.max(1e-6, 1 - S);
  const events = shares.map((x) => {
    const actions = Math.min(x.actions, (hours * 3600 * x.share) / free / x.sec);
    return { code: x.code, share: x.share, actions, hours: (actions * x.sec) / 3600, perKill: x.perKill };
  });
  return { hours: hours + events.reduce((s, x) => s + x.hours, 0), events };
}

/** The event's work as a step the forward model applies (advance): its actions, no hours (the step under it carries them). */
export function eventStep(name: string, code: string, actions: number, perKill?: Record<string, number>): Step | undefined {
  const ev = eventOf(code), c = ev && contentOf(ev);
  if (!c) return undefined;
  const work: Work = c.type === "monster" ? { kind: "kill", monster: c.code } : { kind: "gather", resource: c.code, drop: "" };
  // task 014: what the hour drinks and eats leaves the bank with the trip (forward.ts drinksOf)
  const withdraw = takeOf(perKill, actions);
  return { key: `event:${code}@${name}`, target: `event:${code}`, character: name, as: "supply", work, units: actions, hours: 0, score: 0, why: "event", ...(withdraw ? { withdraw } : {}) };
}

/** Whether any open objective or bill waits for an event's spawns (the poll's 2 minutes, settled point 6): an open
 *  target with an event gate, or a material of one's recipe. Cheap: no bill is opened. */
export function eventDemandOpen(world: World): boolean {
  if (!evOn(world)) return false;
  return targetsOf(world).some((t) => !!eventGateOf(t) || (t.inputs ?? []).some((i) => !!eventGateOf(i)));
}
