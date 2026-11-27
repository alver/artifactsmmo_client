// The fake game: a `fetch` for api.artifactsmmo.com that holds a world and
// executes actions against it. Response shapes are from docs/api/openapi.json;
// error codes and formulas from docs/audit/domain-rules.md (section in brackets).
// Every rule nobody confirmed is marked `guess:` — the same list is in the
// task report (tasks/002-runner-harness.report.md, "Fidelity").
//
// Task 015: the bank's slots (a slot is a code; a deposit of a code the bank holds
// no stack of answers 462 when none is free), `bank/buy_expansion` (+20 slots, the
// price from the character's gold, the next price doubled unless the scenario gives
// a ladder) and `recycling` (on the item's workshop at its level; per item
// xp.ts recycleReturn units of the recipe's ingredients, dealt in recipe order).
// Task 017: a gated tile opens on the scenario's achievements (the Tasks Trader), a
// `has_item` transition counts the bag and the worn set (the docs), and the public
// market read `GET /grandexchange/orders` answers from `world.ge` (its own counter).
// Task 025: the leaders' read — the leaderboard, `/accounts/{a}/characters` and
// `/accounts/{a}/achievements` asked without a token — answers byte for byte from
// report 024's snapshot (`world.publicReads`, `world.publicFault`).
// Not modelled: XP and levels (a level is what the scenario set), achievement
// conditions of transitions (always unmet), task trade and exchange (task 027d: new, complete and cancel are modelled) /
// give actions, `use` of anything but food,
// group fights. Achievements are what the scenario wrote (`world.achievements`;
// it moves progress by hand — nothing the fake does counts toward them).
// The altar knows only what the scenario's `offerings` list holds: no favor
// effects, no XP reward, no daily rotation.

import { readFileSync } from "node:fs";
import { API_BASE } from "../../src/api/client";
import { catalog, item, monster, npc, resource, task, tileAt } from "../../src/catalog";
import { canEquip } from "../../src/plan/bis";
import { fightSec, gatherSec, recycleReturn } from "../../src/plan/xp";
import { simulate } from "../../src/sim/combat";
import { restSeconds } from "../../src/sim/cost";
import { currentFighter } from "../../src/sim/stats";
import { GEAR_SLOTS, SLOTS_FOR_TYPE, slotCode } from "../../src/types/api";
import type { AccountAchievement, ActiveEvent, Character, GearSlot, PendingItem, SeasonalOffering, SelectedOffering } from "../../src/types/api";
import type { DropRate, GameMap, Item, ItemStack, MapContent } from "../../src/types/catalog";
import { T0 } from "./clock.mts";

/** A character of the world: any Character field, plus `bag` as a readable inventory and the `layer` it stands on. */
export type CharInit = Partial<Character> & { name: string; bag?: Record<string, number>; layer?: string };
export interface WorldInit {
  characters: CharInit[];
  bank?: Record<string, number>;
  gold?: number;
  events?: ActiveEvent[];
  /** The account's achievements as GET /accounts/{a}/achievements answers them. */
  achievements?: AccountAchievement[];
  /** Unclaimed rewards (GET /my/pending_items; POST claim_item/{id}). */
  pending?: PendingItem[];
  /** Today's offerings at the seasonal altar, the same for every character. */
  offerings?: SeasonalOffering[];
  /** Task 015: the bank's slots (default 500: room for any scenario that does not ask), the next expansion's price
   *  (default 4,500) and the prices after it (default: doubling). */
  slots?: number;
  nextExpansion?: number;
  ladder?: number[];
  /** Task 027d: the monsters tasks `task/new` hands out, in order (default: Chicken ×50). */
  draws?: { code: string; total: number }[];
}
/** One action call as the game saw it. `code` 200 = ok; "network" = an injected transport failure. */
export interface Call {
  t: number; // virtual ms since the scenario started
  who: string;
  action: string;
  body: unknown;
  code: number | "network";
  note?: string; // a fight's result
}
export interface Fault {
  who?: string;
  action?: string;
  n: number;
  code: number | "network";
  message?: string;
}
export interface ForcedFight {
  result: "win" | "loss";
  hpLost?: number;
  turns?: number;
  gold?: number;
  drops?: ItemStack[];
  /** Task 014: the worn utility potions the fight drinks (a simulated fight drinks what simulate() says it uses). */
  used?: Record<string, number>;
}

type Char = Character & { layer: string; map_id: number };

export const world = {
  chars: new Map<string, Char>(),
  bank: new Map<string, number>(),
  gold: 0,
  /** Task 015: the bank's slots, expansions bought, the next one's price and the prices after it. */
  slots: 500,
  expansions: 0,
  nextCost: 4500,
  ladder: [] as number[],
  draws: [] as { code: string; total: number }[],
  events: [] as ActiveEvent[],
  achievements: [] as AccountAchievement[],
  pending: [] as PendingItem[],
  offerings: [] as SeasonalOffering[],
  /** Per character: today's accepted / completed offerings. */
  altar: new Map<string, SelectedOffering[]>(),
  trace: [] as Call[],
  reads: [] as string[],
  /** Task 017: the Grand Exchange's orders (GET /grandexchange/orders), how often they were read, reads to refuse. */
  ge: [] as { id: string; type: "sell" | "buy"; account: string; code: string; quantity: number; price: number; created_at: string }[],
  geReads: 0,
  geFail: 0,
  /** Task 032 (E): the game's clock less the engine's, ms — a cooldown's start, its expiration and the 499 check read it. */
  skew: 0,
  /** Task 032: each code's trades (GET /grandexchange/history/{code}, oldest first as the game answers; none: 404), the codes whose history was
   *  read in order, and the reads of one order (GET /grandexchange/orders/{id}) — counted in `geReads` with the market read. */
  geHistory: {} as Record<string, { order_id: string; seller: string; buyer: string; code: string; quantity: number; price: number; sold_at: string }[]>,
  geHistoryReads: [] as string[],
  /** Task 025: the leaders' read — every public request asked without a token (virtual ms since the start, path and query),
   *  counted apart from `reads`; `publicFault` answers the public request after `after` more with `code`, once. */
  publicReads: [] as { t: number; path: string }[],
  publicFault: null as { after: number; code: number } | null,
  ended: false,
  /** What each gather of a resource / kill of a monster yields; unset = the catalog default (see yieldOf). */
  yields: new Map<string, ItemStack[]>(),
  /** "The next n calls matching (who, action) answer with `code`" — consumed in the order added. */
  fault(f: Fault): void {
    faults.push({ ...f });
  },
  /** The character's next fights end this way instead of by simulation, in order. */
  forceFight(who: string, ...fights: ForcedFight[]): void {
    forced.set(who, [...(forced.get(who) ?? []), ...fights]);
  },
  /** Called for anything the fake cannot answer; index.mts installs one that prints the trace and exits. */
  onFatal: (msg: string): never => {
    throw new Error(msg);
  },
};
const faults: Fault[] = [];
const forced = new Map<string, ForcedFight[]>();
const counts = new Map<string, number>();

