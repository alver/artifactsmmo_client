// An offer priced in an item, not gold: the tailor's cloth costs 3 wool. No
// gold is involved; the purchase happens once.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Pat", x: 4, y: 1, bag: { wool: 7 } }], // the tailor is at (3, 3)
    gold: 5_000,
  },
  async (t) => {
    t.queue("Pat", [{ kind: "buy", code: "cloth", quantity: 2, npc: "tailor" }]);
    await t.run();

    t.eq(t.q("Pat"), { items: [], running: false }, "the queue ran to the end");
    t.eq(t.calls().map((c) => [c.action, c.body]), [["move", { x: 3, y: 3 }], ["npc/buy", { code: "cloth", quantity: 2 }]], "the calls, in order");
    t.eq([t.inv("Pat", "cloth"), t.inv("Pat", "wool"), t.world.gold], [2, 1, 5_000], "cloth, wool left, bank gold untouched");
  },
);
