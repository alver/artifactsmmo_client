// The catalog tabs as tables: Bank, Items (recipes + NPC trades + stock), Monsters. Pure views over
// the static catalog + bank/characters/events signals — no API calls. Acting
// on a row means appending a queue item to a character (the queue is the only
// executor); tile-bound one-off actions (withdraw, buy, craft by hand) stay in
// the Map tab's building drawer.

import { useMemo, useState } from "preact/hooks";
import { bankDetails, bankItems, characterList, characters, focusTile, go, skillPins } from "../state/store";
import { addItem } from "../state/queue";
import { withId } from "../plan/queue";
import type { QueueItemInput } from "../plan/queue";
import { npcForSell } from "../plan/acquire";
import { ownedQtyOf } from "../plan/jobgear";
import { bestInSlot } from "../plan/bis";
import { catalog, item, itemName, itemUses } from "../catalog";
import { eventForContent } from "../state/events";
import { tileGate } from "../state/access";
import { currentFighter } from "../sim/stats";
import { simulate } from "../sim/combat";
import type { FightForecast } from "../sim/combat";
import { asset, assetFallback, dropChance, titleCase } from "../lib/util";
import type { AssetKind } from "../lib/util";
import { itemHover } from "./ItemPopup";
import { EventTimer } from "./EventsPanel";
import { DataTable } from "./DataTable";
import type { Col } from "./DataTable";
import { SLOTS_FOR_TYPE } from "../types/api";
import type { Character } from "../types/api";
import type { GameMap, Item, Monster, Npc } from "../types/catalog";

const level = (c: Character, skill: string): number => (c as unknown as Record<string, number>)[`${skill}_level`] ?? 0;

/** Bank stock by code, recomputed only when the bank echo changes. */
function useBankQty(): Map<string, number> {
  const bank = bankItems.value;
  return useMemo(() => new Map(bank.map((b) => [b.code, b.quantity])), [bank]);
}

/** Everything the account owns by code: bank + every character's bag + worn gear. */
function useFleetQty(): Map<string, number> {
  const bank = bankItems.value;
  const chars = characters.value;
  return useMemo(() => {
    const q = new Map(bank.map((b) => [b.code, b.quantity]));
    for (const c of Object.values(chars)) for (const [code, n] of ownedQtyOf(c, [])) q.set(code, (q.get(code) ?? 0) + n);
    return q;
  }, [bank, chars]);
}

// Static tiles per content ("monster:chicken" → its tiles). The map is static — build once.
let _tiles: Map<string, GameMap[]> | null = null;
function tilesOf(type: string, code: string): GameMap[] {
  if (!_tiles) {
    _tiles = new Map();
    for (const m of catalog().maps) {
      const c = m.interactions?.content;
      if (!c) continue;
      const k = `${c.type}:${c.code}`;
      _tiles.set(k, [...(_tiles.get(k) ?? []), m]);
    }
  }
  return _tiles.get(`${type}:${code}`) ?? [];
}

/** Reachable now: a static tile (not known-locked) or a live event spawn. */
function reachable(type: string, code: string): boolean {
  const t = tilesOf(type, code)[0];
  return (t != null && tileGate(t)?.met !== false) || eventForContent(type, code) != null;
}

/** Where a monster / NPC is, inline: its static tile (click shows it on the map), else its live event's countdown, else "event". */
function WhereCell({ type, code }: { type: string; code: string }) {
  const tiles = tilesOf(type, code);
  const show = (m: GameMap) => {
    focusTile(m.x, m.y, m.layer ?? "overworld");
    go("map");
  };
  if (tiles.length) {
    const t = tiles[0];
    const gate = tileGate(t);
    return (
      <span class="small">
        <a href="#/map" onClick={(e) => { e.preventDefault(); show(t); }}>
          ({t.x}, {t.y})
        </a>
        {(t.layer ?? "overworld") !== "overworld" ? ` ${titleCase(t.layer!)}` : ""}
        {tiles.length > 1 ? <span class="muted"> +{tiles.length - 1}</span> : ""}
        {gate && <span class={gate.met === false ? "bad-text" : "muted"} title={gate.label}> 🔒{gate.met === false ? " locked" : ""}</span>}
      </span>
    );
  }
  const ev = eventForContent(type, code);
  if (ev) {
    return (
      <span class="small" title={`event at (${ev.map.x}, ${ev.map.y})`}>
        <a href="#/map" onClick={(e) => { e.preventDefault(); show(ev.map); }}>
          ⚡ <EventTimer until={Date.parse(ev.expiration)} />
        </a>
      </span>
    );
  }
  return <span class="muted small">event</span>;
}

