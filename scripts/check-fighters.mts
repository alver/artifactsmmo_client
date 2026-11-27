// Task 033: a fighter fights for XP — the crafts' kills go back to the workers. Made-up worlds of the core (pure, no harness)
// from the live World of 00:00 UTC on 11-27 (scripts/fixtures/world-2026-11-27.json: First and Fifth at combat 31, both on a
// Spider task, 0 combat XP a kill; the Vampire their pick) under this tree's DEFAULTS, nothing running:
//   1. a training's src: kill of a monster that gives the fighter no XP, a worker on and admitted → the fighter's step is its
//      XP pick, a worker's step is the kill (TRAIN_HUNT off: 027g's rule);
//   2. the same with no worker admitted (each braked on the training's monsters) → the fighter's kill by rule (3), as 027g;
//   3. a coins need on a task of a no-XP monster → no fighter's step for it, a worker's candidate (A.2); the fighter's task on
//      its pick's monster → the coins ride on the pick (its step kills the pick's monster), no worker's candidate;
//   4. a Perfect Bow banked, the fighters' pick the Imp with it → a worker's kill step that would wear it (the Flying Snake's
//      wings, TRAIN_HUNT off on both trees) leaves it, and with that step running the fighter's next pick step wears it (A.3).
// On 05e15c4 cases 1, 3 and 4 fail; case 2 holds there too (027g's rule is unchanged). node --import tsx scripts/check-fighters.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog, monster } from "../src/catalog";
import { loadAtlas } from "../src/catalog/atlas";
import { DEFAULTS } from "../src/plan/planner/config";
import { rank } from "../src/plan/planner/decide";
import { pickMonster } from "../src/plan/planner/pick";
import { admitted } from "../src/plan/planner/reach";
import { fightXp } from "../src/plan/xp";
import type { Character } from "../src/types/api";
import type { Step, World } from "../src/plan/planner/types";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
await loadAtlas();

const fx = (JSON.parse(await readFile("scripts/fixtures/world-2026-11-27.json", "utf8")) as { world: World }).world;
const WORKERS = ["Second", "Third", "Fourth"];
function worldOf(o: { bank?: Record<string, number>; config?: Partial<World["config"]>; patch?: Record<string, Partial<Character>>; blocked?: World["blocked"]; current?: World["current"] } = {}): World {
  return {
    ...fx, current: o.current ?? {}, blocked: o.blocked ?? {},
    bank: [...fx.bank, ...Object.entries(o.bank ?? {}).map(([code, quantity]) => ({ code, quantity }))],
    characters: fx.characters.map((c) => ({ ...c, ...o.patch?.[c.name] }) as Character),
    config: { ...DEFAULTS, ...fx.config, on: { ...DEFAULTS.on, ...fx.config.on }, roles: DEFAULTS.roles, ...o.config } as World["config"],
  };
}
const ch = (w: World, n: string): Character => w.characters.find((c) => c.name === n)!;
const mon = (s: Step | undefined): string | undefined => (s?.work.kind === "kill" ? s.work.monster : undefined);
const said = (s: Step): string => `${s.reason?.rule} ${s.target}${mon(s) ? ` (${mon(s)})` : ""}${s.wear?.weapon ? ` in ${s.wear.weapon}` : ""}`;
const noXp = (w: World, n: string, m: string): boolean => { const M = monster(m)!; return fightXp(M.level, M.hp, M.type, ch(w, n).level) <= 0; };
const cases: [string, boolean, string][] = [];

