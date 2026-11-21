// Task 019, settled point 11: the outlook's child for real (src/server/outlook-run.ts) — the one check that starts it.
// On a made-up world (the fleet of docs/design/snapshot/ with the bank of scripts/fixtures/roadmap-fleet.json, all five on,
// First in the middle of a step, 17:00 UTC) with a horizon of six hours it prints `waiting`, `next` and `done` and exits 0
// — the same lines as the road played in this process (two cold runs: the same lines); killed halfway (a horizon of the
// deadline), it is gone and leaves nothing behind; stdin closed before the document is whole, it exits 2.
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { DEFAULTS } from "../src/plan/planner/config";
import { road } from "../src/plan/planner/road";
import type { RoadLine } from "../src/plan/planner/road";
import type { AccountAchievement, BankItem, Character } from "../src/types/api";
import type { Running, World } from "../src/plan/planner/types";

const snap = async (n: string): Promise<any> => JSON.parse(await readFile(`docs/design/snapshot/${n}.json`, "utf8")).data;
const chars = (await snap("characters")) as Character[];
const achievements = (await snap("achievements")) as AccountAchievement[];
const bank = (JSON.parse(await readFile("scripts/fixtures/roadmap-fleet.json", "utf8")) as { bankItems: BankItem[] }).bankItems;
const NOW = Date.UTC(2026, 10, 18, 17, 0, 0);
const world: World = {
  now: NOW, characters: chars, bank, bankGold: 155_976, achievements, events: [], current: {}, costs: {}, blocked: {},
  config: { ...DEFAULTS, on: Object.fromEntries(chars.map((c) => [c.name, true])) },
};
const running: Record<string, Running> = {
  First: { step: { key: "lvl:mining:10@First#1", target: "lvl:mining:10", character: "First", as: "level", work: { kind: "gather", resource: "copper_rocks", drop: "copper_ore" }, units: 100, hours: 1.5, score: 0, why: "made up", place: { x: 2, y: 0, layer: "overworld" } }, startedAt: NOW - 3.6e6, n: 2, run: 2160, progress: 0, movedAt: 0, units: 40 },
};
const input = (until: number): string => JSON.stringify({ world, running, until });

let failed = 0;
const check = (what: string, ok: boolean, more = ""): void => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${more ? ` — ${more}` : ""}`);
  if (!ok) failed++;
};

/** Start the child as the service does (no storage flags), feed it `stdin`; `onLine` may kill it. */
function child(stdin: string, onLine: (l: RoadLine, kill: () => void) => void = () => {}): Promise<{ code: number | null; sig: string | null; lines: RoadLine[]; err: string; pid: number; sec: number }> {
  const t0 = performance.now();
  const c = spawn(process.execPath, ["--import", "tsx", "--disable-warning=ExperimentalWarning", "src/server/outlook-run.ts"], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
  const lines: RoadLine[] = [];
  let out = "", err = "";
  c.stdout.setEncoding("utf8").on("data", (d: string) => {
    out += d;
    for (let i; (i = out.indexOf("\n")) >= 0; out = out.slice(i + 1)) {
      const l = JSON.parse(out.slice(0, i)) as RoadLine;
      lines.push(l);
      onLine(l, () => c.kill());
    }
  });
  c.stderr.setEncoding("utf8").on("data", (d: string) => (err += d));
  c.stdin.on("error", () => {});
  c.stdin.end(stdin);
  return new Promise((ok) => c.on("close", (code, sig) => ok({ code, sig, lines, err: err.trim(), pid: c.pid!, sec: (performance.now() - t0) / 1000 })));
}
const gone = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return false;
  } catch {
    return true;
  }
};
const strip = (ls: RoadLine[]): string => JSON.stringify(ls.map((l) => (l.k === "done" ? { ...l, sec: 0 } : l)));
// the project's root, the child's cwd (not logs/, where a running service renames status.json.tmp every minute, nor the
// runner's scratch directory, where every check writes its .db)
const listing = (): string => readdirSync(process.cwd()).sort().join(",");

// 1. six hours: waiting, next, done, exit 0 — and the same lines as this process's own run of the road
const until = NOW + 6 * 3.6e6;
const before = listing();
const run = child(input(until));
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
const mine: RoadLine[] = [];
road(world, running, until, (l) => mine.push(l));
const r = await run;
const kinds = r.lines.map((l) => l.k);
check("six hours: the child prints waiting, next and done, and exits 0", r.code === 0 && kinds[0] === "waiting" && kinds.includes("next") && kinds[kinds.length - 1] === "done" && !r.err, `${kinds.join(" ")}; exit ${r.code} in ${r.sec.toFixed(1)} s${r.err ? `; stderr: ${r.err.slice(0, 200)}` : ""}`);
check("two runs give the same lines: the child's and this process's (each the first in its process)", strip(r.lines) === strip(mine), `${mine.length} lines`);

// 2. killed halfway (to the deadline: minutes of play) after its first line
let at = "";
const k = await child(input(Date.parse(DEFAULTS.deadline)), (l, kill) => {
  if (at) return;
  at = l.k;
  kill();
});
await new Promise((ok) => setTimeout(ok, 500));
check("killed halfway, it is gone", !!at && k.code !== 0 && gone(k.pid) && !k.lines.some((l) => l.k === "done"), `killed after its ${at} line; exit ${k.code} ${k.sig ?? ""}`);
check("…and it leaves nothing behind (no new file in the project's root)", listing() === before);

// 3. stdin closed before the document is whole
const h = await child(input(until).slice(0, 500));
check("stdin closed before the document is whole: exit 2, no line", h.code === 2 && !h.lines.length, `exit ${h.code}: ${h.err}`);

console.log(failed ? `FAIL — ${failed} check(s)` : `ok — the child: ${r.lines.length} lines in ${r.sec.toFixed(1)} s, killed after "${at}", a half document refused`);
process.exit(failed ? 1 : 0);