/** Not implemented / not allowed: ends the scenario at once — never a code the runner would retry. */
const fatal = (msg: string): never => world.onFatal(`fake game: ${msg}`);

class GameError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

// The fixed random source of simulated fights (crits): mulberry32, seed 1.
let seed = 1;
const rng = (): number => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ── the world ────────────────────────────────────────────────────────────────

const SKILLS = ["mining", "woodcutting", "fishing", "weaponcrafting", "gearcrafting", "jewelrycrafting", "cooking", "alchemy"];
const num = (ch: Character): Record<string, number> => ch as unknown as Record<string, number>;
const str = (ch: Character): Record<string, string> => ch as unknown as Record<string, string>;
const eff = (it: Item | undefined, code: string): number => it?.effects?.find((e) => e.code === code)?.value ?? 0;

/** Add (+1) or remove (−1) a worn item's always-on stats on the character totals. */
function wear(ch: Character, it: Item, sign: 1 | -1): void {
  for (const e of it.effects ?? []) {
    if (e.code === "hp") ch.max_hp += sign * e.value;
    else if (e.code === "inventory_space") ch.inventory_max_items += sign * e.value;
    else if (typeof num(ch)[e.code] === "number") num(ch)[e.code] += sign * e.value;
  }
  ch.hp = Math.min(ch.hp, ch.max_hp); // guess: unequipping +HP gear clamps HP; equipping does not heal
}

function newCharacter(init: CharInit): Char {
  const { bag, ...fields } = init;
  const level = init.level ?? 1;
  const ch = {
    account: "harness", skin: "men1", level, xp: 0, max_xp: 150, gold: 0, speed: 0,
    max_hp: 115 + 5 * level, // naked base HP [1.4]
    haste: 0, critical_strike: 0, wisdom: 0, prospecting: 0, initiative: 100, // the API's base initiative (task 025)
    attack_fire: 0, attack_earth: 0, attack_water: 0, attack_air: 0,
    dmg: 0, dmg_fire: 0, dmg_earth: 0, dmg_water: 0, dmg_air: 0,
    res_fire: 0, res_earth: 0, res_water: 0, res_air: 0,
    ...Object.fromEntries(SKILLS.flatMap((s) => [[`${s}_level`, 1], [`${s}_xp`, 0], [`${s}_max_xp`, 150]])),
    x: 0, y: 0, layer: "overworld", map_id: 0,
    cooldown: 0, cooldown_expiration: new Date(T0).toISOString(),
    task: "", task_type: "", task_progress: 0, task_total: 0,
    ...Object.fromEntries(GEAR_SLOTS.map((g) => [`${g}_slot`, ""])),
    utility1_slot_quantity: 0, utility2_slot_quantity: 0,
    inventory_max_items: 100 + 2 * (level - 1), // guess: one live point (level 20 → 138)
    inventory: Array.from({ length: 20 }, (_, i) => ({ slot: i + 1, code: "", quantity: 0 })),
    ...fields,
  } as unknown as Char;
  for (const g of GEAR_SLOTS) {
    const code = slotCode(ch, g);
    const it = code ? item(code) : undefined;
    if (code && !it) fatal(`${ch.name} wears an unknown item ${code}`);
    if (it) wear(ch, it, 1);
    if (it?.type === "utility" && !num(ch)[`${g}_slot_quantity`]) num(ch)[`${g}_slot_quantity`] = 1;
  }
  ch.hp = init.hp ?? ch.max_hp;
  for (const [code, n] of Object.entries(bag ?? {})) give(ch, code, n);
  return ch;
}

/** Fill the world. After the catalog is loaded (worn gear is read from it). */
export function seedWorld(init: WorldInit): void {
  for (const c of init.characters) world.chars.set(c.name, newCharacter(c));
  for (const [code, n] of Object.entries(init.bank ?? {})) if (n > 0) world.bank.set(code, n);
  world.gold = init.gold ?? 0;
  world.events = init.events ?? [];
  world.achievements = init.achievements ?? [];
  world.pending = init.pending ?? [];
  world.offerings = init.offerings ?? [];
  world.slots = init.slots ?? 500;
  world.nextCost = init.nextExpansion ?? 4500;
  world.ladder = [...(init.ladder ?? [])];
  world.draws = [...(init.draws ?? [])];
}

/** The world as JSON, for a second boot of the engine in a new process (index.mts restart()). Pending faults and
 *  forced fights stay behind. */
export const saveWorld = (): unknown => ({
  chars: [...world.chars], bank: [...world.bank], gold: world.gold, events: world.events, achievements: world.achievements,
  pending: world.pending, offerings: world.offerings, altar: [...world.altar], trace: world.trace, counts: [...counts],
  slots: world.slots, expansions: world.expansions, nextCost: world.nextCost, ladder: world.ladder, draws: world.draws,
});
export function loadWorld(s: ReturnType<typeof JSON.parse>): void {
  Object.assign(world, { chars: new Map(s.chars), bank: new Map(s.bank), gold: s.gold, events: s.events, achievements: s.achievements, pending: s.pending, offerings: s.offerings, altar: new Map(s.altar), trace: s.trace, slots: s.slots, expansions: s.expansions, nextCost: s.nextCost, ladder: s.ladder, draws: s.draws ?? [] });
  for (const [k, v] of s.counts as [string, number][]) counts.set(k, v);
}

