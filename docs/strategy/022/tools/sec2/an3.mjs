// Section 2, part 3: the crafting levels in play — the old train loops of logs/dev.log (11-04 → 11-21) and the journal's
// lvl:<craft> steps. Read-only.
import fs from "node:fs";
import path from "node:path";
import { ROOT, rawEvents, slices, r1, r2 } from "./lib.mjs";

const atlas = JSON.parse(fs.readFileSync(path.join(ROOT, "public/data/atlas.json"), "utf8"));
const { ev, runLast } = rawEvents([path.join(ROOT, "logs/dev.log")], { from: "2026-11-04T00:00", to: "2026-11-21T11:43:34", notes: true });
const S = slices(ev, runLast);
// XP of each craft action: the holder's latest "train <Skill>: craft <Name> ×N (+X xp each)" note before it
const crafts = [];
const lastNote = {};
const RE_X = /train (\w+): craft (.+?) ×(\d+) \(\+(\d+) xp each\)/;
for (const e of ev) {
  if (e.k === "note") { const m = RE_X.exec(e.text); if (m) lastNote[e.who] = { skill: m[1].toLowerCase(), name: m[2], n: +m[3], xp: +m[4], t: e.t }; else if (/train \w+: craft /.test(e.text)) lastNote[e.who] = null; }
  if (e.k === "act" && e.p === "crafting" && lastNote[e.who] && Date.parse(e.t) - Date.parse(lastNote[e.who].t) < 60000) { crafts.push({ who: e.who, t: e.t, ...lastNote[e.who] }); lastNote[e.who] = null; }
}
// train items of the holders and the helpers' items, by head text
const HOLDER = { weaponcrafting: "Second", gearcrafting: "Third", jewelrycrafting: "Fourth" };
const items = {}; // id -> {who, text, skill, s, grp, t0, t1}
for (const s of S) {
  const m = /^Train (Weaponcrafting|Gearcrafting|Jewelrycrafting) (.*)$/.exec(s.htext ?? "");
  const h = /^Help (\w+) train (Weaponcrafting|Gearcrafting|Jewelrycrafting)/i.exec(s.htext ?? "");
  if (!m && !h) continue;
  const skill = (m ? m[1] : h[2]).toLowerCase();
  const it = (items[s.id] ??= { id: s.id, who: s.who, text: s.htext, skill, help: !!h, s: 0, grp: {}, t0: s.t, t1: s.t });
  it.s += s.d; it.grp[s.g] = (it.grp[s.g] ?? 0) + s.d; it.t1 = s.t;
}
const out = [];
for (const it of Object.values(items).filter((x) => !x.help).sort((a, b) => (a.t0 < b.t0 ? -1 : 1))) {
  const xp = crafts.filter((c) => c.who === it.who && c.skill === it.skill && c.t >= it.t0 && c.t <= it.t1).reduce((a, c) => a + c.n * c.xp, 0);
  const recipes = [...new Set(crafts.filter((c) => c.who === it.who && c.skill === it.skill && c.t >= it.t0 && c.t <= it.t1).map((c) => c.name))];
  const helpers = Object.values(items).filter((x) => x.help && x.skill === it.skill && x.t0 <= it.t1 && x.t1 >= it.t0);
  const helpS = helpers.reduce((a, x) => a + x.s, 0);
  out.push({ ...it, xp, recipes, helpS, nHelpers: new Set(helpers.map((x) => x.who)).size });
}
console.log("## The old train loops (logs/dev.log, 11-04 → 11-21; head lines `Train <Skill> …` of the role holder, `Help <holder> train <Skill>` of the others; XP from the holder's `train <Skill>: craft … (+N xp each)` notes × the craft action)");
console.log("| skill | item | first → last action | holder h | helpers h (who) | fleet h | XP | recipes | XP / fleet-h | holder's groups (h) |");
console.log("|---|---|---|---|---|---|---|---|---|---|");
for (const o of out) {
  const g = Object.entries(o.grp).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${r1(v / 3600)}`).join(", ");
  const fh = (o.s + o.helpS) / 3600;
  console.log(`| ${o.skill} | ${o.text} | ${o.t0.slice(5, 16)} → ${o.t1.slice(5, 16)} | ${r1(o.s / 3600)} | ${r1(o.helpS / 3600)} (${o.nHelpers}) | ${r1(fh)} | ${o.xp} | ${o.recipes.join(", ")} | ${o.xp ? Math.round(o.xp / fh) : "—"} | ${g} |`);
}
// per skill: the late items (to Lv 15 and up), XP/h vs the atlas's xph
console.log("\n### Against the model: hours a level = xpNeeded[L] ÷ XP an hour; the model's = craftK 0.1 × craftTrain[L].hours = 0.1 × xpNeeded[L] ÷ the atlas's xph; so measured ÷ model = 10 × atlas xph ÷ measured XP an hour");
for (const o of out.filter((x) => x.xp > 3000)) {
  const tgt = +((/Lv (\d+)/.exec(o.text) ?? [])[1] ?? 0);
  const Ls = tgt ? [tgt - 5, tgt - 1] : [20, 20];
  const rows = atlas.craftTrain[o.skill].slice(Ls[0] - 1, Ls[1]);
  const xph = rows.reduce((a, r) => a + r.xph, 0) / rows.length;
  const fh = (o.s + o.helpS) / 3600;
  const ph = o.xp / fh, hh = o.xp / (o.s / 3600);
  console.log(`- ${o.skill} "${o.text}" (levels ${Ls[0]}–${Ls[1]} assumed, atlas xph ${Math.round(xph)} on ${[...new Set(rows.map((r) => r.code))].join("/")}): ${Math.round(ph)} XP/fleet-h (holder alone ${Math.round(hh)}) → measured ÷ model ${r2((10 * xph) / ph)} (fleet) / ${r2((10 * xph) / hh)} (holder alone); measured ÷ the atlas (craftK 1) ${r2(xph / ph)}`);
}
fs.writeFileSync(path.join(import.meta.dirname, "oldtrain.json"), JSON.stringify(out));
