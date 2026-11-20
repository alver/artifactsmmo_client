// Task 013, settled point 9: what is in flight for an ach: target is what a running step still has to do. Pia's step
// takes all 55 chickens of the objective; when it stands at 47 of 55, the read (made up here: the fake does not count)
// says 47 done of 75 — the objective grew — and Quinn decides on the runtime's World: it plans the 20 that are really
// left (75 − 47 − Pia's 8), not nothing (75 − 47 − 55 < 0, the whole step).
import { achievement, scenario } from "../harness/index.mts";
import { planner, worldOf } from "../../src/state/planner";
import { achievements } from "../../src/state/store";
import { rank } from "../../src/plan/planner/decide";

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }, { name: "Quinn", level: 10, x: 4, y: 1 }],
    bank: { copper_dagger: 2 },
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 55])],
    limits: { actions: 1500, minutes: 120 },
  },
  async (t) => {
    const fight = (): { done: number } | undefined => t.q("Pia").items.find((it) => it.kind === "fight") as { done: number } | undefined;
    await t.run({ until: () => (fight()?.done ?? 0) >= 47 });
    const step = planner.value.current.Pia!.step;
    t.eq([step.target, step.units], ["ach:chicken_hunt:0", 55], "Pia's step: all 55");
    achievements.value = (achievements.value ?? []).map((a) => (a.code === "chicken_hunt" ? { ...a, objectives: [{ ...a.objectives[0], total: 75, progress: 47 }] } : a));
    const w = worldOf(Date.now());
    t.eq(w.current.Pia?.units, 55 - 47, "in flight for the objective: what Pia's step still has to do");
    const q = rank("Quinn", w).objectives.find((c) => c.target.key === "ach:chicken_hunt:0");
    t.eq(q?.step.units, 20, "Quinn plans what is really left");
  },
);
