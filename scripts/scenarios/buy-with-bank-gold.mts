// Audit B.4-1: a `buy` whose gold is in the bank. Pocket gold is swept into the
// bank on every deposit, so this is the normal case.
// Before task 003: the gold was withdrawn, no npc/buy call was made, the item reported done.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Dan", x: 7, y: 13, gold: 0 }], // on a bank; the rune vendor is next door at (8, 13)
    gold: 25_000,
  },
  async (t) => {
    t.queue("Dan", [{ kind: "buy", code: "healing_rune", quantity: 1, npc: "rune_vendor" }]); // 10,000 gold
    await t.run();

    t.eq(t.q("Dan"), { items: [], running: false }, "the queue ran to the end");
    t.eq(t.calls("npc/buy").map((c) => c.body), [{ code: "healing_rune", quantity: 1 }], "npc/buy calls");
    t.eq(t.inv("Dan", "healing_rune") + t.bank("healing_rune"), 1, "the rune is in the bag or the bank");
    t.eq(t.world.gold + t.world.chars.get("Dan")!.gold, 15_000, "gold left, bank + pocket");
  },
);
