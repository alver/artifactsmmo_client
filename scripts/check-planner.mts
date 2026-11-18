// Self-check of the planner's core (src/plan/planner/, task 007) on the saved fleet. Offline, no storage.
//   npm run check                 — roles, unhandled objectives, the first step of each character, the first week
//                                   played forward with every invariant on every decision, three made-up worlds
//   npm run check -- planner      — the same, plus the replay to the deadline for three prices of gear crafting
// Inputs: public/data/* (catalog, atlas); the characters, achievements and server time of docs/design/snapshot/
// (2026-11-18); the bank of scripts/fixtures/roadmap-fleet.json (2026-11-17).
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { atlas } from "../src/catalog/atlas";
import { ownedFightRec } from "../src/plan/jobgear";
import { itemsOf } from "../src/plan/planner/compile";
import { DEFAULTS, GATHER_LANES, TRAIN_LANES } from "../src/plan/planner/config";
import { levelOf } from "../src/plan/planner/cost";
import { decide, met, rank } from "../src/plan/planner/decide";
import { forward, pointsOf, waitingOf } from "../src/plan/planner/forward";
import { gearSig, memoSizes, nearestSpot, placeOf, travel } from "../src/plan/planner/reach";
import { rolesOf } from "../src/plan/planner/roles";
import { targetsOf, unhandledOf } from "../src/plan/planner/targets";
import { item, resource as resourceOf, tileAt } from "../src/catalog";
import type { ActiveEvent, AccountAchievement, BankItem, Character } from "../src/types/api";
import type { GameMap } from "../src/types/catalog";
import type { PlannerConfig, Step, World } from "../src/plan/planner/types";

const T0 = performance.now();
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
if (!atlas()) { console.log("no public/data/atlas.json — run npm run atlas"); process.exit(1); }
const VERBOSE = process.env.AMMO_CHECK_VERBOSE === "1" || process.argv.includes("-v");
const snap = async (n: string): Promise<any> => JSON.parse(await readFile(`docs/design/snapshot/${n}.json`, "utf8")).data;
const chars = (await snap("characters")) as Character[];
const achievements = (await snap("achievements")) as AccountAchievement[];
const status = await snap("status");
const fx = JSON.parse(await readFile("scripts/fixtures/roadmap-fleet.json", "utf8")) as { bankItems: BankItem[] };
const eventsData = JSON.parse(await readFile("public/data/events.json", "utf8")) as { code: string; name: string; maps: { x: number; y: number; layer: string }[] }[];

const NOW = Date.parse(status.server_time); // 2026-11-18 13:34 UTC, the snapshot's status read
const BANK_GOLD = 155_976; // docs/design/snapshot/leaderboard-accounts.json, account "alverus" (2026-11-18); bank gold is in no public read
const base: World = { now: NOW, characters: chars, bank: fx.bankItems, bankGold: BANK_GOLD, achievements, events: [], current: {}, costs: {}, blocked: {}, config: DEFAULTS };
const NAMES = chars.map((c) => c.name);
const DAY = 864e5;
const day = (t: number): string => ((t - NOW) / DAY).toFixed(1);
const f1 = (x: number): string => (x < 10 ? x.toFixed(1) : String(Math.round(x)));
const pad = (s: string | number, n: number): string => String(s).padEnd(n);

