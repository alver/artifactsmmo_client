// Task 029: the fleet levels the crafts — made-up worlds of the core (pure, no harness) from the World of 11-25 (its five
// characters, its bank) under this tree's roles (config.ts DEFAULTS.roles):
//   A.1 a craft under its target → its training's leaves are first-tier needs (a worker's); at the target → none;
//   A.3 a training's src: kill with a worker admitted → the fighter's, before its XP pick (TRAIN_HUNT on); off → a worker's; a
//       training's kill monster within 25% of the pick's rate → the pick is that monster;
//   A.4 the bank covers a batch → the crafter's train step, first, its hours the crafting's, not the atlas's;
//   A.5 the forward model: a train step takes its batch from the bank (recycling's return back) and gives its XP; the level
//       comes sooner when a fighter banked the drops first;
//   B   cooking is Fourth's (task 031: the kitchen's, Third's, with KITCHEN); a step's food takes up to half the bag; Second at
//       weaponcrafting 30 is a worker.
// The scenarios train-from-bank, train-hunt-eats and train-bag-room run the loop. On 6867428 (028) every case fails (the
// script reads the new names where they exist so that the red run runs). node --import tsx scripts/check-train.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { item, loadCatalog } from "../src/catalog";
import { rank } from "../src/plan/planner/decide";
import { advance, forward } from "../src/plan/planner/forward";
import { pickMonster } from "../src/plan/planner/pick";
import { admitted } from "../src/plan/planner/reach";
import { levelHoursEstimate } from "../src/plan/planner/cost";
import { DEFAULTS, KITCHEN } from "../src/plan/planner/config";
import { crafterOf, roleOfCh } from "../src/plan/planner/roles";
import { available } from "../src/plan/planner/stock";
import { craftXpOf } from "../src/plan/planner/xp";
import type { Character } from "../src/types/api";
import type { Lane, Step, World } from "../src/plan/planner/types";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();

// the red run (6867428) has no train.ts: its cases fail, they do not stop the script
const T = (await import("../src/plan/planner/" + "train").catch(() => ({}))) as Partial<typeof import("../src/plan/planner/train")>;
const w25 = (JSON.parse(await readFile("scripts/fixtures/world-2026-11-25.json", "utf8")) as { world: World }).world;
type Patch = Record<string, Record<string, unknown>>;
const WORKERS = ["Second", "Third", "Fourth"];
function worldOf(patch: Patch = {}, bank?: Record<string, number>, config: Partial<World["config"]> = {}): World {
  return {
    ...w25, current: {}, blocked: {}, bags: {}, bankSlots: undefined, nextExpansion: undefined, favors: undefined,
    bank: bank ? Object.entries(bank).map(([code, quantity]) => ({ code, quantity })) : w25.bank,
    characters: w25.characters.map((c) => ({ ...c, ...patch[c.name] }) as Character),
    config: { ...w25.config, roles: DEFAULTS.roles, on: { First: true, Second: true, Third: true, Fourth: true, Fifth: true }, ...config } as World["config"],
  };
}
const AT_TARGET: Patch = { Second: { weaponcrafting_level: 30 }, Third: { gearcrafting_level: 30 }, Fourth: { jewelrycrafting_level: 30 } };
const ch = (w: World, n: string): Character => w.characters.find((c) => c.name === n)!;
const said = (s: Step): string => `${s.target} (${s.work.kind}${s.work.kind === "kill" ? ` ${s.work.monster}` : ""}) — ${s.why.slice(0, 170)}`;
const monsterOf = (s: Step): string | undefined => (s.work.kind === "kill" ? s.work.monster : undefined);
const cases: [string, boolean, string][] = [];

// ── A.1 ──
{
  const w = worldOf();
  const parents = T.trainParents?.(w, "Third", 2000) ?? [];
  const leaves = WORKERS.flatMap((n) => rank(n, w).supply.filter((c) => (c.step.parent ?? "").startsWith("train:") || (c as { train?: boolean }).train).map((c) => ({ n, c })));
  cases.push(["A.1 a craft under its target → its training is a parent, its leaves a worker's first-tier needs", parents.length > 0 && leaves.length > 0 && leaves.every(({ c }) => c.need), `parents ${parents.map((p) => `${p.key} (${p.label})`).join(", ") || "none"}; leaves ${leaves.slice(0, 4).map(({ n, c }) => `${n} ${c.target.key} first tier ${!!c.need}`).join(", ") || "none"}`]);
  const wt = worldOf(AT_TARGET);
  const pt = T.trainParents?.(wt, "Third", 2000) ?? [{ key: "?" }];
  const lt = WORKERS.flatMap((n) => rank(n, wt).supply.filter((c) => (c as { train?: boolean }).train));
  cases.push(["…at the target → no training, no leaf", !pt.length && !lt.length && !!T.trainParents, `parents ${pt.map((p) => p.key).join(", ") || "none"}; leaves ${lt.length}`]);
}

