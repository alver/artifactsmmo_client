import { GEAR_SLOTS, slotCode } from "../types/api";
import type { Character } from "../types/api";
import { item } from "../catalog";
import { asset, assetFallback, slotLabel } from "../lib/util";

export function GearSlots({ ch }: { ch: Character }) {
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
                <img src={asset("items", code)} alt="" onError={assetFallback("items", code)} />
                <span class="slot-item">
                  {it?.name || code}
                  {qty > 1 ? ` ×${qty}` : ""}
                </span>
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