// ── invariants ───────────────────────────────────────────────────────────────
const INV = [
  "1 a step for every free character",
  "2 no place without a free route",
  "3 every kill a safe win (ownedFightRec)",
  "4 every skill and level gate met",
  "5 no more units than the objective has left",
  "6 filler / fallback only when nothing else scores",
  "7 at most four items, none infinite, ids pl:",
  "8 the same world gives the same step",
  "9 no blocked pair before its until",
  "10 points never fall, clocks move",
] as const;
const inv = new Map<string, { n: number; fails: number; bad: string[] }>(INV.map((k) => [k, { n: 0, fails: 0, bad: [] }]));
const check = (k: (typeof INV)[number], ok: boolean, detail: () => string): void => {
  const r = inv.get(k)!;
  r.n++;
  if (!ok) { r.fails++; if (r.bad.length < 5) r.bad.push(detail()); }
};
const safeMemo = new Map<string, boolean>();
const safeDirect = (ch: Character, w: World, monster: string): boolean => {
  const k = `${gearSig(w.bank)}|${ch.name}|${ch.level}|${ch.max_hp}|${monster}`;
  let s = safeMemo.get(k);
  if (s == null) safeMemo.set(k, (s = !!ownedFightRec(ch, w.bank, monster)?.safe));
  return s;
};
const infinite = (it: any): boolean =>
  ((it.kind === "fight" || it.kind === "gather" || it.kind === "task-loop") && !(it.times > 0)) || (it.kind === "craft" && !(it.quantity > 0)) || (it.kind === "train" && !(it.toLevel > 0) && !(it.levels > 0));

function verify(w: World, step: Step, run: { points: number }): void {
  const ch = w.characters.find((c) => c.name === step.character)!;
  const tag = (): string => `${step.key} on day ${day(w.now)}`;
  check(INV[0], !!step && step.character === ch.name && step.units >= 1, tag);
  const here = placeOf(ch);
  const contentOf = (x: Step["work"]): [string, string] | undefined => (x.kind === "kill" ? ["monster", x.monster] : x.kind === "gather" ? ["resource", x.resource] : undefined);
  const srcOk = (step.sources ?? []).every((s) => { const c = contentOf(s.work); return !c || !!nearestSpot(here, c[0], c[1], w); });
  check(INV[1], (!step.place || travel(here, step.place) != null) && srcOk, tag);
  const kills = [step.work, ...(step.sources ?? []).map((s) => s.work)].filter((x) => x.kind === "kill") as { monster: string }[];
  for (const k of kills) check(INV[2], safeDirect(ch, w, k.monster), () => `${tag()}: ${k.monster}`);
  const t = targetsOf(w).find((x) => x.key === step.target);
  const workOk = (x: Step["work"]): boolean => {
    if (x.kind === "gather") { const r = resourceOf(x.resource); return !!r && levelOf(ch, r.skill as any) >= r.level; }
    if (x.kind === "craft") { const r = item(x.code)?.craft; return !!r && levelOf(ch, r.skill as any) >= r.level; }
    if (x.kind === "train") return TRAIN_LANES.includes(x.lane);
    return true;
  };
  const gatesOk = !t || step.as === "level" || step.as === "fallback" || (t.gates.every((g) => met(g, ch, w)) && (t.inputs ?? []).every((i) => !(step.sources ?? []).some((s) => s.code === i.code) || i.gates.every((g) => met(g, ch, w))));
  check(INV[3], gatesOk && workOk(step.work) && (step.sources ?? []).every((s) => workOk(s.work)), tag);
  if ((step.as === "objective" || step.as === "filler") && t) {
    const others = Object.entries(w.current).reduce((s, [n, x]) => s + (n !== ch.name && x && x.target === t.key && (x.as === "objective" || x.as === "filler") ? x.units : 0), 0);
    check(INV[4], step.units <= t.left - others, () => `${tag()}: ${step.units} of ${t.left - others}`);
  }
  const r = rank(ch.name, w);
  const real = [...r.objectives, ...r.levels].some((c) => c.any > 0);
  check(INV[5], step.as === "filler" ? !real : step.as === "fallback" ? !real && !r.fillers.some((c) => c.any > 0) : true, tag);
  const items = itemsOf(step, ch);
  check(INV[6], items.length >= 1 && items.length <= 4 && items.every((it) => it.id.startsWith("pl:") && !infinite(it)), () => `${tag()}: ${JSON.stringify(items)}`);
  check(INV[7], JSON.stringify(r.step) === JSON.stringify(step), tag);
  check(INV[8], (w.blocked[`${step.target}@${ch.name}`]?.until ?? 0) <= w.now, tag);
  const p = pointsOf(w);
  check(INV[9], p >= run.points && step.hours > 0, () => `${tag()}: ${run.points} → ${p}, ${step.hours} h`);
  run.points = p;
}

