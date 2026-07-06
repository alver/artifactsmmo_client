// Active map events (time-limited monsters / resources / merchants), like the
// original interface's event list: icon, name, coordinates and a live
// countdown. Clicking a row centers the map on the event's tile (switching
// layer when needed). Renders nothing while no event is active.
//
// The countdown rows are the only 4 Hz subscribers here and they're tiny
// leaves, matching the cooldown-clock rule (see <CooldownBadge>).

import { focusTile, now } from "../state/store";
import { liveEvents } from "../state/events";
import { monster, npc, resource } from "../catalog";
import { asset, assetFallback, titleCase } from "../lib/util";
import type { AssetKind } from "../lib/util";
import type { ActiveEvent } from "../types/api";

function contentIcon(e: ActiveEvent): { kind: AssetKind; code: string } | null {
  const c = e.map.interactions?.content;
  if (!c) return null;
  if (c.type === "monster" || c.type === "raid") return { kind: "monsters", code: c.code };
  if (c.type === "resource") return { kind: "resources", code: c.code };
  if (c.type === "npc") return { kind: "npcs", code: c.code };
  return null;
}

function contentName(e: ActiveEvent): string | undefined {
  const c = e.map.interactions?.content;
  if (!c) return undefined;
  return c.type === "monster" || c.type === "raid"
    ? monster(c.code)?.name
    : c.type === "resource"
      ? resource(c.code)?.name
      : c.type === "npc"
        ? npc(c.code)?.name
        : undefined;
}

/** Tiny 4 Hz leaf: the remaining time of one event, formatted like "64m 22s". */
function EventTimer({ until }: { until: number }) {
  const left = Math.max(0, Math.floor((until - now.value) / 1000));
  const m = Math.floor(left / 60);
  const s = left % 60;
  return <span class="event-timer">{m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`}</span>;
}

export function EventsPanel() {
  const evs = liveEvents(); // subscribes to the events signal
  if (evs.length === 0) return null;

  return (
    <div class="events-panel">
      <div class="events-head">
        ⚡ Events <span class="muted">({evs.length})</span>
      </div>
      {evs.map((e) => {
        const icon = contentIcon(e);
        const layer = e.map.layer ?? "overworld";
        const detail = contentName(e);
        return (
          <div
            key={`${e.code}:${e.map.x},${e.map.y}`}
            class="event-row"
            role="button"
            tabIndex={0}
            title={`${e.name}${detail ? ` — ${detail}` : ""} · click to show on the map`}
            onClick={() => focusTile(e.map.x, e.map.y, layer)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                focusTile(e.map.x, e.map.y, layer);
              }
            }}
          >
            {icon ? (
              <img class="event-icon" src={asset(icon.kind, icon.code)} alt="" onError={assetFallback(icon.kind, icon.code)} />
            ) : (
              <span class="event-icon event-emoji">⚡</span>
            )}
            <div class="event-titles">
              <div class="event-name">{e.name}</div>
              <div class="event-sub muted">
                📍 ({e.map.x}, {e.map.y}){layer !== "overworld" ? ` · ${titleCase(layer)}` : ""}
              </div>
            </div>
            <EventTimer until={Date.parse(e.expiration)} />
          </div>
        );
      })}
    </div>
  );
}
