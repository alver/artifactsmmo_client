// Task 015, settled point 5: no slot free, nothing to tidy (no gear in the bank), no expansion possible (5,000 gold: the
// next price would leave the bank under the floor). Pia (owned) has an open objective that would bring a code the bank does
// not hold (ash wood): it is no candidate, and Pia works on with what the bank holds (copper ore, a stack the bank has).
// The planner says what is stuck (one `plan: bank` line within the hour, the price line once); nobody is paused.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 5, x: 4, y: 1 }], // on the bank
    bank: { copper_ore: 50, copper_bar: 5, feather: 5, cowhide: 5 },
    slots: 4, // full
    gold: 5_000,
    achievements: [achievement("made_up_ash", 3, ["gathering", "ash_wood", 50])],
    limits: { actions: 400, minutes: 120 },
  },
  async (t) => {
    await t.run({ minutes: 40 });
    const plan = planLines(t, "Pia").filter((l) => /^(ach|fallback|lvl|src|mat|gear|tidy):/.test(l));
    t.ok(plan.length >= 1 && plan.every((l) => !l.startsWith("ach:made_up_ash")), `the ash-wood objective is no candidate: ${plan.map((l) => l.split(" ")[0]).join(", ")}`);
    t.ok(plan[0]?.startsWith("fallback:mining"), `Pia gathers copper ore, a stack the bank holds: ${plan[0]}`);
    t.eq(t.calls("gathering", "Pia").length > 0 && t.world.chars.get("Pia")!.x === 2, true, "at the copper rocks");
    const bank = t.devlog().filter((l) => l.includes("plan: bank"));
    t.ok(bank.some((l) => l.includes("no slot free, nothing to tidy, no expansion") && l.includes("nobody is paused")), `what is stuck: ${bank.join(" | ")}`);
    t.eq(bank.filter((l) => l.includes("not bought")).length, 1, "the price line once");
    t.ok(t.q("Pia").running && !t.q("Pia").items.some((i) => i.error), "nobody paused");
    t.eq(Object.keys(planner.value.blocked), [], "nothing blocked");
  },
);
