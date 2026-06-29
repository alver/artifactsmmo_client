// Static game-catalog shapes (public/data/*.json). These change only when the
// game season/version changes, so they are loaded into memory once at boot and
// never re-fetched while the page is open (see catalog/load.ts).

export interface DropRate {
  code: string;
  /** 1-in-`rate` chance per action. */
  rate: number;
  min_quantity: number;
  max_quantity: number;
}

export interface CraftRecipe {
  /** weaponcrafting | gearcrafting | jewelrycrafting | cooking | alchemy | woodcutting | mining | fishing */
  skill: string;
  level: number;
  items: ItemStack[];
  quantity: number;
}

export interface ItemStack {
  code: string;
  quantity: number;
}

export interface ItemEffect {
  /** effect code, e.g. attack_fire, heal, boost_hp */
  code: string;
  value: number;
  description?: string;
}

/** Equippable types map to gear slots; the rest are inventory/material kinds. */
export type ItemType =
  | "weapon" | "shield" | "helmet" | "body_armor" | "leg_armor" | "boots"
  | "ring" | "amulet" | "artifact" | "rune" | "utility" | "bag"
  | "consumable" | "resource" | "currency"
  | (string & {});

export interface Item {
  code: string;
  name: string;
  level: number;
  type: ItemType;
  subtype: string;
  description: string;
  conditions: { code: string; operator: string; value: number }[];
  effects: ItemEffect[];
  craft: CraftRecipe | null;
  tradeable: boolean;
  recyclable?: boolean;
}

export interface MonsterEffect {
  code: string;
  value: number;
  description?: string;
}

export interface Monster {
  code: string;
  name: string;
  level: number;
  type: "normal" | "elite" | "boss" | "raid_boss" | (string & {});
  hp: number;
  attack_fire: number;
  attack_earth: number;
  attack_water: number;
  attack_air: number;
  res_fire: number;
  res_earth: number;
  res_water: number;
  res_air: number;
  critical_strike: number;
  initiative: number;
  effects: MonsterEffect[];
  min_gold: number;
  max_gold: number;
  drops: DropRate[];
}

export interface Resource {
  code: string;
  name: string;
  skill: "woodcutting" | "mining" | "fishing" | "alchemy" | (string & {});
  level: number;
  drops: DropRate[];
}

export interface MapContent {
  /** resource | monster | npc | bank | workshop | tasks_master | ... */
  type: string;
  code: string;
}

export interface GameMap {
  map_id: number;
  name: string;
  skin: string;
  x: number;
  y: number;
  layer: "overworld" | "underground" | "interior" | (string & {});
  access: { type: string; conditions: unknown[] };
  interactions: { content: MapContent | null; transition: unknown | null };
}

export interface Effect {
  code: string;
  name: string;
  description: string;
  type: string;
  subtype: string;
}

export interface AchievementObjective {
  type: string;
  target: string | null;
  total: number;
}

export interface Achievement {
  code: string;
  name: string;
  description: string;
  points: number;
  objectives: AchievementObjective[];
  rewards: { gold: number; items: ItemStack[] | null };
}

export interface Task {
  code: string;
  level: number;
  type: "monsters" | "items" | (string & {});
  min_quantity: number;
  max_quantity: number;
  skill: string | null;
  rewards: { items: ItemStack[]; gold: number };
}

export interface Npc {
  code: string;
  name: string;
  description: string;
  type: string;
  items?: { code: string; currency: string; buy_price: number | null; sell_price: number | null }[];
}

export interface Badge {
  code: string;
  season: number | null;
  description: string;
}

/** The static-data files bundled under public/data/. */
export type CatalogName =
  | "items" | "monsters" | "resources" | "maps" | "npcs" | "npc_items"
  | "tasks" | "task_rewards" | "effects" | "badges" | "achievements" | "events";
