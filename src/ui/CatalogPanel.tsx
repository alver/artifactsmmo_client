import { useEffect, useState } from "preact/hooks";
import { achievements, achievementsLoading, bankDetails, bankItems, characters, panelTarget } from "../state/store";
import { itemHover } from "./ItemPopup";
import type { PanelTarget } from "../state/store";
import { catalog, itemName, npc, tileAt } from "../catalog";
import { tileGate } from "../state/access";
import { asset, assetFallback, titleCase } from "../lib/util";
import { loadAchievements } from "../state/sync";
import { CooldownRing } from "./Cooldown";
import type { Character } from "../types/api";
import type { Item, Npc } from "../types/catalog";

const layerOf = (c: Character): string => (c as { layer?: string }).layer ?? "overworld";

// Recipes are static — derive once per skill and cache.
const recipesBySkill = new Map<string, Item[]>();
function workshopRecipes(skill: string): Item[] {
  let list = recipesBySkill.get(skill);
  if (!list) {
    list = [...catalog().items.values()]
      .filter((it) => it.craft?.skill === skill)
      .sort((a, b) => a.craft!.level - b.craft!.level || a.name.localeCompare(b.name));
    recipesBySkill.set(skill, list);
  }
  return list;
}

/**
 * The Map tab's drawer: what a workshop, NPC, bank, tasks master or altar tile holds — its recipes, trades, the bank's
 * stock — and who stands on it. Read-only since task 028: the planner plays every character, nothing here acts.
 */
export function CatalogPanel() {
  const target = panelTarget.value;
  if (!target) return null;
  // Delegate to a child so the hooks below only run when a tile is selected —
  // CatalogPanel itself stays hook-free (it's always mounted, returns null when idle).
  return <CatalogBody target={target} />;
}

function CatalogBody({ target }: { target: PanelTarget }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") panelTarget.value = null;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const present = Object.values(characters.value).filter((c) => c.x === target.x && c.y === target.y && layerOf(c) === target.layer);

  // Access-gated tile (e.g. the Tasks Trader behind the Tasks Farmer achievement).
  const gate = tileGate(tileAt(target.x, target.y, target.layer));
  useEffect(() => {
    // A gated tile is the one place unlocked-status matters — fetch achievements
    // once (on-demand read) so the lock line can say unlocked vs. locked.
    if (gate && achievements.value === null && !achievementsLoading.peek()) void loadAchievements();
  }, [target.x, target.y, target.layer]);

  const isWorkshop = target.type === "workshop";
  const isBank = target.type === "bank";
  const isTasks = target.type === "tasks_master";
  const isAltar = target.type === "seasonal_altar";
  const n = isWorkshop || isBank || isTasks || isAltar ? undefined : npc(target.code);
  const title = isWorkshop ? `${titleCase(target.code)} Workshop` : isBank ? "Bank" : isTasks ? "Tasks Master" : isAltar ? "Seasonal Altar" : (n?.name ?? titleCase(target.code));
  const sub = isWorkshop ? "Recipes" : isBank ? "Account bank" : isTasks ? `${titleCase(target.code)} tasks` : isAltar ? "Daily offerings" : titleCase(n?.type ?? "NPC");

  return (
    <aside class="catalog-panel">
      <div class="cat-head">
        {isWorkshop || isBank || isTasks || isAltar ? (
          <span class="cat-icon emoji">{isWorkshop ? "🛠️" : isBank ? "🏦" : isAltar ? "🛐" : "📋"}</span>
        ) : (
          <img class="cat-icon" src={asset("npcs", target.code)} alt="" onError={assetFallback("npcs", target.code)} />
        )}
        <div class="cat-titles">
          <div class="cat-title">{title}</div>
          <div class="cat-sub">{sub} · ({target.x}, {target.y})</div>
        </div>
        <button class="cat-close" title="Close" onClick={() => (panelTarget.value = null)}>
          ✕
        </button>
      </div>

      <div class="cat-actor">
        {present.length ? present.map((c) => (
          <span key={c.name} class="cat-here">
            <CooldownRing ch={c}>
              <img src={asset("characters", c.skin || "men1")} alt="" onError={assetFallback("characters", c.skin || "men1")} />
            </CooldownRing>
            <b>{c.name}</b>
          </span>
        )) : <span class="muted">Nobody stands here.</span>}
      </div>

      {gate && (
        <div class={"cat-gate" + (gate.met === false ? " locked" : "")}>
          🔒 Requires {gate.label}
          {gate.met === false ? " — locked for this account" : gate.met === true ? " · unlocked ✓" : ""}
        </div>
      )}

      <div class="cat-body">
        {isWorkshop ? (
          <WorkshopList key={target.code} skill={target.code} />
        ) : isBank ? (
          <BankList />
        ) : isTasks ? (
          <TasksList present={present} />
        ) : isAltar ? (
          <div class="cat-empty">The planner makes each owned character's offerings once a day (its offering interrupt).</div>
        ) : (
          <NpcList npc={n} />
        )}
      </div>
    </aside>
  );
}

