import { GEAR_SLOTS, slotCode } from "../types/api";
import type { Character } from "../types/api";
import { item } from "../catalog";
import { asset, assetFallback, slotLabel } from "../lib/util";
import * as actions from "../api/actions";
import { useActionRunner } from "./useAction";
import { itemHover } from "./ItemPopup";

export function GearSlots({ ch }: { ch: Character }) {
  const ctl = useActionRunner(ch);
  return (
    <div class="gear">
      {GEAR_SLOTS.map((slot) => {
        const code = slotCode(ch, slot);
        const it = code ? item(code) : undefined;
        const qty =
          slot === "utility1"
            ? ch.utility1_slot_quantity
            : slot === "utility2"
              ? ch.utility2_slot_quantity
              : 0;
        return (
          <div key={slot} class={"slot" + (code ? " filled" : " empty")} title={it?.name || code || slotLabel(slot)}>
            <span class="slot-label">{slotLabel(slot)}</span>
            {code ? (
              <span class="slot-body">
                <img class="info-hover" src={asset("items", code)} alt="" onError={assetFallback("items", code)} {...itemHover(code)} />
                <span class="slot-item info-hover" {...itemHover(code)}>
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
              </span>
            ) : (
              <span class="slot-item muted">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
