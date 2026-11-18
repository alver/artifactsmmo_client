// Task 008 (design C.4, "no idle character"): every target the character has is blocked before it boots. decide()
// still returns a step — the fallback gather chunk on the best node of its highest gathering skill — and it runs.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { T0 } from "../harness/clock.mts";
import { planner } from "../../src/state/planner";

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1, mining_level: 10 }],
    bank: { copper_dagger: 1 },
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 40]), achievement("ore_digger", 3, ["gathering", "iron_ore", 50])],
    setup: () => {
      const until = T0 + 6 * 3_600_000;
      planner.value = { ...planner.value, blocked: { "ach:chicken_hunt:0@Pia": { until, why: "test" }, "ach:ore_digger:0@Pia": { until, why: "test" } } };
    },
    limits: { actions: 300, minutes: 60 },
  },
  async (t) => {
    await t.run({ until: () => t.calls("gathering", "Pia").length >= 3 });
    const s = planner.value.current.Pia?.step;
    t.eq([s?.as, s?.target], ["fallback", "fallback:mining"], "the fallback chunk, on the highest gathering skill");
    t.ok(t.calls("gathering", "Pia").length >= 3 && t.q("Pia").running, "it gathers, the queue runs");
    t.ok(!t.calls().some((c) => c.action === "fight"), "nothing blocked was worked");
    t.ok(planLines(t, "Pia").some((l) => l.startsWith("fallback:mining@Pia#1 (fallback,")), "the dev log names the fallback");
  },
);
