// helper-ping-pong with enough raw material in the bank for a whole trip
// (6 bars = 60 iron ore, the bank holds 70): Fay refines banked ore without
// mining, delivers, and Eve crafts.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [
      { name: "Eve", x: 0, y: 1, weaponcrafting_level: 10, weapon_slot: "copper_dagger", inventory_max_items: 20 }, // on the chicken tile
      { name: "Fay", x: 4, y: 1, mining_level: 10 }, // on the bank
    ],
    bank: { iron_ore: 70 },
    limits: { actions: 400, minutes: 120 },
  },
  async (t) => {
    t.queue("Eve", [{ kind: "train", skill: "weaponcrafting", toLevel: 0, gear: true }]);
    t.queue("Fay", [{ kind: "train", skill: "weaponcrafting", toLevel: 0, gear: true, for: "Eve" }]);
    await t.run({ until: () => t.calls("crafting", "Eve").length > 0 });

    const fay = t.calls(undefined, "Fay");
    const delivered = fay.findIndex((c) => c.action === "bank/deposit/item");
    t.eq(
      fay.slice(0, delivered + 1).map((c) => [c.action, c.body]),
      [
        ["bank/withdraw/item", [{ code: "iron_ore", quantity: 60 }]],
        ["move", { x: 1, y: 5 }], // the mining workshop
        ["crafting", { code: "iron_bar", quantity: 6 }],
        ["move", { x: 4, y: 1 }],
        ["bank/deposit/item", [{ code: "iron_bar", quantity: 6 }]],
      ],
      "Fay's first trip: bank, workshop, bank — no mining",
    );
    t.eq(t.calls("crafting", "Eve")[0]?.body, { code: "iron_dagger", quantity: 1 }, "Eve crafts from the delivered bars");
  },
);