// ── inventory ────────────────────────────────────────────────────────────────

export const carried = (ch: Character): number => ch.inventory.reduce((s, x) => s + x.quantity, 0);
export const held = (ch: Character, code: string): number => ch.inventory.reduce((s, x) => s + (x.code === code ? x.quantity : 0), 0);

const FULL = "The character's inventory is full.";
const MISSING = "Missing required item(s).";

function give(ch: Character, code: string, n: number): void {
  if (n <= 0) return;
  const slot = ch.inventory.find((x) => x.code === code) ?? ch.inventory.find((x) => !x.code);
  if (!slot) throw new GameError(497, FULL); // all 20 stacks taken
  slot.code = code;
  slot.quantity += n;
}
function take(ch: Character, code: string, n: number): void {
  if (held(ch, code) < n) throw new GameError(478, MISSING);
  for (const x of ch.inventory) {
    if (x.code !== code || n <= 0) continue;
    const q = Math.min(n, x.quantity);
    x.quantity -= q;
    n -= q;
    if (x.quantity === 0) x.code = "";
  }
}
/** `inventory_max_items` counts items carried, not stacks [1.4]. */
function fits(ch: Character, n: number): void {
  if (carried(ch) + n > ch.inventory_max_items) throw new GameError(497, FULL);
}

// ── tiles and yields ─────────────────────────────────────────────────────────

const liveEvent = (e: ActiveEvent): boolean => Date.parse(e.expiration) > Date.now();
/** The tile under (x, y): an active event's tile overlays the static one [3.3]. */
const tileOf = (x: number, y: number, layer: string) =>
  world.events.find((e) => liveEvent(e) && e.map.x === x && e.map.y === y && e.map.layer === layer)?.map ?? tileAt(x, y, layer);

/**
 * Maps crossed by the shortest walk from the character's tile to `to` on its
 * layer, or undefined = no path. guess: the game's path-finding as the docs
 * describe `move` — four-neighbour steps around blocked tiles, one layer; a
 * restricted tile only from another one (the Enchanted Forest is entered by its
 * transition); never through a conditional tile, only onto it. Written apart
 * from src/plan/route.ts on purpose: a region the engine gets wrong answers 595 here.
 */
let tiles: Map<string, GameMap> | undefined;
function pathLength(ch: Char, to: GameMap): number | undefined {
  tiles ??= new Map(catalog().maps.map((m) => [`${m.layer}:${m.x},${m.y}`, m]));
  const at = (x: number, y: number): GameMap | undefined => tiles!.get(`${ch.layer}:${x},${y}`);
  const start = at(ch.x, ch.y);
  const dist = new Map<GameMap, number>(start ? [[start, 0]] : []);
  const queue = start ? [start] : [];
  for (let i = 0; i < queue.length; i++) {
    const t = queue[i];
    if (t.x === to.x && t.y === to.y) return dist.get(t);
    if (i > 0 && t.access?.type === "conditional") continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = at(t.x + dx, t.y + dy);
      if (!n || dist.has(n) || n.access?.type === "blocked" || (n.access?.type === "restricted") !== (t.access?.type === "restricted")) continue;
      dist.set(n, dist.get(t)! + 1);
      queue.push(n);
    }
  }
  return undefined;
}

function standingOn(ch: Char, type: string, what: string, code?: string): MapContent {
  const c = tileOf(ch.x, ch.y, ch.layer)?.interactions.content;
  if (!c || c.type !== type || (code != null && c.code !== code)) throw new GameError(598, `${what} not found on this map.`);
  return c;
}

/**
 * What one gather / kill yields. guess: the real game rolls 1-in-`rate` per
 * drop; the fake hands a drop out on every `rate`-th action at its minimum
 * quantity, so the long-run rate matches and nothing is random.
 */
function yieldOf(source: string, drops: DropRate[]): ItemStack[] {
  const fixed = world.yields.get(source);
  if (fixed) return fixed.map((s) => ({ ...s }));
  const n = (counts.get(source) ?? 0) + 1;
  counts.set(source, n);
  return drops.filter((d) => n % d.rate === 0).map((d) => ({ code: d.code, quantity: d.min_quantity }));
}

/** Cooldown factor of worn tools: a negative `<skill>_gathering` / `<skill>_crafting` effect is that % off [1.2]. */
const toolFactor = (ch: Character, effect: string): number =>
  1 + GEAR_SLOTS.reduce((s, g) => s + eff(item(slotCode(ch, g)), effect), 0) / 100;

// ── actions ──────────────────────────────────────────────────────────────────

interface Draft {
  ch: Char;
  bank: Map<string, number>;
  gold: number;
}
interface Done {
  seconds: number;
  reason: string;
  data?: Record<string, unknown>;
  note?: string;
}
const bankList = (bank: Map<string, number>): ItemStack[] => [...bank].map(([code, quantity]) => ({ code, quantity }));
const stacks = <T,>(body: T[]): T[] => (Array.isArray(body) && body.length ? body : fatal(`expected a non-empty array body, got ${JSON.stringify(body)}`));

/** An NPC trade. Gold or an item currency; price fields as in npc_items.json. */
function trade(d: Draft, body: ItemStack, side: "buy_price" | "sell_price"): Done {
  const offer = npc(standingOn(d.ch, "npc", "NPC").code)?.items?.find((o) => o.code === body.code && o[side] != null);
  if (!offer) throw new GameError(441, `This item is not available ${side === "buy_price" ? "for purchase" : "to be sold"}.`);
  const total = offer[side]! * body.quantity;
  const pay = (n: number): void => {
    if (offer.currency !== "gold") return n > 0 ? give(d.ch, offer.currency, n) : take(d.ch, offer.currency, -n);
    if (d.ch.gold + n < 0) throw new GameError(492, "The character does not have enough gold.");
    d.ch.gold += n;
  };
  if (side === "buy_price") {
    pay(-total);
    fits(d.ch, body.quantity);
    give(d.ch, body.code, body.quantity);
  } else {
    take(d.ch, body.code, body.quantity);
    pay(total);
  }
  return {
    seconds: 3, // guess: the minimum cooldown
    reason: side === "buy_price" ? "buy_npc" : "sell_npc",
    data: { transaction: { code: body.code, quantity: body.quantity, currency: offer.currency, price: offer[side], total_price: total } },
  };
}

