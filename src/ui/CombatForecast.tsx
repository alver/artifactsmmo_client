// "Will I win?" readout for the selected character vs the monster on its tile.
//
// Pure derivation of the combat simulator — no API calls. Shows the expected
// outcome, how costly the win is (HP lost + rest time, which dominate grind
// speed), a worst-case (pessimistic) check, and an honest confidence flag listing
// any monster/gear effects the simulator does not model.

import { monster as monsterOf } from "../catalog";
import { titleCase } from "../lib/util";
import { currentFighter } from "../sim/stats";
import { simulate } from "../sim/combat";
import { unmodeledEffects } from "../sim/effects";
import { simAccuracy, simDeviations } from "../sim/validate";
import type { Character } from "../types/api";

type Verdict = { label: string; color: string; bg: string };

export function CombatForecast({ ch, monsterCode }: { ch: Character; monsterCode: string }) {
  const m = monsterOf(monsterCode);
  if (!m) return null;

  const fighter = currentFighter(ch);
  const f = simulate(fighter, m);
  const worst = simulate(fighter, m, { pessimistic: true });
  const unmodeled = unmodeledEffects([...fighter.effects.map((e) => e.code), ...m.effects.map((e) => e.code)]);
  const acc = simAccuracy(simDeviations.value); // subscribes to the validation window

  const hpLost = Math.round(f.hpLostPct * 100);
  let verdict: Verdict;
  if (!f.win) {
    verdict = f.timedOut
      ? { label: "Can't kill in time", color: "#fff", bg: "#b3261e" }
      : { label: "Loss — would die", color: "#fff", bg: "#b3261e" };
  } else if (!worst.win) {
    verdict = { label: "Risky — coin-flip", color: "#3a2c00", bg: "#f5c518" };
  } else if (f.hpLostPct > 0.6) {
    verdict = { label: "Costly win", color: "#3a2c00", bg: "#f5c518" };
  } else {
    verdict = { label: "Win", color: "#fff", bg: "#1e8e3e" };
  }

  return (
    <div class="cp-forecast" style={{ margin: "6px 0", padding: "6px 8px", border: "1px solid #0002", borderRadius: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span
          style={{
            fontWeight: 700, fontSize: 12, padding: "2px 8px", borderRadius: 10,
            color: verdict.color, background: verdict.bg,
          }}
        >
          {verdict.label}
        </span>
        <span class="muted" style={{ fontSize: 12 }}>
          vs {m.name} (Lv {m.level})
        </span>
      </div>
      <div style={{ display: "flex", gap: 12, fontSize: 12, flexWrap: "wrap" }}>
        <span title="Expected turns to resolve">⚔ ~{f.turns} turns</span>
        <span title="Expected HP lost">❤ −{hpLost}% HP</span>
        <span title="Rest time to heal back to full before the next fight">⏳ rest ~{f.restSeconds}s</span>
        {f.win && <span title="Worst case: you never crit, monster always crits">🎲 worst {Math.round(worst.hpLostPct * 100)}%{worst.win ? "" : " ✖"}</span>}
      </div>
      {unmodeled.length > 0 && (
        <div class="muted" style={{ fontSize: 11, marginTop: 4 }} title="These effects are not simulated — treat the forecast as approximate">
          ⚠ ignores: {unmodeled.map(titleCase).join(", ")}
        </div>
      )}
      {acc.n > 0 && (
        <div
          class="muted"
          style={{ fontSize: 11, marginTop: 4 }}
          title="How the simulator's predictions have matched real fights so far"
        >
          sim check: {acc.n} fights · median turn err {acc.medianTurnErr ?? "–"} ·{" "}
          {acc.winMispredicts} win/loss mispredicted{acc.trustworthy ? " · ✓ trustworthy" : ""}
        </div>
      )}
    </div>
  );
}
