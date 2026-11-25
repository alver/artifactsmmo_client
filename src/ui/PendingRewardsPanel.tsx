// The account's unclaimed rewards (/my/pending_items), read-only (task 028): achievement payouts wait here until the
// planner's `claim` interrupt claims them at a bank — it claims by itself after every completion it reads (state/planner.ts).
// Reuses the achievements styles (.ach-*).

import { pendingRewards } from "../state/store";
import { loadPendingRewards } from "../state/sync";
import { itemName } from "../catalog";
import { itemHover } from "./ItemPopup";

export function PendingRewardsView() {
  const list = pendingRewards.value;

  return (
    <section class="ws-card ach-section">
        <header class="ach-head">
          <div class="ach-titles">
            <div class="ach-title">🎁 Pending rewards</div>
            <div class="ach-sub">
              {list.length ? `${list.length} unclaimed · the planner claims them at a bank` : "nothing to claim"}
            </div>
          </div>
          <button class="ach-btn" title="Refresh the list" onClick={() => void loadPendingRewards()}>
            ↻
          </button>
        </header>

        <div class="ach-body">
          {list.length === 0 && (
            <div class="muted">
              No unclaimed rewards. New ones appear when achievements complete — hit ↻ (or the top-bar Refresh) to check.
            </div>
          )}
          {list.map((p) => (
            <div key={p.id} class="ach-row">
              <div class="ach-row-head">
                <span class="ach-name">{p.description}</span>
                <span class="ach-pts">{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
              <div class="ach-reward">
                {p.gold > 0 ? `🪙 ${p.gold.toLocaleString()}` : ""}
                {p.items.map((it, i) => (
                  <span key={it.code} class="info-hover" {...itemHover(it.code)}>
                    {`${p.gold > 0 || i > 0 ? " · " : ""}${it.quantity}× ${itemName(it.code)}`}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
    </section>
  );
}
