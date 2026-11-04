// Seasonal offerings UI (season 9's Seasonal Altar): the Fleet tab's 🛐 section
// (today's offerings per character + queueing) and the altar tile's drawer body
// (accept / complete by hand for the character standing there).
//
// Reads: today's state is fetched once per character per UTC day (on first
// show, or ↻) — the accept/complete echoes keep it current after that.

import { useEffect, useState } from "preact/hooks";
import { characterList, characters, offerings } from "../state/store";
import { categoryLevel, loadOfferings, offeringSlots, todayOfferings } from "../state/offerings";
import { addItem, queues } from "../state/queue";
import { withId } from "../plan/queue";
import { itemName, monster, resource } from "../catalog";
import { asset, assetFallback, titleCase } from "../lib/util";
import { itemHover } from "./ItemPopup";
import { DataTable } from "./DataTable";
import * as actions from "../api/actions";
import type { ActionRunner } from "./useAction";
import type { Col } from "./DataTable";
import type { OfferingSlot } from "../state/offerings";
import type { Character, OfferingFavor } from "../types/api";

const invQty = (c: Character, code: string): number => (c.inventory || []).reduce((s, it) => s + (it.code === code ? it.quantity : 0), 0);
const hasOfferingItem = (name: string): boolean => !!queues.value[name]?.items.some((it) => it.kind === "offering");

/** Put an offering item next in line (right behind a running head). */
export function queueOfferings(name: string): void {
  if (!hasOfferingItem(name)) addItem(name, withId({ kind: "offering" }), 0);
}

const favorText = (f?: OfferingFavor): string =>
  !f ? "" : `${f.target_type === "monster" ? (monster(f.target_code)?.name ?? titleCase(f.target_code)) : f.target_type === "resource" ? (resource(f.target_code)?.name ?? titleCase(f.target_code)) : `crafting ${itemName(f.target_code)}`} ×${f.xp_multiplier} xp${f.drop_multiplier > 1 ? ` ×${f.drop_multiplier} drops` : ""}`;

function Requirement({ ch, slot }: { ch: Character; slot: OfferingSlot }) {
  if (!slot.requirement) return <span class="muted small">no offering at Lv {categoryLevel(ch, slot.category)}</span>;
  const { code, quantity } = slot.requirement;
  const held = invQty(ch, code);
  return (
    <span class={"chip" + (slot.status === "accepted" && held < quantity ? " short" : "")} title={favorText(slot.favor)} {...itemHover(code)}>
      <img class="dt-icon" src={asset("items", code)} alt="" onError={assetFallback("items", code)} />
      {quantity}× {itemName(code)}
      {slot.status === "accepted" && <span class="chip-have">{held}/{quantity}</span>}
    </span>
  );
}

function Status({ slot }: { slot: OfferingSlot }) {
  if (slot.status === "done") return <span class="pill ok">✓{slot.xp ? ` +${slot.xp.toLocaleString()} xp` : " done"}</span>;
  if (slot.status === "accepted") return <span class="pill warn" title="Favor active until reset — hand over the requirement to complete">favor on</span>;
  if (slot.status === "open") return <span class="pill">open</span>;
  return null;
}

/** Fetch today's state for these characters (skips the ones already fresh). */
function useLoad(names: string[]): { loading: boolean; error: string | null; load: (force?: boolean) => void } {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = (force = false) => {
    const todo = names.filter((n) => force || !todayOfferings(n));
    if (!todo.length || loading) return;
    setLoading(true);
    setError(null);
    Promise.all(todo.map((n) => loadOfferings(n)))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  };
  useEffect(() => load(), [names.join(",")]);
  return { loading, error, load };
}

