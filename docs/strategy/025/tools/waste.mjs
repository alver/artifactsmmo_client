// waste.mjs <runs dir> <run>... — decision 58's defect as a number: the hours of supply steps that make a consumable (their why
// "… short for <Potion> ×N for <work> (…") for a work that does not complete by the deadline: an achievement not among the
// run's completions, a fighter's road to combat N not reached at the end, an event whose achievements stay open. Reads the run's
// decisions (`<run>.dec.jsonl`) and its `done` and `stats` lines.
import { readFileSync } from "node:fs";
const [dir, ...runs] = process.argv.slice(2);
for (const r of runs) {
  const lines = readFileSync(`${dir}/${r}.jsonl`, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const done = lines.find((l) => l.k === "done"), st = lines.find((l) => l.k === "stats");
  if (!done || !st) { console.log(`${r}: not finished`); continue; }
  const completed = new Set(done.completed.map((c) => c.code));
  const last = st.levels.at(-1)?.at ?? {};
  const dec = readFileSync(`${dir}/${r}.dec.jsonl`, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  let all = 0, waste = 0;
  const by = {};
  for (const d of dec) {
    if (d.as !== "supply") continue;
    const m = /short for .+? ×[\d.]+ for (.+?) \(/.exec(d.why);
    if (!m) continue; // not a consumable's chain (a gear piece's, an objective's material)
    const work = m[1];
    all += d.h;
    let open;
    const road = /^(\w+)'s road to combat (\d+)$/.exec(work);
    if (road) open = (last[road[1]]?.[0] ?? 0) < Number(road[2]);
    else if (work.startsWith("event ") || work.includes(" for ")) open = undefined; // an event's demand, a material's hunt for a parent: counted apart
    else open = !completed.has(work.split(" ")[0]);
    const k = open === undefined ? "apart" : open ? "open" : "done";
    by[k] = (by[k] ?? 0) + d.h;
    if (open) { waste += d.h; by[`open: ${work}`] = (by[`open: ${work}`] ?? 0) + d.h; }
  }
  console.log(`${r}: consumables' supply ${Math.round(all)} h; for works open at the deadline ${Math.round(waste)} h (${all ? Math.round((100 * waste) / all) : 0}%); events and materials for a parent (not judged) ${Math.round(by.apart ?? 0)} h`);
  for (const [k, h] of Object.entries(by).filter(([k]) => k.startsWith("open: ")).sort((a, b) => b[1] - a[1]).slice(0, 6)) console.log(`   ${k.slice(6)} ${Math.round(h)} h`);
}
