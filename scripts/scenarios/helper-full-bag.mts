// A helper that starts its trip with a bag nearly full of unrelated loot: the
// 5 iron ore that still fit are raw material it is about to refine, so the
// full-bag bank-off deposits the loot and keeps the ore.
// Before task 003 it banked the ore with the loot and withdrew it again.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [
      { name: "Eve", x: 0, y: 1, weaponcrafting_level: 10, weapon_slot: "copper_dagger", inventory_max_items: 20 }, // on the chicken tile
      { name: "Fay", x: 4, y: 1, mining_level: 10, bag: { golden_egg: 95 } }, // on the bank, 5 of 100 free
    ],
    bank: { iron_ore: 40 },
    limits: { actions: 400, minutes: 120 },
  },
  async (t) => {
    t.queue("Eve", [{ kind: "train", skill: "weaponcrafting", toLevel: 0, gear: true }]);
    t.queue("Fay", [{ kind: "train", skill: "weaponcrafting", toLevel: 0, gear: true, for: "Eve" }]);
    await t.run({ until: () => t.calls("crafting", "Fay").length > 0 });

    const bank = t.calls(undefined, "Fay").filter((c) => c.action.startsWith("bank/")).map((c) => [c.action, c.body]);
    t.eq(
      bank,
      [
        ["bank/withdraw/item", [{ code: "iron_ore", quantity: 5 }]],
        ["bank/deposit/item", [{ code: "golden_egg", quantity: 95 }]],
        ["bank/withdraw/item", [{ code: "iron_ore", quantity: 35 }]],
      ],
      "Fay's bank calls: the loot goes, the ore stays",
    );
    t.eq(t.calls("crafting", "Fay")[0]?.body, { code: "iron_bar", quantity: 6 }, "Fay smelts one trip's load");
  },
);
