// Task 033: a fighter fights for XP — the crafts' kills go back to the workers. Made-up worlds of the core (pure, no harness)
// from the live World of 00:00 UTC on 11-27 (scripts/fixtures/world-2026-11-27.json: First and Fifth at combat 31, both on a
// Spider task, 0 combat XP a kill; the Vampire their pick) under this tree's DEFAULTS, nothing running:
//   1. a training's src: kill of a monster that gives the fighter no XP, a worker on and admitted → the fighter's step is its
//      XP pick, a worker's step is the kill (TRAIN_HUNT off: 027g's rule);
//   2. the same with no worker admitted (each braked on the training's monsters) → no fighter's step for a leaf of a
//      training alone (task 033b; 033 had it the fighter's by rule (3), as 027g) — one that serves a road piece too may be;
//   3. a coins need on a task of a no-XP monster → no fighter's step for it, a worker's candidate (A.2); the fighter's task on
//      its pick's monster → the coins ride on the pick (its step kills the pick's monster), no worker's candidate;
//   4. a Perfect Bow banked, the fighters' pick the Imp with it → a worker's kill step that would wear it (the Flying Snake's
//      wings, TRAIN_HUNT off on both trees) leaves it, and with that step running the fighter's next pick step wears it (A.3).
// Task 033b, on the live World of 16:35 UTC on 11-27 (scripts/fixtures/world-2026-11-27-1635.json, a zero-call service's
// snapshot: First and Fifth at combat 31 wear the Perfect Bow and are admitted alone against the King Slime, no worker is;
// the jewelry training is on Skull Amulet, short of King Slimeball; the Cyclops Eye, whose score ties the King Slime's and
// wins by its key, blocked for both):
//   5. the training's King Slimeball → no fighter's step is the King Slime: Fifth's is its XP pick (First's another need of
//      the road); on sale at an ask that passes the market's rules → a worker buys it; none on sale → nobody's step is it
//      (task 036, B.1: and the training takes its next recipe — supplierSec prices the kill at a worker, none is admitted;
//      033b had it wait on Skull Amulet). Cases 5, 7 and 8 read the training on Skull Amulet where it is bought (20, ref 20);
// Task 035 (a fighter never takes a fight that gives it no XP — the guard on the outcome), the three King Slime steps of the
// journal of 11-27 on the same World (none of those minutes is kept: logs/world holds 00:00's), each fighter's step a fight
// that pays it XP:
//   6. 15:05, 032c's code (TRAIN_HUNT on): "fighter, a training's kill" → with trainHunt on;
//   7. 16:15:08, 033's code (TRAIN_HUNT off): "fighter, a training's kill … Skull Amulet ×24" → under DEFAULTS;
//   8. 17:38:32, 033b's code: "fighter, a need's kill … for jewelrycrafting 26 → 27" — the leaf shared by the training and
//      Fifth's own Greater Dreadful Amulet (the bank and the bags without King Slimeballs) → no exception for a fighter's
//      own piece (033b's case 6, reversed).
// On 05e15c4 cases 1, 3 and 4 fail, case 2 held there (027g's rule); on 51928ef cases 2, 5 and 7 fail; on 3188f48 cases 6
// and 8 fail (7 holds there by 033b's filter). node --import tsx scripts/check-fighters.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog, monster } from "../src/catalog";
import { loadAtlas } from "../src/catalog/atlas";
import { DEFAULTS } from "../src/plan/planner/config";
import { rank } from "../src/plan/planner/decide";
import { pickMonster } from "../src/plan/planner/pick";
import { admitted } from "../src/plan/planner/reach";
import { bossWorld } from "../src/plan/planner/consumables";
import { trainParents } from "../src/plan/planner/train";
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
const xpA = (w: World, n: string, m: string): number => { const M = monster(m)!; return fightXp(M.level, M.hp, M.type, ch(w, n).level); };
const noXp = (w: World, n: string, m: string): boolean => xpA(w, n, m) <= 0;
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
  const alone = new Set(kills.filter((c) => !c.road).map((c) => c.target.key)); // a training's alone (wolf bone serves a road piece too)
  cases.push(["2. …no worker admitted → still no fighter's step for a training's alone (033b)", none && alone.size > 0 && !alone.has(sb.target), `workers admitted: ${!none}; a training's alone ${[...alone].join(", ") || "none"}; First: ${said(sb)}`]);
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

