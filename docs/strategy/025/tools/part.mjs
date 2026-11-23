// part.mjs <a.dec.jsonl> <b.dec.jsonl> [day0 ISO]: where run b's decisions first part from run a's — compared by when, who,
// the step's key, its answer and its units (a why reworded by the task is no parting); prints both steps and their whys.
import { readFileSync } from "node:fs";
const [fa, fb, d0] = process.argv.slice(2);
const read = (f) => readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const a = read(fa), b = read(fb);
const id = (d) => `${d.at}|${d.who}|${d.key}|${d.as}|${d.units}`;
let i = 0;
for (; i < Math.min(a.length, b.length); i++) if (id(a[i]) !== id(b[i])) break;
const t0 = Date.parse(d0 ?? new Date(a[0].at).toISOString().slice(0, 10));
const day = (t) => Math.floor((t - t0) / 864e5) + 1;
console.log(`equal for ${i} decisions of ${a.length} and ${b.length}; the first that differs:`);
for (const [n, x] of [[fa, a[i]], [fb, b[i]]]) if (x) console.log(`- ${n.split(/[\/]/).pop()}: day ${day(x.at)} ${new Date(x.at).toISOString().slice(0, 16)}Z ${x.who} \`${x.key}\` (${x.as}, ${x.units} units, ${x.h} h): ${x.why}`);
