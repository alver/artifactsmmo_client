// Task 008, section 4: a step whose counter does not move. The first fight is forced to last 1,000 turns
// (2,000 s of cooldown): the fight item is the head, the queue runs, and `done` stays at 0. After 20 minutes of
// running time (max(20 min, 5 × the unit estimate)) the 5-minute tick replaces the step and blocks the pair for
// 6 h as "stalled"; the next step is queued behind the fight still in flight and runs when it lands.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { T0 } from "../harness/clock.mts";
import { planner } from "../../src/state/planner";

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }],
    bank: { copper_dagger: 1 },
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 40])],
    limits: { actions: 300, minutes: 90 },
  },
  async (t) => {
    t.world.forceFight("Pia", { result: "win", turns: 1000 });
    await t.run({ until: () => !!planner.value.blocked["ach:chicken_hunt:0@Pia"] });
    const fightAt = T0 + t.calls("fight", "Pia")[0].t;
    const b = planner.value.blocked["ach:chicken_hunt:0@Pia"];
    t.ok(/^stalled: its counter still for 2\d min of running/.test(b.why), `blocked as stalled, the why says what stood still and how long (task 027f): ${b.why}`);
    t.ok(Date.now() - fightAt >= 20 * 60_000 && Date.now() - fightAt <= 26 * 60_000, `replaced 20–25 minutes into the stuck fight (${((Date.now() - fightAt) / 60_000).toFixed(1)} min)`);
    t.ok(b.until - Date.now() > 5.9 * 3_600_000, "for 6 hours");
    t.eq(planner.value.current.Pia?.step.as, "fallback", "the next step is the fallback gather (the only objective is blocked)");
    t.ok(t.q("Pia").running && t.q("Pia").items.every((it) => it.id.startsWith("pl:fallback:")), "queued, the queue running");
    await t.run({ until: () => t.calls("gathering", "Pia").length > 0 });
    t.eq(t.calls("fight", "Pia").length, 1, "the stuck fight landed; no other fight");
    t.ok(planLines(t, "Pia").some((l) => l.startsWith("blocked ach:chicken_hunt:0 6 h — stalled: ")), "the dev-log line");
  },
);
