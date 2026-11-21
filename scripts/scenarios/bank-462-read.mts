// Task 016, settled point 11: after a 462 the bank is read, not guessed. Bo carries copper ore (the bank holds a stack)
// and feathers (it holds none); the engine read one free slot at boot, then another account action took it (the game's
// bank gets a third code). Bo's deposit-all: the deposit answers 462, the ore goes in alone, the engine's slots are set to
// the codes it knows (two — under the game's three), then one read of the bank's details and items makes them the game's.
// A second 462 inside ten minutes (the engine's count made stale again by hand) reads nothing; one after ten minutes reads
// once more.
import { scenario } from "../harness/index.mts";
import { bankDetails, bankItems } from "../../src/state/store";

await scenario(
  {
    characters: [{ name: "Bo", level: 1, x: 4, y: 1, bag: { copper_ore: 10, feather: 10 } }], // on the bank
    bank: { copper_ore: 50, ash_wood: 5 },
    slots: 3,
    limits: { actions: 100, minutes: 60 },
  },
  async (t) => {
    const reads = (): number => t.world.reads.filter((p) => p === "/my/bank").length;
    const boot = reads();
    t.world.bank.set("sap", 1); // the game's bank is full now; the engine still counts two codes of three slots
    t.queue("Bo", [{ kind: "deposit-all" }]);
    await t.run();
    await t.run({ minutes: 1 }); // the dev log's buffer
    const deps = t.calls("bank/deposit/item", "Bo");
    t.eq(deps.map((c) => [c.code, (c.body as { code: string }[]).map((x) => x.code)]), [[462, ["copper_ore", "feather"]], [200, ["copper_ore"]]], "the 462, then the held code alone");
    t.eq([reads() - boot, bankDetails.value?.slots, bankItems.value.some((b) => b.code === "sap")], [1, 3, true], "then one read: the slots are the game's 3 (not the 2 codes the engine knew) and the bank's codes are the game's");
    t.ok(t.devlog().some((l) => l.includes("bank read after a 462: 3 codes of 3 slots (0 free)")), "the dev log says so");
    t.ok(t.journal("bank").some((r) => r.what === "read" && r.slots === 3 && r.used === 3), "and the journal");
    t.eq([t.inv("Bo", "feather"), t.bank("copper_ore")], [10, 60], "the feathers stay in the bag, the ore is banked");

    // stale again by hand inside ten minutes: the next 462 is answered locally, nothing is read
    bankDetails.value = { ...bankDetails.value!, slots: 4 };
    t.queue("Bo", [{ kind: "deposit-all" }]);
    await t.run();
    t.eq([t.calls("bank/deposit/item", "Bo").map((c) => c.code).slice(2), reads() - boot, bankDetails.value?.slots], [[462], 1, 3], "a second 462 inside ten minutes: the local correction, no read");

    // …and after ten minutes, a read again
    await t.run({ minutes: 11 });
    bankDetails.value = { ...bankDetails.value!, slots: 4 };
    t.queue("Bo", [{ kind: "deposit-all" }]);
    await t.run();
    t.eq([t.calls("bank/deposit/item", "Bo").map((c) => c.code).slice(3), reads() - boot, bankDetails.value?.slots], [[462], 2, 3], "after ten minutes a 462 reads the bank once more");
    t.ok(!t.q("Bo").items.length && !t.q("Bo").items.some((i) => i.error), "nothing paused");
  },
);
