// Audit B.4-7 (logs/dev.log lines 776663–776672): a helper refining banked raw
// stock for a crafter, with the bank holding less than one trip needs.
// Eve trains weaponcrafting (iron sword: iron bars + feathers) and hunts the
// feathers; Fay helps with the bars — one trip is 10 bars = 100 iron ore, the
// bank holds 68.
// Today: Fay withdraws the 68 ("withdraw Iron Ore"), the gather-gear step
// sweeps her bag at the bank ("stow gear"), and the two repeat forever.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    known: "B.4-7",
    characters: [
      { name: "Eve", x: 0, y: 1, weaponcrafting_level: 10, weapon_slot: "copper_dagger" }, // on the chicken tile
      { name: "Fay", x: 4, y: 1, mining_level: 10 }, // on the bank
    ],
    bank: { iron_ore: 68 },
  },
  async (t) => {
    t.queue("Eve", [{ kind: "train", skill: "weaponcrafting", toLevel: 0, gear: true }]);
    t.queue("Fay", [{ kind: "train", skill: "weaponcrafting", toLevel: 0, gear: true, for: "Eve" }]);
    await t.run({ minutes: 10 });

    // A withdraw of a code followed at once by a deposit of the same quantity of it.
    const fay = t.calls(undefined, "Fay");
    const key = (c: (typeof fay)[number]): string => JSON.stringify(c.body);
    const undone = fay.filter((c, i) => c.action === "bank/withdraw/item" && fay[i + 1]?.action === "bank/deposit/item" && key(fay[i + 1]) === key(c));
    t.ok(undone.length <= 1, `withdrawals put straight back: got ${undone.length} (${key(undone[0])}), want at most 1`);
    t.ok(t.calls("gathering", "Fay").length > 0, "Fay goes mining for the rest of the trip");
  },
);
