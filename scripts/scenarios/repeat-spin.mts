// Audit B.3 X-11: 🔁 on and the only item already satisfied (a move to where
// the character stands). Nothing is left to do, so the queue should sit still.
// Today: every 50 ms lap finishes the item and re-appends it — about 20 writes
// of all queues to storage per second, and no action at all.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    known: "B.3 X-11",
    characters: [{ name: "Hal", x: 4, y: 1 }],
  },
  async (t) => {
    t.queue("Hal", [{ kind: "move", x: 4, y: 1 }], { repeat: true });
    const before = t.queueWrites();
    await t.run({ minutes: 1 });

    t.eq(t.calls().length, 0, "actions");
    const laps = t.queueWrites() - before;
    t.ok(laps <= 10, `queue writes in one virtual minute: got ${laps}, want at most 10`);
  },
);
