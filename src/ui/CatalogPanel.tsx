import { bankDetails, bankItems, characters, panelTarget, selectedCharacter } from "../state/store";
import { catalog, item, itemName, npc } from "../catalog";
import { asset, assetFallback, titleCase } from "../lib/util";
import type { Character } from "../types/api";
import type { Item, Npc } from "../types/catalog";

// Buttons are intentionally inert for now — the matching API actions exist
// (api/actions.ts: craft / npcBuy / npcSell) and will be wired up next.
const notYet = (e: Event) => e.stopPropagation();

const layerOf = (c: Character): string => (c as { layer?: string }).layer ?? "overworld";
const invQty = (c: Character, code: string): number =>
  (c.inventory || []).reduce((s, it) => s + (it.code === code ? it.quantity : 0), 0);
const skillLevel = (c: Character, skill: string): number =>
  (c as unknown as Record<string, number>)[`${skill}_level`] ?? 0;

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
 * Right-hand catalog panel. Opens when a workshop, NPC or bank tile is clicked
 * and shows what can be crafted / traded / stored there. Action buttons appear
 * only when one of your characters is standing on that tile, and are enabled only
 * when the action is actually doable (skill level + materials, or enough currency).
 */
export function CatalogPanel() {
  const target = panelTarget.value;
  if (!target) return null;

  // Character(s) standing on this exact tile — prefer the selected one as actor.
  const present = Object.values(characters.value).filter(
    (c) => c.x === target.x && c.y === target.y && layerOf(c) === target.layer,
  );
  const actor = present.find((c) => c.name === selectedCharacter.value) ?? present[0];

  const isWorkshop = target.type === "workshop";
  const isBank = target.type === "bank";
  const n = isWorkshop || isBank ? undefined : npc(target.code);
  const title = isWorkshop ? `${titleCase(target.code)} Workshop` : isBank ? "Bank" : (n?.name ?? titleCase(target.code));
  const sub = isWorkshop
    ? `Craft items · (${target.x}, ${target.y})`
    : isBank
      ? `Account bank · (${target.x}, ${target.y})`
      : `${titleCase(n?.type ?? "NPC")} · (${target.x}, ${target.y})`;
  const verb = isWorkshop ? "craft" : isBank ? "deposit or withdraw" : "trade";

  return (
    <aside class="catalog-panel">
      <div class="cat-head">
        {isWorkshop || isBank ? (
          <span class="cat-icon emoji">{isWorkshop ? "🛠️" : "🏦"}</span>
        ) : (
          <img class="cat-icon" src={asset("npcs", target.code)} alt="" onError={assetFallback("npcs", target.code)} />
        )}
        <div class="cat-titles">
          <div class="cat-title">{title}</div>
          <div class="cat-sub">{sub}</div>
        </div>
        <button class="cat-close" title="Close" onClick={() => (panelTarget.value = null)}>
          ✕
        </button>
      </div>

      <div class="cat-actor">
        {actor ? (
          <>
            <img src={asset("characters", actor.skin || "men1")} alt="" onError={assetFallback("characters", actor.skin || "men1")} />
            <span>
              <b>{actor.name}</b> is here{present.length > 1 ? ` (+${present.length - 1})` : ""}
            </span>
          </>
        ) : (
          <span class="muted">Move a character here to {verb}.</span>
        )}
      </div>

      <div class="cat-body">
        {isWorkshop ? <WorkshopList skill={target.code} actor={actor} /> : isBank ? <BankList /> : <NpcList npc={n} actor={actor} />}
      </div>
    </aside>
  );
}

