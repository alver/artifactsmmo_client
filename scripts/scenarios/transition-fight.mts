// Task 006: a monster that lives only behind a free transition — rats, in the
// Abandoned House (interior (−3, 12) and (−2, 12), through Forest (−3, 12)).
// A fighter at the bank with a nearly full bag: walk, transition, fight, rest,
// fight, the bag fills, out to the bank, deposit, back in, finish.
import { scenario } from "../harness/index.mts";

const gold = { weapon_slot: "gold_sword", shield_slot: "gold_shield", helmet_slot: "gold_helm", body_armor_slot: "gold_platebody", leg_armor_slot: "gold_platelegs", boots_slot: "gold_boots" };

await scenario(
  {
    characters: [{ name: "Rex", x: 4, y: 1, level: 30, ...gold, inventory_max_items: 10, bag: { copper_ore: 8 } }], // on the bank
  },
  async (t) => {
    t.world.yields.set("rat", [{ code: "raw_rat_meat", quantity: 1 }]);
    t.queue("Rex", [
      { kind: "fight", monster: "rat", times: 4, done: 0, food: false },
      { kind: "deposit-all" },
    ]);
    await t.run();

    t.eq(t.q("Rex"), { items: [], running: false }, "the queue ran to the end");
    const into = ["move (-3,12)", "transition"]; // the transition lands on the rat tile
    // Out by route, not by coordinates: the bank at (7, 13) is 11 maps from Forest (−3, 12), the one at (4, 1) 18.
    const out = ["transition", "move (7,13)", "bank/deposit/item"];
    t.eq(
      t.calls().map((c) => (c.action === "move" ? `move (${(c.body as { x: number }).x},${(c.body as { y: number }).y})` : (c.note ?? c.action))),
      [...into, "win", "rest", "win", "rest", ...out, ...into, "win", "rest", "win", ...out],
      "walk, transition, fight with a rest in between — out the same way, and back",
    );
    t.eq(t.calls("transition").length, 4, "two transitions per round trip, two round trips");
    t.eq([t.bank("raw_rat_meat"), t.bank("copper_ore")], [4, 8], "the bank holds the loot");
    const rex = t.world.chars.get("Rex")!;
    t.eq([rex.x, rex.y, rex.layer], [7, 13, "overworld"], "on the nearer bank, on the overworld");
  },
);
