// Task 016, settled points 2 and 4: a restart in the middle of a step. The first engine is stopped where it stands after
// a few fights of a 40-kill step (harness restart(): a second engine in a new process on the same storage and world).
// The second run's journal starts with its `boot`, naming the step it re-attached; when the step ends its `end` is marked
// partial, and its meter holds only what was metered since that boot (the meter lives in memory).
import { achievement, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";

interface Carry { key: string; fights: number; run: string }

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
      await t.run({ until: () => t.calls("fight", "Pia").length >= 8 });
      await t.run({ minutes: 1 });
      const boot = t.journal("boot")[0];
      t.ok(!!boot && !boot.chars.Pia.step, `the first boot re-attached nothing: ${JSON.stringify(boot)}`);
      return t.restart({ key: planner.value.current.Pia!.step.key, fights: t.calls("fight", "Pia").length, run: boot.run } satisfies Carry);
    }
    const c = t.carried as Carry;
    await t.run({ until: () => t.journal("end").length > 0 });
    await t.run({ minutes: 1 });
    const recs = t.journal();
    t.eq([recs[0]?.k, recs[0]?.chars?.Pia?.step], ["boot", c.key], "the second run's journal starts with its boot, naming the step re-attached");
    t.ok(recs[0].run !== c.run && recs.every((r) => r.run === recs[0].run), `a new run id, on every record of this run (${c.run} → ${recs[0].run})`);
    const end = t.journal("end")[0];
    t.ok(end.key === c.key && end.how === "done" && end.partial === true, `its end is marked partial: ${JSON.stringify({ ...end, m: undefined })}`);
    const fights = t.calls("fight", "Pia").length - c.fights;
    t.ok(end.m.n.fight >= fights - 1 && end.m.n.fight <= fights && end.m.n.fight < 40, `its meter has the fights since the boot only: ${end.m.n.fight} (${fights} calls since the restart)`);
    t.eq(end.units, 40, "the step's units are its whole 40 (the queue's counter survived)");
  },
);
