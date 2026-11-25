// Task 027f, B: a level step that only moves gear — Fourth's lvl:jewelrycrafting:25 ran 33 h without a unit and the stall rule
// never fired (its counter was the character's XP, which the day's offering interrupts moved, and its bound 5 × 4.6 h). Here
// Pia's level step (the planner's pick: a craft level for a needed piece, the train item, as Fourth's) cannot take its dagger
// off — the game refuses the unequip for ever (483, injected) — so it rests and tries again: no XP, kill, gather or craft of
// its own. The service restarts after 35 minutes of running; at 60 minutes in
// all (not 60 more) the step is blocked as stalled, and the block line says what stood still and for how long.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";

interface Carry { key: string; target: string; run: number }
const REFUSE = { who: "Pia", action: "unequip", n: 100_000, code: 483, message: "The character does not have enough HP to unequip this item." };

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1, weapon_slot: "copper_dagger" }],
    bank: { wooden_staff: 1 },
    achievements: [achievement("made_up_level", 5, ["combat_level", null, 30])],
    limits: { actions: 6000, minutes: 150 },
  },
  async (t) => {
    t.world.fault(REFUSE); // pending faults stay behind at a restart: each boot injects its own
    if (t.boot === 1) {
      await t.run({ until: () => (planner.value.current.Pia?.run ?? 0) >= 35 * 60 || Object.keys(planner.value.blocked).length > 0 });
      const r = planner.value.current.Pia!;
      t.eq(r.step.as, "level", `a level step (${r.step.key})`);
      t.eq(Object.keys(planner.value.blocked), [], "not blocked in the first 35 minutes of running");
      return t.restart({ key: r.step.key, target: r.step.target, run: r.run } satisfies Carry);
    }
    const c = t.carried as Carry;
    t.eq(planner.value.current.Pia?.step.key, c.key, "the step re-attached");
    const boot2 = Date.now();
    await t.run({ until: () => !!planner.value.blocked[`${c.target}@Pia`] });
    const b = planner.value.blocked[`${c.target}@Pia`];
    const mins = (Date.now() - boot2) / 60_000;
    t.ok(mins >= 23 && mins <= 30, `blocked ${mins.toFixed(1)} min into the second boot: the running clock summed over the restart`);
    t.ok(/^stalled: no XP, kill, gather or craft of its own for 6\d min of running/.test(b.why), `the why says what stood still and how long: ${b.why}`);
    const rec = t.journal().find((j) => j.k === "block" && j.target === c.target);
    t.eq(rec?.why, b.why, "the journal's block line carries it");
    await t.run({ minutes: 1 }); // the dev log flushes
    t.ok(planLines(t, "Pia").some((l) => l.startsWith(`blocked ${c.target} 6 h — stalled: `)), "the dev-log line");
  },
);
