// A full bag at the bank and a set change that strips a slot: the swap banks
// exactly the room it needs — one ore for the dagger coming off, then the
// dagger itself for the pickaxe coming out — and completes.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Lee", x: 4, y: 1, inventory_max_items: 10, weapon_slot: "copper_dagger", bag: { copper_ore: 10 } }], // on the bank
    bank: { copper_pickaxe: 1 },
  },
  async (t) => {
    t.queue("Lee", [{ kind: "gear", job: { kind: "gather", skill: "mining" } }]);
    await t.run();

    t.eq(t.q("Lee"), { items: [], running: false }, "the swap completed");
    t.eq(
      t.calls().map((c) => [c.action, c.body]),
      [
        ["bank/deposit/item", [{ code: "copper_ore", quantity: 1 }]],
        ["unequip", [{ slot: "weapon", quantity: 1 }]],
        ["bank/deposit/item", [{ code: "copper_dagger", quantity: 1 }]],
        ["bank/withdraw/item", [{ code: "copper_pickaxe", quantity: 1 }]],
        ["equip", [{ code: "copper_pickaxe", slot: "weapon", quantity: 1 }]],
      ],
      "the calls, in order",
    );
    t.eq([t.inv("Lee", "copper_ore"), t.bank("copper_ore"), t.bank("copper_dagger")], [9, 1, 1], "ore in the bag, ore banked, dagger banked");
    t.eq(t.world.chars.get("Lee")!.weapon_slot, "copper_pickaxe", "the pickaxe is worn");
  },
);
