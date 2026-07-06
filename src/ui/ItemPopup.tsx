import { itemPopup } from "../state/store";
import { effect, item, itemName, itemSources, itemUses } from "../catalog";
import { asset, assetFallback, titleCase } from "../lib/util";

/**
 * THE hover contract for anything that represents an item, anywhere in the UI:
 * spread `{...itemHover(code)}` on the element (usually together with the
 * `info-hover` class for the cursor hint) and the shared floating item card
 * follows the cursor and hides on leave. A code that isn't a real item (or no
 * code at all) attaches nothing, so it's safe on mixed content like task tags.
 */
export function itemHover(code: string | null | undefined): {
  onMouseMove?: (e: MouseEvent) => void;
  onMouseLeave?: () => void;
} {
  if (!code || !item(code)) return {};
  return {
    onMouseMove: (e: MouseEvent) => (itemPopup.value = { code, x: e.clientX, y: e.clientY }),
    onMouseLeave: () => (itemPopup.value = null),
  };
}

// A hovered row can unmount out from under the cursor (e.g. withdrawing a bank
// stack's last unit) and its mouseleave never fires — hide the popup on any
// press so it can't linger. The card itself is pointer-transparent.
if (typeof window !== "undefined") {
  window.addEventListener("mousedown", () => {
    if (itemPopup.value) itemPopup.value = null;
  });
}

const SOURCE_ICON: Record<string, string> = { gather: "⛏", drop: "⚔", craft: "🛠️", npc: "🛒" };

const opLabel: Record<string, string> = { gt: ">", lt: "<", ge: "≥", le: "≤", ne: "≠", eq: "" };

/**
 * Floating, pointer-transparent card describing one item (its level, type,
 * description and stat effects). Driven by the `itemPopup` signal: set it on
 * hover (e.g. a workshop recipe row) to show, clear it to hide. Mounted once at
 * the app root and `position: fixed` so it never clips inside a scroll panel.
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
  const price = (t: { buy: number | null; sell: number | null; currency: string }): string => {
    const cur = t.currency === "gold" ? "g" : ` ${itemName(t.currency)}`;
    const parts = [];
    if (t.buy != null) parts.push(`buy ${t.buy}${cur}`);
    if (t.sell != null) parts.push(`sell ${t.sell}${cur}`);
    return parts.join(" · ");
  };

  return (
    <div class="inspector item-popup" style={style}>
      <div class="insp-head">
        <img class="insp-icon" src={asset("items", it.code)} alt="" onError={assetFallback("items", it.code)} />
        <div class="insp-titles">
          <div class="insp-title">{it.name}</div>
          <div class="insp-sub">{sub}</div>
        </div>
      </div>

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
          {sources.slice(0, 6).map((s, i) => (
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
          {sources.length > 6 && <div class="insp-more">+{sources.length - 6} more</div>}
        </div>
      )}

      {uses.recipes.length > 0 && (
        <div class="insp-list">
          <div class="insp-list-head">Used in</div>
          {uses.recipes.slice(0, 6).map((r) => (
            <div key={r.code} class="ip-effect">
              <span class="ip-name">⚙ {r.name} · {titleCase(r.skill)} Lv {r.level}</span>
              <span class="ip-val">×{r.quantity}</span>
            </div>
          ))}
          {uses.recipes.length > 6 && <div class="insp-more">+{uses.recipes.length - 6} more</div>}
        </div>
      )}

      {(uses.trades.length > 0 || uses.currencyAt.length > 0) && (
        <div class="insp-list">
          <div class="insp-list-head">NPC trade</div>
          {uses.trades.slice(0, 4).map((t, i) => (
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
        </div>
      )}
    </div>
  );
}