const ACTIONS: Record<string, (d: Draft, body: never) => Done> = {
  move(d, body: { x: number; y: number }) {
    const tile = tileOf(body.x, body.y, d.ch.layer);
    if (!tile) throw new GameError(404, "Map not found.");
    if (d.ch.x === body.x && d.ch.y === body.y) throw new GameError(490, "The character is already at the destination.");
    if (tileAt(body.x, body.y, d.ch.layer)?.access?.type === "blocked") throw new GameError(596, "The map is blocked and cannot be accessed.");
    // A gated tile opens on the scenario's achievements (task 017: the Tasks Trader behind tasks_farmer); else locked [3.2].
    const done = (code: string): boolean => !!world.achievements.find((a) => a.code === code)?.completed_at;
    if (tile.access?.type === "conditional" && !((tile.access.conditions ?? []) as { code: string; operator: string }[]).every((c) => c.operator === "achievement_unlocked" && done(c.code))) throw new GameError(496, "Conditions not met.");
    const dist = pathLength(d.ch, tile);
    if (dist == null) throw new GameError(595, "No path available to the destination map.");
    Object.assign(d.ch, { x: body.x, y: body.y, map_id: tile.map_id });
    return { seconds: 5 * dist, reason: "movement", data: { destination: tile, path: [] } }; // 5 s per map crossed (docs)
  },

  // On a tile with a transition: to its other end, 5 s (docs). Conditions as
  // the OpenAPI codes: no transition 404, an item cost or carried item missing
  // 478, gold 492, anything else (achievements) 496.
  transition(d) {
    const tr = tileOf(d.ch.x, d.ch.y, d.ch.layer)?.interactions.transition;
    if (!tr) throw new GameError(404, "Transition not found.");
    for (const c of tr.conditions ?? []) {
      if (c.operator === "cost" && c.code === "gold") {
        if (d.ch.gold < c.value) throw new GameError(492, "Insufficient gold for this transition.");
        d.ch.gold -= c.value;
      } else if (c.operator === "cost") take(d.ch, c.code, c.value);
      else if (c.operator === "has_item") {
        // the docs: "You must possess (inventory or equipped) the specified item" — not consumed (task 017)
        if (held(d.ch, c.code) + GEAR_SLOTS.filter((g) => slotCode(d.ch, g) === c.code).length < c.value) throw new GameError(478, MISSING);
      } else throw new GameError(496, "Conditions not met.");
    }
    Object.assign(d.ch, { x: tr.x, y: tr.y, layer: tr.layer, map_id: tr.map_id });
    return { seconds: 5, reason: "transition", data: { destination: tileAt(tr.x, tr.y, tr.layer), transition: tr } };
  },

  rest(d) {
    const restored = d.ch.max_hp - d.ch.hp;
    d.ch.hp = d.ch.max_hp;
    return { seconds: restSeconds(restored), reason: "rest", data: { hp_restored: restored } }; // 1 s per 5 HP, min 3 [1.2]
  },

  gathering(d) {
    const res = resource(standingOn(d.ch, "resource", "Resource").code)!;
    if (num(d.ch)[`${res.skill}_level`] < res.level) throw new GameError(493, "The character's skill level is too low.");
    if (carried(d.ch) >= d.ch.inventory_max_items) throw new GameError(497, FULL);
    const items = yieldOf(res.code, res.drops);
    for (const s of items) give(d.ch, s.code, s.quantity);
    return { seconds: Math.round(gatherSec(res.level) * toolFactor(d.ch, `${res.skill}_gathering`)), reason: "gathering", data: { details: { xp: 0, items } } };
  },

  crafting(d, body: { code: string; quantity?: number }) {
    const recipe = item(body.code)?.craft;
    if (!recipe) throw new GameError(404, "Craft not found.");
    standingOn(d.ch, "workshop", "Workshop", recipe.skill);
    if (num(d.ch)[`${recipe.skill}_level`] < recipe.level) throw new GameError(493, "The character's skill level is too low.");
    const times = body.quantity ?? 1;
    for (const g of recipe.items) take(d.ch, g.code, g.quantity * times);
    const made = { code: body.code, quantity: recipe.quantity * times };
    fits(d.ch, made.quantity);
    give(d.ch, made.code, made.quantity);
    // guess: 5 s per execution, measured [1.2]
    return { seconds: Math.round(5 * times * toolFactor(d.ch, `${recipe.skill}_crafting`)), reason: "crafting", data: { details: { xp: 0, items: [made] } } };
  },

  "bank/deposit/item"(d, body: ItemStack[]) {
    standingOn(d.ch, "bank", "Bank");
    for (const s of stacks(body)) {
      take(d.ch, s.code, s.quantity);
      // task 015: a code the bank holds no stack of takes a slot (guess: the whole deposit is refused, as any refusal)
      if (!d.bank.has(s.code) && d.bank.size >= world.slots) throw new GameError(462, "Your bank is full.");
      d.bank.set(s.code, (d.bank.get(s.code) ?? 0) + s.quantity);
    }
    return { seconds: 3 * body.length, reason: "deposit_item", data: { items: body, bank: bankList(d.bank) } }; // 3 s × items [1.2]
  },

  "bank/withdraw/item"(d, body: ItemStack[]) {
    standingOn(d.ch, "bank", "Bank");
    for (const s of stacks(body)) {
      const have = d.bank.get(s.code);
      if (have == null) throw new GameError(404, "Item not found."); // the whole stack is gone [2.3]
      if (have < s.quantity) throw new GameError(478, MISSING); // not enough left [2.3]
      fits(d.ch, s.quantity);
      give(d.ch, s.code, s.quantity);
      if (have === s.quantity) d.bank.delete(s.code);
      else d.bank.set(s.code, have - s.quantity);
    }
    return { seconds: 3 * body.length, reason: "withdraw_item", data: { items: body, bank: bankList(d.bank) } };
  },

  "bank/deposit/gold"(d, body: { quantity: number }) {
    standingOn(d.ch, "bank", "Bank");
    if (d.ch.gold < body.quantity) throw new GameError(492, "The character does not have enough gold.");
    d.ch.gold -= body.quantity;
    d.gold += body.quantity;
    return { seconds: 3, reason: "deposit_gold", data: { bank: { quantity: d.gold } } }; // guess: the minimum cooldown
  },

  "bank/withdraw/gold"(d, body: { quantity: number }) {
    standingOn(d.ch, "bank", "Bank");
    if (d.gold < body.quantity) throw new GameError(460, "Insufficient gold in your bank.");
    d.gold -= body.quantity;
    d.ch.gold += body.quantity;
    return { seconds: 3, reason: "withdraw_gold", data: { bank: { quantity: d.gold } } }; // guess: the minimum cooldown
  },

  // Task 015: +20 slots for the next price, paid from the character's gold (docs/api/openapi.json: 492 for the character's
  // gold). The echo carries the price, no bank details. guess: 3 s; the slots change when the action is committed.
  "bank/buy_expansion"(d) {
    standingOn(d.ch, "bank", "Bank");
    const price = world.nextCost;
    if (d.ch.gold < price) throw new GameError(492, "The character does not have enough gold.");
    d.ch.gold -= price;
    world.slots += 20;
    world.expansions += 1;
    world.nextCost = world.ladder.shift() ?? 2 * price;
    return { seconds: 3, reason: "buy_bank_expansion", data: { transaction: { price } } };
  },

  // Task 015: recycling on the workshop that crafts the item, at its level (493), a recyclable item (473). guess: per item
  // xp.ts recycleReturn(the recipe's ingredient units) units, dealt over the recipe's ingredients in order, unit by unit;
  // 5 s an item, as a craft.
  recycling(d, body: { code: string; quantity?: number }) {
    const it = item(body.code);
    const recipe = it?.craft;
    if (!it || !recipe) throw new GameError(404, "Item not found.");
    standingOn(d.ch, "workshop", "Workshop", recipe.skill);
    if (!it.recyclable) throw new GameError(473, "This item cannot be recycled.");
    if (num(d.ch)[`${recipe.skill}_level`] < recipe.level) throw new GameError(493, "The character's skill level is too low.");
    const n = body.quantity ?? 1;
    take(d.ch, body.code, n);
    const units = recipe.items.flatMap((g) => Array<string>(g.quantity).fill(g.code));
    const back = new Map<string, number>();
    for (let i = 0; i < n * recycleReturn(units.length); i++) back.set(units[i % units.length], (back.get(units[i % units.length]) ?? 0) + 1);
    const items = [...back].map(([code, quantity]) => ({ code, quantity }));
    fits(d.ch, items.reduce((s, x) => s + x.quantity, 0));
    for (const s of items) give(d.ch, s.code, s.quantity);
    return { seconds: 5 * n, reason: "recycling", data: { details: { items } } };
  },

  equip(d, body: { code: string; slot: GearSlot; quantity?: number }[]) {
    for (const e of stacks(body)) {
      const it = item(e.code);
      if (!it) throw new GameError(404, "Item not found.");
      const q = e.quantity ?? 1;
      const key = `${e.slot}_slot`;
      const worn = str(d.ch)[key];
      // guess: the code for an item in a slot of the wrong type
      if (!SLOTS_FOR_TYPE[it.type]?.includes(e.slot)) throw new GameError(422, `${e.code} does not go in ${e.slot}.`);
      if (!canEquip(d.ch, it)) throw new GameError(496, "Conditions not met."); // the engine's own reading of conditions [3.1]
      if (it.type === "utility") {
        if (worn && worn !== e.code) throw new GameError(491, "The equipment slot is not empty.");
        if (num(d.ch)[`${key}_quantity`] + q > 100) throw new GameError(484, "The character cannot equip more than 100 utilities in the same slot.");
        num(d.ch)[`${key}_quantity`] += q;
      } else {
        if (worn) throw new GameError(491, "The equipment slot is not empty.");
        if (it.type === "artifact" && GEAR_SLOTS.some((g) => slotCode(d.ch, g) === e.code)) throw new GameError(485, "This item is already equipped."); // artifacts are distinct [3.1]
      }
      take(d.ch, e.code, q);
      str(d.ch)[key] = e.code;
      if (!worn) wear(d.ch, it, 1);
    }
    return { seconds: 3 * body.length, reason: "equip", data: { items: body.map((e) => ({ slot: e.slot, item: item(e.code) })) } }; // 3 s × items [1.2]
  },

  unequip(d, body: { slot: GearSlot; quantity?: number }[]) {
    const items = stacks(body).map((u) => {
      const key = `${u.slot}_slot`;
      const code = str(d.ch)[key];
      const it = code ? item(code) : undefined;
      if (!it) throw new GameError(491, "The equipment slot is empty.");
      const q = it.type === "utility" ? (u.quantity ?? 1) : 1;
      if (eff(it, "hp") > 0 && d.ch.hp <= eff(it, "hp")) throw new GameError(483, "The character does not have enough HP to unequip this item."); // [2.3]
      if (it.type === "utility") {
        if (num(d.ch)[`${key}_quantity`] < q) throw new GameError(478, MISSING);
        num(d.ch)[`${key}_quantity`] -= q;
      }
      if (it.type !== "utility" || num(d.ch)[`${key}_quantity`] === 0) {
        str(d.ch)[key] = "";
        wear(d.ch, it, -1); // a bag's capacity goes first: the load must fit the smaller bag [3.1]
      }
      fits(d.ch, q);
      give(d.ch, code, q);
      return { slot: u.slot, item: it };
    });
    return { seconds: 3 * body.length, reason: "unequip", data: { items } };
  },

  "npc/buy": (d, body: ItemStack) => trade(d, body, "buy_price"),
  // Task 032: a Grand Exchange purchase — the sell order's units at its price, from the pocket (guess: 3 s, as a trade).
  "grandexchange/buy"(d, body: { id: string; quantity: number }) {
    const o = world.ge.find((x) => x.id === body.id && x.type === "sell");
    if (!o) throw new GameError(404, "Order not found.");
    if (o.account === "harness") throw new GameError(435, "You cannot trade with yourself.");
    if (body.quantity > o.quantity) throw new GameError(434, "This offer does not contain that many items.");
    const total = o.price * body.quantity;
    if (d.ch.gold < total) throw new GameError(492, "The character does not have enough gold.");
    fits(d.ch, body.quantity);
    d.ch.gold -= total;
    give(d.ch, o.code, body.quantity);
    o.quantity -= body.quantity;
    if (!o.quantity) world.ge.splice(world.ge.indexOf(o), 1);
    return { seconds: 3, reason: "buy_ge", data: { order: { id: o.id, code: o.code, quantity: body.quantity, price: o.price, total_price: total } } };
  },
  "npc/sell": (d, body: ItemStack) => trade(d, body, "sell_price"),

  // Consumables that heal (food) only. Codes and the reply shape are OpenAPI's.
  use(d, body: ItemStack) {
    const it = item(body.code);
    if (!it) throw new GameError(404, "Item not found.");
    if (it.type !== "consumable") throw new GameError(476, "This item is not a consumable.");
    if (!canEquip(d.ch, it)) throw new GameError(496, "Conditions not met."); // a food's level condition
    take(d.ch, body.code, body.quantity);
    const heal = eff(it, "heal");
    if (!heal) fatal(`use of ${body.code}: only consumables that heal are implemented`);
    d.ch.hp = Math.min(d.ch.max_hp, d.ch.hp + heal * body.quantity); // per unit, up to the maximum [1.4]
    return { seconds: 3, reason: "use", data: { item: it } }; // guess: the minimum cooldown
  },

  // The seasonal altar, the least the `offering` item needs: accept an offering of the scenario's list, then
  // complete it with the requirement in the bag. guess: the codes (404 unknown, 576 already chosen, 577 not
  // accepted), 3 s cooldowns, no XP reward.
  "offering/accept"(d, body: { offering_id: string }) {
    standingOn(d.ch, "seasonal_altar", "Seasonal altar");
    const o = world.offerings.find((x) => x.id === body.offering_id) ?? fatal(`offering ${body.offering_id} is not in the scenario's list`);
    const mine = world.altar.get(d.ch.name) ?? [];
    if (mine.some((s) => s.category === o.category)) throw new GameError(576, "An offering of this category is already chosen.");
    const expires = new Date(new Date(Date.now()).setUTCHours(24, 0, 0, 0)).toISOString();
    world.altar.set(d.ch.name, [...mine, { offering_id: o.id, category: o.category, status: "accepted", accepted_at: new Date().toISOString(), requirement: o.requirement, favor: o.favor, expires_at: expires }]);
    return { seconds: 3, reason: "offering", data: { offering: o, favor_expires_at: expires } };
  },
  offering(d, body: { offering_id: string }) {
    standingOn(d.ch, "seasonal_altar", "Seasonal altar");
    const sel = world.altar.get(d.ch.name)?.find((s) => s.offering_id === body.offering_id && s.status === "accepted");
    if (!sel) throw new GameError(577, "This offering is not accepted.");
    take(d.ch, sel.requirement.code, sel.requirement.quantity);
    sel.status = "completed";
    return { seconds: 3, reason: "offering", data: { offering: world.offerings.find((x) => x.id === sel.offering_id), reward: { category: sel.category, xp: 0 } } };
  },

  // Task 027d: the monsters master's task/new, task/complete and task/cancel (codes OpenAPI's). guess: a draw is the
  // scenario's next `draws` entry (default Chicken ×50), the reward the task's coins of public/data/tasks.json and no gold,
  // 3 s cooldowns; the master's type must match the task's ("All require the Tasks Master tile matching the task type").
  "task/new"(d) {
    standingOn(d.ch, "tasks_master", "Tasks Master", "monsters");
    if (d.ch.task) throw new GameError(489, "The character already has an assigned task.");
    const t = world.draws.shift() ?? { code: "chicken", total: 50 };
    Object.assign(d.ch, { task: t.code, task_type: "monsters", task_progress: 0, task_total: t.total });
    return { seconds: 3, reason: "task", data: { task: { code: t.code, type: "monsters", total: t.total, rewards: { items: [], gold: 0 } } } };
  },
  "task/complete"(d) {
    standingOn(d.ch, "tasks_master", "Tasks Master", d.ch.task_type);
    if (!d.ch.task) throw new GameError(487, "The character has no task assigned.");
    if (d.ch.task_progress < d.ch.task_total) throw new GameError(488, "The character has not completed the task.");
    const items = task(d.ch.task)?.rewards.items ?? [];
    fits(d.ch, items.reduce((s, x) => s + x.quantity, 0));
    for (const x of items) give(d.ch, x.code, x.quantity);
    Object.assign(d.ch, { task: "", task_type: "", task_progress: 0, task_total: 0 });
    return { seconds: 3, reason: "task", data: { rewards: { items, gold: 0 } } };
  },
  "task/cancel"(d) {
    standingOn(d.ch, "tasks_master", "Tasks Master", d.ch.task_type);
    if (!d.ch.task) throw new GameError(487, "The character has no task assigned.");
    if (!(d.ch.inventory ?? []).some((s) => s.code === "tasks_coin" && s.quantity > 0)) throw new GameError(478, "Missing required item(s).");
    take(d.ch, "tasks_coin", 1);
    Object.assign(d.ch, { task: "", task_type: "", task_progress: 0, task_total: 0 });
    return { seconds: 3, reason: "task", data: {} };
  },

  fight(d, body: { participants?: string[] } | undefined) {
    if (body?.participants?.length) fatal("group fights are not implemented");
    const m = monster(standingOn(d.ch, "monster", "Monster").code)!;
    if (carried(d.ch) >= d.ch.inventory_max_items) throw new GameError(497, FULL); // a fight needs free space [3.1]
    const f = forced.get(d.ch.name)?.shift();
    let win: boolean, turns: number, hp: number, used: Record<string, number> = f?.used ?? {};
    if (f) {
      win = f.result === "win";
      turns = f.turns ?? 10;
      hp = Math.max(1, d.ch.hp - (f.hpLost ?? 0));
    } else {
      // Circular on purpose: the outcome is the engine's own simulate(), with a
      // fixed random source — this tests the runner, NOT the simulator.
      const fighter = currentFighter(d.ch);
      fighter.stats.hp = d.ch.hp; // a real fight starts from the current HP, not from full
      const r = simulate(fighter, m, { rng });
      win = r.win;
      turns = r.turns;
      hp = Math.max(1, Math.round(r.hpRemaining));
      used = r.used;
    }
    // task 014: the fight drinks its potions from the worn stacks (guess: as the forecast counts them, at most the stack)
    for (const g of ["utility1", "utility2"] as const) {
      const code = str(d.ch)[`${g}_slot`], n = Math.min(Math.round(used[code] ?? 0), num(d.ch)[`${g}_slot_quantity`]);
      if (!code || n <= 0) continue;
      num(d.ch)[`${g}_slot_quantity`] -= n;
      if (num(d.ch)[`${g}_slot_quantity`] === 0) { str(d.ch)[`${g}_slot`] = ""; wear(d.ch, item(code)!, -1); }
    }
    const drops = win ? (f?.drops ?? yieldOf(m.code, m.drops)) : [];
    const gold = win ? (f?.gold ?? m.min_gold) : 0; // guess: the minimum of the gold range
    if (win) {
      d.ch.hp = hp;
      d.ch.gold += gold;
      for (const s of drops) give(d.ch, s.code, s.quantity);
      // task 027d: a won fight of the held monsters task's monster counts for it (the game's rule)
      if (d.ch.task === m.code && d.ch.task_type === "monsters") d.ch.task_progress = Math.min(d.ch.task_total, d.ch.task_progress + 1);
    } else {
      // A loss: back at the spawn tile (exec.ts "walks back from spawn"). guess: with 1 HP, on the overworld.
      Object.assign(d.ch, { hp: 1, x: 0, y: 0, layer: "overworld", map_id: tileAt(0, 0)?.map_id ?? 0 });
    }
    const mine = { character_name: d.ch.name, xp: 0, gold, drops, final_hp: win ? hp : 0 };
    return {
      seconds: fightSec(turns), // 2 s per turn, floor 5 s, haste ignored [1.2]
      reason: "fight",
      note: win ? "win" : "loss",
      data: { fight: { result: win ? "win" : "loss", turns, opponent: m.code, logs: [], characters: [mine] } },
    };
  },
};

