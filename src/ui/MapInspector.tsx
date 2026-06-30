import type { ComponentChildren } from "preact";
import { mapHover } from "../state/store";
import { item, monster, npc, resource } from "../catalog";
import { asset, assetFallback, dropChance, titleCase } from "../lib/util";
import type { AssetKind } from "../lib/util";
import type { DropRate, GameMap, MonsterEffect } from "../types/catalog";

const ELEMENTS = ["fire", "earth", "water", "air"] as const;

/**
 * Hover inspector overlaid on the map. Reads the local catalog to show useful,
 * content-specific detail for whatever sits on the hovered tile — monster stats
 * & drops, what a resource yields, an NPC's trades, or what a building does.
 */
export function MapInspector() {
  const h = mapHover.value;
  if (!h) return null;

  const tx = h.px > h.boxW / 2 ? "calc(-100% - 14px)" : "14px";
  const ty = h.py > h.boxH / 2 ? "calc(-100% - 14px)" : "14px";
  const style = { left: `${h.px}px`, top: `${h.py}px`, transform: `translate(${tx}, ${ty})` };

  return (
    <div class="inspector" style={style}>
      {renderContent(h.tile)}
    </div>
  );
}

function renderContent(tile: GameMap) {
  const c = tile.interactions.content;
  if (!c) return null;
  const coords = `(${tile.x}, ${tile.y})`;

  switch (c.type) {
    case "monster":
    case "raid": {
      const m = monster(c.code);
      const isRaid = c.type === "raid";
      const kind = isRaid ? "Raid boss" : m && m.type !== "normal" ? titleCase(m.type) : "Monster";
      const title = m ? `${m.name} (Lv. ${m.level})` : titleCase(c.code);
      const mr = m as unknown as Record<string, number>;
      const atk = m ? ELEMENTS.map((e) => [e, mr[`attack_${e}`]] as [string, number]).filter(([, v]) => v > 0) : [];
      const res = m ? ELEMENTS.map((e) => [e, mr[`res_${e}`]] as [string, number]).filter(([, v]) => v !== 0) : [];
      return (
        <Frame iconKind="monsters" iconCode={c.code} title={title} sub={`${kind} · ${coords}`}>
          {m && (
            <>
              <div class="insp-stats">
                <Stat label="HP" value={m.hp.toLocaleString()} />
                <Stat label="Init" value={`${m.initiative}`} />
                <Stat label="Crit" value={`${m.critical_strike}%`} />
                {(m.min_gold > 0 || m.max_gold > 0) && (
                  <Stat label="Gold" value={m.min_gold === m.max_gold ? `${m.max_gold}` : `${m.min_gold}–${m.max_gold}`} />
                )}
              </div>
              <Chips label="Attack" entries={atk} />
              <Chips label="Resist" entries={res} />
              <Effects effects={m.effects} />
              <Drops drops={m.drops} />
            </>
          )}
        </Frame>
      );
    }

    case "resource": {
      const r = resource(c.code);
      const title = r ? `${r.name} (Lv. ${r.level})` : titleCase(c.code);
      const sub = r ? `${titleCase(r.skill)} · ${coords}` : `Resource · ${coords}`;
      return (
        <Frame iconKind="resources" iconCode={c.code} title={title} sub={sub}>
          {r && <Drops drops={r.drops} label="Yields" />}
        </Frame>
      );
    }

    case "npc": {
      const n = npc(c.code);
      const trades = (n?.items ?? []).slice(0, 6);
      return (
        <Frame iconKind="npcs" iconCode={c.code} title={n?.name ?? titleCase(c.code)} sub={`${titleCase(n?.type ?? "npc")} · ${coords}`}>
          {n?.description && <p class="insp-desc">{n.description}</p>}
          {trades.length > 0 && (
            <div class="insp-list">
              <div class="insp-list-head">Trades</div>
              {trades.map((t) => (
                <div key={t.code} class="insp-row">
                  <img src={asset("items", t.code)} alt="" onError={assetFallback("items", t.code)} />
                  <span class="insp-row-name">{item(t.code)?.name ?? titleCase(t.code)}</span>
                  <span class="insp-row-meta">
                    {t.buy_price != null && <>buy {t.buy_price} {titleCase(t.currency)}</>}
                    {t.sell_price != null && <> · sell {t.sell_price}</>}
                  </span>
                </div>
              ))}
              {(n?.items?.length ?? 0) > trades.length && (
                <div class="insp-more">+{(n!.items!.length - trades.length)} more</div>
              )}
            </div>
          )}
        </Frame>
      );
    }

    case "workshop":
      return <Frame emoji="🛠️" title={`${titleCase(c.code)} Workshop`} sub={`Craft & recycle · ${coords}`} />;
    case "bank":
      return <Frame emoji="🏦" title="Bank" sub={`Store items & gold · ${coords}`} />;
    case "grand_exchange":
      return <Frame emoji="💱" title="Grand Exchange" sub={`Buy & sell with players · ${coords}`} />;
    case "tasks_master":
      return <Frame emoji="📋" title="Tasks Master" sub={`${titleCase(c.code)} tasks · ${coords}`} />;
    default:
      return <Frame emoji="📍" title={titleCase(c.code)} sub={`${titleCase(c.type)} · ${coords}`} />;
  }
}

