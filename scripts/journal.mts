// npm run journal -- [--from <ISO>] [--to <ISO>] [--dir <dir> | --file <file.jsonl>]
//
// Task 016: the reader of the journal (docs/journal.md). Read-only over <dir>/<day>.jsonl (default logs/journal) or one
// file, the last 24 hours by default (--from / --to take any ISO time, UTC). Prints, as markdown, what section 1 of the reports 010–015
// printed from the raw log: the restarts; per character the steps in order; every block, flap, no step, defect, stopped
// queue, pause and removed interrupt; the interrupts; lost fights by step; the samples against their estimates; where the
// time goes per character (the meter's groups); what each kill step planned to drink and eat against what it did; the
// events and the spawn ratio; the levels; the achievements; the bank's lines; (task 017) what was spent. Writes nothing.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { SPAWN_LOG } from "../src/plan/planner/config";

type Rec = { t: string; run: string; k: string } & Record<string, any>;
const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const file = arg("file");
const dir = file ? path.dirname(file) : arg("dir") ?? "logs/journal";
const to = arg("to") ? Date.parse(arg("to")!) : Date.now();
const from = arg("from") ? Date.parse(arg("from")!) : to - 24 * 3_600_000;
if (!Number.isFinite(from) || !Number.isFinite(to)) { console.error("--from / --to: an ISO time, e.g. 2026-11-21T09:00Z"); process.exit(1); }

const day = (t: number): string => new Date(t).toISOString().slice(0, 10);
let names: string[] = [];
try {
  // a day's file is named by its day; a window's files are its days (and the day before: a record is filed by its own time)
  names = file ? [path.basename(file)] : readdirSync(dir).filter((f) => /^\d{4}-\d\d-\d\d\.jsonl$/.test(f) && f.slice(0, 10) >= day(from - 864e5) && f.slice(0, 10) <= day(to)).sort();
} catch {
  console.error(`no journal at ${dir}`);
  process.exit(1);
}
const recs: Rec[] = [];
let bad = 0;
for (const f of names) for (const l of readFileSync(path.join(dir, f), "utf8").split("\n")) {
  if (!l.trim()) continue;
  try {
    const r = JSON.parse(l) as Rec;
    const t = Date.parse(r.t);
    if (t >= from && t <= to) recs.push(r);
  } catch {
    bad++;
  }
}
const of = (k: string): Rec[] => recs.filter((r) => r.k === k);
const items = new Map<string, { type: string; name: string }>(
  (JSON.parse(readFileSync("public/data/items.json", "utf8")) as { code: string; type: string; name: string }[]).map((i) => [i.code, i]),
);
const events = JSON.parse(readFileSync("public/data/events.json", "utf8")) as { code: string; rate: number; duration: number }[];

const hm = (t: string): string => t.slice(5, 10) + " " + t.slice(11, 19);
const h1 = (s: number): string => (s / 3600).toFixed(2);
const pct = (x: number, all: number): string => (all > 0 && x > 0 ? `${((100 * x) / all).toFixed(1)}%` : "0");
const codes = (o?: Record<string, number>): string => (o && Object.keys(o).length ? Object.entries(o).map(([c, n]) => `${c} ${Math.round(n * 10) / 10}`).join(", ") : "—");
const cell = (s: unknown): string => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
function table(head: string[], rows: unknown[][]): void {
  if (!rows.length) return void console.log("none\n");
  console.log(`| ${head.join(" | ")} |\n|${head.map(() => "---").join("|")}|`);
  for (const r of rows) console.log(`| ${r.map(cell).join(" | ")} |`);
  console.log("");
}

const first = recs[0]?.t, last = recs[recs.length - 1]?.t;
console.log(`# The journal ${new Date(from).toISOString().slice(0, 16)}Z → ${new Date(to).toISOString().slice(0, 16)}Z`);
console.log(`${recs.length} records in ${names.length} file(s) of ${dir}${first ? `, ${hm(first)} → ${hm(last!)}` : ""}${bad ? `; ${bad} line(s) not JSON` : ""}\n`);

