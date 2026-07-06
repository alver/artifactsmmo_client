import { now, onCooldown } from "../state/store";
import { cooldownRemaining } from "../lib/util";
import type { ComponentChildren } from "preact";
import type { Character } from "../types/api";

/**
 * The cooldown throbber: a ring wrapped around a character's avatar. Ready =
 * full green ring; on cooldown = an arc showing the REMAINING share, draining
 * to nothing as the cooldown runs out. The arc's color follows the progress
 * too — red right after the action, sliding through orange/yellow back to
 * green as the cooldown completes (hover shows the seconds).
 *
 * This is the one component family that touches the 4 Hz `now` clock, and even
 * here it's gated: the coarse `onCooldown` flag (flips only when a cooldown
 * starts/ends) is read first, and `now` is subscribed ONLY while cooling — an
 * idle card re-renders zero times per second. Everything else must keep using
 * the flag (see state/store).
 */
export function CooldownRing({ ch, children }: { ch: Character; children: ComponentChildren }) {
  if (!onCooldown(ch.name).value) {
    return <span class="cd-ring ready" style="--ring: var(--ok)">{children}</span>;
  }
  const left = cooldownRemaining(ch, now.value);
  const frac = Math.max(0, Math.min(1, ch.cooldown > 0 ? left / ch.cooldown : 0));
  const deg = Math.round(frac * 360);
  const hue = Math.round(120 * (1 - frac)); // 0 = red (full cooldown) → 120 = green (done)
  return (
    <span
      class="cd-ring cooling"
      title={`cooldown · ${left.toFixed(1)}s left`}
      style={`--ring: conic-gradient(hsl(${hue}, 65%, 52%) ${deg}deg, rgba(255,255,255,0.09) ${deg}deg)`}
    >
      {children}
    </span>
  );
}
