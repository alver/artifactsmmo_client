// Task 025, settled point 2: a lost fight in a train loop's hunt is an outcome — Pia (owned, as in train-hunt-verdict) loses
// her first two death knight fights (forced) and the loop goes on: back from (0, 0), recover, hunt; a `loss` record each. On
// 0f94809 the second loss in a row paused the train item ("lost 2 fights in a row").
import { scenario } from "../harness/index.mts";
import { plannerOn } from "../../src/state/store";

await scenario(
  {
    characters: [{ name: "Pia", level: 28, x: 4, y: 1, gearcrafting_level: 30, alchemy_level: 20 }],
    bank: {
      // the brew set's gear (with Minor Health Potion: a safe win) and the bank's own set (no potion: a win)
      skull_staff: 1, slime_shield: 1, piggy_helmet: 1, piggy_armor: 1, piggy_pants: 1, steel_boots: 1, skull_ring: 1, steel_ring: 1, ruby_amulet: 1,
      skull_wand: 1, snakeskin_armor: 1, lizard_skin_legs_armor: 1, ring_of_chance: 2, emerald_amulet: 1,
      nettle_leaf: 10, algae: 5, // Minor Health Potion is brewable, none is held
      gold_bar: 40, skeleton_armor: 3, demoniac_dust: 10, // Royal Skeleton Armor but its Red Cloth
    },
    limits: { actions: 200, minutes: 60 },
  },
  async (t) => {
    // the harness writes the queue as for a character nobody owns …
    t.queue("Pia", [{ kind: "train", skill: "gearcrafting", toLevel: 0, levels: 1, gear: true }]);
    plannerOn.value = { Pia: true }; // … and the runner then judges it as the planner's
    t.world.forceFight("Pia", { result: "loss" as const, turns: 8 }, { result: "loss" as const, turns: 8 }, ...Array.from({ length: 3 }, () => ({ result: "win" as const, hpLost: 150, drops: [{ code: "red_cloth", quantity: 1 }] })));
    await t.run({ until: () => t.calls("fight", "Pia").length >= 5 || !t.q("Pia").running });
    const head = t.q("Pia").items[0];
    t.ok(t.q("Pia").running && !head?.error, `the train loop goes on: ${head?.error ?? "running"}`);
    t.eq(t.calls("fight", "Pia").map((c) => c.note), ["loss", "loss", "win", "win", "win"], "two losses, then the hunt goes on");
    t.eq(t.journal("loss").filter((l) => l.who === "Pia" && l.monster === "death_knight").length, 2, "a `loss` record each");
    t.ok(!t.devlog().some((l) => /lost 2 fights in a row|not a safe win/.test(l)), "no pause");
  },
);
