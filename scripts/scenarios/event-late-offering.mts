// Task 013, settled point 3: after 22:00 UTC an owned character whose offering interrupt is still open is not a member —
// its offering goes first (eventorders.ts offeringFirst, as before); another capable character goes. The clock starts at
// 21:50 UTC (harness/late.mts); Ann's offering asks for 60 feathers, so it is still hunting chickens at 22:05.
import "../harness/late.mts";
import { achievement, eventLines, fieldEvent, lizardSet, planLines, scenario } from "../harness/index.mts";
import { T0 } from "../harness/clock.mts";
import { planner } from "../../src/state/planner";

const favor = { target_type: "monster" as const, target_code: "chicken", xp_multiplier: 1.5, drop_multiplier: 1.5 };

await scenario(
  {
    planner: { on: { Ann: true, Ben: true } },
    characters: [{ name: "Ann", level: 40, x: 4, y: 1 }, { name: "Ben", level: 40, x: 4, y: 1 }],
    bank: lizardSet(2),
    achievements: [achievement("made_up_chickens", 2, ["combat_kill", "chicken", 2000]), achievement("made_up_lizards", 3, ["combat_kill", "bandit_lizard", 3000])],
    offerings: [{ id: "off-1", category: "combat", type: "monster", level_min: 1, level_max: 50, requirement: { code: "feather", quantity: 60 }, favor }],
    setup: () => {
      localStorage.setItem("ammo:v1:offeringsDaily", String(Date.UTC(2026, 0, 15, 0, 5))); // today's 00:05 handled
      planner.value = { ...planner.value, offered: { Ben: { day: "2026-01-15", n: 0 } } }; // Ben's done; Ann's catches up at boot
    },
    limits: { actions: 4000, minutes: 700 }, // counted from T0 (12:00); the clock starts at 21:50
  },
  async (t) => {
    await t.run({ minutes: 14 }); // 22:04
    t.ok(new Date().getUTCHours() >= 22 && t.q("Ann").items.some((it) => it.id.startsWith("pl:int:offering:")), "after 22:00, Ann's offering interrupt is open");
    t.world.events.push(fieldEvent("bandit_camp", { type: "monster", code: "bandit_lizard" }, 4, 5, (Date.now() - T0) / 60_000 + 1));
    await t.run({ minutes: 8 });
    const line = eventLines(t)[0] ?? "";
    t.ok(line.includes("Ann — its offering first (after 22:00 UTC)") && line.includes("Ben (≈"), `Ben goes, Ann's offering first — ${line}`);
    t.ok(!planLines(t, "Ann").some((l) => l.startsWith("interrupt event")) && planLines(t, "Ben").some((l) => l.startsWith("interrupt event")), "the trip is Ben's only");
  },
);
