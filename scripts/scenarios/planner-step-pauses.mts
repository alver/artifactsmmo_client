// Task 008, section 4: a step's item pauses the queue (a forced failing fight). The pair target@character is
// blocked for 6 h with the error, the step's items are gone, another step runs at once, the queue is running,
// and the error is in the dev log. Nobody waits for Alex.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }],
    bank: { copper_dagger: 1 },
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 40])],
    limits: { actions: 300, minutes: 60 },
  },
  async (t) => {
    t.world.fault({ who: "Pia", action: "fight", n: 1, code: 452, message: "Injected: this fight is refused." });
    await t.run({ until: () => t.calls("gathering", "Pia").length > 0 });
    const b = planner.value.blocked["ach:chicken_hunt:0@Pia"];
    t.ok(b && b.why === "Injected: this fight is refused. (code 452)", `the pair is blocked with the error: ${JSON.stringify(b)}`);
    t.eq(Math.round((b.until - Date.now()) / 60_000) <= 360 && b.until - Date.now() > 5.9 * 3_600_000, true, "for 6 hours");
    const q = t.q("Pia");
    t.ok(q.running && !q.items.some((it) => it.id.includes("chicken_hunt")), "the step's items are gone, the queue is running");
    t.eq(planner.value.current.Pia?.step.as, "fallback", "another step: with the only objective blocked, the fallback gather");
    t.ok(planLines(t, "Pia").includes("blocked ach:chicken_hunt:0 6 h — Injected: this fight is refused. (code 452)"), "the block and its error are in the dev log");
    t.eq(t.calls("fight", "Pia").map((c) => c.code), [452], "one fight, refused; no retry of the blocked pair");
  },
);
