// Task 014, settled point 4: a fight step takes what it planned. Two fight steps in a row, each planned with 40 small
// health potions and 10 cooked chicken, out of a bank that holds 100 and 60: the first reset withdraws exactly 40 and 10
// (not a stack of 100), the fights drink and eat, the second reset tops both up to 40 and 10 again without banking
// anything first (no bounce), and the next step's reset (a gather job) banks the rest. The steps' items carry `pl:` ids
// and the fight item its `take`, as itemsOf compiles them; the executor tells the planner's items apart by the item.
import { scenario } from "../harness/index.mts";
import { insertItem, queues, startQueue } from "../../src/state/queue";
import type { QueueItem } from "../../src/plan/queue";

const TAKE = { small_health_potion: 40, cooked_chicken: 10 };
const step = (n: number, fights: number): QueueItem[] => [
  { id: `pl:made_up@Ann#${n}:0`, kind: "gear", job: { kind: "fight", monster: "green_slime" }, reset: true },
  { id: `pl:made_up@Ann#${n}:1`, kind: "fight", monster: "green_slime", times: fights, done: 0, gear: true, take: TAKE },
];

await scenario(
  {
    characters: [{ name: "Ann", level: 10, x: 4, y: 1 }], // on the bank
    bank: { copper_dagger: 1, small_health_potion: 100, cooked_chicken: 60 },
    limits: { actions: 400, minutes: 120 },
  },
  async (t) => {
    // each fight drinks 3 potions and loses 100 HP: one chicken (80) eaten, then a rest
    t.world.forceFight("Ann", ...Array.from({ length: 16 }, () => ({ result: "win" as const, used: { small_health_potion: 3 }, hpLost: 100 })));
    const items = [...step(1, 8), ...step(2, 8), { id: "pl:made_up_ore@Ann#3:0", kind: "gear", job: { kind: "gather", skill: "mining" }, reset: true } as QueueItem];
    items.forEach((it, i) => insertItem("Ann", it, i));
    startQueue("Ann");
    await t.run({ until: () => !queues.value.Ann?.items.length });
    const w = t.calls("bank/withdraw/item", "Ann").map((c) => c.body as { code: string; quantity: number }[]);
    const took = (code: string): number[] => w.flatMap((b) => b.filter((x) => x.code === code).map((x) => x.quantity));
    t.eq(took("small_health_potion"), [40, 24], "the first reset withdrew 40 potions, the second topped the 16 left up by 24");
    const chicken = took("cooked_chicken");
    t.ok(chicken.length === 2 && chicken[0] === 10 && chicken[1] >= 1 && chicken[1] <= 10, `the first reset withdrew 10 chicken, the second topped what was left up to 10: ${chicken}`);
    t.eq(t.calls("fight", "Ann").length, 16, "both steps fought their 8 fights");
    const ate = t.calls("use", "Ann").length;
    t.ok(ate >= 15, `a chicken eaten after (nearly) every fight: ${ate}`);
    t.eq([t.bank("small_health_potion"), t.bank("cooked_chicken")], [100 - 48, 60 - ate], "the last reset banked what was left: 52 potions and every chicken not eaten");
    t.eq([t.inv("Ann", "small_health_potion"), t.inv("Ann", "cooked_chicken")], [0, 0], "nothing left in the bag");
    t.ok(!t.calls("crafting", "Ann").length && !t.calls("gathering", "Ann").length, "no brew, no cook, no gather inside the fight items");
  },
);
