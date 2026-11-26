// Task 029, D.2: the planner's train step from the bank — the fleet banked a batch of Battlestaffs (the fighters' wolf bones and
// slimeballs among it): Pia (owned, weaponcrafting 20) runs the step's train item, the one picker's recipe and its runs (code,
// runs): it withdraws, crafts and recycles, and never hunts; the item ends when its runs are made (the fake has no XP).
import { scenario } from "../harness/index.mts";
import { plannerOn } from "../../src/state/store";

await scenario(
  {
    characters: [{ name: "Pia", level: 28, x: 4, y: 1, weaponcrafting_level: 20 }],
    bank: { hardwood_plank: 24, steel_bar: 16, wolf_bone: 12, blue_slimeball: 20 }, // four Battlestaffs
    limits: { actions: 200, minutes: 60 },
  },
  async (t) => {
    t.queue("Pia", [{ kind: "train", skill: "weaponcrafting", toLevel: 0, levels: 1, gear: true, code: "battlestaff", runs: 4, done: 0 }]);
    plannerOn.value = { Pia: true };
    await t.run({ until: () => !t.q("Pia").running || !t.q("Pia").items.length });
    t.eq(t.q("Pia").items.length, 0, "the train item ends: its runs are made");
    const made = t.calls("crafting", "Pia").reduce((s, c) => s + ((c.body as { quantity?: number }).quantity ?? 1), 0);
    t.eq(made, 4, "four Battlestaffs crafted");
    t.ok(t.calls("recycling", "Pia").length >= 1, `the products recycled (${t.calls("recycling", "Pia").length} recycle actions)`);
    t.eq(t.calls("fight", "Pia").length, 0, "no hunt: the bank fed the batch");
    t.eq(t.calls("gathering", "Pia").length, 0, "no gather either");
  },
);
