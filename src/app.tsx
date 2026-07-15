import { achievementsOpen, authed, catalogReady, gearCoverageOpen, hiveOpen, itemsCatalogOpen, lastError, panelTarget, pendingRewards, pendingRewardsOpen, routeHash, syncedAt, syncing } from "./state/store";
import { loadAchievements, loadPendingRewards, reconcile } from "./state/sync";
import { setToken } from "./api/client";
import { clockTime } from "./lib/util";
import { TokenGate } from "./ui/Token";
import { MapView } from "./ui/MapView";
import { CharacterPanel } from "./ui/CharacterPanel";
import { CatalogPanel } from "./ui/CatalogPanel";
import { ItemPopup } from "./ui/ItemPopup";
import { AchievementsPanel } from "./ui/AchievementsPanel";
import { PendingRewardsPanel } from "./ui/PendingRewardsPanel";
import { ItemsCatalogPanel } from "./ui/ItemsCatalog";
import { SimPlayground } from "./ui/SimPlayground";
import { Roster } from "./ui/CharacterMini";
import { ActivityLog } from "./ui/ActivityLog";
import { EventsPanel } from "./ui/EventsPanel";
import { HiveDrawer, HiveStrip } from "./ui/HivePanel";
import { GearCoveragePanel } from "./ui/GearCoveragePanel";

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
          <button title="Account-goal coordinator — one goal, every character on it" onClick={() => (hiveOpen.value = true)}>
            🐝 Hive
          </button>
          <button title="Fleet gear coverage — can the bank dress everyone?" onClick={() => (gearCoverageOpen.value = true)}>
            🛡 Gear
          </button>
          <button
            title="Unclaimed account rewards (achievement payouts)"
            onClick={() => {
              pendingRewardsOpen.value = true;
              void loadPendingRewards();
            }}
          >
            🎁 Rewards{pendingRewards.value.length > 0 ? ` (${pendingRewards.value.length})` : ""}
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
            <HiveStrip />
            <Roster />
            <CharacterPanel />
          </section>
          {/* Right sidebar: the map (small, still fully interactive), the
              active time-limited events, then the activity feed. */}
          <aside class="side-stack">
            <MapView />
            <EventsPanel />
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
      <PendingRewardsPanel />
      <HiveDrawer />
      <GearCoveragePanel />
    </div>
  );
}
