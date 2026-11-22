// Section 2, part 1: hours by answer and by group, per window and per UTC day. Read-only.
import fs from "node:fs";
import path from "node:path";
import { ROOT, journal, rawEvents, slices, byDay, ms, r1, r2, pct } from "./lib.mjs";

const J = journal();
const T0 = J[0].t; // first record: the boot of 11-21 11:43:34
const rawDir = path.join(ROOT, "logs/raw");
const files = fs.readdirSync(rawDir).sort().flatMap((d) => fs.readdirSync(path.join(rawDir, d)).sort().map((f) => path.join(rawDir, d, f)));
const { ev, runLast, runFirst } = rawEvents(files, { from: T0 });
const TEND = Object.values(runLast).sort().at(-1);
const CHAT_END = "2026-11-22T17:25:00.000Z";

// ---- step instances
const inst = {}; // key -> [{t0, rec, end}]
const prefixAs = (k) => (k.startsWith("ach:") ? "objective" : k.startsWith("lvl:") ? "level" : k.startsWith("tidy:") ? "tidy" : "supply");
for (const r of J) {
  if (r.k === "boot") for (const [who, c] of Object.entries(r.chars ?? {})) if (c.step && !(inst[c.step]?.length)) (inst[c.step] = []).push({ t0: "0", rec: { key: c.step, who, as: prefixAs(c.step), target: c.step.split("@")[0] }, pre: true });
  if (r.k === "step") (inst[r.key] ??= []).push({ t0: r.t, rec: r });
  if (r.k === "end") { const l = inst[r.key]; if (l) { const o = [...l].reverse().find((x) => !x.end); if (o) o.end = r; } }
}
const stepAt = (key, t) => { const l = inst[key]; if (!l) return null; let best = null; for (const x of l) if (x.t0 <= t) best = x; return best ?? l[0]; };

function category(s) {
  const id = s.id ?? "";
  if (id.startsWith("pl:int:")) return { a: "interrupt", sub: id.split(":")[2] };
  if (!id.startsWith("pl:")) return { a: "unknown", sub: id };
  const key = id.slice(3).replace(/:\d+$/, "");
  const x = stepAt(key, s.t);
  const r = x?.rec ?? { as: prefixAs(key), target: key.split("@")[0] };
  if (r.as === "level") return { a: "level", sub: r.target.split(":")[1] + " " + r.target.split(":")[2], key };
  if (r.as === "supply") {
    const p = r.parent ?? "";
    if (p.startsWith("cons:")) return { a: "supply", sub: "consumables: " + p.split(":")[1].replace("_health_potion", "") + " for " + p.split(":").slice(2).join(":").replace(/:d+$/, ""), key };
    if (r.target.startsWith("gear:") || p.startsWith("gear:")) return { a: "supply", sub: "gear", key };
    return { a: "supply", sub: "objective materials", key };
  }
  if (r.as === "objective") return { a: "objective", sub: r.target.split(":")[1], key };
  return { a: r.as, sub: r.target, key };
}

const S = slices(ev, runLast);
for (const s of S) Object.assign(s, category(s));

// downtime: time in the window covered by no run
function uptime(a, b) {
  let up = 0;
  for (const run of Object.keys(runFirst)) {
    const boot = J.find((r) => r.k === "boot" && r.run === run)?.t ?? runFirst[run];
    const x0 = Math.max(ms(a), ms(boot)), x1 = Math.min(ms(b), ms(runLast[run]));
    if (x1 > x0) up += (x1 - x0) / 1000;
  }
  return up;
}

