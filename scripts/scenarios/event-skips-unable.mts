// Task 013, settled point 3: a monster spawn with open demand and two owned characters — one wins the bandit lizard
// safely with the bank's set, the other (combat 20, the set is level 40) cannot. Only the first gets the trip; the
// line gives the other's reason.
import { achievement, eventLines, fieldEvent, lizardSet, planLines, scenario } from "../harness/index.mts";

const camp = fieldEvent("bandit_camp", { type: "monster", code: "bandit_lizard" }, 4, 5, 5);

await scenario(
  {
    planner: { on: { Ann: true, Ben: true } },
    characters: [{ name: "Ann", level: 40, x: 4, y: 1 }, { name: "Ben", level: 20, x: 4, y: 1 }],
    bank: lizardSet(1),
    achievements: [achievement("made_up_chickens", 2, ["combat_kill", "chicken", 400]), achievement("made_up_lizards", 3, ["combat_kill", "bandit_lizard", 3000])],
    limits: { actions: 3000, minutes: 60 },
  },
  async (t) => {
    await t.run({ minutes: 4 });
    t.world.events.push(camp);
    await t.run({ minutes: 8 });
    const line = eventLines(t)[0] ?? "";
    t.ok(line.includes("members: Ann (≈") && line.includes("Ben — gate: no admitted win"), `the line: Ann goes, Ben's reason — ${line}`);
    t.ok(t.q("Ann").items.some((it) => it.id.startsWith("pl:int:event:")) || planLines(t, "Ann").some((l) => l.startsWith("interrupt event")), "Ann's trip");
    t.ok(!t.q("Ben").items.some((it) => it.id.startsWith("pl:int:event:")) && !planLines(t, "Ben").some((l) => l.startsWith("interrupt event")), "Ben stays on its step");
  },
);
