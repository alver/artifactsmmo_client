// A gear swap is not a bank-off. Kim gathers with a half-full bag and passes
// through a tool swap on the bank tile: the pickaxe is put on, the ore she
// carries stays in the bag, and the bag is banked only when it is full.
// Before task 003 the swap swept the 5 ore into the bank first.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Kim", x: 4, y: 1, inventory_max_items: 10, bag: { copper_ore: 5 } }], // on the bank
    bank: { copper_pickaxe: 1 },
  },
  async (t) => {
    t.queue("Kim", [{ kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 8, done: 0, gear: true }]);
    await t.run();

    t.eq(t.q("Kim"), { items: [], running: false }, "the queue ran to the end");
    t.eq(
      t.calls().slice(0, 3).map((c) => [c.action, c.body]),
      [
        ["bank/withdraw/item", [{ code: "copper_pickaxe", quantity: 1 }]],
        ["equip", [{ code: "copper_pickaxe", slot: "weapon", quantity: 1 }]],
        ["move", { x: 2, y: 0 }],
      ],
      "the swap: withdraw, equip, off to the rocks — nothing deposited",
    );
    t.eq(t.calls("bank/deposit/item").map((c) => c.body), [[{ code: "copper_ore", quantity: 10 }]], "one deposit, of a full bag");
    t.eq(t.world.chars.get("Kim")!.weapon_slot, "copper_pickaxe", "the pickaxe is worn");
    t.eq([t.inv("Kim", "copper_ore"), t.bank("copper_ore")], [3, 10], "ore: bag, bank");
  },
);
