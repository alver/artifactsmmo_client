// Task 008, section 4, the brake. Provoked: an objective with one kill left, and achievements that never move
// (the fake counts no kills, so every read says one is left) — every step is one kill and the same target is
// decided again. The seventh start within ten minutes trips the brake. Task 010: the brake is per target — that
// target is blocked for 30 minutes, the dev log names it in one `flapping` line, and the same start() decides again:
// nothing else is open to Pia, so it gets the fallback gather chunk. (Until 010 the line listed the six keys and
// everything Pia could do was blocked; that ceiling is now 20 starts of any kind.)
import { achievement, planLines, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }],
    bank: { copper_dagger: 1 },
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 40, 39])],
    limits: { actions: 300, minutes: 60 },
  },
  async (t) => {
    await t.run({ until: () => planner.value.current.Pia?.step.as === "fallback" });
    const braked = Date.now();
    await t.run({ minutes: 1 }); // the dev log flushes every 500 ms
    const plan = planLines(t, "Pia");
    const keys = plan.filter((l) => l.startsWith("ach:chicken_hunt:0@Pia#")).map((l) => l.split(" ")[0]);
    t.eq(keys, [1, 2, 3, 4, 5, 6].map((n) => `ach:chicken_hunt:0@Pia#${n}`), "six one-kill steps of the same target");
    t.eq(plan.filter((l) => l.startsWith("flapping")), ["flapping — ach:chicken_hunt:0: 6 starts in 10 min, blocked 30 min"], "one flapping line, naming the target");
    const b = planner.value.blocked["ach:chicken_hunt:0@Pia"];
    t.eq(b?.why === "flapping" && b.until - braked, 30 * 60_000, "the objective blocked for 30 minutes from the brake");
    t.eq(Object.keys(planner.value.blocked), ["ach:chicken_hunt:0@Pia"], "only that target is blocked");
    t.ok(plan[plan.findIndex((l) => l.startsWith("flapping")) + 1]?.startsWith("fallback:"), "the same start() decided the fallback");
    t.ok(t.q("Pia").running && t.q("Pia").items.every((it) => it.id.startsWith("pl:fallback:")), "the fallback gather chunk runs");
    const first = Date.parse(t.devlog().find((l) => l.includes(" plan Pia: ach:chicken_hunt:0@Pia#1 "))!.slice(0, 24)); // the line's ISO time
    t.ok(braked - first < 10 * 60_000, `the seventh start came ${((braked - first) / 60_000).toFixed(1)} minutes after the first`);
  },
);
