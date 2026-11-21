// Task 016, settled points 2 and 4: a gather step and a kill step from the decision to the end, read from the journal.
// Pia (owned) has an open gathering objective: the step gathers its ore and banks it. Then (the fake's achievements move
// on, as the game's would) the ore objective is complete and a slime objective is open: the kill step plans the bank's
// potions and food, the fights drink four potions each (forced) and lose 100 HP, so it eats, and it ends when the
// potions run dry. Each step has its `step` and `end` record; each end's meter has the seconds by group summing to the
// step's wall seconds within a second (no interrupt inside), and says what was withdrawn, drunk, eaten and banked.
import { achievement, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";
import type { Rec } from "../harness/index.mts";

const sum = (o: Record<string, number> = {}): number => Object.values(o).reduce((s, v) => s + v, 0);

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1, alchemy_level: 5, mining_level: 5 }], // on the bank
    bank: { copper_dagger: 1, small_health_potion: 40, cooked_gudgeon: 30 },
    achievements: [achievement("made_up_ore", 5, ["gathering", "copper_ore", 30])],
    limits: { actions: 800, minutes: 300 },
  },
  async (t) => {
    await t.run({ until: () => t.calls("gathering", "Pia").length >= 30 });
    // the game counts the gathers: the ore objective is done; a slime objective opens (read at the step's end)
    t.world.achievements = [achievement("made_up_ore", 5, ["gathering", "copper_ore", 30, 30]), achievement("made_up_slimes", 5, ["combat_kill", "green_slime", 50])];
    t.world.achievements[0].completed_at = new Date().toISOString();
    t.world.forceFight("Pia", ...Array.from({ length: 10 }, () => ({ result: "win" as const, used: { small_health_potion: 4 }, hpLost: 100 })));
    await t.run({ until: () => t.journal("end").length >= 2 });
    await t.run({ minutes: 1 });

    const steps = t.journal("step"), ends = t.journal("end");
    t.eq(t.journal()[0]?.k, "boot", "the run's records start with its boot (the offerings catch-up before it waits)");
    const [g, k] = steps;
    t.ok(g?.work.kind === "gather" && g.as === "objective" && g.units === 30, `the first step gathers the 30 ore: ${JSON.stringify(g)}`);
    t.ok(k?.work.kind === "kill" && k.work.monster === "green_slime" && (k.wd?.small_health_potion ?? 0) > 0, `the second kills slimes with potions from the bank: ${JSON.stringify(k)}`);
    const end = (s: Rec): Rec => ends.find((e) => e.key === s.key)!;
    const eg = end(g), ek = end(k);
    t.ok(!!eg && !!ek, "an end for each");
    t.eq([eg.how, eg.units, eg.of], ["done", 30, 30], "the gather step: done, 30 of 30");
    t.eq([ek.how, ek.units, ek.of], ["done", 10, k.units], "the kill step: done when the potions ran dry, 10 kills");
    for (const e of [eg, ek]) {
      t.ok(Math.abs(sum(e.m.by) - e.m.s) < 0.15, `${e.key}: the groups sum to the seconds metered (${sum(e.m.by).toFixed(1)} of ${e.m.s})`);
      t.ok(Math.abs(e.m.s - e.wall) <= 1, `${e.key}: the seconds metered are the wall seconds within a second (${e.m.s} of ${e.wall})`);
      t.ok(e.ran <= e.wall + 1 && e.plan > 0, `${e.key}: the running ${e.ran} s within the wall ${e.wall} s, ${e.plan} s planned`);
    }
    t.eq([eg.m.n.gathering, eg.m.got?.copper_ore], [30, 30], "the gather step: 30 gathers, 30 ore got");
    t.ok(eg.m.by.gather === 900 && eg.m.by.walk > 0, `its seconds: ${JSON.stringify(eg.m.by)}`);
    t.eq(ek.m.dep?.copper_ore, 30, "the kill step's reset banked the gather step's ore (a step's bag goes to the bank at the next reset)");
    t.eq([ek.m.won, ek.m.drunk?.small_health_potion, ek.m.wd?.small_health_potion], [10, 40, 40], "the kill step: 10 won, the 40 potions withdrawn and drunk");
    const ate = t.calls("use", "Pia").length;
    t.ok(ate > 0 && ek.m.used?.cooked_gudgeon === ate && ek.m.n.use === ate && (ek.m.wd?.cooked_gudgeon ?? 0) >= ate, `…and ate what it withdrew: ${ate} used, ${ek.m.wd?.cooked_gudgeon} withdrawn`);
    t.ok(ek.m.by.fight > 0 && ek.m.by.eat > 0, `its seconds: ${JSON.stringify(ek.m.by)}`);
    t.ok(t.journal("ach").some((a) => a.code === "made_up_ore" && a.pts === 5), "the ore objective's completion is an `ach` record");
    t.ok(planner.value.current.Pia?.step.key !== k.key && t.q("Pia").running, "the next step runs");
  },
);