const playOut = (w: World, until: number) => {
  const run = { points: pointsOf(w) };
  return forward(w, until, (x, s) => verify(x, s, run));
};

// ── roles, unhandled ─────────────────────────────────────────────────────────
const roles = rolesOf(chars, DEFAULTS, targetsOf(base));
const DESIGN_ROLES: Record<string, string> = { First: "combat, cooking, fishing", Second: "combat, weaponcrafting, woodcutting", Third: "combat, gearcrafting, alchemy", Fourth: "combat, jewelrycrafting (+ mining?)", Fifth: "combat, mining" };
console.log("## Roles (computed | design B.3)");
for (const n of NAMES) console.log(`  ${pad(n, 7)} ${pad(roles[n].join(", "), 52)} | ${DESIGN_ROLES[n]}`);
const unh = unhandledOf(base);
console.log(`\n## Unhandled objectives (${unh.length}, ${[...new Set(unh.map((u) => u.achievement))].length} achievements)`);
for (const u of unh) console.log(`  ${pad(u.key, 34)} ${u.why}`);
const overlap = chars.flatMap((c) => (c.inventory ?? []).filter((s) => s.code && fx.bankItems.some((b) => b.code === s.code)).map((s) => `${c.name}:${s.code}`));
console.log(`\nIn a snapshot bag and in the fixture bank (bags 11-18 and bank 11-17 both taken as they are): ${overlap.join(", ") || "none"}`);

// ── the first steps and the first week ───────────────────────────────────────
let t = performance.now();
const cold = decide("First", base);
const decideCold = performance.now() - t;
t = performance.now();
for (let i = 0; i < 20; i++) decide("First", base);
const decideWarm = (performance.now() - t) / 20;
t = performance.now();
const week = playOut(base, NOW + 7 * DAY);
const weekMs = performance.now() - t;
console.log(`\n## The first step of each character (decide: ${decideCold.toFixed(0)} ms cold, ${decideWarm.toFixed(1)} ms warm)`);
for (const n of NAMES) {
  const s = week.played.find((p) => p.step.character === n)!.step;
  const ch = chars.find((c) => c.name === n)!;
  console.log(`  ${n}: ${s.why}\n     score ${s.score.toPrecision(3)} · ${f1(s.hours)} h · items: ${itemsOf(s, ch).map((it) => JSON.stringify({ ...it, id: undefined })).join(" ")}`);
}
void cold;

function stepsTable(played: { at: number; step: Step }[], name: string): string[] {
  const out: string[] = [];
  for (const p of played.filter((x) => x.step.character === name)) {
    const s = p.step;
    const tgt = s.as === "level" ? `${s.target} (${s.work.kind === "kill" ? s.work.monster : s.work.kind === "gather" ? s.work.resource : "train"})` : s.target;
    const prev = out.length ? out[out.length - 1] : "";
    const m = prev.match(/^(.*) ×(\d+): (\d+) units, ([\d.]+) h \(from day ([\d.]+)\)$/);
    if (m && m[1] === tgt) out[out.length - 1] = `${tgt} ×${+m[2] + 1}: ${+m[3] + s.units} units, ${(+m[4] + s.hours).toFixed(1)} h (from day ${m[5]})`;
    else out.push(`${tgt} ×1: ${s.units} units, ${s.hours.toFixed(1)} h (from day ${day(p.at)})`);
  }
  return out;
}
console.log(`\n## The first week (${(weekMs / 1000).toFixed(1)} s, ${week.played.length} decisions)`);
for (const n of NAMES) {
  console.log(`  ${n} — lanes ${rolesOf(week.world.characters, DEFAULTS, targetsOf(week.world))[n].join(", ")}`);
  for (const l of stepsTable(week.played, n)) console.log(`     ${l}`);
}
console.log(`  completed: ${week.completed.map((c) => `${c.code} +${c.points} (day ${day(c.at)})`).join(", ") || "none"}`);
console.log(`  points ${pointsOf(base)} → ${pointsOf(week.world)}; levels: ${week.world.characters.map((c) => `${c.name} ${c.level} (${GATHER_LANES.map((l) => `${l.slice(0, 2)} ${levelOf(c, l)}`).join(" ")})`).join(" · ")}`);

