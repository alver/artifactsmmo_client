// Task 038: the fighters fight fed. Made-up worlds of the core (pure, no harness) from the live World of 09:46 UTC on 11-28
// (scripts/fixtures/world-2026-11-28-0946.json, a zero-call service's snapshot: First at combat 35, Fifth at 33, stage 1),
// every character on, nothing running, no block and no measured cost (the seconds are the model's), the bank's food and raw
// food out but what a case puts in:
//   1. First short of food, 120 Cooked Trout (alone on: Fifth's fed pick loses 381 HP, under the rat meat's 400); a worker admitted to the Rat and to no other monster that drops a raw food, nobody
//      fishing (every fishing level 0) → the kitchen asks for Cooked Rat Meat and that worker's step is the Rat for raw rat meat (rule fed), ahead of
//      the crafts' training's material; with the bank's food of the live state back, the step is no food's;
//   2. one stock, 120 Cooked Trout, two fighters → First's step, then Fifth's with First's running, both carry trout, split by
//      the HP their fights lose a second (within 10 points of the burns' shares);
//   3. 5 Cooked Trout → the Owlbear's kill is priced with its rest (over 1.3 × its seconds fed with 2,000) and First's XP pick
//      is a monster that loses less; with 2,000 it is the Owlbear.
// On 0a38c06 all three fail. node --import tsx scripts/check-fed.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { catalog, monster } from "../src/catalog";
import { loadCatalog } from "../src/catalog";
import { loadAtlas } from "../src/catalog/atlas";
import { DEFAULTS } from "../src/plan/planner/config";
import { rank } from "../src/plan/planner/decide";
import { actionSec } from "../src/plan/planner/cost";
import { fightRec, admitted } from "../src/plan/planner/reach";
import { roleOf } from "../src/plan/planner/roles";
import * as C from "../src/plan/planner/consumables";
import type { Character } from "../src/types/api";
import type { Step, World } from "../src/plan/planner/types";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
await loadAtlas();

const fx = (JSON.parse(await readFile("scripts/fixtures/world-2026-11-28-0946.json", "utf8")) as { world: World }).world;
const ALL = ["First", "Second", "Third", "Fourth", "Fifth"];
const FOODS = [...catalog().items.values()].filter((i) => i.type === "consumable" && (i.effects ?? []).some((e) => e.code === "heal"));
const RAW = new Set(FOODS.flatMap((i) => (i.craft?.items ?? []).map((g) => g.code)));
const FOOD = new Set(FOODS.map((i) => i.code));
function worldOf(o: { bank?: Record<string, number>; patch?: Record<string, Partial<Character>>; blocked?: World["blocked"]; current?: World["current"]; live?: boolean; off?: string[] } = {}): World {
  return {
    ...fx, current: o.current ?? {}, blocked: o.blocked ?? {}, costs: {}, bags: undefined,
    bank: [...fx.bank.filter((b) => o.live || (!FOOD.has(b.code) && !RAW.has(b.code))), ...Object.entries(o.bank ?? {}).map(([code, quantity]) => ({ code, quantity }))],
    characters: fx.characters.map((c) => ({ ...c, ...o.patch?.[c.name] }) as Character),
    config: { ...DEFAULTS, ...fx.config, on: Object.fromEntries(ALL.map((n) => [n, !o.off?.includes(n)])), roles: DEFAULTS.roles } as World["config"],
  };
}
const ch = (w: World, n: string): Character => w.characters.find((c) => c.name === n)!;
const mon = (s: Step | undefined): string | undefined => (s?.work.kind === "kill" ? s.work.monster : undefined);
const said = (s: Step): string => `${s.reason?.rule} ${s.target}${mon(s) ? ` (${mon(s)})` : ""} ${JSON.stringify(s.withdraw ?? {})}`;
const cases: [string, boolean, string][] = [];

