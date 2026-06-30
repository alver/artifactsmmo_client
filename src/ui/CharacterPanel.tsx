import { useState } from "preact/hooks";
import { characters, now, selectedCharacter } from "../state/store";
import { item, itemName, monster, npc, resource, tileAt } from "../catalog";
import { asset, assetFallback, cooldownRemaining, pct, titleCase } from "../lib/util";
import { gatherJobs } from "../state/gather";
import { refineJobs, refineOptions, startRefine, stopRefine } from "../state/refine";
import { GearSlots } from "./GearSlots";
import { ActionBar } from "./ActionBar";
import type { Character } from "../types/api";

const SKILLS: [string, string][] = [
  ["mining", "Mining"],
  ["woodcutting", "Woodcutting"],
  ["fishing", "Fishing"],
  ["weaponcrafting", "Weaponcraft"],
  ["gearcrafting", "Gearcraft"],
  ["jewelrycrafting", "Jewelrycraft"],
  ["cooking", "Cooking"],
  ["alchemy", "Alchemy"],
];

const ELEMENTS: [string, string][] = [
  ["fire", "Fire"],
  ["earth", "Earth"],
  ["water", "Water"],
  ["air", "Air"],
];

const layerOf = (c: Character): string => (c as { layer?: string }).layer ?? "overworld";

function contentLabel(type: string, code: string): string {
  const name =
    type === "resource"
      ? resource(code)?.name
      : type === "monster"
        ? monster(code)?.name
        : type === "npc"
          ? npc(code)?.name
          : item(code)?.name;
  return name ?? titleCase(code);
}

/**
 * Left-hand panel showing the full state of the selected character: vitals,
 * combat stats, equipment, gathering/crafting skills, current task and
 * inventory. Opens whenever a character is selected (e.g. by clicking its
 * mini-card on the map) and closes via the ✕ or by clearing the selection.
 */
