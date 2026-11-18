// A craft ×3 whose materials are in the bank: withdraw, walk to the workshop, craft, done.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Bea", x: 0, y: 0 }], // bank (4, 1), weaponcrafting workshop (2, 1)
    bank: { copper_bar: 20 },
  },
  async (t) => {
    t.queue("Bea", [{ kind: "craft", code: "copper_dagger", quantity: 3, done: 0 }]); // 6 copper bars each
    await t.run();

    t.eq(t.q("Bea"), { items: [], running: false }, "the queue ran to the end");
    t.eq(
      t.calls().map((c) => [c.action, c.body]),
      [
        ["move", { x: 4, y: 1 }],
        ["bank/withdraw/item", [{ code: "copper_bar", quantity: 18 }]],
        ["move", { x: 2, y: 1 }],
        ["crafting", { code: "copper_dagger", quantity: 3 }],
      ],
      "the calls, in order",
    );
    t.eq(t.inv("Bea", "copper_dagger"), 3, "daggers in the bag");
    t.eq(t.inv("Bea", "copper_bar"), 0, "bars left in the bag");
    t.eq(t.bank("copper_bar"), 2, "bars left in the bank");
  },
);