// ── 1. a worker admitted to the Rat alone: the Rat for raw rat meat, ahead of the training's material ──
{
  const workers = ALL.filter((n) => roleOf(n, worldOf()) === "worker");
  // First alone on: Fifth's fed pick, the Death Knight, loses 381 HP — under the rat meat's 400, it would not eat one
  // every monster that drops a raw food but the Rat is blocked for the workers; nobody fishes (every fishing level 0)
  const drops = [...catalog().monsters.values()].filter((m) => m.code !== "rat" && m.drops.some((d) => RAW.has(d.code))).map((m) => m.code);
  const until = fx.now + 864e5;
  const blocked = Object.fromEntries(workers.flatMap((n) => drops.map((m) => [`kill:${m}@${n}`, { until, why: "check" }])));
  const patch = Object.fromEntries(ALL.map((n) => [n, { fishing_level: 0 } as Partial<Character>]));
  // 120 Cooked Trout: short of First's burn, enough to keep its pick the Owlbear (with none it is the Rat, whose drops come
  // along with a fighter's pick and are no worker's: 027g)
  const w = worldOf({ blocked, patch, off: ["Fifth"], bank: { cooked_trout: 120 } });
  const need = (C as { fedNeed?: (w: World) => { code?: string; units: number; why: string } | undefined }).fedNeed?.(w);
  const hunter = workers.find((n) => admitted(ch(w, n), w, "rat"));
  const r = hunter ? rank(hunter, w) : undefined;
  const train = r?.supply.find((c) => c.train);
  const wl = worldOf({ blocked, patch, live: true, off: ["Fifth"] }), sl = hunter ? rank(hunter, wl).step : undefined;
  cases.push(["1. short, a worker admitted to the Rat alone → its step the Rat for raw rat meat, ahead of the training's material",
    need?.code === "cooked_rat_meat" && !!r && r.step.target === "src:raw_rat_meat" && mon(r.step) === "rat" && r.step.reason?.rule === "fed" && !!train && !!sl && sl.reason?.rule !== "fed",
    `the kitchen: ${need ? `${need.why}; ${need.code} ×${need.units}` : "no such thing"}; ${hunter ?? "no worker admitted"}: ${r ? said(r.step) : "—"}; the training's leaf ${train?.target.key ?? "none"}; with the live bank: ${sl ? said(sl) : "—"}`]);
}

// ── 2. one stock, two fighters: each step's food by its burn ──
{
  const w = worldOf({ bank: { cooked_trout: 120 } });
  const s1 = rank("First", w).step;
  const w2 = { ...w, current: { First: s1 } };
  const s2 = rank("Fifth", w2).step;
  const t1 = s1.withdraw?.cooked_trout ?? 0, t2 = s2.withdraw?.cooked_trout ?? 0;
  const rate = (wx: World, n: string, s: Step): number => {
    const m = mon(s), r = m ? fightRec(ch(wx, n), wx, m) : undefined;
    return r && C.burnOf ? C.burnOf(wx, ch(wx, n), r.forecast, r.p, m!, r.codes).rate : NaN;
  };
  const r1 = rate(w, "First", s1), r2 = rate(w2, "Fifth", s2), want = r1 / (r1 + r2), got = t1 / Math.max(1, t1 + t2);
  cases.push(["2. one stock, two fighters → both steps carry it by their burns", t1 >= 1 && t2 >= 1 && t1 + t2 <= 120 && Math.abs(got - want) <= 0.1,
    `First ${said(s1)} (${r1.toFixed(1)} HP/s); Fifth ${said(s2)} (${r2.toFixed(1)} HP/s); First's share ${(100 * got).toFixed(0)}% against ${(100 * want).toFixed(0)}%`]);
}

// ── 3. sent short of food: priced with its rest, the pick a monster that burns less ──
{
  const w5 = worldOf({ bank: { cooked_trout: 5 } }), wp = worldOf({ bank: { cooked_trout: 2000 } });
  const s5 = rank("First", w5).step, sp = rank("First", wp).step;
  const owl = { kind: "kill" as const, monster: "owlbear" };
  const a5 = actionSec(owl, ch(w5, "First"), w5), ap = actionSec(owl, ch(wp, "First"), wp);
  const lost = (w: World, m: string): number => { const r = fightRec(ch(w, "First"), w, m)!; return r.forecast.maxHp - r.forecast.hpRemaining; };
  cases.push(["3. 5 Cooked Trout → the Owlbear priced with its rest, the pick a monster that loses less; 2,000 → the Owlbear",
    mon(sp) === "owlbear" && sp.reason?.rule === "xp-pick" && s5.reason?.rule === "xp-pick" && !!mon(s5) && mon(s5) !== "owlbear" && lost(w5, mon(s5)!) < lost(w5, "owlbear") && a5 > 1.3 * ap,
    `the Owlbear ${Math.round(a5)} s a kill with 5, ${Math.round(ap)} s with 2,000; First with 5: ${said(s5)}, loses ${mon(s5) ? Math.round(lost(w5, mon(s5)!)) : "—"} HP against the Owlbear's ${Math.round(lost(w5, "owlbear"))} (${monster(mon(s5) ?? "")?.name ?? "—"}); with 2,000: ${said(sp)}`]);
}

let bad = 0;
for (const [name, ok, detail] of cases) { console.log(`${ok ? "ok  " : "FAIL"} ${name}
     ${detail}`); if (!ok) bad++; }
console.log(bad ? `${bad} of ${cases.length} cases failed` : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
