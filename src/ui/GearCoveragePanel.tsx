// The fleet gear-coverage drawer (🛡 topbar button): a slot-groups × characters
// matrix of what a virtual bank reset would dress everyone in RIGHT NOW, plus
// the shortage list ("have 3 / need 10") and the slots nobody can fill. Pure
// read-only view over the characters/bank signals — no fetching, no actions,
// and (per the 4 Hz rule) it never reads now.value.

import { Fragment } from "preact";
import { useMemo } from "preact/hooks";
import { bankItems, characterList, characters, gearCoverageOpen } from "../state/store";
import { fleetCoverage } from "../plan/coverage";
import type { SlotAssign } from "../plan/coverage";
import { itemName } from "../catalog";
import { asset, assetFallback, slotLabel } from "../lib/util";
import { itemHover } from "./ItemPopup";

/** Hook-free shell (the CatalogPanel trick): the body mounts fresh per open,
 *  so its hooks and signal subscriptions only exist while the drawer shows. */
export function GearCoveragePanel() {
  if (!gearCoverageOpen.value) return null;
  return <CoverageBody />;
}

function CoverageBody() {
  const close = () => (gearCoverageOpen.value = false);
  const chars = characterList();
  const bank = bankItems.value;
  // Cheap derivation (sorted owned pools, zero simulate() calls) — recomputing
  // on every bank/character echo while open is fine; no WeakMap memo needed.
  const cov = useMemo(() => fleetCoverage(chars, bank), [characters.value, bank]);

  const missing = cov.shortages.reduce((s, x) => s + (x.need - x.have), 0);
  const unfillByGroup = new Map<string, string[]>();
  for (const u of cov.unfillable) unfillByGroup.set(u.group, [...(unfillByGroup.get(u.group) ?? []), u.character]);

  return (
    <div class="ach-backdrop" onClick={close}>
      <aside class="ach-panel cov-panel" onClick={(e) => e.stopPropagation()}>
        <header class="ach-head">
          <div class="ach-titles">
            <div class="ach-title">🛡 Fleet Gear</div>
            <div class="ach-sub">
              {missing === 0 && cov.unfillable.length === 0
                ? "every slot covered by owned stock ✓"
                : `${missing} missing cop${missing === 1 ? "y" : "ies"} · ${cov.unfillable.length} unfillable slot${cov.unfillable.length === 1 ? "" : "s"}`}
            </div>
          </div>
          <button class="cat-close" title="Close" onClick={close}>
            ✕
          </button>
        </header>
        <div class="ach-body">
          <div class="cov-grid" style={{ gridTemplateColumns: `92px repeat(${chars.length}, 1fr)` }}>
            <div class="cov-head" />
            {chars.map((c) => (
              <div key={c.name} class="cov-head">
                {c.name} · {c.level}
              </div>
            ))}
            {cov.rows.map((row) => (
              <Fragment key={row.group}>
                <div class="cov-slot">
                  {slotLabel(row.group)}
                  {row.capacity > 1 ? ` ×${row.capacity}` : ""}
                </div>
                {chars.map((c) => (
                  <CovCell key={row.group + c.name} entries={row.cells[c.name] ?? []} />
                ))}
              </Fragment>
            ))}
          </div>

          <div class="cov-section-title">Missing copies</div>
          {cov.shortages.length === 0 && <div class="muted">Every owned item covers the whole party.</div>}
          {cov.shortages.map((s) => (
            <div key={s.group + s.code} class="cov-short-row">
              <img
                class="cov-icon info-hover"
                src={asset("items", s.code)}
                onError={assetFallback("items", s.code)}
                {...itemHover(s.code)}
              />
              <span class="cov-name">{itemName(s.code)}</span>
              <span class="cov-need">
                {s.have}/{s.need}
              </span>
              <span class="muted">
                {slotLabel(s.group)} — {s.wanters.join(", ")}
              </span>
            </div>
          ))}

          {unfillByGroup.size > 0 && (
            <>
              <div class="cov-section-title">Nobody can fill</div>
              {[...unfillByGroup].map(([group, names]) => (
                <div key={group} class="cov-short-row muted">
                  {slotLabel(group)}: {names.join(", ")}
                </div>
              ))}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function CovCell({ entries }: { entries: SlotAssign[] }) {
  const hasShort = entries.some((e) => e.short);
  return (
    <div class={"cov-cell" + (hasShort ? " has-short" : "")}>
      {entries.map((e, i) =>
        e.code ? (
          <div
            key={i}
            class={"cov-item" + (e.short ? " short" : "")}
            title={e.short && e.bestCode ? `best owned: ${itemName(e.bestCode)}` : undefined}
          >
            <img
              class="cov-icon info-hover"
              src={asset("items", e.code)}
              onError={assetFallback("items", e.code)}
              {...itemHover(e.code)}
            />
            <span class="cov-name">{itemName(e.code)}</span>
            <span class="cov-lv">{e.level}</span>
          </div>
        ) : (
          <div
            key={i}
            class={"cov-item empty" + (e.short ? " short" : "")}
            title={e.bestCode ? `missing: ${itemName(e.bestCode)}` : "nothing equippable owned"}
          >
            <span class="cov-name">—</span>
          </div>
        ),
      )}
    </div>
  );
}