/** The account bank: slots, gold, every stack. */
function BankList() {
  const details = bankDetails.value;
  const items = [...bankItems.value].sort((a, b) => itemName(a.code).localeCompare(itemName(b.code)));
  return (
    <>
      <div class="cat-count">
        {items.length}
        {details ? `/${details.slots}` : ""} slots{details ? ` · 🪙 ${details.gold.toLocaleString()} · the next expansion ${details.next_expansion_cost.toLocaleString()}g` : ""}
      </div>
      {items.length === 0 ? (
        <div class="cat-empty">The bank is empty.</div>
      ) : (
        <div class="bank-list">
          {items.map((b) => (
            <div key={b.code} class="bank-row" title={itemName(b.code)}>
              <img class="info-hover" src={asset("items", b.code)} alt="" onError={assetFallback("items", b.code)} {...itemHover(b.code)} />
              <span class="bank-name info-hover" {...itemHover(b.code)}>{itemName(b.code)}</span>
              <span class="bank-qty">×{b.quantity.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function WorkshopList({ skill }: { skill: string }) {
  const recipes = workshopRecipes(skill);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  if (recipes.length === 0) return <div class="cat-empty">No recipes for this workshop.</div>;

  const types = [...new Set(recipes.map((r) => r.type))].sort();
  const q = query.trim().toLowerCase();
  const filtered = recipes.filter((it) => (!type || it.type === type) && (!q || `${it.name} ${it.code}`.toLowerCase().includes(q)));

  return (
    <>
      <div class="recipe-filters">
        <input class="recipe-search" type="search" placeholder="Search recipes…" value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
        {types.length > 1 && (
          <select class="cp-refine-select" value={type} onChange={(e) => setType((e.target as HTMLSelectElement).value)}>
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </select>
        )}
      </div>
      <div class="cat-count">{filtered.length === recipes.length ? `${recipes.length} recipes` : `${filtered.length} of ${recipes.length} recipes`}</div>
      {filtered.length === 0 ? (
        <div class="cat-empty">No recipes match.</div>
      ) : (
        <div class="recipe-list">
          {filtered.map((it) => (
            <div key={it.code} class="recipe-row">
              <img class="recipe-icon info-hover" src={asset("items", it.code)} alt="" onError={assetFallback("items", it.code)} {...itemHover(it.code)} />
              <div class="recipe-main">
                <div class="recipe-name info-hover" {...itemHover(it.code)}>{it.name}</div>
                <div class="recipe-level">
                  {titleCase(it.craft!.skill)} Lv {it.craft!.level}
                  {it.craft!.quantity > 1 ? ` · makes ×${it.craft!.quantity}` : ""}
                </div>
                <div class="recipe-ings">
                  {it.craft!.items.map((ing) => (
                    <span key={ing.code} class="recipe-pill info-hover" {...itemHover(ing.code)}>
                      {itemName(ing.code)}: {ing.quantity}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function NpcList({ npc: n }: { npc?: Npc }) {
  const trades = n?.items ?? [];
  const cur = (c: string): string => (c === "gold" ? "gold" : itemName(c));
  return (
    <>
      {n?.description && <p class="cat-desc">{n.description}</p>}
      {trades.length === 0 ? (
        <div class="cat-empty">This NPC has no listed trades.</div>
      ) : (
        <>
          <div class="cat-count">{trades.length} offers</div>
          <div class="npc-list">
            {trades.map((t) => (
              <div key={`${t.code}:${t.currency}`} class="cat-item">
                <div class="cat-item-head info-hover" {...itemHover(t.code)}>
                  <img src={asset("items", t.code)} alt="" onError={assetFallback("items", t.code)} />
                  <div class="cat-item-id">
                    <span class="cat-item-name">{itemName(t.code)}</span>
                    <span class="cat-item-sub">
                      {t.buy_price != null ? `buy ${t.buy_price} ${cur(t.currency)}` : ""}
                      {t.buy_price != null && t.sell_price != null ? " · " : ""}
                      {t.sell_price != null ? `sell ${t.sell_price} ${cur(t.currency)}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/** The tasks master: the tasks of whoever stands here (the planner turns in and takes tasks by itself, task 027d). */
function TasksList({ present }: { present: Character[] }) {
  if (!present.length) return <div class="cat-empty">The planner's fighters visit the master by themselves (a task visit).</div>;
  return (
    <>
      {present.map((c) => (
        <div key={c.name} class="task-current">
          <div class="task-name">
            <b>{c.name}</b>: {c.task ? <>{titleCase(c.task)} <span class="muted">· {titleCase(c.task_type)} · {c.task_progress}/{c.task_total}</span></> : <span class="muted">no task</span>}
          </div>
        </div>
      ))}
    </>
  );
}
