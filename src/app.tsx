import { authed, catalogReady, lastError, moveMode, pendingRewards, route, syncedAt, syncing, tilePick, disarmTilePick } from "./state/store";
import { reconcile } from "./state/sync";
import { setToken } from "./api/client";
import { clockTime } from "./lib/util";
import { liveEvents } from "./state/events";
import { TokenGate } from "./ui/Token";
import { MapView } from "./ui/MapView";
import { CharacterPanel } from "./ui/CharacterPanel";
import { CatalogPanel } from "./ui/CatalogPanel";
import { ItemPopup } from "./ui/ItemPopup";
import { AchievementsTab } from "./ui/AchievementsPanel";
import { SimPlayground } from "./ui/SimPlayground";
import { ActivityPanel } from "./ui/ActivityLog";
import { EventsPanel } from "./ui/EventsPanel";
import { FleetView } from "./ui/FleetView";
import { BankTab, ItemsTab, MonstersTab } from "./ui/TableTabs";
import type { JSX } from "preact";

/** Top-bar tabs: hash route → label + page. Unknown routes fall back to Fleet. */
const TABS: [string, string, () => JSX.Element | null][] = [
  ["fleet", "Fleet", FleetView],
  ["char", "Character", CharacterPanel],
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

/**
 * "Pick on map" (queue forms) and Walk arm a map click; off the Map tab that
 * click happens in this pop-up map, so the form that asked keeps its state.
 */
function MapPickOverlay() {
  if (route.value === "map" || (!tilePick.value && !moveMode.value)) return null;
  const cancel = () => {
    moveMode.value = null;
    disarmTilePick();
  };
  return (
    <div class="ach-backdrop map-pick" onClick={cancel}>
      <div class="map-pick-box" onClick={(e) => e.stopPropagation()}>
        <MapView />
        <button class="cat-close map-pick-close" title="Cancel" onClick={cancel}>
          ✕
        </button>
      </div>
    </div>
  );
}

export function App() {
  if (!authed.value) return <TokenGate />;
  if (!catalogReady.value) return <div class="loading">Loading catalog…</div>;

  const logout = () => {
    setToken("");
    authed.value = false;
  };
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
      <MapPickOverlay />
      <ItemPopup />
    </div>
  );
}
