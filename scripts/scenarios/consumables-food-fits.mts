// Task 015, settled point 7: the food in the plan is the best-healing food of the stock that the fight's loss covers at
// least once. Pia (owned, combat 15, iron gear) kills cows: a fight loses about 152 HP by the forecast. The bank holds 400
// cooked chicken (80 HP) and 4 cooked wolf meat (200 HP). Before the repair the plan read the best food in stock (wolf meat:
// 152 ÷ 200 = 0 a kill) and every fight rested; task 015 took chicken. Task 025, settled point 5: a food costs its chain
// (chicken 85 s a unit) and is eaten only where it beats resting — Pia's 80 HP of rest cost about 27 s: the step takes no
// food and rests (old: chicken withdrawn and eaten, the wolf meat banked; new: neither withdrawn, nothing eaten).
import { achievement, planLines, scenario } from "../harness/index.mts";

const IRON = { weapon_slot: "iron_sword", helmet_slot: "iron_helm", body_armor_slot: "iron_armor", leg_armor_slot: "iron_legs_armor", boots_slot: "iron_boots", ring1_slot: "iron_ring", ring2_slot: "iron_ring", shield_slot: "iron_shield", amulet_slot: "life_amulet" };

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 15, x: 4, y: 1, ...IRON }], // on the bank
    bank: { cooked_chicken: 400, cooked_wolf_meat: 4 },
    achievements: [achievement("made_up_cows", 5, ["combat_kill", "cow", 30])],
    limits: { actions: 800, minutes: 240 },
  },
  async (t) => {
    await t.run({ until: () => t.calls("fight", "Pia").length >= 20 });
    await t.run({ minutes: 1 });
    const step = planLines(t, "Pia").find((l) => l.startsWith("ach:made_up_cows:0@Pia#1 "));
    t.ok(!!step && !/Cooked Chicken from the bank/.test(step) && !step.includes("Wolf Meat") && step.includes("rests ("), `the step takes no food and rests: ${step}`);
    const took = t.calls("bank/withdraw/item", "Pia").flatMap((c) => (c.body as { code: string }[]).map((x) => x.code));
    t.ok(!took.includes("cooked_chicken") && !took.includes("cooked_wolf_meat"), `neither withdrawn: ${took}`);
    t.eq(t.calls("use", "Pia").length, 0, "nothing eaten: the fights rest");
    t.eq([t.bank("cooked_chicken"), t.bank("cooked_wolf_meat")], [400, 4], "both stay banked");
  },
);
