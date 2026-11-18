// Task 008: the planner's step loop on an open kill objective. Boot → the first achievements read → decide →
// the step's items (a bank reset into the fight set, fight ×units) → the step ends → the next step is queued
// and running, and at no check between two timers is the owned character without a running queue (the seam).
import { achievement, planLines, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }], // on the bank
    bank: { copper_dagger: 1 },
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 40])],
    limits: { actions: 1500, minutes: 300 },
  },
  async (t) => {
    let idle = 0;
    const second = (): boolean => !!planner.value.current.Pia?.step.key.endsWith("#2");
    await t.run({ until: () => (t.q("Pia").running ? false : ++idle > 0) || second() });
    t.eq(idle, 0, "the owned queue never stood still between two timers");
    const plan = planLines(t, "Pia");
    const first = plan.find((l) => l.startsWith("ach:chicken_hunt:0@Pia#1 "));
    t.ok(first?.includes("(objective, 40 units"), `the first step: 40 chicken kills for the objective — ${first}`);
    const fights = t.calls("fight", "Pia");
    t.eq([fights.length, fights.every((c) => c.note === "win")], [40, true], "the step fought its 40 units, every one a win");
    t.ok(t.calls("equip", "Pia").some((c) => JSON.stringify(c.body).includes("copper_dagger")), "the reset put the bank's dagger on");
    const q = t.q("Pia");
    t.ok(q.running && q.items.length > 0 && q.items.every((it) => it.id.startsWith("pl:ach:chicken_hunt:0@Pia#2:")), `the next step is queued and running: ${q.items.map((i) => i.id)}`);
    t.ok(t.world.reads.filter((r) => r.endsWith("/achievements")).length === 2, "one read at boot, one when the objective's step ended");
    t.ok(!plan.some((l) => /flapping|blocked|found stopped/.test(l)), "no brake, no block, no stopped queue");
  },
);
