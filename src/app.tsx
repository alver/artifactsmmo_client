import { authed, catalogReady, lastError, pendingRewards, route, syncedAt, syncing } from "./state/store";
import { logout, reconcile } from "./state/sync";
import { clockTime } from "./lib/util";
import { liveEvents } from "./state/events";
import { TokenGate } from "./ui/Token";
import { MapView } from "./ui/MapView";
import { CatalogPanel } from "./ui/CatalogPanel";
import { ItemPopup } from "./ui/ItemPopup";
import { AchievementsTab } from "./ui/AchievementsPanel";
import { SimPlayground } from "./ui/SimPlayground";
import { ActivityPanel } from "./ui/ActivityLog";
import { EventsPanel } from "./ui/EventsPanel";
import { RoadmapTab } from "./ui/RoadmapTab";
import { BankTab, ItemsTab, MonstersTab } from "./ui/TableTabs";
import type { JSX } from "preact";

/** Top-bar tabs: hash route → label + page. An empty or unknown route opens the Roadmap (task 019) — task 028: an old
 *  #/fleet or #/char too; the Roadmap is the one page of the fleet, the rest are read-only. */
const TABS: [string, string, () => JSX.Element | null][] = [
  ["roadmap", "Roadmap", RoadmapTab],
  ["bank", "Bank", BankTab],
  ["items", "Items", ItemsTab],
  ["monsters", "Monsters", MonstersTab],
  ["achievements", "Achievements", AchievementsTab],
  ["map", "Map", MapTab],
  ["sim", "Sim", SimPlayground],
];

/** The map at full size (+ active events beside it); building clicks open the drawer over it. */
function MapTab() {
  return (
    <div class="map-tab">
      <MapView />
      {liveEvents().length > 0 && (
        <aside class="map-side">
          <EventsPanel />
        </aside>
      )}
      <CatalogPanel />
    </div>
  );
}

export function App() {
  // catalogReady also waits for the service's first snapshot, so `authed` is real by then.
  if (!catalogReady.value) return <div class="loading">Connecting to the local service…</div>;
  if (!authed.value) return <TokenGate />;

  const tab = TABS.find(([k]) => k === route.value) ?? TABS[0];
  const Page = tab[2];
  const rewards = pendingRewards.value.length;

  return (
    <div class="map-app">
      <header class="topbar">
        <h1>ArtifactsMMO</h1>
        <nav class="tabs" aria-label="Main">
          {TABS.map(([k, label]) => (
            <a key={k} href={`#/${k}`} class={k === tab[0] ? "active" : undefined} aria-current={k === tab[0] ? "page" : undefined}>
              {label}
              {k === "achievements" && rewards > 0 && <span class="tab-badge" title={`${rewards} reward${rewards === 1 ? "" : "s"} to claim`}>{rewards}</span>}
            </a>
          ))}
        </nav>
        <div class="status">
          {syncing.value ? "syncing…" : syncedAt.value ? `synced ${clockTime(syncedAt.value)}` : "not synced"}
          {lastError.value && <span class="err"> · {lastError.value}</span>}
        </div>
        <div class="topbar-actions">
          <button onClick={() => void reconcile()} disabled={syncing.value}>
            ↻ Refresh
          </button>
          <button onClick={logout}>Sign out</button>
        </div>
      </header>
      <div class="main-stage">
        <div class="tab-page">
          <Page />
        </div>
        <ActivityPanel />
      </div>
      <ItemPopup />
    </div>
  );
}
