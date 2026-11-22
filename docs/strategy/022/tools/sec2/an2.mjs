// Section 2, part 2: kill steps, event trips, the making behind a fight hour, the faults, the samples. Read-only.
import fs from "node:fs";
import path from "node:path";
import { journal, r1, r2, pct } from "./lib.mjs";

const J = journal();
const S = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "slices.json"), "utf8"));
const MARGIN = 1.2; // src/plan/planner/config.ts:98

// fights per bucket from the raw log (the head id at the fight)
const fightsBy = {};
for (const s of S) if (s.p === "fight") { const b = (fightsBy[s.id + "|" + s.who] ??= { win: 0, loss: 0, s: 0 }); b[s.res ?? "win"]++; b.s += s.d; }
const fightsOf = (pref, who) => Object.entries(fightsBy).filter(([id]) => id.startsWith(pref) && (!who || id.endsWith("|" + who))).reduce((a, [, v]) => ({ win: a.win + v.win, loss: a.loss + v.loss, s: a.s + v.s }), { win: 0, loss: 0, s: 0 });
const runOf = (pref) => S.filter((s) => s.id?.startsWith(pref)).reduce((a, s) => { a.s += s.d; a[s.g] = (a[s.g] ?? 0) + s.d; return a; }, { s: 0 });

// ---- kill steps
const steps = {}; const ends = [];
for (const r of J) { if (r.k === "step") (steps[r.key] ??= []).push(r); if (r.k === "end") ends.push(r); }
const sampleAt = (who, t) => J.find((x) => x.k === "sample" && x.who === who && x.t >= t && x.key.startsWith("kill:") && Date.parse(x.t) - Date.parse(t) < 5000);
const rows = [];
for (const e of ends) {
  const st = (steps[e.key] ?? []).filter((x) => x.t <= e.t).at(-1);
  const work = st?.work;
  const isKill = work?.kind === "kill" || (!st && e.key.startsWith("ach:the_reaper"));
  if (!isKill) continue;
  const monster = work?.monster ?? "vampire";
  const f = fightsOf("pl:" + e.key + ":", e.who);
  const smp = sampleAt(e.who, e.t);
  const wd = st?.wd ?? {};
  const pots = Object.fromEntries(Object.entries(wd).filter(([c]) => c.includes("potion")));
  const food = Object.fromEntries(Object.entries(wd).filter(([c]) => !c.includes("potion")));
  rows.push({ kind: "step", t: (st?.t ?? e.t), who: e.who, key: e.key, monster, units: e.of, done: e.units, plan: e.plan, ran: e.ran, partial: !!e.partial,
    est: smp?.est, smp: smp?.s, wd: pots, food, drunk: e.m?.drunk ?? {}, used: e.m?.used ?? {}, won: f.win, lost: f.loss, fight: e.m?.by?.fight ?? 0, rest: e.m?.by?.rest ?? 0, eat: e.m?.by?.eat ?? 0, ms: e.m?.s ?? 0 });
}
// ---- event trips
const ints = J.filter((r) => r.k === "int" && r.cls === "event");
for (const i of ints) {
  const end = J.find((r) => r.k === "int-end" && r.who === i.who && r.what === i.what && r.t >= i.t);
  const evs = J.filter((r) => r.k === "event" && r.key === i.what && Date.parse(r.t) <= Date.parse(i.t) + 5000 && r.members?.some((m) => m.who === i.who && m.take));
  const mem = evs.at(-1)?.members.find((m) => m.who === i.who && m.take);
  const mm = /≈(\d+) kills in (\d+) min/.exec(mem?.why ?? "");
  const kills = mm ? +mm[1] : null, min = mm ? +mm[2] : null;
  const take = mem?.take ?? {};
  const pots = Object.fromEntries(Object.entries(take).filter(([c]) => c.includes("potion")));
  const food = Object.fromEntries(Object.entries(take).filter(([c]) => !c.includes("potion")));
  const pref = `pl:int:event:${i.what}:`;
  const f = fightsOf(pref, i.who);
  rows.push({ kind: "trip", t: i.t, who: i.who, key: "event " + i.what.split("@")[0] + " " + i.t.slice(11, 16), monster: "bandit_lizard", units: kills, done: end?.m?.won ?? f.win, plan: min ? min * 60 : null, ran: end?.m?.s ?? 0, wall: end?.s,
    wd: pots, food, drunk: end?.m?.drunk ?? {}, used: end?.m?.used ?? {}, won: end?.m?.won ?? 0, lost: end?.m?.lost ?? 0, how: end?.how, fight: end?.m?.by?.fight ?? 0, rest: end?.m?.by?.rest ?? 0, eat: end?.m?.by?.eat ?? 0, ms: end?.m?.s ?? 0 });
}
rows.sort((a, b) => (a.t < b.t ? -1 : 1));
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const fmt = (o) => Object.entries(o).map(([c, q]) => `${q} ${c.replace("_health_potion", "").replace("air_boost_potion", "air").replace("cooked_trout", "trout")}`).join(" + ") || "—";

