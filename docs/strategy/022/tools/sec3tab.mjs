// sec3tab.mjs: section 3's tables from out/sec3.json
import { readFileSync } from "node:fs";
const r = JSON.parse(readFileSync(process.argv[2] ?? "sec3.json", "utf8"));
const f1 = (x) => (x == null ? "—" : typeof x !== "number" ? String(x) : x >= 100 ? Math.round(x) : x.toFixed(1));
console.log("pieces the crafters can make (plain / special):", JSON.stringify(Object.fromEntries(Object.entries(r.pieceLists).map(([k, v]) => [k, `${v.plain}/${v.special}`]))));
console.log("\n#### Roads: cumulative fleet hours to combat 30 / 35 / 40 / 45 per fighter (fight + potions' making; the stop)");
for (const pr of ["today", "free"]) {
  console.log(`\n${pr === "today" ? "at today's potion price (the chain's)" : "potions free"}\n| pool | ${["First", "Second", "Third", "Fourth", "Fifth"].join(" | ")} | fleet to 30 / 35 / 40 (fight + potions) | gear bill h |\n|---|---|---|---|---|---|---|---|`);
  for (const [pool, sp] of [["i","plain"],["ii","plain"],["iii","plain"],["iv","plain"],["v","plain"],["ii","special"],["iii","special"],["iv","special"],["v","special"]]) {
    const cells = [], fleet = { 30: [0, 0], 35: [0, 0], 40: [0, 0] }, stops = [];
    let gear = 0;
    for (const who of ["First", "Second", "Third", "Fourth", "Fifth"]) {
      const road = r.roads.find((x) => x.who === who && x.pool === pool && x.pr === pr && x.sp === sp);
      gear = typeof road.gear?.billH === "number" && typeof gear === "number" ? gear + road.gear.billH : "∞";
      let f = 0, p = 0; const at = {}; let stop;
      for (const l of road.levels) {
        if (l.stop) { stop = `stops at ${l.L} (${l.stop})`; break; }
        f += l.fightH; p += l.potionH;
        for (const N of [30, 35, 40, 45]) if (l.L + 1 === N) at[N] = [f, p];
      }
      for (const N of [30, 35, 40]) if (at[N]) { fleet[N][0] += at[N][0]; fleet[N][1] += at[N][1]; } else if (road.from < N) fleet[N] = [NaN, NaN];
      cells.push(`${[30, 35, 40, 45].map((N) => (road.from >= N ? "·" : at[N] ? f1(at[N][0] + at[N][1]) : "×")).join(" / ")}${stop ? ` (${stop.replace("no safe XP monster", "no XP")})` : ""}`);
    }
    console.log(`| ${pool}${sp === "special" ? " +special" : ""} | ${cells.join(" | ")} | ${[30, 35, 40].map((N) => (Number.isNaN(fleet[N][0]) ? "×" : `${f1(fleet[N][0] + fleet[N][1])} (${f1(fleet[N][0])} + ${f1(fleet[N][1])})`)).join(" / ")} | ${f1(gear)} |`);
  }
}
console.log("\n#### The crafters' roads by the model (hours to 30 / 35 / 40 / 45)");
for (const [lane, c] of Object.entries(r.crafters)) console.log(`- ${lane} (${c.who}, ${c.now}): ${Object.entries(c.to).map(([N, h]) => `${N}: ${h} h`).join(", ")}; per level ${c.perLevel.join(" ")}`);
console.log("\n#### Points behind combat (open achievements by the combat level their gates ask, cumulated)");
const pts = r.points;
for (const N of [24, 30, 35, 40, 45, 50]) {
  const inr = pts.filter((p) => p.combat <= N && p.combat > 0);
  const by = {}; for (const p of inr) for (const o of p.other.length ? p.other : ["none"]) by[o] = (by[o] ?? 0) + p.points;
  console.log(`- combat ≤ ${N}: ${inr.reduce((s, p) => s + p.points, 0)} points (${inr.length} achievements); of them with: ${JSON.stringify(by)}`);
}
const none = pts.filter((p) => !p.combat);
console.log(`- no combat gate: ${none.reduce((s, p) => s + p.points, 0)} points; with: ${JSON.stringify(none.reduce((a, p) => { for (const o of p.other.length ? p.other : ["none"]) a[o] = (a[o] ?? 0) + p.points; return a; }, {}))}`);
console.log(`- open in all: ${pts.reduce((s, p) => s + p.points, 0)} points, ${pts.length} achievements`);
console.log(pts.filter((p) => p.combat > 0).sort((a, b) => a.combat - b.combat).map((p) => `${p.code} ${p.points}@${p.combat}${p.other.length ? `[${p.other.join("+")}]` : ""}`).join(", "));
// the per-level table: the best monster (h a level; s a kill = fight + potions' making; potions a kill), per pool, today | free
console.log("\n#### Per fighter and level: the best of the three (hours a level · monster · s a kill (of it potions' making) · potions a kill), today's price | potions free");
const pools = [["i", "plain"], ["ii", "plain"], ["ii", "special"], ["iii", "plain"], ["iii", "special"], ["iv", "plain"], ["iv", "special"], ["v", "plain"], ["v", "special"]];
for (const who of ["Second", "Third"]) {
  const Ls = [...new Set(r.table.filter((t) => t.who === who).map((t) => t.L))];
  console.log(`\n${who} (${who === "Third" ? "First, Fourth and Fifth are alike: 23, the same pool" : "25"})\n| pool | ${Ls.map((L) => `L${L} today | L${L} free`).join(" | ")} |\n|---|${Ls.map(() => "---|---").join("|")}|`);
  for (const [pool, sp] of pools) {
    const cell = (L, pr) => { const t = r.table.find((x) => x.who === who && x.L === L && x.pool === pool && x.sp === sp && x.pr === pr); const b = t?.top[0]; return b ? `${f1(b.hLevel)} · ${b.m} · ${Math.round(b.whole)}${b.making ? ` (${Math.round(b.making)})` : ""} · ${f1(Object.values(b.used).reduce((a, c) => a + c, 0))}` : "none"; };
    console.log(`| ${pool}${sp === "special" ? " +sp" : ""} | ${Ls.map((L) => `${cell(L, "today")} | ${cell(L, "free")}`).join(" | ")} |`);
  }
}
