// Derived lookups over the active-events signal (see store.ts): which tiles
// are temporarily overridden, what content is currently reachable, and which
// catalog monsters/resources are event-only. Pure reads — no API calls here;
// the signal is filled by reconcile() and pruned by the 4 Hz clock.

import { activeEvents } from "./store";
import { catalog, tileAt } from "../catalog";
import type { ActiveEvent } from "../types/api";
import type { GameMap, Monster, Resource } from "../types/catalog";

/** The active events that haven't expired yet (live signal read). */
export function liveEvents(): ActiveEvent[] {
  const t = Date.now();
  return activeEvents.value.filter((e) => Date.parse(e.expiration) > t);
}

/** The event tile at a coordinate, if an unexpired event overrides it. */
export function eventTileAt(x: number, y: number, layer = "overworld"): GameMap | undefined {
  return liveEvents().find((e) => e.map.x === x && e.map.y === y && (e.map.layer ?? "overworld") === layer)?.map;
}

/** The tile at a coordinate as the game currently shows it: event override first, then the static map. */
export function liveTileAt(x: number, y: number, layer = "overworld"): GameMap | undefined {
  return eventTileAt(x, y, layer) ?? tileAt(x, y, layer);
}

/** The unexpired event (if any) currently spawning this content. */
export function eventForContent(type: string, code: string): ActiveEvent | undefined {
  return liveEvents().find((e) => e.map.interactions?.content?.type === type && e.map.interactions.content.code === code);
}

// Codes that exist on the STATIC map, per content type — anything else with
// stats in the catalog is event-only and reachable only while an event runs.
const _staticCodes = new Map<string, Set<string>>();
function staticContentCodes(type: string): Set<string> {
  let set = _staticCodes.get(type);
  if (!set) {
    set = new Set();
    try {
      for (const m of catalog().maps) {
        const c = m.interactions?.content;
        if (c && c.type === type) set.add(c.code);
      }
    } catch {
      return set; // catalog not loaded yet — don't cache the empty set
    }
    _staticCodes.set(type, set);
  }
  return set;
}

/**
 * Monsters a character can actually walk to right now: anything with a static
 * tile — bosses and elites included (the fight gate's live forecast is the
 * safety mechanism, not the picker) — plus whatever monsters active events
 * spawn (flagged `event`). `type` lets the UI tag the dangerous ones.
 */
export function availableMonsters(): { code: string; name: string; level: number; type: string; event: boolean }[] {
  try {
    const statics = staticContentCodes("monster");
    const eventCodes = new Set(
      liveEvents()
        .filter((e) => e.map.interactions?.content?.type === "monster")
        .map((e) => e.map.interactions!.content!.code),
    );
    return [...catalog().monsters.values()]
      .filter((m: Monster) => statics.has(m.code) || eventCodes.has(m.code))
      .map((m) => ({ code: m.code, name: m.name, level: m.level, type: m.type, event: !statics.has(m.code) }))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

/** Resources reachable right now: static tiles plus active-event spawns (flagged `event`). */
export function availableResources(): { res: Resource; event: boolean }[] {
  try {
    const statics = staticContentCodes("resource");
    const eventCodes = new Set(
      liveEvents()
        .filter((e) => e.map.interactions?.content?.type === "resource")
        .map((e) => e.map.interactions!.content!.code),
    );
    return [...catalog().resources.values()]
      .filter((r) => statics.has(r.code) || eventCodes.has(r.code))
      .map((res) => ({ res, event: !statics.has(res.code) }))
      .sort((a, b) => a.res.skill.localeCompare(b.res.skill) || a.res.level - b.res.level);
  } catch {
    return [];
  }
}
