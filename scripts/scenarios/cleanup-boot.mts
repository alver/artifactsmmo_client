// Task 018, settled point 9: what the deleted features stored is dropped at boot, one raw line each, and nothing
// pauses. The first boot runs Pia's planner step a little, then writes into storage what the old service left
// beside it — a hive state with a goal running, the old daily offerings marker, the pins in the state, and on Bo's
// queue (the planner is off for Bo) 🔁 on, an item of a deleted kind, a `train` of a gathering skill and an item of
// a kind that stays — and restarts. The second boot drops the old things with a line each, Pia's step re-attaches
// and goes on, Bo's surviving item runs to its end.
import { achievement, planLines, scenario } from "../harness/index.mts";
import { planner } from "../../src/state/planner";

interface Carry { key: string; ids: string[] }
const fightDone = (items: { kind: string; done?: number }[]): number => items.find((it) => it.kind === "fight")?.done ?? -1;

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }, { name: "Bo", level: 1, x: 2, y: 0 }],
    bank: { copper_dagger: 1 },
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 40])],
    limits: { actions: 400, minutes: 120 },
  },
  async (t) => {
    if (t.boot === 1) {
      await t.run({ until: () => fightDone(t.q("Pia").items) >= 2 });
      // As the old service left it (the hive's shape at b322195: src/state/hive.ts HiveState).
      localStorage.setItem("ammo:v1:hive", JSON.stringify({
        schema: 1, manual: ["Pia"], history: [], auto: true, backlog: [],
        run: { goal: { kind: "farm-tasks", master: "monsters", count: 5 }, label: "Farm 5 tasks", startedAt: Date.now(), waveSeq: 1, wave: null, waveKey: "", preview: [], status: "running" },
      }));
      localStorage.setItem("ammo:v1:offeringsDaily", String(Date.now()));
      const state = JSON.parse(localStorage.getItem("ammo:v1:state") || "{}") as Record<string, unknown>;
      localStorage.setItem("ammo:v1:state", JSON.stringify({ ...state, pins: { Bo: ["mining", "combat"] } }));
      const queues = JSON.parse(localStorage.getItem("ammo:v1:queue") || "{}") as Record<string, unknown>;
      queues.Bo = {
        running: true, repeat: true, items: [
          { id: "old1", kind: "move", x: 4, y: 1 },
          { id: "old2", kind: "train", skill: "mining", toLevel: 0, gear: true },
          { id: "old3", kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 2, done: 0 },
        ],
      };
      localStorage.setItem("ammo:v1:queue", JSON.stringify(queues));
      const carry: Carry = { key: planner.value.current.Pia!.step.key, ids: t.q("Pia").items.map((it) => it.id) };
      return t.restart(carry);
    }
    const c = t.carried as Carry;
    t.eq(t.q("Bo").items.map((it) => it.id), ["old3"], "Bo's queue keeps the item of a kind that stays, nothing else");
    t.eq(t.q("Pia").items.map((it) => it.id), c.ids, "Pia's step: the same items by id");
    t.eq(planner.value.current.Pia?.step.key, c.key, "the step re-attached");

    await t.run({ until: () => t.calls("gathering", "Bo").length >= 2 && !t.q("Bo").running && fightDone(t.q("Pia").items) >= 4 });
    await t.run({ minutes: 1 }); // the dev log flushes
    const drops = t.devlog().filter((l) => l.includes(" boot: dropped ")).map((l) => l.slice(l.indexOf(" boot: dropped ") + 15, l.indexOf(" — ")));
    t.eq(drops, [
      "ammo:v1:hive",
      "ammo:v1:offeringsDaily",
      "ammo:v1:state's pins",
      "Bo's queue: the 🔁 repeat flag",
      "Bo's queue: [old1] move",
      "Bo's queue: [old2] train mining",
    ], "one raw line for each thing dropped");
    t.ok(["ammo:v1:hive", "ammo:v1:offeringsDaily"].every((k) => localStorage.getItem(k) === null), "the two keys are gone");
    t.ok(!("pins" in JSON.parse(localStorage.getItem("ammo:v1:state") || "{}")), "the pins are gone from the state");
    t.ok(planLines(t, "Pia").includes(`re-attached ${c.key}`), "the dev log says re-attached");
    t.ok(!t.q("Bo").items.length && !t.q("Bo").running, "Bo's item ran to its end");
    t.ok(t.q("Pia").running && planner.value.current.Pia?.step.key === c.key, "Pia's step goes on, running");
    t.eq(t.journal("pause").length, 0, "nothing paused");
    t.ok(!t.devlog().some((l) => l.includes("server uncaught") || l.includes("server unhandled")), "nothing threw");
  },
);