// ── the restarts ─────────────────────────────────────────────────────────────
console.log("## Restarts");
table(["time", "run", "commit", "mode", "per character"], of("boot").map((b) => [hm(b.t), b.run, `${(b.commit ?? "?").slice(0, 7)}${b.branch ? ` (${b.branch})` : ""}`, b.dev ? "dev" : "prod",
  Object.entries(b.chars ?? {}).map(([n, c]: [string, any]) => `${n}: ${c.step ? `re-attached ${c.step}` : c.took ? `took over (dropped ${c.took.length})` : "free"}${c.ints?.length ? `, ${c.ints.length} interrupt(s) queued` : ""}`).join("; ")]));

// ── the steps ────────────────────────────────────────────────────────────────
// a key comes back (`#n` counts the consecutive chunks of a target): an end belongs to the latest step of its key before it
// that has no end yet, of its own run — or of an earlier run when it is partial (re-attached after a restart)
const endOf = new Map<Rec, Rec>();
const ended = new Set<Rec>();
const stepsR = of("step").reverse();
for (const e of of("end")) {
  const s = stepsR.find((x) => x.key === e.key && x.who === e.who && x.t <= e.t && !endOf.has(x) && (x.run === e.run || e.partial));
  if (s) { endOf.set(s, e); ended.add(e); }
}
const ends = { get: (s: Rec): Rec | undefined => endOf.get(s) };
const whos = [...new Set(recs.map((r) => r.who).filter((w): w is string => typeof w === "string"))].sort();
console.log("## Steps per character");
console.log("Units planned / done; hours planned / taken (wall) / running; a supply step's parent. `partial`: re-attached after a restart.\n");
for (const who of whos) {
  const rows: unknown[][] = [];
  for (const s of of("step").filter((x) => x.who === who)) {
    const e = ends.get(s);
    rows.push([hm(s.t), s.key, s.as, `${s.units} / ${e ? e.units : "…"}`, `${s.h.toFixed(2)} / ${e ? h1(e.wall) : "…"} / ${e ? h1(e.ran) : "…"}`,
      e ? `${e.how}${e.why ? `: ${e.why}` : ""}${e.partial ? " (partial)" : ""}` : "running", s.parent ?? (s.for ? `for ${s.for}` : "")]);
  }
  for (const e of of("end").filter((x) => x.who === who && !ended.has(x))) {
    rows.push([`(${hm(e.t)})`, e.key, "", `${e.of} / ${e.units}`, `${(e.plan / 3600).toFixed(2)} / ${h1(e.wall)} / ${h1(e.ran)}`, `${e.how}${e.why ? `: ${e.why}` : ""}${e.partial ? " (partial)" : ""}`, "decided before the window"]);
  }
  console.log(`### ${who}`);
  table(["time", "key", "answer", "units", "hours", "ended", "parent"], rows);
}

// ── the notable lines ────────────────────────────────────────────────────────
console.log("## Blocks, flaps, no step, defects, stopped queues, pauses, removed interrupts");
const notable = recs.filter((r) => ["block", "flap", "nostep", "defect", "stopped", "pause"].includes(r.k) || (r.k === "int-end" && r.how === "removed"));
table(["time", "who", "kind", "what"], notable.map((r) => [hm(r.t), r.who ?? "", r.k,
  r.k === "block" ? `${r.target}${r.all ? ` for everyone (lanes ${r.lanes?.join(", ") || "—"})` : ""} until ${hm(r.until)} — ${r.why} (strike ${r.strikes})`
  : r.k === "flap" ? `${r.target ?? `the ceiling, ${r.targets} targets`}: ${r.n} starts in 10 min, until ${hm(r.until)}`
  : r.k === "pause" ? `${r.item} [${r.id}]: ${r.err}`
  : r.k === "int-end" ? `${r.cls} ${r.what}: ${r.why}`
  : r.k === "stopped" ? r.head : r.why ?? r.what]));

