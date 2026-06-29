import type { Character } from "../types/api";

/** Game asset CDN (icons for items, characters, monsters, resources, maps). */
export const IMG = "https://artifactsmmo.com/images";

/** Seconds left on a character's cooldown given the current clock (ms). */
export function cooldownRemaining(ch: Character, nowMs: number): number {
  if (!ch.cooldown_expiration) return 0;
  const left = (new Date(ch.cooldown_expiration).getTime() - nowMs) / 1000;
  return left > 0 ? left : 0;
}

/** "body_armor" -> "Body Armor", "ring1" -> "Ring 1". */
export function slotLabel(slot: string): string {
  return slot
    .replace(/_/g, " ")
    .replace(/(\d+)/, " $1")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function pct(cur: number, max: number): number {
  if (!max) return 0;
  return Math.max(0, Math.min(100, (cur / max) * 100));
}

export function clockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