// ── three made-up worlds ─────────────────────────────────────────────────────
const cases: [string, boolean][] = [];
const only = (codes: string[]): AccountAchievement[] => base.achievements.map((a) => (codes.includes(a.code) ? a : { ...a, completed_at: a.completed_at ?? "2026-11-01T00:00:00Z" }));
{
  const blocked: World["blocked"] = {};
  for (const tg of targetsOf(base)) for (const n of NAMES) blocked[`${tg.key}@${n}`] = { until: NOW + DAY, why: "made up" };
  const w = { ...base, blocked };
  const s = decide("First", w);
  verify(w, s, { points: 0 });
  cases.push(["everything blocked → the fallback gather", s.as === "fallback" && s.work.kind === "gather"]);
  console.log(`\n## Made-up worlds\n  everything blocked: ${s.why}`);
}
{
  const w: World = { ...base, characters: [{ ...chars[0], level: 45 }], achievements: only(["lich_please"]) };
  const r = playOut(w, NOW + DAY);
  const waits = waitingOf(w).find((x) => x.achievement === "lich_please")?.waits;
  cases.push(["the lich (behind a key) is never a step", r.played.length > 0 && !r.played.some((p) => p.step.target.startsWith("ach:lich_please"))]);
  cases.push(["…and waits for another layer", waits === "another layer"]);
  console.log(`  the lich only: ${r.played.length} steps in a day, none on it (${r.played[0]?.step.why}); waits for: ${waits}`);
}
{
  const miner = { ...chars.find((c) => c.name === "Fifth")!, mining_level: 35, mining_xp: 0 };
  const ev = eventsData.find((e) => e.code === "strange_apparition")!;
  const tile = ev.maps.map((m) => tileAt(m.x, m.y, m.layer)).find((m): m is GameMap => !!m && travel(placeOf(miner), { x: m.x, y: m.y, layer: m.layer }) != null)!;
  const live: ActiveEvent = { name: ev.name, code: ev.code, map: { ...tile, interactions: { content: { type: "resource", code: "strange_rocks" }, transition: null } }, previous_map: tile, duration: 60, expiration: new Date(NOW + 50 * 60e3).toISOString(), created_at: new Date(NOW - 10 * 60e3).toISOString() };
  const w0: World = { ...base, characters: [miner], achievements: only(["strange_miner", "expert_miner", "professional_miner"]), events: [live] };
  const a = decide("Fifth", w0);
  verify(w0, a, { points: 0 });
  const w1 = { ...w0, now: NOW + 51 * 60e3 };
  const b = decide("Fifth", w1);
  verify(w1, b, { points: 0 });
  const node = (s: Step): string => (s.work.kind === "gather" ? s.work.resource : s.work.kind);
  cases.push(["a miner at 35, Strange Apparition live → the event node", node(a) === "strange_rocks" && !!a.until && a.until <= Date.parse(live.expiration)]);
  cases.push(["…the event expired → the gold rocks", node(b) === "gold_rocks"]);
  console.log(`  miner at 35, event live at (${tile.x}, ${tile.y}): ${a.why}\n  event expired: ${b.why}`);
}

