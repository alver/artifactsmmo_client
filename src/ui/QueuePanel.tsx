// The plan queue — the panel's main character control. An ordered, editable
// list of actions (see src/plan/queue.ts) with ▶ run / ⏹ stop, add / remove /
// edit / reorder, and live per-item progress while the runner works it.
//
// Perf note: this reads only the queue + job signals (action-paced), never the
// 4 Hz `now` clock — see the cooldown-clock invariant in store.ts.

import { useState } from "preact/hooks";
import { armTilePick, bankItems, tilePick } from "../state/store";
import { npcForSell } from "../plan/acquire";
import { catalog, itemName } from "../catalog";
import { titleCase } from "../lib/util";
import { queueItemIcon, queueItemText, withId } from "../plan/queue";
import { addItem, clearQueue, moveItem, queues, removeItem, startQueue, stopQueue, updateItem } from "../state/queue";
import { campaignJobs } from "../state/campaign";
import { monsterList } from "./PlanControl";
import type { JSX } from "preact";
import type { QueueItem, QueueItemInput } from "../plan/queue";
import type { Character } from "../types/api";

/** The item kinds the user can create by hand (the rest arrive via the planner). */
const ADDABLE: { kind: string; label: string }[] = [
  { kind: "move", label: "🚶 Move to a tile" },
  { kind: "rest", label: "💤 Rest to full HP" },
  { kind: "fight", label: "⚔ Fight a monster ×N (0 = ∞)" },
  { kind: "gather", label: "⛏ Gather a resource ×N (0 = ∞)" },
  { kind: "craft", label: "⚙ Craft / refine ×N" },
  { kind: "withdraw", label: "🏦 Withdraw from bank" },
  { kind: "sell", label: "💰 Sell bank stock ×N" },
  { kind: "deposit-all", label: "📦 Deposit everything" },
  { kind: "gear", label: "🧰 Equip for a job" },
  { kind: "deliver", label: "🤝 Deliver task items" },
  { kind: "turn-in", label: "✅ Turn in the task" },
];

function otherLoop(name: string): string | null {
  if (campaignJobs.value[name]) return "running a campaign";
  return null;
}

export function QueueSection({ ch }: { ch: Character }) {
  const [adding, setAdding] = useState(false);
  const q = queues.value[ch.name] ?? { items: [], running: false };
  const busy = otherLoop(ch.name);
  const pausedError = !q.running ? q.items[0]?.error : undefined;

  return (
    <div class="q-panel">
      <div class="q-head">
        {q.running ? (
          <>
            <span class="gather-tag banking">
              <span class="spinner" />
              {q.note || "running"}
            </span>
            <span class="q-count muted">{q.items.length} left</span>
            <button class="cat-btn" title="Add an action to the end — the queue keeps running" onClick={() => setAdding(!adding)}>＋ Add</button>
            <button class="btn-stop" title="Pause the queue after the current action" onClick={() => stopQueue(ch.name)}>⏹</button>
          </>
        ) : (
          <>
            <button
              class="btn-refine"
              disabled={q.items.length === 0 || !!busy}
              title={busy ? `busy ${busy} — stop it first` : "Run the queue from the top"}
              onClick={() => startQueue(ch.name)}
            >
              ▶ Run
            </button>
            {pausedError && <span class="q-paused">⏸ paused</span>}
            <span class="q-count muted">{q.items.length} item{q.items.length === 1 ? "" : "s"}</span>
            <button class="cat-btn" title="Add an action" onClick={() => setAdding(!adding)}>＋ Add</button>
            {q.items.length > 0 && (
              <button
                class="cat-btn sell"
                title="Remove all items"
                onClick={() => { if (confirm(`Clear all ${q.items.length} queued items for ${ch.name}?`)) clearQueue(ch.name); }}
              >
                ✕
              </button>
            )}
          </>
        )}
      </div>
      {busy && !q.running && <div class="foot-hint">busy {busy} — stop it to run the queue</div>}

      {adding && <AddForm ch={ch} onDone={() => setAdding(false)} />}

      {q.items.length === 0 && !adding && (
        <div class="muted" style={{ fontSize: 12 }}>Empty — add actions with ＋ or from a plan above.</div>
      )}

      <div class="q-list">
        {q.items.map((it, i) => (
          <QueueRow key={it.id} ch={ch} it={it} index={i} running={q.running} count={q.items.length} />
        ))}
      </div>
    </div>
  );
}

