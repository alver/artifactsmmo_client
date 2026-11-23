// Task 023, settled point 2 (c): an event member's kills are the lesser of what the spawn's time gives and what its take
// pays for. Report 022, section 2: the eight trips of 11-22 that fought were planned for about 289 kills and made 92, each
// drinking its whole take in 8–13 fights and ending "ran dry" — so fewer members were sent than the demand needed. Here the
// full moon vampire wants 20 kills; Ann, Bob and Cid (combat 30, a steel battleaxe each) win it only with health potions, at
// about 12 a kill, and the bank holds 200: a stack buys 6 kills of the 35 the hour gives. Ann goes for 6, so Bob is sent too
// (6 more), and Cid's share of what is left (26) buys 1 kill — under SLIVER, no member. The line states those numbers.
import { achievement, eventLines, fieldEvent, scenario } from "../harness/index.mts";

const spawn = fieldEvent("full_moon", { type: "monster", code: "full_moon_vampire" }, 10, 8, 5); // up from 5 to 65 min

await scenario(
  {
    planner: { on: { Ann: true, Bob: true, Cid: true } },
    // task 025: alchemy 30 — the health potion's chain is finite only for a fleet that can brew it (∞ otherwise: never drunk)
    characters: ["Ann", "Bob", "Cid"].map((name) => ({ name, level: 30, x: 4, y: 1, alchemy_level: 30 })),
    bank: { steel_battleaxe: 3, health_potion: 200 },
    achievements: [achievement("made_up_ore", 2, ["gathering", "copper_ore", 1200]), achievement("made_up_vampires", 3, ["combat_kill", "full_moon_vampire", 20])],
    limits: { actions: 3000, minutes: 60 },
  },
  async (t) => {
    await t.run({ minutes: 4 });
    t.world.events.push(spawn);
    await t.run({ until: () => eventLines(t).length > 0 });
    await t.run({ minutes: 1 });
    const line = eventLines(t)[0] ?? "";
    t.ok(/members: Ann \(≈6 kills in \d+ min with 87 Health Potion \(its stacks buy 6; the spawn's time 35\)\)/.test(line), `Ann goes for the 6 kills her stack buys: ${line}`);
    t.ok(/Bob \(≈6 kills in \d+ min with 87 Health Potion \(its stacks buy 6; the spawn's time 35\)\)/.test(line), "Bob is sent too: Ann's 6 do not bring the 20");
    t.ok(line.includes("Cid — its stacks buy 1 kills"), "Cid's share of what is left buys one kill: no member");
    const trips = ["Ann", "Bob", "Cid"].map((n) => t.q(n).items.filter((it) => it.id.startsWith("pl:int:event:")).length > 0);
    t.eq(trips, [true, true, false], "two trips");
  },
);
