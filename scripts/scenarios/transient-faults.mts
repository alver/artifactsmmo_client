// The refusals the client and the runner ride out today, each injected once:
// a transport failure, 499 (cooldown), 497 (inventory full), 461 (bank lock).
// Also the harness's own check that fault injection reaches every layer.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [{ name: "Ivy", x: 2, y: 0 }], // on the copper rocks
  },
  async (t) => {
    t.world.fault({ action: "gathering", n: 1, code: "network" }); // client: back off 2 s, retry
    t.world.fault({ action: "gathering", n: 1, code: 499 }); // client: wait the seconds in the message, retry
    t.world.fault({ action: "gathering", n: 1, code: 497 }); // runner: bank off, come back
    t.world.fault({ action: "bank/deposit/item", n: 1, code: 461 }); // client: wait a beat, retry
    t.queue("Ivy", [
      { kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 3, done: 0 },
      { kind: "deposit-all" },
    ]);
    await t.run();

    t.eq(t.q("Ivy"), { items: [], running: false }, "the queue ran to the end");
    t.eq(t.calls("gathering").map((c) => c.code), ["network", 499, 497, 200, 200, 200], "gathering calls");
    t.eq(t.calls("bank/deposit/item").map((c) => c.code), [461, 200], "deposit calls");
    t.eq(t.bank("copper_ore"), 3, "ore in the bank");
  },
);
