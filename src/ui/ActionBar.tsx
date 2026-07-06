// Once a row of one-off buttons (Rest / Move / Enter); Rest and Move are queue
// item kinds now (see QueuePanel), so only the situational Enter button — shown
// when the tile has a layer transition — survives here.

import { useState } from "preact/hooks";
import * as actions from "../api/actions";
import { onCooldown } from "../state/store";
import { liveTileAt } from "../state/events";
import type { Character } from "../types/api";

export function ActionBar({ ch }: { ch: Character }) {
  const [busy, setBusy] = useState(false);
  // Subscribe to the coarse cooldown flag (flips on start/end), not the 4 Hz
  // clock — the live cooldown is rendered by the avatar's <CooldownRing>.
  const cooling = onCooldown(ch.name).value;
  const layer = (ch as { layer?: string }).layer ?? "overworld";
  const canTransition = liveTileAt(ch.x, ch.y, layer)?.interactions.transition != null;
  if (!canTransition) return null;

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

  return (
    <div class="actions">
      <button disabled={busy || cooling} title="Enter / exit" onClick={() => run(() => actions.transition(ch.name))}>
        ⤧ Enter
      </button>
    </div>
  );
}
