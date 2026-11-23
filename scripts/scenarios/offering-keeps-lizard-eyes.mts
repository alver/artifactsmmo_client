// Task 023, settled point 3: what an offering may give away. On 11-23 at 00:09–00:15 UTC the 21–30 combat offering asked
// 5 Lizard Eye (favor: the bandit lizard); First, Second and Fourth each withdrew 5 of the 12 the_new_bandit had paid the
// evening before — an event-only material of the gold tier's recipes. An offering never takes such a code from the bank:
// with the bank closed to it, it goes on as before — the favored target (the bandit lizard: an event monster, not up), a
// field source (none), the next lower bracket (here a made-up 10–20 one: feathers from chickens), else the category is
// skipped for the day.
import { achievement, scenario } from "../harness/index.mts";

const lizard = { target_type: "monster" as const, target_code: "bandit_lizard", xp_multiplier: 1.5, drop_multiplier: 1.5 };
const chicken = { target_type: "monster" as const, target_code: "chicken", xp_multiplier: 1.5, drop_multiplier: 1.5 };

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 23, x: 4, y: 1 }],
    bank: { lizard_eye: 12, lizard_skin: 12, iron_sword: 1 },
    achievements: [achievement("made_up_ore", 2, ["gathering", "copper_ore", 400])],
    offerings: [
      { id: "20261123_combat_21_30", category: "combat", type: "monster", level_min: 21, level_max: 30, requirement: { code: "lizard_eye", quantity: 5 }, favor: lizard },
      { id: "made_up_combat_10_20", category: "combat", type: "monster", level_min: 10, level_max: 20, requirement: { code: "feather", quantity: 2 }, favor: chicken },
    ],
    limits: { actions: 300, minutes: 60 },
  },
  async (t) => {
    t.world.forceFight("Pia", ...Array.from({ length: 2 }, () => ({ result: "win" as const, hpLost: 10, drops: [{ code: "feather", quantity: 1 }] })));
    await t.run({ until: () => t.world.altar.get("Pia")?.[0]?.status === "completed" || t.devlog().some((l) => l.includes("skipped today's combat offering")) });
    const took = t.calls("bank/withdraw/item", "Pia").flatMap((c) => (c.body as { code: string }[]).map((x) => x.code));
    t.ok(!took.includes("lizard_eye"), `no lizard eye leaves the bank: withdrew ${JSON.stringify(took)}`);
    t.eq([t.bank("lizard_eye"), t.bank("lizard_skin")], [12, 12], "the bank keeps the event's 12 eyes and 12 skins");
    t.eq(t.world.altar.get("Pia")?.[0]?.offering_id, "made_up_combat_10_20", "the next lower bracket is taken");
    t.eq(t.world.altar.get("Pia")?.[0]?.status, "completed", "and completed with the chickens' feathers");
  },
);
