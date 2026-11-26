// Task 015, settled point 7: planned food fits the bag. Two fight steps in a row whose items ask for 300 cooked chicken (a
// plan above the bag) out of 400: each reset takes at most half of Ann's bag (task 029, B.3; a third before — 118 at level 10:
// 59), the first all of it,
// the second only what was eaten (no bounce); the fights eat one a fight and drop ten feathers each, so the bag fills and
// the bank-off banks the feathers and keeps the chicken — never "inventory full of protected working stock"; the next
// step's reset (a gather job) banks what is left.
import { scenario } from "../harness/index.mts";
import { insertItem, queues, startQueue } from "../../src/state/queue";
import type { QueueItem } from "../../src/plan/queue";

const TAKE = { cooked_chicken: 300 };
const step = (n: number, fights: number): QueueItem[] => [
  { id: `pl:made_up@Ann#${n}:0`, kind: "gear", job: { kind: "fight", monster: "chicken" }, reset: true },
  { id: `pl:made_up@Ann#${n}:1`, kind: "fight", monster: "chicken", times: fights, done: 0, gear: true, take: TAKE },
];

await scenario(
  {
    characters: [{ name: "Ann", level: 10, x: 4, y: 1 }], // on the bank
    bank: { copper_dagger: 1, cooked_chicken: 400, feather: 1 },
    limits: { actions: 400, minutes: 120 },
  },
  async (t) => {
    // each fight loses 100 HP (one chicken, 80, then a rest) and drops ten feathers
    t.world.forceFight("Ann", ...Array.from({ length: 20 }, () => ({ result: "win" as const, hpLost: 100, drops: [{ code: "feather", quantity: 10 }] })));
    const items = [...step(1, 10), ...step(2, 10), { id: "pl:made_up_ore@Ann#3:0", kind: "gear", job: { kind: "gather", skill: "mining" }, reset: true } as QueueItem];
    items.forEach((it, i) => insertItem("Ann", it, i));
    startQueue("Ann");
    await t.run({ until: () => !queues.value.Ann?.items.length });
    const cap = Math.floor(t.world.chars.get("Ann")!.inventory_max_items / 2);
    const took = t.calls("bank/withdraw/item", "Ann").flatMap((c) => (c.body as { code: string; quantity: number }[]).filter((x) => x.code === "cooked_chicken").map((x) => x.quantity));
    const ate = t.calls("use", "Ann").length;
    t.eq(took[0], cap, `the first reset took half the bag (${cap}), not 300`);
    t.ok(took.length === 2 && took[1] <= cap && took[1] >= 1, `the second topped it up to the half: ${took}`);
    t.eq(t.calls("fight", "Ann").length, 20, "both steps fought their ten");
    t.ok(ate >= 18, `a chicken eaten after (nearly) every fight: ${ate}`);
    t.ok(t.calls("bank/deposit/item", "Ann").some((c) => JSON.stringify(c.body).includes("feather")), "the full bag banked its feathers");
    t.ok(!t.devlog().some((l) => l.includes("protected working stock")) && !t.q("Ann").items.some((i) => i.error), "never 'inventory full of protected working stock', nothing paused");
    t.eq([t.bank("cooked_chicken"), t.inv("Ann", "cooked_chicken")], [400 - ate, 0], "the last reset banked every chicken not eaten");
  },
);
