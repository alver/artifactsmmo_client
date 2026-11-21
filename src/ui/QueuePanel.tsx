// The plan queue — read-only since task 018: the ordered list of actions (see
// src/plan/queue.ts) with live per-item progress while the runner works it, the
// planner's line (the step's why, what is blocked) and the 🧭 switch.
//
// Perf note: this reads only the queue + job signals (action-paced), never the
// 4 Hz `now` clock — see the cooldown-clock invariant in store.ts.

import { characters, isOwned } from "../state/store";
import { planner, setPlannerConfig } from "../state/planner";
import { catalog } from "../catalog";
import { pct } from "../lib/util";
import { Bar } from "./DataTable";
import { queueItemIcon, queueItemText } from "../plan/queue";
import { queues } from "../state/queue";
import { skillKey } from "../state/store";
import { offeringSlots, todayOfferings } from "../state/offerings";
import type { QueueItem } from "../plan/queue";
import type { Character } from "../types/api";

/** Every catalog monster, easiest first (shared with the sim playground). */
export function monsterList(): { code: string; name: string; level: number; type: string }[] {
  try {
    return [...catalog().monsters.values()]
      .map((m) => ({ code: m.code, name: m.name, level: m.level, type: m.type }))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export function QueueSection({ ch }: { ch: Character }) {
  const q = queues.value[ch.name] ?? { items: [], running: false };
  const pausedError = !q.running ? q.items[0]?.error : undefined;
  const owned = isOwned(ch.name); // the planner's queue

  return (
    <div class="q-panel">
      <div class="q-head">
        {owned ? (
          <>
            {q.running ? <span class="gather-tag banking"><span class="spinner" />running</span> : <span class="q-paused">⏸ not running</span>}
            <span class="q-count muted">{q.items.length} left</span>
          </>
        ) : q.running ? (
          <>
            <span class="gather-tag banking">
              <span class="spinner" />
              running
            </span>
            <span class="q-count muted">{q.items.length} left</span>
          </>
        ) : (
          <>
            {pausedError && <span class="q-paused">⏸ paused</span>}
            <span class="q-count muted">{q.items.length} item{q.items.length === 1 ? "" : "s"}</span>
          </>
        )}
        <PlannerSwitch name={ch.name} on={owned} />
      </div>

      {owned && <PlannerLine name={ch.name} />}

      {q.items.length === 0 && owned && (
        <div class="muted" style={{ fontSize: 12 }}>Empty — the planner decides the next step.</div>
      )}

      {q.items.length > 0 && (
        <div class="q-list" role="table" aria-label="Queue">
          <div class="q-row-main q-thead" role="row">
            <span>#</span>
            <span>Action</span>
            <span>Progress</span>
            <span />
          </div>
          {q.items.map((it, i) => (
            <QueueRow key={it.id} ch={ch} it={it} index={i} running={q.running} note={i === 0 && q.running ? q.note : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Hands the character to the planner (its queue is dropped) or back to Alex (an empty, stopped queue). */
function PlannerSwitch({ name, on }: { name: string; on: boolean }) {
  const flip = (): void => {
    if (on || confirm(`Hand ${name} to the planner? Its queue is dropped and the planner decides from now on.`)) void setPlannerConfig({ on: { [name]: !on } });
  };
  return (
    <button class={"cat-btn" + (on ? " buy" : "")} title={on ? "The planner owns this queue — click to hand it back (empty, stopped)" : "Hand this character to the planner"} onClick={flip}>
      🧭 planner {on ? "on" : "off"}
    </button>
  );
}

/** The current step's reason, and what is blocked for this character and until when (UTC). */
function PlannerLine({ name }: { name: string }) {
  const st = planner.value;
  const t = Date.now();
  const blocked = Object.entries(st.blocked).filter(([k, b]) => k.endsWith(`@${name}`) && b.until > t);
  const hhmm = (ms: number): string => new Date(ms).toISOString().slice(11, 16);
  return (
    <div class="muted" style={{ fontSize: 12, margin: "4px 0" }}>
      <div>🧭 {st.current[name]?.step.why ?? "waiting for the first decision"}</div>
      {blocked.length > 0 && <div>⛔ blocked: {blocked.map(([k, b]) => `${k.slice(0, k.lastIndexOf("@"))} until ${hhmm(b.until)} (${b.why})`).join(" · ")}</div>}
    </div>
  );
}

/** Progress of a queue item for tables (queue + Fleet): a bar share when bounded, plus a label. */
export function itemProgress(ch: Character, it: QueueItem): { pct: number | null; label: string } | null {
  const stat = ch as unknown as Record<string, number>;
  const of = (done: number, total: number) =>
    total > 0 ? { pct: pct(done, total), label: `${done}/${total}` } : done > 0 ? { pct: null, label: `${done} done` } : null;
  switch (it.kind) {
    case "fight":
    case "gather":
    case "task-loop":
      return of(it.done, it.times);
    case "craft":
    case "sell":
    case "recycle":
      return of(it.done, it.quantity);
    case "offering": {
      const st = todayOfferings(ch.name);
      const slots = st ? offeringSlots(ch, st).filter((s) => s.status !== "none") : [];
      return slots.length ? { pct: pct(slots.filter((s) => s.status === "done").length, slots.length), label: `${slots.filter((s) => s.status === "done").length}/${slots.length} today` } : null;
    }
    case "train": {
      const who = ((it.for ? characters.value[it.for] : undefined) ?? stat) as Record<string, number>; // a helper shows the crafter's progress
      const xp = who[skillKey(it.skill, "xp")] ?? 0;
      const max = who[skillKey(it.skill, "max_xp")] ?? 0;
      return { pct: pct(xp, max), label: `Lv ${who[skillKey(it.skill, "level")] ?? 0} · ${xp}/${max} xp` };
    }
    default:
      return null;
  }
}

function QueueRow({ ch, it, index, running, note }: { ch: Character; it: QueueItem; index: number; running: boolean; note?: string }) {
  const isHead = index === 0;
  const progress = itemProgress(ch, it);

  return (
    <div class={"q-row" + (running && isHead ? " q-running" : "") + (it.error ? " q-failed" : "")} role="row">
      <div class="q-row-main">
        <span class="q-idx">{index + 1}</span>
        <span class="q-text">
          <span class="q-icon">{queueItemIcon[it.kind]}</span> {queueItemText(it)}
          {note && <span class="q-note">now: {note}</span>}
        </span>
        <span class="q-prog">
          {progress?.pct != null && <Bar pct={progress.pct} />}
          {progress && <span class="q-progress">{progress.label}</span>}
        </span>
        <span class="q-actions" />
      </div>
      {it.error && <div class="q-error">⛔ {it.error}</div>}
    </div>
  );
}
