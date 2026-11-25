// Task 027f, A.2: the train item's loop (Fourth's lvl:jewelrycrafting:25 step, 11-23 23:05 → 11-25, 0 of 1 units in 33 h).
// The train loop's hunt (sourceOne → fightGear) withdraws its fight set into the last free units of a bag otherwise full of
// the batch's own materials (protected working stock); the next tick's full-bag check (runTrainCraft, step 3) took the
// pieces just withdrawn for cargo and banked them, the swap withdrew them again — "→ bank (full)", "withdraw gear", every
// 22 s for ever. Here Pia (combat 28, owned) trains gearcrafting on Royal Skeleton Armor, short of the death knight's Red
// Cloth, the fight set in the bank, three units of her bag free: the pieces are worn, never banked again, and she hunts.
// (The fake has no recycle action and no XP: the scenario stops at the hunt's first fights.)
import { scenario } from "../harness/index.mts";
import { plannerOn } from "../../src/state/store";
import { slotCode } from "../../src/types/api";

const SET = ["skull_wand", "snakeskin_armor", "lizard_skin_legs_armor", "ring_of_chance", "emerald_amulet"];

await scenario(
  {
    // level 28: a bag of 154 — 151 of them the batch's materials (gold bars, demoniac dust, skeleton armour)
    characters: [{ name: "Pia", level: 28, x: 4, y: 1, gearcrafting_level: 30, bag: { gold_bar: 120, demoniac_dust: 28, skeleton_armor: 3 } }],
    bank: {
      skull_staff: 1, slime_shield: 1, piggy_helmet: 1, piggy_armor: 1, piggy_pants: 1, steel_boots: 1, skull_ring: 1, steel_ring: 1, ruby_amulet: 1,
      skull_wand: 1, snakeskin_armor: 1, lizard_skin_legs_armor: 1, ring_of_chance: 2, emerald_amulet: 1,
    },
    limits: { actions: 200, minutes: 60 },
  },
  async (t) => {
    t.queue("Pia", [{ kind: "train", skill: "gearcrafting", toLevel: 0, levels: 1, gear: true }]);
    plannerOn.value = { Pia: true };
    t.world.forceFight("Pia", ...Array.from({ length: 3 }, () => ({ result: "win" as const, hpLost: 150, drops: [{ code: "red_cloth", quantity: 1 }] })));
    await t.run({ until: () => t.calls("fight", "Pia").length >= 3 || !t.q("Pia").running });
    const head = t.q("Pia").items[0];
    t.ok(t.q("Pia").running && !head?.error, `the train loop goes on: ${head?.error ?? "running"}`);
    t.eq(t.calls("fight", "Pia").length, 3, "it hunts the death knight for its red cloth");
    const out = t.calls("bank/withdraw/item", "Pia").flatMap((c) => (c.body as { code: string }[]).map((i) => i.code)).filter((c) => SET.includes(c));
    t.ok(out.length === new Set(out).size, `each piece of the set withdrawn once (${out.join(", ") || "none"})`);
    const back = t.calls("bank/deposit/item", "Pia").flatMap((c) => (c.body as { code: string }[]).map((i) => i.code)).filter((c) => SET.includes(c));
    t.eq(back, [], "no piece of the set banked by the bag-full trip");
    const ch = t.world.chars.get("Pia")!;
    t.eq(slotCode(ch, "weapon"), "skull_wand", "the hunt wears its set");
  },
);
