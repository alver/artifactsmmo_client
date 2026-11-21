// Task 015, settled point 5: 8 of 18 slots free and nothing to tidy (no gear in the bank). The planner's bank interrupt
// buys one expansion on Pia (the only owned character, so the shortest walk to a bank): at the bank, the price withdrawn
// from the bank's gold (the game takes it from the character's), buy_expansion, the slots +20 read back, the lines with the
// price, the slots before and after and the next price. Then the bank fills to 7 free again (another account action) with
// the next price at 70,000, above the cap of 60,000: nothing is bought, one `plan: bank` line says so with the price.
import { scenario } from "../harness/index.mts";
import { bankDetails } from "../../src/state/store";

const FILL = ["birch_wood", "coal", "iron_ore", "spruce_wood", "sunflower", "nettle_leaf", "algae", "shrimp", "gudgeon", "trout", "feather", "cowhide", "wool", "raw_chicken", "raw_beef", "egg", "milk_bucket", "mushroom", "apple", "sap", "shell"];

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 5, x: 4, y: 1, bag: { copper_ore: 5 } }], // on the bank
    bank: { copper_ore: 50, ash_wood: 5, copper_bar: 5, ash_plank: 5, green_slimeball: 5, yellow_slimeball: 5, blue_slimeball: 5, red_slimeball: 5, gold_ore: 5, iron_bar: 5 },
    slots: 18, // 10 codes: 8 free
    nextExpansion: 28_000,
    ladder: [70_000],
    gold: 100_000,
    limits: { actions: 600, minutes: 120 },
  },
  async (t) => {
    await t.run({ until: () => t.calls("bank/buy_expansion").length > 0 });
    // then the bank fills again: 21 more codes, 7 of 38 free (the engine sees them at Pia's next bank echo, its step's reset)
    for (const c of FILL) t.world.bank.set(c, 5);
    await t.run({ minutes: 1 });
    const buys = t.calls("bank/buy_expansion");
    t.eq(buys.map((c) => [c.who, c.code]), [["Pia", 200]], "one expansion bought, by Pia");
    t.eq(t.calls("bank/withdraw/gold", "Pia").map((c) => c.body), [{ quantity: 28_000 }], "the price withdrawn first: the game takes the character's gold");
    t.eq([t.world.slots, t.world.gold, bankDetails.value?.slots, bankDetails.value?.next_expansion_cost], [38, 72_000, 38, 70_000], "+20 slots, read back with the next price");
    const lines = t.devlog().filter((l) => l.includes("plan: bank"));
    t.ok(lines.some((l) => l.includes("8 of 18 slots free and nothing left to tidy: Pia buys an expansion for 28,000 gold")), `the decision's line: ${lines.join(" | ")}`);
    t.ok(lines.some((l) => l.includes("Pia bought a bank expansion for 28,000 gold: slots 18 → 38, the next costs 70,000")), "the purchase's line");
    await t.run({ minutes: 30 }); // the five-minute tick sees it
    const after = t.devlog().filter((l) => l.includes("plan: bank") && l.includes("not bought"));
    t.eq(t.calls("bank/buy_expansion").length, 1, "nothing more is bought");
    t.eq(after.length, 1, `one line says so: ${after.join(" | ")}`);
    t.ok(after[0]?.includes("the next expansion costs 70,000 gold: not bought (above the cap of 60,000)"), "with the price and the cap");
    t.ok(t.q("Pia").running && !t.q("Pia").items.some((i) => i.error), "nobody paused");
  },
);
