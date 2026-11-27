// Task 032 (B, D.1): a need bought on the Grand Exchange, end to end. Pia (a worker: weaponcrafting, woodcutting) and an open
// objective — a Copper Dagger — whose six copper bars the bank lacks (a mat: leaf; its ore is mining, not her lane). The
// exchange sells copper bars at 5 (an order of 20) and their trades of the week went at 5. Her first decision passes the
// bars on rules 1 and 2 but has no reference yet: it asks for one (GET /grandexchange/history/copper_bar, once) and its step
// is another. Her next decision buys: a worker's step `buy:copper_bar` — deposit-all, 30 gold withdrawn exactly, the order
// read again by its id at the exchange, six bars bought at 5, deposit-all — the bars in the bank, a `spend` record (what
// "market", the units, the price, the reference, the order), the day's gold counted (the synced state and the status).
// On the starting tree nothing is bought: the planner reads no market.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { T0 } from "../harness/clock.mts";
import { planner } from "../../src/state/planner";
import { marketState } from "../../src/state/market";

const iso = (h: number): string => new Date(T0 - h * 3_600_000).toISOString();
await scenario(
  {
    planner: { on: { Pia: true }, roles: { Pia: { role: "worker", craft: ["weaponcrafting"], gather: ["woodcutting"] } } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }],
    gold: 50_000, // over the floor (20,000) and the next expansion (4,500), which the purse keeps
    achievements: [achievement("made_up_dagger", 3, ["crafting", "copper_dagger", 1])],
    limits: { actions: 1500, minutes: 400 },
    setup: () => {
      // the fake has no XP: the craft levels the world would train are blocked (task 027f); the subject is the purchase
      const until = T0 + 24 * 3_600_000, why = "the fake has no XP (task 027f)";
      planner.value = { ...planner.value, blocked: { "lvl:weaponcrafting:30@Pia": { until, why } } };
    },
  },
  async (t) => {
    t.world.ge.push({ id: "o1", type: "sell", account: "someone", code: "copper_bar", quantity: 20, price: 5, created_at: iso(30) });
    t.world.geHistory.copper_bar = [3, 2, 1].map((h) => ({ order_id: `h${h}`, seller: "someone", buyer: "else", code: "copper_bar", quantity: 4, price: 5, sold_at: iso(h * 24) }));
    await t.run({ until: () => t.calls("grandexchange/buy", "Pia").length > 0 });
    // the fake counts no achievement: the dagger the bought bars make completes the objective, as the game would say at the
    // planner's read after that step (else the open objective asks for six more bars)
    t.world.achievements = [achievement("made_up_dagger", 3, ["crafting", "copper_dagger", 1, 1])];
    await t.run({ minutes: 10 });
    const plan = planLines(t, "Pia");
    const buy = plan.find((l) => l.startsWith("buy:copper_bar@Pia#1 "));
    t.ok(!plan[0]?.startsWith("buy:"), `the first decision buys nothing (no reference yet): ${plan[0]?.slice(0, 120)}`);
    t.eq(t.world.geHistoryReads, ["copper_bar"], "the reference read once, for the code that passed rules 1 and 2");
    t.ok(!!buy && buy.includes("(supply, 6 units") && buy.includes("worker, the market") && buy.includes("reference 5"), `then a worker's buy step for the six bars: ${buy}`);
    t.eq(t.calls("grandexchange/buy", "Pia").map((c) => c.body), [{ id: "o1", quantity: 6 }], "the order bought by its id, six units");
    t.eq(t.calls("bank/withdraw/gold", "Pia").map((c) => c.body), [{ quantity: 30 }], "exactly price × quantity withdrawn");
    t.ok(t.world.geReads >= 3, `the order read again at the counter (the market reads, the history, the order: ${t.world.geReads})`);
    t.ok(t.bank("copper_bar") === 6 || t.calls("crafting", "Pia").some((c) => (c.body as { code: string }).code === "copper_dagger"), `the bars in the bank (${t.bank("copper_bar")}) or already made into the dagger`);
    t.eq(t.journal("spend").map((r) => [r.who, r.what, r.code, r.q, r.item, r.units, r.price, r.ref, r.order]), [["Pia", "market", "gold", 30, "copper_bar", 6, 5, 5, "o1"]], "a `spend` record");
    t.eq([marketState.value.spent, marketState.value.buys.map((b) => [b.code, b.units, b.price])], [30, [["copper_bar", 6, 5]]], "the day's gold counted");
    t.eq(t.world.ge[0]?.quantity, 14, "the order holds 14 more");
    t.ok(t.world.gold + t.world.chars.get("Pia")!.gold === 50_000 - 30, "30 gold spent, the rest back in the bank");
  },
);
