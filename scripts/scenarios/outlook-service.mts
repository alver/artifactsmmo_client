// Task 019, settled point 11: the outlook's service side (src/state/outlook.ts) with a fake runner — no process is started.
// A request two minutes after the first achievements read, with the World, the step in flight and the deadline; a whole
// road lands on the signal, in the journal and in the status; a config change kills the running child and starts another
// 30 s later; a child that exits early or prints garbage leaves the last road on the signal, sets `failed`, writes one raw
// line and pauses nothing; ↻ at most once a minute; a restart shows the stored road with its time.
import { achievement, scenario } from "../harness/index.mts";
import { planner, setPlannerConfig } from "../../src/state/planner";
import { HORIZON_DAYS, outlook, refreshOutlook, setOutlookRunner } from "../../src/state/outlook";
import type { OutlookRunner } from "../../src/state/outlook";

interface Call { at: number; input: any; mode: string; killed: boolean }
const calls: Call[] = [];
const MODES = ["ok", "slow", "exit1", "garbage"]; // what the fake child does, call by call
const fake: OutlookRunner = (input, onLine, onExit) => {
  const call: Call = { at: Date.now(), input: JSON.parse(input), mode: MODES[calls.length] ?? "ok", killed: false };
  calls.push(call);
  const timers: ReturnType<typeof setTimeout>[] = [];
  const later = (ms: number, f: () => void): void => void timers.push(setTimeout(f, ms));
  const line = (o: unknown): void => onLine(JSON.stringify(o));
  const now = call.input.world.now as number;
  later(1000, () => line({ k: "waiting", from: now, waiting: [{ achievement: "chicken_hunt", points: 5, waits: "does not fit" }] }));
  if (call.mode === "ok") {
    later(10_000, () => line({ k: "next", from: now, next: { Pia: [{ key: "ach:chicken_hunt:0@Pia#2", as: "objective", text: "Fight 40× Chicken", why: "made up", hours: 1.5, at: now + 3.6e6 }] } }));
    for (let i = 1; i <= 3; i++) later(60_000 * i, () => line({ k: "day", at: now + i * 864e5, n: i, of: 95, points: 0 }));
    later(5 * 60_000, () => line({ k: "done", from: now, until: call.input.until, points: 0, expected: 5, completed: [{ code: "chicken_hunt", points: 5, at: now + 7.2e6 }], byDay: [{ day: "2026-01-15", points: 5 }], sec: 300, steps: 12 }));
    later(5 * 60_000 + 100, () => onExit(0));
  }
  if (call.mode === "exit1") later(60_000, () => onExit(1, "made up: it died"));
  if (call.mode === "garbage") later(60_000, () => onLine("this is not the road"));
  return { kill: () => { call.killed = true; timers.forEach(clearTimeout); } };
};