/** POST claim_item/{id}: a pending reward's items into the bag, its gold into the pocket (guess: the pocket, as a
 *  fight's gold; 404 for an id that is not pending; 497 when it does not fit; 3 s). */
function claim(d: Draft, id: string): Done {
  const p = world.pending.find((x) => x.id === id && !x.claimed_at);
  if (!p) throw new GameError(404, "Pending item not found.");
  fits(d.ch, p.items.reduce((s, x) => s + x.quantity, 0));
  for (const x of p.items) give(d.ch, x.code, x.quantity);
  d.ch.gold += p.gold;
  world.pending = world.pending.filter((x) => x !== p);
  return { seconds: 3, reason: "claim_item", data: { item: { ...p, claimed_at: new Date().toISOString() } } };
}

function act(call: Call): unknown {
  const { who, action, body } = call;
  const cur = world.chars.get(who);
  if (!cur) throw new GameError(498, "Character not found.");
  const left = (Date.parse(cur.cooldown_expiration ?? "") - (Date.now() + world.skew)) / 1000;
  if (left > 0) throw new GameError(499, `The character is in cooldown: ${left.toFixed(2)} seconds left.`);
  const run = ACTIONS[action] ?? (action.startsWith("claim_item/") ? (d: Draft) => claim(d, action.slice("claim_item/".length)) : undefined) ?? fatal(`action ${action} is not implemented`);
  // The action runs on a copy and is committed whole: a refusal changes nothing.
  const d: Draft = { ch: structuredClone(cur), bank: new Map(world.bank), gold: world.gold };
  const done = run(d, body as never);
  call.note = done.note;
  const seconds = Math.max(3, done.seconds); // minimum cooldown of any action [1.2]
  const started = Date.now() + world.skew;
  d.ch.cooldown = seconds;
  d.ch.cooldown_expiration = new Date(started + seconds * 1000).toISOString();
  world.chars.set(who, d.ch);
  world.bank = d.bank;
  world.gold = d.gold;
  return {
    cooldown: { total_seconds: seconds, remaining_seconds: seconds, started_at: new Date(started).toISOString(), expiration: d.ch.cooldown_expiration, reason: done.reason },
    ...done.data,
    ...(action === "fight" ? { characters: [d.ch] } : { character: d.ch }), // the fight echo is plural [2.1]
  };
}

