// Task 008, settled point 6: a step whose target vanishes before the first unit — the fight answers 598 twice,
// so runLoop skips the item (settled point 8) and the step ends with no unit done. That is a failed step: the
// pair is blocked like a stall, with the skip's reason. Without it the same step would be decided, skipped and
// decided again in a tight loop: fewer than four decisions in half an hour, and the brake never fires.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";

await scenario(
  {
    expect598: true, // the vanished target, on purpose
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }],
    bank: { copper_dagger: 1 },
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 40])],
    limits: { actions: 300, minutes: 60 },
  },
  async (t) => {
    t.world.fault({ who: "Pia", action: "fight", n: 2, code: 598, message: "Monster not found on this map." });
    await t.run({ minutes: 30 });
    const b = planner.value.blocked["ach:chicken_hunt:0@Pia"];
    t.eq(b?.why, "ended empty: Fight 40× Chicken — Monster not found on this map. — twice in a row (code 598)", "blocked as ended empty, with the skip's reason");
    const decisions = planLines(t, "Pia").filter((l) => /^(ach|lvl|fallback):/.test(l));
    t.ok(decisions.length < 4, `fewer than four decisions: ${decisions.map((l) => l.split(" ")[0]).join(", ")}`);
    t.ok(!planLines(t, "Pia").some((l) => l.startsWith("flapping")), "the brake did not fire");
    t.eq(t.calls("fight", "Pia").map((c) => c.code), [598, 598], "two fights, both 598, then never again");
    t.ok(t.q("Pia").running && planner.value.current.Pia?.step.as === "fallback", "the fallback gather runs");
  },
);
