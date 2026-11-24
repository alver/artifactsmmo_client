// Task 027d: tasks and coins (tasks.ts, decide.ts, supply.ts, forward.ts) on made-up worlds of the core (pure, no harness),
// from the fixture of 11-21 — its five characters at their levels, the roles table of 027:
//   hold: a fighter with no task → its kill step starts with the visit; a finished task → turned in, a new one held; a
//         worker → no visit; an items task on a fighter → cancelled at the visit;
//   tie: the task's monster within 25% of the pick's rate → chosen; further → not;
//   coins: a needed piece short of coins → a fighter's src:tasks_coin step, the coins in the bank when its task completes, the
//          piece bought and made after it; no fighter able → the wall's text;
//   cancel: not admitted → cancelled, the fee from the bank; a long task → cancelled; a short one → kept; no coin → no cancel;
//           a held task nobody works → never cancelled.
//   node --import tsx scripts/check-tasks.mts
// On 9375a24 (no task rule: a fighter's step has no visit, the held task no bonus, coins a wall) 10 of the 15 fail; "a worker
// → no visit", "…further → not", "no fighter able → the wall's text", "no coin → no cancel" and "a held task nobody works"
// hold on both trees.
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { catalog, monster } from "../src/catalog";
import { loadCatalog } from "../src/catalog";
import { rank } from "../src/plan/planner/decide";
import { itemsOf } from "../src/plan/planner/compile";
import { advance, forward } from "../src/plan/planner/forward";
import { gearNeeds } from "../src/plan/planner/gear";
import { pickMonster } from "../src/plan/planner/pick";
import { admitted } from "../src/plan/planner/reach";
import { billOf, recipeDemand } from "../src/plan/planner/supply";
import type { AccountAchievement, Character } from "../src/types/api";
import type { Step, World } from "../src/plan/planner/types";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();

const fixture = (JSON.parse(await readFile("scripts/fixtures/world-2026-11-21.json", "utf8")) as { world: World }).world;
const ROLES = {
  First: { role: "fighter" },
  Second: { role: "worker", craft: ["weaponcrafting"], gather: ["woodcutting"], fighterFrom: { skill: "weaponcrafting", level: 30 } },
  Third: { role: "worker", craft: ["gearcrafting", "cooking"], gather: ["alchemy", "fishing"] },
  Fourth: { role: "worker", craft: ["jewelrycrafting"], gather: ["mining", "woodcutting"] },
  Fifth: { role: "fighter" },
};
const ALL = ["First", "Second", "Third", "Fourth", "Fifth"];
const made = (code: string, points: number, type: string, target: string, total: number, progress = 0): AccountAchievement =>
  ({ code, name: code, description: "", points, completed_at: progress >= total ? "2026-11-01T00:00:00.000Z" : null, objectives: [{ type, target, total, progress }] }) as unknown as AccountAchievement;
const FARMER = made("tasks_farmer", 1, "task", "", 100, 100); // done: the Tasks Trader's tile is open
const task = (code: string, progress: number, total: number, type = "monsters") => ({ task: code, task_type: type, task_progress: progress, task_total: total });
const NONE = task("", 0, 0, "");
/** The fixture with these achievements, its bank with these quantities (0 takes a code out), the characters patched, `on`
 *  all but `off`. */
function worldOf(achievements: AccountAchievement[], bank: Record<string, number>, patch: Record<string, Record<string, unknown>> = {}, off: string[] = []): World {
  return {
    ...fixture, achievements, current: {}, blocked: {}, bags: {}, bankSlots: undefined, nextExpansion: undefined, favors: undefined,
    bank: Object.entries({ ...Object.fromEntries(fixture.bank.map((b) => [b.code, b.quantity])), ...bank }).filter(([, q]) => q > 0).map(([code, quantity]) => ({ code, quantity })),
    characters: fixture.characters.map((c) => ({ ...c, ...patch[c.name] }) as Character),
    config: { ...fixture.config, roles: ROLES, on: Object.fromEntries(ALL.map((n) => [n, !off.includes(n)])) } as unknown as World["config"],
  };
}
const chOf = (w: World, n: string): Character => w.characters.find((c) => c.name === n)!;
// tasks.ts's two helpers restated, so the check runs on a tree without it (red first)
const coinsOf = (code: string): number => catalog().tasks.get(code)?.rewards.items.find((i) => i.code === "tasks_coin")?.quantity ?? 0;
const taskText = (c: Character): string => `${c.task_progress} of ${c.task_total} ${c.task} (${c.task_type})`;
const coins = (w: World): number => w.bank.find((b) => b.code === "tasks_coin")?.quantity ?? 0;
const said = (s: Step): string => `${s.key} visit ${JSON.stringify(s.visit ?? null)} — ${s.why.slice(0, 200)}`;
const coinStep = (w: World, n: string): Step | undefined => rank(n, w).supply.find((c) => c.target.key === "src:tasks_coin")?.step;
const cases: [string, boolean, string][] = [];

