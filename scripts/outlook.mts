// npm run outlook -- [--world <file>] [--days N] [--json]
//
// Task 019: the outlook from a file — a day's snapshot (logs/world/<day>.json, the newest by default: its `world` and the
// `current` of its `planner`) played to the deadline (or N days) by the same function as the service's child
// (src/plan/planner/road.ts). Prints the season line, the next steps per character, the waiting groups with their points
// and the road; --json the road's lines as they come. Starts no child, needs no service, writes no file.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

// api/client.ts reads the token from localStorage at import: a store that keeps nothing (no file is opened)
(globalThis as { localStorage?: unknown }).localStorage ??= { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 };
(globalThis as { fetch: unknown }).fetch = () => Promise.reject(new Error("the outlook makes no request"));

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const file = arg("world") ?? (() => {
  const days = readdirSync("logs/world").filter((f) => /^\d{4}-\d\d-\d\d\.json$/.test(f)).sort();
  if (!days.length) { console.error("no snapshot under logs/world — give one with --world <file>"); process.exit(1); }
  return path.join("logs/world", days[days.length - 1]);
})();
const json = process.argv.includes("--json");

const { setDataReader } = await import("../src/catalog/load");
const { loadCatalog } = await import("../src/catalog");
const { road } = await import("../src/plan/planner/road");
type Line = import("../src/plan/planner/road").RoadLine;
type World = import("../src/plan/planner/types").World;
type Running = import("../src/plan/planner/types").Running;
setDataReader(async (name) => JSON.parse(readFileSync(`public/data/${name}.json`, "utf8")));
await loadCatalog();

const snap = JSON.parse(readFileSync(file, "utf8")) as { t: string; world: World; planner?: { current?: Record<string, Running> } };
const world = snap.world;
const until = arg("days") ? world.now + Number(arg("days")) * 864e5 : Date.parse(world.config.deadline);
if (!Number.isFinite(until)) { console.error("--days: a number"); process.exit(1); }

const t0 = performance.now();
const lines: Line[] = [];
const at: Record<string, number> = {}; // seconds from the start to the first line of a kind (a week: the 7th day line)
road(world, snap.planner?.current ?? {}, until, (l) => {
  const s = Math.round(performance.now() - t0) / 1000;
  if (!(l.k in at)) at[l.k] = s;
  if (l.k === "day" && l.n === 7) at.week = s;
  lines.push(l);
  if (json) console.log(JSON.stringify(l));
});
if (json) process.exit(0);

const day = (t: number): string => new Date(t).toISOString().slice(0, 10);
const name = (code: string): string => world.achievements.find((a) => a.code === code)?.name ?? code;
const get = <K extends Line["k"]>(k: K): Extract<Line, { k: K }> => lines.find((l) => l.k === k) as Extract<Line, { k: K }>;
const waiting = get("waiting"), next = get("next"), done = get("done");
const total = world.achievements.reduce((s, a) => s + a.points, 0);
// the season's badges (bronze, silver, gold) and the points each needs
const TIERS = (JSON.parse(readFileSync("public/data/manifest.json", "utf8")).server.season.rewards as { code: string; type: string; required_points: number; first_only: boolean }[])
  .filter((r) => r.type === "badge" && !r.first_only).map((r): [string, number] => [r.code.split("_").pop()!, r.required_points]);
const crossed = (from: number): [string, number, number][] => {
  let run = from;
  const out: [string, number, number][] = [];
  for (const c of done.completed) {
    const before = run;
    run += c.points;
    for (const [t, p] of TIERS) if (before < p && run >= p) out.push([t, p, c.at]);
  }
  return out;
};
const mem = process.resourceUsage().maxRSS / 1024;

console.log(`# The outlook from ${file} (the World of ${new Date(world.now).toISOString().slice(0, 16)}Z, played to ${new Date(until).toISOString().slice(0, 16)}Z)\n`);
console.log(`**Season**: ${done.points} of ${total} points now; expected ${done.expected} at ${day(until)} by the model (${Math.round((until - world.now) / 864e5)} days); tiers: ${TIERS.map(([t, p]) => `${t} ${p}`).join(", ")}; crossed: ${crossed(done.points).map(([t, , a]) => `${t} on ${day(a)}`).join(", ") || "none"}.`);
console.log(`**The run**: ${done.sec} s, ${done.steps} steps; to \`waiting\` ${at.waiting} s, to \`next\` ${at.next} s, a simulated week ${at.week ?? "—"} s; peak memory ${Math.round(mem)} MB.\n`);

console.log("## Next steps per character");
for (const [who, steps] of Object.entries(next.next)) {
  const r = snap.planner?.current?.[who];
  console.log(`### ${who}${r && !r.over ? ` — now ${r.step.key} (${r.units} of ${r.step.units} units, ${(r.run / 3600).toFixed(1)} of ${r.step.hours.toFixed(1)} h)` : ""}`);
  for (const s of steps) console.log(`- ${new Date(s.at).toISOString().slice(5, 16)}Z ${s.key} (${s.as}, ${s.hours.toFixed(1)} h): ${s.text} — ${s.why}`);
}

console.log("\n## Open achievements by what they wait for");
const onRoad = new Set(done.completed.map((c) => c.code));
const groups = new Map<string, { pts: number; codes: string[] }>();
for (const w of waiting.waiting) {
  const k = onRoad.has(w.achievement) ? "on the road" : w.waits;
  const g = groups.get(k) ?? groups.set(k, { pts: 0, codes: [] }).get(k)!;
  g.pts += w.points;
  g.codes.push(`${w.achievement} ${w.points}${w.why && !onRoad.has(w.achievement) ? ` (${w.why})` : ""}`);
}
console.log("| waits for | points | achievements |\n|---|---|---|");
for (const [k, g] of [...groups].sort((a, b) => b[1].pts - a[1].pts)) console.log(`| ${k} | ${g.pts} | ${g.codes.join(", ")} |`);
const open = waiting.waiting.reduce((s, w) => s + w.points, 0);
console.log(`\nDone ${done.points} + open ${open} (of it on the road ${groups.get("on the road")?.pts ?? 0}) = ${done.points + open} of ${total}${done.points + open === total ? "" : ` — ${total - done.points - open} missing`}.\n`);

console.log("## The road");
console.log("| # | day | in | achievement | points | total |\n|---|---|---|---|---|---|");
let run = done.points;
done.completed.forEach((c, i) => {
  const before = run;
  run += c.points;
  for (const [t, p] of TIERS) if (before < p && run >= p) console.log(`| | | | **${t} (${p}) crossed** | | |`);
  console.log(`| ${i + 1} | ${day(c.at)} | ${((c.at - world.now) / 864e5).toFixed(1)} d | ${name(c.code)} | ${c.points} | ${run} |`);
});
if (!done.completed.length) console.log("| | | | nothing completes by then | | |");
console.log(`\nBy day: ${done.byDay.filter((_, i) => i % 7 === 6 || i === done.byDay.length - 1).map((d) => `${d.day} ${d.points}`).join(", ")}`);
