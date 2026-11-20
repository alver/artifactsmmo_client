// Task 013, settled point 3: a resource spawn (Strange Apparition, mining 35) with open demand (3,000 strange ore) and
// three owned characters — two at mining 35 go, the one at mining 20 stays with its reason; the trip is a gathering
// set, gather until the tile disappears, the step's own reset.
import { achievement, eventLines, fieldEvent, planLines, scenario } from "../harness/index.mts";

const rocks = fieldEvent("strange_apparition", { type: "resource", code: "strange_rocks" }, -4, 12, 5);

await scenario(
  {
    planner: { on: { Ann: true, Ben: true, Cat: true } },
    characters: [{ name: "Ann", level: 20, mining_level: 35, x: 4, y: 1 }, { name: "Ben", level: 20, mining_level: 35, x: 4, y: 1 }, { name: "Cat", level: 20, mining_level: 20, x: 4, y: 1 }],
    achievements: [achievement("made_up_ore", 2, ["gathering", "copper_ore", 2000]), achievement("made_up_strange", 2, ["gathering", "strange_ore", 3000])],
    limits: { actions: 4000, minutes: 90 },
  },
  async (t) => {
    await t.run({ minutes: 4 });
    t.world.events.push(rocks);
    await t.run({ until: () => Date.now() > Date.parse(rocks.expiration) + 5 * 60_000 });
    const line = eventLines(t)[0] ?? "";
    t.ok(line.includes("Ann (≈") && line.includes("Ben (≈") && line.includes("Cat — gate: mining 20 < 35"), `the two at 35 go, Cat stays — ${line}`);
    const strange = (n: string): number => t.calls("gathering", n).filter((c) => c.t >= 5 * 60_000 && c.t <= 65 * 60_000).length;
    t.ok(["Ann", "Ben"].every((n) => planLines(t, n).some((l) => l.startsWith("interrupt event")) && strange(n) > 10), `Ann and Ben gathered at the rocks (${strange("Ann")}, ${strange("Ben")})`);
    t.ok(!planLines(t, "Cat").some((l) => l.startsWith("interrupt event")), "Cat no trip");
    t.ok(t.bank("strange_ore") > 0, `the strange ore is in the bank (${t.bank("strange_ore")})`);
  },
);
