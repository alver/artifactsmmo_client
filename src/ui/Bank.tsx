import { bankDetails, bankItems } from "../state/store";
import { itemName } from "../catalog";
import { IMG } from "../lib/util";

const hideOnError = (e: Event) => {
  (e.target as HTMLImageElement).style.visibility = "hidden";
};

export function Bank() {
  const details = bankDetails.value;
  const items = bankItems.value;
  return (
    <section class="panel">
      <h3>
        Bank
        {details && (
          <span class="muted">
            {" "}
            🪙 {details.gold} · {items.length}/{details.slots}
          </span>
        )}
      </h3>
      <div class="inv bank-grid">
        {items.length === 0 && <span class="muted">empty</span>}
        {items.map((b) => (
          <div key={b.code} class="inv-item" title={`${itemName(b.code)} ×${b.quantity}`}>
            <img src={`${IMG}/items/${b.code}.png`} alt="" onError={hideOnError} />
            <span>×{b.quantity}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
