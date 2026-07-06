// Job gear preview — the best owned (bank ∪ inventory ∪ equipped) set for a
// non-combat job, computed by plan/jobgear.ts — the exact picker the queue
// re-equips with. Shows the effect totals (tool speed / prospecting / wisdom)
// of the worn vs recommended set and the per-slot swaps, with one action:
// queue a "gear" item that performs the swap. Combat sets are not previewed
// here — #/sim covers those.
//
// Cheap by construction: gather/craft jobs are per-slot argmaxes (no fight
// solver), so computing on every render is fine.

import { useState } from "preact/hooks";
import { bankItems } from "../state/store";
import { effectValue, jobGear, MANAGED_SLOTS } from "../plan/jobgear";
import { addItem, startQueue } from "../state/queue";
import { withId } from "../plan/queue";
import { item, itemName } from "../catalog";
import { asset, assetFallback, slotLabel } from "../lib/util";
import { itemHover } from "./ItemPopup";
import { slotCode } from "../types/api";
import type { GearJob } from "../plan/types";
import type { Character, GearSlot } from "../types/api";

const JOBS: { key: string; label: string }[] = [
  { key: "mining", label: "⛏ Mining" },
  { key: "woodcutting", label: "🪓 Woodcutting" },
  { key: "fishing", label: "🎣 Fishing" },
  { key: "alchemy", label: "🧪 Alchemy" },
  { key: "craft", label: "⚙ Crafting" },
];

interface Totals {
  speed: number; // % cooldown reduction from the tool (positive = faster)
  prospecting: number;
  wisdom: number;
}

function totalsOf(codes: (string | undefined)[], skill?: string): Totals {
  const t: Totals = { speed: 0, prospecting: 0, wisdom: 0 };
  for (const c of codes) {
    const it = c ? item(c) : undefined;
    if (!it) continue;
    if (skill) t.speed -= effectValue(it, skill); // tools carry a negative effect
    t.prospecting += effectValue(it, "prospecting");
    t.wisdom += effectValue(it, "wisdom");
  }
  return t;
}

/** "cur → want" chip body, or just the value when the set doesn't change it. */
function Delta({ cur, want, unit }: { cur: number; want: number; unit?: string }) {
  if (cur === want)
    return (
      <b>
        {want}
        {unit}
      </b>
    );
  return (
    <>
      {cur}
      {unit} <span class="jg-arrow">→</span>{" "}
      <b class={want > cur ? "jg-up" : "jg-down"}>
        {want}
        {unit}
      </b>
    </>
  );
}

function SlotIcon({ code }: { code: string }) {
  if (!code) return <span class="jg-none">—</span>;
  return (
    <>
      <img class="info-hover" src={asset("items", code)} alt="" onError={assetFallback("items", code)} {...itemHover(code)} />
      <span class="jg-name info-hover" {...itemHover(code)}>{itemName(code)}</span>
    </>
  );
}

export function JobGearPreview({ ch }: { ch: Character }) {
  const [key, setKey] = useState("mining");
  const skill = key === "craft" ? undefined : key;
  const job: GearJob = key === "craft" ? { kind: "craft" } : { kind: "gather", skill: key };
  const desired = jobGear(ch, bankItems.value, job) ?? {};

  const changes = MANAGED_SLOTS.filter((g) => desired[g] !== undefined && desired[g] !== slotCode(ch, g));
  const cur = totalsOf(MANAGED_SLOTS.map((g) => slotCode(ch, g)), skill);
  const want = totalsOf(MANAGED_SLOTS.map((g) => (desired[g] !== undefined ? desired[g] : slotCode(ch, g))), skill);

  const queueSwap = () => {
    addItem(ch.name, withId({ kind: "gear", job }));
    startQueue(ch.name); // no-op while already running / refused while another loop owns the character
  };

  return (
    <div class="jg-panel">
      <div class="jg-controls">
        <select class="cp-refine-select" value={key} onChange={(e) => setKey((e.target as HTMLSelectElement).value)}>
          {JOBS.map((j) => (
            <option key={j.key} value={j.key}>
              {j.label}
            </option>
          ))}
        </select>
        <button
          class="btn-refine"
          disabled={changes.length === 0}
          title={changes.length ? `Queue the ${changes.length}-slot swap (runs via the queue)` : "Already wearing the best owned set"}
          onClick={queueSwap}
        >
          🧰 Equip
        </button>
      </div>

      <div class="jg-totals">
        {skill && (
          <span class="jg-chip" title="Action cooldown reduction from the tool">
            speed <Delta cur={cur.speed} want={want.speed} unit="%" />
          </span>
        )}
        <span class="jg-chip" title="Extra drop chance while gathering">
          prospecting <Delta cur={cur.prospecting} want={want.prospecting} />
        </span>
        <span class="jg-chip" title="Extra XP per action (gathering and crafting)">
          wisdom <Delta cur={cur.wisdom} want={want.wisdom} />
        </span>
      </div>

      {changes.length === 0 ? (
        <div class="jg-ok">✓ Already wearing the best owned set for this job.</div>
      ) : (
        <div class="jg-list">
          {changes.map((g: GearSlot) => (
            <div key={g} class="jg-row">
              <span class="jg-slot">{slotLabel(g)}</span>
              <SlotIcon code={slotCode(ch, g)} />
              <span class="jg-arrow">→</span>
              <SlotIcon code={desired[g]!} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
