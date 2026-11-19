// Task 010, section 3: the brake is per target. Pia (owned) supplies three crafting objectives that only Bob can craft
// (Bob holds the crafting roles and is not on, so the objectives themselves never run): the bank is a few ore and wood
// short of one bar or plank each, so every material is a short step of its own — `src:` gathers, then the `mat:` craft.
// Seven different short supply steps inside ten virtual minutes are work: no `flapping` line. Then a kill objective
// with one kill left and achievements that never move (the fake counts no kills; its weight keeps it behind the supply)
// is a step that ends at once with its unit done: six times running, and on the seventh start that target alone is
// blocked, with one dev-log line naming it, and the same start() decides something else.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";

const time = (t: { devlog(): string[] }, head: string): number =>
  Date.parse(t.devlog().find((l) => l.includes(` plan Pia: ${head}`))!.slice(0, 24)); // the line's ISO time

await scenario(
  {
    planner: { on: { Pia: true }, weight: { chicken_hunt: 0.001 } },
    characters: [
      { name: "Pia", level: 10, x: 4, y: 1, mining_level: 10, woodcutting_level: 10, weaponcrafting_level: 0, gearcrafting_level: 0, jewelrycrafting_level: 0, cooking_level: 0 },
      { name: "Bob", level: 10, x: 4, y: 1, weaponcrafting_level: 10, gearcrafting_level: 10, jewelrycrafting_level: 10, cooking_level: 10 },
    ],
    bank: {
      copper_dagger: 1, shell: 51, // the shell above its sell floor of 50 (stock.ts floor)
      iron_bar: 7, iron_ore: 9, spruce_plank: 1, spruce_wood: 10, // iron knife: 8 bars, 2 planks, 1 shell
      copper_bar: 5, copper_ore: 9, // copper dagger: 6 bars
      ash_plank: 5, ash_wood: 9, // wooden shield: 6 planks
    },
    achievements: [
      achievement("made_up_knife", 3, ["crafting", "iron_knife", 1]),
      achievement("made_up_dagger", 3, ["crafting", "copper_dagger", 1]),
      achievement("made_up_shield", 3, ["crafting", "wooden_shield", 1]),
      achievement("chicken_hunt", 5, ["combat_kill", "chicken", 40, 39]),
    ],
    limits: { actions: 400, minutes: 90 },
  },
  async (t) => {
    await t.run({ until: () => !!planner.value.blocked["ach:chicken_hunt:0@Pia"] });
    await t.run({ minutes: 1 }); // the dev log flushes every 500 ms
    const plan = planLines(t, "Pia");
    const steps = plan.filter((l) => /^(src|mat|gear|ach|lvl|fallback):/.test(l));
    const supply = steps.filter((l) => l.includes(" (supply, "));
    const targets = supply.map((l) => l.split("@")[0]);
    t.eq([...targets].sort(), ["mat:ash_plank", "mat:copper_bar", "mat:iron_bar", "mat:spruce_plank", "src:ash_wood", "src:copper_ore", "src:iron_ore"], "seven supply steps, seven different targets");
    t.eq(steps.slice(0, 7), supply, "they are the first seven steps");
    const span = (time(t, supply[6]) - time(t, supply[0])) / 60_000;
    t.ok(span < 10, `all seven started inside ten minutes: ${span.toFixed(1)} min`);
    t.ok(!plan.slice(0, plan.indexOf(steps[7])).some((l) => /blocked|ended empty|flapping/.test(l)), "none of them blocked or ended empty, no flapping line");
    const flaps = plan.filter((l) => l.startsWith("flapping"));
    t.eq(flaps, ["flapping — ach:chicken_hunt:0: 6 starts in 10 min, blocked 30 min"], "one flapping line, naming the one target, and only after the seventh chicken start");
    const chicken = steps.filter((l) => l.startsWith("ach:chicken_hunt:0@Pia#"));
    t.eq(chicken.map((l) => l.split(" ")[0]), [1, 2, 3, 4, 5, 6].map((n) => `ach:chicken_hunt:0@Pia#${n}`), "six one-kill steps of the same target, then the brake");
    t.ok(chicken.every((l) => l.includes("(objective, 1 units")), "each a step of one unit");
    t.eq(t.calls("fight", "Pia").filter((c) => c.code === 200).length, 6, "each did its unit: six fights");
    const after = plan[plan.indexOf(flaps[0]) + 1];
    t.ok(!!after && !after.startsWith("ach:chicken_hunt") && Math.abs(time(t, after) - time(t, flaps[0])) < 1000, `the same start() took something else: ${after?.split(" ")[0]}`);
    const b = planner.value.blocked["ach:chicken_hunt:0@Pia"];
    t.eq(b?.why === "flapping" && b.until - time(t, flaps[0]) >= 30 * 60_000 - 1000, true, "the target blocked for 30 minutes");
    t.eq(Object.keys(planner.value.blocked).filter((k) => k.endsWith("@Pia")), ["ach:chicken_hunt:0@Pia"], "nothing else blocked");
  },
);
