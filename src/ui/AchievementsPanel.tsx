import { useState } from "preact/hooks";
import { achievements, achievementsError, achievementsLoading, achievementsOpen } from "../state/store";
import { loadAchievements } from "../state/sync";
import { locate, objectiveText, ratioOf } from "../plan/hive/objectives";
import { itemName } from "../catalog";
import { pct } from "../lib/util";
import { itemHover } from "./ItemPopup";
import type { AccountAchievement } from "../types/api";

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
          {rewardItems.map((it) => (
            <span key={it.code} class="info-hover" {...itemHover(it.code)}>
              {` · ${it.quantity}× ${itemName(it.code)}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
