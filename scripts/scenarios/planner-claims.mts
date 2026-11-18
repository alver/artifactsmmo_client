// Task 008, section 6: an achievement completes between two achievements reads and its reward waits in the
// pending items. The read after the objective's step shows it newly completed → one pending-rewards read → a
// `claim` interrupt on the owned character with the emptiest bag: at the bank, claim_item for the row, then
// deposit what was claimed. The dev log names it, the gem bag's contents written out.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";
import { pendingRewards } from "../../src/state/store";

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }],
    bank: { copper_dagger: 1 },
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 40])],
    limits: { actions: 400, minutes: 120 },
  },
  async (t) => {
    await t.run({ until: () => t.calls("fight", "Pia").length >= 3 });
    // Between two reads: the game completes the achievement and puts its reward in the pending items.
    const a = t.world.achievements[0];
    a.objectives[0].progress = 40;
    a.completed_at = new Date().toISOString();
    t.world.pending.push({
      id: "reward-1", account: "harness", source: "achievement", source_id: "chicken_hunt", description: "Chicken Hunt reward",
      gold: 500, items: [{ code: "small_bag_of_gems", quantity: 1 }, { code: "copper_ore", quantity: 3 }], created_at: new Date().toISOString(), claimed_at: null,
    });

    await t.run({ until: () => t.bank("small_bag_of_gems") > 0 && !t.q("Pia").items.some((it) => it.kind === "claim") });
    const claim = t.calls().findIndex((c) => c.action === "claim_item/reward-1");
    t.ok(claim >= 0 && t.calls()[claim].code === 200, "claimed at the bank");
    const after = t.calls().slice(claim + 1, claim + 3).map((c) => c.action);
    t.eq(after, ["bank/deposit/item", "bank/deposit/gold"], "then what was claimed went into the bank");
    t.eq([t.bank("small_bag_of_gems"), t.bank("copper_ore")], [1, 3], "the bag of gems and the ore are banked");
    t.eq(pendingRewards.value, [], "nothing pending");
    await t.run({ minutes: 1 });
    t.ok(t.devlog().some((l) => l.includes("claim Pia: Chicken Hunt reward — 1× small_bag_of_gems (gems 25 each), 3× copper_ore, 500 gold")), "the dev log names the claim, the gem bag written out");
    t.ok(t.devlog().some((l) => l.includes("plan: completed chicken_hunt (+5)")), "and the completion that set it off");
    t.ok(planLines(t, "Pia").some((l) => l.startsWith("interrupt claim — Claim pending rewards")), "through the claim interrupt");
    t.ok(t.q("Pia").running && planner.value.current.Pia?.step.as === "fallback", "the objective is done; the next step runs");
  },
);
