// Task 008, section 7: switched off in the middle of a step. No `pl:` item is left, the queue is empty and
// stopped, blocks and costs are kept. Task 018, settled point 2: a character whose planner is off gets no item from
// anyone — half an hour later the queue is still empty and stopped, and Pia has not acted.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { planner, setPlannerConfig } from "../../src/state/planner";

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }],
    bank: { copper_dagger: 1 },
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 40])],
    limits: { actions: 300, minutes: 60 },
  },
  async (t) => {
    await t.run({ until: () => t.calls("fight", "Pia").length >= 3 });
    const done = t.q("Pia").items.find((it) => it.kind === "fight");

    setPlannerConfig({ on: { Pia: false } });
    await t.run({ until: () => !t.q("Pia").running });
    t.eq(t.q("Pia"), { items: [], running: false }, "no pl: item left; the queue is empty and stopped");
    t.eq(planner.value.current.Pia, undefined, "no current step");
    t.ok(done?.kind === "fight" && done.done >= 2, "it was mid-step");

    await t.run({ minutes: 1 }); // the in-flight action drains
    const acted = t.calls(undefined, "Pia").length;
    await t.run({ minutes: 30 });
    t.eq(t.q("Pia"), { items: [], running: false }, "half an hour later: nobody wrote to the queue");
    t.eq(t.calls(undefined, "Pia").length, acted, "and Pia stood still: no action");
    t.ok(planLines(t, "Pia").some((l) => l.startsWith("handed back")), "the hand-back is in the dev log");
    t.eq(planner.value.config.on, { Pia: false }, "the patch over the defaults holds Pia: false");
  },
);
