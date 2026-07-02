import { now } from "../state/store";
import { cooldownRemaining } from "../lib/util";
import type { Character } from "../types/api";

/**
 * The one component that subscribes to the 4 Hz `now` clock: a tiny leaf that
 * renders the live "⏳ 2.3s" cooldown countdown for a character and nothing else.
 *
 * Isolating the tick here is the whole point — selecting a character or opening a
 * workshop/bank panel no longer re-renders its entire subtree (and re-runs the
 * heavy planner/refine/combat derivations) 4×/second. Everything else reads the
 * coarse `onCooldown()` flag instead (see state/store), which only flips when a
 * cooldown starts/ends. Returns null when the character is off cooldown, so it
 * costs nothing while idle.
 */
export function CooldownBadge({ ch }: { ch?: Character | null }) {
  const cd = ch ? cooldownRemaining(ch, now.value) : 0;
  if (cd <= 0) return null;
  return <span class="cooldown">⏳ {cd.toFixed(1)}s</span>;
}
