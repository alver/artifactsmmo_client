import { achievementsOpen, authed, catalogReady, itemsCatalogOpen, lastError, panelTarget, routeHash, syncedAt, syncing } from "./state/store";
import { loadAchievements, reconcile } from "./state/sync";
import { setToken } from "./api/client";
import { clockTime } from "./lib/util";
import { TokenGate } from "./ui/Token";
import { MapView } from "./ui/MapView";
import { CharacterPanel } from "./ui/CharacterPanel";
import { CatalogPanel } from "./ui/CatalogPanel";
import { ItemPopup } from "./ui/ItemPopup";
import { AchievementsPanel } from "./ui/AchievementsPanel";
import { ItemsCatalogPanel } from "./ui/ItemsCatalog";
import { SimPlayground } from "./ui/SimPlayground";
import { Roster } from "./ui/CharacterMini";
import { ActivityLog } from "./ui/ActivityLog";

export function App() {
  if (!authed.value) return <TokenGate />;
  if (!catalogReady.value) return <div class="loading">Loading catalog…</div>;

  const logout = () => {
    setToken("");
    authed.value = false;
  };
  const onSim = routeHash.value.startsWith("#/sim");

  return (
    <div class="map-app">
      <header class="topbar">
        <h1>ArtifactsMMO</h1>
        <div class="status">
          {syncing.value ? "syncing…" : syncedAt.value ? `synced ${clockTime(syncedAt.value)}` : "not synced"}
          {lastError.value && <span class="err"> · {lastError.value}</span>}
        </div>
        <div class="topbar-actions">
          <button class={onSim ? "active" : ""} title="Fight-sim playground — plan equipment setups" onClick={() => (location.hash = onSim ? "" : "#/sim")}>
            ⚔ Sim
          </button>
          <button
            onClick={() => {
              const open = !itemsCatalogOpen.value;
              itemsCatalogOpen.value = open;
              if (open) panelTarget.value = null; // one right panel at a time
            }}
          >
            📦 Items
          </button>
          <button
            onClick={() => {
              achievementsOpen.value = true;
              void loadAchievements();
            }}
          >
            🏆 Achievements
          </button>
          <button onClick={() => void reconcile()} disabled={syncing.value}>
            ↻ Refresh
          </button>
          <button onClick={logout}>Sign out</button>
        </div>
      </header>
      {onSim ? (
        <SimPlayground />
      ) : (
        <div class="main-stage">
          {/* Main area: character management. Roster strip on top, then a
              multi-column workspace for the selected character. */}
          <section class="workspace">
            <Roster />
            <CharacterPanel />
          </section>
          {/* Right sidebar: the map (small, still fully interactive) above
              the activity feed. */}
          <aside class="side-stack">
            <MapView />
            <ActivityLog />
          </aside>
          {/* Wide overlay drawer over the sidebar: workshop / NPC / bank /
              tasks view (tile click) or the full items catalog (📦). */}
          <CatalogPanel />
          <ItemsCatalogPanel />
        </div>
      )}
      <ItemPopup />
      <AchievementsPanel />
    </div>
  );
}
