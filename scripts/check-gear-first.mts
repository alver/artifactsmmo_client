// Task 030 (D.1): weapons before potions — a worker's tier (1) in two halves (decide.ts, GEAR_FIRST / config.gearFirst), on
// one World: the World of 11-26 played 8.38 h with `pick` (scripts/fixtures/world-gear-first.json). There Second holds a
// training's leaf (Hardwood Plank for its Battlestaffs) and a road consumables need (Algae: its Health Potion for Fifth's road,
// scored by its best parent, a kill objective's Water Boost Potion), and Fourth holds the food of Fifth's XP pick (Cooked Trout,
// the Rat) and a potion of a later road monster (Earth Boost Potion, the Owlbear). A candidate is taken away by a block
// (`world.blocked`, a World's own state):
//   1. a training's leaf and a road consumables need both open → `all`: the leaf; `off`: 2d3f66e's choice (the Algae);
//   2. its own craft under the target, the bank not covering a batch (its (1a) leaves blocked) → `all`: the train step;
//   3. (1a) empty (the train step blocked too) → `all`: the consumables need, its own rule (`need-cons`);
//   4. `pick`: the pick's food ranks with the gear work ((1a), `need`), the later monster's potion after it ((1b)); `all`: both (1b).
// On 2d3f66e every case fails. node --import tsx scripts/check-gear-first.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { rank } from "../src/plan/planner/decide";
import type { Candidate } from "../src/plan/planner/decide";
import type { Step, World } from "../src/plan/planner/types";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();

const fx = JSON.parse(await readFile("scripts/fixtures/world-gear-first.json", "utf8")) as { world: World };
const of = (gearFirst: string, blocks: string[] = []): World => ({
  ...fx.world, config: { ...fx.world.config, gearFirst, potions: true, kitchen: false } as World["config"], // task 031: 030's potions and roles
  blocked: { ...fx.world.blocked, ...Object.fromEntries(blocks.map((k) => [k, { until: fx.world.now + 3.6e6, why: "check" }])) },
});
const cands = (r: ReturnType<typeof rank>): Candidate[] => [...r.objectives, ...r.levels, ...r.supply];
const said = (s: Step): string => `${s.target} [${s.reason?.rule}] — ${s.why.slice(0, 110)}`;
const cases: [string, boolean, string][] = [];

// ── 1, 2, 3: Second ──
{
  const off = rank("Second", of("off")).step;
  const ra = rank("Second", of("all"));
  const leaves = cands(ra).filter((c) => c.need && c.train).map((c) => c.target.key);
  cases.push(["1. a training's leaf and a road consumables need open → all: the leaf; off: 2d3f66e's choice", off.target === "src:algae" && off.reason?.rule === "need" && leaves.includes(ra.step.target) && ra.step.reason?.rule === "need",
    `off ${said(off)} | all ${said(ra.step)} | the training's leaves ${leaves.join(", ") || "none"}`]);
  const own = "lvl:weaponcrafting:35@Second";
  const gear = cands(ra).filter((c) => c.need && c.gear).map((c) => `${c.target.key}@Second`);
  const s2 = rank("Second", of("all", gear)).step, o2 = rank("Second", of("off", gear)).step;
  cases.push(["2. its own craft under the target, the bank short of a batch, (1a)'s leaves blocked → all: the train step", gear.length > 0 && s2.key.startsWith(own) && s2.work.kind === "train" && s2.reason?.rule === "need" && o2.target === "src:algae",
    `blocked ${gear.join(", ") || "none"} | all ${said(s2)} | off ${said(o2)}`]);
  const s3 = rank("Second", of("all", [...gear, own])).step;
  cases.push(["3. (1a) empty → all: the consumables need (rule need-cons)", s3.target === "src:algae" && s3.reason?.rule === "need-cons" && s3.why.startsWith("worker, a need (consumables or a tool)"), `all ${said(s3)}`]);
}

// ── 4: Fourth ──
{
  const rp = rank("Fourth", of("pick")), ra = rank("Fourth", of("all"));
  const find = (r: ReturnType<typeof rank>, key: string): Candidate | undefined => cands(r).find((c) => c.target.key === key);
  const trout = find(rp, "mat:cooked_trout"), later = find(rp, "src:yellow_slimeball");
  const blocks = [...cands(rp).filter((c) => c.need && c.gear && c.target.key !== "mat:cooked_trout").map((c) => `${c.target.key}@Fourth`), "lvl:jewelrycrafting:35@Fourth"];
  const sp = rank("Fourth", of("pick", blocks)).step, sa = rank("Fourth", of("all", blocks)).step;
  cases.push(["4. pick: the pick's food ranks with the gear work (1a), the later monster's potion after it (1b)",
    !!trout?.gear && !!later && !later.gear && !find(ra, "mat:cooked_trout")?.gear && sp.target === "mat:cooked_trout" && sp.reason?.rule === "need" && sa.target !== "mat:cooked_trout" && sa.reason?.rule === "need-cons",
    `pick: Cooked Trout (${trout?.step.parent}) (1a) ${!!trout?.gear}, Yellow Slimeball (${later?.step.parent}) (1a) ${!!later?.gear}; all: Cooked Trout (1a) ${!!find(ra, "mat:cooked_trout")?.gear} | (1a)'s gear blocked: pick ${said(sp)} | all ${said(sa)}`]);
}

let bad = 0;
for (const [why, ok, detail] of cases) {
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${why}\n       ${detail}`);
}
console.log(bad ? `FAILED (${bad} of ${cases.length})` : `OK (${cases.length} cases)`);
process.exit(bad ? 1 : 0);
