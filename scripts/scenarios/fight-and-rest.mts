// Fight ×4 against a monster the worn set beats, resting between fights; then
// the same with one forced loss: back from the spawn tile, heal, carry on.
// `food: false` — eating is the `use` action, which the fake does not have.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Cid", x: 0, y: 1, weapon_slot: "copper_dagger" }], // on the chicken tile
  },
  async (t) => {
    t.queue("Cid", [{ kind: "fight", monster: "chicken", times: 4, done: 0, food: false }]);
    await t.run();

    t.eq(t.q("Cid"), { items: [], running: false }, "the first queue ran to the end");
    t.eq(t.calls().map((c) => c.note ?? c.action), ["win", "rest", "win", "rest", "win", "rest", "win"], "a rest between every two fights");

    const before = t.calls().length;
    t.world.forceFight("Cid", { result: "loss" });
    t.queue("Cid", [{ kind: "fight", monster: "chicken", times: 3, done: 0, food: false }]);
    await t.run();

    t.eq(t.q("Cid"), { items: [], running: false }, "one loss does not pause the queue");
    t.eq(
      t.calls().slice(before).map((c) => c.note ?? c.action),
      ["rest", "loss", "rest", "move", "win", "rest", "win", "rest", "win"],
      "a loss: heal at the spawn tile, walk back, three wins",
    );
    const cid = t.world.chars.get("Cid")!;
    t.eq([cid.x, cid.y], [0, 1], "Cid is back on the chicken tile");
    t.eq(t.inv("Cid", "raw_chicken"), 3, "one raw chicken on every second kill of 7");
  },
);
