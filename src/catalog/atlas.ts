// The progression atlas (public/data/atlas.json, written by `npm run atlas`):
// offline sim results per level / band / item. Optional — a missing file just
// leaves atlas() null and the Roadmap tab says how to generate it.
//
// Tiers (index into every per-tier array): 0 core (map nodes, normal monsters),
// 1 plus (+ task crystals, gems, gold, rare drops, level achievements),
// 2 special (+ events, bosses, keys). 9 = no source at all.

import { loadOptionalFile } from "./load";

export interface AtlasFightRef {
  /** Monster code. */
  m: string;
  xps: number;
  killSec: number;
  /** Hours of fighting it to gain this level. */
  hours: number;
}

export interface Atlas {
  generatedAt: string;
  /** Median seconds of one character's task work per tasks coin. */
  coinSec: number;
  /** xpNeeded[L] = XP to go from L to L+1. */
  xpNeeded: number[];
  monsters: {
    code: string;
    level: number;
    type: string;
    /** Per tier: lowest level the tier's progressive gear wins / wins safely (null = never by 50). */
    minLevel: { win: number | null; safe: number | null }[];
    /** A just-strong-enough fighter's seconds per kill (T = tier used). */
    kill: { sec: number; L: number; T: number } | null;
    /** Any special-tier gear, farmable or not. */
    ideal: { win: number | null; safe: number | null };
    access: { kind: "static" | "event" | "none"; gates: string[]; event: string | null };
    /** On the open map (or behind a gold toll only). */
    free: boolean;
  }[];
  /** One row per level 1–49: the best safe-XP target per tier (null = nothing safe). */
  path: {
    L: number;
    t: (AtlasFightRef | null)[];
    /** A better event/gated target, when there is one. */
    alt: ({ m: string; xps: number } | null)[];
    /** The plus-tier BIS set vs t[1]. */
    slots: Record<string, string>;
  }[];
  bands: {
    a: number;
    b: number;
    /** Per tier: slot group → [code, how many band monsters' BIS picked it], most picked first. */
    loadout: Record<string, [string, number][]>[];
    /** Every equippable item with level in [a, b]. */
    gear: string[];
  }[];
  items: {
    code: string;
    tier: 0 | 1 | 2 | 9;
    /** Why it's not core: "tasks crystal …", "event monster: …", "rare drop 1/200", … */
    flags: string[];
    via: string;
    /** Highest level of each skill its cheapest tree needs. */
    reqSkills: Record<string, number>;
    /** Monsters it needs drops from → their level. */
    reqMonsters: Record<string, number>;
    /** One character's seconds of work per unit (cheapest path); gold when only a purchase. */
    costSec: number | null;
    costGold: number | null;
    /** Per tier: first character level a self-sufficient fleet can make it. */
    availAt: (number | null)[];
    /** Per tier: how many band-end BIS sets picked it. */
    bis: number[];
  }[];
  /** skill → per level S-1: best plus-tier training recipe. */
  craftTrain: Record<string, ({ code: string; xph: number; hours: number } | null)[]>;
  /** skill → per level S-1: best open-map node + the plus-tier tool. */
  gatherTrain: Record<string, ({ code: string; xph: number; hours: number; tool: string | null } | null)[]>;
  /** Per tier: monster → first level its gear beats it. */
  unlocked: Record<string, number>[];
  /** Tasks Trader prices: item → tasks coins. */
  coinPrices: Record<string, number>;
  events: { code: string; name: string; content: { type: string; code: string }; duration: number; rate: number }[];
}

let _atlas: Atlas | null = null;
let _items: Map<string, Atlas["items"][number]> | null = null;
let _monsters: Map<string, Atlas["monsters"][number]> | null = null;

export async function loadAtlas(): Promise<Atlas | null> {
  _atlas ??= await loadOptionalFile<Atlas>("atlas");
  return _atlas;
}

/** The loaded atlas, or null (not generated / not loaded yet). */
export const atlas = (): Atlas | null => _atlas;

export function atlasItem(code: string): Atlas["items"][number] | undefined {
  if (!_atlas) return undefined;
  _items ??= new Map(_atlas.items.map((i) => [i.code, i]));
  return _items.get(code);
}

export function atlasMonster(code: string): Atlas["monsters"][number] | undefined {
  if (!_atlas) return undefined;
  _monsters ??= new Map(_atlas.monsters.map((m) => [m.code, m]));
  return _monsters.get(code);
}

/** The band [a, b] holding level L (bands cover 1–50). */
export const bandOf = (a: Atlas, L: number) => a.bands.find((b) => L >= b.a && L <= b.b) ?? a.bands[a.bands.length - 1];