export function CharacterPanel() {
  const name = selectedCharacter.value;
  if (!name) return null;
  const ch = characters.value[name];
  if (!ch) return null;

  // Most combat/skill fields are flat numeric props read by computed key.
  const stat = ch as unknown as Record<string, number>;
  const layer = layerOf(ch);
  const tile = tileAt(ch.x, ch.y, layer);
  const content = tile?.interactions.content;
  const cd = cooldownRemaining(ch, now.value); // re-renders with the global clock
  const inv = (ch.inventory || []).filter((s) => s.code && s.quantity > 0);
  const invQty = inv.reduce((s, it) => s + it.quantity, 0);

  return (
    <aside class="char-panel">
      <div class="cp-head">
        <img
          class="cp-avatar"
          src={asset("characters", ch.skin || "men1")}
          alt=""
          onError={assetFallback("characters", ch.skin || "men1")}
        />
        <div class="cp-titles">
          <div class="cp-name">{ch.name}</div>
          <div class="cp-sub">
            Level {ch.level} · ({ch.x}, {ch.y}){tile ? ` · ${tile.name}` : ""}
          </div>
          {content && (
            <span class="cp-tag">
              {titleCase(content.type)}: {contentLabel(content.type, content.code)}
            </span>
          )}
        </div>
        <button class="cat-close" title="Close" onClick={() => (selectedCharacter.value = null)}>
          ✕
        </button>
      </div>

      <div class="cp-body">
        <div class="bars">
          <StatBar label="HP" cur={ch.hp} max={ch.max_hp} cls="hp" />
          <StatBar label="XP" cur={ch.xp} max={ch.max_xp} cls="xp" />
        </div>
        <div class="cp-meta">
          <span class="gold">🪙 {ch.gold.toLocaleString()}</span>
          {cd > 0 && <span class="cooldown">⏳ {cd.toFixed(1)}s</span>}
        </div>

        <ActionBar ch={ch} />

        <div class="cp-refine">
          <div class="cp-refine-label">Refine raw materials</div>
          <RefineControl ch={ch} />
        </div>

        {ch.task && (
          <div class="task">
            <span class="muted">Task</span> {titleCase(ch.task)} — {ch.task_progress}/{ch.task_total}
          </div>
        )}

        <details class="section" open>
          <summary>Combat</summary>
          <table class="cp-elements">
            <thead>
              <tr>
                <th />
                {ELEMENTS.map(([k, l]) => (
                  <th key={k}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Attack</td>
                {ELEMENTS.map(([k]) => (
                  <td key={k}>{stat[`attack_${k}`]}</td>
                ))}
              </tr>
              <tr>
                <td>Dmg %</td>
                {ELEMENTS.map(([k]) => (
                  <td key={k}>{stat[`dmg_${k}`]}</td>
                ))}
              </tr>
              <tr>
                <td>Resist</td>
                {ELEMENTS.map(([k]) => (
                  <td key={k}>{stat[`res_${k}`]}</td>
                ))}
              </tr>
            </tbody>
          </table>
          <div class="cp-stats">
            <div class="kv-row"><span>Damage %</span><b>{ch.dmg}</b></div>
            <div class="kv-row"><span>Critical</span><b>{ch.critical_strike}%</b></div>
            <div class="kv-row"><span>Haste</span><b>{ch.haste}</b></div>
            <div class="kv-row"><span>Wisdom</span><b>{ch.wisdom}</b></div>
            <div class="kv-row"><span>Prospecting</span><b>{ch.prospecting}</b></div>
            <div class="kv-row"><span>Speed</span><b>{ch.speed}</b></div>
          </div>
        </details>

        <details class="section" open>
          <summary>Equipment</summary>
          <GearSlots ch={ch} />
        </details>

        <details class="section" open>
          <summary>Skills</summary>
          <div class="cp-skills">
            {SKILLS.map(([key, label]) => {
              const xp = stat[`${key}_xp`];
              const max = stat[`${key}_max_xp`];
              return (
                <div key={key} class="cp-skill">
                  <div class="cp-skill-top">
                    <span>{label}</span>
                    <b>Lv {stat[`${key}_level`]}</b>
                  </div>
                  <div class="bar">
                    <div class="fill xp" style={{ width: pct(xp, max) + "%" }} />
                  </div>
                  <span class="cp-skill-xp">
                    {xp}/{max}
                  </span>
                </div>
              );
            })}
          </div>
        </details>

        <details class="section" open>
          <summary>
            Inventory ({inv.length} · {invQty}/{ch.inventory_max_items})
          </summary>
          <div class="inv">
            {inv.length === 0 && <span class="muted">empty</span>}
            {inv.map((s) => (
              <div key={s.code} class="inv-item" title={item(s.code)?.name || s.code}>
                <img src={asset("items", s.code)} alt="" onError={assetFallback("items", s.code)} />
                <span>×{s.quantity}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </aside>
  );
}

/**
 * Pick a recipe and start the bank↔workshop refine loop, or show its live status
 * with a stop button while it runs. The dropdown lists every refining recipe the
 * bank currently has materials for, with the makeable count; recipes above this
 * character's skill level are shown but disabled.
 */
function RefineControl({ ch }: { ch: Character }) {
  const [sel, setSel] = useState("");
  const job = refineJobs.value[ch.name];
  const gathering = !!gatherJobs.value[ch.name];

  if (job) {
    return (
      <div class="cp-refine-run">
        <span class={`gather-tag ${job.status === "crafting" ? "" : "banking"}`}>
          <span class="spinner" />
          {job.note ? `${job.note} · ` : ""}
          {itemName(job.product)}
          {job.crafted ? ` · ${job.crafted} made` : ""}
        </span>
        <button class="btn-stop" title="Stop refining" onClick={() => stopRefine(ch.name)}>
          ⏹
        </button>
      </div>
    );
  }
  if (gathering) return <span class="foot-hint">busy gathering — stop it to refine</span>;

  const options = refineOptions(ch);
  if (options.length === 0) return <span class="foot-hint">No raw materials in the bank to refine.</span>;

  const chosen = options.find((o) => o.code === sel) ?? options.find((o) => o.levelOk) ?? options[0];
  return (
    <div class="cp-refine-pick">
      <select
        class="cp-refine-select"
        value={chosen.code}
        onChange={(e) => setSel((e.target as HTMLSelectElement).value)}
      >
        {options.map((o) => (
          <option key={o.code} value={o.code} disabled={!o.levelOk}>
            {o.name} · ×{o.maxCraft}
            {o.levelOk ? "" : ` · needs ${titleCase(o.skill)} Lv ${o.level}`}
          </option>
        ))}
      </select>
      <button
        class="btn-refine"
        disabled={!chosen.levelOk}
        title={chosen.levelOk ? `Refine ${chosen.name}` : `Requires ${titleCase(chosen.skill)} Lv ${chosen.level}`}
        onClick={() => startRefine(ch.name, chosen.code)}
      >
        ⚙ Refine
      </button>
    </div>
  );
}

function StatBar({ label, cur, max, cls }: { label: string; cur: number; max: number; cls: string }) {
  return (
    <div class="bar-row">
      <span class="bar-label">{label}</span>
      <div class="bar">
        <div class={`fill ${cls}`} style={{ width: pct(cur, max) + "%" }} />
      </div>
      <span class="bar-val">
        {cur}/{max}
      </span>
    </div>
  );
}
