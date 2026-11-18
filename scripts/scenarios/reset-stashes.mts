// A `gear` item with `reset` is an explicit "bank everything": the whole bag
// except `keep` and the pieces of the set, all pocket gold, every worn slot the
// set does not want. Unchanged by task 003.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [
      { name: "Mia", x: 2, y: 0, gold: 50, weapon_slot: "copper_dagger", bag: { copper_ore: 5, apple: 2, copper_pickaxe: 1 } }, // at the rocks
    ],
  },
  async (t) => {
    t.queue("Mia", [{ kind: "gear", job: { kind: "gather", skill: "mining" }, reset: true, keep: ["apple"] }]);
    await t.run();

    t.eq(t.q("Mia"), { items: [], running: false }, "the reset completed");
    const mia = t.world.chars.get("Mia")!;
    t.eq([mia.weapon_slot, mia.gold, t.world.gold], ["copper_pickaxe", 0, 50], "set worn; gold: pocket, bank");
    t.eq(mia.inventory.filter((s) => s.code).map((s) => [s.code, s.quantity]), [["apple", 2]], "the bag holds only what `keep` names");
    t.eq([t.bank("copper_ore"), t.bank("copper_dagger"), t.bank("copper_pickaxe")], [5, 1, 0], "bank: ore, the dagger that came off, no pickaxe");
  },
);
