import { now, onCooldown } from "../state/store";
import { queues } from "../state/queue";
import { cooldownRemaining } from "../lib/util";
import type { ComponentChildren } from "preact";
import type { Character } from "../types/api";

/**
 * The cooldown throbber: a ring wrapped around a character's avatar. Ready =
 * full green ring; on cooldown = a gold arc showing the REMAINING share,
 * draining to nothing as the cooldown runs out (hover shows the seconds).
 *
 * While the character's QUEUE is running the ring never drops to green: the
 * moments with no cooldown ticking are just the runner's wake-up buffer plus
 * the next action's network round-trip, and a green flash at the start of
 * every action reads as "idle" when the character is anything but. A full
 * gold ring covers those gaps until the next cooldown echo lands.
 *
 * This is the one component family that touches the 4 Hz `now` clock, and even
 * here it's gated: the coarse `onCooldown` flag (flips only when a cooldown
 * starts/ends) is read first, and `now` is subscribed ONLY while cooling — an
 * idle card re-renders zero times per second. Everything else must keep using
 * the flag (see state/store).
 */
export function CooldownRing({ ch, children }: { ch: Character; children: ComponentChildren }) {
  if (!onCooldown(ch.name).value) {
    if (queues.value[ch.name]?.running) {
      return <span class="cd-ring cooling" title="working…" style="--ring: var(--gold)">{children}</span>;
    }
    return <span class="cd-ring ready" style="--ring: var(--ok)">{children}</span>;
  }
  const left = cooldownRemaining(ch, now.value);
  const deg = Math.round(Math.max(0, Math.min(1, ch.cooldown > 0 ? left / ch.cooldown : 0)) * 360);
  return (
    <span
      class="cd-ring cooling"
      title={`cooldown · ${left.toFixed(1)}s left`}
      style={`--ring: conic-gradient(var(--gold) ${deg}deg, rgba(255,255,255,0.09) ${deg}deg)`}
    >
      {children}
    </span>
  );
}