// ── A.3 ──
{
  // the World of 11-25: the jewelry training's Steel Rings ask Hard Leather — cowhide, the cow's, every worker admitted to it
  // (task 033: TRAIN_HUNT is off by default — the case sets it on)
  const w = worldOf({}, undefined, { trainHunt: true });
  const s = rank("First", w).step, m = monsterOf(s);
  const pick = pickMonster(ch(w, "First"), w, new Set());
  const anyWorker = !!m && WORKERS.some((n) => admitted(ch(w, n), w, m));
  cases.push(["A.3 a training's src: kill with a worker admitted → the fighter's, before its XP pick", !!m && s.target.startsWith("src:") && s.why.startsWith("fighter, a training's kill") && s.reason?.rule === "train-kill" && anyWorker && m !== pick?.monster, `First: ${said(s)}; a worker admitted: ${anyWorker}; the pick ${pick?.monster}`]);
  const off = worldOf({}, undefined, { trainHunt: false });
  const so = rank("First", off).step;
  const theirs = !!m && WORKERS.some((n) => rank(n, off).supply.some((c) => c.target.key === s.target && monsterOf(c.step) === m));
  cases.push(["…TRAIN_HUNT off → a worker's (027g's rule)", !!m && so.target !== s.target && !so.why.startsWith("fighter, a training's kill") && theirs, `First: ${said(so)}; a worker's candidate ${s.target}: ${theirs}`]);
  // the weapon training's Battlestaff asks Wolf Bone (the bank holds the rest, and no drop another recipe of the level asks) —
  // the wolf is within 25% of First's pick (the rat; task 038: a fighter's kill priced with the food it is sent with — with the
  // bank's 1,127 Cooked Trout the Ogre beyond the band, with 300 the Ogre and the wolf within it): the pick is the wolf, the
  // bones come along
  const DROPS = new Set(["skeleton_skull", "skeleton_bone", "wolf_bone", "wolf_hair", "ogre_eye", "ogre_skin", "flying_wing", "pig_skin", "spider_leg", "snake_hide", "wool", "king_slimeball", "green_cloth"]);
  const bk = Object.fromEntries(w25.bank.filter((b) => !DROPS.has(b.code)).map((b) => [b.code, b.quantity]));
  const wb = worldOf({ Third: { gearcrafting_level: 30 }, Fourth: { jewelrycrafting_level: 30 } }, { ...bk, hardwood_plank: 500, steel_bar: 500, blue_slimeball: 500, cooked_trout: 300 });
  const sb = rank("First", wb).step, p0 = pickMonster(ch(wb, "First"), wb, new Set()), pw = pickMonster(ch(wb, "First"), wb, new Set(["wolf"]));
  const leaf = rank("First", wb).supply.find((c) => c.target.key === "src:wolf_bone");
  cases.push(["…a training's kill monster within 25% of the pick's rate → the pick is that monster", p0?.monster !== "wolf" && pw?.monster === "wolf" && monsterOf(sb) === "wolf" && sb.why.startsWith("fighter: the XP pick") && !!(leaf as { train?: boolean } | undefined)?.train, `the pick ${p0?.monster} (${p0 ? (p0.xp / p0.sec).toFixed(3) : "—"} XP/s), with the ×1.25 ${pw?.monster}; First: ${said(sb)}; src:wolf_bone a training's: ${!!(leaf as { train?: boolean } | undefined)?.train}`]);
}

