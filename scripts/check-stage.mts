// Task 036: the engine follows the stage (stage.json; plan/planner/stage.ts) — and 033b's two leftovers (B). Made-up worlds of
// the core (pure, no harness) from the live World of 16:35 UTC on 11-27 (scripts/fixtures/world-2026-11-27-1635.json: First and
// Fifth at combat 31; Second weaponcrafting 28, Third gearcrafting 30, Fourth jewelrycrafting 26 on Skull Amulet, no worker
// admitted to the King Slime) under this tree's DEFAULTS, nothing running, the Cyclops Eye blocked for the fighters (as
// check-fighters). The stages are written here, not read from stage.json (the planning chat's to edit):
//   1. crafts: a craft at the stage's number is not trained, one under it is, one the stage does not name is not, and no level
//      candidate goes past the number (A.1);
//   2. pieces: a piece off the list is neither a need nor a purchase, one on it is (A.2);
//   3. achievements: an achievement off the list is no candidate, and only a listed kill's monster is in the pick's bonus; the
//      tidy still sees every one (A.3);
//   4. the current stage: the first some fighter has not reached, the last stays (A);
//   5. the file: a changed one is used by the next decision, a broken one keeps the last good, an unknown code is left out and
//      named (C.3, state/stage.ts);
//   6. gathering: nothing is built (A.4) — with nothing before it a worker already gathers its lane's best node;
//   7. a stage that leaves every field out decides exactly as no stage;
//   8. B.1: the jewelry training's King Slimeball, no worker admitted — no market: the training takes its next recipe; a fair
//      ask: Skull Amulet stays and a worker buys the drop;
//   9. B.2: the live ask (272, reference 319) on a running Skull Amulet step — bought, "no source of ours" (rule 2 has no own
//      hours: nobody of ours hunts the drop);
//  10. task 037: a listed piece is a need when it pays for itself (G ≤ H0 − H1), however little it saves; not when its chain
//      costs more. On fd7499e (NEED_RATIO 0.85 for every piece) case 10 fails, 1–9 hold.
// On cc1a3a9 (035), with this check's own imports copied in (plan/planner/stage.ts, state/stage.ts), cases 1, 2, 3, 5, 6, 8 and
// 9 fail (the World's stages are not read — case 6's quiet world needs them; the training is priced at the fighters' kill, rule
// 2 against their hours); 4 and 7 hold (the stage module itself; a stage that narrows nothing). node --import tsx scripts/check-stage.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { loadAtlas } from "../src/catalog/atlas";
import { DEFAULTS } from "../src/plan/planner/config";
import { rank } from "../src/plan/planner/decide";
import { candidatesOf, gearNeeds, gearPieces, piecesFor } from "../src/plan/planner/gear";
import { targetsOf, unhandledOf } from "../src/plan/planner/targets";
import { craftTarget, trainParents, trainPick } from "../src/plan/planner/train";
import { stageOf } from "../src/plan/planner/stage";
import { pickNode } from "../src/plan/planner/pick";
import { levelOf } from "../src/plan/planner/cost";
import { setStageText, stageFile, stagesNow } from "../src/state/stage";
import { item } from "../src/catalog";
import type { Character } from "../src/types/api";
import type { Lane, Stage, Step, World } from "../src/plan/planner/types";
// 038's roles (Second a worker): what this check tests is not Second's role (task 039b made it a fighter)
const ROLES_038 = { ...DEFAULTS.roles, Second: { role: "worker", craft: ["weaponcrafting"], gather: ["woodcutting"] } } as World["config"]["roles"];
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
await loadAtlas();

const lx = (JSON.parse(await readFile("scripts/fixtures/world-2026-11-27-1635.json", "utf8")) as { world: World }).world;
const ALL = ["First", "Fifth", "Second", "Third", "Fourth"];
function worldOf(o: { stages?: Stage[]; market?: World["market"]; current?: World["current"]; patch?: Record<string, Partial<Character>>; blocked?: World["blocked"] } = {}): World {
  return {
    ...lx, current: o.current ?? {}, ...(o.market ? { market: o.market } : {}), ...(o.stages ? { stages: o.stages } : {}),
    blocked: { ...lx.blocked, ...Object.fromEntries(["First", "Fifth"].map((n) => [`src:cyclops_eye@${n}`, { until: lx.now + 864e5, why: "check" }])), ...o.blocked },
    characters: lx.characters.map((c) => ({ ...c, ...o.patch?.[c.name] }) as Character),
    config: { ...DEFAULTS, ...lx.config, on: { ...DEFAULTS.on, ...lx.config.on }, roles: ROLES_038 } as World["config"],
  };
}
const stage = (s: Partial<Stage>): Stage[] => [{ name: "check", fighters: 35, ...s }];
const keys = (w: World): string[] => trainParents(w, "Second", Infinity).map((p) => p.key).sort();
const said = (s: Step): string => `${s.reason?.rule} ${s.target}`;
const sale = (price: number, ref: number): World["market"] => ({ orders: [{ id: "k1", code: "king_slimeball", price, quantity: 500, account: "someone" }], refs: { king_slimeball: { price: ref, n: 30, from: "trades" } }, spent: 0, account: "alverus" });
const cases: [string, boolean, string][] = [];

