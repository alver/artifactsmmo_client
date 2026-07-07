// On-demand viewer for the account's unclaimed rewards (/my/pending_items).
// Achievement payouts land in this pool and stay there invisibly — nothing
// moves them to the bank — so the topbar shows a 🎁 badge and this drawer lets
// the SELECTED character claim each one (the items drop into its inventory).
// A claim's echo carries the character, so the row is simply removed locally.
//
// Reuses the achievements drawer styles (.ach-*): same backdrop/panel shape.

import { characters, pendingRewards, pendingRewardsOpen, selectedCharacter } from "../state/store";
import { loadPendingRewards } from "../state/sync";
import * as actions from "../api/actions";
import { itemName } from "../catalog";
import { itemHover } from "./ItemPopup";
import { useActionRunner } from "./useAction";
import type { PendingItem } from "../types/api";

export function PendingRewardsPanel() {
  const actor = selectedCharacter.value ? characters.value[selectedCharacter.value] : undefined;
  const ctl = useActionRunner(actor);
  if (!pendingRewardsOpen.value) return null;

  const close = () => (pendingRewardsOpen.value = false);
  const list = pendingRewards.value;

  const claim = (p: PendingItem) =>
    void ctl.run(async () => {
      if (!actor) return;
      await actions.claimItem(actor.name, p.id);
      pendingRewards.value = pendingRewards.value.filter((x) => x.id !== p.id);
    });

  return (
    <div class="ach-backdrop" onClick={close}>
      <aside class="ach-panel" onClick={(e) => e.stopPropagation()}>
        <header class="ach-head">
          <div class="ach-titles">
            <div class="ach-title">🎁 Pending rewards</div>
            <div class="ach-sub">
              {list.length
                ? `${list.length} unclaimed · claims land in ${actor?.name ?? "?"}'s bag`
                : "nothing to claim"}
            </div>
          </div>
          <button class="ach-btn" title="Refresh the list" onClick={() => void loadPendingRewards()}>
            ↻
          </button>
          <button class="cat-close" title="Close" onClick={close}>
            ✕
          </button>
        </header>

        <div class="ach-body">
          {list.length === 0 && (
            <div class="muted">
              No unclaimed rewards. New ones appear when achievements complete — hit ↻ (or the topbar Refresh) to check.
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
              <button
                class="cat-btn buy"
                // Gate on busy only, not the cooldown flag: a running queue keeps
                // the character cooling near-constantly, and the client's 499
                // retry slips the claim into the next gap by itself.
                disabled={ctl.busy || !actor}
                title={actor ? `Claim with ${actor.name} (waits out a cooldown if needed)` : "Select a character first"}
                onClick={() => claim(p)}
              >
                {ctl.busy ? "claiming…" : `Claim with ${actor?.name ?? "…"}`}
              </button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
