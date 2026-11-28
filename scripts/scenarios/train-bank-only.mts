// Task 039b (A.2): a fighter's training is a batch from the bank only — Pia (owned, combat 28, weaponcrafting 20; a set in the bank
// that wins the wolf, as train-hunt-eats has it) runs a train item with `bank` for five Battlestaffs while the bank holds no Wolf
// Bones: it never hunts the wolf (train-hunt-eats, the same item without `bank`, does), and the item ends — the fleet supplies the
// bones and the planner decides again.
import { scenario } from "../harness/index.mts";
import { plannerOn } from "../../src/state/store";

await scenario(
  {
    characters: [{ name: "Pia", level: 28, x: 4, y: 1, weaponcrafting_level: 20 }],
    bank: {
      hardwood_plank: 30, steel_bar: 20, blue_slimeball: 25, // Battlestaffs but their Wolf Bones
      skull_staff: 1, slime_shield: 1, piggy_helmet: 1, piggy_armor: 1, piggy_pants: 1, steel_boots: 1, skull_ring: 1, steel_ring: 1, ruby_amulet: 1,
      cooked_trout: 200,
    },
    limits: { actions: 200, minutes: 60 },
  },
  async (t) => {
    t.queue("Pia", [{ kind: "train", skill: "weaponcrafting", toLevel: 0, levels: 1, gear: true, code: "battlestaff", runs: 5, done: 0, bank: true }]);
    plannerOn.value = { Pia: true };
    t.world.forceFight("Pia", ...Array.from({ length: 3 }, () => ({ result: "win" as const, hpLost: 280, drops: [{ code: "wolf_bone", quantity: 1 }] })));
    await t.run({ until: () => t.calls("fight", "Pia").length >= 1 || !t.q("Pia").running || !t.q("Pia").items.length });
    t.eq(t.q("Pia").items.length, 0, "the train item ends: no Wolf Bone in the bank");
    t.eq(t.calls("fight", "Pia").length, 0, "no hunt for the bones");
    t.eq(t.calls("gathering", "Pia").length, 0, "no gather either");
  },
);
