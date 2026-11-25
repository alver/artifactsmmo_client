// Task 028 (D.1): the data of the one page.
//   A.1 the reason in parts — every step's why on three fixture Worlds is 027g's to the letter (scripts/whys.mts against
//       scripts/fixtures/whys-027g.json, recorded on c03bff4), and its rule is the one the why's head names; a fighter's XP
//       pick, a worker's need and a craft-ahead step carry the rule, the goal and the limits;
//   A.2 the road's lines carry the levels and the gear made, and two cold runs (two processes) give the same lines;
//   A.3 the needs line on made-up Worlds: a piece that waits for a craft level, one that waits for a material;
//   A.4 the 24-hour signal from made-up records: the seconds add up, a restart (the files read back) keeps it.
// node --import tsx scripts/check-onepage.mts
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { whysOf } from "./whys.mts";

const ROAD = process.env.AMMO_ONEPAGE_ROAD; // a child: play the road and print its lines
const cases: [string, boolean, string][] = [];
const ok = (name: string, pass: boolean, said = ""): void => void cases.push([name, pass, said]);

async function roadLines(): Promise<string[]> {
  const { setDataReader } = await import("../src/catalog/load");
  const { loadCatalog } = await import("../src/catalog");
  const { road } = await import("../src/plan/planner/road");
  setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
  await loadCatalog();
  const live = JSON.parse(await readFile("scripts/fixtures/world-2026-11-25.json", "utf8")).world;
  // four hours before midnight, so a day line comes early
  const world = { ...live, now: Date.parse("2026-11-24T20:00:00Z") };
  const out: string[] = [];
  road(world, {}, world.now + 12 * 3.6e6, (l) => out.push(JSON.stringify({ ...l, ...("sec" in l ? { sec: 0 } : {}) })));
  return out;
}
if (ROAD) {
  process.stdout.write((await roadLines()).join("\n") + "\n");
  process.exit(0);
}

/** A cold run: a process of its own. */
const cold = (): Promise<string> => new Promise((res, rej) => {
  const args = process.execArgv.filter((a) => !/^--(experimental-webstorage|localstorage-file)/.test(a)); // no storage: whys.mts stubs it
  const c = spawn(process.execPath, [...args, process.argv[1]], { env: { ...process.env, AMMO_ONEPAGE_ROAD: "1" }, stdio: ["ignore", "pipe", "inherit"] });
  let s = "";
  c.stdout.setEncoding("utf8").on("data", (d: string) => (s += d));
  c.on("exit", (code) => (code === 0 ? res(s) : rej(new Error(`the road's child exited with ${code}`))));
});
const runs = Promise.all([cold(), cold()]);

