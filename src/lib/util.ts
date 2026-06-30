import type { Character } from "../types/api";

/** Game asset CDN — used only as a fallback for icons we didn't bundle. */
export const IMG = "https://artifactsmmo.com/images";

/** Image categories bundled under public/assets/<kind>/ (downloaded from the CDN). */
export type AssetKind = "items" | "monsters" | "resources" | "npcs" | "effects" | "badges" | "characters";

const ASSET_BASE = `${import.meta.env.BASE_URL || "/"}assets/`;

/** Local-first icon URL: the bundled copy under public/assets/<kind>/<code>.png. */
export function asset(kind: AssetKind, code: string): string {
  return `${ASSET_BASE}${kind}/${code}.png`;
}

/**
 * `<img onError>` handler: if the bundled icon is missing, fall back to the CDN
 * once, then hide the image if that also fails. Keeps the UI resilient to codes
 * we didn't bundle (e.g. a new skin) or that have no art at all.
 */
export function assetFallback(kind: AssetKind, code: string) {
  return (e: Event) => {
    const img = e.target as HTMLImageElement;
    if (img.dataset.fellBack) {
      img.style.visibility = "hidden";
    } else {
      img.dataset.fellBack = "1";
      img.src = `${IMG}/${kind}/${code}.png`;
    }
  };
}

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

/** "copper_rocks" -> "Copper Rocks", "god-of-the-sun" -> "God Of The Sun". */
export function titleCase(s: string): string {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** A drop's per-action chance as a readable percentage ("100%", "8%", "0.5%"). */
export function dropChance(rate: number): string {
  if (rate <= 1) return "100%";
  const p = 100 / rate;
  return p >= 1 ? `${Math.round(p)}%` : `${p.toFixed(1)}%`;
}
