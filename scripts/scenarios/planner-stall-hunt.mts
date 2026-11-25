// Task 027f, B.2: a level step's counter is the character's own work. Pia (combat 28, gearcrafting 30) is planned a
// gearcrafting level (an achievement crafts a gearcrafting-35 piece); its train item's recipe (Royal Skeleton Armor) is
// short of the death knight's Red Cloth, which never drops here: two hours of hunting with kills and no unit (the fake gives
// no XP) — work all the same, so the step is not blocked as stalled.
import { achievement, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";

await scenario(
  {
    planner: { on: { Pia: true }, roles: { Pia: { role: "worker", craft: ["gearcrafting"] } } }, // its lane: a gearcrafting level
    characters: [{ name: "Pia", level: 28, x: 4, y: 1, gearcrafting_level: 30 }],
    bank: {
      skull_staff: 1, slime_shield: 1, piggy_helmet: 1, piggy_armor: 1, piggy_pants: 1, steel_boots: 1, skull_ring: 1, steel_ring: 1, ruby_amulet: 1,
      skull_wand: 1, snakeskin_armor: 1, lizard_skin_legs_armor: 1, ring_of_chance: 2, emerald_amulet: 1,
      gold_bar: 40, skeleton_armor: 3, demoniac_dust: 10,
    },
    achievements: [achievement("made_up_craft", 5, ["crafting", "dreadful_armor", 1])],
    limits: { actions: 3000, minutes: 180 },
  },
  async (t) => {
    t.world.forceFight("Pia", ...Array.from({ length: 400 }, () => ({ result: "win" as const, hpLost: 150, drops: [] })));
    await t.run({ until: () => (planner.value.current.Pia?.run ?? 0) >= 2 * 3600 || Object.keys(planner.value.blocked).length > 0 });
    const r = planner.value.current.Pia!;
    t.ok(r.step.as === "level" && r.step.work.kind === "train", `a train level step (${r.step.key})`);
    t.ok(r.run >= 2 * 3600, `two hours of running (${(r.run / 60).toFixed(0)} min)`);
    t.eq(r.units, 0, "no unit: no level");
    t.ok(t.calls("fight", "Pia").length >= 20, `it hunts its materials (${t.calls("fight", "Pia").length} kills)`);
    t.eq(Object.keys(planner.value.blocked), [], "not blocked as stalled");
  },
);
