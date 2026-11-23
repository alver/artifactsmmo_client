// Task 023, settled point 2 (b): a train loop's drop hunt holds what its set names. Third's lvl:gearcrafting:25 step of
// 02:13–04:42 UTC on 11-23 ended "not a safe win vs Spider": canBeat (the bank's set, a win with small health potions) chose
// the recipe, the hunt's fightGear wore jobGear's brew set (Minor Health Potion and Small Antidote, which nobody held — the
// train loop never brews), and the gate saw no potion and no win. Here Pia (combat 28, owned, alchemy 20 with nettle and
// algae in the bank) trains gearcrafting 30 on the one recipe the bank feeds (Royal Skeleton Armor), short of Red Cloth: the
// death knight drops it. The bank's set wins it without a potion, not safely; the brew set (Minor Health Potion, which she
// could brew) wins safely and loses without it. The hunt must wear the set its verdict judged, and fight.
// (The fake has no recycle action and no XP: the scenario stops at the hunt's first fights, before any craft.)
import { scenario } from "../harness/index.mts";
import { plannerOn } from "../../src/state/store";
import { slotCode } from "../../src/types/api";

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
    t.world.forceFight("Pia", ...Array.from({ length: 3 }, () => ({ result: "win" as const, hpLost: 150, drops: [{ code: "red_cloth", quantity: 1 }] })));
    await t.run({ until: () => t.calls("fight", "Pia").length >= 3 || !t.q("Pia").running });
    const head = t.q("Pia").items[0];
    t.ok(t.q("Pia").running && !head?.error, `the train loop goes on: ${head?.error ?? "running"}`);
    t.eq(t.calls("fight", "Pia").length, 3, "it hunts the death knight for its red cloth");
    const ch = t.world.chars.get("Pia")!;
    t.eq([slotCode(ch, "weapon"), slotCode(ch, "utility1"), slotCode(ch, "utility2")], ["skull_wand", "", ""], "in the set its verdict judged: the bank's, no potion nobody holds");
    t.ok(!t.devlog().some((l) => l.includes("not a safe win")), "no refusal at the gate");
    t.eq(t.calls("crafting", "Pia").length, 0, "nothing brewed inside the hunt");
  },
);
