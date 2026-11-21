// Audit B.1 / B.4-2: a step's result is thrown away when the head changed
// under it. While the buy step is in flight (npc/buy answered, its cooldown not
// yet waited out) another writer inserts an item ahead (task 018: a `claim` with
// nothing to claim, the `move` item is gone). The buy item is then
// looked at again later — and must not buy a second time: the purchase is
// recorded on the item the moment it happens.
// Before task 003: bought twice.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Dan", x: 7, y: 13, gold: 25_000 }], // the rune vendor is next door at (8, 13)
  },
  async (t) => {
    t.queue("Dan", [{ kind: "buy", code: "healing_rune", quantity: 1, npc: "rune_vendor" }]); // 10,000 gold
    await t.run({ until: () => t.calls("npc/buy").length > 0 }); // stops inside the step, before its cooldown ends
    t.eq(t.q("Dan").items.map((i) => i.kind), ["buy"], "the buy is still the head");

    t.insert("Dan", { kind: "claim" });
    await t.run();

    t.eq(t.q("Dan"), { items: [], running: false }, "the queue ran to the end");
    t.eq(t.calls().map((c) => c.action), ["move", "npc/buy"], "the calls, in order");
    t.eq([t.inv("Dan", "healing_rune"), t.world.chars.get("Dan")!.gold], [1, 15_000], "one rune, one price paid");
  },
);
