import { itemPopup } from "../state/store";
import { effect, item } from "../catalog";
import { asset, assetFallback, titleCase } from "../lib/util";

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
    </div>
  );
}