// ── reads ────────────────────────────────────────────────────────────────────

function read(url: URL): unknown {
  const p = url.pathname;
  world.reads.push(p);
  const page = (all: unknown[]): unknown => {
    const size = Number(url.searchParams.get("size")) || 50;
    const n = Number(url.searchParams.get("page")) || 1;
    return { data: all.slice((n - 1) * size, n * size), total: all.length, page: n, size, pages: Math.max(1, Math.ceil(all.length / size)) };
  };
  if (p === "/my/characters") return { data: [...world.chars.values()] };
  if (p === "/my/bank") return { data: { slots: world.slots, expansions: world.expansions, next_expansion_cost: world.nextCost, gold: world.gold } };
  if (p === "/my/bank/items") return page(bankList(world.bank));
  if (p === "/events/active") return page(world.events.filter(liveEvent));
  // The scenario's achievements, pending rewards and offerings (empty unless it gave some).
  if (p === "/my/pending_items") return page(world.pending);
  if (/^\/accounts\/[^/]+\/achievements$/.test(p)) return page(world.achievements);
  if (/^\/accounts\/[^/]+$/.test(p)) return { data: { username: "harness", member: false, status: "standard", badges: [], skins: [], achievements_points: 0, banned: false } };
  const off = /^\/my\/([^/]+)\/offerings$/.exec(p);
  if (off) {
    const midnight = new Date(Date.now()).setUTCHours(24, 0, 0, 0);
    const mine = world.altar.get(off[1]) ?? [];
    return {
      data: {
        date: new Date().toISOString().slice(0, 10), expires_at: new Date(midnight).toISOString(), skills: [], xp_reward_percent: 0, offerings: world.offerings,
        selected_offerings: mine, completed_categories: mine.filter((s) => s.status === "completed").map((s) => s.category), active_favors: mine.map((s) => s.favor),
      },
    };
  }
  return fatal(`GET ${p} is not implemented`);
}

