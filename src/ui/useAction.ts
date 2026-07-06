import { useState } from "preact/hooks";
import { onCooldown } from "../state/store";
import type { Character } from "../types/api";

export interface ActionRunner {
  /** A request is in flight. */
  busy: boolean;
  /** The actor is currently on cooldown. */
  cooling: boolean;
  /** busy || cooling — the standard disabled gate for an action button. */
  disabled: boolean;
  /** Run an action, holding `busy` for its duration. Errors are swallowed
   *  (api/actions.ts already logged them to the activity log). */
  run: (fn: () => Promise<unknown>) => Promise<void>;
}

/**
 * Shared busy + cooldown gate for any button that fires a character action,
 * factored out of ActionBar so every new control behaves identically.
 *
 * The gate subscribes to the coarse per-character `onCooldown()` *flag* — a
 * computed that only flips when a cooldown starts/ends — NOT the raw 4 Hz clock.
 * That's deliberate: reading `now.value` here would re-render the whole calling
 * component (a gear grid, an inventory list, the entire catalog panel) 4×/second.
 * Buttons still re-enable on their own the instant the cooldown expires (the flag
 * flips), and the live cooldown is shown separately by <CooldownRing>.
 */
export function useActionRunner(actor?: Character | null): ActionRunner {
  const [busy, setBusy] = useState(false);
  const cooling = actor ? onCooldown(actor.name).value : false;
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      /* already pushed to the activity log by api/actions.ts */
    } finally {
      setBusy(false);
    }
  };
  return { busy, cooling, disabled: busy || cooling, run };
}
