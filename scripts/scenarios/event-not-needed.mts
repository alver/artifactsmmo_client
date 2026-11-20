// Task 013, settled points 2 and 6: a monster spawn nobody needs (no open objective kills it, no parent is short of its
// drops) — nobody goes, and it gets one `plan: event …` line that says so, however many polls see it.
import { achievement, eventLines, fieldEvent, lizardSet, planLines, scenario } from "../harness/index.mts";

const camp = fieldEvent("bandit_camp", { type: "monster", code: "bandit_lizard" }, 4, 5, 5);

await scenario(
  {
    planner: { on: { Ann: true } },
    characters: [{ name: "Ann", level: 40, x: 4, y: 1 }],
    bank: lizardSet(1),
    achievements: [achievement("made_up_chickens", 2, ["combat_kill", "chicken", 400])],
    limits: { actions: 3000, minutes: 60 },
  },
  async (t) => {
    await t.run({ minutes: 4 });
    t.world.events.push(camp);
    await t.run({ minutes: 30 }); // six 5-minute polls at least (no event-gated demand: the poll stays at 5 minutes)
    const lines = eventLines(t);
    t.eq(lines.length, 1, `one line — ${lines[0]}`);
    t.ok(lines[0]?.includes("nobody needs it"), "it says nobody needs it");
    t.ok(!planLines(t, "Ann").some((l) => l.startsWith("interrupt event")), "no trip");
    t.ok(t.world.reads.filter((r) => r === "/events/active").length <= 9, `the 5-minute poll: ${t.world.reads.filter((r) => r === "/events/active").length} reads in 34 minutes`);
  },
);
