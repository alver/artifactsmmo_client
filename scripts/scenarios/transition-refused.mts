// Task 017, settled point 4: a fare is refused at the gold floor. Jo (woodcutting 50) has one open objective, palm wood,
// which grows only on Sandwhisper Isle (1,000 gold each way); the bank holds 20,000 gold — exactly GOLD_FLOOR — so the gold
// budget is nothing: no step behind the boat is planned, nothing is spent, Jo works elsewhere.
import { achievement, scenario } from "../harness/index.mts";

await scenario(
  {
    planner: { on: { Jo: true } },
    characters: [{ name: "Jo", level: 20, woodcutting_level: 50, x: 4, y: 1 }], // on the bank
    gold: 20_000,
    achievements: [achievement("made_up_palm", 5, ["gathering", "palm_wood", 50])],
    limits: { actions: 300, minutes: 30 },
  },
  async (t) => {
    await t.run({ minutes: 20 });
    const steps = t.journal("step");
    t.ok(steps.length >= 1 && steps.every((s) => !String(s.key).startsWith("ach:made_up_palm") && !s.wd?.gold), `no step for the palms, no fare reserved: ${steps.map((s) => `${s.key} (${s.as})`).join(", ")}`);
    t.eq([t.calls("transition", "Jo").length, t.calls("bank/withdraw/gold", "Jo").length, t.journal("spend").length], [0, 0, 0], "no boat, no gold withdrawn, nothing spent");
    t.eq(t.world.gold, 20_000, "the bank keeps its floor");
  },
);
