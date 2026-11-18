// Task 006, section 3: 598 "… not found on this map" is the game's answer, not
// an outage. Before 006 runLoop held every code ≥ 500 for 60 s and retried,
// forever. Now a 598 takes the ordinary error path at once: the queue pauses
// with the message and the code on the head item. (The outage path is still
// covered by transient-faults and 486-after-500.)
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
    t.queue("Pia", [{ kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 3, done: 0 }]);
    await t.run();

    t.eq(t.calls().map((c) => [c.action, c.code]), [["gathering", 598]], "one call, answered 598, nothing after it");
    t.eq(t.q("Pia").running, false, "the queue paused");
    t.eq(t.q("Pia").items[0]?.error, "Resource not found on this map. (code 598)", "the error on the head item, with its code");
    t.ok(Date.now() - T0 < 5_000, `paused within one tick, no 60 s hold (${Date.now() - T0} ms)`);
    t.ok(!log.value.some((e) => /network trouble/.test(e.text)), "never held as network trouble");
  },
);