function progressOf(it: QueueItem): string {
  if (it.kind === "fight" || it.kind === "gather") return it.done > 0 ? (it.times > 0 ? `${it.done}/${it.times}` : `${it.done}`) : "";
  if (it.kind === "craft" || it.kind === "sell") return it.done > 0 ? `${it.done}/${it.quantity}` : "";
  return "";
}

function QueueRow({ ch, it, index, running, count }: { ch: Character; it: QueueItem; index: number; running: boolean; count: number }) {
  const [editing, setEditing] = useState(false);
  const isHead = index === 0;
  const locked = running && isHead; // the executing item can't be touched
  const progress = progressOf(it);

  return (
    <div class={"q-row" + (running && isHead ? " q-running" : "") + (it.error ? " q-failed" : "")}>
      <div class="q-row-main">
        <span class="q-icon">{queueItemIcon[it.kind]}</span>
        <span class="q-text">{queueItemText(it)}</span>
        {progress && <span class="q-progress">{progress}</span>}
        <span class="q-actions">
          <button disabled={locked || index <= (running ? 1 : 0)} title="Move up" onClick={() => moveItem(ch.name, it.id, -1)}>↑</button>
          <button disabled={locked || index >= count - 1} title="Move down" onClick={() => moveItem(ch.name, it.id, 1)}>↓</button>
          <button disabled={locked} title="Edit" onClick={() => setEditing(!editing)}>✎</button>
          <button disabled={locked} title="Remove" onClick={() => removeItem(ch.name, it.id)}>✕</button>
        </span>
      </div>
      {it.error && <div class="q-error">⛔ {it.error}</div>}
      {editing && !locked && <EditForm ch={ch} it={it} onDone={() => setEditing(false)} />}
    </div>
  );
}

const num = (e: Event): number => parseInt((e.target as HTMLInputElement).value, 10) || 0;
const sel = (e: Event): string => (e.target as HTMLSelectElement).value;

/**
 * Inline editor for an existing row: the numeric knobs (counts, coordinates,
 * level), plus a map re-pick for move items. Changing WHAT an item targets
 * (monster, recipe…) is delete + re-add. Saving clears the item's error.
 */
function EditForm({ ch, it, onDone }: { ch: Character; it: QueueItem; onDone: () => void }) {
  const [draft, setDraft] = useState<Record<string, number>>({});
  const val = (k: string, fallback: number): number => draft[k] ?? fallback;
  const set = (k: string) => (e: Event) => setDraft({ ...draft, [k]: num(e) });
  const field = (label: string, k: string, fallback: number, min = 0) => (
    <label class="q-field">
      {label}
      <input class="cat-num" type="number" min={min} value={val(k, fallback)} onInput={set(k)} />
    </label>
  );

  let fields: JSX.Element | null = null;
  if (it.kind === "move") {
    fields = (
      <>
        {field("x", "x", it.x)}
        {field("y", "y", it.y)}
        <button
          class={"cat-btn" + (tilePick.value?.name === ch.name ? " buy" : "")}
          title="Click a map tile to set the destination"
          onClick={() => armTilePick(ch.name, `move step for ${ch.name}`, (x, y) => setDraft((d) => ({ ...d, x, y })))}
        >
          ◎ Pick on map
        </button>
      </>
    );
  } else if (it.kind === "fight" || it.kind === "gather") {
    fields = (
      <>
        {field("times (0 = ∞)", "times", it.times, 0)}
        {field("done", "done", it.done)}
      </>
    );
  } else if (it.kind === "craft" || it.kind === "sell") {
    fields = (
      <>
        {field("quantity", "quantity", it.quantity, 1)}
        {field("done", "done", it.done)}
      </>
    );
  } else if (it.kind === "withdraw" || it.kind === "buy") {
    fields = field("quantity", "quantity", it.quantity, 1);
  } else if (it.kind === "train") {
    fields = field("to level", "toLevel", it.toLevel, 1);
  } else {
    fields = <span class="muted" style={{ fontSize: 11 }}>nothing to edit — remove and re-add instead</span>;
  }

  return (
    <div class="q-add-form">
      {fields}
      {Object.keys(draft).length > 0 || it.error ? (
        <button class="cat-btn buy" onClick={() => { updateItem(ch.name, it.id, draft as Partial<QueueItem>); onDone(); }}>Save</button>
      ) : null}
      <button class="cat-btn" onClick={onDone}>Close</button>
    </div>
  );
}

