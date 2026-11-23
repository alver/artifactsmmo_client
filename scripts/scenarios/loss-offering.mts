// Task 025, settled point 2: a lost fight in an offering's combat is an outcome — Pia (owned, the 21–30 combat offering of
// offering-drained-stack: 2 Red Cloth from the death knight) loses her first two fights (forced) and goes on: back from (0, 0),
// recover, fight; the offering is completed, a `loss` record each. On 0f94809 the second loss in a row threw ("lost 2 fights
// in a row") and the offering interrupt was removed.
import { achievement, scenario } from "../harness/index.mts";

const favor = { target_type: "monster" as const, target_code: "death_knight", xp_multiplier: 1.5, drop_multiplier: 1.5 };

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 28, x: 4, y: 1 }],
    bank: {
      skull_staff: 1, slime_shield: 1, piggy_helmet: 1, piggy_armor: 1, piggy_pants: 1, steel_boots: 1, skull_ring: 1, steel_ring: 1, ruby_amulet: 1,
      skull_wand: 1, snakeskin_armor: 1, lizard_skin_legs_armor: 1, ring_of_chance: 2, emerald_amulet: 1,
      minor_health_potion: 3,
    },
    achievements: [achievement("made_up_ore", 2, ["gathering", "copper_ore", 400])],
    offerings: [{ id: "off-c", category: "combat", type: "monster", level_min: 21, level_max: 30, requirement: { code: "red_cloth", quantity: 2 }, favor }],
    limits: { actions: 300, minutes: 60 },
  },
  async (t) => {
    t.world.forceFight("Pia", { result: "loss" as const, turns: 8 }, { result: "loss" as const, turns: 8 },
      ...Array.from({ length: 2 }, () => ({ result: "win" as const, hpLost: 150, drops: [{ code: "red_cloth", quantity: 1 }] })));
    await t.run({ until: () => t.world.altar.get("Pia")?.[0]?.status === "completed" || t.devlog().some((l) => l.includes("skipped today's combat offering")) || t.calls("fight", "Pia").length > 6 });
    t.eq(t.world.altar.get("Pia")?.[0]?.status, "completed", "the combat offering is completed");
    t.eq(t.calls("fight", "Pia").map((c) => c.note), ["loss", "loss", "win", "win"], "two losses, then the two cloths");
    t.eq(t.journal("loss").filter((l) => l.who === "Pia" && l.monster === "death_knight").length, 2, "a `loss` record each");
    t.ok(!t.devlog().some((l) => /lost 2 fights in a row|interrupt removed/.test(l)), "no throw, the interrupt not removed");
  },
);
