// Full items catalog — a right-hand panel (📦 topbar button) listing every item
// in the static catalog with search + type/level filtering. Hovering a row shows
// the shared ItemPopup, which carries the type-dependent detail: description,
// effects, recipe, where to get it (gather/drop/craft/NPC), where it's used
// (recipes, NPC buy/sell prices, currency uses).

import { useState } from "preact/hooks";
import { itemPopup, itemsCatalogOpen } from "../state/store";
import { catalog } from "../catalog";
import { asset, assetFallback, titleCase } from "../lib/util";
import type { Item } from "../types/catalog";

const PAGE = 120; // keep the DOM light — the full list is ~1000 rows

// The catalog is static — sort once (type, then level, then name) and cache.
let _sorted: Item[] | null = null;
function allItems(): Item[] {
  if (_sorted) return _sorted;
  try {
    _sorted = [...catalog().items.values()].sort(
      (a, b) => a.type.localeCompare(b.type) || a.level - b.level || a.name.localeCompare(b.name),
    );
  } catch {
    return [];
  }
  return _sorted;
}

export function ItemsCatalogPanel() {
  if (!itemsCatalogOpen.value) return null;
  return <ItemsCatalogBody />;
}

function ItemsCatalogBody() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [shown, setShown] = useState(PAGE);

  const items = allItems();
  const types = [...new Set(items.map((i) => i.type))].sort();
  const q = query.trim().toLowerCase();
  const filtered = items.filter(
    (it) => (!type || it.type === type) && (!q || `${it.name} ${it.code} ${it.subtype}`.toLowerCase().includes(q)),
  );
  const visible = filtered.slice(0, shown);

  const hideInfo = () => (itemPopup.value = null);

  return (
    <aside class="catalog-panel">
      <div class="cat-head">
        <span class="cat-icon emoji">📦</span>
        <div class="cat-titles">
          <div class="cat-title">Items</div>
          <div class="cat-sub">Full game catalog · hover for details</div>
        </div>
        <button class="cat-close" title="Close" onClick={() => (itemsCatalogOpen.value = false)}>
          ✕
        </button>
      </div>

      <div class="cat-body">
        <div class="recipe-filters">
          <input
            class="recipe-search"
            type="search"
            placeholder="Search items…"
            value={query}
            onInput={(e) => {
              setQuery((e.target as HTMLInputElement).value);
              setShown(PAGE);
            }}
          />
          <select
            class="cp-refine-select"
            value={type}
            onChange={(e) => {
              setType((e.target as HTMLSelectElement).value);
              setShown(PAGE);
            }}
          >
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </select>
        </div>
        <div class="cat-count">
          {filtered.length === items.length ? `${items.length} items` : `${filtered.length} of ${items.length} items`}
        </div>

        {filtered.length === 0 ? (
          <div class="cat-empty">No items match.</div>
        ) : (
          <div class="icat-list" onMouseLeave={hideInfo}>
            {visible.map((it) => (
              <ItemRow key={it.code} it={it} />
            ))}
            {filtered.length > shown && (
              <button class="cat-btn icat-more" onClick={() => setShown(shown + PAGE)}>
                Show {Math.min(PAGE, filtered.length - shown)} more…
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function ItemRow({ it }: { it: Item }) {
  // Same hover contract as the workshop recipe rows: follow the cursor, hide on leave.
  const showInfo = (e: MouseEvent) => (itemPopup.value = { code: it.code, x: e.clientX, y: e.clientY });
  const hideInfo = () => (itemPopup.value = null);

  return (
    <div class="icat-row info-hover" onMouseMove={showInfo} onMouseLeave={hideInfo}>
      <img src={asset("items", it.code)} alt="" onError={assetFallback("items", it.code)} />
      <span class="icat-name">{it.name}</span>
      <span class="icat-sub">
        {titleCase(it.subtype || it.type)}
        {it.level > 1 ? ` · Lv ${it.level}` : ""}
      </span>
    </div>
  );
}
