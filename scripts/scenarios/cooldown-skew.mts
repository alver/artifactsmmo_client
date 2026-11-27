// Task 032 (E): a cooldown is waited by the game's clock, not this machine's. Gus gathers copper for good; the fake's clock
// runs with the engine's for an hour, then 3 s ahead of it for an hour, then 3 s behind for an hour (each after two minutes
// to let the first echo of the new offset in: the switch itself may cost one 499). In every hour Gus makes as many actions
// as with no offset, and no 499 is answered inside them. On the starting tree: 3 s more a gather ahead, a 499 every action
// behind.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Gus", x: 2, y: 0 }],
    limits: { actions: 2000, minutes: 200 },
  },
  async (t) => {
    t.queue("Gus", [{ kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 0, done: 0 }]);
    const hour = async (skew: number): Promise<{ n: number; c499: number }> => {
      t.world.skew = skew;
      await t.run({ minutes: 2 });
      const from = t.world.trace.length;
      await t.run({ minutes: 60 });
      const calls = t.world.trace.slice(from);
      return { n: calls.length, c499: calls.filter((c) => c.code === 499).length };
    };
    const even = await hour(0), ahead = await hour(3000), behind = await hour(-3000);
    t.ok(even.n > 100 && even.c499 === 0, `with no offset: ${even.n} actions an hour, no 499 (${even.c499})`);
    t.ok(Math.abs(ahead.n - even.n) <= 1 && ahead.c499 === 0, `the game's clock 3 s ahead: ${ahead.n} actions against ${even.n}, 499s ${ahead.c499}`);
    t.ok(Math.abs(behind.n - even.n) <= 1 && behind.c499 === 0, `the game's clock 3 s behind: ${behind.n} actions against ${even.n}, 499s ${behind.c499}`);
  },
);