// ── the interrupts ───────────────────────────────────────────────────────────
console.log("## Interrupts");
const ints = of("int-end");
table(["time", "who", "class", "what", "ended", "s", "actions", "offerings"], ints.map((r) => [hm(r.t), r.who, r.cls, r.what, `${r.how}${r.partial ? " (partial)" : ""}`, r.s,
  r.m ? Object.entries(r.m.n).map(([k, n]) => `${k} ${n}`).join(", ") : "—",
  r.off ? `done: ${r.off.done.join(", ") || "—"}${Object.keys(r.off.open).length ? `; not: ${Object.entries(r.off.open).map(([c, w]) => `${c} (${w})`).join(", ")}` : ""}` : ""]));
const open = of("int").filter((i) => !ints.some((e) => e.who === i.who && e.cls === i.cls && e.what === i.what && e.t >= i.t));
if (open.length) console.log(`Still open at the window's end: ${open.map((i) => `${i.who} ${i.cls} ${i.what} (${hm(i.t)})`).join(", ")}\n`);

// ── lost fights ──────────────────────────────────────────────────────────────
console.log("## Fights lost, by step and interrupt");
table(["time", "who", "step or interrupt", "won", "lost"], [...of("end"), ...ints].filter((r) => r.m?.lost).map((r) => [hm(r.t), r.who, r.key ?? `${r.cls} ${r.what}`, r.m.won ?? 0, r.m.lost]));

// ── samples ──────────────────────────────────────────────────────────────────
console.log("## Samples against their estimates");
table(["time", "who", "key", "this step", "estimate", "÷", "mean (n)"], of("sample").map((s) => [hm(s.t), s.who, s.key, `${s.s} s × ${s.units}`, `${s.est} s`, s.est ? (s.s / s.est).toFixed(2) : "—", `${s.mean} s (${s.n})`]));
if (of("slow").length) console.log(`Slower than expected: ${of("slow").map((s) => `${s.key} ${s.mean} s against ${s.est} s (${hm(s.t)})`).join("; ")}\n`);

// ── where the time goes ──────────────────────────────────────────────────────
console.log("## Where the time goes (the meter: steps' and interrupts' ends in the window)");
const G = ["fight", "rest", "eat", "bank", "walk", "gear", "gather", "craft", "trade", "task", "other", "wait"];
const rows: unknown[][] = [];
for (const who of whos) {
  const ms = [...of("end"), ...ints].filter((r) => r.who === who && r.m);
  const all = ms.reduce((s, r) => s + r.m.s, 0);
  if (!all) continue;
  const by = (g: string): number => ms.reduce((s, r) => s + (r.m.by[g] ?? 0), 0);
  const inInt = ints.filter((r) => r.who === who && r.m).reduce((s, r) => s + r.m.s, 0);
  rows.push([who, h1(all), ...G.map((g) => pct(by(g), all)), pct(inInt, all)]);
}
table(["who", "hours", ...G, "in interrupts"], rows);

// ── kill steps: planned against done ─────────────────────────────────────────
console.log("## Kill steps: what they planned to drink and eat, against what they did");
const isCons = (c: string): boolean => ["utility", "consumable"].includes(items.get(c)?.type ?? "");
table(["time", "who", "key", "kills", "planned (withdraw)", "withdrawn", "drunk", "eaten", "left", "rest s"], of("step").filter((s) => s.work?.kind === "kill").map((s) => {
  const e = ends.get(s);
  const plan = Object.fromEntries(Object.entries(s.wd ?? {}).filter(([c]) => isCons(c))) as Record<string, number>;
  const wd = Object.fromEntries(Object.entries(e?.m?.wd ?? {}).filter(([c]) => isCons(c))) as Record<string, number>;
  const left = Object.fromEntries(Object.keys(wd).map((c) => [c, wd[c] - (e?.m?.drunk?.[c] ?? 0) - (e?.m?.used?.[c] ?? 0)]).filter(([, n]) => (n as number) > 0));
  return [hm(s.t), s.who, s.key, e ? `${e.units} of ${s.units}${e.m?.lost ? `, ${e.m.lost} lost` : ""}` : `${s.units} planned`, codes(plan), e ? codes(wd) : "…", e ? codes(e.m?.drunk) : "…", e ? codes(e.m?.used) : "…", e ? codes(left) : "…", e?.m?.by?.rest ?? "—"];
}));