function Icon({ kind, code }: { kind: AssetKind; code: string }) {
  return <img class="dt-icon" src={asset(kind, code)} alt="" onError={assetFallback(kind, code)} />;
}

function ItemCell({ code, sub }: { code: string; sub?: string }) {
  return (
    <div class="dt-thing info-hover" {...itemHover(code)}>
      <Icon kind="items" code={code} />
      <div>
        <div class="dt-name">{itemName(code)}</div>
        {sub && <div class="muted small">{sub}</div>}
      </div>
    </div>
  );
}

/** Inline "append to a character's queue" form, used as a table row's detail line. */
function QueueTo({ who, make, qty0, qtyLabel, onDone }: { who: Character[]; make: (qty: number) => QueueItemInput; qty0: number; qtyLabel: string; onDone: () => void }) {
  const [name, setName] = useState(who[0]?.name ?? "");
  const [qty, setQty] = useState(qty0);
  if (!who.length) return <span class="muted">Nobody can do this yet.</span>;
  return (
    <div class="q-add-form">
      <select class="cp-refine-select" value={name} onChange={(e) => setName((e.target as HTMLSelectElement).value)}>
        {who.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
      <label class="q-field">
        {qtyLabel}
        <input class="cat-num" type="number" min={0} value={qty} onInput={(e) => setQty(parseInt((e.target as HTMLInputElement).value, 10) || 0)} />
      </label>
      <button class="cat-btn buy" onClick={() => { addItem(name, withId(make(qty))); onDone(); }}>
        Add to {name}'s queue
      </button>
      <button class="cat-btn" onClick={onDone}>
        Cancel
      </button>
    </div>
  );
}

// ── Bank: a compact grid — one tile per stack, grouped by item type ──────────

type Stack = { code: string; quantity: number };
const stockValue = (b: Stack): number => (npcForSell(b.code)?.price ?? 0) * b.quantity;
const BANK_SORTS: Record<string, [string, (a: Stack, b: Stack) => number]> = {
  name: ["Name", (a, b) => itemName(a.code).localeCompare(itemName(b.code))],
  qty: ["Quantity", (a, b) => b.quantity - a.quantity],
  value: ["Value", (a, b) => stockValue(b) - stockValue(a)],
  level: ["Level", (a, b) => (item(a.code)?.level ?? 0) - (item(b.code)?.level ?? 0)],
};

/** One bank stack: icon, name, quantity; sell value + recipe uses underneath; hover for the full item card. */
function BankTile({ b }: { b: Stack }) {
  const it = item(b.code);
  const v = stockValue(b);
  const uses = itemUses(b.code).recipes.length;
  return (
    <div class="bank-tile info-hover" {...itemHover(b.code)}>
      <Icon kind="items" code={b.code} />
      <div class="bank-tile-text">
        <div class="bank-tile-name">{itemName(b.code)}</div>
        <div class="small muted">
          {(it?.level ?? 0) > 1 ? `Lv ${it!.level}` : ""}
          {(it?.level ?? 0) > 1 && (v || uses) ? " · " : ""}
          {v ? <span class="gold">{v.toLocaleString()}g</span> : ""}
          {v && uses ? " · " : ""}
          {uses ? `${uses} recipe${uses === 1 ? "" : "s"}` : ""}
        </div>
      </div>
      <b class="bank-tile-qty">{b.quantity.toLocaleString()}</b>
    </div>
  );
}

export function BankTab() {
  const details = bankDetails.value;
  const all = bankItems.value;
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("name");
  const total = all.reduce((s, b) => s + stockValue(b), 0);

  const needle = q.trim().toLowerCase();
  const shown = all.filter((b) => !needle || `${itemName(b.code)} ${b.code}`.toLowerCase().includes(needle)).sort(BANK_SORTS[sort][1]);
  const groups = new Map<string, Stack[]>();
  for (const b of shown) {
    const type = item(b.code)?.type || "other";
    // One "Equipment" group instead of a row per slot type; potions stay with consumables.
    const t = type === "utility" ? "consumable" : SLOTS_FOR_TYPE[type] ? "equipment" : type;
    groups.set(t, [...(groups.get(t) ?? []), b]);
  }

  return (
    <div class="page">
      <div class="page-head">
        <h2>Bank</h2>
        <span class="muted">
          {all.length}
          {details ? `/${details.slots}` : ""} slots · <span class="gold">{(details?.gold ?? 0).toLocaleString()}</span> gold · stock sells for <span class="gold">{total.toLocaleString()}</span> gold
        </span>
      </div>
      <section class="ws-card">
        <div class="dt-tools">
          <input class="dt-search" type="search" placeholder="Search…" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
          <label class="q-field">
            sort
            <select class="cp-refine-select" value={sort} onChange={(e) => setSort((e.target as HTMLSelectElement).value)}>
              {Object.entries(BANK_SORTS).map(([k, [label]]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <span class="dt-count muted">{shown.length === all.length ? `${all.length} stacks` : `${shown.length} of ${all.length}`}</span>
        </div>
        {shown.length === 0 && <div class="dt-empty muted">{all.length ? "Nothing matches." : "The bank is empty."}</div>}
        {[...groups.keys()].sort().map((t) => (
          <div key={t} class="bank-group">
            <h3 class="bank-group-head">
              {titleCase(t)} <span class="muted">{groups.get(t)!.length}</span>
            </h3>
            <div class="bank-grid">
              {groups.get(t)!.map((b) => (
                <BankTile key={b.code} b={b} />
              ))}
            </div>
          </div>
        ))}
        <div class="muted small dt-foot">Withdraw / deposit by hand from the bank building on the Map tab.</div>
      </section>
    </div>
  );
}

// ── Items: the whole catalog — recipes, NPC trades and bank stock in one table ──

/** Characters who can craft it now, pinned specialists first, then by skill level. */
function craftersFor(it: Item, chars: Character[]): Character[] {
  const skill = it.craft!.skill;
  return chars
    .filter((c) => level(c, skill) >= it.craft!.level)
    .sort((a, b) => Number((skillPins.value[b.name] ?? []).includes(skill)) - Number((skillPins.value[a.name] ?? []).includes(skill)) || level(b, skill) - level(a, skill));
}

interface Trade {
  npc: Npc;
  code: string;
  currency: string;
  buy: number | null;
  sell: number | null;
}

// Static catalog — derive once.
let _items: Item[] | null = null;
const allItems = (): Item[] => (_items ??= [...catalog().items.values()]);
let _trades: Map<string, Trade[]> | null = null;
function tradesOf(code: string): Trade[] {
  if (!_trades) {
    _trades = new Map();
    for (const n of catalog().npcs.values()) {
      for (const t of n.items ?? []) {
        _trades.set(t.code, [...(_trades.get(t.code) ?? []), { npc: n, code: t.code, currency: t.currency, buy: t.buy_price, sell: t.sell_price }]);
      }
    }
  }
  return _trades.get(code) ?? [];
}
const buyOffers = (i: Item) => tradesOf(i.code).filter((t) => t.buy != null);
const sellOffers = (i: Item) => tradesOf(i.code).filter((t) => t.sell != null);
/** The best place to sell for gold (else any sell offer). */
const bestSell = (i: Item): Trade | undefined =>
  sellOffers(i).filter((t) => t.currency === "gold").sort((a, b) => b.sell! - a.sell!)[0] ?? sellOffers(i)[0];
const cheapestGoldBuy = (i: Item): number => Math.min(...buyOffers(i).map((t) => (t.currency === "gold" ? t.buy! : Infinity)));

function Price({ n, currency }: { n: number | null; currency: string }) {
  if (n == null) return <span class="muted">—</span>;
  if (currency === "gold") return <span class="gold">{n.toLocaleString()}g</span>;
  return (
    <span class="info-hover" {...itemHover(currency)}>
      {n.toLocaleString()} <Icon kind="items" code={currency} />
    </span>
  );
}

/** One NPC offer on a line: who, at what price, and where/when they can be reached. */
function Offer({ t, price }: { t: Trade; price: number | null }) {
  return (
    <div class="offer">
      <span class="offer-npc">{t.npc.name}</span> <Price n={price} currency={t.currency} /> <WhereCell type="npc" code={t.npc.code} />
    </div>
  );
}

const SOURCES: [string, string][] = [
  ["", "Any source"],
  ["craft", "Craftable"],
  ["buy", "NPCs sell it"],
  ["sell", "NPCs buy it"],
  ["bank", "In the bank"],
];

export function ItemsTab() {
  const bank = useBankQty();
  const fleet = useFleetQty();
  const chars = characterList();
  const [type, setType] = useState("");
  const [source, setSource] = useState("");
  const [skill, setSkill] = useState("");
  const [canOnly, setCanOnly] = useState(false);
  const [nowOnly, setNowOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const canMake = (i: Item) => (i.craft ? Math.min(...i.craft.items.map((g) => Math.floor((bank.get(g.code) ?? 0) / g.quantity))) : 0);
  const all = allItems();
  const types = useMemo(() => [...new Set(all.map((i) => i.type))].sort(), [all]);
  const skills = useMemo(() => [...new Set(all.flatMap((i) => (i.craft ? [i.craft.skill] : [])))].sort(), [all]);
  const rows = all.filter(
    (i) =>
      (!type || i.type === type) &&
      (source === "" ||
        (source === "craft" && !!i.craft) ||
        (source === "buy" && buyOffers(i).length > 0) ||
        (source === "sell" && sellOffers(i).length > 0) ||
        (source === "bank" && (bank.get(i.code) ?? 0) > 0)) &&
      (!skill || i.craft?.skill === skill) &&
      (!canOnly || canMake(i) > 0) &&
      (!nowOnly || tradesOf(i.code).some((t) => reachable("npc", t.npc.code))),
  );

  const cols: Col<Item>[] = [
    { label: "Item", width: "minmax(190px, 1.3fr)", sort: (i) => i.name, cell: (i) => <ItemCell code={i.code} sub={titleCase(i.subtype || i.type)} /> },
    { label: "Lv", width: "44px", align: "right", sort: (i) => i.level, cell: (i) => i.level },
    { label: "In bank", width: "70px", align: "right", sort: (i) => bank.get(i.code) ?? 0, cell: (i) => bank.get(i.code)?.toLocaleString() || <span class="muted">—</span> },
    {
      label: "Total", width: "70px", align: "right", sort: (i) => fleet.get(i.code) ?? 0,
      cell: (i) => <span title="Bank + every character's bag + worn gear">{fleet.get(i.code)?.toLocaleString() || <span class="muted">—</span>}</span>,
    },
    {
      label: "Recipe (bank stock)", width: "minmax(260px, 2fr)",
      sort: (i) => (i.craft ? `${i.craft.skill}:${String(i.craft.level).padStart(3, "0")}` : "~"),
      cell: (i) =>
        i.craft ? (
          <div>
            <div class="small">
              {titleCase(i.craft.skill)} · <b>{i.craft.level}</b>
              {i.craft.quantity > 1 ? <span class="muted"> · makes ×{i.craft.quantity}</span> : ""}
            </div>
            <div class="chips">
              {i.craft.items.map((g) => {
                const have = bank.get(g.code) ?? 0;
                return (
                  <span key={g.code} class={"chip info-hover" + (have < g.quantity ? " short" : "")} {...itemHover(g.code)}>
                    <Icon kind="items" code={g.code} />
                    {g.quantity}× {itemName(g.code)} <span class="chip-have">({have})</span>
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
          <span class="muted">—</span>
        ),
    },
    { label: "Can make", width: "70px", align: "right", sort: (i) => canMake(i), cell: (i) => (!i.craft ? "" : canMake(i) ? <b class="ok-text">{canMake(i)}</b> : <span class="muted">0</span>) },
    {
      label: "Best crafter", width: "130px",
      cell: (i) => {
        if (!i.craft) return "";
        const best = craftersFor(i, chars)[0];
        if (best) {
          const pinned = (skillPins.value[best.name] ?? []).includes(i.craft.skill);
          return <span class="small">{best.name} · {level(best, i.craft.skill)}{pinned ? " 📌" : ""}</span>;
        }
        const top = [...chars].sort((a, b) => level(b, i.craft!.skill) - level(a, i.craft!.skill))[0];
        return <span class="small bad-text">nobody yet{top ? ` · best ${top.name} ${level(top, i.craft.skill)}` : ""}</span>;
      },
    },
    {
      label: "Buy from NPC", width: "minmax(190px, 1.2fr)", sort: (i) => cheapestGoldBuy(i),
      cell: (i) => {
        const offers = buyOffers(i);
        return offers.length ? offers.map((t) => <Offer key={t.npc.code + t.currency} t={t} price={t.buy} />) : <span class="muted">—</span>;
      },
    },
    {
      label: "Sell to NPC", width: "minmax(170px, 1fr)", sort: (i) => (bestSell(i)?.currency === "gold" ? bestSell(i)!.sell! : -1),
      cell: (i) => {
        const t = bestSell(i);
        const more = sellOffers(i).length - 1;
        return t ? (
          <div>
            <Offer t={t} price={t.sell} />
            {more > 0 && <div class="muted small">+{more} more</div>}
          </div>
        ) : (
          <span class="muted">—</span>
        );
      },
    },
    {
      label: "", width: "78px", align: "right",
      cell: (i) =>
        i.craft ? (
          <button class="cat-btn" onClick={() => setOpen(open === i.code ? null : i.code)}>
            Craft…
          </button>
        ) : (
          ""
        ),
    },
  ];

  return (
    <div class="page">
      <div class="page-head">
        <h2>Items</h2>
        <span class="muted">Every item — how to craft it, who sells and buys it, what the bank holds and what the fleet owns in total. Hover an item for its full card.</span>
      </div>
      <section class="ws-card">
        <DataTable
          rows={rows}
          cols={cols}
          rowKey={(i) => i.code}
          search={(i) => `${i.name} ${i.code} ${i.craft?.items.map((g) => itemName(g.code)).join(" ") ?? ""} ${tradesOf(i.code).map((t) => t.npc.name).join(" ")}`}
          initialSort={{ col: 1, dir: 1 }}
          pageSize={150}
          toolbar={
            <>
              <select class="cp-refine-select" value={source} onChange={(e) => setSource((e.target as HTMLSelectElement).value)}>
                {SOURCES.map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
              <select class="cp-refine-select" value={type} onChange={(e) => setType((e.target as HTMLSelectElement).value)}>
                <option value="">All types</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {titleCase(t)}
                  </option>
                ))}
              </select>
              <select class="cp-refine-select" value={skill} onChange={(e) => setSkill((e.target as HTMLSelectElement).value)}>
                <option value="">Any craft skill</option>
                {skills.map((s) => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </select>
              <label class="q-field">
                <input type="checkbox" checked={canOnly} onChange={(e) => setCanOnly((e.target as HTMLInputElement).checked)} />
                bank can make now
              </label>
              <label class="q-field">
                <input type="checkbox" checked={nowOnly} onChange={(e) => setNowOnly((e.target as HTMLInputElement).checked)} />
                trader reachable now
              </label>
            </>
          }
          detail={(i) =>
            open === i.code && i.craft ? (
              <QueueTo
                who={craftersFor(i, chars)}
                qtyLabel="crafts (0 = until the bank runs out)"
                qty0={Math.max(1, canMake(i))}
                make={(quantity) => ({ kind: "craft", code: i.code, quantity, done: 0, skill: i.craft!.skill })}
                onDone={() => setOpen(null)}
              />
            ) : null
          }
          empty="No item matches."
        />
        <div class="muted small dt-foot">Buy / sell / craft by hand at the building on the Map tab; “Craft…” queues it for a character.</div>
      </section>
    </div>
  );
}

// ── Monsters ────────────────────────────────────────────────────────────────

function Verdict({ f }: { f?: FightForecast }) {
  if (!f) return <span class="muted">…</span>;
  if (!f.win) return <span class="verdict lose">✗ {f.timedOut ? "too slow" : "loses"}</span>;
  const left = Math.round(f.margin * 100);
  return <span class={"verdict " + (left < 30 ? "risky" : "win")}>✓ {left}% left</span>;
}

export function MonstersTab() {
  const chars = characterList();
  const charMap = characters.value;
  const [open, setOpen] = useState<string | null>(null);
  // monster code → character → forecast with the best set the bank could dress them in
  const [bankSets, setBankSets] = useState<Record<string, Record<string, FightForecast>>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const monsters = useMemo(() => [...catalog().monsters.values()].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)), []);
  // Current-gear forecasts: one cheap deterministic sim per (character, monster), redone per character echo.
  const current = useMemo(() => {
    const out = new Map<string, Record<string, FightForecast>>();
    const fighters = chars.map((c) => [c.name, currentFighter(c)] as const);
    for (const m of monsters) out.set(m.code, Object.fromEntries(fighters.map(([n, f]) => [n, simulate(f, m)])));
    return out;
  }, [charMap, monsters]);

  const solveBank = (m: Monster) => {
    setBusy(m.code);
    setTimeout(() => {
      try {
        const res: Record<string, FightForecast> = {};
        for (const c of chars) {
          const qty = ownedQtyOf(c, bankItems.value);
          const rec = bestInSlot(c, m.code, { owned: new Set(qty.keys()), ownedQty: qty, includeCraftable: false })[0];
          if (rec) res[c.name] = rec.forecast;
        }
        setBankSets((s) => ({ ...s, [m.code]: res }));
      } finally {
        setBusy(null);
      }
    }, 0);
  };

  const cols: Col<Monster>[] = [
    {
      label: "Monster", width: "190px", sort: (m) => m.level,
      cell: (m) => (
        <div class="dt-thing">
          <Icon kind="monsters" code={m.code} />
          <div>
            <div class="dt-name">{m.name}</div>
            <div class={"small " + (m.type === "normal" ? "muted" : "gold")}>
              Lv {m.level}
              {m.type !== "normal" ? ` · ${titleCase(m.type)}` : ""}
            </div>
          </div>
        </div>
      ),
    },
    { label: "HP", width: "70px", align: "right", sort: (m) => m.hp, cell: (m) => m.hp.toLocaleString() },
    {
      label: "Drops", width: "minmax(200px, 1.5fr)",
      cell: (m) => (
        <div class="chips">
          {m.drops.map((d) => (
            <span key={d.code} class="chip info-hover" {...itemHover(d.code)}>
              <Icon kind="items" code={d.code} />
              {itemName(d.code)} <span class="chip-have">{dropChance(d.rate)}</span>
            </span>
          ))}
        </div>
      ),
    },
    { label: "Where", width: "100px", sort: (m) => (reachable("monster", m.code) ? 0 : 1), cell: (m) => <WhereCell type="monster" code={m.code} /> },
    ...chars.map(
      (c): Col<Monster> => ({
        label: c.name, width: "minmax(100px, 1fr)", align: "center",
        sort: (m) => { const f = current.get(m.code)?.[c.name]; return f?.win ? f.margin : -1; },
        cell: (m) => {
          const best = bankSets[m.code]?.[c.name];
          return (
            <div>
              <Verdict f={current.get(m.code)?.[c.name]} />
              {best && (
                <div class="small muted" title="With the best set the bank could dress this character in">
                  🏦 <Verdict f={best} />
                </div>
              )}
            </div>
          );
        },
      }),
    ),
    {
      label: "", width: "150px", align: "right",
      cell: (m) => (
        <div class="row-actions">
          <button class="cat-btn" disabled={busy != null || !!bankSets[m.code]} title="Forecast every character in the best set the bank could dress them in (a few BIS searches)" onClick={() => solveBank(m)}>
            {busy === m.code ? "…" : "🏦 Best"}
          </button>
          <button class="cat-btn" onClick={() => setOpen(open === m.code ? null : m.code)}>
            Fight…
          </button>
        </div>
      ),
    },
  ];

  return (
    <div class="page">
      <div class="page-head">
        <h2>Monsters</h2>
        <span class="muted">Who can beat what — HP left at the end of the fight (fight sim, current gear; 🏦 Best = best bank set)</span>
      </div>
      <section class="ws-card">
        <DataTable
          rows={monsters}
          cols={cols}
          rowKey={(m) => m.code}
          search={(m) => `${m.name} ${m.drops.map((d) => itemName(d.code)).join(" ")}`}
          initialSort={{ col: 0, dir: 1 }}
          detail={(m) =>
            open === m.code ? (
              <QueueTo
                who={[...chars].sort((a, b) => (current.get(m.code)?.[b.name]?.margin ?? 0) - (current.get(m.code)?.[a.name]?.margin ?? 0))}
                qtyLabel="fights (0 = forever)"
                qty0={10}
                make={(times) => ({ kind: "fight", monster: m.code, times, done: 0, gear: true })}
                onDone={() => setOpen(null)}
              />
            ) : null
          }
          empty="No monster matches."
        />
      </section>
    </div>
  );
}