// ── fetch ────────────────────────────────────────────────────────────────────

/** The part of a Response the client reads. A plain object: reading it takes no real I/O. */
const reply = (payload: unknown, status = 200): Response =>
  ({
    status,
    ok: status < 400,
    headers: { get: (k: string) => (k.toLowerCase() === "retry-after" ? "1" : null) },
    json: async () => JSON.parse(JSON.stringify(payload)), // a copy: the engine never shares objects with the world
  }) as unknown as Response;
const refuse = (code: number, message: string): Response => reply({ error: { code, message } }, code);

/** Task 025: the leaders' read, answered byte for byte from report 024's snapshot (its file names, docs/strategy/024/README.md). */
const SNAP024 = new URL("../../docs/strategy/024/snapshot/2026-11-23T1222Z/", import.meta.url);
const PUBLIC = /^\/(leaderboard\/accounts|accounts\/[^/]+\/(characters|achievements))$/;
function publicRead(url: URL): Response {
  world.publicReads.push({ t: Date.now() - T0, path: url.pathname + url.search });
  const bytes = (status: number, body: Buffer): Response =>
    ({ status, ok: status < 400, headers: { get: () => null }, arrayBuffer: async () => new Uint8Array(body).buffer }) as unknown as Response;
  const f = world.publicFault;
  if (f && f.after-- <= 0) {
    world.publicFault = null;
    return bytes(f.code, Buffer.from(JSON.stringify({ error: { code: f.code, message: `injected fault ${f.code}` } })));
  }
  const page = url.searchParams.get("page") ?? "1", a = url.pathname.split("/")[2];
  const file = url.pathname === "/leaderboard/accounts" ? `leaderboard-${page}.json` : url.pathname.endsWith("/characters") ? `acc-${a}-characters.json` : `acc-${a}-achievements-${page}.json`;
  try {
    return bytes(200, readFileSync(new URL(file, SNAP024)));
  } catch {
    return bytes(404, Buffer.from(JSON.stringify({ error: { code: 404, message: "Not found." } })));
  }
}

