// Task 008, section 7: switched off in the middle of a step. No `pl:` item is left, the queue is empty and
// stopped, the hive's opt-out list is as it was before the planner (the planner put Pia there, so Pia leaves it),
// blocks and costs are kept — and the queue is Alex's again: addItem and startQueue work.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { withId } from "../../src/plan/queue";
import { planner, setPlannerConfig } from "../../src/state/planner";
import { hive } from "../../src/state/hive";
import { addItem, startQueue } from "../../src/state/queue";

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
    t.ok(hive.value.manual.includes("Pia"), "while on, Pia is on the hive's opt-out list");
    const done = t.q("Pia").items.find((it) => it.kind === "fight");

    setPlannerConfig({ on: { Pia: false } });
    await t.run({ until: () => !t.q("Pia").running });
    t.eq(t.q("Pia"), { items: [], running: false }, "no pl: item left; the queue is empty and stopped");
    t.ok(!hive.value.manual.includes("Pia") && !planner.value.optedOut.includes("Pia"), "off the opt-out list again, as before the planner");
    t.eq(planner.value.current.Pia, undefined, "no current step");
    t.ok(done?.kind === "fight" && done.done >= 2, "it was mid-step");

    addItem("Pia", withId({ kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 2, done: 0 }));
    startQueue("Pia");
    await t.run();
    t.eq(t.inv("Pia", "copper_ore"), 2, "addItem and startQueue work again: Alex's item ran");
    await t.run({ minutes: 1 });
    t.ok(planLines(t, "Pia").some((l) => l.startsWith("handed back")), "the hand-back is in the dev log");
    t.eq(planner.value.config.on, { Pia: false }, "the patch over the defaults holds Pia: false");
  },
);
