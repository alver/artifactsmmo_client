// Task 027d: the `task-visit` item — one visit to the tasks master. Cal holds an items task the plan cancels: the coin is
// fetched from the bank, the task cancelled at the items master, a monsters task taken at the monsters master. Dot holds
// a finished monsters task: turned in (its coins into the bag), a new one taken. Eve holds an items task and no coin is
// anywhere: the task is kept, the item ends. Pip's fight item kills its task's monster: the kills count for the task.
import { scenario } from "../harness/index.mts";

await scenario(
  {
    characters: [
      { name: "Cal", level: 20, x: 4, y: 1, task: "gudgeon", task_type: "items", task_progress: 10, task_total: 100 }, // on the bank
      { name: "Dot", level: 20, x: 1, y: 2, task: "chicken", task_type: "monsters", task_progress: 50, task_total: 50 }, // on the monsters master
      { name: "Eve", level: 20, x: 4, y: 1, task: "shrimp", task_type: "items", task_progress: 0, task_total: 80 },
      { name: "Pip", level: 20, x: 0, y: 1, weapon_slot: "copper_dagger", task: "chicken", task_type: "monsters", task_progress: 0, task_total: 60 }, // on the chickens
    ],
    bank: { tasks_coin: 1 },
    draws: [{ code: "cow", total: 120 }, { code: "wolf", total: 90 }],
  },
  async (t) => {
    t.queue("Cal", [{ kind: "task-visit", done: 0, cancel: "gudgeon" }]);
    t.queue("Dot", [{ kind: "task-visit", done: 0 }]);
    await t.run();
    t.queue("Eve", [{ kind: "task-visit", done: 0, cancel: "shrimp" }]);
    t.queue("Pip", [{ kind: "fight", monster: "chicken", times: 3, done: 0 }]);
    await t.run();

    const cal = t.world.chars.get("Cal")!, dot = t.world.chars.get("Dot")!, eve = t.world.chars.get("Eve")!, pip = t.world.chars.get("Pip")!;
    t.eq(t.calls("task/cancel", "Cal").map((c) => c.code), [200], "Cal cancelled its items task once");
    t.eq(t.bank("tasks_coin"), 0, "the cancel's coin came from the bank");
    t.eq([cal.task_type, [cal.task, dot.task].sort()], ["monsters", ["cow", "wolf"]], "Cal took a monsters task after the cancel (the draws: cow, wolf)");
    t.eq(t.calls("task/complete", "Dot").map((c) => c.code), [200], "Dot turned its finished task in");
    t.eq(t.inv("Dot", "tasks_coin"), 3, "the chicken task's 3 coins are in Dot's bag");
    t.eq([dot.task_type, dot.task_progress], ["monsters", 0], "Dot holds a new monsters task");
    t.eq(t.calls("task/cancel", "Eve").length, 0, "with no coin anywhere Eve's task is not cancelled");
    t.eq([eve.task, eve.task_type], ["shrimp", "items"], "Eve keeps its items task");
    t.eq(t.q("Eve"), { items: [], running: false }, "Eve's visit ended (no pause)");
    t.eq(pip.task_progress, 3, "Pip's three chicken kills count for its chicken task");
    for (const n of ["Cal", "Dot"]) t.eq(t.q(n), { items: [], running: false }, `${n}'s queue ran to the end`);
  },
);
