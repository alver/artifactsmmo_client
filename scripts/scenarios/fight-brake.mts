// Task 025, settled point 2: the brake is play against the forecast, not a count of losses. Combat 9 with a copper dagger wins
// the green slime at p 0.75 (sim/monte.ts winRate, the gate's number — admitted at the floor). Ben loses as forecast — 3 of
// 12 (a chance of 40% at p 0.75): the step runs to its end, nothing is blocked. Ann loses 3 of 3 (a chance of 1.6%): the step
// ends at the third loss and the green slime is blocked for Ann — 24 h or until her set or level changes — with a why that
// names forecast and observed ("forecast 75%, won 0 of 3"); no pause, no strike. On 0f94809 Ann's second loss in a row
// paused the item ("lost 2 fights in a row") and nothing named the forecast.
import { scenario } from "../harness/index.mts";
import { insertItem, queues, runQueue } from "../../src/state/queue";
import { plannerOn } from "../../src/state/store";
import { planner } from "../../src/state/planner";
import type { QueueItem } from "../../src/plan/queue";

const items = (who: string, times: number): QueueItem[] => [
  { id: `pl:ach:made_up_slimes:0@${who}#1:0`, kind: "gear", job: { kind: "fight", monster: "green_slime" }, reset: true, wear: { weapon: "copper_dagger" } },
  { id: `pl:ach:made_up_slimes:0@${who}#1:1`, kind: "fight", monster: "green_slime", times, done: 0, gear: true, take: {}, wear: { weapon: "copper_dagger" } },
];
const W = { result: "win" as const }, L = { result: "loss" as const };
await scenario(
  {
    characters: [{ name: "Ben", level: 9, x: 4, y: 1 }, { name: "Ann", level: 9, x: 4, y: 1 }], // on the bank
    bank: { copper_dagger: 2 },
    limits: { actions: 600, minutes: 240 },
  },
  async (t) => {
    plannerOn.value = { Ann: true, Ben: true }; // the runner judges them as the planner's (its block hook writes for owned ones)
    const blocked = (who: string) => (planner.value.blocked as Record<string, { why: string; until: number; level?: number; set?: string } | undefined>)[`kill:green_slime@${who}`];

    // Ben: as forecast
    t.world.forceFight("Ben", L, W, W, W, L, W, W, W, L, W, W, W);
    items("Ben", 9).forEach((it, i) => insertItem("Ben", it, i));
    runQueue("Ben");
    await t.run({ until: () => !queues.value.Ben?.items.length || !!queues.value.Ben.items[0].error });
    t.eq(t.calls("fight", "Ben").length, 12, "Ben: 12 fights, 3 lost, 9 won — the step ran to its end");
    t.ok(!blocked("Ben") && !t.journal("block").some((b) => b.who === "Ben"), "…and nothing is blocked: 3 losses in 12 are what p 0.75 forecasts");
    t.eq(t.journal("loss").filter((l) => l.who === "Ben").map((l) => l.p), [0.75, 0.75, 0.75], "each loss records the gate's p");

    // Ann: worse than forecast
    t.world.forceFight("Ann", L, L, L, W, W);
    items("Ann", 3).forEach((it, i) => insertItem("Ann", it, i));
    runQueue("Ann");
    await t.run({ until: () => !queues.value.Ann?.items.length || !!queues.value.Ann.items[0].error });
    t.eq(t.calls("fight", "Ann").length, 3, "Ann: three fights, three losses — the step ends at the third");
    const b = blocked("Ann");
    t.ok(!!b && b.why === "forecast 75%, won 0 of 3" && b.level === 9 && b.set === "copper_dagger", `the green slime is blocked for Ann, the why naming forecast and observed: ${JSON.stringify(b)}`);
    t.ok(!!b && Math.abs(b.until - Date.now() - 24 * 3600_000) < 3600_000, "…for 24 h (or until her set or level changes)");
    t.ok(t.journal("block").some((r) => r.who === "Ann" && r.target === "kill:green_slime"), "a `block` record");
    t.ok(!t.devlog().some((l) => /lost 2 fights in a row|not a safe win/.test(l)) && !queues.value.Ann?.items.some((i) => i.error), "no pause, no strike");
  },
);
