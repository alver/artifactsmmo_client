import { useState } from "preact/hooks";
import * as actions from "../api/actions";
import { now } from "../state/store";
import { cooldownRemaining } from "../lib/util";
import type { Character } from "../types/api";

export function ActionBar({ ch }: { ch: Character }) {
  const [busy, setBusy] = useState(false);
  const cd = cooldownRemaining(ch, now.value); // re-renders with the global clock
  const disabled = busy || cd > 0;

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

  const moveTo = () => {
    const input = prompt(`Move ${ch.name} to "x,y":`, `${ch.x},${ch.y}`);
    if (!input) return;
    const [x, y] = input.split(",").map((s) => parseInt(s.trim(), 10));
    if (Number.isNaN(x) || Number.isNaN(y)) return;
    void run(() => actions.move(ch.name, x, y));
  };

  return (
    <div class="actions">
      <button disabled={disabled} onClick={() => run(() => actions.fight(ch.name))}>⚔ Fight</button>
      <button disabled={disabled} onClick={() => run(() => actions.gather(ch.name))}>⛏ Gather</button>
      <button disabled={disabled} onClick={() => run(() => actions.rest(ch.name))}>＋ Rest</button>
      <button disabled={disabled} onClick={moveTo}>➤ Move</button>
      {cd > 0 && <span class="cooldown">⏳ {cd.toFixed(1)}s</span>}
    </div>
  );
}
