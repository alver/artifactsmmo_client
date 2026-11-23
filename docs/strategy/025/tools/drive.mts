// Task 025: docs/strategy/022/tools/drive.mts (022 is kept as it is) with the fight round's stats added to its "stats" line —
// `fights` (attempts: a kill step's kills ÷ its verdict's p) and `losses` (kills × (1 − p) ÷ p, the forward model's expected
// losses), `runes` (each healing rune the road buys: who, when — consumables.ts runePays/runeBought inside forward()) and
// `runeGold`, `food` (the food drunk, apart from the potions). The hooks only read.
// drive.mts --tree <dir> --world <file> [--days N] [--cfg '<json>'] [--dec <decisions.jsonl>]
// road() of the tree, line for line as scripts/outlook.mts --json prints them, then one "stats" line: per-midnight levels,
// hours by answer, potions drunk, kills, completions, what waits at the end, seconds, solves.
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
(globalThis as any).localStorage ??= { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 };
(globalThis as any).fetch = () => Promise.reject(new Error("no request"));
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const tree = arg("tree")!;
process.chdir(tree);
const imp = (p: string) => import(pathToFileURL(`${tree}/${p}`).href);
const { setDataReader } = await imp("src/catalog/load.ts");
const { loadCatalog } = await imp("src/catalog/index.ts");
const { bankPlus, forward, pointsOf, waitingOf, drinksOf, finish } = await imp("src/plan/planner/forward.ts");
const { isOn } = await imp("src/plan/planner/gates.ts");
const { perOf } = await imp("src/plan/planner/cost.ts");
const { solveCounts, fightRec } = await imp("src/plan/planner/reach.ts");
const { consFree } = await imp("src/plan/planner/consumables.ts");
const { itemsOf } = await imp("src/plan/planner/compile.ts");
const { queueItemText } = await imp("src/plan/queue.ts");
setDataReader(async (name: string) => JSON.parse(readFileSync(`${tree}/public/data/${name}.json`, "utf8")));
await loadCatalog();

const snap = JSON.parse(readFileSync(arg("world")!, "utf8"));
const live = snap.world;
const cfg = arg("cfg") ? JSON.parse(arg("cfg")!) : {};
live.config = { ...live.config, ...cfg };
const until = arg("days") ? live.now + Number(arg("days")) * 864e5 : Date.parse(live.config.deadline);
const dec = arg("dec");
if (dec) writeFileSync(dec, "");
const out = (l: unknown) => console.log(JSON.stringify(l));