await scenario(
  {
    planner: { on: { Pia: true } },
    characters: [{ name: "Pia", level: 10, x: 4, y: 1 }],
    bank: { copper_dagger: 1 },
    achievements: [achievement("chicken_hunt", 5, ["combat_kill", "chicken", 400])],
    limits: { actions: 2000, minutes: 90 },
    setup: () => setOutlookRunner(fake),
  },
  async (t) => {
    if (t.boot === 2) {
      // no runner in this process: the stored road shows, with its time, and nothing starts
      const c = t.carried as { at: number; from: number };
      t.eq([outlook.value.road?.at, outlook.value.road?.from, outlook.value.state], [c.at, c.from, "failed"], "a restart shows the stored road with its time (and the last state)");
      await t.run({ minutes: 5 });
      t.eq(calls.length, 0, "no runner: no run");
      return;
    }
    const failedLines = (): string[] => t.devlog().filter((l) => l.includes("outlook: failed — "));
    // 1. two minutes after the first achievements read
    await t.run({ until: () => calls.length >= 1 });
    const readAt = planner.value.achievementsAt;
    const c0 = calls[0];
    t.ok(c0.at - readAt >= 120_000 && c0.at - readAt < 125_000, `the first run two minutes after the first read (${((c0.at - readAt) / 1000).toFixed(0)} s)`);
    // task 020: as the service computes it — 0 is the deadline
    const until = HORIZON_DAYS ? Math.min(Date.parse(c0.input.world.config.deadline), c0.input.world.now + HORIZON_DAYS * 864e5) : Date.parse(c0.input.world.config.deadline);
    t.ok(c0.input.world.characters[0].name === "Pia" && c0.input.running.Pia?.step.key.startsWith("ach:chicken_hunt:0@Pia#") && c0.input.until === until,
      `its input: the World, the step in flight, the horizon (${c0.input.running.Pia?.step.key}, ${new Date(c0.input.until).toISOString()})`);
    await t.run({ until: () => outlook.value.state === "running" && !!outlook.value.waiting });
    t.ok(outlook.value.waiting?.[0]?.achievement === "chicken_hunt" && !outlook.value.road, "while it runs: waiting on the signal, no road yet");
    await t.run({ until: () => !!outlook.value.road });
    const road = outlook.value.road!;
    t.eq([outlook.value.state, road.expected, road.completed.length, outlook.value.next?.Pia?.[0]?.text], ["idle", 5, 1, "Fight 40× Chicken"], "a whole road: idle, expected, completions, next");
    const rec = t.journal("outlook");
    t.ok(rec.length === 1 && rec[0].expected === 5 && rec[0].next?.[0]?.code === "chicken_hunt" && rec[0].sec === 300, `one journal record: ${JSON.stringify(rec[0])}`);
    await t.run({ minutes: 1.5 });
    const st = JSON.parse(t.files().files.get("logs/status.json")!);
    t.eq(st.outlook, { at: new Date(road.from).toISOString(), expected: 5, sec: 300, state: "idle" }, "the status's outlook");

    // 2. a config change: a run 30 s later; another change while it runs kills it and starts anew 30 s later
    setPlannerConfig({ first: ["chicken_hunt"] });
    const asked1 = Date.now();
    await t.run({ until: () => calls.length >= 2 });
    t.ok(Math.abs(calls[1].at - asked1 - 30_000) < 1000, `a run 30 s after a config change (${((calls[1].at - asked1) / 1000).toFixed(0)} s)`);
    await t.run({ minutes: 1 });
    setPlannerConfig({ first: [] });
    const asked2 = Date.now();
    await t.run({ until: () => calls.length >= 3 });
    t.ok(calls[1].killed && Math.abs(calls[2].at - asked2 - 30_000) < 1000, "the next change killed the running child and started another 30 s later");

    // 3. a child that exits before its road is whole: failed, the last road stays, one raw line, nothing paused
    await t.run({ until: () => outlook.value.state === "failed" });
    t.ok(outlook.value.road?.at === road.at && /exited with 1 before the road was whole: made up: it died/.test(outlook.value.error ?? ""), `failed, the last road stays: ${outlook.value.error}`);
    await t.run({ minutes: 0.1 }); // the dev log flushes every 500 ms
    t.eq(failedLines().length, 1, "one raw line");

    // 4. ↻ starts one at once (a second ↻ within the minute does nothing); it prints garbage: killed, failed, one more line
    refreshOutlook();
    refreshOutlook();
    await t.run({ minutes: 0.05 });
    t.eq(calls.length, 4, "↻: one run at once, the second ↻ within a minute ignored");
    await t.run({ until: () => calls[3].killed });
    await t.run({ minutes: 0.1 });
    t.ok(outlook.value.state === "failed" && /not the road's/.test(outlook.value.error ?? "") && outlook.value.road?.at === road.at, `garbage: killed, failed, the last road stays (${outlook.value.error})`);
    t.eq(failedLines().length, 2, "one raw line a failure");
    t.eq(t.journal("outlook").map((r) => (r.failed ? "failed" : "done")), ["done", "failed", "failed"], "a journal record a run that ended (the killed one has none)");
    t.ok(t.q("Pia").running && !t.journal("pause").length && t.calls("fight", "Pia").length > 10, `nothing paused: Pia fought on (${t.calls("fight", "Pia").length} fights)`);
    await t.run({ minutes: 3 });
    t.eq(calls.length, 4, "no run of its own before the three hours");
    return t.restart({ at: road.at, from: road.from });
  },
);
