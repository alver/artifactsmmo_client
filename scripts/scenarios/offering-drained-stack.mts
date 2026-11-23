// Task 023, settled point 2 (a): a drained stack re-solves. The combat offerings of 11-22 stopped after their wins on an
// empty potion stack: the fight set memoised on the bank, the level and the monster (exec.ts desiredForJob) still named the
// Minor Health Potion the fights had drunk, the differ found none to put in, and the gate saw no potion and no win (report
// 021, "The offerings of 11-22"). Here Pia (combat 28, owned) takes the 21–30 combat offering, 2 Red Cloth from the death
// knight; the bank's best set wins it safely with the bank's 3 Minor Health Potions and loses without them, and another set
// of the bank wins it with no potion. The three fights drink the three potions; the set must be answered again — the one
// that wins with what is left — and the offering completed.
import { achievement, scenario } from "../harness/index.mts";
import { slotCode } from "../../src/types/api";

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
    // the first three fights drink the stack and drop nothing; the next ones drop the cloth
    t.world.forceFight("Pia", ...Array.from({ length: 3 }, () => ({ result: "win" as const, hpLost: 150, used: { minor_health_potion: 1 } })),
      ...Array.from({ length: 2 }, () => ({ result: "win" as const, hpLost: 150, drops: [{ code: "red_cloth", quantity: 1 }] })));
    await t.run({ until: () => t.world.altar.get("Pia")?.[0]?.status === "completed" || t.devlog().some((l) => l.includes("skipped today's combat offering")) });
    t.ok(!t.devlog().some((l) => l.includes("skipped today's combat offering")), `the offering is not given up: ${t.devlog().find((l) => l.includes("skipped today's")) ?? "—"}`);
    t.eq(t.world.altar.get("Pia")?.[0]?.status, "completed", "the combat offering is completed");
    t.eq(t.calls("fight", "Pia").length, 5, "three fights drink the stack, two bring the cloth");
    const ch = t.world.chars.get("Pia")!;
    t.ok(t.calls("equip", "Pia").some((c) => (c.body as { code: string }[]).some((x) => x.code === "skull_wand")) && !slotCode(ch, "utility1"), "the stack gone, it wears the set that wins without it");
  },
);
