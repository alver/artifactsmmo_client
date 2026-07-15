// The Hive UI: a topbar drawer (propose → preview → launch → monitor) and a
// slim always-visible status strip above the roster. Reads only the hive /
// queues / proposals signals — never the 4 Hz clock.

import { useMemo, useState } from "preact/hooks";
import type { JSX } from "preact";
import { achievements, achievementsLoading, hiveOpen } from "../state/store";
import { loadAchievements } from "../state/sync";
import {
  assignmentStatus,
  buildHiveCtx,
  hive,
  hiveProposals,
  launchHive,
  refreshProposals,
  retryAssignment,
  skipAssignment,
  stopHive,
  takeoverPreview,
  toggleHiveManual,
  type HiveAssignmentState,
  type HiveRun,
  type LiveAssignmentStatus,
} from "../state/hive";
import { queues } from "../state/queue";
import { compileGoal } from "../plan/hive";
import { crafterFor } from "../plan/hive/ctx";
import { probeFeasible } from "../plan/hive/gear";
import type { HiveCtx, HivePlan, ScoredGoal } from "../plan/hive";
import { characterList } from "../state/store";
import { catalog, itemName } from "../catalog";
import { titleCase } from "../lib/util";

const STATUS_BADGE: Record<LiveAssignmentStatus, string> = {
  pending: "…",
  running: "▶",
  done: "✓",
  paused: "⛔",
  blocked: "⛔",
  stopped: "⏸",
  skipped: "⏭",
};

// A filler assignment is opportunistic: only its OWN error (paused) warrants
// attention — a user-stopped or user-blocked filler is the user's choice.
const needsAttention = (a: HiveAssignmentState, s: LiveAssignmentStatus): boolean =>
  a.filler ? s === "paused" : s === "paused" || s === "blocked" || s === "stopped";

/** Slim account-level status bar above the roster; null while the hive is idle. */
export function HiveStrip() {
  const run = hive.value.run;
  if (!run) return null;
  // One chip per character: a live filler outranks its finished main assignment
  // (but a skipped one — e.g. no suitable master — never steals the ✓).
  const byChar = new Map<string, { a: HiveAssignmentState; s: LiveAssignmentStatus }>();
  for (const a of run.wave?.assignments ?? []) {
    const s = assignmentStatus(a, queues.value[a.character]);
    const cur = byChar.get(a.character);
    if (!cur || ((cur.s === "done" || cur.s === "skipped") && s !== "skipped")) byChar.set(a.character, { a, s });
  }
  const statuses = [...byChar.values()];
  const attention = statuses.filter((x) => needsAttention(x.a, x.s)).length;
  return (
    <div class="hive-strip" onClick={() => (hiveOpen.value = true)} title="Open the hive">
      <span class="hive-strip-title">🐝 {run.label}</span>
      <span class="hive-strip-wave">
        wave {run.waveSeq + 1}
        {run.status === "verifying" ? " · verifying…" : ""}
      </span>
      {statuses.map(({ a, s }) => (
        <span key={a.character} class={`hive-chip ${s}`} title={a.filler ? "idle filler: tasks until the wave ends" : a.label}>
          {a.character} {a.filler ? "⚒" : ""}{STATUS_BADGE[s]}
        </span>
      ))}
      {attention > 0 && <span class="hive-alert">⛔ {attention} need attention</span>}
    </div>
  );
}

export function HiveDrawer() {
  if (!hiveOpen.value) return null;
  const close = () => (hiveOpen.value = false);
  const run = hive.value.run;
  return (
    <div class="ach-backdrop" onClick={close}>
      <aside class="ach-panel hive-panel" onClick={(e) => e.stopPropagation()}>
        <header class="ach-head">
          <div class="ach-titles">
            <div class="ach-title">🐝 Hive</div>
            <div class="ach-sub">{run ? "working an account goal" : "one goal, every character on it"}</div>
          </div>
          {!run && (
            <button class="ach-btn" title="Recompute candidate goals" onClick={refreshProposals}>
              ↻ Propose
            </button>
          )}
          <button class="cat-close" title="Close" onClick={close}>
            ✕
          </button>
        </header>
        <ManualRow />
        <div class="ach-body">
          {run ? <RunView run={run} /> : <ProposalsView />}
          <HistoryView />
        </div>
      </aside>
    </div>
  );
}

/** Per-character manual opt-out toggles (opted-out queues are never touched). */
function ManualRow() {
  const manual = new Set(hive.value.manual);
  return (
    <div class="hive-manual">
      <span class="muted">participants:</span>
      {characterList().map((c) => (
        <button
          key={c.name}
          class={"hive-chip toggle" + (manual.has(c.name) ? " off" : "")}
          title={manual.has(c.name) ? "Manual — click to enlist" : "In the hive — click to opt out"}
          onClick={() => toggleHiveManual(c.name)}
        >
          {manual.has(c.name) ? "✋" : "🐝"} {c.name}
        </button>
      ))}
    </div>
  );
}

