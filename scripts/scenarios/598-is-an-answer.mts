// 598 "… not found on this map" at action time is a vanished target (task 008, settled point 8; decision 16 of
// docs/rework.md), for every queue. Task 006 made it pause the queue; before 006 it was held for 60 s as an outage.
// Now: one 598 → the item runs once more and picks its tile again; a second 598 in a row on the same item skips
// it. Never a pause, never "network trouble". (The outage path is covered by transient-faults and 486-after-500.)
import { scenario } from "../harness/index.mts";
import { T0 } from "../harness/clock.mts";
import { log } from "../../src/state/store";

await scenario(
  {
    expect598: true,
    characters: [{ name: "Pia", x: 2, y: 0 }], // on the copper rocks
  },
  async (t) => {
    t.world.fault({ who: "Pia", action: "gathering", n: 1, code: 598, message: "Resource not found on this map." });
    t.queue("Pia", [
      { kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 3, done: 0 },
      { kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 2, done: 0 },
    ]);
    await t.run({ until: () => t.q("Pia").items.length === 1 });
    t.eq(t.calls().map((c) => [c.action, c.code]), [["gathering", 598], ["gathering", 200], ["gathering", 200], ["gathering", 200]], "one 598, looked again: the first item gathers its 3");
    t.ok(Date.now() - T0 < 5 * 60_000, `no 60 s hold (${Date.now() - T0} ms)`);

    t.world.fault({ who: "Pia", action: "gathering", n: 2, code: 598, message: "Resource not found on this map." });
    await t.run();
    t.eq(t.calls().slice(4).map((c) => [c.action, c.code]), [["gathering", 598], ["gathering", 598]], "two 598 in a row on the second item, nothing after");
    t.eq(t.q("Pia"), { items: [], running: false }, "the second item skipped, the queue ran to its end — never paused");
    t.ok(log.value.some((e) => e.text.startsWith("skipped: Gather 2× Copper Ore — Resource not found on this map. — twice in a row (code 598)")), "the skip is in the log");
    t.ok(!log.value.some((e) => /network trouble|queue paused/.test(e.text)), "never held as network trouble, never paused");
    t.eq(t.inv("Pia", "copper_ore"), 3, "the skipped item gathered nothing");
  },
);
