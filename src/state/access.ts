// Map-tile access gates (maps.json `access.type === "conditional"`). The game
// locks a handful of tiles behind account achievements — e.g. the Tasks Trader
// behind Tasks Farmer ("complete 100 tasks"). The requirement text comes from
// the static catalog; whether it's satisfied is read from the on-demand
// `achievements` signal, which is null until fetched — so `met: null` means
// "unknown", not "locked", and the server stays the final judge.

import { achievements } from "./store";
import { achievement, tileAt } from "../catalog";
import type { GameMap } from "../types/catalog";

export interface AccessCondition {
  code: string;
  operator: string;
  value: number;
}

export interface TileGate {
  conditions: AccessCondition[];
  /** Human-readable requirement, e.g. `the Tasks Farmer achievement (Complete 100 tasks…)`. */
  label: string;
  /** true = requirement met, false = known-unmet, null = unknown (achievements not fetched). */
  met: boolean | null;
}

export function tileGate(tile: GameMap | undefined): TileGate | null {
  if (!tile || tile.access?.type !== "conditional") return null;
  const conditions = (tile.access.conditions ?? []) as AccessCondition[];
  if (conditions.length === 0) return null;
  let met: boolean | null = true;
  for (const c of conditions) {
    const m = conditionMet(c);
    if (m === false) {
      met = false;
      break;
    }
    if (m === null) met = null;
  }
  return { conditions, label: conditions.map(conditionLabel).join(" + "), met };
}

/** Gate of the exact tile at (x, y, layer) — for move-error decoration. */
export const gateAt = (x: number, y: number, layer = "overworld"): TileGate | null =>
  tileGate(tileAt(x, y, layer));

function conditionLabel(c: AccessCondition): string {
  if (c.operator === "achievement_unlocked") {
    const a = achievement(c.code);
    const what = a?.description ? ` (${a.description.replace(/\.\s*$/, "")})` : "";
    return `the ${a?.name ?? c.code} achievement${what}`;
  }
  return `${c.code} ${c.operator} ${c.value}`;
}

function conditionMet(c: AccessCondition): boolean | null {
  if (c.operator === "achievement_unlocked") {
    const list = achievements.value;
    if (!list) return null;
    const done = !!list.find((a) => a.code === c.code)?.completed_at;
    return done === (c.value !== 0);
  }
  return null; // unrecognized operator — let the server decide
}