console.log("## Kill steps and event trips (journal step/end, int/int-end, event members; fights won/lost from the raw log by head id)");
console.log("planned s/kill = the step's planned seconds ÷ its kills (a trip: its minutes ÷ its ≈kills); measured = running seconds ÷ kills done (a trip: its meter's seconds); potions planned = the step's `wd` (= the forecast's units × MARGIN 1.2) or the trip's `take`.");
console.log("| start | who | step / trip | monster | kills planned → done | lost | s/kill planned → measured (÷) | sample est | potions planned → drunk | potions/kill planned (÷1.2) → drunk (÷) | food taken → eaten | fight+rest+eat s |");
console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
const per = {};
for (const r of rows) {
  const done = r.done || 0;
  const pk = r.units ? r.plan / r.units : null;
  const mk = done ? r.ran / done : null;
  const wdN = sum(r.wd), drN = sum(r.drunk);
  const pplan = r.units ? (r.kind === "step" ? wdN / MARGIN : wdN) / r.units : null; // a trip's take: not ÷ margin (capped stacks)
  const pmeas = done ? drN / done : null;
  console.log(`| ${r.t.slice(5, 16)} | ${r.who} | ${r.key}${r.partial ? " (partial)" : ""}${r.how === "removed" ? " (removed)" : ""} | ${r.monster} | ${r.units ?? "?"} → ${done} | ${r.lost} | ${pk ? r1(pk) : "?"} → ${mk ? r1(mk) : "—"}${pk && mk ? " (" + r2(mk / pk) + ")" : ""} | ${r.est ?? ""} | ${fmt(r.wd)} → ${fmt(r.drunk)} | ${pplan != null ? r1(pplan) : "?"} → ${pmeas != null ? r1(pmeas) : "—"}${pplan && pmeas != null ? " (" + r2(pmeas / pplan) + ")" : ""} | ${fmt(r.food)} → ${fmt(r.used)} | ${Math.round(r.fight + r.rest + r.eat)} |`);
  if (!r.partial) {
    const m = (per[r.monster + (r.kind === "trip" ? " (trips)" : "")] ??= { n: 0, kp: 0, kd: 0, plan: 0, ran: 0, wd: 0, dr: 0, lost: 0, fight: 0, rest: 0, eat: 0, ms: 0 });
    m.n++; m.kp += r.units ?? 0; m.kd += done; m.plan += r.plan ?? 0; m.ran += r.ran; m.lost += r.lost;
    m.wd += r.kind === "step" ? wdN / MARGIN : wdN; m.dr += drN; m.fight += r.fight; m.rest += r.rest; m.eat += r.eat; m.ms += r.ms;
  }
}
console.log("\n### Per monster (partial steps left out)");
console.log("| monster | steps | kills planned → done | lost | s/kill planned → measured (measured ÷ planned) | potions/kill planned → drunk (÷) | fight share of running |");
console.log("|---|---|---|---|---|---|---|");
for (const [k, m] of Object.entries(per)) {
  const sp = m.plan / m.kp, sm = m.ran / m.kd, pp = m.wd / m.kp, pm = m.dr / m.kd;
  console.log(`| ${k} | ${m.n} | ${m.kp} → ${m.kd} | ${m.lost} | ${r1(sp)} → ${r1(sm)} (${r2(sm / sp)}) | ${r2(pp)} → ${r2(pm)} (${pp ? r2(pm / pp) : "—"}) | ${pct(m.fight, m.ms)} fight, ${pct(m.rest, m.ms)} rest |`);
}