// ── hold ─────────────────────────────────────────────────────────────────────
{
  const w = worldOf([], { tasks_coin: 100 }, { First: NONE });
  const s = rank("First", w).step, items = itemsOf(s, chOf(w, "First")).map((i) => i.kind);
  cases.push(["a fighter with no task → its kill step starts with the visit", s.work.kind === "kill" && s.visit?.at === "start" && !s.visit.cancel && items[0] === "task-visit", `First: ${said(s)}; items ${items.join(", ")}`]);
}
{
  const w = worldOf([made("made_up_tasks", 1, "task", "", 100)], { tasks_coin: 100 }, { First: task("chicken", 50, 50) });
  const s = rank("First", w).step, a = advance(w, s), f = chOf(a, "First");
  const ok = s.visit?.at === "start" && !!f.task && f.task_progress < f.task_total && coins(a) === 100 + coinsOf("chicken") && a.achievements[0].objectives[0].progress === 1;
  cases.push(["a finished task → turned in (its coins banked, a task counted), a new one held", ok, `First: ${said(s)}; after: ${taskText(f)}, coins ${coins(a)}, tasks ${a.achievements[0].objectives[0].progress}`]);
}
{
  const w = worldOf([], { tasks_coin: 100 }, { Second: NONE, Third: NONE, Fourth: NONE });
  const v = ["Second", "Third", "Fourth"].map((n) => [n, rank(n, w).step] as const);
  cases.push(["a worker → no visit", v.every(([, s]) => !s.visit), v.map(([n, s]) => `${n}: ${said(s)}`).join("; ")]);
}
{
  const w = worldOf([], { tasks_coin: 100 }); // First holds the fixture's items task: 222 of 386 gudgeon
  const s = rank("First", w).step, a = advance(w, s), f = chOf(a, "First");
  cases.push(["an items task on a fighter → cancelled at the visit (a coin), a monsters task held", s.visit?.cancel === "gudgeon" && coins(a) === 99 && f.task_type === "monsters", `First: ${said(s)}; after: ${taskText(f)}, coins ${coins(a)}`]);
}

// ── tie ──────────────────────────────────────────────────────────────────────
{
  const w0 = worldOf([], { tasks_coin: 100 }, { First: NONE });
  const ch = chOf(w0, "First"), best = pickMonster(ch, w0, new Set())!;
  // a monster the ×1.25 lifts over the pick (its rate within 25%) and one it does not
  const others = [...catalog().monsters.values()].filter((m) => m.code !== best.monster && m.level <= ch.level && admitted(ch, w0, m.code));
  const near = others.find((m) => pickMonster(ch, w0, new Set([m.code]))?.monster === m.code);
  const far = others.find((m) => pickMonster(ch, w0, new Set([m.code]))?.monster !== m.code && pickMonster(ch, w0, new Set())!.monster === best.monster);
  const on = (m: string) => rank("First", worldOf([], { tasks_coin: 100 }, { First: task(m, 0, 225) })).step;
  const a = near && on(near.code), b = far && on(far.code);
  cases.push(["the task's monster within 25% of the pick's rate → chosen", !!a && a.work.kind === "kill" && a.work.monster === near!.code && a.why.includes("task: 0 of 225"), `pick ${best.monster}; task ${near?.code ?? "none found"}: ${a ? said(a) : "—"}`]);
  cases.push(["…further → not", !!b && b.work.kind === "kill" && b.work.monster !== far!.code, `task ${far?.code ?? "none found"}: ${b ? said(b) : "—"}`]);
}

