import { authed, catalogReady, lastError, syncedAt, syncing } from "./state/store";
import { reconcile } from "./state/sync";
import { setToken } from "./api/client";
import { clockTime } from "./lib/util";
import { TokenGate } from "./ui/Token";
import { MapView } from "./ui/MapView";
import { CharacterPanel } from "./ui/CharacterPanel";
import { CatalogPanel } from "./ui/CatalogPanel";

export function App() {
  if (!authed.value) return <TokenGate />;
  if (!catalogReady.value) return <div class="loading">Loading catalog…</div>;

  const logout = () => {
    setToken("");
    authed.value = false;
  };

  return (
    <div class="map-app">
      <header class="topbar">
        <h1>ArtifactsMMO</h1>
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
      <div class="map-stage">
        <CharacterPanel />
        <MapView />
        <CatalogPanel />
      </div>
    </div>
  );
}
