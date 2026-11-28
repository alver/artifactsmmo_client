// Task 039c (A.1, A.3, C): the party's step on the mock service — Ann leads, Ben and Cy follow, each queue the step as
// state/planner.ts writes it (the reset with the key from the bank, the party's fight item, the deposit). Each member walks to
// the lich through the keyed transition (9, 7) — one lich tomb key a member — and waits; once all three stand there healed and
// off cooldown, Ann fights with `participants` [Ben, Cy], twice (forced wins); every member's echo is folded (the mirror check),
// each fight is a `party` record, and while the party runs a member is given no other interrupt.
import { scenario } from "../harness/index.mts";
import { insertItem, queues, startQueue } from "../../src/state/queue";
import { plannerOn } from "../../src/state/store";
import { interrupt } from "../../src/state/planner";
import type { QueueItem } from "../../src/plan/queue";

const NAMES = ["Ann", "Ben", "Cy"];
const strong = { level: 40, max_hp: 4_000, hp: 4_000, attack_fire: 300, dmg: 50, res_fire: 40, res_earth: 40, x: 4, y: 1 }; // on the bank
const party = { key: "party:lich@Ann#1", leader: "Ann", members: NAMES, p: 0.99, turns: 67 };
await scenario(
  {
    characters: NAMES.map((name) => ({ name, ...strong })),
    bank: { lich_tomb_key: 10, cooked_trout: 50 },
    limits: { actions: 400, minutes: 180 },
  },
  async (t) => {
    t.world.forceFight("Ann", { result: "win", turns: 67, hpLost: 300, drops: [{ code: "life_crystal_shard", quantity: 1 }] }, { result: "win", turns: 64, hpLost: 200 });
    for (const n of NAMES) {
      const key = `pl:party:lich@${n}#1`;
      const items: QueueItem[] = [
        { id: `${key}:0`, kind: "gear", job: { kind: "fight", monster: "lich" }, reset: true },
        { id: `${key}:1`, kind: "fight", monster: "lich", times: 2, done: 0, gear: true, take: { lich_tomb_key: 1 }, party },
        { id: `${key}:2`, kind: "deposit-all" },
      ];
      items.forEach((it, i) => insertItem(n, it, i));
      startQueue(n);
    }
    plannerOn.value = Object.fromEntries(NAMES.map((n) => [n, true])); // owned once queued (startQueue refuses an owned character)
    await t.run({ until: () => t.calls("fight", "Ann").length >= 1 });
    t.eq(interrupt("Ben", "offering", [{ kind: "offering" }], "check"), false, "a member in a party is given no other interrupt");
    await t.run({ until: () => NAMES.every((n) => !queues.value[n]?.items.length) });
    const fights = t.calls("fight");
    t.eq(fights.map((c) => [c.who, (c.body as { participants?: string[] }).participants]), [["Ann", ["Ben", "Cy"]], ["Ann", ["Ben", "Cy"]]], "the leader fights twice with participants; nobody else fights");
    t.eq(NAMES.map((n) => t.calls("transition", n).filter((c) => c.code === 200).length >= 1), [true, true, true], "each member went through the keyed transition");
    t.eq(t.bank("lich_tomb_key"), 7, "one key a member for the entry");
    const recs = t.journal("party") as unknown as { result: string; members: { name: string; hp: number; at: { x: number; y: number; layer: string } }[] }[];
    t.eq(recs.map((r) => [r.result, r.members.map((m) => m.name).join(",")]), [["win", "Ann,Ben,Cy"], ["win", "Ann,Ben,Cy"]], "a `party` record a fight, every member in it");
    t.ok(recs.every((r) => r.members.every((m) => m.at && m.at.x === 9 && m.at.y === 8 && m.at.layer === "underground")), "each record says where each member stands after: the lich's tile");
    t.eq(t.inv("Ben", "life_crystal_shard") + t.bank("life_crystal_shard") >= 1, true, "a member's drops reach it (the echo folded)");
  },
);