export async function fakeFetch(input: unknown, init: { method?: string; body?: unknown; headers?: HeadersInit } = {}): Promise<Response> {
  const url = new URL(String(input));
  if (url.origin !== API_BASE) fatal(`request to ${url.origin}${url.pathname} — a scenario has no real network`);
  if (world.ended) throw new Error("fake game: the scenario has ended");
  const method = init.method ?? "GET";
  // Task 017: the public market read — counted apart from `reads` (the account's), answered from `world.ge`; `geFail`
  // refuses the next n reads (a failed poll)
  if (method === "GET" && url.pathname === "/grandexchange/orders") {
    world.geReads++;
    if (world.geFail > 0) return world.geFail--, refuse(500, "injected fault 500");
    const size = Number(url.searchParams.get("size")) || 50, n = Number(url.searchParams.get("page")) || 1;
    return reply({ data: world.ge.slice((n - 1) * size, n * size), total: world.ge.length, page: n, size, pages: Math.max(1, Math.ceil(world.ge.length / size)) });
  }
  // Task 032: one order by its id, and a code's trades — public data, counted with the market read
  const one = /^\/grandexchange\/orders\/([^/]+)$/.exec(url.pathname);
  if (method === "GET" && one) {
    world.geReads++;
    const o = world.ge.find((x) => x.id === one[1]);
    return o ? reply({ data: o }) : refuse(404, "GE order not found.");
  }
  const hist = /^\/grandexchange\/history\/([^/]+)$/.exec(url.pathname);
  if (method === "GET" && hist) {
    world.geReads++;
    world.geHistoryReads.push(hist[1]);
    const h = world.geHistory[hist[1]] ?? [];
    if (!h.length) return refuse(404, "item history not found");
    const size = Number(url.searchParams.get("size")) || 50, n = Number(url.searchParams.get("page")) || 1;
    return reply({ data: h.slice((n - 1) * size, n * size), total: h.length, page: n, size, pages: Math.ceil(h.length / size) });
  }
  // Task 025: a public path asked without a token is the leaders' read; with one it is the account's (read(): its own
  // achievements, and anything else of the three ends the scenario)
  if (method === "GET" && PUBLIC.test(url.pathname) && !new Headers(init.headers).has("authorization")) return publicRead(url);
  if (method === "GET") return reply(read(url));
  const m = method === "POST" ? /^\/my\/([^/]+)\/action\/(.+)$/.exec(url.pathname) : null;
  if (!m) return fatal(`${method} ${url.pathname} is not implemented`);
  const call: Call = { t: Date.now() - T0, who: m[1], action: m[2], body: typeof init.body === "string" ? JSON.parse(init.body) : undefined, code: 200 };
  world.trace.push(call);
  const f = faults.find((x) => x.n > 0 && (x.who == null || x.who === call.who) && (x.action == null || x.action === call.action));
  if (f) {
    f.n--;
    call.code = f.code;
    if (f.code === "network") throw new TypeError("fetch failed (injected)");
    return refuse(f.code, f.message ?? (f.code === 499 ? "The character is in cooldown: 2.00 seconds left." : `injected fault ${f.code}`));
  }
  try {
    return reply({ data: act(call) });
  } catch (e) {
    // A bug in the fake must not look like a network error the client retries.
    if (!(e instanceof GameError)) return fatal(`internal error in ${call.action}: ${(e as Error).stack}`);
    call.code = e.code;
    return refuse(e.code, e.message);
  }
}
