// Task 006: an item persisted before layers were stored carries x, y and no
// layer. It still runs, on the overworld — even when the character starts
// underground, where the same x, y is another tile: it walks out through the
// transition first.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Old", x: 5, y: -4, layer: "underground", mining_level: 30 }], // on the gold rocks, underground
  },
  async (t) => {
    // As a queue saved before 006 holds them: x, y only (a gather pinned to the copper rocks, a move).
    t.queue("Old", [
      { kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 1, done: 0, x: 2, y: 0 },
      { kind: "move", x: 4, y: 1 },
    ]);
    await t.run();

    t.eq(t.q("Old"), { items: [], running: false }, "the queue ran to the end");
    t.eq(
      t.calls().map((c) => [c.action, c.body]),
      [["move", { x: 5, y: -3 }], ["transition", undefined], ["move", { x: 2, y: 0 }], ["gathering", undefined], ["move", { x: 4, y: 1 }]],
      "out through the transition, then the overworld tiles",
    );
    t.eq(t.inv("Old", "copper_ore"), 1, "gathered on the overworld copper rocks");
    const old = t.world.chars.get("Old")!;
    t.eq([old.x, old.y, old.layer], [4, 1, "overworld"], "the move ended on the overworld");
  },
);
