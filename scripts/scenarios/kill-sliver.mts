// Task 017, settled point 13: no kill step for a sliver. First ran two kill steps of one vampire each (11:45 and 11:49 UTC
// on 11-21, 263 s and 231 s for a fight of about 40 s) because Second's step held 84 of the minor health potions. Pia wins
// green slimes only with small health potions; 30 kills are open, the bank holds 10 potions — two kills' worth, under a
// third of the chunk: the kill is no candidate, and the potions' need comes first (a supply step for them).
import { achievement, scenario } from "../harness/index.mts";

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1, alchemy_level: 5 }], // on the bank
    bank: { copper_dagger: 1, small_health_potion: 10 },
    achievements: [achievement("made_up_slimes", 5, ["combat_kill", "green_slime", 30])],
    limits: { actions: 400, minutes: 60 },
  },
  async (t) => {
    await t.run({ until: () => t.journal("step").length >= 1, minutes: 5 });
    const first = t.journal("step")[0];
    t.ok(!!first && !String(first.key).startsWith("ach:made_up_slimes") && first.as === "supply", `no kill step for two kills; the potions' supply first: ${first?.key} — ${first?.why}`);
    t.ok(/Small Health Potion/.test(String(first?.why)), `for the small health potions: ${first?.why}`);
    t.eq(t.calls("fight", "Pia").length, 0, "no fight");
  },
);
