import { log } from "../state/store";
import { clockTime } from "../lib/util";

export function Log() {
  const entries = log.value;
  return (
    <section class="panel">
      <h3>Activity</h3>
      <div class="log">
        {entries.length === 0 && <span class="muted">no actions yet</span>}
        {entries.map((e) => (
          <div key={e.id} class={`log-row ${e.kind}`}>
            <span class="log-time">{clockTime(e.ts)}</span>
            <span class="log-who">{e.character}</span>
            <span class="log-text">{e.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
