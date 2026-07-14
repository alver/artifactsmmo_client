// Achievement-objective helpers — pure catalog scans, shared by the
// AchievementsPanel (display) and the hive's achievement goal compiler.
// Lifted out of ui/AchievementsPanel.tsx unchanged.

import { catalog, itemName, monster } from "../../catalog";
import { titleCase } from "../../lib/util";
import type { AccountAchievement, AchievementObjectiveProgress } from "../../types/api";

/** Human-readable "how to advance this" for one objective. */
export function objectiveText(o: AchievementObjectiveProgress): string {
  const t = o.target;
  switch (o.type) {
    case "gathering":
      return `Gather ${t ? itemName(t) : "materials"}`;
    case "combat_kill":
      return `Defeat ${t ? (monster(t)?.name ?? titleCase(t)) : "monsters"}`;
    case "combat_drop":
      return `Loot ${t ? itemName(t) : "drops"}`;
    case "crafting":
      return `Craft ${t ? itemName(t) : "items"}`;
    case "recycling":
      return "Recycle items";
    case "use":
      return `Use ${t ? itemName(t) : "items"}`;
    case "npc_buy":
      return `Buy ${t ? itemName(t) : "from an NPC"}`;
    case "npc_sell":
      return `Sell ${t ? itemName(t) : "to an NPC"}`;
    case "task":
      return "Complete tasks";
    case "combat_level":
      return `Reach combat level ${o.total}`;
    default:
      return titleCase(o.type) + (t ? ` ${titleCase(t)}` : "");
  }
}

/** Best-effort map location that advances this objective (monster / resource tile). */
export function locate(o: AchievementObjectiveProgress): { x: number; y: number } | null {
  const t = o.target;
  if (!t) return null;
  const maps = catalog().maps;
  const monsterTile = (code: string) =>
    maps.find((m) => m.interactions?.content?.type === "monster" && m.interactions.content.code === code);

  if (o.type === "combat_kill") {
    const m = monsterTile(t);
    return m ? { x: m.x, y: m.y } : null;
  }
  if (o.type === "combat_drop") {
    const mon = [...catalog().monsters.values()].find((mo) => mo.drops?.some((d) => d.code === t));
    const m = mon ? monsterTile(mon.code) : undefined;
    return m ? { x: m.x, y: m.y } : null;
  }
  if (o.type === "gathering") {
    const res = [...catalog().resources.values()].find((r) => r.drops?.some((d) => d.code === t));
    const m = res
      ? maps.find((mp) => mp.interactions?.content?.type === "resource" && mp.interactions.content.code === res.code)
      : undefined;
    return m ? { x: m.x, y: m.y } : null;
  }
  return null;
}

/** Overall completion ratio (0–1) across an achievement's objectives. */
export const ratioOf = (a: AccountAchievement): number => {
  const tot = a.objectives.reduce((s, o) => s + o.total, 0);
  const prog = a.objectives.reduce((s, o) => s + Math.min(o.progress, o.total), 0);
  return tot ? prog / tot : 0;
};