// ── coins ────────────────────────────────────────────────────────────────────
// Fourth's Steel Pickaxe (mining 29, a mining road to 40 and its objectives open) lacks one of its 2 Astralyte Crystals, 12
// coins at the Tasks Trader; the bank's coins stand at the floor (50)
const ROAD = [FARMER, made("made_up_gold", 5, "gathering", "gold_ore", 100), made("made_up_iron", 5, "gathering", "iron_ore", 300), made("made_up_mithril", 5, "gathering", "mithril_ore", 200)];
const MATS = { steel_bar: 7, pig_skin: 3, spider_leg: 3, astralyte_crystal: 1, tasks_coin: 50 };
{
  const w = worldOf(ROAD, MATS, { First: task("chicken", 10, 50), Fifth: task("chicken", 10, 50) });
  const s = coinStep(w, "First");
  const need = gearNeeds(w).needs.filter((n) => n.pieces.has("steel_pickaxe")).map((n) => `${n.for}: ${n.work}: H0 ${n.H0.toFixed(1)} h, H1 ${n.H1.toFixed(1)} h, G ${n.G.toFixed(2)} h`).join("; ") || "no need";
  cases.push(["a needed piece short of coins → a fighter's src:tasks_coin step (its task's kills)", !!s && s.work.kind === "kill" && s.work.monster === "chicken" && s.why.startsWith("coins: 12 short for Steel Pickaxe"), `${need}; First: ${s ? said(s) : "no src:tasks_coin candidate"}; chosen ${rank("First", w).step.key}`]);
}
{
  const w = worldOf(ROAD, MATS, { First: task("chicken", 45, 50), Fifth: task("chicken", 45, 50) });
  const s = coinStep(w, "First"), a = s && advance(w, s);
  cases.push(["…the step that finishes the task turns it in: its coins in the bank", !!a && s!.visit?.at === "end" && coins(a) === 50 + coinsOf("chicken"), `First: ${s ? said(s) : "none"}; coins after ${a ? coins(a) : "—"}`]);
  // the road on: the coins come in (the floor and the crystal's 12), the crystal is bought, the pickaxe is made
  const order: string[] = [];
  let atBuy = -1;
  forward(w, w.now + 36 * 3.6e6, (x, st) => { order.push(st.target); if (st.target === "mat:astralyte_crystal" && atBuy < 0) atBuy = coins(x); });
  const firstCoin = order.indexOf("src:tasks_coin"), buy = order.indexOf("mat:astralyte_crystal"), make = order.indexOf("gear:steel_pickaxe");
  cases.push(["…the piece bought and made after the coins", firstCoin >= 0 && buy > firstCoin && atBuy >= 62 && make > buy, `steps: src:tasks_coin ×${order.filter((k) => k === "src:tasks_coin").length} (first #${firstCoin}), mat:astralyte_crystal #${buy} with ${atBuy} coins in the bank, gear:steel_pickaxe #${make}`]);
}
{
  const w = worldOf(ROAD, MATS, {}, ["First", "Fifth"]);
  const out = billOf(w, "Fourth", recipeDemand("steel_pickaxe", 1)).out;
  cases.push(["no fighter able → the wall's text", out.some((x) => x.startsWith("tasks coins: 0 of 12")), out.join("; ") || "no wall"]);
}

// ── cancel (coins short: First works its task on purpose) ────────────────────
{
  const w0 = worldOf(ROAD, MATS, { First: NONE });
  const ch = chOf(w0, "First");
  // the lowest monsters task it is not admitted to (a task is drawn at or below its level; one held from before can be above)
  const bad = [...catalog().tasks.values()].filter((t) => t.type === "monsters" && !!monster(t.code) && !admitted(ch, w0, t.code)).sort((a, b) => a.level - b.level)[0];
  const w = worldOf(ROAD, MATS, { First: task(bad?.code ?? "chicken", 0, 100) });
  const s = coinStep(w, "First"), a = s && advance(w, s), f = a && chOf(a, "First");
  cases.push(["not admitted → cancelled, the fee from the bank", !!bad && s?.visit?.cancel === bad.code && !!a && coins(a) === 49 && f!.task !== bad.code, `First holds ${bad?.code ?? "nothing it is not admitted to"}: ${s ? said(s) : "none"}; coins after ${a ? coins(a) : "—"}, holds ${f ? taskText(f) : "—"}`]);
}
{
  const long = worldOf(ROAD, MATS, { First: task("chicken", 0, 20000) });
  const s = coinStep(long, "First");
  cases.push(["a long task (hours left over a fresh draw's + a coin's) → cancelled", s?.visit?.cancel === "chicken", `First: ${s ? said(s) : "none"}`]);
  const short = worldOf(ROAD, MATS, { First: task("chicken", 40, 50) });
  const k = coinStep(short, "First");
  cases.push(["…a short one → kept", !!k && k.work.kind === "kill" && !k.visit?.cancel, `First: ${k ? said(k) : "none"}`]);
  const broke = worldOf(ROAD, { ...MATS, tasks_coin: 0 }, { First: task("chicken", 0, 20000) });
  const n = coinStep(broke, "First");
  cases.push(["…no coin in the bank → no cancel", !n?.visit?.cancel, `First: ${n ? said(n) : "no candidate"}`]);
  const idle = worldOf([], { tasks_coin: 100 }, { First: task("chicken", 0, 20000) }); // no coins short: nobody works the task on purpose
  const i = rank("First", idle).step;
  cases.push(["…a held task nobody works → never cancelled", !i.visit && i.target !== "src:tasks_coin", `First: ${said(i)}`]);
}

let bad = 0;
for (const [why, ok, detail] of cases) {
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${why}\n       ${detail}`);
}
console.log(bad ? `FAILED (${bad} of ${cases.length})` : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
