// believe.mts --tree <dir> --world <file> --fought a,b,c --held a,b <run.jsonl>...: settled point 7 — the points a run gains,
// split by what play has shown: gathering, crafting and tasks only; kills of monsters the fleet has fought with the plan's
// potions holding (--held); kills of monsters fought where they did not hold; kills never fought; event work; behind a toll.
// An achievement goes to the first group of: toll (a layer gate on a target or a material), event (an event gate), kills
// (a kill or drop objective, a kill-sourced material, a combat level: its monsters — for a combat level the run's kills),
// else gathering/crafting/tasks.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
(globalThis as any).localStorage ??= { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 };
(globalThis as any).fetch = () => Promise.reject(new Error("no request"));
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const tree = arg("tree")!;
process.chdir(tree);
const imp = (p: string) => import(pathToFileURL(`${tree}/${p}`).href);
const { setDataReader } = await imp("src/catalog/load.ts");
const cat = await imp("src/catalog/index.ts");
const { targetsOf } = await imp("src/plan/planner/targets.ts");
const { billOf } = await imp("src/plan/planner/supply.ts");
setDataReader(async (name: string) => JSON.parse(readFileSync(`${tree}/public/data/${name}.json`, "utf8")));
await cat.loadCatalog();
const world = JSON.parse(readFileSync(arg("world")!, "utf8")).world;
const fought = new Set(arg("fought")!.split(",")), held = new Set(arg("held")!.split(","));
const files = process.argv.slice(2).filter((a, i, all) => a.endsWith(".jsonl"));
const byAch = new Map<string, any[]>();
for (const t of targetsOf(world)) if (t.achievement) byAch.set(t.achievement, [...(byAch.get(t.achievement) ?? []), t]);
function classify(code: string, runKills: Record<string, number>): { group: string; monsters: string[] } {
  const ts = byAch.get(code) ?? [];
  const gates: any[] = [], monsters = new Set<string>();
  for (const t of ts) {
    gates.push(...t.gates);
    if (t.work.kind === "kill") monsters.add(t.work.monster);
    for (const i of t.inputs ?? []) {
      const leaves = i.source.kind === "craft" ? [...billOf(world, "", [[i.code, i.per * Math.max(1, t.left)]], undefined, false).leaves.values()] : [{ work: i.source, gates: i.gates }];
      for (const l of leaves) { gates.push(...l.gates); if (l.work.kind === "kill") monsters.add(l.work.monster); }
    }
    if (t.work.kind === "level" && t.work.lane === "combat") for (const m of Object.keys(runKills)) monsters.add(m);
  }
  const a = world.achievements.find((x: any) => x.code === code);
  if (a?.objectives.some((o: any) => o.type === "combat_level")) for (const m of Object.keys(runKills)) monsters.add(m);
  if (gates.some((g) => g.kind === "layer")) return { group: "behind a toll", monsters: [...monsters] };
  if (gates.some((g) => g.kind === "event")) return { group: "event work", monsters: [...monsters] };
  if (monsters.size) {
    const ms = [...monsters];
    if (ms.some((m) => !fought.has(m))) return { group: "kills never fought", monsters: ms.filter((m) => !fought.has(m)) };
    if (ms.some((m) => !held.has(m))) return { group: "kills fought, potions did not hold", monsters: ms.filter((m) => !held.has(m)) };
    return { group: "kills fought, potions held", monsters: ms };
  }
  return { group: "gathering, crafting, tasks", monsters: [] };
}
for (const f of files) {
  const L = readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const done = L.find((l) => l.k === "done"), stats = L.find((l) => l.k === "stats");
  if (!done) { console.log(`${f}: not done`); continue; }
  const g: Record<string, { pts: number; codes: string[] }> = {};
  for (const c of done.completed) {
    const k = classify(c.code, stats?.kills ?? {});
    (g[k.group] ??= { pts: 0, codes: [] }).pts += c.points;
    g[k.group].codes.push(`${c.code}${k.monsters.length && k.group !== "gathering, crafting, tasks" ? ` [${k.monsters.join(" ")}]` : ""}`);
  }
  console.log(`\n${f.split("/").pop()}: start ${done.points}, end ${done.expected}`);
  for (const [k, v] of Object.entries(g).sort((a, b) => b[1].pts - a[1].pts)) console.log(`- ${k}: +${v.pts} — ${v.codes.join(", ")}`);
}
process.exit(0);
