// part.mjs <a> <b>: where run b's decisions first part from run a's (dec/<name>.dec): the day, the character, both steps and whys
import { readFileSync } from "node:fs";
const [a, b] = process.argv.slice(2).map((n) => readFileSync(`D:/Temp/a022/dec/${n}.dec`, "utf8").trim().split("\n"));
let i = 0;
for (; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) break;
const day = (t) => Math.floor((t - Date.UTC(2026, 10, 22)) / 864e5) + 1;
console.log(`equal for ${i} decisions; the first that differs:`);
for (const [n, x] of [[process.argv[2], a[i]], [process.argv[3], b[i]]]) { if (!x) continue; const d = JSON.parse(x); console.log(`- ${n}: day ${day(d.at)} ${new Date(d.at).toISOString().slice(0, 16)}Z ${d.who} \`${d.key}\` (${d.as}, ${d.units} units, ${d.h} h): ${d.why}`); }
