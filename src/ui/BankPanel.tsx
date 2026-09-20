// Read-only account bank drawer. Uses the same catalog drawer, item artwork,
// filters, and hover inspector as the rest of the client.

import { useEffect, useState } from "preact/hooks";
import { bankDetails, bankItems, bankOpen } from "../state/store";
import { item, itemName } from "../catalog";
import { asset, assetFallback, titleCase } from "../lib/util";
import { clearItemHover, itemHover } from "./ItemPopup";

type SortMode = "quantity" | "name" | "type";

export function BankPanel() {
  if (!bankOpen.value) return null;
  return <BankBody />;
}

function BankBody() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState<SortMode>("quantity");
  const details = bankDetails.value;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") bankOpen.value = false;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const quantities = new Map<string, number>();
  for (const entry of bankItems.value) {
    quantities.set(entry.code, (quantities.get(entry.code) ?? 0) + entry.quantity);
  }
  const rows = [...quantities].map(([code, quantity]) => ({
    code,
    quantity,
    item: item(code),
  }));
  const types = [...new Set(rows.map((row) => row.item?.type ?? "unknown"))].sort();
  const q = query.trim().toLowerCase();
  const filtered = rows
    .filter((row) => {
      const rowType = row.item?.type ?? "unknown";
      const searchable = `${row.item?.name ?? row.code} ${row.code} ${row.item?.subtype ?? ""}`.toLowerCase();
      return (!type || rowType === type) && (!q || searchable.includes(q));
    })
    .sort((a, b) => {
      if (sort === "quantity") {
        return b.quantity - a.quantity || itemName(a.code).localeCompare(itemName(b.code));
      }
      if (sort === "type") {
        return (
          (a.item?.type ?? "unknown").localeCompare(b.item?.type ?? "unknown") ||
          itemName(a.code).localeCompare(itemName(b.code))
        );
      }
      return itemName(a.code).localeCompare(itemName(b.code));
    });
  const totalItems = rows.reduce((sum, row) => sum + row.quantity, 0);
  const usedSlots = rows.length;
  const slotPercent = details?.slots ? Math.min((usedSlots / details.slots) * 100, 100) : 0;

  return (
    <aside class="catalog-panel bank-panel">
      <div class="cat-head">
        <span class="cat-icon emoji">🏦</span>
        <div class="cat-titles">
          <div class="cat-title">Account Bank</div>
          <div class="cat-sub">Inventory overview · hover or click for item details</div>
        </div>
        <button class="cat-close" title="Close" onClick={() => (bankOpen.value = false)}>
          ✕
        </button>
      </div>

      <div class="cat-body">
        <div class="bank-summary">
          <BankStat label="Gold" value={details ? `🪙 ${details.gold.toLocaleString()}` : "—"} />
          <BankStat label="Slots" value={details ? `${usedSlots}/${details.slots}` : String(usedSlots)} />
          <BankStat label="Items" value={totalItems.toLocaleString()} />
          <BankStat label="Expansions" value={details ? details.expansions.toLocaleString() : "—"} />
        </div>

        {details && (
          <div class="bank-capacity" title={`${slotPercent.toFixed(1)}% of bank slots occupied`}>
            <div class="bank-capacity-fill" style={{ width: `${slotPercent}%` }} />
          </div>
        )}
        {details && details.next_expansion_cost > 0 && (
          <div class="cat-count">Next expansion · 🪙 {details.next_expansion_cost.toLocaleString()}</div>
        )}

        <div class="recipe-filters bank-filters">
          <input
            class="recipe-search"
            type="search"
            placeholder="Search bank…"
            value={query}
            onInput={(event) => setQuery((event.target as HTMLInputElement).value)}
          />
          <select class="cp-refine-select" value={type} onChange={(event) => setType((event.target as HTMLSelectElement).value)}>
            <option value="">All types</option>
            {types.map((value) => (
              <option key={value} value={value}>{titleCase(value)}</option>
            ))}
          </select>
          <select class="cp-refine-select" value={sort} onChange={(event) => setSort((event.target as HTMLSelectElement).value as SortMode)}>
            <option value="quantity">Most quantity</option>
            <option value="name">Name</option>
            <option value="type">Type</option>
          </select>
        </div>
        <div class="cat-count">
          {filtered.length === rows.length ? `${rows.length} occupied slots` : `${filtered.length} of ${rows.length} occupied slots`}
        </div>

        {filtered.length === 0 ? (
          <div class="cat-empty">{rows.length ? "No bank items match." : "The bank is empty."}</div>
        ) : (
          <div class="bank-view-grid" onMouseLeave={clearItemHover}>
            {filtered.map((row) => (
              <div key={row.code} class="icat-row bank-view-row info-hover" {...itemHover(row.code)}>
                <img src={asset("items", row.code)} alt="" onError={assetFallback("items", row.code)} />
                <span class="icat-name">{row.item?.name ?? row.code}</span>
                <span class="bank-view-meta">
                  <span class="bank-view-qty">×{row.quantity.toLocaleString()}</span>
                  <span class="icat-sub">{titleCase(row.item?.subtype || row.item?.type || "unknown")}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function BankStat({ label, value }: { label: string; value: string }) {
  return (
    <div class="bank-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