// ── 1. crafts ──
{
  const w0 = worldOf(), w = worldOf({ stages: stage({ crafts: { weaponcrafting: 28, jewelrycrafting: 30 } }) });
  const lv = (r: ReturnType<typeof rank>, lane: string): string[] => [r.step, ...r.levels.map((c) => c.step)].filter((s) => s.target.startsWith(`lvl:${lane}:`)).map((s) => s.target);
  const past = ["Second", "Third", "Fourth"].flatMap((n) => { const r = rank(n, w); return [...lv(r, "weaponcrafting").filter((k) => Number(k.split(":")[2]) > 28), ...lv(r, "gearcrafting"), ...lv(r, "jewelrycrafting").filter((k) => Number(k.split(":")[2]) > 30)]; });
  cases.push(["1. crafts: at the number (weaponcrafting 28) and not named (gearcrafting) → not trained; under it (jewelrycrafting 26 < 30) → trained; nothing past the number",
    keys(w0).length === 3 && keys(w).join() === "train:jewelrycrafting" && craftTarget(w, "weaponcrafting") === 28 && craftTarget(w, "gearcrafting") === 0 && craftTarget(w, "jewelrycrafting") === 30 && !past.length,
    `no stage: ${keys(w0).join(", ")}; the stage: ${keys(w).join(", ") || "none"}; targets wc ${craftTarget(w, "weaponcrafting")} gc ${craftTarget(w, "gearcrafting")} jc ${craftTarget(w, "jewelrycrafting")}; past the number: ${past.join(", ") || "none"}`]);
}

// ── 2. pieces ──
{
  const sword: World["market"] = { orders: [{ id: "d1", code: "death_knight_sword", price: 5000, quantity: 1, account: "someone" }], refs: { death_knight_sword: { price: 5000, n: 10, from: "trades" } }, spent: 0, account: "alverus" };
  const pieces = (w: World): string[] => [...gearPieces(w, "").keys()].filter((c) => item(c)?.subtype !== "tool").sort();
  const w0 = worldOf(), w = worldOf({ stages: stage({ pieces: ["gold_shield"] }) });
  const b0 = worldOf({ market: sword }), bOff = worldOf({ market: sword, stages: stage({ pieces: ["gold_shield"] }) }), bOn = worldOf({ market: sword, stages: stage({ pieces: ["death_knight_sword"] }) });
  const fifth = (x: World): Character => x.characters.find((c) => c.name === "Fifth")!;
  const bought = (x: World): boolean => candidatesOf(fifth(x), x).bought.has("death_knight_sword");
  cases.push(["2. pieces: off the list → neither a need nor a purchase; on it → both", pieces(w0).length > 1 && pieces(w0).includes("gold_shield") && pieces(w).join() === "gold_shield" && bought(b0) && !bought(bOff) && bought(bOn),
    `no stage: ${pieces(w0).join(", ")}; the stage (gold_shield): ${pieces(w).join(", ") || "none"}; Death Knight Sword on sale — a bought candidate: no stage ${bought(b0)}, off the list ${bought(bOff)}, on it ${bought(bOn)}`]);
}

// ── 3. achievements ──
{
  const w0 = worldOf(), w = worldOf({ stages: stage({ achievements: ["the_reaper", "cultist_purifier"] }) });
  const achs = (x: World): string[] => [...new Set(targetsOf(x).flatMap((t) => (t.achievement ? [t.achievement] : [])))].sort();
  const kills = [...new Set(targetsOf(w).flatMap((t) => (t.work.kind === "kill" ? [t.work.monster] : [])))].sort();
  const objs = ALL.flatMap((n) => rank(n, w).objectives.map((c) => c.target.achievement!));
  const off = objs.filter((a) => !["the_reaper", "cultist_purifier"].includes(a));
  cases.push(["3. achievements: off the list → no candidate, its monster not in the pick's bonus; the tidy still sees every one",
    achs(w0).length > 2 && achs(w).every((a) => ["the_reaper", "cultist_purifier"].includes(a)) && !off.length && kills.every((m) => ["death_knight", "cultist_acolyte"].includes(m)) && targetsOf(w, true).length === targetsOf(w0).length && unhandledOf(w).some((u) => u.why === "not in the stage"),
    `no stage: ${achs(w0).length} achievements; the stage: ${achs(w).join(", ")}; kill monsters (the bonus) ${kills.join(", ")}; objectives off the list ${off.join(", ") || "none"}; all targets ${targetsOf(w, true).length} of ${targetsOf(w0).length}`]);
}

