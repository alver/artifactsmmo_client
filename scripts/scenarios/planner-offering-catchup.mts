// Task 010, section 4: the planner owns the offerings trigger of its characters and catches up. The day's old marker is
// written (as when the service ran at 00:05 with every queue stopped), offerings are open, no interrupt was issued:
// at boot each owned character gets exactly one offering interrupt, the one that is not owned none; the five-minute
// tick issues none more. Ann did today's offering by hand already: her catch-up is one item that ends at once, with
// no walk and no action. Pia's accept answers 598 at the altar: the interrupt pauses, is removed, and comes back an
// hour later, when the offering is done.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { world } from "../harness/fake.mts";
import { T0 } from "../harness/clock.mts";
import { planner } from "../../src/state/planner";

const favor = { target_type: "monster" as const, target_code: "chicken", xp_multiplier: 1.5, drop_multiplier: 1.5 };
const offer = { id: "off-1", category: "combat", type: "monster" as const, level_min: 1, level_max: 10, requirement: { code: "feather", quantity: 2 }, favor };
const ID = "pl:int:offering:2026-01-15:0";

await scenario(
  {
    expect598: true, // the altar's answer, on purpose
    planner: { on: { Pia: true, Ann: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }, { name: "Ann", level: 10, x: 4, y: 1 }, { name: "Bob", level: 10, x: 4, y: 1 }],
    bank: { feather: 2 },
    achievements: [achievement("made_up_open", 1, ["combat_kill", "ogre", 1])], // nothing either can do: the fallback
    offerings: [offer],
    setup: () => {
      localStorage.setItem("ammo:v1:offeringsDaily", String(Date.UTC(2026, 0, 15, 0, 5))); // today's 00:05 handled, nothing issued
      world.altar.set("Ann", [{ offering_id: "off-1", category: "combat", status: "completed", accepted_at: new Date(Date.UTC(2026, 0, 15, 8)).toISOString(), requirement: offer.requirement, favor, expires_at: new Date(Date.UTC(2026, 0, 16)).toISOString() }]);
    },
    limits: { actions: 400, minutes: 120 },
  },
  async (t) => {
    t.world.fault({ who: "Pia", action: "offering/accept", n: 1, code: 598, message: "Seasonal altar not found on this map." });
    const lines = (name: string): string[] => planLines(t, name).filter((l) => l.startsWith("interrupt offering"));
    await t.run({ minutes: 7 }); // the boot, the pause, and the first five-minute tick
    t.eq([lines("Pia").length, lines("Ann").length, lines("Bob").length], [1, 1, 0], "one offering interrupt for each owned character, none for Bob, after the boot and a tick");
    t.eq(planner.value.offered, { Pia: { day: "2026-01-15", n: 1, again: planner.value.offered?.Pia?.again }, Ann: { day: "2026-01-15", n: 0 } }, "the day recorded per character; Pia's comes back");

    // Ann: a finished day costs one item and no walk.
    const heads = t.devlog().filter((l) => l.includes(" head Ann: ["));
    t.ok(heads[0]?.includes(`[${ID}]`) && heads.filter((l) => l.includes(`[${ID}]`)).length === 1, "Ann's first head was the offering interrupt, once");
    const stepAt = Date.parse(heads.find((l) => !l.includes("[pl:int:"))!.slice(0, 24)) - T0;
    t.eq(t.calls(undefined, "Ann").filter((c) => c.t < stepAt).map((c) => c.action), [], "no action, no walk, before Ann's first step: the item ended at once");
    t.ok(!t.q("Ann").items.some((it) => it.id === ID), "…and is gone");
    t.eq(t.calls(undefined, "Ann").filter((c) => c.action.startsWith("offering")), [], "no altar action for Ann");

    // Pia: the 598 pauses the interrupt; the planner removes it and brings it back an hour later.
    const pia = planLines(t, "Pia");
    t.ok(pia.some((l) => l.startsWith(`interrupt removed — `)), "the paused interrupt was removed");
    const back = pia.find((l) => l.startsWith("offering interrupt comes back at "));
    t.ok(!!back && back.endsWith("(1 of 3 today)"), `the dev log says it comes back: ${back}`);
    const removedAt = planner.value.offered!.Pia!.again! - 3_600_000;
    await t.run({ until: () => t.world.altar.get("Pia")?.[0]?.status === "completed" });
    await t.run({ minutes: 1 });
    const again = planLines(t, "Pia").find((l) => l.startsWith("offering interrupt issued again"));
    t.eq(again, "offering interrupt issued again (1 of 3 today)", "the dev log says it was issued again");
    const at = Date.parse(t.devlog().find((l) => l.includes(" plan Pia: offering interrupt issued again"))!.slice(0, 24));
    t.ok(at - removedAt >= 3_600_000 && at - removedAt < 3_600_000 + 6 * 60_000, `issued again ${((at - removedAt) / 60_000).toFixed(0)} min after the removal`);
    t.eq(lines("Pia").length, 2, "Pia: two offering interrupts in all (the boot's and the one that came back)");
    t.eq(t.calls().filter((c) => c.who === "Pia" && c.action.startsWith("offering")).map((c) => [c.action, c.code]), [["offering/accept", 598], ["offering/accept", 200], ["offering", 200]], "accept refused once, then accepted and completed");
  },
);