/** Fleet tab section: today's offerings, one row per character. */
export function OfferingsSection() {
  const chars = characterList();
  const { loading, error, load } = useLoad(chars.map((c) => c.name));
  offerings.value; // subscribe — rows re-render on every accept/complete echo
  const st = chars.map((c) => todayOfferings(c.name)).find(Boolean);
  const cats = st ? ["combat", ...st.skills] : [];

  const cols: Col<Character>[] = [
    { label: "Character", width: "130px", sort: (c) => c.name, cell: (c) => <b>{c.name}</b> },
    ...cats.map((cat, i): Col<Character> => ({
      label: titleCase(cat),
      width: "minmax(200px, 1fr)",
      cell: (c) => {
        const mine = todayOfferings(c.name);
        if (!mine) return <span class="muted small">not loaded</span>;
        const slot = offeringSlots(c, mine)[i];
        return (
          <div class="chips">
            <Requirement ch={c} slot={slot} />
            <Status slot={slot} />
          </div>
        );
      },
    })),
    {
      label: "",
      width: "110px",
      align: "right",
      cell: (c) => {
        const mine = todayOfferings(c.name);
        const left = mine ? offeringSlots(c, mine).some((s) => s.status === "open" || s.status === "accepted") : false;
        if (hasOfferingItem(c.name)) return <span class="muted small">queued</span>;
        return (
          <button class="cat-btn buy" disabled={!left} title="Queue today's offerings next for this character" onClick={() => queueOfferings(c.name)}>
            ＋ Queue
          </button>
        );
      },
    },
  ];

  const queueAll = () => {
    for (const c of chars) {
      const mine = todayOfferings(c.name);
      if (mine && offeringSlots(c, mine).some((s) => s.status === "open" || s.status === "accepted")) queueOfferings(c.name);
    }
  };

  return (
    <>
      <p class="muted small">
        Each character can accept one offering per category a day at the Seasonal Altar (its favor gives ×1.5 xp, and ×1.5 drops on
        monsters and resources, until reset), then complete it by handing over the items for {st ? `${st.xp_reward_percent}%` : "a share"} of
        a level's xp. Completed offerings count toward the favor achievements (Altar Doll, Altar Totem).
        {st && ` Next rotation at ${new Date(st.expires_at).toLocaleTimeString()}.`}
      </p>
      <DataTable
        rows={chars}
        cols={cols}
        rowKey={(c) => c.name}
        toolbar={
          <>
            <button class="cat-btn" disabled={loading} title="Re-read today's offerings for every character (one read each)" onClick={() => load(true)}>
              {loading ? "Loading…" : "↻"}
            </button>
            <button class="cat-btn buy" disabled={!st} title="Queue today's offerings next on every character that has some left" onClick={queueAll}>
              ＋ Queue for all
            </button>
            {error && <span class="bad-text small">{error}</span>}
          </>
        }
      />
    </>
  );
}

/** Altar drawer body: the actor's offerings with Accept / Complete buttons. */
export function AltarPanel({ actor, ctl }: { actor?: Character; ctl: ActionRunner }) {
  const name = actor?.name ?? "";
  const { loading, error } = useLoad(actor ? [name] : []);
  offerings.value; // subscribe to echoes
  if (!actor) return <div class="cat-empty">Move a character here to make offerings.</div>;
  const st = todayOfferings(name);
  if (!st) return <div class="cat-empty">{loading ? "Loading today's offerings…" : (error ?? "No offerings loaded.")}</div>;
  const ch = characters.value[name] ?? actor;

  return (
    <>
      <div class="cat-count">
        Today: combat · {st.skills.map(titleCase).join(" · ")} — next rotation at {new Date(st.expires_at).toLocaleTimeString()}
      </div>
      {offeringSlots(ch, st).map((s) => (
        <div key={s.category} class="task-current">
          <div class="task-name">
            <b>{titleCase(s.category)}</b> <span class="muted">· Lv {categoryLevel(ch, s.category)}</span> <Status slot={s} />
          </div>
          <div class="chips">
            <Requirement ch={ch} slot={s} />
          </div>
          {s.favor && <div class="muted small">Favor: {favorText(s.favor)}</div>}
          <div class="cat-trade-actions">
            {s.status === "open" && (
              <button class="cat-btn buy" disabled={ctl.disabled} onClick={() => ctl.run(() => actions.acceptOffering(name, s.id!))}>
                Accept
              </button>
            )}
            {s.status === "accepted" && (
              <button
                class="cat-btn craft"
                disabled={ctl.disabled || invQty(ch, s.requirement!.code) < s.requirement!.quantity}
                title={`Hand over ${s.requirement!.quantity}× ${itemName(s.requirement!.code)}`}
                onClick={() => ctl.run(() => actions.completeOffering(name, s.id!))}
              >
                Complete
              </button>
            )}
          </div>
        </div>
      ))}
      <button class="cat-btn" disabled={hasOfferingItem(name)} title="Let the queue do today's offerings (accept, farm, complete)" onClick={() => queueOfferings(name)}>
        {hasOfferingItem(name) ? "Offerings queued" : `＋ Queue offerings for ${name}`}
      </button>
    </>
  );
}