const GROUPS = ["fight", "rest", "eat", "bank", "walk", "gear", "gather", "craft", "trade", "task", "other"];
function agg(a, b) {
  const tot = { s: 0, idle: 0, cat: {}, sub: {}, grp: {}, catGrp: {} };
  for (const s of S) {
    // clip the slice to [a, b)
    const s0 = ms(s.t), s1 = s0 + (s.d + s.idle) * 1000;
    const x0 = Math.max(s0, ms(a)), x1 = Math.min(s1, ms(b));
    if (x1 <= x0) continue;
    const f = (x1 - x0) / ((s1 - s0) || 1);
    const d = s.d * f, idle = s.idle * f;
    tot.s += d; tot.idle += idle;
    tot.cat[s.a] = (tot.cat[s.a] ?? 0) + d;
    const sk = s.a + " / " + s.sub;
    tot.sub[sk] = (tot.sub[sk] ?? 0) + d;
    tot.grp[s.g] = (tot.grp[s.g] ?? 0) + d;
    const cg = (tot.catGrp[s.a] ??= {}); cg[s.g] = (cg[s.g] ?? 0) + d;
  }
  tot.avail = 5 * (ms(b) - ms(a)) / 1000;
  tot.up = uptime(a, b);
  tot.down = 5 * ((ms(b) - ms(a)) / 1000 - tot.up);
  return tot;
}

const H = (x) => r1((x ?? 0) / 3600);
function printAgg(title, a, b) {
  const t = agg(a, b);
  console.log(`\n### ${title}: ${a} → ${b}`);
  console.log(`available ${H(t.avail)} ch-h; service down ${H(t.down)} ch-h; in action slices ${H(t.s)} ch-h; idle (slice beyond 900 s) ${H(t.idle)}; unaccounted (up, no slice) ${H(t.avail - t.down - t.s - t.idle)}`);
  console.log("| answer | ch-h | share |\n|---|---|---|");
  for (const [k, v] of Object.entries(t.cat).sort((x, y) => y[1] - x[1])) console.log(`| ${k} | ${H(v)} | ${pct(v, t.s)} |`);
  console.log("\n| answer / what for | ch-h |\n|---|---|");
  for (const [k, v] of Object.entries(t.sub).sort((x, y) => y[1] - x[1])) console.log(`| ${k} | ${H(v)} |`);
  console.log("\n| group | ch-h | share |\n|---|---|---|");
  for (const g of GROUPS) if (t.grp[g]) console.log(`| ${g} | ${H(t.grp[g])} | ${pct(t.grp[g], t.s)} |`);
  console.log("\nby answer × group (ch-h):");
  console.log("| answer | " + GROUPS.join(" | ") + " |\n|---|" + GROUPS.map(() => "---").join("|") + "|");
  for (const [k, g] of Object.entries(t.catGrp)) console.log(`| ${k} | ` + GROUPS.map((x) => (g[x] ? H(g[x]) : "")).join(" | ") + " |");
  // points and combat levels in the window
  const ach = J.filter((r) => r.k === "ach" && r.code && r.at >= a && r.at < b).map((r) => `${r.code} +${r.pts} (${r.at.slice(5, 16)})`);
  const lv = J.filter((r) => r.k === "level" && r.t >= a && r.t < b);
  const cmb = lv.filter((r) => r.skill === "combat").map((r) => `${r.who} ${r.lv}`);
  const oth = {}; for (const r of lv.filter((r) => r.skill !== "combat")) (oth[r.skill] ??= []).push(`${r.who} ${r.lv}`);
  console.log(`\npoints: ${ach.join(", ") || "none"}; combat levels: ${cmb.join(", ") || "none"}; other levels: ${Object.entries(oth).map(([k, v]) => k + " " + v.join("/")).join("; ")}`);
  return t;
}

