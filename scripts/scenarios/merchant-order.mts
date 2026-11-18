// The Nomadic Merchant standing order, end to end (audit B.4-1 was why it never
// bought anything): the 5-minute event poll finds a running queue, puts the
// trip ahead of its head — sell the golden eggs, buy the Lost World Maps the
// fleet lacks (two level-20 characters, none owned, 15,000 gold each) from bank
// gold + the sale, down to GOLD_FLOOR (20,000) — and the old head resumes.
import { merchantEvent, scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [
      { name: "Max", x: 2, y: 0, level: 20 }, // gathering at the copper rocks
      { name: "Ola", x: 0, y: 0, level: 20 }, // idle
    ],
    bank: { golden_egg: 5 }, // the merchant pays 1,000 each
    gold: 45_000, // 45,000 − 20,000 + 5,000 = two maps
    events: [merchantEvent("nomadic_merchant", 3, 2)],
  },
  async (t) => {
    t.queue("Max", [{ kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 0, done: 0 }]);
    await t.run({ until: () => t.calls("npc/buy").length > 0 && t.q("Max").items[0]?.kind === "gather" });

    const trip = t.calls().filter((c) => c.action !== "gathering").map((c) => [c.action, c.body]);
    t.eq(
      trip,
      [
        ["move", { x: 4, y: 1 }],
        ["bank/withdraw/item", [{ code: "golden_egg", quantity: 5 }]],
        ["move", { x: 3, y: 2 }],
        ["npc/sell", { code: "golden_egg", quantity: 5 }],
        ["move", { x: 4, y: 1 }],
        ["bank/withdraw/gold", { quantity: 25_000 }],
        ["move", { x: 3, y: 2 }],
        ["npc/buy", { code: "lost_world_map", quantity: 2 }],
      ],
      "the trip, in order",
    );
    t.eq(t.world.gold, 20_000, "bank gold left: GOLD_FLOOR");
    t.eq([t.inv("Max", "lost_world_map"), t.world.chars.get("Max")!.gold], [2, 0], "the maps are in the bag, the pocket is empty");
    t.eq(t.q("Max").items.map((i) => i.kind), ["gather"], "the old head is back");
  },
);
