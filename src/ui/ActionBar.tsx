import { useState } from "preact/hooks";
import * as actions from "../api/actions";
import { moveMode, onCooldown } from "../state/store";
import { tileAt } from "../catalog";
import type { Character } from "../types/api";

export function ActionBar({ ch }: { ch: Character }) {
  const [busy, setBusy] = useState(false);
  // Subscribe to the coarse cooldown flag (flips on start/end), not the 4 Hz
  // clock — the live countdown is rendered by <CooldownBadge> below.
  const cooling = onCooldown(ch.name).value;
  const disabled = busy || cooling;
  const layer = (ch as { layer?: string }).layer ?? "overworld";
  const canTransition = tileAt(ch.x, ch.y, layer)?.interactions.transition != null;
  const arming = moveMode.value === ch.name; // armed to click-to-move on the map

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      /* error already pushed to the activity log */
    } finally {
      setBusy(false);
    }
  };

  // Move is now click-to-move: arm "pick a tile" mode and the map handles the
  // next click (see MapView). Toggling again, or Escape, cancels.
  const toggleMove = () => {
    moveMode.value = arming ? null : ch.name;
  };

  return (
    <div class="actions">
      <button disabled={disabled} onClick={() => run(() => actions.rest(ch.name))}>＋ Rest</button>
      <button class={arming ? "active" : ""} disabled={busy || (cooling && !arming)} title="Then click a tile on the map" onClick={toggleMove}>
        {arming ? "◎ Pick a tile…" : "➤ Move"}
      </button>
      {canTransition && (
        <button disabled={disabled} title="Enter / exit" onClick={() => run(() => actions.transition(ch.name))}>
          ⤧ Enter
        </button>
      )}
    </div>
  );
}
