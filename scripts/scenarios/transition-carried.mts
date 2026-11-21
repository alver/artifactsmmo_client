// Task 017, settled points 1 and 6: a `has_item` transition. The Rosenblood House (interior (0, 13)) is entered from Forest
// (0, 13) only with a cultist cloak carried (the docs: in the inventory or equipped; not consumed). Rex (combat 50, a
// mithril set, and stats no set gives — the fight is not the point: a 3,000 HP alchemist beats every mithril set) runs a
// kill step of three cultist alchemists whose items carry the cloak in `take` and the set in `wear`:
// the reset leaves the set on and takes the cloak into the bag, the cloak rides the keep list through the fights (it is
// body armour: no swap may bank it as junk), the transition lets him in and keeps it, and the closing deposit-all banks it.
import { scenario } from "../harness/index.mts";
import { insertItem, queues, startQueue } from "../../src/state/queue";
import type { QueueItem } from "../../src/plan/queue";

const set = { weapon: "mithril_sword", shield: "air_shield", helmet: "mithril_helm", body_armor: "mithril_platebody", leg_armor: "mithril_platelegs", boots: "mithril_boots", ring1: "mithril_ring", ring2: "mithril_ring", amulet: "greater_ruby_amulet" };
const worn = Object.fromEntries(Object.entries(set).map(([g, c]) => [`${g}_slot`, c]));
const key = "pl:ach:made_up_cultists:0@Rex#1";
await scenario(
  {
    characters: [{ name: "Rex", level: 50, x: 4, y: 1, max_hp: 20_000, hp: 20_000, attack_earth: 2_000, ...worn }], // on the bank
    bank: { cultist_cloak: 1 },
    limits: { actions: 200, minutes: 120 },
  },
  async (t) => {
    t.world.forceFight("Rex", ...Array.from({ length: 3 }, () => ({ result: "win" as const, hpLost: 50 })));
    const items: QueueItem[] = [
      { id: `${key}:0`, kind: "gear", job: { kind: "fight", monster: "cultist_alchemist" }, reset: true, wear: set },
      { id: `${key}:1`, kind: "fight", monster: "cultist_alchemist", times: 3, done: 0, gear: true, take: { cultist_cloak: 1 }, wear: set },
      { id: `${key}:2`, kind: "deposit-all" },
    ];
    items.forEach((it, i) => insertItem("Rex", it, i));
    startQueue("Rex");
    await t.run({ until: () => !queues.value.Rex?.items.length });
    const wd = t.calls("bank/withdraw/item", "Rex").flatMap((c) => c.body as { code: string; quantity: number }[]);
    t.eq(wd, [{ code: "cultist_cloak", quantity: 1 }], "the reset took the cloak, and nothing of the set (worn already)");
    t.ok(t.calls("transition", "Rex").length === 2, "in with the cloak, out by the free way back");
    t.eq(t.calls("fight", "Rex").map((c) => c.note), ["win", "win", "win"], "the fights inside");
    const deps = t.calls("bank/deposit/item", "Rex").flatMap((c) => (c.body as { code: string }[]).map((x) => x.code));
    t.eq(deps.filter((c) => c === "cultist_cloak").length, 1, "the cloak was banked once — by the closing deposit-all, after the trip");
    t.eq([t.bank("cultist_cloak"), t.inv("Rex", "cultist_cloak")], [1, 0], "kept by the transition, banked after");
    t.ok(!t.journal("spend").length, "a carried item is no spending");
    t.ok(!t.q("Rex").items.some((it) => it.error), "nothing paused");
  },
);
