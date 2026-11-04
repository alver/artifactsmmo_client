import { MAX_PINS, characters, selectedCharacter, skillPins, togglePin } from "../state/store";
import { saveState } from "../state/persist";
import { item, monster, npc, resource } from "../catalog";
import { liveTileAt } from "../state/events";
import { asset, assetFallback, slotLabel, titleCase } from "../lib/util";
import { queues } from "../state/queue";
import { GearSlots } from "./GearSlots";
import { ActionBar } from "./ActionBar";
import { CombatForecast } from "./CombatForecast";
import { QueueSection } from "./QueuePanel";
import { itemHover } from "./ItemPopup";
import { useActionRunner } from "./useAction";
import type { ActionRunner } from "./useAction";
import * as actions from "../api/actions";
import { slotCode, SLOTS_FOR_TYPE } from "../types/api";
import type { Character, InventorySlot } from "../types/api";

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

const layerOf = (c: Character): string => (c as { layer?: string }).layer ?? "overworld";

/**
 * The Skills grid. Click a row to pin it as one of the character's main
 * skills (📌1/📌2 — up to MAX_PINS, one more replaces the oldest; click again
 * to unpin). Pins persist across reloads and feed the queue's "📌 Train pins"
 * loop and the hive's crafter routing.
 */
function SkillsSection({ ch, stat }: { ch: Character; stat: Record<string, number> }) {
  const pins = skillPins.value[ch.name] ?? [];
  return (
    <div class="cp-skills">
      {SKILLS.map(([key, label]) => {
        const idx = pins.indexOf(key);
        return (
          <div
            key={key}
            class={"cp-skill cp-skill-pinnable" + (idx >= 0 ? " cp-skill-focus" : "")}
            title={idx >= 0 ? "Unpin" : `Pin as a main skill (up to ${MAX_PINS}; one more replaces the oldest)`}
            onClick={() => { togglePin(ch.name, key); saveState(); }}
          >
            <b class="cp-skill-lv">{stat[`${key}_level`]}</b>
            <span class="cp-skill-name">{label}{idx >= 0 ? ` 📌${idx + 1}` : ""}</span>
            <span class="cp-skill-xp">
              {stat[`${key}_xp`]}/{stat[`${key}_max_xp`]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Human name of a tile's content (also used by the roster cards' location line). */
export function contentLabel(type: string, code: string): string {
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
 * The main character workspace: full state and control of the selected
 * character laid out as a multi-column dashboard so (almost) everything is
 * visible without scrolling. The control column (the Queue) comes first
 * and widest; equipment/combat and skills/inventory fill the other columns.
 * Selection comes from the roster strip above (see ui/CharacterMini.tsx).
 */
export function CharacterPanel() {
  const name = selectedCharacter.value;
  const ch = name ? characters.value[name] : undefined;
  if (!ch) return <div class="ws-empty muted">Select a character above to manage it.</div>;

  // Most combat/skill fields are flat numeric props read by computed key.
  const stat = ch as unknown as Record<string, number>;
  const layer = layerOf(ch);
  const tile = liveTileAt(ch.x, ch.y, layer); // event override first — event tiles enable actions too
  const content = tile?.interactions.content;
  const onBank = content?.type === "bank";
  const onWorkshop = content?.type === "workshop" ? content.code : undefined;
  const inv = (ch.inventory || []).filter((s) => s.code && s.quantity > 0);
  const invQty = inv.reduce((s, it) => s + it.quantity, 0);
  const queueCount = queues.value[ch.name]?.items.length ?? 0;

  return (
    <div class="ws-body">
      {/* No header — the roster card above already shows everything (avatar,
          level, location, task, cooldown ring). The bar holds Walk (arms map
          click-to-move) plus the situational Enter button on transition tiles. */}
      <ActionBar ch={ch} />

      <div class="ws-grid">
        <div class="ws-col ws-col-control">
          <details class="ws-card" open>
            <summary>Queue{queueCount > 0 ? ` (${queueCount})` : ""}</summary>
            <QueueSection ch={ch} />
          </details>
        </div>

        <div class="ws-col">
          <details class="ws-card" open>
            <summary>Equipment</summary>
            <GearSlots ch={ch} />
          </details>

          {content?.type === "monster" && (
            <details class="ws-card" open>
              <summary>Forecast</summary>
              <CombatForecast ch={ch} monsterCode={content.code} />
            </details>
          )}
        </div>

        <div class="ws-col">
          <details class="ws-card" open>
            <summary>Skills</summary>
            <SkillsSection ch={ch} stat={stat} />
          </details>

          <details class="ws-card" open>
            <summary>
              Inventory ({inv.length} · {invQty}/{ch.inventory_max_items})
            </summary>
            <InventorySection ch={ch} onBank={onBank} onWorkshop={onWorkshop} />
          </details>

        </div>
      </div>
    </div>
  );
}

/**
 * Inventory list with per-item actions: equip (to a free matching slot), use
 * (consumables), deposit (only when standing on a bank tile), recycle (only
 * when standing on the workshop that crafts the item) and delete. One shared
 * busy/cooldown gate for the section so the character can't double-fire.
 */
function InventorySection({ ch, onBank, onWorkshop }: { ch: Character; onBank: boolean; onWorkshop?: string }) {
  const ctl = useActionRunner(ch);
  const inv = (ch.inventory || []).filter((s) => s.code && s.quantity > 0);
  return (
    <div class="inv-list">
      {inv.length === 0 && <div class="muted">empty</div>}
      {inv.map((s) => (
        <InvRow key={s.code} ch={ch} slot={s} ctl={ctl} onBank={onBank} onWorkshop={onWorkshop} />
      ))}
      <div class="inv-row inv-gold" title="Gold carried">
        <span class="inv-gold-icon">🪙</span>
        <span class="inv-name">Gold</span>
        <span class="inv-qty">×{ch.gold.toLocaleString()}</span>
      </div>
    </div>
  );
}

function InvRow({ ch, slot, ctl, onBank, onWorkshop }: { ch: Character; slot: InventorySlot; ctl: ActionRunner; onBank: boolean; onWorkshop?: string }) {
  const it = item(slot.code);
  const type = it?.type ?? "";
  const candidates = SLOTS_FOR_TYPE[type];
  // Prefer the first empty matching slot; otherwise the first (which replaces).
  const equipSlot = candidates ? (candidates.find((s) => slotCode(ch, s) === "") ?? candidates[0]) : undefined;
  const equipQty = type === "utility" ? Math.min(slot.quantity, 100) : 1;
  // Recyclable at the workshop the character is standing on (same gate as the
  // workshop panel's Recycle: crafted here + the item type allows it).
  const canRecycle = !!onWorkshop && it?.craft?.skill === onWorkshop && it.recyclable !== false;

  return (
    <div class="inv-row" title={it?.name || slot.code}>
      <img class="info-hover" src={asset("items", slot.code)} alt="" onError={assetFallback("items", slot.code)} {...itemHover(slot.code)} />
      <span class="inv-name info-hover" {...itemHover(slot.code)}>{it?.name || slot.code}</span>
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
        {canRecycle && (
          <button
            class="cat-btn"
            disabled={ctl.disabled}
            title={`Recycle this stack here — returns a share of the materials`}
            onClick={() => ctl.run(() => actions.recycle(ch.name, slot.code, slot.quantity))}
          >
            ♻ Recycle
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

