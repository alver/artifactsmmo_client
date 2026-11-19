// Task 009: supply through the bank. An open crafting objective (a copper dagger) whose material is made by another
// craft (copper bars from copper ore) and an empty bank: the owned character takes a `src:copper_ore` step — a bank
// reset, the gathers, deposit-all — it runs, the ore is in the bank when it ends, the step is sampled (its units
// are read past the trailing deposit-all, src/state/planner.ts measure), not blocked, and the next step is decided.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }], // on the bank
    achievements: [achievement("made_up_dagger", 3, ["crafting", "copper_dagger", 1])],
    limits: { actions: 400, minutes: 240 },
  },
  async (t) => {
    let oreAtNext = -1;
    await t.run({
      until: () => {
        const s = planner.value.current.Pia?.step;
        if (s && !s.key.startsWith("src:copper_ore@Pia#1") && oreAtNext < 0) oreAtNext = t.bank("copper_ore");
        return oreAtNext >= 0;
      },
    });
    await t.run({ minutes: 1 }); // the dev log's sink flushes on a timer
    const plan = planLines(t, "Pia");
    const first = plan.find((l) => l.startsWith("src:copper_ore@Pia#1 "));
    t.ok(first?.includes("(supply, 60 units"), `the first step: 60 copper ore gathers for the bars of the dagger — ${first}`);
    t.eq(t.calls("gathering", "Pia").length, 60, "the step gathered its 60 units");
    t.ok(t.calls("bank/deposit/item", "Pia").some((c) => JSON.stringify(c.body).includes("copper_ore")), "its deposit-all put the ore in the bank");
    t.ok(oreAtNext >= 60, `the bank held the ore when the next step was decided: ${oreAtNext}`);
    t.ok(plan.some((l) => l.startsWith("sample gather:copper_rocks ")), `the step was sampled: ${plan.filter((l) => l.startsWith("sample")).join(" | ")}`);
    t.ok(!plan.some((l) => /blocked|ended empty|flapping/.test(l)), "not blocked, not ended empty");
    const next = planner.value.current.Pia?.step;
    t.ok(!!next && next.key !== "src:copper_ore@Pia#1" && t.q("Pia").running, `the next step is decided and running: ${next?.key}`);
  },
);
