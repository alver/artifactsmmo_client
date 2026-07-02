// Read-only planner panel: pick a goal → see the recommended gear, the ordered
// steps to obtain it, the estimated cost, and any blockers. Pure computation over
// the catalog (no API calls); the "Run" button that executes a plan is added in
// Phase 2 (campaign runner).

import { useState } from "preact/hooks";
import { bankItems } from "../state/store";
import { campaignJobs, startCampaign, stopCampaign } from "../state/campaign";
import { catalog, itemName, monster as monsterOf, tileAt } from "../catalog";
import { asset, assetFallback, slotLabel } from "../lib/util";
import { compileGoal } from "../plan/goal";
import type { AcquisitionStep, Goal, Plan } from "../plan/types";
import type { Character } from "../types/api";

type Kind = "beat-monster" | "combat-level" | "complete-task";

const layerOf = (c: Character): string => (c as { layer?: string }).layer ?? "overworld";

function monsterList(): { code: string; name: string; level: number }[] {
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
    case "equip": return `Equip ${itemName(s.code)} → ${slotLabel(s.slot)}`;
  }
}

const stepIcon: Record<AcquisitionStep["kind"], string> = {
  withdraw: "🏦", buy: "🪙", gather: "⛏", farm: "⚔", craft: "⚙", equip: "🛡",
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
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);

  const monsters = monsterList();
  const running = campaignJobs.value[ch.name];

  // A campaign is running for this character — show live status + stop instead.
  if (running) {
    return (
      <div class="cp-plan cp-plan-running" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span class="gather-tag banking" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span class="spinner" />
          {running.note || running.phase}
          {running.phase === "fighting" ? ` · ${running.done}/${running.repeat}` : ""}
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
        : kind === "combat-level" ? { kind, target: ch.level + 5 }
        : { kind: "complete-task" };
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
          <option value="beat-monster">Beat a monster</option>
          <option value="combat-level">Level up combat</option>
          <option value="complete-task">Complete current task</option>
        </select>
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
  const runnable = a.blockers.length === 0 && (plan.execution.targets.length > 0 || !!plan.execution.monster);
  return (
    <div class="cp-plan-out" style={{ marginTop: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 12, flex: 1 }}>{plan.summary}</div>
        {runnable && (
          <button class="btn-refine" title="Run this plan autonomously" onClick={() => startCampaign(ch.name, plan)}>
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
          <ol class="cp-plan-steps" style={{ margin: 0, paddingLeft: 18, fontSize: 12, maxHeight: 220, overflowY: "auto" }}>
            {a.steps.map((s, i) => (
              <li key={i} style={{ marginBottom: 1 }}>
                <span style={{ marginRight: 4 }}>{stepIcon[s.kind]}</span>
                {stepText(s)}
              </li>
            ))}
          </ol>
        </>
      )}

      {a.steps.length === 0 && a.blockers.length === 0 && (
        <div class="muted" style={{ fontSize: 12 }}>Nothing to do — you already have and wear this gear.</div>
      )}
    </div>
  );
}
