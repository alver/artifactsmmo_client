// The planner panel: pick one of the three goals → see the bank-only gear
// forecast and any blockers → ▶ Run. Pure computation over the catalog + bank
// signal (no API calls) until Run:
//   Beat a monster        → enqueues [bank reset + fight gear, fight ∞] and
//                           starts the QUEUE.
//   Train a craft skill   → starts the campaign's train tick.
//   Complete current task → starts the campaign's task phase machine (one-shot).

import { useState } from "preact/hooks";
import { bankItems, craftFocus } from "../state/store";
import { campaignJobs, startCampaign, stopCampaign } from "../state/campaign";
import { enqueuePlan, startQueue } from "../state/queue";
import { catalog, itemName, monster as monsterOf, tileAt } from "../catalog";
import { asset, assetFallback, titleCase } from "../lib/util";
import { compileGoal } from "../plan/goal";
import { CRAFT_TRAIN_SKILLS } from "../plan/traincraft";
import type { AcquisitionStep, Goal, Plan } from "../plan/types";
import type { Character } from "../types/api";

type Kind = "beat-monster" | "train-craft" | "complete-task";

const layerOf = (c: Character): string => (c as { layer?: string }).layer ?? "overworld";

export function monsterList(): { code: string; name: string; level: number }[] {
  try {
    return [...catalog().monsters.values()]
      .filter((m) => m.type === "normal")
      .map((m) => ({ code: m.code, name: m.name, level: m.level }))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

function stepText(s: AcquisitionStep): string {
  switch (s.kind) {
    case "withdraw": return `Withdraw ${s.quantity}× ${itemName(s.code)} from bank`;
    case "buy": return `Buy ${s.quantity}× ${itemName(s.code)} (${s.cost}g)`;
    case "gather": return `Gather ${s.quantity}× ${itemName(s.code)}`;
    case "farm": return `Farm ${s.quantity}× ${itemName(s.code)} — ~${s.expectedFights} fights`;
    case "craft": return `Craft ${s.quantity}× ${itemName(s.code)}`;
    case "train": return `Train ${titleCase(s.skill)} to Lv ${s.toLevel} by gathering`;
  }
}

const stepIcon: Record<AcquisitionStep["kind"], string> = {
  withdraw: "🏦", buy: "🪙", gather: "⛏", farm: "⚔", craft: "⚙", train: "🎓",
};

function human(secs: number): string {
  if (secs < 90) return `${secs}s`;
  if (secs < 3600) return `${Math.round(secs / 60)} min`;
  return `${(secs / 3600).toFixed(1)} h`;
}

export function PlanControl({ ch }: { ch: Character }) {
  const tile = tileAt(ch.x, ch.y, layerOf(ch));
  const tileMonster = tile?.interactions.content?.type === "monster" ? tile.interactions.content.code : "";

  const [kind, setKind] = useState<Kind>("beat-monster");
  const [mon, setMon] = useState(tileMonster || "chicken");
  const [master, setMaster] = useState<"monsters" | "items">("monsters");
  const [craftSkill, setCraftSkill] = useState(() => craftFocus(ch)); // default = the ★ specialization
  const [craftTarget, setCraftTarget] = useState(0); // 0 = auto (current + 5)
  const [craftRecipe, setCraftRecipe] = useState(""); // "" = auto (best in window)
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);

  const stats = ch as unknown as Record<string, number>;
  const craftLevel = stats[`${craftSkill}_level`] ?? 1;
  const craftGoalLevel = craftTarget > craftLevel ? craftTarget : craftLevel + 5;
  const craftRecipes = (() => {
    if (kind !== "train-craft") return [];
    try {
      return [...catalog().items.values()]
        .filter((i) => i.craft?.skill === craftSkill)
        .sort((a, b) => a.craft!.level - b.craft!.level || a.name.localeCompare(b.name));
    } catch {
      return [];
    }
  })();

  const monsters = monsterList();
  const running = campaignJobs.value[ch.name];

  // A campaign is running for this character — show live status + stop instead.
  if (running) {
    const progress =
      (running.phase === "execute" || running.phase === "deliver") && ch.task_total > 0 ? ` · ${ch.task_progress}/${ch.task_total}` : "";
    return (
      <div class="cp-plan cp-plan-running" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span class="gather-tag banking" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span class="spinner" />
          {running.note || running.phase}
          {progress}
        </span>
        <span class="muted" style={{ fontSize: 11, flex: 1 }}>{running.label}</span>
        <button class="btn-stop" title="Stop the campaign" onClick={() => stopCampaign(ch.name)}>⏹</button>
      </div>
    );
  }

  const compute = () => {
    setBusy(true);
    // Defer so the spinner paints before the (synchronous, possibly ~100s-of-ms)
    // search runs.
    setTimeout(() => {
      const goal: Goal =
        kind === "beat-monster" ? { kind, monster: mon }
        : kind === "train-craft" ? { kind, skill: craftSkill, target: craftGoalLevel, recipe: craftRecipe || undefined }
        : { kind: "complete-task", master };
      try {
        setPlan(compileGoal(ch, bankItems.value, goal));
      } finally {
        setBusy(false);
      }
    }, 0);
  };

  return (
    <div class="cp-plan">
      <div class="cp-plan-pick" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <select class="cp-refine-select" value={kind} onChange={(e) => { setKind((e.target as HTMLSelectElement).value as Kind); setPlan(null); }}>
          <option value="beat-monster">Beat a monster (∞)</option>
          <option value="train-craft">Train a craft skill</option>
          <option value="complete-task">Complete current task</option>
        </select>
        {kind === "train-craft" && (
          <>
            <select class="cp-refine-select" value={craftSkill} onChange={(e) => { setCraftSkill((e.target as HTMLSelectElement).value); setCraftTarget(0); setCraftRecipe(""); setPlan(null); }}>
              {CRAFT_TRAIN_SKILLS.map(([key, label]) => (
                <option key={key} value={key}>{label} · Lv {stats[`${key}_level`] ?? 1}</option>
              ))}
            </select>
            <select
              class="cp-refine-select"
              title="Which recipe to craft & recycle — Auto re-picks the best one as you level"
              value={craftRecipe}
              onChange={(e) => { setCraftRecipe((e.target as HTMLSelectElement).value); setPlan(null); }}
            >
              <option value="">Auto — best in XP window</option>
              {craftRecipes.map((r) => {
                const rl = r.craft!.level;
                const tag = rl > craftLevel ? " · locked" : rl <= craftLevel - 10 ? " · no XP" : "";
                return (
                  <option key={r.code} value={r.code} disabled={!!tag}>
                    {r.name} · Lv {rl}{tag}
                  </option>
                );
              })}
            </select>
            <label class="q-field" title="Stop at this skill level">
              to Lv
              <input
                class="cat-num"
                type="number"
                min={craftLevel + 1}
                max={50}
                value={craftGoalLevel}
                onInput={(e) => { setCraftTarget(parseInt((e.target as HTMLInputElement).value, 10) || 0); setPlan(null); }}
              />
            </label>
          </>
        )}
        {kind === "complete-task" && !ch.task && (
          <select class="cp-refine-select" value={master} onChange={(e) => { setMaster((e.target as HTMLSelectElement).value as "monsters" | "items"); setPlan(null); }}>
            <option value="monsters">Fight tasks</option>
            <option value="items">Item tasks</option>
          </select>
        )}
        {kind === "beat-monster" && (
          <select class="cp-refine-select" value={mon} onChange={(e) => { setMon((e.target as HTMLSelectElement).value); setPlan(null); }}>
            {tileMonster && <option value={tileMonster}>◉ {monsterOf(tileMonster)?.name ?? tileMonster} (here)</option>}
            {monsters.map((m) => (
              <option key={m.code} value={m.code}>{m.name} · Lv {m.level}</option>
            ))}
          </select>
        )}
        <button class="btn-refine" disabled={busy} onClick={compute}>
          {busy ? "Planning…" : "📋 Plan"}
        </button>
      </div>

      {plan && <PlanView ch={ch} plan={plan} />}
    </div>
  );
}

function PlanView({ ch, plan }: { ch: Character; plan: Plan }) {
  const a = plan.acquisition;
  const queueRun = !plan.execution.mode; // beat-monster runs from the queue
  const runnable =
    a.blockers.length === 0 &&
    (!!plan.execution.monster || plan.execution.mode === "task" || plan.execution.mode === "train-craft");
  const run = () => {
    if (queueRun) {
      enqueuePlan(ch.name, plan);
      startQueue(ch.name);
    } else {
      startCampaign(ch.name, plan);
    }
  };
  return (
    <div class="cp-plan-out" style={{ marginTop: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 12, flex: 1 }}>{plan.summary}</div>
        {runnable && (
          <button
            class="btn-refine"
            title={
              queueRun
                ? "Bank reset (deposit everything), equip the bank's best set, then fight until stopped"
                : "Run self-managed — starts with a full bank reset, re-plans as state changes"
            }
            onClick={run}
          >
            ▶ Run
          </button>
        )}
      </div>

      {plan.gear && (
        <div class="cp-plan-gear" style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          {plan.gear.codes.map((code) => (
            <span key={code} title={itemName(code)} style={{ display: "inline-flex", alignItems: "center", gap: 3, border: "1px solid #0002", borderRadius: 4, padding: "1px 4px", fontSize: 11 }}>
              <img src={asset("items", code)} alt="" onError={assetFallback("items", code)} width={16} height={16} />
              {itemName(code)}
            </span>
          ))}
        </div>
      )}

      {a.blockers.length > 0 && (
        <div class="cp-plan-blockers" style={{ fontSize: 11, color: "#b3261e", marginBottom: 6 }}>
          {a.blockers.map((b, i) => (
            <div key={i}>⛔ {b}</div>
          ))}
        </div>
      )}

      {a.steps.length > 0 && (
        <>
          <div class="muted" style={{ fontSize: 11, marginBottom: 2 }}>
            {a.feasible ? "Steps" : "Steps (partial — see blockers)"} · ≈{a.estActions} actions · ~{human(a.estSeconds)}
          </div>
          <ol class="cp-plan-steps" style={{ margin: 0, paddingLeft: 18, fontSize: 12, maxHeight: 360, overflowY: "auto" }}>
            {a.steps.map((s, i) => (
              <li key={i} style={{ marginBottom: 1 }}>
                <span style={{ marginRight: 4 }}>{stepIcon[s.kind]}</span>
                {stepText(s)}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
