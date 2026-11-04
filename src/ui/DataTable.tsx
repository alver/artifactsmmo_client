// The one table every list tab uses (Fleet, Bank, Crafting, Shops, Monsters):
// CSS-grid rows, click a sortable header to sort (click again to flip), an
// optional search box, and an optional per-row detail line under a row.

import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";

export interface Col<T> {
  label: ComponentChildren;
  /** grid track, e.g. "80px" or "minmax(200px, 2fr)" */
  width: string;
  cell: (r: T) => ComponentChildren;
  /** sort key — the header is clickable only when given */
  sort?: (r: T) => number | string;
  align?: "right" | "center";
}

export function DataTable<T>({
  rows,
  cols,
  rowKey,
  search,
  initialSort,
  toolbar,
  detail,
  pageSize,
  empty = "Nothing to show.",
}: {
  rows: T[];
  cols: Col<T>[];
  rowKey: (r: T) => string;
  /** text a row matches the search box against; no box when omitted */
  search?: (r: T) => string;
  initialSort?: { col: number; dir: 1 | -1 };
  /** extra filter controls rendered next to the search box */
  toolbar?: ComponentChildren;
  /** full-width content under a row (e.g. an inline form); null = none */
  detail?: (r: T) => ComponentChildren | null;
  /** render this many rows, then a "show more" button — keeps big catalogs' DOM light */
  pageSize?: number;
  empty?: string;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState(initialSort ?? null);
  const [limit, setLimit] = useState(pageSize ?? Infinity);

  const needle = q.trim().toLowerCase();
  let shown = needle && search ? rows.filter((r) => search(r).toLowerCase().includes(needle)) : rows;
  const key = sort && cols[sort.col]?.sort;
  if (sort && key) {
    shown = [...shown].sort((a, b) => {
      const x = key(a);
      const y = key(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }
  const grid = { gridTemplateColumns: cols.map((c) => c.width).join(" ") };
  // Sum of the tracks' minimum px (+ gaps/padding): below it the box scrolls sideways, above it the fr tracks share the room.
  const minWidth = cols.reduce((s, c) => s + (parseInt(c.width.replace(/^minmax\(/, ""), 10) || 0), 0) + 12 * (cols.length - 1) + 16;
  const align = (c: Col<T>) => (c.align ? `dt-${c.align}` : undefined);

  return (
    <div class="dt">
      {(search || toolbar) && (
        <div class="dt-tools">
          {search && (
            <input class="dt-search" type="search" placeholder="Search…" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
          )}
          {toolbar}
          <span class="dt-count muted">{shown.length === rows.length ? `${rows.length} rows` : `${shown.length} of ${rows.length}`}</span>
        </div>
      )}
      <div class="dt-scroll">
        <div class="dt-table" role="table" style={{ minWidth }}>
          <div class="dt-row dt-head" role="row" style={grid}>
            {cols.map((c, i) => (
              <div key={i} role="columnheader" class={align(c)}>
                {c.sort ? (
                  <button
                    class={"dt-sort" + (sort?.col === i ? " on" : "")}
                    onClick={() => setSort(sort?.col === i ? { col: i, dir: sort.dir === 1 ? -1 : 1 } : { col: i, dir: 1 })}
                  >
                    {c.label}
                    {sort?.col === i ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                  </button>
                ) : (
                  c.label
                )}
              </div>
            ))}
          </div>
          {shown.slice(0, limit).map((r) => {
            const more = detail?.(r);
            return (
              <div key={rowKey(r)} class="dt-group">
                <div class="dt-row" role="row" style={grid}>
                  {cols.map((c, i) => (
                    <div key={i} role="cell" class={align(c)}>
                      {c.cell(r)}
                    </div>
                  ))}
                </div>
                {more && <div class="dt-detail">{more}</div>}
              </div>
            );
          })}
          {shown.length === 0 && <div class="dt-empty muted">{empty}</div>}
          {shown.length > limit && (
            <button class="cat-btn dt-more" onClick={() => setLimit(limit + pageSize!)}>
              Show {Math.min(pageSize!, shown.length - limit)} more…
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Thin progress bar used in table cells. */
export function Bar({ pct, tone }: { pct: number; tone?: "warn" | "bad" }) {
  return (
    <span class={"dt-bar" + (tone ? ` ${tone}` : "")}>
      <span style={{ width: `${pct}%` }} />
    </span>
  );
}
