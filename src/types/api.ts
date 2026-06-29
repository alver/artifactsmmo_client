// Dynamic, per-account state returned by the ArtifactsMMO API.
//
// Key invariant (the whole reason this client needs no polling): every action
// response echoes the *full authoritative* `character`, and bank deposit/withdraw
// responses echo the updated `bank`. So after the one boot sync we keep state
// current purely from action responses (see state/apply.ts).

import type { GameMap, ItemStack } from "./catalog";

/** The 16 equipment slots, in display order. Each is a `${slot}_slot` field on Character. */
export const GEAR_SLOTS = [
  "weapon", "rune", "shield", "helmet", "body_armor", "leg_armor", "boots",
  "ring1", "ring2", "amulet", "artifact1", "artifact2", "artifact3",
  "utility1", "utility2", "bag",
] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];

export interface InventorySlot {
  slot: number;
  code: string;
  quantity: number;
}

export interface Character {
  name: string;
  account?: string;
  skin: string;
  level: number;
  xp: number;
  max_xp: number;
  gold: number;
  speed: number;

  hp: number;
  max_hp: number;
  haste: number;
  critical_strike: number;
  wisdom: number;
  prospecting: number;

  attack_fire: number;
  attack_earth: number;
  attack_water: number;
  attack_air: number;
  dmg: number;
  dmg_fire: number;
  dmg_earth: number;
  dmg_water: number;
  dmg_air: number;
  res_fire: number;
  res_earth: number;
  res_water: number;
  res_air: number;

  mining_level: number; mining_xp: number; mining_max_xp: number;
  woodcutting_level: number; woodcutting_xp: number; woodcutting_max_xp: number;
  fishing_level: number; fishing_xp: number; fishing_max_xp: number;
  weaponcrafting_level: number; weaponcrafting_xp: number; weaponcrafting_max_xp: number;
  gearcrafting_level: number; gearcrafting_xp: number; gearcrafting_max_xp: number;
  jewelrycrafting_level: number; jewelrycrafting_xp: number; jewelrycrafting_max_xp: number;
  cooking_level: number; cooking_xp: number; cooking_max_xp: number;
  alchemy_level: number; alchemy_xp: number; alchemy_max_xp: number;

  x: number;
  y: number;

  cooldown: number;
  cooldown_expiration: string | null;

  task: string;
  task_type: string;
  task_progress: number;
  task_total: number;

  // equipment — every slot present as `${slot}_slot` ("" when empty)
  weapon_slot: string;
  rune_slot: string;
  shield_slot: string;
  helmet_slot: string;
  body_armor_slot: string;
  leg_armor_slot: string;
  boots_slot: string;
  ring1_slot: string;
  ring2_slot: string;
  amulet_slot: string;
  artifact1_slot: string;
  artifact2_slot: string;
  artifact3_slot: string;
  utility1_slot: string;
  utility1_slot_quantity: number;
  utility2_slot: string;
  utility2_slot_quantity: number;
  bag_slot: string;

  inventory: InventorySlot[];
  inventory_max_items: number;
}

/** Read the item code in a gear slot ("" when empty). */
export function slotCode(ch: Character, slot: GearSlot): string {
  return (ch as unknown as Record<string, string>)[`${slot}_slot`] ?? "";
}

export interface BankItem {
  code: string;
  quantity: number;
}

export interface BankDetails {
  slots: number;
  expansions: number;
  next_expansion_cost: number;
  gold: number;
}

/** Account-level data; exact shape varies by server version, so kept permissive. */
export interface Account {
  username?: string;
  status?: string;
  badges?: string[];
  achievements_points?: number;
  gold?: number;
  [k: string]: unknown;
}

export interface AccountAchievement {
  code: string;
  current: number;
  total: number;
  completed_at: string | null;
}

export interface Cooldown {
  total_seconds: number;
  remaining_seconds: number;
  started_at: string;
  expiration: string;
  reason: string;
}

export interface FightResult {
  result: "win" | "loss" | (string & {});
  xp: number;
  gold: number;
  drops?: ItemStack[];
  turns?: number;
  logs?: string[];
}

export interface SkillInfo {
  xp: number;
  items?: ItemStack[];
}

/** The unwrapped `data` object from any action endpoint. */
export interface ActionResult {
  cooldown?: Cooldown;
  character?: Character;
  /** echoed by bank deposit/withdraw of items — adopt it for free */
  bank?: BankItem[];
  fight?: FightResult;
  details?: SkillInfo;
  destination?: GameMap;
  hp_restored?: number;
}

/** Standard paginated GET envelope. */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