// ── A.1 ──
const steps: { w: string; step: any }[] = [];
const whys = await whysOf(".", 12, (w, step) => steps.push({ w, step }));
const gold = JSON.parse(await readFile("scripts/fixtures/whys-027g.json", "utf8")) as typeof whys;
const differ = whys.map((x, i) => (JSON.stringify(x) === JSON.stringify(gold[i]) ? -1 : i)).filter((i) => i >= 0);
ok("A.1 every why is 027g's to the letter", whys.length === gold.length && !differ.length, `${whys.length} whys, ${gold.length} recorded; differ: ${differ.slice(0, 3).map((i) => `${whys[i]?.key}: ${whys[i]?.why.slice(0, 80)}`).join(" | ")}`);
const HEAD: [RegExp, string][] = [[/^fighter: the XP pick/, "xp-pick"], [/^fighter, first/, "first"], [/^fighter, forging/, "forging"], [/^fighter, a need's kill/, "need-kill"], [/^fighter, (no fight admitted|at the level cap)/, "free"],
  [/^worker, a need/, "need"], [/^worker, done within/, "short"], [/^worker, craft to/, "craft-ahead"], [/^worker: fallback/, "fallback"], [/^worker: /, "today"], [/^tidy:/, "tidy"], [/^fallback/, "fallback"]];
const wrong = steps.filter(({ step }) => {
  const want = HEAD.find(([re]) => re.test(step.why))?.[1];
  return !step.reason || (want ? step.reason.rule !== want : !["today", "first"].includes(step.reason.rule));
});
ok("A.1 every step has a reason, its rule the one its why's head names", !wrong.length, wrong.slice(0, 3).map(({ step }) => `${step.key}: ${step.reason?.rule} — ${step.why.slice(0, 60)}`).join(" | "));
const first = (rule: string): any => steps.find(({ step }) => step.reason?.rule === rule)?.step;
const pick = first("xp-pick"), need = first("need"), ahead = first("craft-ahead");
ok("A.1 a fighter's XP pick: role, goal to the cap, for itself, the rate and the verdict", !!pick && pick.reason.role === "fighter" && /^combat \d+ → 50$/.test(pick.reason.goal) && pick.reason.for === pick.character
  && pick.reason.because.some((b: string) => /XP\/s/.test(b)) && pick.reason.because.some((b: string) => /^wins \d+% of fights, \d+ s a win$/.test(b)), JSON.stringify(pick?.reason));
ok("A.1 a worker's need: role, rule, goal, for whom", !!need && need.reason.role === "worker" && !!need.reason.goal && !!need.reason.for, JSON.stringify(need?.reason));
ok("A.1 a craft-ahead step: its goal is the craft to the fighters' next tier", !!ahead && /^\w+ \d+ → \d+$/.test(ahead.reason.goal) && ahead.reason.for === "the fighters' next tier", JSON.stringify(ahead?.reason));
const lim = steps.find(({ step }) => step.reason?.limits.some((l: string) => /^rests \(|from the bank/.test(l)))?.step;
ok("A.1 the limits: what a fight takes from the bank, or why it rests", !!lim, JSON.stringify(lim?.reason?.limits));
const nx = steps.filter(({ step }) => step.reason?.next?.length);
ok("A.1 the candidates ranked next: at most three, each a text and a score", nx.length > 0 && nx.every(({ step }) => step.reason.next.length <= 3 && step.reason.next.every((n: any) => n.text && n.score > 0)), `${nx.length} steps with candidates`);

// ── A.2 ──
const [r1, r2] = await runs;
const lines = r1.trim().split("\n").map((l) => JSON.parse(l));
const day = lines.find((l) => l.k === "day"), done = lines.find((l) => l.k === "done");
const nine = (lv: Record<string, number[]> | undefined): boolean => !!lv && Object.keys(lv).length === 5 && Object.values(lv).every((v) => v.length === 9 && v.every((x) => x > 0));
ok("A.2 a day line carries each character's nine levels", nine(day?.levels), JSON.stringify(day?.levels));
ok("A.2 done carries the start's levels, the levels by day, the crafters", nine(done?.start) && done.byDay.every((d: any) => nine(d.levels)) && Object.keys(done.crafters ?? {}).length === 3, JSON.stringify(done?.crafters));
ok("A.2 done carries the gear made, each with when, what, by whom", done?.made?.length > 0 && done.made.every((m: any) => m.at > done.from && m.at <= done.until && m.code && m.by && m.n >= 1), JSON.stringify(done?.made));
ok("A.2 a pick change names its monsters", (done?.picks ?? []).every((p: any) => p.to && p.from !== p.to), JSON.stringify(done?.picks));
ok("A.2 two cold runs give the same lines", r1 === r2 && lines.length > 3, `${lines.length} lines`);

// ── A.3 ── (the catalog of this file's own module instances: whysOf imported its own by path)
{
  const { setDataReader } = await import("../src/catalog/load");
  const { loadCatalog } = await import("../src/catalog");
  const { needsOf } = await import("../src/plan/planner/needs");
  setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
  await loadCatalog();
  const live = JSON.parse(await readFile("scripts/fixtures/world-2026-11-25.json", "utf8")).world;
  // the World of 11-25 with Second's weaponcrafting 15: the tools ask 20, the Steel Axe's Ogre Eyes are short
  const w = { ...live, characters: live.characters.map((c: any) => (c.name === "Second" ? { ...c, weaponcrafting_level: 15 } : c)) };
  const rows = needsOf(w);
  const lv = rows.find((r) => r.craft && r.craft.level < r.craft.asked);
  const mat = rows.find((r) => r.short.some((x) => x.source === "kill" && x.who.length > 0 && x.qty > 0));
  ok("A.3 a need that waits for a craft level: the skill, the crafter, its level against the one asked", !!lv && lv.craft!.crafter === "Second" && lv.craft!.level === 15 && lv.craft!.asked === 20, JSON.stringify(rows.map((r) => [r.key, r.craft])));
  ok("A.3 a need that waits for a material: its source and who may do it", !!mat && /^gear:/.test(mat.key), JSON.stringify(rows.map((r) => [r.key, r.short])));
  ok("A.3 each row says what, for whom, what it gives; the ones nobody works on first", rows.length > 0 && rows.every((r) => r.code && r.for.length && /H0 .* h, with it .* to make/.test(r.gives))
    && rows.every((r, i) => !i || !rows[i - 1].workers.length || r.workers.length > 0), JSON.stringify(rows.map((r) => [r.key, r.workers])));
}

// ── A.4 ──
{
  const { fileSinks, journal } = await import("../src/lib/journal");
  const { fold, hydrateLast24, last24 } = await import("../src/state/last24");
  const files = new Map<string, string>();
  fileSinks({ append: (p, t) => void files.set(p, (files.get(p) ?? "") + t), replace: (p, t) => void files.set(p, String(t)), exists: (p) => files.has(p), read: (p) => files.get(p) }, "logs");
  journal("boot", {});
  journal("step", { who: "Ann", key: "lvl:combat:12@Ann#1", target: "lvl:combat:12", as: "level", text: "Fight Chicken ×20" });
  journal("loss", { who: "Ann", monster: "chicken" });
  journal("level", { who: "Ann", skill: "combat", lv: 12 });
  journal("end", { who: "Ann", key: "lvl:combat:12@Ann#1", units: 20, of: 20, ran: 1000, plan: 900, how: "done", m: { s: 1000.5, by: { fight: 600, rest: 200.2, eat: 50, walk: 100, bank: 30, wait: 20.3 }, xp: { combat: 5000 }, won: 19 } });
  journal("end", { who: "Bob", key: "src:ash_wood@Bob#1", units: 10, of: 104, ran: 300, plan: 2400, how: "blocked", m: { s: 400, by: { gather: 250, trade: 20, task: 10, other: 5, wait: 115 }, xp: { woodcutting: 900 } } });
  const live = last24.value, ann = live.by.Ann, bob = live.by.Bob;
  const sum = (o: Record<string, number>): number => Object.values(o).reduce((x, y) => x + y, 0);
  ok("A.4 the seconds by activity add up to the metered seconds", !!ann && !!bob && Math.abs(sum(ann.by) - ann.s) < 0.2 && Math.abs(sum(bob.by) - bob.s) < 0.2 && ann.by.eating === 50 && bob.by.other === 35, JSON.stringify({ ann: ann?.by, bob: bob?.by }));
  ok("A.4 XP by skill, an hour, levels, fights won and lost", ann?.xp.combat === 5000 && ann.xpH.combat === Math.round(5000 / (1000.5 / 3600)) && ann.won === 19 && ann.lost === 1 && ann.levels.length === 1 && ann.levels[0].lv === 12 && bob?.xp.woodcutting === 900, JSON.stringify(ann));
  ok("A.4 the last steps: its text and answer from its step record, how it ended, hours against plan", ann?.steps[0]?.text === "Fight Chicken ×20" && ann.steps[0].as === "level" && bob?.steps[0]?.how === "blocked" && bob.steps[0].text === "src:ash_wood" && bob.steps[0].plan === 2400, JSON.stringify([ann?.steps, bob?.steps]));
  const old = { t: new Date(Date.now() - 25 * 3_600_000).toISOString(), k: "end", who: "Ann", key: "x@Ann#1", m: { s: 99, by: { fight: 99 } } };
  ok("A.4 a record older than 24 hours is left out", fold([old], Date.now()).by.Ann === undefined);
  const before = JSON.stringify(live.by);
  hydrateLast24(); // a restart: the signal from the files alone
  ok("A.4 a restart keeps it: the day's files read back give the same signal", JSON.stringify(last24.value.by) === before, `${JSON.stringify(last24.value.by).slice(0, 200)} against ${before.slice(0, 200)}`);
}

console.log(`${cases.filter((c) => c[1]).length}/${cases.length} cases`);
for (const [n, p, s] of cases) console.log(`${p ? "ok  " : "FAIL"} ${n}${p ? "" : ` — ${s.slice(0, 400)}`}`);
if (cases.some((c) => !c[1])) process.exit(1);
