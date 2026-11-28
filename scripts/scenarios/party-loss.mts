// Task 039c (A.3): a lost fight ends the party's step for all — Ann leads Ben and Cy against the lich (as party-step), the
// first fight is lost (forced): every member wakes at (0, 0), nobody fights again, each member's item ends, and the record says
// the loss.
import { scenario } from "../harness/index.mts";
import { insertItem, queues, startQueue } from "../../src/state/queue";
import { plannerOn } from "../../src/state/store";
import type { QueueItem } from "../../src/plan/queue";

const NAMES = ["Ann", "Ben", "Cy"];
const strong = { level: 40, max_hp: 4_000, hp: 4_000, attack_fire: 300, dmg: 50, res_fire: 40, res_earth: 40, x: 4, y: 1 };
const party = { key: "party:lich@Ann#1", leader: "Ann", members: NAMES, p: 0.99, turns: 67 };
await scenario(
  {
    characters: NAMES.map((name) => ({ name, ...strong })),
    bank: { lich_tomb_key: 10 },
    limits: { actions: 300, minutes: 120 },
  },
  async (t) => {
    t.world.forceFight("Ann", { result: "loss", turns: 80 }, { result: "win", turns: 60 });
    for (const n of NAMES) {
      const key = `pl:party:lich@${n}#1`;
      const items: QueueItem[] = [
        { id: `${key}:0`, kind: "gear", job: { kind: "fight", monster: "lich" }, reset: true },
        { id: `${key}:1`, kind: "fight", monster: "lich", times: 3, done: 0, gear: true, take: { lich_tomb_key: 1 }, party },
        { id: `${key}:2`, kind: "deposit-all" },
      ];
      items.forEach((it, i) => insertItem(n, it, i));
      startQueue(n);
    }
    plannerOn.value = Object.fromEntries(NAMES.map((n) => [n, true])); // owned once queued (startQueue refuses an owned character)
    await t.run({ until: () => NAMES.every((n) => !queues.value[n]?.items.some((it) => it.kind === "fight")) });
    t.eq(t.calls("fight").length, 1, "one fight: the loss ends the step for all");
    t.eq((t.journal("party") as unknown as { result: string }[]).map((r) => r.result), ["loss"], "its record says the loss");
    t.eq(NAMES.map((n) => queues.value[n]?.items.some((it) => it.kind === "fight") ?? false), [false, false, false], "every member's fight item ended");
  },
);
