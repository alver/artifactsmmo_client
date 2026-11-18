// Task 006: a target behind a free transition. Gold rocks exist only
// underground — (3, −5) and (5, −4), through Forest (5, −3) ↔ Mine (5, −3).
// A miner at the bank with a nearly full bag: walk, transition, gather, the bag
// fills, out through the transition to the bank, deposit, back in, finish —
// two transitions per round trip, and never a 598 (the automatic layer check).
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Ore", x: 4, y: 1, mining_level: 30, inventory_max_items: 10, bag: { copper_ore: 8 } }], // on the bank
  },
  async (t) => {
    t.world.yields.set("gold_rocks", [{ code: "gold_ore", quantity: 1 }]);
    t.queue("Ore", [
      { kind: "gather", code: "gold_ore", resource: "gold_rocks", times: 5, done: 0 },
      { kind: "deposit-all" },
    ]);
    await t.run();

    t.eq(t.q("Ore"), { items: [], running: false }, "the queue ran to the end");
    const into = [["move", { x: 5, y: -3 }], ["transition", undefined], ["move", { x: 5, y: -4 }]];
    const out = [["move", { x: 5, y: -3 }], ["transition", undefined], ["move", { x: 4, y: 1 }]];
    const gathers = (n: number) => Array(n).fill(["gathering", undefined]);
    t.eq(
      t.calls().map((c) => [c.action, c.body]),
      [
        ...into, ...gathers(2), // 8 + 2 = a full bag of 10
        ...out, ["bank/deposit/item", [{ code: "copper_ore", quantity: 8 }, { code: "gold_ore", quantity: 2 }]],
        ...into, ...gathers(3),
        ...out, ["bank/deposit/item", [{ code: "gold_ore", quantity: 3 }]], // the deposit-all item
      ],
      "walk, transition, walk, gather — out the same way, and back",
    );
    t.eq(t.calls("transition").length, 4, "two transitions per round trip, two round trips");
    t.ok(t.calls().every((c) => c.code === 200), "no call was refused");
    t.eq([t.bank("gold_ore"), t.bank("copper_ore")], [5, 8], "the bank holds the ore");
    const ore = t.world.chars.get("Ore")!;
    t.eq([ore.x, ore.y, ore.layer], [4, 1, "overworld"], "back on the bank, on the overworld");
  },
);
