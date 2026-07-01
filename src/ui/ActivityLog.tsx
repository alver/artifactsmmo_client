import { useState } from "preact/hooks";
import { log } from "../state/store";
import { clockTime } from "../lib/util";

/**
 * Compact activity feed overlaid on the map. Every action + automation event is
 * pushed to the `log` signal (state/store); this surfaces it so failures (a fight
 * that can't start, a loop that stopped, an API error) are visible instead of
 * silently disappearing. Collapsible; when collapsed it still peeks the latest line.
 */
export function ActivityLog() {
  const [open, setOpen] = useState(false);
  const entries = log.value;
  const latest = entries[0];

  return (
    <div class={"activity" + (open ? " open" : "")}>
      <button class="activity-toggle" onClick={() => setOpen(!open)}>
        <span>{open ? "▾" : "▸"} Activity</span>
        {!open && latest && (
          <span class={`activity-peek ${latest.kind}`}>
            {latest.character}: {latest.text}
          </span>
        )}
      </button>
      {open && (
        <div class="activity-list">
          {entries.length === 0 && <span class="muted">no actions yet</span>}
          {entries.slice(0, 60).map((e) => (
            <div key={e.id} class={`activity-row ${e.kind}`}>
              <span class="activity-time">{clockTime(e.ts)}</span>
              <span class="activity-who">{e.character}</span>
              <span class="activity-text">{e.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
