// Task 029, B.1: Fourth's train steps of 11-25 (lvl:jewelrycrafting:30 at 10:11 and 17:00 UTC, on c03bff4 too) ended "inventory
// full of protected working stock" — the loop's hunt withdrew its set with whole potion stacks (100 Minor and 18 Small Health
// Potions) into a bag that held its batch's Steel Bars and the pieces it had just taken off: nothing left to bank, the item
// paused, the step blocked 6 h. Here Quinn (combat 24, a bag of 146, owned, wearing old pieces) trains jewelrycrafting 23 on
// Steel Rings, the bank holding a batch but its Skeleton Bones, the hunt's set, those stacks and their ingredients (so the set
// drinks them): the hunt never takes more than the bag holds beside its batch — a third each of the room the batch and a
// set's pieces leave (queue.ts trainRoom) — and fights; the loop goes on. (The fake has no XP: the scenario stops at the
// hunt's first fights.) On 6867428 the swap withdraws the whole stack of 100 into the bag.
import { scenario } from "../harness/index.mts";
import { plannerOn } from "../../src/state/store";

await scenario(
  {
    characters: [{ name: "Quinn", level: 24, x: 4, y: 1, jewelrycrafting_level: 23, mining_level: 35, helmet_slot: "copper_helmet", body_armor_slot: "leather_armor", leg_armor_slot: "copper_legs_armor", boots_slot: "copper_boots", ring1_slot: "copper_ring", ring2_slot: "copper_ring" }],
    bank: {
      steel_bar: 40, hard_leather: 20, snake_hide: 30, // a batch of Steel Rings but its Skeleton Bones
      skull_staff: 1, iron_shield: 1, hard_leather_helmet: 1, skeleton_pants: 1, snakeskin_boots: 1, skull_ring: 2, adventurer_vest: 1,
      minor_health_potion: 100, small_health_potion: 18,
      sunflower: 3000, nettle_leaf: 3000, algae: 3000, // the potions' ingredients for 100 runs: a potion costs its brew alone
    },
    limits: { actions: 300, minutes: 90 },
  },
  async (t) => {
    t.queue("Quinn", [{ kind: "train", skill: "jewelrycrafting", toLevel: 0, levels: 1, gear: true }]);
    plannerOn.value = { Quinn: true };
    t.world.forceFight("Quinn", ...Array.from({ length: 3 }, () => ({ result: "win" as const, hpLost: 40, drops: [{ code: "skeleton_bone", quantity: 1 }] })));
    await t.run({ until: () => t.calls("fight", "Quinn").length >= 3 || !t.q("Quinn").running });
    const head = t.q("Quinn").items[0];
    t.ok(t.q("Quinn").running && !head?.error, `the train loop goes on: ${head?.error ?? "running"}`);
    t.eq(t.calls("fight", "Quinn").length, 3, "it hunts the skeleton for its bones");
    // the batch: half the bag of a Steel Ring's 15 materials — 4 runs, 60 units; the room beside it and a set's 12 pieces
    const max = 146, room = Math.floor((max - 4 * 15 - 12) / 3);
    const pots = t.calls("bank/withdraw/item", "Quinn").flatMap((c) => c.body as { code: string; quantity: number }[]).filter((s) => s.code.endsWith("health_potion"));
    t.ok(pots.length > 0 && pots.every((s) => s.quantity <= room), `each stack the hunt withdraws fits the room beside the batch (${room}): ${pots.map((s) => `${s.quantity} ${s.code}`).join(", ") || "none"}`);
  },
);
