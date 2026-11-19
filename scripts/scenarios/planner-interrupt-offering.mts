// Task 008, section 5: the daily offerings trigger for an owned character is an `offering` interrupt. Mid-step it
// goes ahead of the running fight item, does the day's offering (accept at the altar, the requirement from the
// bank, complete), and the step resumes with its counter. The step's running seconds do not count the
// interrupt's time, so neither does its cost sample. One offering interrupt per character and UTC day.
// (The boot catch-up is the same call; it is suppressed here so the trigger comes mid-step. Since task 010 the planner
// keeps its own offerings day per character, so the setup marks today's as issued there as well as in the old marker.)
import { achievement, planLines, scenario } from "../harness/index.mts";
import { T0 } from "../harness/clock.mts";
import { offeringsDue, planner } from "../../src/state/planner";

const favor = { target_type: "monster" as const, target_code: "chicken", xp_multiplier: 1.5, drop_multiplier: 1.5 };

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }],
    bank: { copper_dagger: 1, feather: 2 },
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 40])],
    offerings: [{ id: "off-1", category: "combat", type: "monster", level_min: 1, level_max: 10, requirement: { code: "feather", quantity: 2 }, favor }],
    setup: () => {
      localStorage.setItem("ammo:v1:offeringsDaily", String(Date.UTC(2026, 0, 15, 0, 5))); // today's 00:05 handled
      planner.value = { ...planner.value, offered: { Pia: { day: "2026-01-15", n: 0 } } }; // …and the planner's day
    },
    limits: { actions: 400, minutes: 120 },
  },
  async (t) => {
    await t.run({ until: () => t.calls("fight", "Pia").length >= 5 });
    const fight = (): { id: string; done: number } | undefined => t.q("Pia").items.find((it) => it.kind === "fight") as { id: string; done: number } | undefined;
    const before = fight()!;
    const run0 = planner.value.current.Pia!.run;
    const wall0 = Date.now();

    t.ok(offeringsDue("Pia"), "the trigger puts the offering in");
    t.ok(!offeringsDue("Pia"), "a second trigger the same UTC day does nothing");
    t.eq(t.q("Pia").items.map((it) => it.id.replace(/@Pia#1/, "")), ["pl:int:offering:2026-01-15:0", "pl:ach:chicken_hunt:0:1"], "the interrupt goes ahead of the running step's item");

    await t.run({ until: () => t.q("Pia").items[0]?.kind === "fight" && t.calls("offering", "Pia").length > 0 });
    t.eq(t.calls().filter((c) => c.action.startsWith("offering")).map((c) => [c.action, c.code]), [["offering/accept", 200], ["offering", 200]], "accepted and completed at the altar");
    t.eq(t.world.altar.get("Pia")?.[0]?.status, "completed", "the game has the offering completed");
    const after = fight()!;
    t.eq(after.id, before.id, "the same fight item is the head again");
    t.ok(after.done >= before.done && after.done <= before.done + 1, `its counter kept (the fight in flight lands on it): ${before.done} → ${after.done}`);
    const wall = (Date.now() - wall0) / 1000;
    const ran = planner.value.current.Pia!.run - run0;
    t.ok(wall > 120 && ran < 30, `the interrupt took ${wall.toFixed(0)} s, the step's running seconds grew ${ran.toFixed(0)} s`);

    await t.run({ until: () => !!planner.value.costs["kill:chicken"] });
    await t.run({ minutes: 1 });
    const r = planner.value.costs["kill:chicken"];
    const stepWall = (Date.parse(t.devlog().find((l) => l.includes(" plan Pia: ach:chicken_hunt:0@Pia#2 "))!.slice(0, 24)) - T0) / 1000;
    t.ok(r.sec * 40 < stepWall - wall * 0.9, `the sample (${r.sec.toFixed(1)} s × 40) leaves the interrupt out (the step's wall time ${stepWall.toFixed(0)} s, the interrupt ${wall.toFixed(0)} s)`);
    t.ok(planLines(t, "Pia").some((l) => l.startsWith("sample kill:chicken ")), "the sample line");
  },
);
