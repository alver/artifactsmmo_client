import { useState } from "preact/hooks";
import { now } from "../state/store";
import { cooldownRemaining } from "../lib/util";
import type { Character } from "../types/api";

export interface ActionRunner {
  /** A request is in flight. */
  busy: boolean;
  /** Seconds left on the actor's cooldown (0 if none / no actor). */
  cd: number;
  /** busy || cd > 0 — the standard disabled gate for an action button. */
  disabled: boolean;
  /** Run an action, holding `busy` for its duration. Errors are swallowed
   *  (api/actions.ts already logged them to the activity log). */
  run: (fn: () => Promise<unknown>) => Promise<void>;
}

/**
 * Shared busy + cooldown gate for any button that fires a character action,
 * factored out of ActionBar so every new control behaves identically.
 *
 * Reading `now.value` here subscribes the calling component to the 4 Hz clock,
 * so a button re-enables on its own the instant the cooldown expires.
 */
export function useActionRunner(actor?: Character | null): ActionRunner {
  const [busy, setBusy] = useState(false);
  const cd = actor ? cooldownRemaining(actor, now.value) : 0;
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
  return { busy, cd, disabled: busy || cd > 0, run };
}