// ── 1, 2 ──
{
  const w = worldOf();
  const r = rank("First", w), s = r.step;
  const kills = r.supply.filter((c) => c.train && c.step.work.kind === "kill" && noXp(w, "First", mon(c.step)!) && WORKERS.some((n) => admitted(ch(w, n), w, mon(c.step)!)));
  const keys = new Set(kills.map((c) => c.target.key));
  const theirs = WORKERS.map((n) => ({ n, s: rank(n, w).step })).filter(({ s: x }) => keys.has(x.target) && x.work.kind === "kill");
  cases.push(["1. a training's no-XP kill, a worker admitted → the fighter's XP pick, a worker's the kill", kills.length > 0 && s.reason?.rule === "xp-pick" && theirs.length > 0 && theirs.every(({ s: x }) => x.reason?.rule === "need"),
    `the training's kills ${[...keys].join(", ") || "none"}; First: ${said(s)}; ${theirs.map(({ n, s: x }) => `${n}: ${said(x)}`).join("; ") || "no worker's step"}`]);
  const until = w.now + 864e5;
  const blocked = Object.fromEntries(WORKERS.flatMap((n) => kills.map((c) => [`kill:${mon(c.step)}@${n}`, { until, why: "check" }])));
  const wb = worldOf({ blocked });
  const sb = rank("First", wb).step;
  const none = kills.every((c) => WORKERS.every((n) => !admitted(ch(wb, n), wb, mon(c.step)!)));
  cases.push(["2. …no worker admitted → the fighter's kill by rule (3), as 027g", none && keys.has(sb.target) && (sb.reason?.rule === "train-kill" || sb.reason?.rule === "need-kill"), `workers admitted: ${!none}; First: ${said(sb)}`]);
}

// ── 3 ──
{
  const w = worldOf();
  const r = rank("First", w);
  const coin = r.supply.find((c) => c.target.key === "src:tasks_coin");
  const task = ch(w, "First").task;
  const wk = WORKERS.map((n) => ({ n, c: rank(n, w).supply.find((c) => c.target.key === "src:tasks_coin") })).filter((x) => x.c);
  cases.push(["3. a coins need on a task of a no-XP monster → no fighter's step for it, a worker's candidate", !!coin && noXp(w, "First", task) && r.step.target !== "src:tasks_coin" && wk.length > 0,
    `First's task ${task} (no XP: ${noXp(w, "First", task)}), its coins candidate ${coin ? mon(coin.step) ?? coin.step.work.kind : "none"}; First: ${said(r.step)}; workers' coins: ${wk.map(({ n, c }) => `${n} ${mon(c!.step) ?? c!.step.work.kind}`).join(", ") || "none"}`]);
  const pick = pickMonster(ch(w, "First"), w, new Set())!.monster;
  const wp = worldOf({ patch: { First: { task: pick, task_type: "monsters", task_progress: 0, task_total: 200 } } });
  const sp = rank("First", wp).step;
  const wk2 = WORKERS.filter((n) => rank(n, wp).supply.some((c) => c.target.key === "src:tasks_coin"));
  cases.push(["…the task on the pick's monster → the coins ride on the pick, no worker's candidate", mon(sp) === pick && (sp.target === "src:tasks_coin" || sp.reason?.rule === "xp-pick") && !wk2.length,
    `the pick ${pick}; First: ${said(sp)}; workers' coins: ${wk2.join(", ") || "none"}`]);
}

// ── 4 ──
{
  // Second at combat 31 (the bow asks 30; on 05e15c4 the bow is its best weapon against every monster up to the Owlbear)
  const o = { bank: { perfect_bow: 1 }, config: { trainHunt: false }, patch: { Second: { level: 31 } } };
  const w = worldOf(o);
  const fs = rank("First", w).step, ss = rank("Second", w).step;
  const wr = worldOf({ ...o, current: { Second: ss } });
  const next = rank("First", wr).step;
  cases.push(["4. a fighter's pick weapon banked → a worker's kill step leaves it, the fighter's next pick step wears it", fs.wear?.weapon === "perfect_bow" && ss.work.kind === "kill" && !!ss.wear?.weapon && ss.wear.weapon !== "perfect_bow" && next.reason?.rule === "xp-pick" && next.wear?.weapon === "perfect_bow",
    `First alone: ${said(fs)}; Second: ${said(ss)}; with Second's running, First: ${said(next)}`]);
}

let bad = 0;
for (const [name, ok, detail] of cases) { console.log(`${ok ? "ok  " : "FAIL"} ${name}\n     ${detail}`); if (!ok) bad++; }
console.log(bad ? `${bad} of ${cases.length} cases failed` : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
