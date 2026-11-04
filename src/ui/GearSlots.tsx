import { GEAR_SLOTS, slotCode } from "../types/api";
import type { Character } from "../types/api";
import { item } from "../catalog";
import { asset, assetFallback, slotLabel } from "../lib/util";
import * as actions from "../api/actions";
import { useActionRunner } from "./useAction";
import { itemHover } from "./ItemPopup";

/** Worn gear as a list — one row per filled slot, the empty ones collapsed into a single line. */
export function GearSlots({ ch }: { ch: Character }) {
  const ctl = useActionRunner(ch);
  const empty = GEAR_SLOTS.filter((s) => !slotCode(ch, s));
  return (
    <div class="gear-list">
      {GEAR_SLOTS.filter((s) => slotCode(ch, s)).map((slot) => {
        const code = slotCode(ch, slot);
        const it = item(code);
        const qty = slot === "utility1" ? ch.utility1_slot_quantity : slot === "utility2" ? ch.utility2_slot_quantity : 0;
        return (
          <div key={slot} class="gear-row">
            <span class="gear-slot">{slotLabel(slot)}</span>
            <img class="info-hover" src={asset("items", code)} alt="" onError={assetFallback("items", code)} {...itemHover(code)} />
            <span class="gear-item info-hover" {...itemHover(code)}>
              {it?.name || code}
              {qty > 1 ? ` ×${qty}` : ""}
            </span>
            <button
              class="slot-unequip"
              title={`Unequip ${it?.name || code}`}
              disabled={ctl.disabled}
              onClick={() => ctl.run(() => actions.unequip(ch.name, slot, qty > 1 ? qty : 1))}
            >
              ✕
            </button>
          </div>
        );
      })}
      {empty.length > 0 && <div class="gear-empty muted">Empty: {empty.map(slotLabel).join(" · ")}</div>}
    </div>
  );
}