// ---- the making behind a fight hour
const nonPartialEnds = ends.filter((e) => !e.partial);
const unit = (pred, code) => { let s = 0, u = 0; for (const e of nonPartialEnds) if (pred(e)) { s += e.ran; u += (e.m?.got?.[code] ?? e.m?.made?.[code] ?? 0); } return { s, u, per: s / u }; };
const nettle = unit((e) => e.key.startsWith("src:nettle_leaf") || e.key.startsWith("ach:intermediate_alchemist"), "nettle_leaf");
const algae = unit((e) => e.key.startsWith("src:algae"), "algae");
const sunflower = unit((e) => e.key.startsWith("src:sunflower"), "sunflower");
const cMinor = unit((e) => e.key.startsWith("mat:minor_health_potion"), "minor_health_potion");
const cSmall = unit((e) => e.key.startsWith("mat:small_health_potion"), "small_health_potion");
const minorS = (2 * nettle.per + algae.per) / 2 + cMinor.per; // recipe: 2 nettle + 1 algae → 2 potions
const smallS = (3 * sunflower.per) / 2 + cSmall.per;          // recipe: 3 sunflower → 2 potions
const PRICE = { minor_health_potion: minorS, small_health_potion: smallS, air_boost_potion: 298, cooked_trout: 44 }; // air, trout: atlas costSec (no making in the journal)
console.log("\n## The making behind a fight hour");
console.log(`unit seconds from the journal's non-partial ends (Σ ran ÷ Σ got/made): nettle ${r1(nettle.per)} s (${nettle.u}), algae ${r1(algae.per)} s (${algae.u} algae from ${unit((e) => e.key.startsWith("src:algae"), "gudgeon").u} gudgeon-spot gathers), sunflower ${r1(sunflower.per)} s (${sunflower.u}), minor craft ${r2(cMinor.per)} s/potion (${cMinor.u}), small craft ${r2(cSmall.per)} s/potion (${cSmall.u})`);
console.log(`→ a Minor Health Potion ${r1(minorS)} s, a Small Health Potion ${r1(smallS)} s; Air Boost Potion 298 s and Cooked Trout 44 s are the atlas's costSec (none made in the journal)`);
// fights: kill steps + trips + offering interrupts (combat requirement)
const offs = J.filter((r) => r.k === "int-end" && r.cls === "offering");
const groups = [["kill steps", rows.filter((r) => r.kind === "step")], ["event trips", rows.filter((r) => r.kind === "trip")], ["offering interrupts", offs.map((o) => ({ drunk: o.m?.drunk ?? {}, used: o.m?.used ?? {}, fight: o.m?.by?.fight ?? 0, rest: o.m?.by?.rest ?? 0, eat: o.m?.by?.eat ?? 0, ran: o.m?.s ?? 0, won: o.m?.won ?? 0 }))]];
console.log("| what | fights won | potions drunk | food eaten | fight h (meter) | fight+rest+eat h | running h | making h behind (potions + food) | making ÷ fight h | making ÷ running h |");
console.log("|---|---|---|---|---|---|---|---|---|---|");
let T = { won: 0, dr: {}, us: {}, fight: 0, fre: 0, ran: 0, mk: 0 };
for (const [name, rs] of groups) {
  let won = 0, dr = {}, us = {}, fight = 0, fre = 0, ran = 0;
  for (const r of rs) { won += r.won ?? 0; for (const [c, q] of Object.entries(r.drunk)) dr[c] = (dr[c] ?? 0) + q; for (const [c, q] of Object.entries(r.used)) us[c] = (us[c] ?? 0) + q; fight += r.fight; fre += r.fight + r.rest + r.eat; ran += r.ran; }
  const mk = Object.entries({ ...dr }).reduce((a, [c, q]) => a + q * (PRICE[c] ?? 0), 0) + Object.entries(us).reduce((a, [c, q]) => a + q * (PRICE[c] ?? 0), 0);
  console.log(`| ${name} | ${won} | ${fmt(dr)} | ${fmt(us)} | ${r1(fight / 3600)} | ${r1(fre / 3600)} | ${r1(ran / 3600)} | ${r1(mk / 3600)} | ${r1(mk / fight)} | ${r1(mk / ran)} |`);
  T.won += won; T.fight += fight; T.fre += fre; T.ran += ran; T.mk += mk; for (const [c, q] of Object.entries(dr)) T.dr[c] = (T.dr[c] ?? 0) + q; for (const [c, q] of Object.entries(us)) T.us[c] = (T.us[c] ?? 0) + q;
}
console.log(`| all | ${T.won} | ${fmt(T.dr)} | ${fmt(T.us)} | ${r1(T.fight / 3600)} | ${r1(T.fre / 3600)} | ${r1(T.ran / 3600)} | ${r1(T.mk / 3600)} | ${r1(T.mk / T.fight)} | ${r1(T.mk / T.ran)} |`);
const supplyH = S.filter((s) => s.id && /^pl:(src|mat):/.test(s.id) && /nettle|algae|sunflower|minor_health|small_health/.test(s.id)).reduce((a, s) => a + s.d, 0) / 3600;
console.log(`(beside it: the raw slices of every potion-ingredient and potion-craft supply step in the journal: ${r1(supplyH)} ch-h)`);