function Frame({
  iconKind,
  iconCode,
  emoji,
  title,
  sub,
  children,
}: {
  iconKind?: AssetKind;
  iconCode?: string;
  emoji?: string;
  title: string;
  sub: string;
  children?: ComponentChildren;
}) {
  return (
    <>
      <div class="insp-head">
        {iconKind && iconCode ? (
          <img class="insp-icon" src={asset(iconKind, iconCode)} alt="" onError={assetFallback(iconKind, iconCode)} />
        ) : (
          <span class="insp-icon insp-emoji">{emoji}</span>
        )}
        <div class="insp-titles">
          <div class="insp-title">{title}</div>
          <div class="insp-sub">{sub}</div>
        </div>
      </div>
      {children}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div class="insp-stat">
      <span class="insp-stat-label">{label}</span>
      <b>{value}</b>
    </div>
  );
}

function Chips({ label, entries }: { label: string; entries: [string, number][] }) {
  if (entries.length === 0) return null;
  return (
    <div class="insp-chips">
      <span class="insp-chips-label">{label}</span>
      {entries.map(([el, v]) => (
        <span key={el} class={`insp-chip el-${el}`}>
          {titleCase(el)} {v > 0 ? `+${v}` : v}
        </span>
      ))}
    </div>
  );
}

function Drops({ drops, label = "Drops" }: { drops: DropRate[]; label?: string }) {
  if (!drops || drops.length === 0) return null;
  const shown = drops.slice(0, 6);
  return (
    <div class="insp-list">
      <div class="insp-list-head">{label}</div>
      {shown.map((d) => {
        const qty = d.max_quantity > 1 ? `×${d.min_quantity}–${d.max_quantity}` : "";
        return (
          <div key={d.code} class="insp-row">
            <img src={asset("items", d.code)} alt="" onError={assetFallback("items", d.code)} />
            <span class="insp-row-name">{item(d.code)?.name ?? titleCase(d.code)}</span>
            <span class="insp-row-meta">
              {qty && <span class="insp-qty">{qty}</span>}
              {dropChance(d.rate)}
            </span>
          </div>
        );
      })}
      {drops.length > shown.length && <div class="insp-more">+{drops.length - shown.length} more</div>}
    </div>
  );
}

function Effects({ effects }: { effects: MonsterEffect[] }) {
  if (!effects || effects.length === 0) return null;
  return (
    <div class="insp-list">
      <div class="insp-list-head">Special</div>
      {effects.map((e) => (
        <div key={e.code} class="insp-effect">
          <span class="insp-effect-name">{titleCase(e.code)}</span>
          {e.description && <span class="insp-effect-desc">{e.description}</span>}
        </div>
      ))}
    </div>
  );
}
