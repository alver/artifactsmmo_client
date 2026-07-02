// Fight-log calibration — the gold standard for validating the simulator.
//
// Every fight response carries `logs: string[]`, a turn-by-turn text log. Since
// solo combat is deterministic except for crit rolls, every logged hit must
// equal one of a SMALL set of exactly-computable values: the per-element
// post-resistance damage, or its ×1.5-rounded crit. Any hit that matches none
// of them exposes a formula error (rounding, an unmodeled effect) precisely —
// not smeared into averages like the turns/HP deviation stats.
//
// The exact log wording isn't documented, so parsing is deliberately tolerant:
// unrecognized lines are skipped and counted, never guessed at. A hit is only
// CHECKED when we confidently extracted attacker + damage; if the element isn't
// stated, the hit matches if it equals ANY plausible value (each element,
// their total, and the crit variants).

import type { ExpectedHits } from "./combat";

export interface ParsedHit {
  turn: number | null;
  actor: "character" | "monster";
  element: "fire" | "earth" | "water" | "air" | null;
  dmg: number;
  crit: boolean;
}

export interface ParsedLog {
  hits: ParsedHit[];
  lines: number; // total log lines
  parsed: number; // lines we understood (attack hits; DoT/heal lines are recognized+skipped)
}

const ATTACK_RE = /the (character|monster)\b.*?(?:(fire|earth|water|air)\b[^.]*?)?\b(?:deal(?:s|t|ing)?|inflict(?:s|ed)?)\s+(-?\d+)\s+damage/i;
const TURN_RE = /turn\s+(\d+)/i;
const CRIT_RE = /crit/i;
// Lines we recognize as non-attack combat events — counted as parsed, not checked.
const SKIP_RE = /poison|burn|heal|restor|lifesteal|barrier|shield|fight start|start of|hp:|xp|gold|drop|won|lost|died|reconstitut/i;

/** Best-effort extraction of attack hits from a fight's text log. */
export function parseFightLogs(logs: string[]): ParsedLog {
  const hits: ParsedHit[] = [];
  let parsed = 0;
  for (const line of logs) {
    const m = ATTACK_RE.exec(line);
    if (m) {
      parsed++;
      hits.push({
        turn: TURN_RE.exec(line) ? parseInt(TURN_RE.exec(line)![1], 10) : null,
        actor: m[1].toLowerCase() as ParsedHit["actor"],
        element: (m[2]?.toLowerCase() as ParsedHit["element"]) ?? null,
        dmg: parseInt(m[3], 10),
        crit: CRIT_RE.test(line),
      });
    } else if (SKIP_RE.test(line)) {
      parsed++; // recognized non-attack event — fine, just not checked
    }
  }
  return { hits, lines: logs.length, parsed };
}

export interface HitCheck {
  checked: number;
  matched: number;
  firstMismatch?: string;
}

const crit15 = (v: number): number => Math.round(v * 1.5);

/** The damage values a single logged hit may legitimately show. */
function candidates(exp: Record<string, number>, hit: ParsedHit): number[] {
  const els = ["fire", "earth", "water", "air"] as const;
  const vals: number[] = [];
  const push = (v: number) => v > 0 && !vals.includes(v) && vals.push(v);
  if (hit.element) {
    const v = exp[hit.element] ?? 0;
    if (hit.crit) push(crit15(v));
    else push(v);
    // Some log formats mention one element but report the whole attack — accept
    // the totals too rather than raise false mismatches.
  }
  const total = els.reduce((s, e) => s + (exp[e] ?? 0), 0);
  const critTotal = els.reduce((s, e) => s + crit15(exp[e] ?? 0), 0);
  if (hit.crit) {
    push(critTotal);
    for (const e of els) push(crit15(exp[e] ?? 0));
  } else {
    push(total);
    for (const e of els) push(exp[e] ?? 0);
  }
  return vals;
}

/** Check parsed hits against the exact expected per-element damage table. */
export function checkHits(hits: ParsedHit[], expected: ExpectedHits): HitCheck {
  let checked = 0;
  let matched = 0;
  let firstMismatch: string | undefined;
  for (const h of hits) {
    const exp = h.actor === "character" ? expected.player : expected.monster;
    const ok = candidates(exp, h).includes(h.dmg);
    checked++;
    if (ok) {
      matched++;
    } else if (!firstMismatch) {
      const want = candidates(exp, h).join("/") || "0";
      firstMismatch = `turn ${h.turn ?? "?"}: ${h.actor}${h.element ? ` ${h.element}` : ""}${h.crit ? " crit" : ""} hit ${h.dmg} ≠ expected ${want}`;
    }
  }
  return { checked, matched, firstMismatch };
}