// ── 4. the current stage ──
{
  const ss: Stage[] = [{ name: "a", fighters: 35 }, { name: "b", fighters: 40 }];
  const at = (f: number, g: number): string | undefined => stageOf(worldOf({ stages: ss, patch: { First: { level: f }, Fifth: { level: g } } }))?.name;
  const got = [at(31, 31), at(35, 34), at(35, 35), at(41, 45), at(50, 50)];
  cases.push(["4. the stage advances when the last fighter reaches `fighters`; the last stays (a worker's level reads nothing)", got.join() === "a,a,b,b,b" && stageOf(worldOf({ stages: ss, patch: { Second: { level: 50 } } }))?.name === "a",
    `31/31 ${got[0]}, 35/34 ${got[1]}, 35/35 ${got[2]}, 41/45 ${got[3]}, 50/50 ${got[4]}`]);
}

// ── 5. the file ──
{
  // crafts alone: a listed achievement would narrow the fighters' bundle, and with it the training's score (case 1's world)
  const text = (jc: number, extra = false): string => JSON.stringify({ stages: [{ name: "f", fighters: 35, crafts: { weaponcrafting: 30, gearcrafting: 35, jewelrycrafting: jc }, ...(extra ? { pieces: ["slime_shield", "no_such_piece", "wolf_ears"], achievements: ["the_reaper", "no_such_ach"] } : {}) }] });
  const next = (): string[] => keys({ ...worldOf(), ...((s) => (s ? { stages: s } : {}))(stagesNow()) });
  setStageText(text(30));
  const a = next();
  setStageText(text(26)); // jewelrycrafting at Fourth's level: no longer trained
  const b = next();
  setStageText("{ \"stages\": [ { \"name\": "); // the planning chat mid-edit
  const c = next(), err = stageFile.peek().error;
  setStageText(text(26, true));
  const u = stageFile.peek();
  setStageText(null);
  const none = next();
  cases.push(["5. the file: a change is used by the next decision; a broken one keeps the last good; an unknown code is left out and named; no file, no stage",
    a.includes("train:jewelrycrafting") && !b.includes("train:jewelrycrafting") && c.join() === b.join() && !!err && u.unknown.length === 2 && u.stages![0].pieces!.join() === "slime_shield,wolf_ears" && u.stages![0].achievements!.join() === "the_reaper" && none.length === 3,
    `jewelrycrafting 30: ${a.join(", ")}; 26: ${b.join(", ") || "none"}; broken (${err}): ${c.join(", ") || "none"}; left out: ${u.unknown.join(" · ")}; no file: ${none.join(", ")}`]);
}

// ── 6. gathering ──
{
  // A.4: nothing is built — a worker's free hours already go to its lane's best node: with nothing before it, its step gathers
  // the node pickNode names for its own lane (the fallback, or a listed gathering objective of that node), and `gathering`
  // changes no decision
  const quiet: Partial<Stage> = { crafts: { weaponcrafting: 28, gearcrafting: 30, jewelrycrafting: 26 }, pieces: [], achievements: [] };
  const lanes: Record<string, Lane> = { Second: "woodcutting", Fourth: "mining" };
  const best = (x: World, n: string): string | undefined => { const c = x.characters.find((y) => y.name === n)!; return pickNode(lanes[n], levelOf(c, lanes[n]), c, x)?.resource; };
  const at = (x: World, n: string): string | undefined => { const st = rank(n, x).step; return st.work.kind === "gather" ? st.work.resource : undefined; };
  // task 041: the tidy runs below 40 free (the fixture has 17) and would take Fourth's step first — no bank slots here
  const roomy = (x: World): World => ({ ...x, bankSlots: undefined });
  const rows = [quiet, { ...quiet, achievements: ["expert_lumberjack"] }].flatMap((q) => {
    const w0 = roomy(worldOf({ stages: stage(q) })), w = roomy(worldOf({ stages: stage({ ...q, gathering: { mining: 38, woodcutting: 37 } }) }));
    return Object.keys(lanes).map((n) => ({ n, q: q.achievements!.join() || "none listed", best: best(w0, n), got: at(w0, n), same: rank(n, w0).step.key === rank(n, w).step.key }));
  });
  cases.push(["6. gathering: a worker's free hours already go to its lane's best node — nothing built, `gathering` decides nothing", rows.every((r) => !!r.best && r.got === r.best && r.same),
    rows.map((r) => `${r.n} (${r.q}): gathers ${r.got ?? "no node"}, the lane's best ${r.best}${r.same ? "" : ", the stage's gathering moved it"}`).join("; ")]);
}

