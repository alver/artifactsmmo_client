// Task 015, settled point 1, for a character the planner does not own: Bo's bag is full of copper ore (the bank holds a
// stack) and feathers (it holds none), the bank is full and the engine read a free slot at boot. Its gather item meets
// the full bag: the bank-off's deposit answers 462, the ore goes in alone, the feathers stay, the item goes on and
// gathers its five; the deposit-all after it banks the ore and leaves the feathers (twice in a row: no 462, no bounce).
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Bo", level: 1, x: 4, y: 1, bag: { copper_ore: 90, feather: 10 } }], // on the bank, the bag full (100)
    bank: { copper_ore: 50, ash_wood: 5 },
    slots: 3,
    limits: { actions: 200, minutes: 60 },
  },
  async (t) => {
    t.world.slots = 2; // the free slot is gone before Bo deposits: the engine's slots are stale
    const gather = { kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 5, done: 0 } as const;
    t.queue("Bo", [gather, { kind: "deposit-all" }, gather, { kind: "deposit-all" }]);
    await t.run();
    const deps = t.calls("bank/deposit/item", "Bo");
    t.eq(deps.map((c) => c.code), [462, 200, 200, 200], "one 462, then the ore alone at each deposit");
    t.ok(deps.slice(1).every((c) => !JSON.stringify(c.body).includes("feather")), "the feathers are not offered again");
    t.eq(t.calls("gathering", "Bo").length, 10, "both gather items did their five");
    t.eq([t.inv("Bo", "feather"), t.inv("Bo", "copper_ore"), t.bank("copper_ore")], [10, 0, 150], "the feathers stay, the ore is banked");
    t.ok(!t.q("Bo").items.length && !t.q("Bo").running, "the queue ran to its end, nothing paused");
  },
);
