// Task 014, settled point 5: running dry is the end of the step, not a failure. Pia wins green slimes only with small
// health potions; the bank holds 40 — the kill step plans 11 kills (3 a fight by the forecast, + a fifth) and takes all
// 40. The fights drink 4 each (forced), so the potions are gone after the 10th: the fight item ends there, the step is
// sampled with its 10 kills, nothing is blocked, and the next decision is made.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";

await scenario(
  {
    // task 025: at the potions' chain the supply of more (sunflowers, 1.92) outscores the kill step with the stock (1.52); the
    // objective first (⭐) keeps the scenario on running dry
    planner: { on: { Pia: true }, first: ["made_up_slimes"] },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1, alchemy_level: 5 }], // on the bank
    bank: { copper_dagger: 1, small_health_potion: 40 },
    achievements: [achievement("made_up_slimes", 5, ["combat_kill", "green_slime", 50])],
    limits: { actions: 600, minutes: 240 },
  },
  async (t) => {
    t.world.forceFight("Pia", ...Array.from({ length: 10 }, () => ({ result: "win" as const, used: { small_health_potion: 4 }, hpLost: 60 })));
    await t.run({ until: () => !!planner.value.current.Pia && !planner.value.current.Pia.step.key.startsWith("ach:made_up_slimes:0@Pia#1") });
    await t.run({ minutes: 1 });
    const plan = planLines(t, "Pia");
    const step = plan.find((l) => l.startsWith("ach:made_up_slimes:0@Pia#1 "));
    t.ok(!!step && step.includes("(objective, 11 units") && step.includes("with 40 Small Health Potion"), `the step planned 11 kills with the 40 potions: ${step}`);
    t.eq(t.calls("fight", "Pia").length, 10, "ten fights, then the potions were gone");
    t.ok(t.devlog().some((l) => l.includes("ran dry after 10 fights")), "the fight item ended there, with a line saying so");
    t.ok(plan.some((l) => l.startsWith("sample kill:green_slime ") && l.includes("(n=1,")), `the step was sampled: ${plan.filter((l) => l.startsWith("sample")).join(" | ")}`);
    t.ok(!plan.some((l) => /blocked|ended empty|flapping/.test(l)) && !t.q("Pia").items.some((i) => i.error), "nothing blocked, nothing paused");
    const next = planner.value.current.Pia?.step;
    t.ok(!!next && t.q("Pia").running, `the next decision was made: ${next?.key} — ${next?.why}`);
  },
);
