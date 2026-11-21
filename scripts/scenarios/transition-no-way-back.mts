// Task 017, settled point 6: nobody waits behind a paid transition. Ida stands on Sandwhisper Isle with an empty pocket
// (the boat back costs 1,000; the isle's bank is closed until secure_the_island) and the bank's gold is not hers to reach.
// Her step's items cannot route off the isle: each ends with one line (a skip, as a BankFullError ends an item), never a
// pause, and the planner decides again.
import { achievement, planLines, scenario } from "../harness/index.mts";

await scenario(
  {
    planner: { on: { Ida: true } },
    characters: [{ name: "Ida", level: 10, mining_level: 5, x: -3, y: 20, gold: 0 }], // on the isle, by the palms
    gold: 50_000,
    achievements: [achievement("made_up_ore", 5, ["gathering", "copper_ore", 30])],
    limits: { actions: 200, minutes: 40 },
  },
  async (t) => {
    await t.run({ minutes: 30 });
    const steps = t.journal("step");
    t.ok(steps.length >= 2, `the planner decided again after the step ended: ${steps.map((s) => s.key).join(", ")}`);
    const skips = t.devlog().filter((l) => l.includes("Ida queue: skipped"));
    t.ok(skips.length >= 2 && skips.every((l) => /cannot pass now/.test(l)), `each item ended with one line naming the transition: ${skips.slice(0, 2).join(" | ")}`);
    t.ok(!t.journal("pause").length && !t.q("Ida").items.some((it) => it.error), "never a pause");
    t.eq(t.calls("transition", "Ida").length, 0, "no transition was tried without the fare");
    t.ok(!planLines(t, "Ida").some((l) => l.startsWith("no step")), "a step every time");
  },
);
