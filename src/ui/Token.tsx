import { useState } from "preact/hooks";
import { setToken } from "../api/client";
import { login } from "../state/sync";

export function TokenGate() {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!val.trim()) return;
    setBusy(true);
    await setToken(val.trim()); // before login: the two calls are separate requests
    await login();
    setBusy(false);
  };

  return (
    <div class="gate">
      <form class="gate-card" onSubmit={submit}>
        <h1>ArtifactsMMO</h1>
        <p class="muted">Paste your API token to connect. It's kept by the local service (in .ammo/), never in the browser.</p>
        <input
          type="password"
          placeholder="JWT token"
          value={val}
          onInput={(e) => setVal((e.target as HTMLInputElement).value)}
        />
        <button type="submit" disabled={busy || !val.trim()}>
          {busy ? "Connecting…" : "Connect"}
        </button>
        <a href="https://artifactsmmo.com/account" target="_blank" rel="noreferrer">
          Where do I find my token?
        </a>
      </form>
    </div>
  );
}
