// tab.mjs <runs dir> <run>... — section 5's table of task 025: per run (a drive.mts output, 022's or 025's), the points on days
// 7, 14, 21, 28, 42, 56, 70, 84 and at the deadline, the completions, the steps, the five combat levels on those days, the share
// of the fleet's hours that is consumables' supply, potions and food consumed, runes bought and gold spent, fights and expected
// losses (025's driver), and what the open points wait for at the deadline. DETAIL=1 adds each run's completions with days.
import { readFileSync } from "node:fs";
const [dir, ...runs] = process.argv.slice(2);
const DAYS = [7, 14, 21, 28, 42, 56, 70, 84];
const NAMES = ["First", "Second", "Third", "Fourth", "Fifth"];
const rows = [];
for (const r of runs) {
  const lines = readFileSync(`${dir}/${r}.jsonl`, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const done = lines.find((l) => l.k === "done"), st = lines.find((l) => l.k === "stats");
  if (!done || !st) { rows.push({ r, missing: true }); continue; }
  const pts = DAYS.map((d) => done.byDay[d - 1]?.points ?? "—");
  const lv = (d) => { const e = st.levels.find((x) => x.n === d); return e ? NAMES.map((n) => e.at[n]?.[0] ?? "?").join("/") : "—"; };
  const hours = Object.entries(st.hours).reduce((t, [, h]) => t + h, 0);
  const cons = Object.entries(st.hours).filter(([k]) => k.startsWith("supply:consumables")).reduce((t, [, h]) => t + h, 0);
  const drunk = Object.entries(st.drunk ?? {}).reduce((t, [, q]) => t + q, 0);
  const food = Object.values(st.food ?? {}).reduce((t, q) => t + q, 0);
  const wait = {};
  for (const w of st.endWaiting ?? []) wait[w.waits] = (wait[w.waits] ?? 0) + w.points;
  rows.push({ r, pts, end: done.expected, comp: done.completed.length, steps: done.steps, sec: done.sec, lv: DAYS.map(lv), lvEnd: lv(st.levels.at(-1)?.n), share: hours ? cons / hours : 0, drunk, food, runes: st.runes, runeGold: st.runeGold, fights: st.fights, losses: st.losses, wait, completed: done.completed });
}
const f0 = (x) => (x == null ? "—" : Math.round(x).toLocaleString("en-US"));
console.log(`| run | ${DAYS.map((d) => `d${d}`).join(" | ")} | deadline | completions | steps | consumables' share | drunk (potions + food) | food | runes (gold) | fights / expected losses | s |`);
console.log(`|---|${DAYS.map(() => "---").join("|")}|---|---|---|---|---|---|---|---|---|`);
for (const x of rows) {
  if (x.missing) { console.log(`| ${x.r} | (not finished) |`); continue; }
  console.log(`| ${x.r} | ${x.pts.join(" | ")} | **${x.end}** | ${x.comp} | ${f0(x.steps)} | ${(x.share * 100).toFixed(0)}% | ${f0(x.drunk)} | ${f0(x.food)} | ${x.runes ? `${x.runes.length} (${f0(x.runeGold)})` : "—"} | ${x.fights != null ? `${f0(x.fights)} / ${f0(x.losses)}` : "—"} | ${f0(x.sec)} |`);
}
console.log(`\nCombat levels (First/Second/Third/Fourth/Fifth) on days ${DAYS.join(", ")} and at the end:`);
for (const x of rows) if (!x.missing) console.log(`- ${x.r}: ${x.lv.map((l, i) => `d${DAYS[i]} ${l}`).join(" · ")} · end ${x.lvEnd}`);
console.log(`\nWhat the open points wait for at the deadline:`);
for (const x of rows) if (!x.missing) console.log(`- ${x.r}: ${Object.entries(x.wait).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ")}`);
console.log(`\nRunes bought:`);
for (const x of rows) if (!x.missing && x.runes?.length) console.log(`- ${x.r}: ${x.runes.map((r) => `${r.who} ${r.at.slice(0, 16)}Z`).join(", ")}`);
if (process.env.DETAIL) for (const x of rows) if (!x.missing) console.log(`\n${x.r} completions: ${x.completed.map((c) => `${c.code} +${c.points} (${new Date(c.at).toISOString().slice(5, 10)})`).join(", ")}`);