// ---- road.ts, copied (the same lines), with the hooks ----
const DAY = 864e5;
const t0 = performance.now();
const leftOf = (r: any) => { const s = r.step; const done = (s.work.kind === "kill" || s.work.kind === "gather") && s.as !== "supply" ? r.units / perOf(s.work) : r.units; const units = Math.max(0, s.units - done); return { ...s, units, hours: s.units > 0 ? (s.hours * units) / s.units : 0 }; };
const textOf = (step: any, w: any): string => { const ch = w.characters.find((c: any) => c.name === step.character); try { const items = ch ? itemsOf(step, ch).filter((it: any) => it.kind !== "deposit-all") : []; const it = step.work.kind === "recycle" ? items[0] : items[items.length - 1]; return it ? queueItemText(it) : step.target; } catch { return step.target; } };
const world = { ...live, bank: bankPlus(live.bank, new Map(Object.entries(live.bags ?? {}))), bags: undefined, bankSlots: undefined, nextExpansion: undefined };
const names: string[] = world.characters.map((c: any) => c.name);
const on = names.filter((n) => isOn(n, world));
out({ k: "waiting", from: world.now, waiting: waitingOf(world) });
const seed: Record<string, any> = {};
for (const [n, r] of Object.entries(snap.planner?.current ?? {}) as [string, any][]) if (r && !r.over && names.includes(n)) seed[n] = leftOf(r);
const next: Record<string, any[]> = Object.fromEntries(names.map((n) => [n, []]));
let sent = false;
const sendNext = () => { sent = true; out({ k: "next", from: world.now, next }); };
const first = Math.floor(world.now / DAY) * DAY + DAY;
const of = until >= first ? Math.floor((until - first) / DAY) + 1 : 0;
let midnight = first, day = 0, pts = pointsOf(world);
const byDay: { day: string; points: number }[] = [];
// stats
const SK = ["level", "mining_level", "woodcutting_level", "fishing_level", "weaponcrafting_level", "gearcrafting_level", "jewelrycrafting_level", "cooking_level", "alchemy_level"];
const levels: { n: number; day: string; at: Record<string, number[]> }[] = [];
let wNow: any = world;
const snapLv = (w: any, n: number) => levels.push({ n, day: new Date(midnight - DAY).toISOString().slice(0, 10), at: Object.fromEntries(w.characters.map((c: any) => [c.name, SK.map((k) => c[k] ?? 0)])) });
const pass = (t: number, upTo: boolean) => { for (; upTo ? midnight <= t : midnight < t; midnight += DAY) { byDay.push({ day: new Date(midnight - DAY).toISOString().slice(0, 10), points: pts }); emitDay(); } };
const emitDay = () => { day++; snapLv(wNow, day); out({ k: "day", at: midnight, n: day, of, points: pts }); };
const H: Record<string, number> = {}; // "<bucket>" → character-hours
const HW: Record<string, Record<string, number>> = {}; // by who
const addH = (b: string, h: number, who: string) => { if (!(h > 0)) return; H[b] = (H[b] ?? 0) + h; (HW[who] ??= {})[b] = (HW[who][b] ?? 0) + h; };
const kind: Record<string, number> = {}; // work kind hours: fight, gather, make, task, event, offering
const addK = (k: string, h: number) => { if (h > 0) kind[k] = (kind[k] ?? 0) + h; };
const drunk: Record<string, number> = {};
const freeUse: Record<string, number> = {}; // consumables free (row B): what the kill steps' planned sets drink, by the decision's own solve
const kills: Record<string, number> = {};
let killSteps = 0, evActs: Record<string, number> = {};
let fights = 0, losses = 0; // task 025
const runes: { who: string; at: string }[] = [];
const hadRune = new Set<string>((live.characters as any[]).filter((c) => c.rune_slot === "healing_rune").map((c) => c.name));
const bucket = (s: any): string => {
  if (s.as === "level") return `level:${s.target.split(":")[1]}`;
  if (s.as === "supply") {
    if (s.target.startsWith("gear:")) return "supply:gear craft";
    const p: string = s.parent ?? "";
    if (p.startsWith("cons:")) return `supply:consumables:${p.split(":")[1]}`;
    if (p.startsWith("gear:")) return "supply:gear materials";
    if (p.startsWith("ach:")) return "supply:objective materials";
    return `supply:other`;
  }
  return s.as;
};
const workKind = (w: any): string => (w.kind === "kill" ? "fight" : w.kind === "gather" ? "gather" : w.kind === "task" ? "task" : "make");
const onEnd = (w: any, s: any, before: any) => {
  const who = s.character;
  if (String(s.key).startsWith("event:")) {
    const a = s.units; evActs[`${s.work.kind}:${s.target.slice(6)}`] = (evActs[`${s.work.kind}:${s.target.slice(6)}`] ?? 0) + a;
    if (s.work.kind === "kill") kills[s.work.monster] = (kills[s.work.monster] ?? 0) + a;
  } else {
    const start = before.clock?.[who] ?? before.now, end = w.clock[who];
    const base = finish(start, s.hours, before).end;
    const offH = (base - start) / 3.6e6 - s.hours, evH = Math.max(0, (end - base) / 3.6e6);
    addH(bucket(s), s.hours, who); addH("offering", offH, who); addH("event", evH, who);
    addK(workKind(s.work), s.hours); addK("offering", offH); addK("event", evH);
    if (s.work.kind === "kill") { killSteps++; const n = s.as === "supply" ? s.units : s.units * perOf(s.work); kills[s.work.monster] = (kills[s.work.monster] ?? 0) + n; const p = s.fight?.p; if (p > 0) { fights += n / p; losses += (n * (1 - p)) / p; } else fights += n; }
    for (const x of s.sources ?? []) if (x.work.kind === "kill") kills[x.work.monster] = (kills[x.work.monster] ?? 0) + x.times;
  }
  for (const [c, q] of drinksOf(before, s)) drunk[c] = (drunk[c] ?? 0) + q;
};
const r = forward(world, until, (w: any, step: any) => {
  wNow = w;
  for (const c of w.characters) if (c.rune_slot === "healing_rune" && !hadRune.has(c.name)) { hadRune.add(c.name); runes.push({ who: c.name, at: new Date(w.now).toISOString() }); }
  pass(w.now, false);
  pts = pointsOf(w);
  if (consFree(w)) {
    const ch = w.characters.find((c: any) => c.name === step.character);
    const ks: [string, number][] = [];
    if (step.work.kind === "kill") ks.push([step.work.monster, step.as === "supply" ? step.units : step.units * perOf(step.work)]);
    for (const x of step.sources ?? []) if (x.work.kind === "kill") ks.push([x.work.monster, x.times]);
    for (const [m, n] of ks) for (const [c, u] of Object.entries(fightRec(ch, w, m)?.forecast.used ?? {}) as [string, number][]) freeUse[c] = (freeUse[c] ?? 0) + u * n;
  }
  if (dec) appendFileSync(dec, JSON.stringify({ at: w.now, who: step.character, key: step.key, as: step.as, units: step.units, h: +step.hours.toFixed(3), why: step.why, wear: step.wear }) + "\n");
  const mine = next[step.character];
  if (sent || !mine || mine.length >= 3) return;
  mine.push({ key: step.key, as: step.as, text: textOf(step, w), why: step.why, hours: step.hours, at: w.now });
  if (on.every((n) => next[n].length >= 3)) sendNext();
}, onEnd, seed, false);
wNow = r.world;
pts = pointsOf(r.world);
pass(until, true);
if (!sent) sendNext();
const sec = Math.round((performance.now() - t0) / 100) / 10;
out({ k: "done", from: world.now, until, points: pointsOf(world), expected: pts, completed: r.completed, byDay, sec, steps: r.steps });
const endWait = waitingOf({ ...r.world, now: until });
const { item: itemOf } = await imp("src/catalog/index.ts");
const food = Object.fromEntries(Object.entries(drunk).filter(([c]) => itemOf(c)?.type === "consumable"));
out({ k: "stats", cfg, fights: Math.round(fights), losses: Math.round(losses * 10) / 10, runes, runeGold: runes.length * 10000, food, levels, hours: H, byWho: HW, kind, drunk, kills, killSteps, evActs, freeUse, endWaiting: endWait, bankGold: r.world.bankGold, solves: solveCounts.solves, sec, mem: Math.round(process.resourceUsage().maxRSS / 1024) });
process.exit(0);
