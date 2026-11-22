// cmp.mjs a.jsonl b.jsonl: every road line equal but the seconds (stats lines left out)
import { readFileSync } from "node:fs";
const read = (f) => readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((l) => l.k !== "stats");
const strip = (l) => { const c = { ...l }; delete c.sec; return JSON.stringify(c); };
const [a, b] = [read(process.argv[2]), read(process.argv[3])];
const diff = a.map((l, i) => (strip(l) === strip(b[i] ?? {}) ? -1 : i)).filter((i) => i >= 0);
console.log(`${a.length} vs ${b.length} lines; ${diff.length ? `differ at ${diff.slice(0, 5).map((i) => a[i].k + (a[i].n ?? "")).join(", ")}` : "equal"}`);
