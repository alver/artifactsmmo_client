import type { Character } from "../types/api";
import { GearSlots } from "./GearSlots";
import { ActionBar } from "./ActionBar";
import { item, mapAt } from "../catalog";
import { IMG, pct } from "../lib/util";

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

const hideOnError = (e: Event) => {
  (e.target as HTMLImageElement).style.visibility = "hidden";
};

export function CharacterCard({ ch }: { ch: Character }) {
  const here = mapAt(ch.x, ch.y);
  const content = here?.interactions.content;
  const inv = (ch.inventory || []).filter((s) => s.code && s.quantity > 0);
  const skills = ch as unknown as Record<string, number>;

  return (
    <div class="card">
      <div class="card-head">
        <img class="avatar" src={`${IMG}/characters/${ch.skin || "men1"}.png`} alt="" onError={hideOnError} />
        <div class="card-id">
          <h2>{ch.name}</h2>
          <span class="muted">
            Lv {ch.level} · ({ch.x}, {ch.y}){here ? ` · ${here.name}` : ""}
          </span>
          {content && (
            <span class="tag">
              {content.type}: {content.code}
            </span>
          )}
        </div>
        <div class="gold">🪙 {ch.gold}</div>
      </div>

      <div class="bars">
        <Bar label="HP" cur={ch.hp} max={ch.max_hp} cls="hp" />
        <Bar label="XP" cur={ch.xp} max={ch.max_xp} cls="xp" />
      </div>

      <ActionBar ch={ch} />

      {ch.task && (
        <div class="task">
          <span class="muted">Task</span> {ch.task} — {ch.task_progress}/{ch.task_total}
        </div>
      )}

      <details class="section" open>
        <summary>Gear</summary>
        <GearSlots ch={ch} />
      </details>

      <details class="section">
        <summary>Skills</summary>
        <div class="skills">
          {SKILLS.map(([key, label]) => (
            <div key={key} class="skill">
              <span class="muted">{label}</span>
              <b>{skills[`${key}_level`]}</b>
            </div>
          ))}
        </div>
      </details>

      <details class="section">
        <summary>Inventory ({inv.length})</summary>
        <div class="inv">
          {inv.length === 0 && <span class="muted">empty</span>}
          {inv.map((s) => (
            <div key={s.code} class="inv-item" title={item(s.code)?.name || s.code}>
              <img src={`${IMG}/items/${s.code}.png`} alt="" onError={hideOnError} />
              <span>×{s.quantity}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function Bar({ label, cur, max, cls }: { label: string; cur: number; max: number; cls: string }) {
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
