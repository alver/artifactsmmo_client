// Task 032 (B.5, D.1): the counter reads the order again. The world of market-buy (Pia, a worker; a Copper Dagger whose six
// copper bars the bank lacks; bars on sale at 5, trades at 5). (1) Once her buy step is decided the order's price moves to 9:
// at the exchange she reads it by its id and buys nothing — the gold she withdrew goes back to the bank, the need stays,
// a `market` record says why, and the order is not taken again before the next read (which brings it at 9: above 1.25 × 5,
// refused for its price). (2) A new order at 5; once her buy step is decided it is gone: the read answers 404, nothing is
// bought, the gold is back. No grandexchange/buy call at all.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { T0 } from "../harness/clock.mts";
import { planner } from "../../src/state/planner";

const iso = (h: number): string => new Date(T0 - h * 3_600_000).toISOString();
const order = (id: string) => ({ id, type: "sell" as const, account: "someone", code: "copper_bar", quantity: 20, price: 5, created_at: iso(30) });
await scenario(
  {
    planner: { on: { Pia: true }, roles: { Pia: { role: "worker", craft: ["weaponcrafting"], gather: ["woodcutting"] } } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }],
    gold: 50_000,
    achievements: [achievement("made_up_dagger", 3, ["crafting", "copper_dagger", 1])],
    limits: { actions: 3000, minutes: 900 },
    setup: () => {
      const until = T0 + 24 * 3_600_000, why = "the fake has no XP (task 027f)";
      planner.value = { ...planner.value, blocked: { "lvl:weaponcrafting:30@Pia": { until, why } } };
    },
  },
  async (t) => {
    t.world.ge.push(order("o1"));
    t.world.geHistory.copper_bar = [3, 2, 1].map((h) => ({ order_id: `h${h}`, seller: "someone", buyer: "else", code: "copper_bar", quantity: 4, price: 5, sold_at: iso(h * 24) }));
    const buying = (): boolean => !!planner.value.current.Pia?.step.target.startsWith("buy:") && !planner.value.current.Pia.over;
    const pocketAndBank = (): number => t.world.gold + t.world.chars.get("Pia")!.gold;
    // (1) another price at the counter
    await t.run({ until: buying });
    t.world.ge[0].price = 9;
    await t.run({ until: () => !buying() });
    await t.run({ minutes: 1 });
    const r1 = t.journal("market").filter((r) => r.what === "not bought");
    t.ok(r1.length === 1 && String(r1[0].why).includes("asks 9 now, 5 was planned"), `another price: nothing bought — ${JSON.stringify(r1[0])}`);
    t.ok(t.world.chars.get("Pia")!.gold === 0 && t.world.gold === 50_000, `the gold back in the bank: ${t.world.gold} + ${t.world.chars.get("Pia")!.gold} in the pocket`);
    t.ok(planLines(t, "Pia").some((l) => l.startsWith("blocked buy:copper_bar")), "the purchase ended empty: blocked for Pia");
    // the next reads bring o1 at 9 — above 1.25 × the reference of 5: refused for its price, said in the need's own step's why
    const { ["buy:copper_bar@Pia"]: _, ...rest } = planner.value.blocked;
    planner.value = { ...planner.value, blocked: rest };
    await t.run({ minutes: 200 });
    t.eq(t.calls("grandexchange/buy").length, 0, "o1 at 9 is not bought");
    // (2) the order gone at the counter
    t.world.ge[0].price = 5;
    await t.run({ until: buying });
    t.world.ge.splice(0, 1);
    await t.run({ until: () => !buying() });
    await t.run({ minutes: 1 });
    const r2 = t.journal("market").filter((r) => r.what === "not bought");
    t.ok(r2.length === 2 && String(r2[1].why) === "the order is gone", `the order gone: nothing bought — ${JSON.stringify(r2[1])}`);
    t.eq(t.calls("grandexchange/buy").length, 0, "no purchase at all");
    t.ok(pocketAndBank() === 50_000 && t.world.chars.get("Pia")!.gold === 0, `the gold back in the bank: ${t.world.gold}`);
  },
);
