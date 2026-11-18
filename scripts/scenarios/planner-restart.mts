// Task 008, section 2: the service restarts in the middle of a step. The first engine is stopped where it
// stands (as a killed process: nothing unwound) and a second one boots in a new process on the same storage, the
// same fake world and clock (harness restart()). It re-attaches by the items' ids: no second copy of an item, the
// counter kept, the step's running seconds kept (the downtime not counted), no new decision — and the step goes on.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";

interface Carry { key: string; ids: string[]; done: number; run: number }
const fightDone = (items: { kind: string; done?: number }[]): number => items.find((it) => it.kind === "fight")?.done ?? -1;

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }],
    bank: { copper_dagger: 1 },
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 40])],
    limits: { actions: 400, minutes: 120 },
  },
  async (t) => {
    if (t.boot === 1) {
      await t.run({ until: () => fightDone(t.q("Pia").items) >= 5 });
      const r = planner.value.current.Pia!;
      const carry: Carry = { key: r.step.key, ids: t.q("Pia").items.map((it) => it.id), done: fightDone(t.q("Pia").items), run: r.run };
      await t.run({ minutes: 1 }); // the dev log flushes; the next fight may land meanwhile
      carry.done = fightDone(t.q("Pia").items);
      carry.run = planner.value.current.Pia!.run;
      return t.restart(carry);
    }
    const c = t.carried as Carry;
    t.eq(t.q("Pia").items.map((it) => it.id), c.ids, "the same items by id after the second boot — no second copy");
    t.eq(planner.value.current.Pia?.step.key, c.key, "the step re-attached");
    t.eq(fightDone(t.q("Pia").items), c.done, "the counter kept");
    t.ok(Math.abs(planner.value.current.Pia!.run - c.run) < 60, `the running seconds kept (${c.run.toFixed(0)} → ${planner.value.current.Pia!.run.toFixed(0)})`);
    await t.run({ until: () => fightDone(t.q("Pia").items) >= c.done + 3 });
    t.ok(t.q("Pia").running && planner.value.current.Pia?.step.key === c.key, "the same step goes on, running");
    await t.run({ minutes: 1 });
    const lines = planLines(t, "Pia");
    t.ok(lines.includes(`re-attached ${c.key}`), "the dev log says re-attached");
    t.ok(!lines.some((l) => /^(ach|lvl|fallback):/.test(l)), `no new decision in the second boot: ${lines.join(" | ")}`);
  },
);