/**
 * The order builder's menu: only what the fleet could actually produce —
 * some participant's craft skill reaches the recipe NOW, and the materials
 * are sourceable at all (gather/craft/fight/buy probe; memoized per bank
 * generation). Grouped by skill, then level.
 */
function craftableItems(ctx: HiveCtx): { code: string; name: string; skill: string; level: number }[] {
  try {
    return [...catalog().items.values()]
      .filter((i) => {
        if (!i.craft) return false;
        const crafter = crafterFor(ctx, i.craft.skill);
        if (!crafter || crafter.level < i.craft.level) return false; // nobody can craft it yet
        return probeFeasible(ctx, i.code);
      })
      .map((i) => ({ code: i.code, name: i.name, skill: i.craft!.skill, level: i.craft!.level }))
      .sort((a, b) => a.skill.localeCompare(b.skill) || a.level - b.level || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

function ProposalsView() {
  const [sel, setSel] = useState<{ g: ScoredGoal; plan: HivePlan } | null>(null);
  const [orderCode, setOrderCode] = useState("");
  const [orderQty, setOrderQty] = useState(1);
  const [goldQty, setGoldQty] = useState(1000);
  const list = hiveProposals.value;
  // Recomputed once per drawer open (the probe sweep costs ~100ms cold).
  const craftables = useMemo(() => craftableItems(buildHiveCtx()), []);

  const pick = (g: ScoredGoal) => setSel({ g, plan: compileGoal(g.goal, buildHiveCtx()) });
  const pickOrder = () => {
    const code = orderCode || craftables[0]?.code;
    if (!code) return;
    const quantity = Math.max(1, orderQty);
    const g: ScoredGoal = {
      goal: { kind: "craft-order", targets: [{ code, quantity }] },
      label: `Craft ${quantity}× ${itemName(code)}`,
      score: 0,
      rationale: "your order — the fleet gathers, the qualified crafter finishes",
      blockers: [],
      estActions: 0,
      estMinutes: 0,
    };
    setSel({ g, plan: compileGoal(g.goal, buildHiveCtx()) });
  };
  const pickGold = () => {
    const ctx = buildHiveCtx();
    const n = Math.max(1, goldQty);
    // Baseline = bank + participants' pockets, the same measure goldSatisfied
    // uses — "earn +N from now" regardless of where the gold sits.
    const base = ctx.bankGold + ctx.characters.reduce((s, c) => s + c.gold, 0);
    const g: ScoredGoal = {
      goal: { kind: "earn-gold", target: base + n },
      label: `Earn ${n.toLocaleString()}g (vault → ${(base + n).toLocaleString()}g)`,
      score: 0,
      rationale: "your order — each character works its best gold-per-action lane and sells the loot",
      blockers: [],
      estActions: 0,
      estMinutes: 0,
    };
    setSel({ g, plan: compileGoal(g.goal, ctx) });
  };
  const launch = () => {
    if (!sel) return;
    const takeover = takeoverPreview();
    if (
      takeover.length &&
      !confirm(
        `Launching stops and clears these queues:\n${takeover
          .map((t) => `  ${t.name} — ${t.items} item${t.items === 1 ? "" : "s"}${t.running ? ", running" : ""}`)
          .join("\n")}\nContinue?`,
      )
    ) {
      return;
    }
    launchHive(sel.g, sel.plan);
    setSel(null);
  };

  return (
    <>
      {!achievements.value && (
        <div class="hive-hint">
          Achievement goals need progress data.{" "}
          <button class="ach-btn" disabled={achievementsLoading.value} onClick={() => void loadAchievements()}>
            {achievementsLoading.value ? "…" : "🏆 Load achievements"}
          </button>
        </div>
      )}
      {!list && (
        <div class="hive-empty">
          <button class="ach-btn" onClick={refreshProposals}>
            🐝 Propose goals
          </button>
          <div class="muted">Scores every candidate goal against the live bank and roster (a second or two).</div>
        </div>
      )}
      <div class="hive-hint">
        <span class="muted">craft to order:</span>
        <select class="cp-refine-select" value={orderCode || craftables[0]?.code || ""} onChange={(e) => setOrderCode((e.target as HTMLSelectElement).value)}>
          {craftables.flatMap((i, idx) => {
            const opts: JSX.Element[] = [];
            if (idx === 0 || i.skill !== craftables[idx - 1].skill) {
              opts.push(
                <option key={`sep-${i.skill}`} disabled class="q-opt-sep">
                  {`------ ${titleCase(i.skill)} ------`}
                </option>,
              );
            }
            opts.push(
              <option key={i.code} value={i.code}>
                {i.name} (lv.{i.level})
              </option>,
            );
            return opts;
          })}
        </select>
        <input
          class="cat-num"
          type="number"
          min={1}
          value={orderQty}
          onInput={(e) => setOrderQty(parseInt((e.target as HTMLInputElement).value, 10) || 1)}
        />
        <button class="ach-btn" title="Fleet gathers the materials; the qualified crafter finishes" onClick={pickOrder}>
          🛠 Plan order
        </button>
      </div>
      <div class="hive-hint">
        <span class="muted">earn gold:</span>
        <span>+</span>
        <input
          class="cat-num"
          type="number"
          min={1}
          step={100}
          value={goldQty}
          onInput={(e) => setGoldQty(parseInt((e.target as HTMLInputElement).value, 10) || 1)}
        />
        <button class="ach-btn" title="Each character works its best gold-per-action lane until the vault grows by this much" onClick={pickGold}>
          🪙 Plan gold
        </button>
      </div>
      {list && list.length === 0 && <div class="muted">Nothing worth proposing right now.</div>}
      {list?.map((g) => (
        <div
          key={g.label + g.score}
          class={"hive-card" + (sel?.g === g ? " selected" : "")}
          onClick={() => pick(g)}
        >
          <div class="ach-row-head">
            <span class="ach-name">{g.label}</span>
            <span class="ach-pts">{Math.round(g.score)} pts/h · ~{g.estMinutes}m</span>
          </div>
          <div class="ach-desc">{g.rationale}</div>
          {g.blockers.length > 0 && (
            <div class="hive-blockers">{g.blockers.map((b) => `⚠ ${b.reason}`).join(" · ")}</div>
          )}
        </div>
      ))}
      {sel && <PlanPreview plan={sel.plan} onLaunch={launch} />}
    </>
  );
}

function PlanPreview({ plan, onLaunch }: { plan: HivePlan; onLaunch: () => void }) {
  return (
    <div class="hive-preview">
      <div class="hive-preview-title">{plan.summary}</div>
      {plan.waves.map((w, i) => (
        <div key={i} class="hive-wave">
          <div class="hive-wave-label">
            {i + 1}. {w.label}
            {i > 0 ? " (preview — replanned live)" : ""}
          </div>
          {w.assignments.map((a) => (
            <div key={a.character} class="hive-assign">
              <span class="hive-assign-who">{a.character}</span>
              <span class="hive-assign-what">{a.label}</span>
            </div>
          ))}
        </div>
      ))}
      {plan.blockers.length > 0 && (
        <div class="hive-blockers">{plan.blockers.map((b) => `⚠ ${b.reason}`).join(" · ")}</div>
      )}
      <div class="muted">
        Participants a wave leaves idle run tasks-master tasks until its barrier; when the goal ends, everyone keeps
        (or picks up) a task loop.
      </div>
      <button class="ach-btn hive-launch" disabled={plan.waves.length === 0} onClick={onLaunch}>
        🚀 Launch
      </button>
    </div>
  );
}

function RunView({ run }: { run: HiveRun }) {
  return (
    <>
      <div class="hive-goal">
        <div class="ach-name">{run.label}</div>
        <div class="ach-sub">
          wave {run.waveSeq + 1}
          {run.status === "verifying" ? " · verifying goal…" : ""}
          {run.preview.length > 0 ? ` · next: ${run.preview.join(" → ")}` : ""}
        </div>
      </div>
      {run.wave && (
        <div class="hive-wave">
          <div class="hive-wave-label">{run.wave.label}</div>
          {run.wave.assignments.map((a) => (
            <AssignmentRow key={a.character + (a.filler ? ":filler" : "")} a={a} />
          ))}
        </div>
      )}
      <button
        class="ach-btn hive-stop"
        onClick={() => {
          if (confirm("Stop the hive and abandon this goal?")) stopHive();
        }}
      >
        ⏹ Stop hive
      </button>
    </>
  );
}

function AssignmentRow({ a }: { a: HiveAssignmentState }) {
  const q = queues.value[a.character];
  const s = assignmentStatus(a, q);
  const bad = needsAttention(a, s);
  return (
    <div class={"hive-assign" + (bad ? " failed" : "")}>
      <span class="hive-assign-who">
        {STATUS_BADGE[s]} {a.character}
      </span>
      <span class="hive-assign-what">
        {s === "running" && q?.note ? q.note : a.label}
        {bad && q?.items[0]?.error ? ` — ${q.items[0].error}` : ""}
      </span>
      {bad && (
        <span class="hive-assign-actions">
          <button class="ach-btn" title="Restart this queue" onClick={() => retryAssignment(a.character)}>
            ▶ Retry
          </button>
          <button class="ach-btn" title="Abandon this assignment" onClick={() => skipAssignment(a.character)}>
            ⏭ Skip
          </button>
        </span>
      )}
    </div>
  );
}

function HistoryView() {
  const history = hive.value.history;
  if (history.length === 0) return null;
  const badge = { done: "✅", incomplete: "🟨", abandoned: "⏹" } as const;
  return (
    <div class="hive-history">
      <div class="hive-wave-label">History</div>
      {[...history].reverse().map((h) => (
        <div key={h.startedAt} class="hive-assign">
          <span class="hive-assign-who">{badge[h.outcome]}</span>
          <span class="hive-assign-what">
            {h.label} · {Math.max(1, Math.round((h.endedAt - h.startedAt) / 60000))}m
          </span>
        </div>
      ))}
    </div>
  );
}