// ── the replay to the deadline ───────────────────────────────────────────────
const DEADLINE = Date.parse(DEFAULTS.deadline);
const rows: { label: string; craftK: number }[] = [{ label: "the atlas as it is", craftK: 1 }, { label: "gear crafting × 0.25", craftK: 0.25 }, { label: "gear crafting × 0.1 (default)", craftK: 0.1 }];
const results: Record<string, number> = {};
if (VERBOSE) {
  for (const row of rows) {
    const config: PlannerConfig = { ...DEFAULTS, craftK: row.craftK };
    t = performance.now();
    const r = playOut({ ...base, config }, DEADLINE);
    const sec = (performance.now() - t) / 1000;
    const pts = (d: number): number => pointsOf(base) + r.completed.filter((c) => c.at <= NOW + d * DAY).reduce((s, c) => s + c.points, 0);
    results[row.label] = pointsOf(r.world);
    console.log(`\n## Replay: ${row.label} (${sec.toFixed(1)} s, ${r.played.length} decisions)`);
    console.log(`  points: day 7 ${pts(7)} · day 14 ${pts(14)} · day 30 ${pts(30)} · day 60 ${pts(60)} · deadline ${pointsOf(r.world)}`);
    console.log(`  completed: ${r.completed.map((c) => `${c.code} +${c.points} (${day(c.at)})`).join(", ")}`);
    const hours = new Map<string, number>();
    let total = 0;
    for (const p of r.played) {
      const k = p.step.as === "level" ? `level ${p.step.target.split(":")[1]}` : p.step.as;
      hours.set(k, (hours.get(k) ?? 0) + p.step.hours);
      total += p.step.hours;
    }
    console.log(`  character-hours: ${[...hours].sort((a, b) => b[1] - a[1]).map(([k, h]) => `${k} ${((100 * h) / total).toFixed(0)}%`).join(" · ")}`);
    const lanesEnd = rolesOf(r.world.characters, config, targetsOf(r.world));
    for (const c of r.world.characters) console.log(`  ${pad(c.name, 7)} ${lanesEnd[c.name].map((l) => `${l} ${levelOf(c, l)}`).join(", ")}`);
    const groups = new Map<string, { pts: number; codes: string[] }>();
    for (const x of waitingOf(r.world)) { const g = groups.get(x.waits) ?? { pts: 0, codes: [] }; g.pts += x.points; g.codes.push(x.achievement); groups.set(x.waits, g); }
    console.log(`  open at the deadline:`);
    for (const [k, g] of [...groups].sort((a, b) => b[1].pts - a[1].pts)) console.log(`     ${pad(k, 34)} ${pad(g.pts, 4)} ${g.codes.join(", ")}`);
    if (row.craftK === 0.1) {
      for (const n of NAMES) {
        const lines = stepsTable(r.played, n);
        console.log(`  ${n}: ${lines.length} runs of steps; the first 12:`);
        for (const l of lines.slice(0, 12)) console.log(`     ${l}`);
      }
    }
  }
  t = performance.now();
  forward({ ...base }, DEADLINE);
  console.log(`\nA full forward run, warm: ${((performance.now() - t) / 1000).toFixed(1)} s. Memo: ${JSON.stringify(memoSizes())}`);
}

// ── verdict ──────────────────────────────────────────────────────────────────
console.log("\n## Invariants");
let bad = 0, n = 0;
for (const [k, r] of inv) {
  n += r.n;
  console.log(`  ${r.fails ? "FAIL" : "ok  "} ${pad(k, 48)} ${r.n} checks${r.fails ? `, ${r.fails} failed: ${r.bad.join(" | ")}` : ""}`);
  if (r.fails || !r.n) bad++;
}
for (const [why, ok] of cases) { n++; if (!ok) { bad++; console.log(`MISMATCH ${why}`); } }
console.log(`\n${((performance.now() - T0) / 1000).toFixed(1)} s in all`);
console.log(bad ? "FAILED" : `OK (${n} invariant checks, ${cases.length} made-up cases${VERBOSE ? `; deadline points ${Object.values(results).join(" / ")}` : ""})`);
process.exit(bad ? 1 : 0);
