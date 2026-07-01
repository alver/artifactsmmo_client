import { useState } from "preact/hooks";
import { bankDetails, bankItems, characters, itemPopup, panelTarget, selectedCharacter } from "../state/store";
import type { PanelTarget } from "../state/store";
import { catalog, item, itemName, npc } from "../catalog";
import { asset, assetFallback, pct, titleCase } from "../lib/util";
import { reconcile } from "../state/sync";
import * as actions from "../api/actions";
import { useActionRunner } from "./useAction";
import type { ActionRunner } from "./useAction";
import type { Character } from "../types/api";
import type { Item, Npc } from "../types/catalog";

const layerOf = (c: Character): string => (c as { layer?: string }).layer ?? "overworld";
const invQty = (c: Character, code: string): number =>
  (c.inventory || []).reduce((s, it) => s + (it.code === code ? it.quantity : 0), 0);
const skillLevel = (c: Character, skill: string): number =>
  (c as unknown as Record<string, number>)[`${skill}_level`] ?? 0;

/** Small clamped number input shared by the quantity / gold fields below. */
function NumInput({ value, min, max, onChange }: { value: number; min: number; max?: number; onChange: (n: number) => void }) {
  return (
    <input
      class="cat-num"
      type="number"
      min={min}
      max={max}
      value={value}
      onClick={(e) => e.stopPropagation()}
      onInput={(e) => {
        const v = parseInt((e.target as HTMLInputElement).value, 10);
        onChange(Number.isNaN(v) ? min : v);
      }}
    />
  );
}

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
 * Right-hand catalog panel. Opens when a workshop, NPC, bank or tasks-master
 * tile is clicked and shows what can be crafted / traded / stored / tasked
 * there. Action buttons appear only when one of your characters is standing on
 * that tile, and are enabled only when the action is actually doable (skill
 * level + materials, enough currency, off cooldown).
 */
export function CatalogPanel() {
  const target = panelTarget.value;
  if (!target) return null;
  // Delegate to a child so the hooks below only run when a tile is selected —
  // CatalogPanel itself stays hook-free (it's always mounted, returns null when idle).
  return <CatalogBody target={target} />;
}

function CatalogBody({ target }: { target: PanelTarget }) {
  // Character(s) standing on this exact tile — prefer the selected one as actor.
  const present = Object.values(characters.value).filter(
    (c) => c.x === target.x && c.y === target.y && layerOf(c) === target.layer,
  );
  const actor = present.find((c) => c.name === selectedCharacter.value) ?? present[0];
  const ctl = useActionRunner(actor); // shared busy + cooldown gate for the whole panel

  const isWorkshop = target.type === "workshop";
  const isBank = target.type === "bank";
  const isTasks = target.type === "tasks_master";
  const n = isWorkshop || isBank || isTasks ? undefined : npc(target.code);
  const title = isWorkshop
    ? `${titleCase(target.code)} Workshop`
    : isBank
      ? "Bank"
      : isTasks
        ? "Tasks Master"
        : (n?.name ?? titleCase(target.code));
  const sub = isWorkshop
    ? `Craft items · (${target.x}, ${target.y})`
    : isBank
      ? `Account bank · (${target.x}, ${target.y})`
      : isTasks
        ? `${titleCase(target.code)} tasks · (${target.x}, ${target.y})`
        : `${titleCase(n?.type ?? "NPC")} · (${target.x}, ${target.y})`;
  const verb = isWorkshop ? "craft" : isBank ? "deposit or withdraw" : isTasks ? "manage tasks" : "trade";

  return (
    <aside class="catalog-panel">
      <div class="cat-head">
        {isWorkshop || isBank || isTasks ? (
          <span class="cat-icon emoji">{isWorkshop ? "🛠️" : isBank ? "🏦" : "📋"}</span>
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
            {ctl.cd > 0 && <span class="cooldown">⏳ {ctl.cd.toFixed(1)}s</span>}
          </>
        ) : (
          <span class="muted">Move a character here to {verb}.</span>
        )}
      </div>

      <div class="cat-body">
        {isWorkshop ? (
          <WorkshopList skill={target.code} actor={actor} ctl={ctl} />
        ) : isBank ? (
          <BankList actor={actor} ctl={ctl} />
        ) : isTasks ? (
          <TasksPanel actor={actor} ctl={ctl} />
        ) : (
          <NpcList npc={n} actor={actor} ctl={ctl} />
        )}
      </div>
    </aside>
  );
}

