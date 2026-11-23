// Task 025, settled point 5: the plan wears the healing rune, and a worn one stays on — a reset does not strip it, a gathering
// step keeps it on (jobgear.ts PINNED_RUNE). Ann wears one; a planner's gathering step (its reset into the mining set) and
// then a fight step whose set names no rune: the rune is on her the whole time, and never banked. On 0f94809 the gathering
// step's reset stripped it into the bank.
import { scenario } from "../harness/index.mts";
import { insertItem, queues, startQueue } from "../../src/state/queue";
import { slotCode } from "../../src/types/api";
import type { QueueItem } from "../../src/plan/queue";

const gather: QueueItem[] = [
  { id: "pl:lvl:mining:5@Ann#1:0", kind: "gear", job: { kind: "gather", skill: "mining" }, reset: true },
  { id: "pl:lvl:mining:5@Ann#1:1", kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 2, done: 0, gear: true },
];
const fight: QueueItem[] = [
  { id: "pl:ach:made_up_chickens:0@Ann#1:0", kind: "gear", job: { kind: "fight", monster: "chicken" }, reset: true, wear: { weapon: "copper_dagger" } },
  { id: "pl:ach:made_up_chickens:0@Ann#1:1", kind: "fight", monster: "chicken", times: 2, done: 0, gear: true, take: {}, wear: { weapon: "copper_dagger" } },
];
await scenario(
  {
    characters: [{ name: "Ann", level: 20, x: 4, y: 1, rune_slot: "healing_rune" }], // on the bank
    bank: { copper_dagger: 1, copper_pickaxe: 1 },
    limits: { actions: 300, minutes: 120 },
  },
  async (t) => {
    gather.forEach((it, i) => insertItem("Ann", it, i));
    startQueue("Ann");
    await t.run({ until: () => !queues.value.Ann?.items.length || !!queues.value.Ann.items[0].error });
    t.eq(t.calls("gathering", "Ann").length, 2, "the gathering step ran");
    t.eq(slotCode(t.world.chars.get("Ann")!, "rune"), "healing_rune", "the gathering step's reset kept the rune on");
    fight.forEach((it, i) => insertItem("Ann", it, i));
    startQueue("Ann");
    await t.run({ until: () => !queues.value.Ann?.items.length || !!queues.value.Ann.items[0].error });
    t.eq(t.calls("fight", "Ann").length, 2, "the fight step ran");
    t.eq(slotCode(t.world.chars.get("Ann")!, "rune"), "healing_rune", "…and its reset kept it on too");
    t.ok(!t.calls("unequip", "Ann").some((c) => JSON.stringify(c.body).includes("rune")) && t.bank("healing_rune") === 0, "never taken off, never banked");
  },
);
