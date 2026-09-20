import { itemPopup } from "../state/store";
import { effect, item, itemName, itemSources, itemUses } from "../catalog";
import { asset, assetFallback, titleCase } from "../lib/util";

/**
 * THE hover contract for anything that represents an item, anywhere in the UI:
 * spread `{...itemHover(code)}` on the element (usually together with the
 * `info-hover` class for the cursor hint) and the shared floating item card
 * follows the cursor and hides on leave. Clicking pins it so its controls can
 * be used. A code that isn't a real item (or no code at all) attaches nothing,
 * so it's safe on mixed content like task tags.
 */
export function itemHover(code: string | null | undefined): {
  onMouseMove?: (e: MouseEvent) => void;
  onMouseLeave?: () => void;
  onClick?: (e: MouseEvent) => void;
} {
  if (!code || !item(code)) return {};
  return {
    onMouseMove: (e: MouseEvent) => {
      if (!itemPopup.value?.pinned) {
        itemPopup.value = { code, x: e.clientX, y: e.clientY, pinned: false, expanded: false };
      }
    },
    onMouseLeave: clearItemHover,
    onClick: (e: MouseEvent) => {
      const current = itemPopup.value;
      if (current?.pinned && current.code === code) {
        itemPopup.value = null;
      } else {
        itemPopup.value = { code, x: e.clientX, y: e.clientY, pinned: true, expanded: false };
      }
    },
  };
}

export function clearItemHover() {
  if (!itemPopup.value?.pinned) itemPopup.value = null;
}

// A hovered row can unmount out from under the cursor and its mouseleave never
// fires. Outside presses dismiss the card, while presses on an item or a pinned
// card are handled by their own click controls.
if (typeof window !== "undefined") {
  window.addEventListener("mousedown", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".item-popup, .info-hover")) return;
    itemPopup.value = null;
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") itemPopup.value = null;
  });
}

const SOURCE_ICON: Record<string, string> = { gather: "⛏", drop: "⚔", craft: "🛠️", npc: "🛒" };

const opLabel: Record<string, string> = { gt: ">", lt: "<", ge: "≥", le: "≤", ne: "≠", eq: "" };

/**
 * Floating card describing one item (its level, type, description and stat
 * effects). Hover cards are pointer-transparent; a click pins the card and
 * enables its expansion and close controls. Mounted once at the app root and
 * `position: fixed` so it never clips inside a scroll panel.
 */
