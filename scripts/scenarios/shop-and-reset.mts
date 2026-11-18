// The rest of the fake's vocabulary in one queue: a purchase paid from the
// pocket, a sale to an event merchant, then a full bank reset into the mining
// set (deposit everything, gold included; strip; withdraw; equip).
import { scenario } from "../harness/index.mts";
import type { ActiveEvent } from "../../src/types/api";

const merchant = {
  name: "Nomadic Merchant", code: "nomadic_merchant", duration: 90, previous_map: null,
  created_at: "2026-01-15T11:30:00.000Z", expiration: "2026-01-15T13:00:00.000Z",
  map: { map_id: 382, name: "Forest", skin: "forest_village2_nomadic_merchant", x: 3, y: 2, layer: "overworld", access: { type: "standard", conditions: [] }, interactions: { content: { type: "npc", code: "nomadic_merchant" }, transition: null } },
} satisfies ActiveEvent;

await scenario(
  {
    characters: [{ name: "Joy", x: 7, y: 13, gold: 12_000, weapon_slot: "copper_dagger", bag: { golden_egg: 2, copper_ore: 5 } }],
    bank: { copper_pickaxe: 1 },
    events: [merchant],
  },
  async (t) => {
    t.queue("Joy", [
      { kind: "buy", code: "healing_rune", quantity: 1, npc: "rune_vendor" }, // 10,000 gold, next door at (8, 13)
      { kind: "sell", code: "golden_egg", quantity: 2, done: 0, npc: "nomadic_merchant" }, // 1,000 gold each
      { kind: "gear", job: { kind: "gather", skill: "mining" }, reset: true },
    ]);
    await t.run();

    t.eq(t.q("Joy"), { items: [], running: false }, "the queue ran to the end");
    t.eq(t.calls("npc/buy").length + t.calls("npc/sell").length, 2, "one purchase, one sale");
    const joy = t.world.chars.get("Joy")!;
    t.eq([joy.gold, t.world.gold], [0, 4_000], "gold: pocket, bank");
    t.eq([joy.weapon_slot, joy.attack_air, joy.attack_earth, joy.critical_strike], ["copper_pickaxe", 0, 5, 0], "the pickaxe is worn and the dagger's stats are gone");
    t.eq([t.bank("healing_rune"), t.bank("copper_dagger"), t.bank("copper_ore"), t.bank("copper_pickaxe")], [1, 1, 5, 0], "bank after the reset");
    t.ok(t.calls().every((c) => c.code === 200), "no call was refused");
  },
);
