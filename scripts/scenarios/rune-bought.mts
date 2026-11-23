// Task 025, settled point 5: the planner buys a healing rune where it pays — for a character whose fight work on the road costs
// at least 5% fewer expected seconds a win with it, or crosses the floor with it (consumables.ts runePays) — through the
// merchant interrupt the Lost World Maps took: walk to the Rune Vendor (8, 13), buy one with the bank's gold (a `spend`
// record), wear it. Sec (combat 26, iron gear in the bank) has no XP monster admitted without a rune, the pig with one; the
// bank holds 100,000 gold. One rune is bought, once; it is worn; nothing more is bought while Sec holds it.
import { achievement, scenario } from "../harness/index.mts";
import { slotCode } from "../../src/types/api";

await scenario(
  {
    planner: { on: { Sec: true } },
    characters: [{ name: "Sec", level: 26, x: 4, y: 1 }],
    bank: { iron_sword: 1, iron_helm: 1, iron_armor: 1, iron_legs_armor: 1, iron_boots: 1, iron_ring: 2, life_amulet: 1 },
    gold: 100_000,
    achievements: [achievement("made_up_ore", 2, ["gathering", "copper_ore", 400])],
    limits: { actions: 3000, minutes: 90 },
  },
  async (t) => {
    await t.run({ until: () => slotCode(t.world.chars.get("Sec")!, "rune") === "healing_rune" || t.calls("npc/buy", "Sec").length > 1 });
    await t.run({ minutes: 30 });
    t.eq(t.calls("npc/buy", "Sec").map((c) => c.body), [{ code: "healing_rune", quantity: 1 }], "one healing rune bought, once");
    t.eq(slotCode(t.world.chars.get("Sec")!, "rune"), "healing_rune", "…and worn");
    t.eq(t.journal("spend").map((r) => [r.who, r.what, r.q, r.item]), [["Sec", "gold", 10_000, "healing_rune"]], "a `spend` record for it");
    t.ok(t.journal("rune").length === 1 && String(t.journal("rune")[0].why).length > 0, `a \`rune\` record with its why: ${JSON.stringify(t.journal("rune")[0])}`);
    t.ok(t.world.gold + t.world.chars.get("Sec")!.gold === 90_000, "10,000 gold spent");
  },
);
