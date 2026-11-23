// Task 023, settled points 2 (c) and (d), on the recorded case: the bandit camp trip of 06:00 UTC on 11-22.
// scripts/fixtures/world-2026-11-22-0600.json holds the planner's World at the two polls that sent Third (06:00:05) and Second
// (06:02:07), rebuilt from logs/world/2026-11-22.json (00:00 UTC) with the raw log's bank moves and (un)equips, the journal's
// level-ups and step records, Third's bag (96 Minor Health Potion from its running potion step at 06:00; at 06:02 the gear
// its trip's reset had taken off and not banked yet) and the spawn; the journal's two lines beside them (7524933's core on
// the rebuilt Worlds gives the second line word for word, the first with 46 kills for 44).
// (c) one stock: a member's take names every consumable its set's forecast uses, holds no more of one than the stock its
//     take may draw (the bank and its own bag), and the kills its line states are what the take pays for (MARGIN kept).
// (d) no piece booked twice: at the second poll, Third on its trip with its reset still to run — no set names more copies of
//     a piece than the bank and the members hold (the one Tromatising Mask), no take more of a potion than is left.
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { MARGIN } from "../src/plan/planner/config";
import { eventPlans } from "../src/plan/planner/events";
import { ownedQtyOf } from "../src/plan/jobgear";
import type { EventPlan } from "../src/plan/planner/events";
import type { World } from "../src/plan/planner/types";

setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
const VERBOSE = process.env.AMMO_CHECK_VERBOSE === "1";
const fx = JSON.parse(await readFile("scripts/fixtures/world-2026-11-22-0600.json", "utf8")) as { worlds: World[]; journal: string[] };
const [w1, w2] = fx.worlds;
let failed = 0;
const fail = (what: string): void => { failed++; console.log(`FAIL ${what}`); };
const bankOf = (w: World, c: string): number => w.bank.reduce((t, b) => t + (b.code === c ? b.quantity : 0), 0);
const heldOf = (w: World, name: string): Map<string, number> => ownedQtyOf(w.characters.find((c) => c.name === name)!, []);

/** (c) for every member chosen at this poll (on the trip already: its take is the trip's). */
function oneStock(p: EventPlan, w: World, when: string): void {
  for (const m of p.members) {
    if (!m.perKill) continue;
    for (const [c, u] of Object.entries(m.perKill)) {
      const q = m.take?.[c] ?? 0;
      if (u > 0 && !q) fail(`${when}: ${m.name}'s set drinks ${u.toFixed(1)} ${c} a kill, its take has none (${JSON.stringify(m.take)})`);
      const stock = bankOf(w, c) + (heldOf(w, m.name).get(c) ?? 0);
      if (q > stock) fail(`${when}: ${m.name}'s take of ${c} is ${q}, the bank and its bag hold ${stock}`);
      const pays = Math.floor(q / (u * MARGIN) + 1e-9);
      if ((m.actions ?? 0) > pays + 1e-9) fail(`${when}: ${m.name} is counted for ${(m.actions ?? 0).toFixed(1)} kills, its ${q} ${c} pay for ${pays}`);
    }
  }
}

const p1 = eventPlans(w1.events, w1, {})[0];
if (VERBOSE) console.log(`06:00:05 — ${p1.line}\n  journal: ${fx.journal[0]}`);
const third = p1.members.find((m) => m.name === "Third");
if (!third) fail(`06:00:05: Third is no member — ${p1.line}`);
oneStock(p1, w1, "06:00:05");

// 06:02:07: Third on the trip, its reset still to run (it withdrew its set and its take at 06:02:30)
const p2 = eventPlans(w2.events, w2, { Third: p1.key }, { Third: { wear: third?.set, take: third?.take, reset: true } })[0];
if (VERBOSE) console.log(`06:02:07 — ${p2.line}\n  journal: ${fx.journal[1]}`);
const sets = [third?.set ?? {}, ...p2.members.filter((m) => m.name !== "Third").map((m) => m.set ?? {})];
const names = ["Third", ...p2.members.filter((m) => m.name !== "Third").map((m) => m.name)];
const want = new Map<string, number>();
for (const s of sets) for (const c of Object.values(s)) want.set(c, (want.get(c) ?? 0) + 1);
for (const [c, n] of want) {
  const have = bankOf(w2, c) + names.reduce((t, name) => t + (heldOf(w2, name).get(c) ?? 0), 0);
  if (n > have) fail(`06:02:07: ${n} sets name ${c}, the bank and the members hold ${have}`);
}
const takes = [third?.take ?? {}, ...p2.members.filter((m) => m.name !== "Third").map((m) => m.take ?? {})];
for (const c of new Set(takes.flatMap((t) => Object.keys(t)))) {
  const n = takes.reduce((t, x) => t + (x[c] ?? 0), 0), have = bankOf(w2, c) + names.reduce((t, name) => t + (heldOf(w2, name).get(c) ?? 0), 0);
  if (n > have) fail(`06:02:07: the takes hold ${n} ${c}, the bank and the members ${have}`);
}
oneStock({ ...p2, members: p2.members.filter((m) => m.name !== "Third") }, w2, "06:02:07");
const onTrip = p2.members.find((m) => m.name === "Third");
if (!/on the trip, ≈\d+ kills left/.test(onTrip?.why ?? "")) fail(`06:02:07: Third is not counted on its trip — ${p2.line}`);
else if (third?.take && (onTrip?.actions ?? 0) > (third.actions ?? 0) + 1e-9) fail(`06:02:07: Third on its trip is counted for ${onTrip?.actions}, its take paid for ${third.actions}`);

console.log(`06:00:05 — ${p1.members.map((m) => `${m.name} (${m.why})`).join(", ")}`);
console.log(`06:02:07 — ${p2.members.map((m) => `${m.name} (${m.why})`).join(", ")}; not: ${p2.others.map((o) => `${o.name} — ${o.why}`).join(", ")}`);
console.log(failed ? `FAILED (${failed})` : "OK");
process.exit(failed ? 1 : 0);