// ---- the chat's method: Σ ran of end records + Σ int-end s in the window
function chatMethod(a, b) {
  const byAs = {}, bySub = {}, grp = {};
  let tot = 0;
  for (const r of J) {
    if (r.t < a || r.t >= b) continue;
    if (r.k === "end") {
      const x = stepAt(r.key, r.t)?.rec ?? { as: prefixAs(r.key), target: r.key.split("@")[0] };
      byAs[x.as] = (byAs[x.as] ?? 0) + r.ran; tot += r.ran;
      const sub = x.as === "level" ? x.target : x.as === "supply" ? (x.parent ?? "?") : x.target;
      bySub[x.as + " / " + sub] = (bySub[x.as + " / " + sub] ?? 0) + r.ran;
      for (const [g, v] of Object.entries(r.m?.by ?? {})) grp[g] = (grp[g] ?? 0) + v;
    }
    if (r.k === "int-end") {
      const k = "int " + r.cls; byAs[k] = (byAs[k] ?? 0) + r.s; tot += r.s;
      for (const [g, v] of Object.entries(r.m?.by ?? {})) grp[g] = (grp[g] ?? 0) + v;
    }
  }
  const gt = Object.values(grp).reduce((x, y) => x + y, 0);
  console.log(`\n### The chat's method (Σ ran of every end + Σ s of every int-end with t in ${a} → ${b}): ${H(tot)} ch-h`);
  console.log("| answer | ch-h |\n|---|---|");
  for (const [k, v] of Object.entries(byAs).sort((x, y) => y[1] - x[1])) console.log(`| ${k} | ${H(v)} |`);
  console.log("\n| answer / target or parent | ch-h |\n|---|---|");
  for (const [k, v] of Object.entries(bySub).sort((x, y) => y[1] - x[1]).slice(0, 25)) console.log(`| ${k} | ${H(v)} |`);
  console.log(`\nthe meter (Σ m.by of the same records): ${H(gt)} ch-h — ` + Object.entries(grp).sort((x, y) => y[1] - x[1]).map(([g, v]) => `${g} ${H(v)} (${pct(v, gt)})`).join(", "));
}

console.log(`# Hours: raw-log action slices (logs/raw), attributed by the head line; journal ${T0} → last raw line ${TEND}`);
console.log("runs:", Object.keys(runFirst).map((r) => `${r} ${runFirst[r].slice(5, 19)}–${runLast[r].slice(5, 19)}`).join("; "));
chatMethod(T0, CHAT_END);
printAgg("The chat's window, by raw slices", T0, CHAT_END);
printAgg("11-21 (from the journal's first record)", T0, "2026-11-22T00:00:00.000Z");
printAgg("11-22 (to the last raw line)", "2026-11-22T00:00:00.000Z", TEND);
printAgg("Whole journal", T0, TEND);
chatMethod(T0, TEND);

// largest slices, to see what a long slice is
console.log("\n### the 12 longest slices (s, before the cap)");
for (const s of [...S].sort((x, y) => y.d + y.idle - x.d - x.idle).slice(0, 12)) console.log(`${s.t} ${s.who} ${s.p} ${r1(s.d + s.idle)} ${s.id}`);
fs.writeFileSync(path.join(import.meta.dirname, "slices.json"), JSON.stringify(S));

const W = [["chat window 11-21 11:43 → 11-22 17:25", T0, CHAT_END], ["11-21 from 11:43", T0, "2026-11-22T00:00:00.000Z"], ["11-22 to " + TEND.slice(11, 16), "2026-11-22T00:00:00.000Z", TEND], ["whole journal", T0, TEND]];
const A = W.map(([n, a, b]) => agg(a, b));
console.log("\n## Combined table (ch-h; raw slices)");
console.log("| | " + W.map((w) => w[0]).join(" | ") + " |\n|---|" + W.map(() => "---:").join("|") + "|");
console.log("| available (5 × wall) | " + A.map((t) => H(t.avail)).join(" | ") + " |");
console.log("| service down | " + A.map((t) => H(t.down)).join(" | ") + " |");
const cats = ["objective", "level", "supply", "tidy", "interrupt"];
for (const c of cats) {
  console.log("| **" + c + "** | " + A.map((t) => "**" + H(t.cat[c]) + "** (" + pct(t.cat[c] ?? 0, t.s) + ")").join(" | ") + " |");
  const subs = [...new Set(A.flatMap((t) => Object.keys(t.sub).filter((k) => k.startsWith(c + " / "))))].sort((x, y) => (A[3].sub[y] ?? 0) - (A[3].sub[x] ?? 0));
  for (const k of subs) console.log("| — " + k.slice(c.length + 3) + " | " + A.map((t) => H(t.sub[k])).join(" | ") + " |");
}
console.log("| **groups** | | | | |");
for (const g of GROUPS) if (A[3].grp[g]) console.log("| " + g + " | " + A.map((t) => H(t.grp[g]) + " (" + pct(t.grp[g] ?? 0, t.s) + ")").join(" | ") + " |");