/** Interactive view of the account bank: gold transfers, expansion, withdrawals. */
function BankList({ actor, ctl }: { actor?: Character; ctl: ActionRunner }) {
  const details = bankDetails.value;
  const items = [...bankItems.value].sort((a, b) => itemName(a.code).localeCompare(itemName(b.code)));
  const [gold, setGold] = useState(0);

  const buyExpansion = () =>
    ctl.run(async () => {
      await actions.buyExpansion(actor!.name);
      await reconcile(); // buy_expansion echoes no bank details — refresh slots + cost once
    });

  return (
    <>
      <div class="cat-count">
        {items.length}
        {details ? `/${details.slots}` : ""} slots{details ? ` · 🪙 ${details.gold.toLocaleString()}` : ""}
      </div>

      {actor && details && (
        <div class="bank-gold">
          <NumInput value={gold} min={0} onChange={setGold} />
          <button
            class="cat-btn"
            disabled={ctl.disabled || gold < 1 || gold > actor.gold}
            title={gold > actor.gold ? "Not enough gold on hand" : `Deposit ${gold}g`}
            onClick={() => ctl.run(() => actions.depositGold(actor.name, gold))}
          >
            Deposit
          </button>
          <button
            class="cat-btn"
            disabled={ctl.disabled || gold < 1 || gold > details.gold}
            title={gold > details.gold ? "Not enough gold in bank" : `Withdraw ${gold}g`}
            onClick={() => ctl.run(() => actions.withdrawGold(actor.name, gold))}
          >
            Withdraw
          </button>
        </div>
      )}
      {actor && details && (
        <button
          class="cat-btn"
          disabled={ctl.disabled || actor.gold < details.next_expansion_cost}
          title={`Buy a bank expansion for ${details.next_expansion_cost.toLocaleString()}g`}
          onClick={buyExpansion}
        >
          Buy expansion · {details.next_expansion_cost.toLocaleString()}g
        </button>
      )}

      {items.length === 0 ? (
        <div class="cat-empty">The bank is empty.</div>
      ) : (
        <div class="bank-list">
          {items.map((b) => (
            <BankRow key={b.code} code={b.code} qty={b.quantity} actor={actor} ctl={ctl} />
          ))}
        </div>
      )}
    </>
  );
}

function BankRow({ code, qty, actor, ctl }: { code: string; qty: number; actor?: Character; ctl: ActionRunner }) {
  const [n, setN] = useState(1);
  return (
    <div class="bank-row" title={itemName(code)}>
      <img src={asset("items", code)} alt="" onError={assetFallback("items", code)} />
      <span class="bank-name">{itemName(code)}</span>
      <span class="bank-qty">×{qty.toLocaleString()}</span>
      {actor && (
        <>
          <NumInput value={n} min={1} max={qty} onChange={setN} />
          <button
            class="cat-btn"
            disabled={ctl.disabled || n < 1 || n > qty}
            title={`Withdraw ${n} with ${actor.name}`}
            onClick={() => ctl.run(() => actions.withdrawItems(actor.name, [{ code, quantity: n }]))}
          >
            Withdraw
          </button>
        </>
      )}
    </div>
  );
}

function WorkshopList({ skill, actor, ctl }: { skill: string; actor?: Character; ctl: ActionRunner }) {
  const recipes = workshopRecipes(skill);
  if (recipes.length === 0) return <div class="cat-empty">No recipes for this workshop.</div>;
  return (
    <>
      <div class="cat-count">{recipes.length} recipes</div>
      <div class="recipe-list">
        {recipes.map((it) => (
          <RecipeCard key={it.code} it={it} actor={actor} ctl={ctl} />
        ))}
      </div>
    </>
  );
}

