// Task 015, settled points 3 and 4: 37 of 43 slots free (task 041: the tidy runs below 40) and outdated copper gear in the bank. Pia (owned, combat 15, in
// iron gear, every crafting role at level 1) takes tidy steps before anything else: the first recycles the copper boots and
// helmets whole (one workshop, two codes), the second the copper daggers; each code's slot is free once its last copy is
// recycled, the bars come back to the bank, and with 40 free the next decision is an ordinary step (the copper rings,
// outdated too, stay: nothing is tidied with 40 or more free). Two tidy steps in a row: no bounce, nothing blocked.
import { planLines, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";

const IRON = { weapon_slot: "iron_sword", helmet_slot: "iron_helm", body_armor_slot: "iron_armor", leg_armor_slot: "iron_legs_armor", boots_slot: "iron_boots", ring1_slot: "iron_ring", ring2_slot: "iron_ring", shield_slot: "iron_shield", amulet_slot: "life_amulet" };

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 15, x: 4, y: 1, ...IRON }], // on the bank
    bank: { copper_helmet: 11, copper_boots: 5, copper_dagger: 5, copper_ring: 15, copper_bar: 20, copper_ore: 100 },
    slots: 43, // 6 codes: 37 free
    limits: { actions: 600, minutes: 240 },
  },
  async (t) => {
    let codes = -1; // the bank's codes when the first ordinary step is decided (its reset banks Pia's worn set after)
    await t.run({ until: () => { const s = planner.value.current.Pia?.step; if (s && !s.target.startsWith("tidy:") && codes < 0) codes = t.world.bank.size; return codes >= 0; } });
    await t.run({ minutes: 1 });
    const plan = planLines(t, "Pia").filter((l) => /^(tidy|fallback|ach|lvl|src|mat|gear):/.test(l));
    t.ok(plan[0]?.startsWith("tidy:copper_boots@Pia#1 (tidy, 16 units") && plan[0].includes("Copper Boots ×5 and Copper Helmet ×11 recycled: frees 2 bank slots (37 → 39 free of 43)"), `the first step: ${plan[0]}`);
    t.ok(plan[1]?.startsWith("tidy:copper_dagger@Pia#1 (tidy, 5 units") && plan[1].includes("frees 1 bank slot (39 → 40 free of 43)"), `the second: ${plan[1]}`);
    t.ok(!!plan[2] && !plan[2].startsWith("tidy:"), `with 40 free the next is ordinary: ${plan[2]}`);
    const rec = t.calls("recycling", "Pia").map((c) => c.body as { code: string; quantity: number });
    t.eq(rec, [{ code: "copper_boots", quantity: 5 }, { code: "copper_helmet", quantity: 11 }, { code: "copper_dagger", quantity: 5 }], "every copy recycled, a code at a time");
    t.eq(["copper_boots", "copper_helmet", "copper_dagger"].map((c) => t.bank(c) + t.inv("Pia", c)), [0, 0, 0], "the codes are gone whole");
    t.eq(t.bank("copper_bar"), 20 + 2 * (5 + 11 + 5), "the bars came back to the bank (two a copy)");
    t.eq(codes, 3, "three codes when the ordinary step is decided: 40 of 43 slots free");
    t.eq(t.bank("copper_ring"), 15, "the rings stay: nothing is tidied with 40 free");
    t.eq(Object.keys(planner.value.blocked), [], "nothing blocked");
  },
);
