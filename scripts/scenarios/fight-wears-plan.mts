// Task 017, settled point 13: the set a planner's fight step wears is the step's `wear`, never a fresh solve on the bank of
// the moment (11-21 11:47 UTC: First's reset wore a battlestaff and a mushmush jacket against its step's steel battleaxe and
// iron armour; 01:05 UTC: a fight round swapped armour mid-step and walked back to the bank). Ann's first step planned a
// copper dagger while the bank also holds an iron sword the executor's own solve prefers: the reset takes the dagger, the
// rounds keep it, the sword never leaves the bank. Her second step planned a wooden staff the bank does not hold: one raw
// line, and the executor's own solve.
import { scenario } from "../harness/index.mts";
import { insertItem, queues, startQueue } from "../../src/state/queue";
import { slotCode } from "../../src/types/api";
import type { QueueItem } from "../../src/plan/queue";

const step = (n: number, wear: Record<string, string>): QueueItem[] => [
  { id: `pl:ach:made_up_chickens:0@Ann#${n}:0`, kind: "gear", job: { kind: "fight", monster: "chicken" }, reset: true, wear },
  { id: `pl:ach:made_up_chickens:0@Ann#${n}:1`, kind: "fight", monster: "chicken", times: 3, done: 0, gear: true, take: {}, wear },
];
await scenario(
  {
    characters: [{ name: "Ann", level: 10, x: 4, y: 1 }], // on the bank
    bank: { copper_dagger: 1, iron_sword: 1 },
    limits: { actions: 200, minutes: 60 },
  },
  async (t) => {
    step(1, { weapon: "copper_dagger" }).forEach((it, i) => insertItem("Ann", it, i));
    startQueue("Ann");
    await t.run({ until: () => !queues.value.Ann?.items.length });
    const took = (): string[] => t.calls("bank/withdraw/item", "Ann").flatMap((c) => (c.body as { code: string }[]).map((x) => x.code));
    t.eq(took(), ["copper_dagger"], "the reset withdrew the planned dagger, not the sword the executor prefers");
    t.eq(slotCode(t.world.chars.get("Ann")!, "weapon"), "copper_dagger", "the rounds kept the planned set on");
    t.eq(t.calls("fight", "Ann").length, 3, "the fights");
    t.ok(!t.devlog().some((l) => l.includes("the planned set needs")), "no fallback line");
    step(2, { weapon: "wooden_staff" }).forEach((it, i) => insertItem("Ann", it, i));
    startQueue("Ann");
    await t.run({ until: () => !queues.value.Ann?.items.length });
    const lines = t.devlog().filter((l) => l.includes("the planned set needs Wooden Staff"));
    t.eq(lines.length, 1, "a planned piece the bank does not hold: one raw line");
    t.eq(slotCode(t.world.chars.get("Ann")!, "weapon"), "iron_sword", "…and the executor's own solve");
  },
);
