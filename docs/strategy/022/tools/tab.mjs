// tab.mjs <runs dir> <name>... : the comparison table and a table a policy, from runs/<name>.jsonl (the driver's lines)
import { readFileSync, existsSync } from "node:fs";
const [dir, ...names] = process.argv.slice(2);
const DAYS = [7, 14, 21, 28, 42, 56, 70, 84];
const SK = ["combat", "mining", "woodcutting", "fishing", "weaponcrafting", "gearcrafting", "jewelrycrafting", "cooking", "alchemy"];
const CRAFTERS = [["Second", 4, "wc"], ["Third", 5, "gc"], ["Fourth", 6, "jc"]];
const WHO = ["First", "Second", "Third", "Fourth", "Fifth"];
const load = (n) => {
  const f = `${dir}/${n}.jsonl`;
  if (!existsSync(f)) return undefined;
  const L = readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const days = L.filter((l) => l.k === "day"), done = L.find((l) => l.k === "done"), stats = L.find((l) => l.k === "stats");
  return { n, days, done, stats, last: days[days.length - 1] };
};
const dayOf = (r, t) => Math.floor((t - Date.UTC(2026, 10, 22)) / 864e5) + 1; // day 1 = 11-22
const fmt = (x, d = 0) => (x == null ? "—" : Number(x).toFixed(d));
const runs = names.map(load).filter(Boolean);
// the comparison table
const head = ["policy", ...DAYS.map((d) => `d${d}`), "end", "105 on", "158 on", "compl.", "combat d42", "combat end", "crafters end (wc/gc/jc)", "fight %", "make %", "gather %", "potions", "kills", "kill steps", "s", "solves"];
console.log(`| ${head.join(" | ")} |\n|${head.map(() => "---").join("|")}|`);
for (const r of runs) {
  const pts = (d) => r.days.find((x) => x.n === d)?.points;
  if (!r.done) { console.log(`| ${r.n} | ${DAYS.map((d) => fmt(pts(d))).join(" | ")} | (running: day ${r.last?.n ?? 0}) |`); continue; }
  const s = r.stats ?? {};
  let run = r.done.points, d105 = null, d158 = null;
  for (const c of r.done.completed) { const b = run; run += c.points; if (b < 105 && run >= 105) d105 = dayOf(r, c.at); if (b < 158 && run >= 158) d158 = dayOf(r, c.at); }
  const lv = (n) => s.levels?.find((x) => x.n === n)?.at;
  const lastLv = s.levels?.[s.levels.length - 1]?.at;
  const combat = (at) => (at ? WHO.map((w) => at[w]?.[0]).join("/") : "—");
  const k = s.kind ?? {}, tot = Object.values(k).reduce((a, b) => a + b, 0) || 1;
  const drunk = Object.values(s.drunk ?? {}).reduce((a, b) => a + b, 0), kills = Object.values(s.kills ?? {}).reduce((a, b) => a + b, 0);
  console.log(`| ${r.n} | ${DAYS.map((d) => fmt(pts(d))).join(" | ")} | **${r.done.expected}** | ${d105 ?? "—"} | ${d158 ?? "—"} | ${r.done.completed.length} | ${combat(lv(42))} | ${combat(lastLv)} | ${lastLv ? CRAFTERS.map(([w, i]) => lastLv[w][i]).join("/") : "—"} | ${fmt((100 * ((k.fight ?? 0) + (k.event ?? 0))) / tot)} | ${fmt((100 * (k.make ?? 0)) / tot)} | ${fmt((100 * (k.gather ?? 0)) / tot)} | ${fmt(drunk)} | ${fmt(kills)} | ${s.killSteps ?? "—"} | ${fmt(r.done.sec)} | ${s.solves ?? "—"} |`);
}
if (process.env.DETAIL) for (const r of runs) {
  if (!r.done || !r.stats) continue;
  const s = r.stats;
  console.log(`\n### ${r.n} — ${JSON.stringify(s.cfg)}`);
  console.log(`points at the start ${r.done.points}, at the end ${r.done.expected}; ${r.done.steps} steps, ${r.done.sec} s, ${s.solves} solves, peak ${s.mem} MB`);
  const rows = [...DAYS.filter((d) => s.levels.some((x) => x.n === d)), s.levels[s.levels.length - 1].n];
  console.log(`| day | points | ${WHO.map((w) => `${w} combat`).join(" | ")} | Second wc | Third gc | Fourth jc | Third alch |\n|${"---|".repeat(5 + WHO.length + 1)}`);
  for (const n of [...new Set(rows)]) { const at = s.levels.find((x) => x.n === n).at; console.log(`| ${n} | ${r.days.find((x) => x.n === n)?.points ?? r.done.expected} | ${WHO.map((w) => at[w][0]).join(" | ")} | ${at.Second[4]} | ${at.Third[5]} | ${at.Fourth[6]} | ${at.Third[8]} |`); }
  const H = Object.entries(s.hours).sort((a, b) => b[1] - a[1]);
  const tot = H.reduce((a, [, h]) => a + h, 0);
  const rest = H.slice(12).reduce((a, [, h]) => a + h, 0);
  console.log(`\nhours by answer (${fmt(tot)} character-hours): ${H.slice(0, 12).map(([k, h]) => `${k} ${fmt(h)} (${fmt((100 * h) / tot)}%)`).join("; ")}${rest ? `; the rest ${fmt(rest)}` : ""}`);
  console.log(`by kind: ${Object.entries(s.kind).map(([k, h]) => `${k} ${fmt(h)}`).join(", ")}`);
  const dr = Object.entries(Object.keys(s.drunk).length ? s.drunk : s.freeUse ?? {}).sort((a, b) => b[1] - a[1]);
  console.log(`${Object.keys(s.drunk).length ? "drunk and eaten" : "free (what the kill steps' sets drink)"}: ${dr.slice(0, 6).map(([c, q]) => `${c} ${fmt(q)}`).join(", ")}; in all ${fmt(dr.reduce((a, [, q]) => a + q, 0))}`);
  const ks = Object.entries(s.kills).sort((a, b) => b[1] - a[1]);
  console.log(`kills: ${ks.slice(0, 8).map(([c, q]) => `${c} ${fmt(q)}`).join(", ")}; in all ${fmt(ks.reduce((a, [, q]) => a + q, 0))} in ${s.killSteps} kill steps`);
  console.log(`completions: ${r.done.completed.map((c) => `${c.code} ${new Date(c.at).toISOString().slice(5, 10)} (+${c.points})`).join(", ")}`);
  const g = {};
  const onRoad = new Set(r.done.completed.map((c) => c.code));
  for (const w of s.endWaiting) { if (onRoad.has(w.achievement)) continue; (g[w.waits] ??= { pts: 0, codes: [] }); g[w.waits].pts += w.points; g[w.waits].codes.push(w.achievement); }
  console.log(`open at the deadline: ${Object.entries(g).sort((a, b) => b[1].pts - a[1].pts).map(([k, v]) => `${k} ${v.pts} (${v.codes.join(", ")})`).join("; ")}`);
}
