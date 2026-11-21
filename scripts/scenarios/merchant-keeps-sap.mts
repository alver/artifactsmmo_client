// Task 015, settled point 6: nothing a recipe can use is sold. A Timber Merchant spawns while 575 sap lies in the bank
// (the bank of 23:32:55 UTC on 11-20; the old floor of 300 sold 275): the standing order has nothing to trade — no
// trip, no `sell` item, no sale — and the running queue goes on.
import { merchantEvent, scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Max", x: 2, y: 0, level: 20 }], // gathering at the copper rocks
    bank: { sap: 575, ash_wood: 123 },
    gold: 231_984,
    events: [merchantEvent("timber_merchant", 3, 2)],
    limits: { actions: 100, minutes: 30 },
  },
  async (t) => {
    t.queue("Max", [{ kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 20, done: 0 }]);
    await t.run();
    t.eq(t.calls("npc/sell").length, 0, "nothing sold");
    t.eq(t.calls().filter((c) => c.action !== "gathering").map((c) => c.action), [], "no trip: only the gathers");
    t.eq(t.bank("sap"), 575, "the sap stays in the bank");
    t.eq(t.calls("gathering", "Max").length, 20, "the queue went on");
  },
);
