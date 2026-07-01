import { useState } from "preact/hooks";
import * as actions from "../api/actions";
import { moveMode, now } from "../state/store";
import { tileAt } from "../catalog";
import { cooldownRemaining } from "../lib/util";
import type { Character } from "../types/api";

export function ActionBar({ ch }: { ch: Character }) {
  const [busy, setBusy] = useState(false);
  const cd = cooldownRemaining(ch, now.value); // re-renders with the global clock
  const disabled = busy || cd > 0;
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
      <button disabled={disabled} onClick={() => run(() => actions.fight(ch.name))}>⚔ Fight</button>
      <button disabled={disabled} onClick={() => run(() => actions.gather(ch.name))}>⛏ Gather</button>
      <button disabled={disabled} onClick={() => run(() => actions.rest(ch.name))}>＋ Rest</button>
      <button class={arming ? "active" : ""} disabled={busy || (cd > 0 && !arming)} title="Then click a tile on the map" onClick={toggleMove}>
        {arming ? "◎ Pick a tile…" : "➤ Move"}
      </button>
      {canTransition && (
        <button disabled={disabled} title="Enter / exit" onClick={() => run(() => actions.transition(ch.name))}>
          ⤧ Enter
        </button>
      )}
      {cd > 0 && <span class="cooldown">⏳ {cd.toFixed(1)}s</span>}
    </div>
  );
}
