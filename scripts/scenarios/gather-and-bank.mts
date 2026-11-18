// One character gathers ×25 with a 10-item bag, 2 ore per gather: the bag fills
// every 5 gathers, it banks off and comes back, the item finishes, and a
// deposit-all puts the last bagful in the bank.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Ann", x: 4, y: 1, inventory_max_items: 10 }], // starts on the bank; copper rocks are at (2, 0)
  },
  async (t) => {
    t.world.yields.set("copper_rocks", [{ code: "copper_ore", quantity: 2 }]);
    t.queue("Ann", [
      { kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 25, done: 0 },
      { kind: "deposit-all" },
    ]);

    await t.run({ until: () => t.bank("copper_ore") > 0 }); // the first bank trip
    t.eq(t.calls("gathering").length, 5, "gathers before the bag was full");
    t.eq(t.q("Ann").running, true, "the queue is still running");

    await t.run();
    t.eq(t.q("Ann"), { items: [], running: false }, "the queue ran to the end");
    t.eq(t.calls("gathering").length, 25, "gathers");
    t.eq(t.calls("bank/deposit/item").map((c) => c.body), Array(5).fill([{ code: "copper_ore", quantity: 10 }]), "deposits");
    t.eq(t.bank("copper_ore"), 50, "the bank holds the yield");
    t.eq(t.inv("Ann", "copper_ore"), 0, "the bag is empty");
    t.ok(t.calls().every((c) => c.code === 200), "no call was refused");
    // One sync, then no polling: in 15 minutes the only later read is the 5-minute event poll.
    t.eq(
      t.world.reads.filter((p) => p !== "/events/active"),
      ["/my/characters", "/my/bank", "/my/bank/items", "/my/pending_items", "/accounts/harness"],
      "account reads",
    );
    t.eq(t.world.reads.filter((p) => p === "/events/active").length, 4, "event reads: boot + 3 polls");
  },
);
