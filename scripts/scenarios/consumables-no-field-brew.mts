// Task 014, settled points 1–4: an owned fighter at the recipe's level (alchemy 5, small health potion), the bank empty of
// the potion, 20 green slimes to kill that it wins only with the potion: no gather and no brew inside a fight item. The
// planner's supply step makes the potions from the bank's sunflowers (mat:, the objective's score), then the kill step runs
// with the potions it planned, taken by its reset.
import { effect } from "@preact/signals";
import { achievement, planLines, scenario } from "../harness/index.mts";
import { queues } from "../../src/state/queue";
import { planner } from "../../src/state/planner";

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1, alchemy_level: 5 }], // on the bank
    bank: { copper_dagger: 1, sunflower: 300 },
    achievements: [achievement("made_up_slimes", 5, ["combat_kill", "green_slime", 20])],
    limits: { actions: 800, minutes: 300 },
  },
  async (t) => {
    const heads: [number, string, string][] = []; // trace length → the head item's id and kind
    effect(() => { const h = queues.value.Pia?.items[0]; heads.push([t.world.trace.length, h?.id ?? "", h?.kind ?? ""]); });
    await t.run({ until: () => t.calls("fight", "Pia").length >= 5 || (planner.value.current.Pia?.step.key.endsWith("#3") ?? false) });
    await t.run({ minutes: 1 });
    const plan = planLines(t, "Pia");
    const made = plan.find((l) => l.startsWith("mat:small_health_potion@Pia#"));
    t.ok(!!made && made.includes("(supply,") && made.includes("made_up_slimes"), `a supply step makes the potions for the objective: ${made}`);
    const kill = plan.find((l) => l.startsWith("ach:made_up_slimes:0@Pia#"));
    t.ok(!!kill && kill.includes("Small Health Potion from the bank"), `then the kill step, with the potions it takes: ${kill}`);
    t.ok(plan.indexOf(made!) < plan.indexOf(kill!), "the potions first, the fights after");
    const inFight = (i: number): boolean => { let k = ""; for (const [n, , kind] of heads) if (n <= i) k = kind; return k === "fight"; };
    const bad = t.world.trace.map((c, i) => [c, i] as const).filter(([c, i]) => c.who === "Pia" && (c.action === "crafting" || c.action === "gathering") && inFight(i));
    t.eq(bad.length, 0, "no gather and no craft while a fight item is the head");
    const fights = t.calls("fight", "Pia");
    t.ok(fights.length >= 5 && fights.every((c) => c.note === "win"), `the fights won: ${fights.length}`);
    t.ok(!plan.some((l) => /blocked|flapping|no step/.test(l)), "nothing blocked");
  },
);
