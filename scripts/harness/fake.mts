// The fake game: a `fetch` for api.artifactsmmo.com that holds a world and
// executes actions against it. Response shapes are from docs/api/openapi.json;
// error codes and formulas from docs/audit/domain-rules.md (section in brackets).
// Every rule nobody confirmed is marked `guess:` — the same list is in the
// task report (tasks/002-runner-harness.report.md, "Fidelity").
//
// Not modelled: XP and levels (a level is what the scenario set), bank capacity
// (462), gated tiles (always locked), task / recycle / use / offering / give /
// transition / claim actions, group fights, the 20-stack limit of a fight's drops.

import { API_BASE } from "../../src/api/client";
import { item, monster, npc, resource, tileAt } from "../../src/catalog";
import { canEquip } from "../../src/plan/bis";
import { fightSec, gatherSec } from "../../src/plan/xp";
import { simulate } from "../../src/sim/combat";
import { restSeconds } from "../../src/sim/cost";
import { currentFighter } from "../../src/sim/stats";
import { GEAR_SLOTS, SLOTS_FOR_TYPE, slotCode } from "../../src/types/api";
import type { ActiveEvent, Character, GearSlot } from "../../src/types/api";
import type { DropRate, Item, ItemStack, MapContent } from "../../src/types/catalog";
import { T0 } from "./clock.mts";

/** A character of the world: any Character field, plus `bag` as a readable inventory. */
export type CharInit = Partial<Character> & { name: string; bag?: Record<string, number> };
export interface WorldInit {
  characters: CharInit[];
  bank?: Record<string, number>;
  gold?: number;
  events?: ActiveEvent[];
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
}

type Char = Character & { layer: string; map_id: number };

export const world = {
  chars: new Map<string, Char>(),
  bank: new Map<string, number>(),
  gold: 0,
  events: [] as ActiveEvent[],
  trace: [] as Call[],
  reads: [] as string[],
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
    haste: 0, critical_strike: 0, wisdom: 0, prospecting: 0,
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
    // guess: achievements are not modelled, so a gated tile is always locked [3.2].
    if (tile.access?.type === "conditional") throw new GameError(496, "Conditions not met.");
    const dist = Math.abs(body.x - d.ch.x) + Math.abs(body.y - d.ch.y);
    Object.assign(d.ch, { x: body.x, y: body.y, map_id: tile.map_id });
    return { seconds: 5 * dist, reason: "movement", data: { destination: tile, path: [] } }; // guess: 5 s per tile
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
  "npc/sell": (d, body: ItemStack) => trade(d, body, "sell_price"),

  fight(d, body: { participants?: string[] } | undefined) {
    if (body?.participants?.length) fatal("group fights are not implemented");
    const m = monster(standingOn(d.ch, "monster", "Monster").code)!;
    if (carried(d.ch) >= d.ch.inventory_max_items) throw new GameError(497, FULL); // a fight needs free space [3.1]
    const f = forced.get(d.ch.name)?.shift();
    let win: boolean, turns: number, hp: number;
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
    }
    const drops = win ? (f?.drops ?? yieldOf(m.code, m.drops)) : [];
    const gold = win ? (f?.gold ?? m.min_gold) : 0; // guess: the minimum of the gold range
    if (win) {
      d.ch.hp = hp;
      d.ch.gold += gold;
      for (const s of drops) give(d.ch, s.code, s.quantity);
    } else {
      // A loss: back at the spawn tile (exec.ts "walks back from spawn"). guess: with 1 HP.
      Object.assign(d.ch, { hp: 1, x: 0, y: 0, map_id: tileAt(0, 0, d.ch.layer)?.map_id ?? 0 });
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

function act(call: Call): unknown {
  const { who, action, body } = call;
  const cur = world.chars.get(who);
  if (!cur) throw new GameError(498, "Character not found.");
  const left = (Date.parse(cur.cooldown_expiration ?? "") - Date.now()) / 1000;
  if (left > 0) throw new GameError(499, `The character is in cooldown: ${left.toFixed(2)} seconds left.`);
  const run = ACTIONS[action] ?? fatal(`action ${action} is not implemented`);
  // The action runs on a copy and is committed whole: a refusal changes nothing.
  const d: Draft = { ch: structuredClone(cur), bank: new Map(world.bank), gold: world.gold };
  const done = run(d, body as never);
  call.note = done.note;
  const seconds = Math.max(3, done.seconds); // minimum cooldown of any action [1.2]
  const started = Date.now();
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
  if (p === "/my/bank") return { data: { slots: 50, expansions: 0, next_expansion_cost: 4500, gold: world.gold } };
  if (p === "/my/bank/items") return page(bankList(world.bank));
  if (p === "/events/active") return page(world.events.filter(liveEvent));
  // The engine may ask these in a scenario; none is a scenario subject: empty and well-formed.
  if (p === "/my/pending_items") return page([]);
  if (/^\/accounts\/[^/]+\/achievements$/.test(p)) return page([]);
  if (/^\/accounts\/[^/]+$/.test(p)) return { data: { username: "harness", member: false, status: "standard", badges: [], skins: [], achievements_points: 0, banned: false } };
  if (/^\/my\/[^/]+\/offerings$/.test(p)) {
    const midnight = new Date(Date.now()).setUTCHours(24, 0, 0, 0);
    return { data: { date: new Date().toISOString().slice(0, 10), expires_at: new Date(midnight).toISOString(), skills: [], xp_reward_percent: 0, offerings: [], selected_offerings: [], completed_categories: [], active_favors: [] } };
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

export async function fakeFetch(input: unknown, init: { method?: string; body?: unknown } = {}): Promise<Response> {
  const url = new URL(String(input));
  if (url.origin !== API_BASE) fatal(`request to ${url.origin}${url.pathname} — a scenario has no real network`);
  if (world.ended) throw new Error("fake game: the scenario has ended");
  const method = init.method ?? "GET";
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
