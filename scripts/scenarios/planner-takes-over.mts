// Task 008, section 7: switching a character on through setPlannerConfig. Its queue — a 🔁 pin rotation, an
// infinite item and a hive item — is logged item by item and dropped, 🔁 goes off, it joins the hive's opt-out
// list and the first step runs. Then every old writer leaves the owned queue as it is: queuePinTraining,
// queueAssist (as crafter and as helper), addItem, clearQueue, setRepeat, stopQueue, toggleHiveManual.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { withId } from "../../src/plan/queue";
import { planner, setPlannerConfig } from "../../src/state/planner";
import { hive, toggleHiveManual } from "../../src/state/hive";
import { addItem, clearQueue, insertItem, queueAssist, queuePinTraining, setRepeat, stopQueue } from "../../src/state/queue";
import { log, skillPins } from "../../src/state/store";

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
    // Ivy's own queue: a pin rotation (reset + train mining +1), an infinite gather and a hive item, 🔁 on.
    t.queue("Ivy", [
      { kind: "gear", job: { kind: "gather", skill: "mining" }, reset: true },
      { kind: "train", skill: "mining", toLevel: 0, levels: 1, gear: true },
      { kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 0, done: 0 },
    ], { repeat: true });
    insertItem("Ivy", { ...withId({ kind: "fight", monster: "chicken", times: 3, done: 0 }), id: "hive:1:0:Ivy:0" }, 3);
    await t.run({ minutes: 2 });
    const before = t.q("Ivy").items.map((it) => it.id);
    t.eq(before.length, 4, "four items before");

    setPlannerConfig({ on: { Ivy: true } });
    await t.run({ until: () => !!planner.value.current.Ivy && t.calls("fight", "Ivy").length > 0 });
    const plan = planLines(t, "Ivy");
    for (const id of before) t.ok(plan.some((l) => l.startsWith(`took over — dropped [${id}] `)), `dropped and logged: ${id}`);
    const q = t.q("Ivy");
    t.ok(q.running && !q.repeat, "the queue runs, 🔁 is off");
    t.ok(q.items.every((it) => it.id.startsWith("pl:")), `only the planner's items: ${q.items.map((i) => i.id)}`);
    t.ok(hive.value.manual.includes("Ivy") && planner.value.optedOut.includes("Ivy"), "on the hive's opt-out list, by the planner");
    t.ok(!!planner.value.current.Ivy?.step.key.startsWith("ach:chicken_hunt:0@Ivy#1"), "the first step is the open objective");

    // Every old writer, against the owned queue.
    const snap = JSON.stringify(t.q("Ivy").items.map((it) => it.id));
    skillPins.value = { Ivy: ["mining"] };
    const mark = log.value[0]?.id ?? 0;
    queuePinTraining("Ivy");
    queueAssist("Ivy", "weaponcrafting"); // Ivy as the crafter: refused
    queueAssist("Bob", "weaponcrafting"); // Ivy as a helper: skipped
    addItem("Ivy", withId({ kind: "rest" }));
    clearQueue("Ivy");
    setRepeat("Ivy", true);
    stopQueue("Ivy");
    toggleHiveManual("Ivy");
    const lines = log.value.filter((e) => e.id > mark && /planner owns/.test(e.text));
    t.eq(lines.length, 7, "one refusal line each: pins, assist as crafter, add, clear, repeat, stop, the hive's opt-out (assist as a helper skips Ivy silently)");
    t.eq(JSON.stringify(t.q("Ivy").items.map((it) => it.id)), snap, "the owned queue is as it was");
    t.ok(t.q("Ivy").running && !t.q("Ivy").repeat, "still running, 🔁 still off");
    t.ok(hive.value.manual.includes("Ivy"), "still opted out of the hive");
    await t.run({ minutes: 5 });
    t.ok(t.q("Ivy").items.every((it) => it.id.startsWith("pl:")) && t.q("Ivy").running, "minutes later: still only the planner's items, running");
  },
);
