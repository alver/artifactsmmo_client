// The Nomadic Merchant standing order and a character the planner does not own (task 018, settled point 2): a
// merchant spawns while Max works a hand-written queue — no trip is put ahead of its head, nothing is sold or
// bought, the bank stays as it was, and the queue goes on. (The planner's characters: planner-merchant.)
import { merchantEvent, scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [
      { name: "Max", x: 2, y: 0, level: 20 }, // gathering at the copper rocks
      { name: "Ola", x: 0, y: 0, level: 20 }, // idle
    ],
    bank: { golden_egg: 5 }, // the merchant pays 1,000 each
    gold: 45_000, // 45,000 − 20,000 + 5,000 = two maps, were anyone sent
    events: [merchantEvent("nomadic_merchant", 3, 2)],
  },
  async (t) => {
    t.queue("Max", [{ kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 20, done: 0 }]);
    await t.run();

    t.eq(t.calls().filter((c) => c.action !== "gathering").map((c) => c.action), [], "no trip: only the gathers");
    t.eq([t.calls("npc/sell").length, t.calls("npc/buy").length], [0, 0], "nothing sold, nothing bought");
    t.eq([t.world.gold, t.bank("golden_egg")], [45_000, 5], "the bank as it was");
    t.eq(t.calls("gathering", "Max").length, 20, "the queue went on");
  },
);
