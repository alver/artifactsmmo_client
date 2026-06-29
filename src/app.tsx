import { authed, catalogReady, characterList, lastError, syncedAt, syncing } from "./state/store";
import { reconcile } from "./state/sync";
import { setToken } from "./api/client";
import { clockTime } from "./lib/util";
import { TokenGate } from "./ui/Token";
import { CharacterCard } from "./ui/CharacterCard";
import { Bank } from "./ui/Bank";
import { AccountPanel } from "./ui/Account";
import { Log } from "./ui/Log";

export function App() {
  if (!authed.value) return <TokenGate />;
  if (!catalogReady.value) return <div class="loading">Loading catalog…</div>;

  const chars = characterList();
  const logout = () => {
    setToken("");
    authed.value = false;
  };

  return (
    <div class="app">
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

      <main class="grid">
        <div class="cards">
          {chars.length === 0 && <div class="muted pad">No characters found on this account.</div>}
          {chars.map((ch) => (
            <CharacterCard key={ch.name} ch={ch} />
          ))}
        </div>
        <aside class="side">
          <AccountPanel />
          <Bank />
          <Log />
        </aside>
      </main>
    </div>
  );
}
