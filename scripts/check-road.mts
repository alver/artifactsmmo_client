// Task 019, settled point 11: the road (src/plan/planner/road.ts) on a made-up world — the fleet of docs/design/snapshot/
// (2026-11-18) with the bank of scripts/fixtures/roadmap-fleet.json, all five on, at 17:00 UTC, played eight hours (a
// midnight inside). `next` comes before the first `day`; a character with a step in flight starts its first new step at
// that step's expected end, with what the step was to bring in the bank by then (point 2). "Two runs give the same lines"
// is check-outlook-child's (the child against a run in its own process): two runs in ONE process differ — the second
// starts with the first one's solve caches (reach.ts, the replay's known noise; report 019).
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { DEFAULTS } from "../src/plan/planner/config";
import { perOf } from "../src/plan/planner/cost";
import { forward } from "../src/plan/planner/forward";
import { leftOf, road } from "../src/plan/planner/road";
import type { RoadLine } from "../src/plan/planner/road";
import type { AccountAchievement, BankItem, Character } from "../src/types/api";
import type { Running, Step, World } from "../src/plan/planner/types";

setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
const snap = async (n: string): Promise<any> => JSON.parse(await readFile(`docs/design/snapshot/${n}.json`, "utf8")).data;
const chars = (await snap("characters")) as Character[];
const achievements = (await snap("achievements")) as AccountAchievement[];
const bank = (JSON.parse(await readFile("scripts/fixtures/roadmap-fleet.json", "utf8")) as { bankItems: BankItem[] }).bankItems;
const NOW = Date.UTC(2026, 10, 18, 17, 0, 0);
const H = 3.6e6;
const world: World = {
  now: NOW, characters: chars, bank, bankGold: 155_976, achievements, events: [], current: {}, costs: {}, blocked: {},
  config: { ...DEFAULTS, on: Object.fromEntries(chars.map((c) => [c.name, true])) },
};
const until = NOW + 8 * H;

let failed = 0;
const check = (what: string, ok: boolean, more = ""): void => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${more ? ` — ${more}` : ""}`);
  if (!ok) failed++;
};

// What is left of a step: units less the units done (a field item counts actions), hours pro rata.
const step = (over: Partial<Step>): Step => ({ key: "made_up@First#1", target: "made_up", character: "First", as: "objective", work: { kind: "task" }, units: 10, hours: 1, score: 0, why: "made up", ...over });
const run = (s: Step, units: number): Running => ({ step: s, startedAt: NOW - H, n: 3, run: 1800, progress: 0, movedAt: 0, units });
const drop: Step = step({ work: { kind: "kill", monster: "chicken", drop: "feather" }, units: 4, hours: 2 });
const per = perOf(drop.work);
const ld = leftOf(run(drop, Math.round(2 * per)));
check("leftOf: a drop objective's units are items, its item counts fights (perOf)", per > 1 && Math.abs(ld.units - (4 - Math.round(2 * per) / per)) < 1e-9 && Math.abs(ld.hours - (2 * ld.units) / 4) < 1e-9, `${per} fights an item: ${ld.units.toFixed(2)} of 4 left, ${ld.hours.toFixed(2)} h`);
const ls = leftOf(run(step({ as: "supply", work: { kind: "gather", resource: "ash_tree", drop: "ash_wood" }, units: 100, hours: 1.5 }), 40));
check("leftOf: a supply step's units are actions", ls.units === 60 && Math.abs(ls.hours - 0.9) < 1e-9, `${ls.units} left, ${ls.hours} h`);
check("leftOf: never below nothing", leftOf(run(step({}), 12)).units === 0);

// First is in the middle of a gather chunk: 100 copper ore, 40 actions done, 1.5 h planned.
const ore: Step = step({ key: "lvl:mining:10@First#1", target: "lvl:mining:10", as: "level", work: { kind: "gather", resource: "copper_rocks", drop: "copper_ore" }, units: 100, hours: 1.5, place: { x: 2, y: 0, layer: "overworld" } });
const running: Record<string, Running> = { First: run(ore, 40) };
const left = leftOf(running.First);
const end = NOW + left.hours * H;

const a: RoadLine[] = [];
road(world, running, until, (l) => a.push(l));
const kinds = a.map((l) => l.k);
check("waiting first, done last", kinds[0] === "waiting" && kinds[kinds.length - 1] === "done" && kinds.filter((k) => k === "done").length === 1, kinds.join(" "));
check("next comes before the first day", kinds.includes("day") && kinds.indexOf("next") < kinds.indexOf("day"));
const next = a.find((l): l is Extract<RoadLine, { k: "next" }> => l.k === "next")!;
const firstNew = next.next.First?.[0];
check("First (a step in flight) starts its first new step at that step's expected end", !!firstNew && Math.abs(firstNew.at - end) < 1000, `${firstNew ? new Date(firstNew.at).toISOString() : "none"} against ${new Date(end).toISOString()} (${left.units.toFixed(1)} of 100 units left)`);
check("…and the others decide at the World's time", chars.filter((c) => c.name !== "First").every((c) => next.next[c.name]?.[0]?.at === NOW));
check("…and its next steps follow one another", (next.next.First ?? []).every((s, i, all) => i === 0 || s.at > all[i - 1].at));
const done = a[a.length - 1] as Extract<RoadLine, { k: "done" }>;
check("done: the points at the start, at the end and by day", done.points <= done.expected && done.byDay.length === 1 && done.byDay[0].day === "2026-11-18" && done.steps > 0, JSON.stringify({ points: done.points, expected: done.expected, byDay: done.byDay, steps: done.steps }));

// What the step was to bring is in the bank when First decides again (forward's seed, settled point 2).
const ore0 = bank.find((x) => x.code === "copper_ore")?.quantity ?? 0;
let seen: number | undefined;
forward(world, until, (w, s) => { if (s.character === "First" && seen == null) seen = (w.bank.find((x) => x.code === "copper_ore")?.quantity ?? 0) - ore0; }, undefined, { First: left });
check("what the step was to bring is in the bank by then", seen != null && Math.abs(seen - left.units) < 1e-6, `${seen?.toFixed(2)} copper ore more against ${left.units.toFixed(2)} left of the step`);
let without: number | undefined;
forward(world, until, (w, s) => { if (s.character === "First" && without == null) without = w.now; });
check("without a seed First decides at the World's time (forward as before)", without === NOW);

console.log(failed ? `FAIL — ${failed} check(s)` : `ok — the road: ${a.length} lines, ${done.steps} steps in eight hours, ${done.sec} s`);
process.exit(failed ? 1 : 0);