// ── events ───────────────────────────────────────────────────────────────────
console.log("## Events");
const ev = of("event");
table(["time", "spawn", "tile", "until", "verdict"], ev.map((r) => [hm(r.t), r.code, (r.at ?? []).join(", "), r.until ? hm(r.until) : "", r.verdict]));
const spawns = new Set(ev.map((r) => r.key)).size;
const span = first && last ? (Date.parse(last) - Date.parse(first)) / 3_600_000 : 0;
const expected = events.reduce((s, e) => s + (span * 60) / (e.rate + e.duration), 0);
console.log(`The spawn ratio: ${spawns} distinct spawn(s) seen in ${span.toFixed(1)} h of journal; the docs expect ${expected.toFixed(1)} ± ${Math.sqrt(expected).toFixed(1)} (a 1/rate chance a minute while not up)${spawns ? `: expected ÷ seen = ${(expected / spawns).toFixed(2)}` : ""}, beside SPAWN_LOG ${SPAWN_LOG}. (A spawn is seen only while the service is up.)\n`);

// ── levels, achievements, the bank, the config ───────────────────────────────
console.log("## Levels");
table(["time", "who", "skill", "level"], of("level").map((r) => [hm(r.t), r.who, r.skill, r.lv]));
console.log("## Achievements");
table(["time", "what"], of("ach").map((r) => [hm(r.t), r.claim ? `${r.who} claimed ${r.claim}: ${codes(r.items)}${r.gold ? `, ${r.gold} gold` : ""}` : `completed ${r.code} (+${r.pts}; the account ${r.total})`]));
console.log("## The bank");
table(["time", "what", "used / slots (free)", "next", "gold", "the rest"], of("bank").map((r) => [hm(r.t), r.what, r.slots != null && !Array.isArray(r.slots) ? `${r.used ?? "?"} / ${r.slots} (${r.free ?? r.slots - r.used})` : Array.isArray(r.slots) ? `slots ${r.slots.join(" → ")}` : "", r.next ?? "", r.gold ?? "",
  [r.who, r.price != null ? `price ${r.price}` : "", r.codes?.join(", "), r.why, r.outdated ? `outdated: ${codes(r.outdated)}` : "", r.bags?.length ? `kept in bags: ${r.bags.join(", ")}` : ""].filter(Boolean).join("; ")]));
// ── task 017, settled point 12: what was spent ──────────────────────────────
console.log("## Spent");
const spends = of("spend");
table(["time", "who", "what", "code", "quantity", "for"], spends.map((r) => [hm(r.t), r.who, r.what, r.code, r.q ?? "?", [r.for, r.via ? `at ${r.via}` : "", r.item ? `for ${r.item}` : ""].filter(Boolean).join("; ")]));
if (spends.length) {
  const sum = new Map<string, number>();
  for (const r of spends) sum.set(`${r.what} ${r.code}`, (sum.get(`${r.what} ${r.code}`) ?? 0) + (r.q ?? 0));
  console.log(`In all: ${[...sum].map(([k, q]) => `${k} ${q}`).join(", ")}\n`);
}
if (of("config").length) {
  console.log("## Config");
  table(["time", "what"], of("config").map((r) => [hm(r.t), r.patch ? `patch ${JSON.stringify(r.patch)}` : `${r.who} ${r.on ? `on${r.dropped?.length ? `, dropped ${r.dropped.length} item(s)` : ""}` : "handed back"}`]));
}
if (of("server").length) {
  console.log("## Server errors");
  table(["time", "what"], of("server").map((r) => [hm(r.t), `${r.what}: ${r.err}`]));
}
