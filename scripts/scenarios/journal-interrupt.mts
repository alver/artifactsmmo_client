// Task 016, settled point 4: an interrupt inside a step. Pia (owned) fights chickens for an objective; mid-step the daily
// offering trigger puts an `offering` interrupt ahead of the fight (the boot catch-up suppressed, as planner-interrupt-
// offering does). The journal has its `int` and its `int-end` with the interrupt's own meter (the walk to the altar, the
// feathers withdrawn, the accept and the completion) and the day's categories; the step's `end` carries only what its
// own items did: none of the interrupt's actions, and its seconds metered plus the interrupt's are the step's wall.
import { achievement, scenario } from "../harness/index.mts";
import { offeringsDue } from "../../src/state/planner";
import { planner } from "../../src/state/planner";

const favor = { target_type: "monster" as const, target_code: "chicken", xp_multiplier: 1.5, drop_multiplier: 1.5 };

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }],
    bank: { copper_dagger: 1, feather: 2 },
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 40])],
    offerings: [{ id: "off-1", category: "combat", type: "monster", level_min: 1, level_max: 10, requirement: { code: "feather", quantity: 2 }, favor }],
    setup: () => {
      localStorage.setItem("ammo:v1:offeringsDaily", String(Date.UTC(2026, 0, 15, 0, 5)));
      planner.value = { ...planner.value, offered: { Pia: { day: "2026-01-15", n: 0 } } };
    },
    limits: { actions: 400, minutes: 120 },
  },
  async (t) => {
    await t.run({ until: () => t.calls("fight", "Pia").length >= 5 });
    t.ok(offeringsDue("Pia"), "the trigger puts the offering in");
    await t.run({ until: () => t.journal("int-end").length > 0 });
    await t.run({ until: () => t.journal("end").length > 0 });
    await t.run({ minutes: 1 });

    const int = t.journal("int").find((r) => r.cls === "offering"), ie = t.journal("int-end").find((r) => r.cls === "offering");
    t.ok(!!int && int.who === "Pia" && int.what === "2026-01-15", `the interrupt issued: ${JSON.stringify(int)}`);
    t.ok(!!ie && ie.how === "done" && !ie.partial, `…and over: ${JSON.stringify(ie)}`);
    t.eq(ie!.off, { done: ["combat"], open: {} }, "its end says the day's combat offering was completed");
    t.eq([ie!.m.n.offering, ie!.m.wd?.feather, ie!.m.n.fight], [2, 2, undefined], "its meter: the accept and the completion, the feathers withdrawn, no fight");
    // from issue to end it also waited out the step's fight in flight (that fight's cooldown is the step's)
    t.ok(ie!.m.by.walk > 0 && ie!.m.s <= ie!.s && ie!.s - ie!.m.s < 60, `its seconds: ${ie!.m.s} metered of ${ie!.s} from issue to end (${JSON.stringify(ie!.m.by)})`);

    const end = t.journal("end")[0]!;
    t.ok(end.key.startsWith("ach:chicken_hunt:0@Pia#1") && end.how === "done", `the step's end: ${end.key} ${end.how}`);
    t.ok(!end.m.n.offering && !end.m.wd?.feather && end.m.n.fight === 40, `its meter has its own 40 fights and none of the interrupt's actions: ${JSON.stringify(end.m.n)}`);
    const sum = Object.values(end.m.by as Record<string, number>).reduce((s, v) => s + v, 0);
    t.ok(Math.abs(sum - end.m.s) < 0.15, `its groups sum to its seconds metered (${sum.toFixed(1)} of ${end.m.s})`);
    t.ok(Math.abs(end.m.s + ie!.m.s - end.wall) <= 2, `the step's seconds and the interrupt's make the step's wall: ${end.m.s} + ${ie!.m.s} of ${end.wall}`);
    t.ok(end.ran < end.wall - ie!.m.s + 2, `its running seconds leave the interrupt out too: ${end.ran} of ${end.wall}`);
  },
);
