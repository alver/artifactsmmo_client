import { useState } from "preact/hooks";
import { characters, characterList, selectedCharacter } from "../state/store";
import { item, itemName, monster, npc, resource, tileAt } from "../catalog";
import { asset, assetFallback, pct, slotLabel, titleCase } from "../lib/util";
import { CooldownBadge } from "./Cooldown";
import { queues } from "../state/queue";
import { GearSlots } from "./GearSlots";
import { ActionBar } from "./ActionBar";
import { CombatForecast } from "./CombatForecast";
import { PlanControl } from "./PlanControl";
import { QueueSection } from "./QueuePanel";
import { useActionRunner } from "./useAction";
import type { ActionRunner } from "./useAction";
import * as actions from "../api/actions";
import { slotCode, SLOTS_FOR_TYPE } from "../types/api";
import type { Character, InventorySlot } from "../types/api";

const invQtyOf = (c: Character, code: string): number =>
  (c.inventory || []).reduce((s, it) => s + (it.code === code ? it.quantity : 0), 0);

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
  const onBank = content?.type === "bank";
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
          <div class="cp-name">
            {ch.name} <CooldownBadge ch={ch} />
          </div>
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
        <details class="section" open>
          <summary>Planner</summary>
          <PlanControl ch={ch} />
        </details>

        <details class="section" open>
          <summary>Queue{(queues.value[ch.name]?.items.length ?? 0) > 0 ? ` (${queues.value[ch.name]!.items.length})` : ""}</summary>
          <QueueSection ch={ch} />
        </details>

        <ActionBar ch={ch} />

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
          <InventorySection ch={ch} onBank={onBank} />
        </details>

        {characterList().length > 1 && (
          <details class="section">
            <summary>Give to another character</summary>
            <GiveSection ch={ch} />
          </details>
        )}

        {content?.type === "monster" && <CombatForecast ch={ch} monsterCode={content.code} />}
      </div>
    </aside>
  );
}

/**
 * Inventory list with per-item actions: equip (to a free matching slot), use
 * (consumables), deposit (only when standing on a bank tile) and delete. One
 * shared busy/cooldown gate for the section so the character can't double-fire.
 */
function InventorySection({ ch, onBank }: { ch: Character; onBank: boolean }) {
  const ctl = useActionRunner(ch);
  const inv = (ch.inventory || []).filter((s) => s.code && s.quantity > 0);
  return (
    <div class="inv-list">
      {inv.length === 0 && <div class="muted">empty</div>}
      {inv.map((s) => (
        <InvRow key={s.code} ch={ch} slot={s} ctl={ctl} onBank={onBank} />
      ))}
      <div class="inv-row inv-gold" title="Gold carried">
        <span class="inv-gold-icon">🪙</span>
        <span class="inv-name">Gold</span>
        <span class="inv-qty">×{ch.gold.toLocaleString()}</span>
      </div>
    </div>
  );
}

function InvRow({ ch, slot, ctl, onBank }: { ch: Character; slot: InventorySlot; ctl: ActionRunner; onBank: boolean }) {
  const it = item(slot.code);
  const type = it?.type ?? "";
  const candidates = SLOTS_FOR_TYPE[type];
  // Prefer the first empty matching slot; otherwise the first (which replaces).
  const equipSlot = candidates ? (candidates.find((s) => slotCode(ch, s) === "") ?? candidates[0]) : undefined;
  const equipQty = type === "utility" ? Math.min(slot.quantity, 100) : 1;

  return (
    <div class="inv-row" title={it?.name || slot.code}>
      <img src={asset("items", slot.code)} alt="" onError={assetFallback("items", slot.code)} />
      <span class="inv-name">{it?.name || slot.code}</span>
      <span class="inv-qty">×{slot.quantity}</span>
      <div class="inv-actions">
        {equipSlot && (
          <button
            class="cat-btn"
            disabled={ctl.disabled}
            title={`Equip to ${slotLabel(equipSlot)}`}
            onClick={() => ctl.run(() => actions.equip(ch.name, slot.code, equipSlot, equipQty))}
          >
            Equip
          </button>
        )}
        {type === "consumable" && (
          <button class="cat-btn buy" disabled={ctl.disabled} title="Use one" onClick={() => ctl.run(() => actions.use(ch.name, slot.code, 1))}>
            Use
          </button>
        )}
        {onBank && (
          <button
            class="cat-btn"
            disabled={ctl.disabled}
            title="Deposit this stack to the bank"
            onClick={() => ctl.run(() => actions.depositItems(ch.name, [{ code: slot.code, quantity: slot.quantity }]))}
          >
            Deposit
          </button>
        )}
        <button
          class="cat-btn sell"
          disabled={ctl.disabled}
          title="Delete (destroy) this stack"
          onClick={() => {
            if (confirm(`Delete ${slot.quantity}× ${it?.name || slot.code}? This is permanent.`)) {
              void ctl.run(() => actions.deleteItem(ch.name, slot.code, slot.quantity));
            }
          }}
        >
          🗑
        </button>
      </div>
    </div>
  );
}

/** Transfer gold or an inventory item to another of your characters. Both sides
 *  are echoed by the API, so the recipient updates immediately too. */
function GiveSection({ ch }: { ch: Character }) {
  const ctl = useActionRunner(ch);
  const others = characterList().filter((c) => c.name !== ch.name);
  const inv = (ch.inventory || []).filter((s) => s.code && s.quantity > 0);
  const [to, setTo] = useState(others[0]?.name ?? "");
  const [mode, setMode] = useState<"gold" | "item">("gold");
  const [gold, setGold] = useState(0);
  const [code, setCode] = useState(inv[0]?.code ?? "");
  const [qty, setQty] = useState(1);

  const recipient = others.find((c) => c.name === to) ? to : (others[0]?.name ?? "");
  const held = invQtyOf(ch, code);
  const canGive =
    !!recipient && !ctl.disabled && (mode === "gold" ? gold >= 1 && gold <= ch.gold : !!code && qty >= 1 && qty <= held);

  return (
    <div class="give-form">
      <select class="cp-refine-select" value={recipient} onChange={(e) => setTo((e.target as HTMLSelectElement).value)}>
        {others.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name} (Lv {c.level})
          </option>
        ))}
      </select>
      <div class="give-mode">
        <label>
          <input type="radio" checked={mode === "gold"} onChange={() => setMode("gold")} /> Gold
        </label>
        <label>
          <input type="radio" checked={mode === "item"} onChange={() => setMode("item")} /> Item
        </label>
      </div>
      {mode === "gold" ? (
        <input
          class="cat-num"
          type="number"
          min={1}
          max={ch.gold}
          value={gold}
          onInput={(e) => setGold(parseInt((e.target as HTMLInputElement).value, 10) || 0)}
        />
      ) : (
        <>
          <select class="cp-refine-select" value={code} onChange={(e) => setCode((e.target as HTMLSelectElement).value)}>
            {inv.map((s) => (
              <option key={s.code} value={s.code}>
                {itemName(s.code)} (×{s.quantity})
              </option>
            ))}
          </select>
          <input
            class="cat-num"
            type="number"
            min={1}
            max={held}
            value={qty}
            onInput={(e) => setQty(parseInt((e.target as HTMLInputElement).value, 10) || 1)}
          />
        </>
      )}
      <button
        class="cat-btn buy"
        disabled={!canGive}
        onClick={() =>
          ctl.run(() =>
            mode === "gold" ? actions.giveGold(ch.name, recipient, gold) : actions.giveItems(ch.name, recipient, [{ code, quantity: qty }]),
          )
        }
      >
        Give
      </button>
    </div>
  );
}

