// Task 016, settled point 2: a step that ends empty and one that pauses, read from the journal. Pia (owned) is sent first
// to a chicken objective (config.first) whose target vanishes before the first kill (598 twice: the item is skipped), so
// the step ends with no unit; then an ore objective whose first gather is refused (452): the queue pauses. Each step's
// `end` says how it ended and why, each is followed by its `block`, and the pause has its own `pause` record.
import { achievement, scenario } from "../harness/index.mts";

await scenario(
  {
    expect598: true, // the vanished target, on purpose
    planner: { on: { Pia: true }, first: ["chicken_hunt"] },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }],
    bank: { copper_dagger: 1 },
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 40]), achievement("made_up_ore", 3, ["gathering", "copper_ore", 50])],
    limits: { actions: 300, minutes: 60 },
  },
  async (t) => {
    t.world.fault({ who: "Pia", action: "fight", n: 2, code: 598, message: "Monster not found on this map." });
    t.world.fault({ who: "Pia", action: "gathering", n: 1, code: 452, message: "Injected: this gather is refused." });
    await t.run({ until: () => t.journal("block").length >= 2 });
    await t.run({ minutes: 1 });

    const ends = t.journal("end"), blocks = t.journal("block"), pauses = t.journal("pause");
    const [empty, paused] = ends;
    t.ok(empty?.key.startsWith("ach:chicken_hunt:0@Pia#1") && empty.how === "empty" && empty.units === 0, `the first step ended empty: ${JSON.stringify(empty)}`);
    t.ok(/twice in a row \(code 598\)/.test(empty?.why ?? ""), `…with the skip's reason: ${empty?.why}`);
    t.ok(!empty?.m?.n?.fight, `…a refused action has no echo: the meter counts no fight (${JSON.stringify(empty?.m?.n)})`);
    t.ok(paused?.key.startsWith("ach:made_up_ore:0@Pia#1") && paused.how === "blocked" && paused.why === "Injected: this gather is refused. (code 452)", `the second step paused: ${JSON.stringify(paused)}`);
    t.eq(blocks.map((b) => [b.target, b.why, b.strikes]), [["ach:chicken_hunt:0", empty?.why, 1], ["ach:made_up_ore:0", paused?.why, 1]], "a block for each, with the why");
    t.ok(blocks.every((b) => Date.parse(b.until) - Date.parse(b.t) === 6 * 3_600_000), "each for 6 hours");
    t.eq(pauses.map((p) => [p.who, p.code, p.err, p.id.startsWith("pl:ach:made_up_ore:0@Pia#1:")]), [["Pia", 452, "Injected: this gather is refused. (code 452)", true]], "the pause: who, the item, the error and its code");
    const order = t.journal().map((r) => r.k).filter((k) => ["step", "end", "block", "pause"].includes(k));
    t.eq(order.slice(0, 7), ["step", "end", "block", "step", "pause", "end", "block"], "in order: step, end, block; step, pause, end, block");
  },
);