// ── 7. a stage that narrows nothing ──
{
  const w0 = worldOf(), w = worldOf({ stages: stage({}) });
  const diff = ALL.filter((n) => { const a = rank(n, w0).step, b = rank(n, w).step; return a.key !== b.key || a.why !== b.why; });
  cases.push(["7. a stage that leaves every field out decides exactly as no stage", !diff.length, `differ: ${diff.join(", ") || "none"}`]);
}

// ── 8, 9. B ──
{
  const fourth = (x: World): Character => x.characters.find((c) => c.name === "Fourth")!;
  const wn = worldOf(), wf = worldOf({ market: sale(20, 20) });
  const pn = trainPick("jewelrycrafting", fourth(wn), wn)?.code, pf = trainPick("jewelrycrafting", fourth(wf), wf)?.code;
  const buys = (x: World): string[] => ["Second", "Third"].filter((n) => rank(n, x).step.target === "buy:king_slimeball");
  cases.push(["8. B.1: a training's kill no worker makes — no market → the next recipe; a fair ask → the recipe stays and a worker buys the drop",
    pn !== "skull_amulet" && !!pn && pf === "skull_amulet" && buys(wf).length > 0, `no market: ${pn}; at 20 (ref 20): ${pf}, bought by ${buys(wf).join(", ") || "nobody"}`]);
  const run: Step = { key: "lvl:jewelrycrafting:30@Fourth#1", target: "lvl:jewelrycrafting:30", character: "Fourth", as: "level", work: { kind: "train", lane: "jewelrycrafting", code: "skull_amulet", runs: 4 }, units: 4, hours: 1, score: 0, why: "check" };
  const wl = worldOf({ market: sale(272, 319), current: { Fourth: run } });
  const r = rank("Second", wl), o = r.market?.find((x) => x.code === "king_slimeball");
  cases.push(["9. B.2: the live ask on a running Skull Amulet step, nobody of ours hunts the drop → rule 2 void, bought",
    o?.rule === 0 && o.why.includes("no source of ours") && r.step.target === "buy:king_slimeball", `offer rule ${o?.rule}: ${o?.why}; Second: ${said(r.step)}`]);
}

// ── 10. task 037: a listed piece pays for itself ──
{
  // stage 1's shape (one piece, the achievements that leave no combat bundle): the slime shield at The Reaper's Death Knight
  // saves Fifth under 15% for minutes of chain — a need by G ≤ H0 − H1, none by 0.85 (HEAD) nor with no stage; the gold shield
  // (the Demon's calendar, 29 h) is the solve's pick there and costs more than it saves — no need
  const A1 = ["ecologist", "the_reaper", "expert_lumberjack", "cabinet_maker", "expert_fisherman", "professional_fisherman", "professional_lumberjack", "professional_miner", "master_fisherman", "master_lumberjack", "master_miner"];
  const asks = (w: World, code: string) => gearNeeds(w, "").needs.filter((n) => n.pieces.has(code));
  const ws = worldOf({ stages: stage({ pieces: ["slime_shield"], achievements: A1 }) }), wg = worldOf({ stages: stage({ pieces: ["gold_shield"], achievements: A1 }) });
  const s = asks(ws, "slime_shield"), g = asks(wg, "gold_shield"), none = asks(worldOf(), "slime_shield");
  const fifth = wg.characters.find((c) => c.name === "Fifth")!, pick = piecesFor(fifth, wg, "death_knight");
  const f = (n: { for: string; work: string; G: number; H0: number; H1: number }): string => `${n.for} ${n.work}: G ${(n.G * 60).toFixed(1)} min, saves ${((n.H0 - n.H1) * 60).toFixed(1)} min of ${n.H0.toFixed(2)} h (${((1 - n.H1 / n.H0) * 100).toFixed(1)}%)`;
  cases.push(["10. task 037: a listed piece that pays for itself is a need though it saves under 15% (none with no stage); one whose chain costs more than it saves is none",
    s.length > 0 && s.every((n) => n.H1 > 0.85 * n.H0 && n.G <= n.H0 - n.H1) && !none.length && pick?.pieces.has("gold_shield") === true && pick.G > 0 && !g.length,
    `slime shield: ${s.map(f).join("; ") || "no need"}; no stage: ${none.length} needs; gold shield: the solve's pick at the Death Knight (G ${pick?.G.toFixed(1)} h) — ${g.map(f).join("; ") || "no need"}`]);
}

let bad = 0;
for (const [name, ok, detail] of cases) { console.log(`${ok ? "ok  " : "FAIL"} ${name}\n     ${detail}`); if (!ok) bad++; }
console.log(bad ? `${bad} of ${cases.length} cases failed` : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