/** Read-only view of the account bank: gold, slot usage, and every stored stack. */
function BankList() {
  const details = bankDetails.value;
  const items = [...bankItems.value].sort((a, b) => itemName(a.code).localeCompare(itemName(b.code)));
  return (
    <>
      <div class="cat-count">
        {items.length}
        {details ? `/${details.slots}` : ""} slots{details ? ` · 🪙 ${details.gold.toLocaleString()}` : ""}
      </div>
      {items.length === 0 ? (
        <div class="cat-empty">The bank is empty.</div>
      ) : (
        <div class="bank-list">
          {items.map((b) => (
            <div key={b.code} class="bank-row" title={itemName(b.code)}>
              <img src={asset("items", b.code)} alt="" onError={assetFallback("items", b.code)} />
              <span class="bank-name">{itemName(b.code)}</span>
              <span class="bank-qty">×{b.quantity.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function WorkshopList({ skill, actor }: { skill: string; actor?: Character }) {
  const recipes = workshopRecipes(skill);
  if (recipes.length === 0) return <div class="cat-empty">No recipes for this workshop.</div>;
  return (
    <>
      <div class="cat-count">{recipes.length} recipes</div>
      <div class="recipe-list">
        {recipes.map((it) => (
          <RecipeCard key={it.code} it={it} actor={actor} />
        ))}
      </div>
    </>
  );
}

function RecipeCard({ it, actor }: { it: Item; actor?: Character }) {
  const craft = it.craft!;
  const levelOk = actor ? skillLevel(actor, craft.skill) >= craft.level : false;
  const hasMats = actor ? craft.items.every((ing) => invQty(actor, ing.code) >= ing.quantity) : false;
  const canCraft = levelOk && hasMats;
  const reason = !actor
    ? ""
    : !levelOk
      ? `Requires ${titleCase(craft.skill)} Lv ${craft.level}`
      : !hasMats
        ? "Not enough materials"
        : `Craft with ${actor.name}`;

  return (
    <div class="recipe-row">
      <img class="recipe-icon" src={asset("items", it.code)} alt="" onError={assetFallback("items", it.code)} />
      <div class="recipe-main">
        <div class="recipe-name">{it.name}</div>
        <div class={`recipe-level${actor && !levelOk ? " short" : ""}`}>
          {titleCase(craft.skill)} Lv {craft.level}
          {actor && !levelOk ? ` · you ${skillLevel(actor, craft.skill)}` : ""}
          {craft.quantity > 1 ? ` · makes ×${craft.quantity}` : ""}
        </div>
        <div class="recipe-ings">
          {craft.items.map((ing) => {
            const need = ing.quantity;
            const have = actor ? invQty(actor, ing.code) : null;
            const short = have != null && have < need;
            return (
              <span key={ing.code} class={`recipe-pill${short ? " short" : ""}`}>
                {itemName(ing.code)}: {have != null ? `${have}/${need}` : need}
              </span>
            );
          })}
        </div>
      </div>
      {actor && (
        <button class="cat-btn craft" disabled={!canCraft} title={reason} onClick={notYet}>
          Craft
        </button>
      )}
    </div>
  );
}

function NpcList({ npc: n, actor }: { npc?: Npc; actor?: Character }) {
  const trades = n?.items ?? [];
  const curLabel = (c: string) => (c === "gold" ? "gold" : itemName(c));
  const hasCurrency = (c: string, price: number) =>
    actor != null && (c === "gold" ? actor.gold >= price : invQty(actor, c) >= price);

  return (
    <>
      {n?.description && <p class="cat-desc">{n.description}</p>}
      {trades.length === 0 ? (
        <div class="cat-empty">This NPC has no listed trades.</div>
      ) : (
        <>
          <div class="cat-count">{trades.length} offers</div>
          {trades.map((t) => {
            const canBuy = t.buy_price != null && hasCurrency(t.currency, t.buy_price);
            const canSell = t.sell_price != null && actor != null && invQty(actor, t.code) >= 1;
            const name = item(t.code)?.name ?? titleCase(t.code);
            return (
              <div key={`${t.code}:${t.currency}`} class="cat-item">
                <div class="cat-item-head">
                  <img src={asset("items", t.code)} alt="" onError={assetFallback("items", t.code)} />
                  <div class="cat-item-id">
                    <span class="cat-item-name">{name}</span>
                    <span class="cat-item-sub">paid in {titleCase(curLabel(t.currency))}</span>
                  </div>
                </div>
                {actor && (t.buy_price != null || t.sell_price != null) && (
                  <div class="cat-trade-actions">
                    {t.buy_price != null && (
                      <button
                        class="cat-btn buy"
                        disabled={!canBuy}
                        title={canBuy ? `Buy with ${actor.name}` : `Need ${t.buy_price} ${curLabel(t.currency)}`}
                        onClick={notYet}
                      >
                        Buy · {t.buy_price} {curLabel(t.currency)}
                      </button>
                    )}
                    {t.sell_price != null && (
                      <button
                        class="cat-btn sell"
                        disabled={!canSell}
                        title={canSell ? `Sell with ${actor.name}` : `No ${name} to sell`}
                        onClick={notYet}
                      >
                        Sell · {t.sell_price} {curLabel(t.currency)}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
