// Task 014, settled point 3: potions made through the bank by whoever is placed best. Pia (combat 10, alchemy 1) wins
// green slimes only with small health potions and cannot brew them; Quinn (alchemy 5) can. The bank holds no sunflower.
// The potions' need is a parent of supply: sunflowers are gathered (src:) and brewed by Quinn (mat:), each step's why
// naming the work it is for; Pia works on something else meanwhile and then kills the slimes with the stock.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { T0 } from "../harness/clock.mts";
import { planner } from "../../src/state/planner";

await scenario(
  {
    // task 025: at the floor 0.75 Pia wins 77% of her slime fights without a potion (admitted, no need for one); at 0.9 she
    // needs them, as the scenario was written
    planner: { on: { Pia: true, Quinn: true }, risk: { minWin: 0.9 }, potions: true }, // task 031: the potion mechanism
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }, { name: "Quinn", level: 3, x: 4, y: 1, alchemy_level: 5 }],
    bank: { copper_dagger: 1 },
    achievements: [achievement("made_up_slimes", 5, ["combat_kill", "green_slime", 20]), achievement("made_up_ore", 1, ["gathering", "copper_ore", 400])],
    limits: { actions: 3000, minutes: 900 },
    // task 027f: the fake has no XP, so a craft level never comes, and a level step that works (gathers its materials) is no
    // longer stalled — the two craft levels this world asks for gear pieces (Quinn's gearcrafting, Pia's weaponcrafting) are
    // blocked from the start, as the old stall rule blocked them after ~38 minutes; the potion chain is the subject here
    setup: () => {
      const until = T0 + 24 * 3_600_000, why = "the fake has no XP (task 027f)";
      planner.value = { ...planner.value, blocked: { "lvl:gearcrafting:5@Quinn": { until, why }, "lvl:weaponcrafting:5@Pia": { until, why } } };
    },
  },
  async (t) => {
    await t.run({ until: () => planner.value.current.Pia?.step.target === "ach:made_up_slimes:0" || t.calls("fight", "Pia").length > 0 });
    await t.run({ minutes: 1 });
    const pia = planLines(t, "Pia"), quinn = planLines(t, "Quinn");
    const brew = quinn.find((l) => l.startsWith("mat:small_health_potion@Quinn#"));
    t.ok(!!brew && brew.includes("for made_up_slimes"), `Quinn brews the potions, the why naming the work: ${brew}`);
    const supply = [...pia, ...quinn].filter((l) => /^(src:sunflower|mat:small_health_potion)@/.test(l));
    t.ok(supply.length >= 2 && supply.every((l) => l.includes("for made_up_slimes")), `every step of the potion's chain names the work: ${supply.map((l) => l.split(" — ")[0]).join(" | ")}`);
    t.ok(!pia.some((l) => l.startsWith("mat:small_health_potion@")), "Pia (alchemy 1) brews nothing");
    const kill = pia.find((l) => l.startsWith("ach:made_up_slimes:0@Pia#"));
    t.ok(!!kill && kill.includes("Small Health Potion from the bank"), `Pia kills the slimes with the stock: ${kill}`);
    t.ok(pia.indexOf(kill!) > 0, `Pia worked on something else first: ${pia[0]?.split(" — ")[0]}`);
    t.ok(!t.calls("crafting", "Pia").some((c) => (c.body as { code: string }).code === "small_health_potion"), "no brew by Pia anywhere");
  },
);
