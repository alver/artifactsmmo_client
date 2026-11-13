// The state the local service owns and streams to the browser tab. The server
// (src/server/main.ts) sends a snapshot of every signal below when a tab
// connects to /events, then each changed one; connect() mirrors them into the
// tab's own copies, so components read signals exactly as before.

import { batch, effect, type Signal } from "@preact/signals";
import {
  account,
  achievements,
  achievementsError,
  achievementsLoading,
  activeEvents,
  authed,
  bankDetails,
  bankItems,
  catalogReady,
  characters,
  lastError,
  log,
  offerings,
  pendingRewards,
  selectedCharacter,
  skillPins,
  syncedAt,
  syncing,
} from "./store";
import { queues } from "./queue";
import { hive } from "./hive";
import { simDeviations } from "../sim/validate";
import { loadCatalog } from "../catalog";
import { rpc } from "../lib/remote";

export const SYNCED: Record<string, Signal<unknown>> = {
  characters,
  bankItems,
  bankDetails,
  account,
  log,
  activeEvents,
  authed,
  syncedAt,
  syncing,
  lastError,
  skillPins,
  achievements,
  achievementsLoading,
  achievementsError,
  offerings,
  pendingRewards,
  queues,
  hive,
  simDeviations,
} as Record<string, Signal<unknown>>;

const MIGRATED = "ammo:v1:migrated";

/** Browser: subscribe to the server's state stream, then load the catalog. */
export function connect(): void {
  let first: () => void;
  const snapshot = new Promise<void>((r) => (first = r));
  // EventSource reconnects by itself after a service restart and gets a fresh snapshot.
  let es: EventSource;
  let heard = 0;
  const open = (): void => {
    es?.close();
    heard = Date.now();
    es = new EventSource("/events");
    es.onmessage = (e) => {
      heard = Date.now();
      const msg = JSON.parse(e.data as string) as Record<string, unknown>;
      batch(() => {
        for (const [k, v] of Object.entries(msg)) if (SYNCED[k]) SYNCED[k].value = v;
      });
      if (msg._fresh === true) importBrowserState(msg.queues);
      first();
    };
  };
  open();
  // A tab the browser put to sleep can lose the stream for good (CLOSED, or open
  // but silent) and keep showing frozen state — the service pings every 15 s,
  // so silence means reopen (the new stream starts with a full snapshot).
  setInterval(() => {
    if (es.readyState === EventSource.CLOSED || Date.now() - heard > 45_000) open();
  }, 5_000);
  // The tab always shows a selected character — default to the first.
  effect(() => {
    const names = Object.keys(characters.value);
    if (!selectedCharacter.value || !characters.value[selectedCharacter.value]) selectedCharacter.value = names[0] ?? null;
  });
  void Promise.all([loadCatalog(), snapshot]).then(() => (catalogReady.value = true));
}

/**
 * One-time move from the browser-only era: a brand-new service (no state of its
 * own, no queues) adopts this browser's saved queues/hive/pins/log, then
 * restarts to resume them. The marker keeps this browser from ever doing it
 * again, even if the service's storage is later wiped.
 */
function importBrowserState(serverQueues: unknown): void {
  try {
    if (localStorage.getItem(MIGRATED)) return;
    if (serverQueues && Object.keys(serverQueues).length > 0) return;
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith("ammo:")) data[k] = localStorage.getItem(k)!;
    }
    if (!data["ammo:v1:queue"] && !data["ammo:v1:state"]) return;
    localStorage.setItem(MIGRATED, new Date().toISOString());
    (rpc("importLocal", [data]) as Promise<unknown>).catch(() => {}); // the service exits mid-reply to restart
  } catch {
    /* storage unavailable — nothing to import */
  }
}
