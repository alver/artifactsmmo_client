// Task 014, settled point 7: an event's fights are stocked for one spawn. Ann (combat 30, a steel battleaxe) wins the
// full moon vampire only with health potions; the bank holds 100. At the spawn she is a member: the trip's reset takes
// what the hour drinks (a utility slot's 100 at most), the fights drink them, the trip ends when they are gone, and she
// resumes her own step (copper ore) in its own set. At the next spawn the reserve is empty and she does not win without
// it: no member, and the line says why.
import { achievement, eventLines, fieldEvent, scenario } from "../harness/index.mts";
import { slotCode } from "../../src/types/api";

const first = fieldEvent("full_moon", { type: "monster", code: "full_moon_vampire" }, 10, 8, 5); // up from 5 to 65 min
const second = fieldEvent("full_moon", { type: "monster", code: "full_moon_vampire" }, 10, 8, 120); // from 120 to 180 min

await scenario(
  {
    planner: { on: { Ann: true } },
    characters: [{ name: "Ann", level: 30, x: 4, y: 1, alchemy_level: 30 }], // she could brew the reserve, the bank holds none after the trip
    bank: { steel_battleaxe: 1, health_potion: 100 },
    achievements: [achievement("made_up_ore", 2, ["gathering", "copper_ore", 400]), achievement("made_up_vampires", 3, ["combat_kill", "full_moon_vampire", 200])],
    limits: { actions: 3000, minutes: 200 },
  },
  async (t) => {
    await t.run({ minutes: 4 });
    const step = t.q("Ann").items.find((it) => it.id.startsWith("pl:") && !it.id.startsWith("pl:int:"));
    t.ok(!!step && step.kind === "gather", `Ann gathers for her step: ${step?.id}`);
    t.world.events.push(first);
    await t.run({ until: () => !!t.q("Ann").items[0]?.id.startsWith("pl:int:event:") });
    const trip = t.q("Ann").items.filter((it) => it.id.startsWith("pl:int:event:"));
    const fight = trip.find((it) => it.kind === "fight") as { take?: Record<string, number> } | undefined;
    t.eq(trip.map((it) => it.kind), ["gear", "fight", "gear"], "the trip: reset, fight ×∞, the step's own reset");
    t.eq(fight?.take, { health_potion: 100 }, "the trip's fight item carries what the hour drinks, a slot's 100 at most");
    await t.run({ until: () => !t.q("Ann").items.some((it) => it.id.startsWith("pl:int:event:")) });
    await t.run({ minutes: 2 });
    const took = t.calls("bank/withdraw/item", "Ann").flatMap((c) => (c.body as { code: string; quantity: number }[]).filter((x) => x.code === "health_potion").map((x) => x.quantity));
    t.eq(took, [100], "the trip's reset withdrew its take");
    const vamp = t.calls("fight", "Ann");
    t.ok(vamp.length >= 3 && vamp.every((c) => c.note === "win"), `the fights drank them, every fight a win: ${vamp.length}`);
    t.ok(t.devlog().some((l) => l.includes("ran dry after")), "the trip's fight item ended when the potions were gone");
    const ch = t.world.chars.get("Ann")!;
    t.ok(t.q("Ann").items[0]?.id === step!.id && slotCode(ch, "weapon") !== "steel_battleaxe" && !slotCode(ch, "utility1"), `Ann resumes her step in its own set: ${t.q("Ann").items[0]?.id}, weapon ${slotCode(ch, "weapon") || "none"}`);
    t.world.events.push(second);
    await t.run({ until: () => eventLines(t).length >= 2 || Date.now() > Date.parse(second.created_at) + 10 * 60_000 });
    await t.run({ minutes: 1 });
    const lines = eventLines(t);
    t.ok(lines[0]?.includes("members: Ann") && lines[0].includes("Health Potion"), `the first spawn: Ann a member, with her potions — ${lines[0]}`);
    t.ok(!!lines[1] && lines[1].includes("members: none") && lines[1].includes("Ann — gate: no safe win"), `the second: the reserve is empty, no member — ${lines[1]}`);
    t.eq(t.q("Ann").items.filter((it) => it.id.startsWith("pl:int:event:")).length, 0, "no second trip");
  },
);