function RecipeCard({ it, actor, ctl }: { it: Item; actor?: Character; ctl: ActionRunner }) {
  const craft = it.craft!;
  const [qty, setQty] = useState(1);
  const levelOk = actor ? skillLevel(actor, craft.skill) >= craft.level : false;
  // How many full batches the carried materials allow.
  const maxCraft = actor
    ? Math.min(...craft.items.map((ing) => Math.floor(invQty(actor, ing.code) / ing.quantity)))
    : 0;
  const hasMats = maxCraft >= qty;
  const canCraft = levelOk && hasMats && qty >= 1;
  const held = actor ? invQty(actor, it.code) : 0;
  const reason = !actor
    ? ""
    : !levelOk
      ? `Requires ${titleCase(craft.skill)} Lv ${craft.level}`
      : !hasMats
        ? "Not enough materials"
        : `Craft with ${actor.name}`;

  // Hover the item's icon or name to show its parameters in a floating popup.
  const showInfo = (e: MouseEvent) => (itemPopup.value = { code: it.code, x: e.clientX, y: e.clientY });
  const hideInfo = () => (itemPopup.value = null);

  return (
    <div class="recipe-row">
      <img
        class="recipe-icon info-hover"
        src={asset("items", it.code)}
        alt=""
        onError={assetFallback("items", it.code)}
        onMouseMove={showInfo}
        onMouseLeave={hideInfo}
      />
      <div class="recipe-main">
        <div class="recipe-name info-hover" onMouseMove={showInfo} onMouseLeave={hideInfo}>
          {it.name}
        </div>
        <div class={`recipe-level${actor && !levelOk ? " short" : ""}`}>
          {titleCase(craft.skill)} Lv {craft.level}
          {actor && !levelOk ? ` · you ${skillLevel(actor, craft.skill)}` : ""}
          {craft.quantity > 1 ? ` · makes ×${craft.quantity}` : ""}
        </div>
        <div class="recipe-ings">
          {craft.items.map((ing) => {
            const need = ing.quantity * qty;
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
        <div class="recipe-actions">
          <NumInput value={qty} min={1} max={Math.max(1, maxCraft)} onChange={setQty} />
          <button class="cat-btn craft" disabled={ctl.disabled || !canCraft} title={reason} onClick={() => ctl.run(() => actions.craft(actor.name, it.code, qty))}>
            Craft
          </button>
          {held > 0 && it.recyclable !== false && (
            <button
              class="cat-btn"
              disabled={ctl.disabled}
              title={`Recycle ${Math.min(qty, held)} ${it.name}`}
              onClick={() => ctl.run(() => actions.recycle(actor.name, it.code, Math.min(qty, held)))}
            >
              Recycle ×{Math.min(qty, held)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function NpcList({ npc: n, actor, ctl }: { npc?: Npc; actor?: Character; ctl: ActionRunner }) {
  const trades = n?.items ?? [];
  const curLabel = (c: string) => (c === "gold" ? "gold" : itemName(c));

  return (
    <>
      {n?.description && <p class="cat-desc">{n.description}</p>}
      {trades.length === 0 ? (
        <div class="cat-empty">This NPC has no listed trades.</div>
      ) : (
        <>
          <div class="cat-count">{trades.length} offers</div>
          {trades.map((t) => (
            <NpcRow key={`${t.code}:${t.currency}`} trade={t} curLabel={curLabel(t.currency)} actor={actor} ctl={ctl} />
          ))}
        </>
      )}
    </>
  );
}

type NpcTrade = NonNullable<Npc["items"]>[number];

function NpcRow({ trade: t, curLabel, actor, ctl }: { trade: NpcTrade; curLabel: string; actor?: Character; ctl: ActionRunner }) {
  const [qty, setQty] = useState(1);
  const name = item(t.code)?.name ?? titleCase(t.code);
  const hasCurrency = (c: string, price: number) =>
    actor != null && (c === "gold" ? actor.gold >= price : invQty(actor, c) >= price);
  const canBuy = t.buy_price != null && hasCurrency(t.currency, t.buy_price * qty);
  const sellQty = actor ? invQty(actor, t.code) : 0;
  const canSell = t.sell_price != null && qty <= sellQty;

  return (
    <div class="cat-item">
      <div class="cat-item-head">
        <img src={asset("items", t.code)} alt="" onError={assetFallback("items", t.code)} />
        <div class="cat-item-id">
          <span class="cat-item-name">{name}</span>
          <span class="cat-item-sub">paid in {titleCase(curLabel)}</span>
        </div>
      </div>
      {actor && (t.buy_price != null || t.sell_price != null) && (
        <div class="cat-trade-actions">
          <NumInput value={qty} min={1} max={t.sell_price != null ? Math.max(1, sellQty) : undefined} onChange={setQty} />
          {t.buy_price != null && (
            <button
              class="cat-btn buy"
              disabled={ctl.disabled || !canBuy || qty < 1}
              title={canBuy ? `Buy ${qty} with ${actor.name}` : `Need ${t.buy_price * qty} ${curLabel}`}
              onClick={() => ctl.run(() => actions.npcBuy(actor.name, t.code, qty))}
            >
              Buy · {t.buy_price} {curLabel}
            </button>
          )}
          {t.sell_price != null && (
            <button
              class="cat-btn sell"
              disabled={ctl.disabled || !canSell}
              title={canSell ? `Sell ${qty} with ${actor.name}` : `No ${name} to sell`}
              onClick={() => ctl.run(() => actions.npcSell(actor.name, t.code, qty))}
            >
              Sell · {t.sell_price} {curLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Tasks master: show the active task + accept / complete / cancel / exchange,
 *  plus a trade row for item-type tasks. */
function TasksPanel({ actor, ctl }: { actor?: Character; ctl: ActionRunner }) {
  const [qty, setQty] = useState(1);
  if (!actor) return <div class="cat-empty">Move a character here to manage tasks.</div>;

  const hasTask = !!actor.task;
  const done = hasTask && actor.task_progress >= actor.task_total;
  const isItemTask = actor.task_type === "items";
  const held = hasTask ? invQty(actor, actor.task) : 0;

  return (
    <>
      {hasTask ? (
        <div class="task-current">
          <div class="task-name">
            <b>{titleCase(actor.task)}</b> <span class="muted">· {titleCase(actor.task_type)}</span>
          </div>
          <div class="bar">
            <div class="fill xp" style={{ width: pct(actor.task_progress, actor.task_total) + "%" }} />
          </div>
          <div class="muted">
            {actor.task_progress}/{actor.task_total}
            {done ? " · ready to complete" : ""}
          </div>
        </div>
      ) : (
        <div class="cat-empty">No active task.</div>
      )}

      <div class="cat-trade-actions">
        {!hasTask && (
          <button class="cat-btn buy" disabled={ctl.disabled} onClick={() => ctl.run(() => actions.taskNew(actor.name))}>
            Accept new task
          </button>
        )}
        {done && (
          <button class="cat-btn craft" disabled={ctl.disabled} onClick={() => ctl.run(() => actions.taskComplete(actor.name))}>
            Complete task
          </button>
        )}
        {hasTask && !done && (
          <button
            class="cat-btn sell"
            disabled={ctl.disabled}
            title="Cancel the current task (costs tasks coins)"
            onClick={() => {
              if (confirm(`Cancel ${actor.name}'s current task? This costs tasks coins.`)) {
                void ctl.run(() => actions.taskCancel(actor.name));
              }
            }}
          >
            Cancel task
          </button>
        )}
        <button class="cat-btn" disabled={ctl.disabled} title="Exchange tasks coins for a reward" onClick={() => ctl.run(() => actions.taskExchange(actor.name))}>
          Exchange coins
        </button>
      </div>

      {hasTask && !done && isItemTask && (
        <div class="bank-gold">
          <span class="muted">Trade {itemName(actor.task)} ({held} held)</span>
          <NumInput value={qty} min={1} max={Math.max(1, held)} onChange={setQty} />
          <button
            class="cat-btn"
            disabled={ctl.disabled || held < 1 || qty > held}
            onClick={() => ctl.run(() => actions.taskTrade(actor.name, actor.task, qty))}
          >
            Trade
          </button>
        </div>
      )}
    </>
  );
}