/** The ＋ Add form: pick a kind, fill its couple of fields, append to the queue. */
function AddForm({ ch, onDone }: { ch: Character; onDone: () => void }) {
  const [kind, setKind] = useState("move");
  const [x, setX] = useState(ch.x);
  const [y, setY] = useState(ch.y);
  const [times, setTimes] = useState(10);
  const [code, setCode] = useState("");
  const [gearJob, setGearJob] = useState("fight");
  const [gearReset, setGearReset] = useState(false);

  const stats = ch as unknown as Record<string, number>;
  const monsters = monsterList();
  const resources = (() => {
    try {
      return [...catalog().resources.values()].sort((a, b) => a.skill.localeCompare(b.skill) || a.level - b.level);
    } catch {
      return [];
    }
  })();
  const recipes = (() => {
    try {
      return [...catalog().items.values()]
        .filter((i) => i.craft)
        .sort((a, b) => (a.craft!.skill || "").localeCompare(b.craft!.skill || "") || (a.craft!.level ?? 0) - (b.craft!.level ?? 0));
    } catch {
      return [];
    }
  })();
  const bank = [...bankItems.value].sort((a, b) => itemName(a.code).localeCompare(itemName(b.code)));
  const sellable = bank.filter((b) => npcForSell(b.code));

  const build = (): QueueItemInput | null => {
    switch (kind) {
      case "move": return { kind: "move", x, y };
      case "rest": return { kind: "rest" };
      case "fight": {
        const monster = code || monsters[0]?.code;
        // times 0 = fight forever; gear keeps the best bank set on either way.
        return monster ? { kind: "fight", monster, times: Math.max(0, times), done: 0, gear: true } : null;
      }
      case "gather": {
        const r = resources.find((o) => o.code === code) ?? resources[0];
        if (!r) return null;
        const drop = r.drops.find((d) => d.rate === 1) ?? r.drops[0];
        return { kind: "gather", code: drop?.code ?? r.code, resource: r.code, times: Math.max(0, times), done: 0, gear: true };
      }
      case "craft": {
        const rec = recipes.find((o) => o.code === code) ?? recipes[0];
        return rec ? { kind: "craft", code: rec.code, quantity: Math.max(1, times), done: 0, skill: rec.craft!.skill } : null;
      }
      case "withdraw": {
        const b = bank.find((o) => o.code === code) ?? bank[0];
        return b ? { kind: "withdraw", code: b.code, quantity: Math.max(1, times) } : null;
      }
      case "sell": {
        const b = sellable.find((o) => o.code === code) ?? sellable[0];
        return b ? { kind: "sell", code: b.code, quantity: Math.max(1, times), done: 0, npc: npcForSell(b.code)?.code } : null;
      }
      case "deposit-all": return { kind: "deposit-all" };
      case "gear": {
        const reset = gearReset || undefined;
        if (gearJob === "fight") {
          const monster = code || monsters[0]?.code;
          return monster ? { kind: "gear", job: { kind: "fight", monster }, reset } : null;
        }
        if (gearJob === "craft") return { kind: "gear", job: { kind: "craft" }, reset };
        return { kind: "gear", job: { kind: "gather", skill: gearJob }, reset };
      }
      case "deliver": return { kind: "deliver" };
      case "turn-in": return { kind: "turn-in" };
      default: return null;
    }
  };
  const draft = build();

  return (
    <div class="q-add-form">
      <select class="cp-refine-select" value={kind} onChange={(e) => { const k = sel(e); setKind(k); setCode(""); setTimes(k === "fight" ? 0 : 10); }}>
        {ADDABLE.map((o) => (
          <option key={o.kind} value={o.kind}>{o.label}</option>
        ))}
      </select>

      {kind === "move" && (
        <>
          <label class="q-field">x<input class="cat-num" type="number" value={x} onInput={(e) => setX(num(e))} /></label>
          <label class="q-field">y<input class="cat-num" type="number" value={y} onInput={(e) => setY(num(e))} /></label>
          <button
            class={"cat-btn" + (tilePick.value?.name === ch.name ? " buy" : "")}
            title="Click a map tile to set the destination"
            onClick={() => armTilePick(ch.name, `queue move for ${ch.name}`, (px, py) => { setX(px); setY(py); })}
          >
            ◎ Pick on map
          </button>
        </>
      )}

      {kind === "fight" && (
        <select class="cp-refine-select" value={code || monsters[0]?.code || ""} onChange={(e) => setCode(sel(e))}>
          {monsters.map((m) => (
            <option key={m.code} value={m.code}>{m.name} · Lv {m.level}</option>
          ))}
        </select>
      )}

      {kind === "gather" && (
        <select class="cp-refine-select" value={code || resources[0]?.code || ""} onChange={(e) => setCode(sel(e))}>
          {resources.map((r) => (
            <option key={r.code} value={r.code} disabled={(stats[`${r.skill}_level`] ?? 0) < r.level}>
              {r.name} · {titleCase(r.skill)} Lv {r.level}
            </option>
          ))}
        </select>
      )}

      {kind === "craft" && (
        <select class="cp-refine-select" value={code || recipes[0]?.code || ""} onChange={(e) => setCode(sel(e))}>
          {recipes.map((r) => (
            <option key={r.code} value={r.code} disabled={(stats[`${r.craft!.skill}_level`] ?? 0) < (r.craft!.level ?? 0)}>
              {r.name} · {titleCase(r.craft!.skill || "")} Lv {r.craft!.level ?? 0}
            </option>
          ))}
        </select>
      )}

      {kind === "withdraw" && (
        <select class="cp-refine-select" value={code || bank[0]?.code || ""} onChange={(e) => setCode(sel(e))}>
          {bank.map((b) => (
            <option key={b.code} value={b.code}>{itemName(b.code)} (×{b.quantity})</option>
          ))}
        </select>
      )}

      {kind === "sell" && (
        <select class="cp-refine-select" value={code || sellable[0]?.code || ""} onChange={(e) => setCode(sel(e))}>
          {sellable.map((b) => (
            <option key={b.code} value={b.code}>
              {itemName(b.code)} (×{b.quantity}) · {npcForSell(b.code)!.price}g
            </option>
          ))}
        </select>
      )}

      {(kind === "fight" || kind === "gather" || kind === "craft" || kind === "withdraw" || kind === "sell") && (
        <label class="q-field" title={kind === "fight" || kind === "gather" ? "0 = repeat forever (until stopped)" : undefined}>
          ×<input class="cat-num" type="number" min={kind === "fight" || kind === "gather" ? 0 : 1} value={times} onInput={(e) => setTimes(num(e))} />
        </label>
      )}

      {kind === "gear" && (
        <>
          <select class="cp-refine-select" value={gearJob} onChange={(e) => setGearJob(sel(e))}>
            <option value="fight">Fight a monster</option>
            <option value="mining">Mining</option>
            <option value="woodcutting">Woodcutting</option>
            <option value="fishing">Fishing</option>
            <option value="alchemy">Alchemy (gathering)</option>
            <option value="craft">Crafting (wisdom)</option>
          </select>
          {gearJob === "fight" && (
            <select class="cp-refine-select" value={code || monsters[0]?.code || ""} onChange={(e) => setCode(sel(e))}>
              {monsters.map((m) => (
                <option key={m.code} value={m.code}>{m.name} · Lv {m.level}</option>
              ))}
            </select>
          )}
          <label class="q-field" title="Deposit EVERYTHING first (inventory, gold, all worn gear), then wear the job set from the bank">
            <input type="checkbox" checked={gearReset} onChange={(e) => setGearReset((e.target as HTMLInputElement).checked)} />
            bank reset
          </label>
        </>
      )}

      <button class="cat-btn buy" disabled={!draft} onClick={() => { if (draft) { addItem(ch.name, withId(draft)); onDone(); } }}>
        Add
      </button>
      <button class="cat-btn" onClick={onDone}>Cancel</button>
    </div>
  );
}
