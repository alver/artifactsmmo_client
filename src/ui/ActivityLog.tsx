import { effect, signal } from "@preact/signals";
import { characterList, log, openCharacter } from "../state/store";
import { queues } from "../state/queue";
import { clockTime } from "../lib/util";

// Shown/hidden survives reloads — a per-viewer convenience, so plain localStorage.
const KEY = "ammo:v1:ui:activityHidden";
const hidden = signal(((): boolean => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
})());
effect(() => {
  try {
    localStorage.setItem(KEY, hidden.value ? "1" : "0");
  } catch {
    /* storage blocked — the toggle still works for this session */
  }
});

/**
 * The always-on right-hand panel, outside the tab pages: what every character
 * is doing right now (each queue's live note), then the activity feed — every
 * action + automation event pushed to the `log` signal, newest first, so
 * failures (a fight that can't start, a loop that stopped, an API error) stay
 * visible whatever tab is open. Collapses to a thin strip.
 */
export function ActivityPanel() {
  if (hidden.value) {
    return (
      <button class="activity-tab" title="Show the activity panel" onClick={() => (hidden.value = false)}>
        ‹ Activity
      </button>
    );
  }
  const qs = queues.value;
  return (
    <aside class="activity-panel" aria-label="Activity">
      <div class="activity-head">
        <b>Activity</b>
        <button class="cat-btn" title="Hide the activity panel" onClick={() => (hidden.value = true)}>
          Hide ›
        </button>
      </div>
      <div class="activity-now">
        {characterList().map((c) => {
          const q = qs[c.name];
          const note = q?.running ? (q.note ?? "running") : q?.items[0]?.error ? `paused — ${q.items[0].error}` : q?.items.length ? "stopped" : "idle";
          return (
            <button key={c.name} class="activity-now-row" title={`Open ${c.name}`} onClick={() => openCharacter(c.name)}>
              <span class="activity-who">{c.name}</span>
              <span class={"activity-text" + (q?.running ? "" : " muted")}>{note}</span>
            </button>
          );
        })}
      </div>
      <div class="activity-list">
        {log.value.length === 0 && <span class="muted">no actions yet</span>}
        {log.value.slice(0, 150).map((e) => (
          <div key={e.id} class={`activity-row ${e.kind}`}>
            <span class="activity-time">{clockTime(e.ts)}</span>
            <span class="activity-who">{e.character}</span>
            <span class="activity-text">{e.text}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