// ---- samples by kind
console.log("\n## Samples against their estimates, by kind (journal `sample` records)");
const sm = J.filter((r) => r.k === "sample");
const kinds = {};
for (const r of sm) { const k = r.key.split(":")[0] + ":" + r.key.split(":")[1]; (kinds[k] ??= []).push(r); }
console.log("| key | n | Σ units | measured ÷ estimate: unit-weighted (min–max) | within ±10% |");
console.log("|---|---|---|---|---|");
for (const [k, l] of Object.entries(kinds).sort()) {
  const u = l.reduce((a, r) => a + r.units, 0), m = l.reduce((a, r) => a + r.s * r.units, 0) / u, e = l.reduce((a, r) => a + r.est * r.units, 0) / u;
  const rs = l.map((r) => r.s / r.est);
  console.log(`| ${k} | ${l.length} | ${u} | ${r2(m / e)} (${r2(Math.min(...rs))}–${r2(Math.max(...rs))}) | ${rs.filter((x) => Math.abs(x - 1) <= 0.1).length} of ${l.length} |`);
}
// step-level: running ÷ planned by answer
console.log("\n### Steps: running ÷ planned seconds, by answer and work kind (non-partial ends with every unit done)");
const byA = {};
for (const e of nonPartialEnds) {
  const st = (steps[e.key] ?? []).filter((x) => x.t <= e.t).at(-1); if (!st || e.units !== e.of || !e.of) continue;
  const k = st.as + " / " + st.work.kind; const b = (byA[k] ??= { n: 0, ran: 0, plan: 0, rs: [] }); b.n++; b.ran += e.ran; b.plan += e.plan; b.rs.push(e.ran / e.plan);
}
console.log("| answer / work | steps | Σ running ÷ Σ planned | median | within ±10% |\n|---|---|---|---|---|");
for (const [k, b] of Object.entries(byA)) { const s = [...b.rs].sort((a, c) => a - c); console.log(`| ${k} | ${b.n} | ${r2(b.ran / b.plan)} | ${r2(s[Math.floor(s.length / 2)])} | ${b.rs.filter((x) => Math.abs(x - 1) <= 0.1).length} |`); }
fs.writeFileSync(path.join(import.meta.dirname, "rows.json"), JSON.stringify({ rows, PRICE }));