// ── A.4, A.5 ──
{
  // Second at weaponcrafting 20, none of the level's XP made, a level's Battlestaffs in the bank
  const bs = item("battlestaff")!.craft!, runs = Math.ceil(8200 / craftXpOf("battlestaff", 20));
  const mats = Object.fromEntries(bs.items.map((g) => [g.code, g.quantity * runs]));
  const bank = { ...Object.fromEntries(w25.bank.map((b) => [b.code, b.quantity])), ...mats };
  const w = worldOf({ Second: { weaponcrafting_level: 20, weaponcrafting_xp: 0 } }, bank);
  const s = rank("Second", w).step;
  const atlasH = levelHoursEstimate("weaponcrafting" as Lane, 20, w, ch(w, "Second"));
  const runsS = s.work.kind === "train" ? s.work.runs ?? 0 : 0;
  cases.push(["A.4 the bank covers a batch → the crafter's train step, first, its hours the crafting's (not the atlas's)", s.work.kind === "train" && !!s.work.code && runsS >= 1 && s.reason?.rule === "train" && s.why.startsWith("worker, a batch from the bank") && s.hours < 0.5 && s.hours < atlasH, `Second: ${said(s)}; ${s.hours.toFixed(3)} h, the atlas's ${atlasH.toFixed(2)} h`]);
  // the forward model: the step takes its batch (recycling's return back), its runs give their XP
  const after = s.work.kind === "train" && s.work.code ? advance({ ...w, clock: {} }, s) : w;
  const code = s.work.kind === "train" ? s.work.code ?? "" : "", r = item(code)?.craft;
  const n = r ? r.items.reduce((t, g) => t + g.quantity, 0) : 1, back = (Math.floor((n - 1) / 5) + 1) / n;
  const g0 = r?.items[0];
  const took = g0 ? available(g0.code, w, "Second") - available(g0.code, after, "Second") : 0;
  const want = g0 ? g0.quantity * runsS * (1 - back) : -1;
  const xp = (after.characters.find((c) => c.name === "Second") as unknown as Record<string, number>).weaponcrafting_xp + 0;
  const lv = levelOf2(after, "Second");
  cases.push(["A.5 the forward model: a train step takes its batch from the bank, recycling's return back, and gives its XP", !!g0 && Math.abs(took - want) < 1e-6 && (lv > 20 || xp >= runsS * craftXpOf(code, 20) - 1e-6), `${code} ×${runsS}: ${g0?.code} ${took.toFixed(2)} taken (want ${want.toFixed(2)}); weaponcrafting ${lv}, ${xp} XP`]);
  // the level sooner when a fighter banked the drops first: Second alone, with and without the Battlestaff's drops
  const drops = ["wolf_bone", "blue_slimeball"];
  const only: Partial<World["config"]> = { on: { Second: true } };
  const when = (b: Record<string, number>): number => {
    const w0 = worldOf({ Second: { weaponcrafting_level: 20, weaponcrafting_xp: 0 } }, b, only);
    let at = Infinity;
    forward(w0, w0.now + 48 * 3.6e6, undefined, (wa) => { if (at === Infinity && levelOf2(wa, "Second") > 20) at = (wa.clock?.Second ?? wa.now) - w0.now; }, undefined, false);
    return at / 3.6e6;
  };
  const withDrops = when(bank), without = when(Object.fromEntries(Object.entries(bank).filter(([c]) => !drops.includes(c))));
  cases.push(["…the level comes sooner when a fighter banked the drops first", withDrops < without, `weaponcrafting 20 → 21 in ${withDrops.toFixed(2)} h with the drops banked, ${without.toFixed(2)} h without`]);
}
function levelOf2(w: World, n: string): number { return (w.characters.find((c) => c.name === n) as unknown as Record<string, number>).weaponcrafting_level; }

// ── B ──
{
  const roles = { ...w25.config, roles: DEFAULTS.roles } as World["config"];
  cases.push([`B.2 cooking is ${KITCHEN ? "the kitchen's, Third's (task 031)" : "Fourth's"}`, crafterOf("cooking", { ...worldOf(), config: roles }) === (KITCHEN ? "Third" : "Fourth"), `the cook: ${crafterOf("cooking", { ...worldOf(), config: roles })}`]);
  const sec = { ...ch(w25, "Second"), weaponcrafting_level: 30 } as Character;
  cases.push(["B.4 Second at weaponcrafting 30 is a worker", roleOfCh(sec, roles) === "worker", `Second at 30: ${roleOfCh(sec, roles)}`]);
  // no craft in training (each at its target, Second off): First's pick at the rat eats two trout a kill — the bag caps it
  const w = worldOf(AT_TARGET, undefined, { on: { First: true, Third: true, Fourth: true, Fifth: true } });
  const s = rank("First", w).step, max = ch(w, "First").inventory_max_items, half = Math.floor(max / 2), q = s.withdraw?.cooked_trout ?? 0;
  cases.push(["B.3 a step's food takes up to half the bag (more than the third it took)", q > Math.floor(max / 3) && q <= half && s.why.includes(`${half} is half of ${max}`), `First: ${said(s)}; withdraw ${JSON.stringify(s.withdraw ?? {})}; ${s.why.match(/the bag caps[^)]*\)/)?.[0] ?? "no bag note"}`]);
}

let bad = 0;
for (const [why, ok, detail] of cases) {
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${why}\n       ${detail}`);
}
console.log(bad ? `FAILED (${bad} of ${cases.length})` : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
