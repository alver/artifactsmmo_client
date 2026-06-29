import { account } from "../state/store";

export function AccountPanel() {
  const acc = account.value;
  if (!acc) return null;
  const entries = Object.entries(acc).filter(([, v]) => typeof v === "string" || typeof v === "number");
  if (entries.length === 0) return null;
  return (
    <section class="panel">
      <h3>Account</h3>
      <div class="kv">
        {entries.map(([k, v]) => (
          <div key={k} class="kv-row">
            <span class="muted">{k.replace(/_/g, " ")}</span>
            <b>{String(v)}</b>
          </div>
        ))}
      </div>
    </section>
  );
}
