// Task 025, settled point 2: in the executor a lost fight is an outcome, not a fault. A planner's fight step (`pl:` items) and
// an event trip (`pl:int:event:` items) each lose two fights in a row (forced) and go on — back from (0, 0), recover, fight —
// without a pause or a strike; each loss leaves a `loss` record (the character, the monster, the set, the forecast's p, the HP
// at the start, the turns). On 0f94809 the second loss in a row paused the item: "lost 2 fights in a row".
import { scenario } from "../harness/index.mts";
import { insertItem, queues, startQueue } from "../../src/state/queue";
import type { QueueItem } from "../../src/plan/queue";

const step: QueueItem[] = [
  { id: "pl:ach:made_up_chickens:0@Ann#1:0", kind: "gear", job: { kind: "fight", monster: "chicken" }, reset: true, wear: { weapon: "copper_dagger" } },
  { id: "pl:ach:made_up_chickens:0@Ann#1:1", kind: "fight", monster: "chicken", times: 3, done: 0, gear: true, take: {}, wear: { weapon: "copper_dagger" } },
];
const trip: QueueItem[] = [
  { id: "pl:int:event:made_up@1:0", kind: "fight", monster: "chicken", times: 2, done: 0, gear: true, take: {}, wear: { weapon: "copper_dagger" } },
];
await scenario(
  {
    characters: [{ name: "Ann", level: 10, x: 4, y: 1 }], // on the bank
    bank: { copper_dagger: 1 },
    limits: { actions: 300, minutes: 90 },
  },
  async (t) => {
    t.world.forceFight("Ann", { result: "loss", turns: 6 }, { result: "loss", turns: 6 }, { result: "win" }, { result: "win" }, { result: "win" });
    step.forEach((it, i) => insertItem("Ann", it, i));
    startQueue("Ann");
    await t.run({ until: () => !queues.value.Ann?.items.length || !!queues.value.Ann.items[0].error });
    t.ok(!queues.value.Ann?.items.length, `the step ran to its end: ${queues.value.Ann?.items[0]?.error ?? "no item left"}`);
    t.eq(t.calls("fight", "Ann").map((c) => c.note), ["loss", "loss", "win", "win", "win"], "two losses, then the three kills");
    const losses = t.journal("loss");
    t.eq(losses.length, 2, "a `loss` record each");
    t.ok(losses.every((l) => l.who === "Ann" && l.monster === "chicken" && Array.isArray(l.set) && (l.set as string[]).includes("copper_dagger") && typeof l.p === "number" && l.hp === l.max && l.turns === 6),
      `…naming the monster, the set, p, the HP at the start, the turns: ${JSON.stringify(losses[0])}`);
    t.ok(t.devlog().some((l) => l.includes("lost a fight (1 of 1;")) && t.devlog().some((l) => l.includes("lost a fight (2 of 2;")), "a line each, the step going on");
    t.ok(t.calls("move", "Ann").length > 0 && !t.devlog().some((l) => /paused|lost 2 fights in a row/.test(l)), "back from (0, 0) and no pause");

    // the event trip: the same, inside an interrupt
    t.world.forceFight("Ann", { result: "win" }, { result: "loss" }, { result: "loss" }, { result: "win" });
    trip.forEach((it, i) => insertItem("Ann", it, i));
    startQueue("Ann");
    await t.run({ until: () => !queues.value.Ann?.items.length || !!queues.value.Ann.items[0].error });
    t.ok(!queues.value.Ann?.items.length, `the trip's fights ran to their end: ${queues.value.Ann?.items[0]?.error ?? "no item left"}`);
    t.eq(t.journal("loss").length, 4, "two more `loss` records");
  },
);
