import { MAX_PINS, PIN_SKILLS, characterList, characters, focusCharacter, selectedCharacter, skillKey, skillPins, togglePin } from "../state/store";
import { saveState } from "../state/persist";
import { item, monster, npc, resource } from "../catalog";
import { liveTileAt } from "../state/events";
import { asset, assetFallback, pct, slotLabel, titleCase } from "../lib/util";
import { GearSlots } from "./GearSlots";
import { ActionBar } from "./ActionBar";
import { CombatForecast } from "./CombatForecast";
import { QueueSection } from "./QueuePanel";
import { CooldownRing } from "./Cooldown";
import { Bar } from "./DataTable";
import { itemHover } from "./ItemPopup";
import { useActionRunner } from "./useAction";
import type { ActionRunner } from "./useAction";
import * as actions from "../api/actions";
import { slotCode, SLOTS_FOR_TYPE } from "../types/api";
import type { Character, InventorySlot } from "../types/api";
import type { GameMap } from "../types/catalog";

const layerOf = (c: Character): string => (c as { layer?: string }).layer ?? "overworld";

/**
 * The Skills table. Pin a row as one of the character's main skills
 * (📌1/📌2 — up to MAX_PINS, one more replaces the oldest; click again to
 * unpin). Pins persist across reloads and feed the queue's "📌 Train pins"
 * loop and the hive's crafter routing.
 */
function SkillsSection({ ch, stat }: { ch: Character; stat: Record<string, number> }) {
  const pins = skillPins.value[ch.name] ?? [];
  return (
    <div class="cp-skills">
      {PIN_SKILLS.map(([key, label]) => {
        const idx = pins.indexOf(key);
        const xp = stat[skillKey(key, "xp")] ?? 0;
        const max = stat[skillKey(key, "max_xp")] ?? 0;
        return (
          <div key={key} class={"cp-skill" + (idx >= 0 ? " cp-skill-focus" : "")}>
            <span class="cp-skill-name">{label}</span>
            <b class="cp-skill-lv">{stat[skillKey(key, "level")]}</b>
            <Bar pct={pct(xp, max)} />
            <span class="cp-skill-xp">
              {xp}/{max}
            </span>
            <button
              class={"cat-btn" + (idx >= 0 ? " buy" : "")}
              title={idx >= 0 ? "Unpin" : `Pin as a main skill (up to ${MAX_PINS}; one more replaces the oldest)`}
              onClick={() => { togglePin(ch.name, key); saveState(); }}
            >
              {idx >= 0 ? `📌${idx + 1}` : "Pin"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Human name of a tile's content (also used by the Fleet table's location column). */
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

/** What matters about a tile: its monster/resource/building, not its biome. */
export function whereLabel(tile: GameMap | undefined): string {
  const c = tile?.interactions.content;
  if (!c) return tile?.name ?? "";
  if (c.type === "tasks_master") return "Tasks Master";
  return contentLabel(c.type, c.code) + (c.type === "workshop" ? " workshop" : "");
}

/**
 * The Character tab: full state and control of the selected character. A
 * switcher row on top, a summary strip, then the Queue (wide, left) beside
 * equipment / skills / inventory tables. Selection comes from the Fleet table
 * or the switcher.
 */
export function CharacterPanel() {
  const name = selectedCharacter.value;
  const ch = name ? characters.value[name] : undefined;
  if (!ch) return <div class="ws-empty muted">Pick a character on the Fleet tab.</div>;

  // Most combat/skill fields are flat numeric props read by computed key.
  const stat = ch as unknown as Record<string, number>;
  const layer = layerOf(ch);
  const tile = liveTileAt(ch.x, ch.y, layer); // event override first — event tiles enable actions too
  const content = tile?.interactions.content;
  const onBank = content?.type === "bank";
  const onWorkshop = content?.type === "workshop" ? content.code : undefined;
  const inv = (ch.inventory || []).filter((s) => s.code && s.quantity > 0);
  const invQty = inv.reduce((s, it) => s + it.quantity, 0);

  return (
    <div class="ws-body">
      <nav class="char-switch" aria-label="Characters">
        {characterList().map((c) => (
          <button key={c.name} class={c.name === ch.name ? "active" : ""} onClick={() => focusCharacter(c.name)}>
            {c.name}
          </button>
        ))}
      </nav>

      <section class="char-head">
        <CooldownRing ch={ch}>
          <img class="char-avatar" src={asset("characters", ch.skin || "men1")} alt="" onError={assetFallback("characters", ch.skin || "men1")} />
        </CooldownRing>
        <div>
          <h2 class="char-name">{ch.name}</h2>
          <div class="muted">
            Level {ch.level} · {ch.xp}/{ch.max_xp} xp
          </div>
        </div>
        <dl class="char-facts">
          <div><dt>HP</dt><dd>{ch.hp}/{ch.max_hp}</dd></div>
          <div><dt>Where</dt><dd>{whereLabel(tile)} ({ch.x}, {ch.y})</dd></div>
          <div><dt>Task</dt><dd>{ch.task ? `${contentLabel(ch.task_type === "monsters" ? "monster" : "item", ch.task)} ${ch.task_progress}/${ch.task_total}` : "none"}</dd></div>
          <div><dt>Gold</dt><dd class="gold">{ch.gold.toLocaleString()}</dd></div>
        </dl>
        <ActionBar ch={ch} />
      </section>

      <div class="ws-grid">
        <div class="ws-col ws-col-control">
          <section class="ws-card">
            <h3>Queue</h3>
            <QueueSection ch={ch} />
          </section>
          {content?.type === "monster" && (
            <section class="ws-card">
              <h3>Forecast</h3>
              <CombatForecast ch={ch} monsterCode={content.code} />
            </section>
          )}
        </div>

        <div class="ws-col">
          <section class="ws-card">
            <h3>Equipment</h3>
            <GearSlots ch={ch} />
          </section>
          <section class="ws-card">
            <h3>Skills</h3>
            <SkillsSection ch={ch} stat={stat} />
          </section>
          <section class="ws-card">
            <h3>
              Inventory · {invQty}/{ch.inventory_max_items}
            </h3>
            <InventorySection ch={ch} onBank={onBank} onWorkshop={onWorkshop} />
          </section>
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

