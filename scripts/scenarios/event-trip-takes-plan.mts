// Task 017, settled point 13: an event trip takes what it planned. The full moon trip of 01:12 UTC on 11-21 planned 100
// minor and 100 small health potions and 72 cooked trout of a bank that held 54, none and 9: the member's take was the
// hour's use, never capped at the stock. Ann (combat 30, a steel battleaxe) wins the full moon vampire only with health
// potions and the bank holds 75 (task 017: 30): the trip's plan stays inside the stock, its reset withdraws what it planned,
// and it wears the set the plan named. Task 023, settled point 2 (c): its kills are what its take pays for — 75 potions buy
// 5 of the hour's 35 at about 12 a kill and MARGIN — and the take is those 5 kills' 72; 30 would buy 2, under SLIVER: no member.
import { achievement, eventLines, fieldEvent, scenario } from "../harness/index.mts";

const spawn = fieldEvent("full_moon", { type: "monster", code: "full_moon_vampire" }, 10, 8, 5); // up from 5 to 65 min

await scenario(
  {
    planner: { on: { Ann: true } },
    characters: [{ name: "Ann", level: 30, x: 4, y: 1, alchemy_level: 30 }], // task 025: she could brew them — a potion nobody that is on may make costs ∞ and is never drunk
    bank: { steel_battleaxe: 1, health_potion: 75 },
    achievements: [achievement("made_up_ore", 2, ["gathering", "copper_ore", 400]), achievement("made_up_vampires", 3, ["combat_kill", "full_moon_vampire", 200])],
    limits: { actions: 3000, minutes: 120 },
  },
  async (t) => {
    await t.run({ minutes: 4 });
    t.world.events.push(spawn);
    await t.run({ until: () => !!t.q("Ann").items[0]?.id.startsWith("pl:int:event:") });
    const trip = t.q("Ann").items.filter((it) => it.id.startsWith("pl:int:event:"));
    const fight = trip.find((it) => it.kind === "fight") as { take?: Record<string, number>; wear?: Record<string, string> } | undefined;
    t.eq(fight?.take, { health_potion: 72 }, "the trip plans what the bank holds for it: 5 kills' 72 of its 75, not the hour's 100");
    t.ok(fight?.wear?.weapon === "steel_battleaxe" && (trip[0] as { wear?: Record<string, string> }).wear?.weapon === "steel_battleaxe", `the trip's reset and fight item carry the member's set: ${JSON.stringify(fight?.wear)}`);
    await t.run({ until: () => !t.q("Ann").items.some((it) => it.id.startsWith("pl:int:event:")) });
    await t.run({ minutes: 1 });
    t.ok(eventLines(t)[0]?.includes("≈5 kills") && eventLines(t)[0]?.includes("with 72 Health Potion (its stacks buy 5; the spawn's time 35)"), `the event line says it: ${eventLines(t)[0]}`);
    const took = t.calls("bank/withdraw/item", "Ann").flatMap((c) => c.body as { code: string; quantity: number }[]);
    t.eq(took.filter((x) => x.code === "health_potion").map((x) => x.quantity), [72], "the trip's reset withdrew the planned 72");
    t.ok(took.some((x) => x.code === "steel_battleaxe"), "…and the planned weapon");
  },
);
