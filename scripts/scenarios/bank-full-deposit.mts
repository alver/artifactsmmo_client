// Task 015, settled point 1: a 462 is "the bank has no slot for this code". Pia (owned) carries copper ore (the bank holds
// a stack) and feathers (it holds none); the bank is full. The engine read one slot free at boot, so the first step's reset
// deposits both: the game answers 462, the ore goes in a second deposit, the feathers stay in the bag, the step goes on.
// The next step's reset (twice in a row) knows the bank is full: the feathers are not offered again — no 462, no bounce,
// nothing paused, nothing blocked, and the planner hears of it (a `plan: bank` line).
import { planLines, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 5, x: 4, y: 1, bag: { copper_ore: 20, feather: 10 } }], // on the bank
    bank: { copper_ore: 50, ash_wood: 5 },
    slots: 3, // one free at boot; the scenario takes it before the first deposit
    limits: { actions: 1200, minutes: 300 },
  },
  async (t) => {
    t.world.slots = 2; // another account action took the free slot: the engine's slots are stale
    await t.run({ until: () => (planner.value.current.Pia?.step.key.endsWith("#2") ?? false) && t.calls("gathering", "Pia").length > 200 });
    await t.run({ minutes: 1 });
    const deps = t.calls("bank/deposit/item", "Pia");
    t.eq(deps.filter((c) => c.code === 462).length, 1, "one 462: the first reset's deposit, from stale slots");
    t.ok(JSON.stringify(deps[0].body).includes("feather") && JSON.stringify(deps[1].body) === JSON.stringify([{ code: "copper_ore", quantity: 20 }]), `then the ore alone: ${JSON.stringify(deps.slice(0, 2).map((c) => c.body))}`);
    t.ok(deps.slice(1).every((c) => c.code === 200 && !JSON.stringify(c.body).includes("feather")), "the feathers are never offered again (the second reset, the bank-offs)");
    t.eq([t.inv("Pia", "feather"), t.bank("feather")], [10, 0], "the feathers stay in the bag");
    t.ok(t.bank("copper_ore") > 70, `the ore is banked: ${t.bank("copper_ore")}`);
    const plan = planLines(t, "Pia");
    t.ok(t.devlog().some((l) => l.includes("plan: bank — Pia could not bank Feather")), "the planner heard of it");
    t.ok(t.q("Pia").running && !t.q("Pia").items.some((i) => i.error), "nothing paused");
    t.eq(Object.keys(planner.value.blocked), [], `nothing blocked: ${plan.filter((l) => /blocked/.test(l)).join(" | ")}`);
  },
);
