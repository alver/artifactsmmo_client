// Task 017, settled point 14: the market read. The fake's Grand Exchange holds four orders. At boot the poll writes a whole
// line into logs/market/<day>.jsonl (per code the lowest ask, the quantity at it, on sale, sell orders; the highest bid, at
// it, wanted, buy orders); ten minutes later, one ask changed: a line with that code alone; ten minutes later the poll fails:
// nothing is written and nothing breaks; ten minutes later the poll works again and an order is gone: a line naming it.
import { scenario } from "../harness/index.mts";
import { T0 } from "../harness/clock.mts";

const order = (id: string, type: "sell" | "buy", code: string, quantity: number, price: number) => ({ id, type, account: "someone", code, quantity, price, created_at: new Date(T0).toISOString() });
await scenario(
  {
    characters: [{ name: "Ann", x: 4, y: 1 }],
    limits: { actions: 10, minutes: 60 },
  },
  async (t) => {
    const path = `logs/market/${new Date(T0).toISOString().slice(0, 10)}.jsonl`;
    const lines = (): Record<string, any>[] => (t.files().files.get(path) ?? "").trimEnd().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    t.world.ge.push(order("a", "sell", "algae", 86, 2), order("b", "sell", "algae", 10, 3), order("c", "buy", "egg", 50, 6), order("d", "sell", "sap", 20, 4));
    await t.run({ minutes: 5 }); // the boot poll (it runs on the clock, after the orders above)
    t.eq(lines().map((l) => l.full), [true], "the boot poll: a whole line");
    t.eq(lines()[0].c, { algae: [2, 86, 96, 2, null, 0, 0, 0], egg: [null, 0, 0, 0, 6, 50, 50, 1], sap: [4, 20, 20, 1, null, 0, 0, 0] }, "per code: the lowest ask, at it, on sale, sell orders; the highest bid, at it, wanted, buy orders");
    t.world.ge[3].price = 5;
    await t.run({ minutes: 10 }); // 15 min: the poll of 10 min
    t.eq(lines()[1]?.c, { sap: [5, 20, 20, 1, null, 0, 0, 0] }, "one ask moved: a line with that code alone");
    t.eq([lines()[1]?.n, lines()[1]?.pages, lines()[1]?.full], [4, 1, undefined], "with the number of orders and pages, not whole");
    t.world.geFail = 1;
    await t.run({ minutes: 10 }); // 25 min: the poll of 20 min fails
    t.eq(lines().length, 2, "a failed poll writes nothing");
    t.world.ge.splice(2, 1); // the egg order is gone
    await t.run({ minutes: 10 }); // 35 min: the poll of 30 min
    t.eq([lines()[2]?.gone, lines()[2]?.c], [["egg"], {}], "a code with no order left is named gone");
    t.ok(t.world.geReads === 4 && !t.world.reads.includes("/grandexchange/orders"), `four polls in 35 minutes (one page each), counted apart from the account's reads: ${t.world.geReads}`);
    t.eq(t.calls().length, 0, "nothing bought or sold");
  },
);
