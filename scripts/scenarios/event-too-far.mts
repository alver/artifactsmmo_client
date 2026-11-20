// Task 013, settled point 3: a spawn seen with less than 15 minutes of it left after the walk and the bank reset —
// nobody goes; the line says how many minutes would be left.
import { achievement, eventLines, fieldEvent, lizardSet, planLines, scenario } from "../harness/index.mts";

const late = fieldEvent("bandit_camp", { type: "monster", code: "bandit_lizard" }, 4, 5, -44, 60); // 16 minutes left at the start

await scenario(
  {
    planner: { on: { Ann: true } },
    characters: [{ name: "Ann", level: 40, x: 4, y: 1 }],
    bank: lizardSet(1),
    events: [late],
    achievements: [achievement("made_up_chickens", 2, ["combat_kill", "chicken", 400]), achievement("made_up_lizards", 3, ["combat_kill", "bandit_lizard", 3000])],
    limits: { actions: 3000, minutes: 40 },
  },
  async (t) => {
    await t.run({ minutes: 20 });
    const lines = eventLines(t);
    t.eq(lines.length, 1, `one line for the spawn — ${lines[0]}`);
    t.ok(/Ann — too far: \d+ min would be left/.test(lines[0] ?? ""), "Ann too far: the minutes that would be left");
    t.ok(!planLines(t, "Ann").some((l) => l.startsWith("interrupt event")), "no trip");
  },
);
