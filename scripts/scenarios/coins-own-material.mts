// Task 017, settled points 11 and 12: tasks coins are spent on an objective's own material. Cat (the gearcrafter) has an
// open objective, one satchel (cowhide 5, feather 2, a jasper crystal); the bank holds the leather and the feathers but no
// crystal, which only the Tasks Trader sells (8 tasks coins; its tile is open: tasks_farmer is done), and 58 coins — 8 above
// the floor of 50. The supply step withdraws the 8 coins, buys the crystal at (5, 11), banks it, the craft follows; the
// purchase is a `spend` record. Then a second satchel is asked for: 50 coins left, none above the floor — no purchase, and
// the objective waits with the honest reason (waitingOf: "tasks coins: 0 of 8").
import { achievement, scenario } from "../harness/index.mts";
import { worldOf } from "../../src/state/planner";
import { loadAchievements } from "../../src/state/sync";
import { decide } from "../../src/plan/planner/decide";
import { waitingOf } from "../../src/plan/planner/forward";

const farmer = { ...achievement("tasks_farmer", 10, ["task", null, 100, 100]), completed_at: "2026-11-08T00:00:00Z" };
await scenario(
  {
    planner: { on: { Cat: true }, roles: { Cat: { craft: ["gearcrafting"] } } },
    characters: [{ name: "Cat", level: 10, gearcrafting_level: 5, x: 4, y: 1 }], // on the bank
    bank: { cowhide: 10, feather: 4, tasks_coin: 58 },
    achievements: [farmer, achievement("made_up_satchel", 5, ["crafting", "satchel", 1])],
    limits: { actions: 300, minutes: 60 },
  },
  async (t) => {
    await t.run({ until: () => t.bank("satchel") >= 1 || t.inv("Cat", "satchel") >= 1, minutes: 50 });
    await t.run({ minutes: 2 });
    const wd = t.calls("bank/withdraw/item", "Cat").flatMap((c) => c.body as { code: string; quantity: number }[]).filter((x) => x.code === "tasks_coin");
    t.eq(wd, [{ code: "tasks_coin", quantity: 8 }], "the supply step withdrew the coins one crystal takes");
    const buys = t.calls("npc/buy", "Cat");
    t.eq(buys.map((c) => c.body), [{ code: "jasper_crystal", quantity: 1 }], "one crystal bought at the Tasks Trader");
    t.ok(t.calls("crafting", "Cat").length === 1, "the satchel was crafted with it");
    t.eq(t.bank("tasks_coin"), 50, "the bank keeps the floor");
    const spent = t.journal("spend");
    t.eq(spent.map((r) => [r.who, r.what, r.code, r.q, r.item]), [["Cat", "coins", "tasks_coin", 8, "jasper_crystal"]], "the purchase is a spend record");
    t.ok(String(spent[0]?.for).startsWith("pl:mat:jasper_crystal@Cat#"), `for the supply step: ${spent[0]?.for}`);
    // a second satchel: the coins are at the floor
    t.world.achievements = [farmer, { ...achievement("made_up_satchel", 5, ["crafting", "satchel", 1, 1]), completed_at: new Date().toISOString() }, achievement("made_up_satchel_2", 5, ["crafting", "satchel", 2, 1])];
    await loadAchievements(); // the read the planner makes after an objective's step
    const next = decide("Cat", worldOf(Date.now()));
    t.ok(!next.target.startsWith("mat:jasper_crystal") && !next.target.startsWith("ach:made_up_satchel_2"), `no purchase below the floor, no craft without the crystal: ${next.key}`);
    const w = waitingOf(worldOf(Date.now())).find((x) => x.achievement === "made_up_satchel_2");
    t.eq(w?.waits, "tasks coins: 0 of 8", "the objective waits with the honest reason");
    await t.run({ minutes: 5 });
    t.eq(t.calls("npc/buy", "Cat").length, 1, "and none was made");
  },
);
