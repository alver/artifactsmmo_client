// Task 008, section 7: switching a character on through setPlannerConfig. Its queue — a reset, a crafting level, an
// infinite item and an item of another writer — is logged item by item and dropped, and the first step runs. Then
// every writer that is not the planner's leaves the owned queue as it is (task 018: the harness's addItem and the
// Group fight fold's queuePrepare are what is left of them).
import { achievement, planLines, scenario } from "../harness/index.mts";
import { withId } from "../../src/plan/queue";
import { planner, setPlannerConfig } from "../../src/state/planner";
import { addItem, insertItem, queuePrepare } from "../../src/state/queue";
import { log } from "../../src/state/store";

await scenario(
  {
    characters: [
      { name: "Ivy", level: 10, x: 2, y: 0 }, // on the copper rocks
      { name: "Bob", level: 10, x: 4, y: 1 },
    ],
    bank: { copper_dagger: 1 }, // a safe win on chickens
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 40])],
    limits: { actions: 400, minutes: 120 },
  },
  async (t) => {
    // Ivy's own queue: a reset, a crafting level, an infinite gather and another writer's item.
    t.queue("Ivy", [
      { kind: "gear", job: { kind: "gather", skill: "mining" }, reset: true },
      { kind: "train", skill: "weaponcrafting", toLevel: 0, levels: 1, gear: true },
      { kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 0, done: 0 },
    ]);
    insertItem("Ivy", { ...withId({ kind: "fight", monster: "chicken", times: 3, done: 0 }), id: "old:1:0:Ivy:0" }, 3);
    await t.run({ until: () => t.calls(undefined, "Ivy").length > 0 }); // the reset under way (no 🔁 to keep a finished item)
    const before = t.q("Ivy").items.map((it) => it.id);
    t.eq(before.length, 4, "four items before");

    setPlannerConfig({ on: { Ivy: true } });
    await t.run({ until: () => !!planner.value.current.Ivy && t.calls("fight", "Ivy").length > 0 });
    const plan = planLines(t, "Ivy");
    for (const id of before) t.ok(plan.some((l) => l.startsWith(`took over — dropped [${id}] `)), `dropped and logged: ${id}`);
    const q = t.q("Ivy");
    t.ok(q.running, "the queue runs");
    t.ok(q.items.every((it) => it.id.startsWith("pl:")), `only the planner's items: ${q.items.map((i) => i.id)}`);
    t.ok(!!planner.value.current.Ivy?.step.key.startsWith("ach:chicken_hunt:0@Ivy#1"), "the first step is the open objective");

    // Every writer that is not the planner's, against the owned queue.
    const snap = JSON.stringify(t.q("Ivy").items.map((it) => it.id));
    const mark = log.value[0]?.id ?? 0;
    addItem("Ivy", withId({ kind: "deposit-all" }));
    queuePrepare("Ivy", "chicken");
    const lines = log.value.filter((e) => e.id > mark && /planner owns/.test(e.text));
    t.eq(lines.length, 2, "one refusal line each: add, prepare");
    t.eq(JSON.stringify(t.q("Ivy").items.map((it) => it.id)), snap, "the owned queue is as it was");
    t.ok(t.q("Ivy").running, "still running");
    await t.run({ minutes: 5 });
    t.ok(t.q("Ivy").items.every((it) => it.id.startsWith("pl:")) && t.q("Ivy").running, "minutes later: still only the planner's items, running");
  },
);
