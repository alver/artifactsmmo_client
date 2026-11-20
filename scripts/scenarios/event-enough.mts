// Task 013, settled point 3: a demand of a few units (five lizard kills) and three capable owned characters — one
// member brings it; the others stay, "not needed".
import { achievement, eventLines, fieldEvent, lizardSet, planLines, scenario } from "../harness/index.mts";

const NAMES = ["Ann", "Ben", "Cat"];
const camp = fieldEvent("bandit_camp", { type: "monster", code: "bandit_lizard" }, 4, 5, 5);

await scenario(
  {
    planner: { on: { Ann: true, Ben: true, Cat: true } },
    characters: NAMES.map((name) => ({ name, level: 40, x: 4, y: 1 })),
    bank: lizardSet(3),
    achievements: [achievement("made_up_chickens", 2, ["combat_kill", "chicken", 2000]), achievement("made_up_lizards", 3, ["combat_kill", "bandit_lizard", 5])],
    limits: { actions: 5000, minutes: 60 },
  },
  async (t) => {
    await t.run({ minutes: 4 });
    t.world.events.push(camp);
    await t.run({ minutes: 8 });
    const line = eventLines(t)[0] ?? "";
    const went = NAMES.filter((n) => planLines(t, n).some((l) => l.startsWith("interrupt event")));
    t.eq(went.length, 1, `one member: ${went.join(", ")} — ${line}`);
    t.eq(line.match(/not needed: the members bring the demand/g)?.length, 2, "the other two: not needed");
  },
);
