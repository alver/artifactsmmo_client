// Task 029, D.2 and A.4: the planner's train step whose bank lacks a drop — Pia (owned, combat 28, weaponcrafting 20) runs the
// step's Battlestaff (code, runs) with the bank short of Wolf Bones: what the bank lacks it sources itself, as before — it hunts
// the wolf — and the hunt eats by 027g's rule (the bank's food, withdrawn into what the bag holds beside the batch) instead of
// resting. (The fake has no XP: the scenario stops at the hunt's third fight.)
import { scenario } from "../harness/index.mts";
import { plannerOn } from "../../src/state/store";

await scenario(
  {
    characters: [{ name: "Pia", level: 28, x: 4, y: 1, weaponcrafting_level: 20 }],
    bank: {
      hardwood_plank: 30, steel_bar: 20, blue_slimeball: 25, // Battlestaffs but their Wolf Bones
      skull_staff: 1, slime_shield: 1, piggy_helmet: 1, piggy_armor: 1, piggy_pants: 1, steel_boots: 1, skull_ring: 1, steel_ring: 1, ruby_amulet: 1,
      cooked_trout: 200,
    },
    limits: { actions: 200, minutes: 60 },
  },
  async (t) => {
    t.queue("Pia", [{ kind: "train", skill: "weaponcrafting", toLevel: 0, levels: 1, gear: true, code: "battlestaff", runs: 5, done: 0 }]);
    plannerOn.value = { Pia: true };
    t.world.forceFight("Pia", ...Array.from({ length: 3 }, () => ({ result: "win" as const, hpLost: 280, drops: [{ code: "wolf_bone", quantity: 1 }] })));
    await t.run({ until: () => t.calls("fight", "Pia").length >= 3 || !t.q("Pia").running });
    const head = t.q("Pia").items[0];
    t.ok(t.q("Pia").running && !head?.error, `the train loop goes on: ${head?.error ?? "running"}`);
    t.eq(t.calls("fight", "Pia").length, 3, "it hunts the wolf for its bones");
    // after each fight its first heal is a bite of the bank's Cooked Trout (225 HP of the 280 lost; the rest of a deficit under
    // one unit is rested, as 027g's rule has it), and the food rides in the bag — one trip to the bank for it
    const acts = t.calls(undefined, "Pia").map((a) => a.action);
    const after = acts.flatMap((p, i) => (p === "fight" ? [acts.slice(i + 1).find((q) => q === "use" || q === "rest")] : [])).filter(Boolean);
    t.eq(after, ["use", "use"], "after each fight it eats first (the last fight's heal is the next tick's)");
    const trips = t.calls("bank/withdraw/item", "Pia").filter((c) => (c.body as { code: string }[]).some((x) => x.code === "cooked_trout")).length;
    t.ok(trips <= 2, `the food comes from the bank in ${trips} withdrawal(s), not one a fight`);
  },
);
