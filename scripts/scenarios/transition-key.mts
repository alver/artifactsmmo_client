// Task 017, settled points 2, 3 and 6: a step behind a keyed transition. The lava fish live behind the Lava Underground's
// keyed transition (7, 3) → (6, 2) (one sonnengott key, consumed); the way back (6, 2) → (7, 3) is free. Fin (fishing 50)
// runs the step as itemsOf compiles a supply gather behind a toll: the reset takes the key out of the bank (the gather item's
// `take`), the key rides the keep list, the transition consumes it, the gathers are done, the way back is walked and what
// was gathered is banked.
import { scenario } from "../harness/index.mts";
import { insertItem, queues, startQueue } from "../../src/state/queue";
import type { QueueItem } from "../../src/plan/queue";

const key = "pl:src:lava_fish@Fin#1";
await scenario(
  {
    characters: [{ name: "Fin", level: 30, fishing_level: 50, x: 4, y: 1 }], // on the bank
    bank: { sonnengott_key: 3 },
    limits: { actions: 200, minutes: 120 },
  },
  async (t) => {
    const items: QueueItem[] = [
      { id: `${key}:0`, kind: "gear", job: { kind: "gather", skill: "fishing" }, reset: true },
      { id: `${key}:1`, kind: "gather", code: "lava_fish", resource: "lava_fish_spot", times: 6, done: 0, gear: true, take: { sonnengott_key: 1 } },
      { id: `${key}:2`, kind: "deposit-all" },
    ];
    items.forEach((it, i) => insertItem("Fin", it, i));
    startQueue("Fin");
    await t.run({ until: () => !queues.value.Fin?.items.length });
    const wd = t.calls("bank/withdraw/item", "Fin").flatMap((c) => c.body as { code: string; quantity: number }[]);
    t.eq(wd, [{ code: "sonnengott_key", quantity: 1 }], "the reset withdrew the one key the trip needs");
    const tr = t.calls("transition", "Fin");
    t.ok(tr.length >= 2 && tr.every((c) => c.code === 200), `in through the keyed transition and out through the free one: ${tr.length} transitions`);
    t.eq([t.bank("sonnengott_key"), t.inv("Fin", "sonnengott_key")], [2, 0], "the transition consumed the key");
    t.eq(t.calls("gathering", "Fin").length, 6, "the work was done");
    t.ok(t.bank("lava_fish") > 0 && t.inv("Fin", "lava_fish") === 0, `the catch is banked: ${t.bank("lava_fish")}`);
    const fin = t.world.chars.get("Fin")!;
    t.eq(fin.layer, "overworld", "the way back was walked");
    t.ok(!t.q("Fin").items.some((it) => it.error), "nothing paused");
  },
);
