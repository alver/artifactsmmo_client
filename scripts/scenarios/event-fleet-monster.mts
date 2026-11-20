// Task 013, settled points 1–6: a monster spawn with open demand (3,000 bandit lizard kills) and three capable owned
// characters on three different steps (a kill, a craft, a gather). The 2-minute poll sees it; each gets one `event`
// interrupt ahead of its step — a bank reset into a lizard set, fight until the tile disappears, the drops banked —
// and then resumes its own step (the same item, its counter kept) in its own set. One `plan: event …` line. No bounce.
import { achievement, eventLines, fieldEvent, lizardSet, planLines, scenario } from "../harness/index.mts";
import { T0 } from "../harness/clock.mts";
import { planner } from "../../src/state/planner";
import { slotCode } from "../../src/types/api";
import type { GearSlot } from "../../src/types/api";

const NAMES = ["Ann", "Ben", "Cat"];
const camp = fieldEvent("bandit_camp", { type: "monster", code: "bandit_lizard" }, 4, 5, 5); // up from 5 to 65 min
const SLOTS: GearSlot[] = ["weapon", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring1", "ring2", "amulet"];

await scenario(
  {
    planner: { on: { Ann: true, Ben: true, Cat: true } },
    characters: NAMES.map((name) => ({ name, level: 40, x: 4, y: 1 })),
    bank: { ...lizardSet(3), copper_ore: 2000 },
    achievements: [
      achievement("made_up_chickens", 2, ["combat_kill", "chicken", 100]),
      achievement("made_up_ore", 2, ["gathering", "copper_ore", 150]),
      achievement("made_up_bars", 2, ["crafting", "copper_bar", 200]),
      achievement("made_up_lizards", 3, ["combat_kill", "bandit_lizard", 3000]),
    ],
    limits: { actions: 8000, minutes: 200 },
  },
  async (t) => {
    await t.run({ minutes: 4 });
    const steps = Object.fromEntries(NAMES.map((n) => [n, planner.value.current[n]!.step]));
    t.eq(new Set(NAMES.map((n) => steps[n].target)).size, 3, `three different steps: ${NAMES.map((n) => `${n} ${steps[n].key}`).join(", ")}`);
    t.world.events.push(camp);
    await t.run({ until: () => NAMES.every((n) => t.q(n).items[0]?.id.startsWith("pl:int:event:")) });
    const seen = (Date.now() - Date.parse(camp.created_at)) / 1000;
    t.ok(seen <= 125, `every member's trip at the head within one 2-minute poll (${seen.toFixed(0)} s)`);
    const under = Object.fromEntries(NAMES.map((n) => [n, t.q(n).items.find((it) => !it.id.startsWith("pl:int:")) as { id: string; done?: number }]));
    t.ok(NAMES.every((n) => under[n].id.startsWith(`pl:${steps[n].key}:`)), "the step's item waits under the trip");
    t.eq(NAMES.map((n) => t.q(n).items.filter((it) => it.id.startsWith("pl:int:event:")).map((it) => it.kind)), NAMES.map(() => ["gear", "fight", "gear"]), "the trip: reset into the set, fight ×∞, the step's own reset (it banks the drops)");
    const ended = Date.parse(camp.expiration);
    await t.run({ until: () => Date.now() > ended && NAMES.every((n) => !t.q(n).items.some((it) => it.id.startsWith("pl:int:event:"))) });
    await t.run({ minutes: 3 }); // the resumed items act; the dev log's sink flushes
    const lizardFights = (n: string) => t.calls("fight", n).filter((c) => c.t >= Date.parse(camp.created_at) - T0 && c.t <= ended - T0);
    for (const n of NAMES) {
      const head = t.q(n).items[0] as { id: string; done?: number } | undefined;
      t.ok(!!head && head.id === under[n].id && (head.done ?? 0) >= (under[n].done ?? 0), `${n} resumes ${under[n].id} (${under[n].done ?? 0} → ${head?.done ?? "gone"})`);
      t.ok(lizardFights(n).length >= 10 && lizardFights(n).every((c) => c.note === "win"), `${n} fought ${lizardFights(n).length} lizards, every one a win`);
      t.ok(!["lizard_skin", "lizard_eye", "bandit_armor"].some((c) => t.inv(n, c) > 0), `${n}'s drops are in the bank, not the bag`);
      const ch = t.world.chars.get(n)!;
      const wear = steps[n].wear ?? {};
      const worn = SLOTS.filter((g) => slotCode(ch, g) && slotCode(ch, g) !== (wear[g] ?? ""));
      t.ok(!worn.length, `${n} works its step in its own set (${steps[n].work.kind}): ${worn.map((g) => `${g} ${slotCode(ch, g)}`).join(", ") || "as planned"}`);
    }
    const lines = eventLines(t);
    t.eq(lines.length, 1, `one plan: event line — ${lines[0]}`);
    t.ok(NAMES.every((n) => lines[0]?.includes(`${n} (≈`)) && lines[0]?.includes("3000 Bandit Lizard kills for made_up_lizards"), "the line: the demand and three members");
    t.ok(NAMES.every((n) => planLines(t, n).some((l) => l.startsWith("interrupt event — "))), "an interrupt event line per member");
    t.ok(t.bank("lizard_skin") + t.bank("lizard_eye") + t.bank("bandit_armor") > 0, "the drops reached the bank");
  },
);
