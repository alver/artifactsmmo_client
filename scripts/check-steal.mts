// Self-check of state/hive.ts planSteal's measured-pace sizing (no API, synthetic queues):
//   node --import tsx --experimental-webstorage --localstorage-file=/tmp/x.db --disable-warning=ExperimentalWarning scripts/check-steal.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { insertItem, queues } from "../src/state/queue";
import { bankItems, characters } from "../src/state/store";
import { hive, planSteal, rebalanceWave, type HiveRun, type HiveWaveState } from "../src/state/hive";
import type { HiveCtx } from "../src/plan/hive";
import type { Character } from "../src/types/api";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();

// Victim A: gathered 48 ash + 2 copper in 6600 s (132 s/unit, slow lane) — 16 copper left.
const ids = ["hive:1:1:A:0", "hive:1:1:A:1", "hive:1:1:A:2"];
const wave = {
  label: "Produce",
  assignments: [{
    character: "A", label: "A", dispatched: true, at: Date.now() - 6600_000, itemIds: ids,
    items: [
      { kind: "gather", code: "ash_wood", resource: "ash_tree", times: 48, done: 0 },
      { kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 18, done: 0 },
      { kind: "deposit-all" },
    ],
  }],
} as unknown as HiveWaveState;
queues.value = {
  A: { running: true, items: [{ id: ids[1], kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 18, done: 2 }, { id: ids[2], kind: "deposit-all" }] },
  B: { running: false, items: [] },
} as unknown as typeof queues.value;
const thief = { name: "B", mining_level: 5 } as unknown as Character;
const ctx = {} as HiveCtx; // only fight steals read ctx (fleetBis)

const fails: string[] = [];
const s = planSteal(wave, ctx, thief);
// 8 units × 132 s = 1056 s ≥ 360 s — the old unit count (8 < 12) refused this.
if (s?.victim !== "A" || (s.items[0] as { times: number }).times !== 8) fails.push(`slow lane: want an 8-unit steal, got ${JSON.stringify(s)}`);
delete wave.assignments[0].at; // no dispatch time (pre-pace assignment) → nominal 30 s: 240 s < 360 s
if (planSteal(wave, ctx, thief)) fails.push("no pace: want no steal");

// Waiting crafter C: its queue head is a `wait` craft of copper bars that bag + bank can't feed —
// it steals from A's lane AHEAD of the craft, and never gets a filler.
wave.assignments[0].at = Date.now() - 6600_000;
const cid = "hive:1:1:C:0";
wave.assignments.push({ character: "C", label: "C", dispatched: true, itemIds: [cid], items: [{ kind: "craft", code: "copper_bar", quantity: 5, done: 0, wait: true }] } as HiveWaveState["assignments"][number]);
queues.value = { A: queues.value.A, C: { running: true, items: [{ id: cid, kind: "craft", code: "copper_bar", quantity: 5, done: 0, wait: true }] } } as unknown as typeof queues.value;
characters.value = { A: { name: "A", mining_level: 5, inventory: [] }, C: { name: "C", mining_level: 5, inventory: [] } } as unknown as typeof characters.value;
bankItems.value = [];
hive.value = { ...hive.value, manual: [], run: { status: "verifying", wave } as unknown as HiveRun }; // not "running": no tick/dispatch
rebalanceWave(hive.value.run!);
const added = hive.value.run!.wave!.assignments.filter((a) => a.character === "C" && a.ns);
if (added.length !== 1 || !added[0].front || added[0].filler || added[0].items[0].kind !== "gather")
  fails.push(`waiter: want one front gather slice, got ${JSON.stringify(added)}`);
insertItem("C", { id: "x", kind: "deposit-all" } as never, 0); // hive-only insert goes ahead of the running head
if (queues.value.C.items[0].id !== "x") fails.push("insertItem: want the new item at the head");
for (const f of fails) console.log(`FAIL ${f}`);
console.log(fails.length ? `${fails.length} failure(s)` : "ok");
process.exit(fails.length ? 1 : 0); // the store's clock/effects keep the loop alive