// ── 5, 6 (task 033b) ──
{
  const lx = (JSON.parse(await readFile("scripts/fixtures/world-2026-11-27-1635.json", "utf8")) as { world: World }).world;
  const KS = "src:king_slimeball";
  const liveOf = (o: { market?: World["market"]; gone?: string; config?: Partial<World["config"]> } = {}): World => {
    const gone = (c: string): boolean => c === o.gone;
    return {
      ...lx, current: {}, ...(o.market ? { market: o.market } : {}),
      blocked: { ...lx.blocked, ...Object.fromEntries(["First", "Fifth"].map((n) => [`src:cyclops_eye@${n}`, { until: lx.now + 864e5, why: "check" }])) },
      bank: lx.bank.filter((b) => !gone(b.code)), bags: Object.fromEntries(Object.entries(lx.bags ?? {}).filter(([c]) => !gone(c))),
      config: { ...DEFAULTS, ...lx.config, on: { ...DEFAULTS.on, ...lx.config.on }, roles: DEFAULTS.roles, ...o.config } as World["config"],
    };
  };
  const sale = (price: number, ref: number): World["market"] => ({ orders: [{ id: "k1", code: "king_slimeball", price, quantity: 500, account: "someone" }], refs: { king_slimeball: { price: ref, n: 30, from: "trades" } }, spent: 0, account: "alverus" });
  const ALL = ["First", "Fifth", ...WORKERS];
  const steps = (w: World): Record<string, Step> => Object.fromEntries(ALL.map((n) => [n, rank(n, w).step]));
  const w = liveOf(), wf = liveOf({ market: sale(20, 20) });
  const adm = ALL.filter((n) => admitted(ch(w, n), bossWorld(w, "king_slime"), "king_slime"));
  const train = trainParents(wf, "Fourth", Infinity).find((p) => p.key === "train:jewelrycrafting");
  const none = trainParents(w, "Fourth", Infinity).find((p) => p.key === "train:jewelrycrafting");
  const leaf = rank("First", wf).supply.find((c) => c.target.key === KS);
  const s = steps(w), fair = steps(wf), live = steps(liveOf({ market: sale(272, 319) }));
  const on = (x: Record<string, Step>): string[] => ALL.filter((n) => x[n].target === KS);
  const buys = WORKERS.filter((n) => fair[n].target === "buy:king_slimeball" && fair[n].reason?.rule === "market");
  cases.push(["5. a training's boss drop, a fighter admitted alone, no worker → the fighters' steps are not the kill (Fifth's XP pick); bought where the market's rules pass; none on sale → nobody's",
    adm.join() === "First,Fifth" && !!train?.label.includes("Skull Amulet") && !none?.label.includes("Skull Amulet") && !!leaf?.train && !leaf.road && s.Fifth.reason?.rule === "xp-pick" && !on(s).length && buys.length > 0 && !on(fair).length,
    `admitted alone ${adm.join(",")}; at a fair ask ${train?.label}, none on sale ${none?.label}; First: ${said(s.First)}; Fifth: ${said(s.Fifth)}; at 20 (ref 20): ${buys.join(",") || "nobody"} buys, fighters ${said(fair.First)} · ${said(fair.Fifth)}; at 272 (ref 319, as live): ${ALL.filter((n) => live[n].target === "buy:king_slimeball").join(",") || "nobody"} buys, on the kill ${on(live).join(",") || "nobody"}; none on sale: on the kill ${on(s).join(",") || "nobody"}`]);
  // ── 6, 7, 8 (task 035) ──
  const xpOf = (x: World, n: string, s: Step): string => (mon(s) ? `${xpA(x, n, mon(s)!)} XP a kill` : "no fight");
  const pays = (x: World, f: Record<string, Step>): boolean => ["First", "Fifth"].every((n) => !!mon(f[n]) && !noXp(x, n, mon(f[n])!));
  const tell = (x: World, f: Record<string, Step>): string => ["First", "Fifth"].map((n) => `${n}: ${said(f[n])}, ${xpOf(x, n, f[n])}`).join("; ");
  const wh = liveOf({ config: { trainHunt: true } }), hunt = steps(wh);
  const lh = rank("First", wh).supply.find((c) => c.target.key === KS);
  cases.push(["6. 15:05 (TRAIN_HUNT on): the training's King Slimeball → each fighter's step a fight that pays it XP", noXp(wh, "First", "king_slime") && !!lh?.train && pays(wh, hunt), `leaf train ${!!lh?.train}; ${tell(wh, hunt)}`]);
  cases.push(["7. 16:15 (TRAIN_HUNT off): the same → each fighter's step a fight that pays it XP", !!leaf?.train && pays(wf, fair), tell(wf, fair)]);
  const wo = liveOf({ gone: "king_slimeball", market: sale(20, 20) }), own = steps(wo);
  const of = rank("Fifth", wo).supply.find((c) => c.target.key === KS);
  cases.push(["8. 17:38 (033b): a leaf shared by the training and Fifth's own Greater Dreadful Amulet → each fighter's step a fight that pays it XP, no exception",
    !!of?.road && !!of.train && pays(wo, own), `Fifth's leaf for ${of?.step.parent} (road ${!!of?.road}, train ${!!of?.train}); ${tell(wo, own)}`]);
}

let bad = 0;
for (const [name, ok, detail] of cases) { console.log(`${ok ? "ok  " : "FAIL"} ${name}\n     ${detail}`); if (!ok) bad++; }
console.log(bad ? `${bad} of ${cases.length} cases failed` : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
