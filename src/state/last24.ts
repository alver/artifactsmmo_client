// Task 028 (A.4): the last 24 hours a hero, from the journal's `end`, `level` and `loss` records (and the `step` records for a
// step's text and answer) — a synced signal the service keeps: hydrated at boot from the last two daily files
// (src/server/main.ts, right after the file sinks are installed, so before any record of this run), then fed as records
// are written (lib/journal.ts onRecord — the harness's records too). Server-owned: the tab only mirrors it. The window moves
// with each record (no timer): the page says when it was folded.

import { signal } from "@preact/signals";
import { IS_SERVER } from "../lib/remote";
import { journalDay, onRecord } from "../lib/journal";
import type { Rec } from "../lib/journal";

/** The page's activities: the meter's groups (lib/journal.ts GROUPS) with eat as eating, trade, task and other as other. */
export const ACTIVITIES = ["fight", "rest", "eating", "gather", "craft", "bank", "walk", "gear", "wait", "other"] as const;
const ACT: Record<string, (typeof ACTIVITIES)[number]> = { eat: "eating", trade: "other", task: "other" };

export interface StepDone { at: number; key: string; text: string; as?: string; how: string; units: number; of: number; ran: number; plan: number }
export interface Hero24 {
  s: number;                          // the seconds its steps' items metered (= Σ by)
  by: Record<string, number>;         // seconds by activity
  xp: Record<string, number>;         // XP by skill ("combat": the character's level)
  xpH: Record<string, number>;        // XP an hour of metered seconds, by skill
  levels: { at: number; skill: string; lv: number }[];
  won: number; lost: number;          // fights: the steps' wins, every lost fight (any item's)
  steps: StepDone[];                  // the last eight steps that ended, newest first
}
export interface Last24 { at: number; from?: number; by: Record<string, Hero24> }

const HOUR = 3_600_000, WINDOW = 24 * HOUR, KEEP = 30 * HOUR; // a step record is kept longer: a step starts before its end
const KINDS = new Set(["end", "level", "loss", "step"]);
const num = (x: unknown): number => (typeof x === "number" && Number.isFinite(x) ? x : 0);

/** What a record keeps (a journal line holds much more). */
function slim(r: Rec): Rec {
  const m = r.m as { s?: number; by?: Record<string, number>; xp?: Record<string, number>; won?: number } | undefined;
  return r.k === "end" ? { t: r.t, k: r.k, who: r.who, key: r.key, units: r.units, of: r.of, ran: r.ran, plan: r.plan, how: r.how, m: m && { s: m.s, by: m.by, xp: m.xp, won: m.won } }
    : r.k === "step" ? { t: r.t, k: r.k, who: r.who, key: r.key, target: r.target, as: r.as, text: r.text }
    : r.k === "level" ? { t: r.t, k: r.k, who: r.who, skill: r.skill, lv: r.lv }
    : { t: r.t, k: r.k, who: r.who };
}

/** Pure: the 24 hours before `now` of `recs` (slim records, any order). An end's whole meter counts at its end. */
export function fold(recs: Rec[], now: number): Last24 {
  const out: Record<string, Hero24> = {};
  const hero = (who: string): Hero24 => (out[who] ??= { s: 0, by: {}, xp: {}, xpH: {}, levels: [], won: 0, lost: 0, steps: [] });
  const steps = new Map<string, Rec>(recs.filter((r) => r.k === "step").map((r) => [`${r.who}|${r.key}`, r]));
  let from: number | undefined;
  for (const r of recs) {
    const t = Date.parse(String(r.t));
    if (!(t > now - WINDOW && t <= now) || r.k === "step" || typeof r.who !== "string") continue;
    from = Math.min(from ?? t, t);
    const h = hero(r.who);
    if (r.k === "level") h.levels.push({ at: t, skill: String(r.skill), lv: num(r.lv) });
    else if (r.k === "loss") h.lost++;
    else if (r.k === "end") {
      const m = r.m as { s?: number; by?: Record<string, number>; xp?: Record<string, number>; won?: number } | undefined;
      h.s += num(m?.s);
      for (const [g, v] of Object.entries(m?.by ?? {})) { const a = ACT[g] ?? (ACTIVITIES.includes(g as never) ? g : "other"); h.by[a] = (h.by[a] ?? 0) + num(v); }
      for (const [k, v] of Object.entries(m?.xp ?? {})) h.xp[k] = (h.xp[k] ?? 0) + num(v);
      h.won += num(m?.won);
      const st = steps.get(`${r.who}|${r.key}`);
      h.steps.push({ at: t, key: String(r.key), text: String(st?.text ?? st?.target ?? String(r.key).split("@")[0]), ...(st?.as ? { as: String(st.as) } : {}), how: String(r.how), units: num(r.units), of: num(r.of), ran: num(r.ran), plan: num(r.plan) });
    }
  }
  for (const h of Object.values(out)) {
    for (const [k, v] of Object.entries(h.xp)) h.xpH[k] = h.s > 0 ? Math.round(v / (h.s / 3600)) : 0;
    h.levels.sort((a, b) => a.at - b.at);
    h.steps = h.steps.sort((a, b) => b.at - a.at).slice(0, 8);
    h.s = Math.round(h.s * 10) / 10;
    for (const k of Object.keys(h.by)) h.by[k] = Math.round(h.by[k] * 10) / 10;
  }
  return { at: now, ...(from != null ? { from } : {}), by: out };
}

export const last24 = signal<Last24>({ at: 0, by: {} });
let recs: Rec[] = [];

function refold(now: number): void {
  recs = recs.filter((r) => Date.parse(String(r.t)) > now - KEEP);
  last24.value = fold(recs, now);
}

/** Boot (src/server/main.ts): the records of yesterday's and today's files (UTC). */
export function hydrateLast24(now = Date.now()): void {
  const day = (t: number): string => new Date(t).toISOString().slice(0, 10);
  recs = [day(now - 24 * HOUR), day(now)].flatMap(journalDay).filter((r) => KINDS.has(String(r.k))).map(slim);
  refold(now);
}

if (IS_SERVER) onRecord((r) => {
  if (!KINDS.has(String(r.k))) return;
  recs.push(slim(r));
  refold(Date.parse(String(r.t)) || Date.now());
});
