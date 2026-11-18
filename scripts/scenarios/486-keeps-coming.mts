// The bound of the 486 hold: when "an action is already in progress" keeps
// coming, the runner retries 6 times, 5 s apart, then pauses the queue with the
// code in the error — a state that is really stuck must not spin forever.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Gus", x: 2, y: 0 }], // on the copper rocks
  },
  async (t) => {
    t.world.fault({ who: "Gus", action: "gathering", n: 50, code: 486, message: "An action is already in progress for this character." });
    t.queue("Gus", [{ kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 3, done: 0 }]);
    await t.run();

    t.eq(t.q("Gus").running, false, "the queue paused");
    t.eq(t.q("Gus").items[0]?.error, "An action is already in progress for this character. (code 486, 6 retries)", "the error on the head item");
    t.eq(t.calls("gathering").map((c) => c.code), Array(7).fill(486), "one call and six retries");
    t.eq(t.calls("gathering").at(-1)!.t, 30_350, "virtual ms until the pause: six holds of 5 s");
  },
);
