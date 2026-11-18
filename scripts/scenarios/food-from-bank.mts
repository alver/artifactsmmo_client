// fight-and-rest with food on and cooked food in the bank: after the first
// fight the hurt fighter fetches rations, eats when the wound is worth a
// portion, and fights on. The withdrawn food is never put back (bounce check).
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Ned", x: 4, y: -1, weapon_slot: "copper_dagger" }], // on a yellow slime tile; 120 HP
    bank: { cooked_chicken: 30 }, // 80 HP each
  },
  async (t) => {
    t.queue("Ned", [{ kind: "fight", monster: "yellow_slime", times: 4, done: 0 }]);
    await t.run();

    t.eq(t.q("Ned"), { items: [], running: false }, "the queue ran to the end");
    t.eq(t.calls("fight").map((c) => c.note), ["win", "win", "win", "win"], "fights");
    t.eq(t.calls("bank/withdraw/item").length, 1, "one food run");
    t.ok(t.calls("use").length >= 3 && t.calls("use").every((c) => (c.body as { code: string }).code === "cooked_chicken"), "the fighter eats between fights");
    t.eq(t.calls("bank/deposit/item").length, 0, "nothing is banked");
    t.eq(t.inv("Ned", "cooked_chicken") + t.bank("cooked_chicken") + t.calls("use").reduce((n, c) => n + (c.body as { quantity: number }).quantity, 0), 30, "every chicken is in the bag, in the bank or eaten");
  },
);
