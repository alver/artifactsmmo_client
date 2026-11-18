// Audit B.4-7 (logs/dev.log lines 776663–776672): a helper refining banked raw
// stock for a crafter, with the bank holding less than one trip needs.
// Eve trains weaponcrafting on iron (she hunts feathers for a sword until bars
// arrive, then the picker takes the dagger the banked bars cover); Fay helps
// with the bars — one trip is 6 bars = 60 iron ore, the bank holds 40.
// Before task 003: Fay withdrew the 40 ("withdraw Iron Ore"), the gather-gear
// step swept her bag at the bank ("stow gear"), and the two repeated forever.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [
      { name: "Eve", x: 0, y: 1, weaponcrafting_level: 10, weapon_slot: "copper_dagger", inventory_max_items: 20 }, // on the chicken tile
      { name: "Fay", x: 4, y: 1, mining_level: 10 }, // on the bank
    ],
    bank: { iron_ore: 40 },
    limits: { actions: 400, minutes: 120 },
  },
  async (t) => {
    t.queue("Eve", [{ kind: "train", skill: "weaponcrafting", toLevel: 0, gear: true }]);
    t.queue("Fay", [{ kind: "train", skill: "weaponcrafting", toLevel: 0, gear: true, for: "Eve" }]);
    await t.run({ until: () => t.calls("crafting", "Eve").length > 0 });

    const fay = t.calls(undefined, "Fay").map((c) => [c.action, c.body]);
    t.eq(fay[0], ["bank/withdraw/item", [{ code: "iron_ore", quantity: 40 }]], "Fay takes what the bank has");
    t.eq(t.calls("gathering", "Fay").length >= 20, true, "Fay mines the rest of the trip");
    t.eq(t.calls("crafting", "Fay")[0]?.body, { code: "iron_bar", quantity: 6 }, "Fay smelts one trip's load");
    t.ok(t.calls("bank/deposit/item", "Fay").some((c) => JSON.stringify(c.body).includes('"iron_bar","quantity":6')), "Fay delivers the bars");
    t.eq(t.calls("crafting", "Eve")[0]?.body, { code: "iron_dagger", quantity: 1 }, "Eve crafts from the delivered bars");
    // No withdrawal is put straight back: the automatic bounce check.
  },
);