export function ItemPopup() {
  const p = itemPopup.value;
  if (!p) return null;
  const it = item(p.code);
  if (!it) return null;

  // Flip away from whichever viewport edge the cursor is nearer.
  const flipX = p.x > window.innerWidth / 2 ? "calc(-100% - 14px)" : "14px";
  const flipY = p.y > window.innerHeight / 2 ? "calc(-100% - 14px)" : "14px";
  const style = { left: `${p.x}px`, top: `${p.y}px`, transform: `translate(${flipX}, ${flipY})` };

  const sub = `Lv ${it.level} · ${titleCase(it.type)}${it.subtype && it.subtype !== it.type ? ` · ${titleCase(it.subtype)}` : ""}`;
  const effects = it.effects ?? [];
  const conditions = it.conditions ?? [];
  const sources = itemSources(it.code);
  const uses = itemUses(it.code);
  const sourceLimit = p.expanded ? sources.length : 6;
  const recipeLimit = p.expanded ? uses.recipes.length : 6;
  const tradeLimit = p.expanded ? uses.trades.length : 4;
  const hiddenCount = Math.max(0, sources.length - 6)
    + Math.max(0, uses.recipes.length - 6)
    + Math.max(0, uses.trades.length - 4);
  const expandControl = (remaining: number) => {
    if (remaining <= 0) return null;
    if (!p.pinned) return <div class="insp-more">+{remaining} more · click item to pin</div>;
    return (
      <button
        type="button"
        class="insp-more ip-more-button"
        onClick={() => (itemPopup.value = { ...p, expanded: true })}
      >
        +{remaining} more
      </button>
    );
  };
  const price = (t: { buy: number | null; sell: number | null; currency: string }): string => {
    const cur = t.currency === "gold" ? "g" : ` ${itemName(t.currency)}`;
    const parts = [];
    if (t.buy != null) parts.push(`buy ${t.buy}${cur}`);
    if (t.sell != null) parts.push(`sell ${t.sell}${cur}`);
    return parts.join(" · ");
  };

  return (
    <div class={`inspector item-popup${p.pinned ? " pinned" : ""}`} style={style}>
      <div class="insp-head">
        <img class="insp-icon" src={asset("items", it.code)} alt="" onError={assetFallback("items", it.code)} />
        <div class="insp-titles">
          <div class="insp-title">{it.name}</div>
          <div class="insp-sub">{sub}</div>
        </div>
        {p.pinned && (
          <button type="button" class="ip-close" title="Close item details" onClick={() => (itemPopup.value = null)}>
            ✕
          </button>
        )}
      </div>

      {p.pinned && <div class="ip-pinned-note">Pinned · press Esc or click outside to close</div>}

      {it.description && <p class="insp-desc">{it.description}</p>}

      {it.craft && (
        <div class="insp-list">
          <div class="insp-list-head">
            Recipe · {titleCase(it.craft.skill)} Lv {it.craft.level}
            {it.craft.quantity > 1 ? ` · makes ×${it.craft.quantity}` : ""}
          </div>
          {it.craft.items.map((ing) => (
            <div key={ing.code} class="ip-effect">
              <span class="ip-name">{itemName(ing.code)}</span>
              <span class="ip-val">×{ing.quantity}</span>
            </div>
          ))}
        </div>
      )}

      {effects.length > 0 && (
        <div class="insp-list">
          <div class="insp-list-head">Effects</div>
          {effects.map((e) => (
            <div key={e.code} class="ip-effect">
              <span class="ip-name">{effect(e.code)?.name ?? titleCase(e.code)}</span>
              <span class={`ip-val ${e.value > 0 ? "pos" : e.value < 0 ? "neg" : ""}`}>
                {e.value > 0 ? `+${e.value}` : e.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {conditions.length > 0 && (
        <div class="insp-list">
          <div class="insp-list-head">Requires</div>
          {conditions.map((c) => (
            <div key={c.code} class="ip-effect">
              <span class="ip-name">{titleCase(c.code)}</span>
              <span class="ip-val">
                {opLabel[c.operator] ? `${opLabel[c.operator]} ` : ""}
                {c.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {sources.length > 0 && (
        <div class="insp-list">
          <div class="insp-list-head">Where to get</div>
          {sources.slice(0, sourceLimit).map((s, i) => (
            <div key={i} class="ip-effect">
              <span class="ip-name">
                {SOURCE_ICON[s.kind] ?? "•"} {s.label}
              </span>
              {s.x != null && (
                <span class="ip-val">
                  ({s.x}, {s.y})
                </span>
              )}
            </div>
          ))}
          {!p.expanded && expandControl(sources.length - 6)}
        </div>
      )}

      {uses.recipes.length > 0 && (
        <div class="insp-list">
          <div class="insp-list-head">Used in</div>
          {uses.recipes.slice(0, recipeLimit).map((r) => (
            <div key={r.code} class="ip-effect">
              <span class="ip-name">⚙ {r.name} · {titleCase(r.skill)} Lv {r.level}</span>
              <span class="ip-val">×{r.quantity}</span>
            </div>
          ))}
          {!p.expanded && expandControl(uses.recipes.length - 6)}
        </div>
      )}

      {(uses.trades.length > 0 || uses.currencyAt.length > 0) && (
        <div class="insp-list">
          <div class="insp-list-head">NPC trade</div>
          {uses.trades.slice(0, tradeLimit).map((t, i) => (
            <div key={i} class="ip-effect">
              <span class="ip-name">🛒 {t.npc}</span>
              <span class="ip-val">{price(t)}</span>
            </div>
          ))}
          {uses.currencyAt.map((c, i) => (
            <div key={`c${i}`} class="ip-effect">
              <span class="ip-name">🪙 currency at {c.npc}</span>
              <span class="ip-val">{c.offers} offer{c.offers === 1 ? "" : "s"}</span>
            </div>
          ))}
          {!p.expanded && expandControl(uses.trades.length - 4)}
        </div>
      )}

      {p.pinned && p.expanded && hiddenCount > 0 && (
        <button
          type="button"
          class="insp-more ip-more-button ip-collapse-button"
          onClick={() => (itemPopup.value = { ...p, expanded: false })}
        >
          Show fewer
        </button>
      )}
    </div>
  );
}
