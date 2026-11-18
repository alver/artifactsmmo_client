// Audit B.4-8: a server 500 on an action, then 486 "an action is already in
// progress" on the retry (the first call was still being processed). The 486
// should be waited out like the 500.
// Before task 003: the 500 was held for a minute, then the 486 paused the queue.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Gus", x: 2, y: 0 }], // on the copper rocks
  },
  async (t) => {
    t.world.fault({ who: "Gus", action: "gathering", n: 1, code: 500, message: "Fatal error (Get User)" });
    t.world.fault({ who: "Gus", action: "gathering", n: 1, code: 486, message: "An action is already in progress for this character." });
    t.queue("Gus", [{ kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 3, done: 0 }]);
    await t.run();

    t.eq(t.calls("gathering").map((c) => c.code).slice(0, 2), [500, 486], "the injected faults were hit");
    t.eq(t.q("Gus").items[0]?.error, undefined, "the queue did not pause");
    t.eq(t.q("Gus"), { items: [], running: false }, "the queue ran to the end");
    t.eq(t.inv("Gus", "copper_ore"), 3, "ore gathered");
  },
);
