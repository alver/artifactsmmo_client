import { useState } from "preact/hooks";
import { achievements, achievementsError, achievementsLoading, achievementsOpen } from "../state/store";
import { loadAchievements } from "../state/sync";
import { catalog, itemName, monster } from "../catalog";
import { pct, titleCase } from "../lib/util";
import type { AccountAchievement, AchievementObjectiveProgress } from "../types/api";

const ICON: Record<string, string> = {
  gathering: "⛏",
  combat_kill: "⚔",
  combat_drop: "🎁",
  crafting: "🛠️",
  recycling: "♻",
  use: "🧪",
  npc_buy: "🛒",
  npc_sell: "💰",
  task: "📋",
  combat_level: "⬆",
};

/** Human-readable "how to advance this" for one objective. */
function objectiveText(o: AchievementObjectiveProgress): string {
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
function locate(o: AchievementObjectiveProgress): { x: number; y: number } | null {
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
const ratioOf = (a: AccountAchievement): number => {
  const tot = a.objectives.reduce((s, o) => s + o.total, 0);
  const prog = a.objectives.reduce((s, o) => s + Math.min(o.progress, o.total), 0);
  return tot ? prog / tot : 0;
};

/**
 * On-demand achievements viewer (opened from the topbar). Fetches progress when
 * opened, shows it sorted closest-to-completion, and annotates each objective
 * with how + where to advance it. Not persisted — always requested fresh.
 */
export function AchievementsPanel() {
  const [hideDone, setHideDone] = useState(true);
  if (!achievementsOpen.value) return null;

  const close = () => (achievementsOpen.value = false);
  const list = achievements.value;
  const loading = achievementsLoading.value;
  const err = achievementsError.value;

  const doneCount = list?.filter((a) => a.completed_at).length ?? 0;
  const earned = (list ?? []).reduce((s, a) => s + (a.completed_at ? a.points : 0), 0);
  const totalPts = (list ?? []).reduce((s, a) => s + a.points, 0);

  let shown = list ? [...list] : [];
  if (hideDone) shown = shown.filter((a) => !a.completed_at);
  shown.sort(
    (a, b) =>
      Number(!!a.completed_at) - Number(!!b.completed_at) || ratioOf(b) - ratioOf(a) || a.name.localeCompare(b.name),
  );

  return (
    <div class="ach-backdrop" onClick={close}>
      <aside class="ach-panel" onClick={(e) => e.stopPropagation()}>
        <header class="ach-head">
          <div class="ach-titles">
            <div class="ach-title">🏆 Achievements</div>
            <div class="ach-sub">{list ? `${doneCount}/${list.length} done · ${earned}/${totalPts} pts` : "…"}</div>
          </div>
          <button class="ach-btn" title="Refresh" disabled={loading} onClick={() => void loadAchievements()}>
            {loading ? "…" : "↻"}
          </button>
          <button class="cat-close" title="Close" onClick={close}>
            ✕
          </button>
        </header>

        <label class="ach-filter">
          <input type="checkbox" checked={hideDone} onChange={() => setHideDone(!hideDone)} /> Hide completed
        </label>

        <div class="ach-body">
          {err && <div class="ach-error">{err}</div>}
          {!list && loading && <div class="muted">Loading achievements…</div>}
          {list && shown.length === 0 && (
            <div class="muted">{hideDone ? "All tracked achievements complete! 🎉" : "No achievements."}</div>
          )}
          {shown.map((a) => (
            <AchievementRow key={a.code} a={a} />
          ))}
        </div>
      </aside>
    </div>
  );
}

function AchievementRow({ a }: { a: AccountAchievement }) {
  const complete = !!a.completed_at;
  const rewardItems = a.rewards?.items ?? [];
  const hasReward = (a.rewards?.gold ?? 0) > 0 || rewardItems.length > 0;

  return (
    <div class={"ach-row" + (complete ? " done" : "")}>
      <div class="ach-row-head">
        <span class="ach-name">{a.name}</span>
        <span class="ach-pts">
          {a.points} pt{a.points === 1 ? "" : "s"}
          {complete ? " · ✓" : ""}
        </span>
      </div>
      <div class="ach-desc">{a.description}</div>
      <div class="ach-objs">
        {a.objectives.map((o, i) => {
          const loc = complete ? null : locate(o);
          return (
            <div key={i} class="ach-obj">
              <div class="ach-obj-line">
                <span class="ach-obj-icon">{ICON[o.type] ?? "•"}</span>
                <span class="ach-obj-text">{objectiveText(o)}</span>
                {loc && <span class="ach-loc">↦ ({loc.x}, {loc.y})</span>}
                <span class="ach-obj-num">
                  {Math.min(o.progress, o.total).toLocaleString()}/{o.total.toLocaleString()}
                </span>
              </div>
              <div class="bar">
                <div class="fill xp" style={{ width: pct(o.progress, o.total) + "%" }} />
              </div>
            </div>
          );
        })}
      </div>
      {hasReward && (
        <div class="ach-reward">
          Reward:{(a.rewards?.gold ?? 0) > 0 ? ` 🪙 ${a.rewards!.gold.toLocaleString()}` : ""}
          {rewardItems.map((it) => ` · ${it.quantity}× ${itemName(it.code)}`)}
        </div>
      )}
    </div>
  );
}
