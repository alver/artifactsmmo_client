// Task 017, settled points 2, 3 and 6: the fares of a trip. Sandwhisper Isle is 1,000 gold each way (Forest (2, 16) ↔ the
// isle's (−2, 21)). Wil (woodcutting 50, a 12-item bag) runs a gather of 20 palm wood whose item carries 4,500 gold of
// fares (two round trips and some): the reset keeps the pocket's 300 toward them, withdraws the other 4,200 and keeps
// them through its own gold sweep; on the isle the bag fills, the bank-off walks out (a fare), banks the wood and keeps the gold; back in (a
// fare), the rest is gathered, the closing deposit-all walks out (a fare) and banks the gold that is left. Every fare is
// a `spend` record.
import { scenario } from "../harness/index.mts";
import { insertItem, queues, startQueue } from "../../src/state/queue";
import type { QueueItem } from "../../src/plan/queue";

const key = "pl:src:palm_wood@Wil#1";
await scenario(
  {
    characters: [{ name: "Wil", level: 30, woodcutting_level: 50, x: 4, y: 1, inventory_max_items: 12, gold: 300 }], // on the bank, 300 in the pocket
    gold: 50_000,
    limits: { actions: 300, minutes: 180 },
  },
  async (t) => {
    t.world.yields.set("palm_tree", [{ code: "palm_wood", quantity: 1 }]);
    const items: QueueItem[] = [
      { id: `${key}:0`, kind: "gear", job: { kind: "gather", skill: "woodcutting" }, reset: true },
      { id: `${key}:1`, kind: "gather", code: "palm_wood", resource: "palm_tree", times: 20, done: 0, gear: true, take: { gold: 4500 } },
      { id: `${key}:2`, kind: "deposit-all" },
    ];
    items.forEach((it, i) => insertItem("Wil", it, i));
    startQueue("Wil");
    await t.run({ until: () => !queues.value.Wil?.items.length });
    const gw = t.calls("bank/withdraw/gold", "Wil").map((c) => (c.body as { quantity: number }).quantity);
    t.eq(gw, [4200], "the reset withdrew the fares less the pocket's 300, once (its gold sweep left the pocket alone)");
    t.eq(t.calls("bank/deposit/gold", "Wil").map((c) => (c.body as { quantity: number }).quantity), [500], "the bank-off kept the gold; the closing deposit-all banked the 500 the fares left");
    const tr = t.calls("transition", "Wil");
    t.eq(tr.length, 4, "in, out for the bank-off, in again, out at the end — one fare each way");
    t.eq(t.calls("gathering", "Wil").length, 20, "the work was done");
    t.eq([t.bank("palm_wood"), t.world.chars.get("Wil")!.gold, t.world.gold], [20, 0, 50_000 - 4200 + 500], "the wood banked, the pocket empty, 4,000 paid in fares (300 of them the pocket's)");
    const spent = t.journal("spend");
    t.eq(spent.map((r) => [r.what, r.code, r.q]), Array(4).fill(["fare", "gold", 1000]), "each fare is a spend record");
    t.ok(spent.every((r) => r.who === "Wil" && String(r.for).startsWith(`pl:src:palm_wood@Wil#1`) && /^overworld:/.test(r.via)), `with who, what for and where: ${JSON.stringify(spent[0])}`);
    t.ok(!t.q("Wil").items.some((it) => it.error), "nothing paused");
  },
);
