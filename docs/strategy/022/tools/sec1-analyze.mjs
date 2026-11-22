// Task 022 section 1: what the leaders did. Read-only: reads the snapshot files and public/data, prints markdown tables.
// node D:\Temp\a022\out\sec1-analyze.mjs > D:\Temp\a022\out\sec1-tables.md
import { readFileSync } from "node:fs";

const ROOT = "G:/alex/projects/artifactsmmo/";
const SNAP = ROOT + "docs/strategy/022/snapshot/";
const OLD = ROOT + "docs/design/snapshot/";
const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const D = (n) => J(ROOT + "public/data/" + n + ".json");

const START = Date.parse("2026-10-24T00:00:00Z");
const DEADLINE = Date.parse("2027-02-24T00:00:00Z"); // src/plan/planner/config.ts:19
const T_OLD = Date.parse("2026-11-18T14:28:00Z"); // docs/design/planner.md:4 (the leaderboard read)
const T_NOW = Date.parse("2026-11-22T19:23:28.135Z"); // requests.log, leaderboard page 1
const DAY = 864e5;
const sday = (t) => Math.floor((t - START) / DAY) + 1;
const ymd = (t) => new Date(t).toISOString().slice(0, 10);
const med = (a) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return NaN; return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const f1 = (x) => (Number.isFinite(x) ? (Number.isInteger(x) ? String(x) : x.toFixed(1)) : "—");
const out = [];
const p = (s = "") => out.push(s);

// ---------- static data ----------
const items = new Map(D("items").map((i) => [i.code, i]));
const monsters = new Map(D("monsters").map((m) => [m.code, m]));
const resources = D("resources");
const achDefs = new Map(D("achievements").map((a) => [a.code, a]));
const npcItems = D("npc_items");
const events = D("events");
const maps = D("maps");
const staticContent = { monster: new Set(), resource: new Set(), npc: new Set() };
const layerOf = { monster: {}, resource: {} };
for (const t of maps) {
  const c = t.interactions?.content;
  if (!c || !staticContent[c.type]) continue;
  staticContent[c.type].add(c.code);
  if (layerOf[c.type]) (layerOf[c.type][c.code] ??= new Set()).add(t.layer);
}
const eventNpc = new Set(events.filter((e) => e.content.type === "npc").map((e) => e.content.code));
const rewardOf = new Map(); // item -> achievement that gives it
for (const a of achDefs.values()) for (const it of a.rewards?.items ?? []) rewardOf.set(it.code, a.code);

// ---------- where a material comes from: flags {event, boss, raid, gold, coins, achievement, currency} ----------
function sourcesOf(code) {
  const s = [];
  for (const r of resources) if (r.drops.some((d) => d.code === code)) s.push({ how: `node ${r.code} (${r.skill} ${r.level})`, flags: staticContent.resource.has(r.code) ? [] : ["event"] });
  for (const m of monsters.values()) if (m.drops.some((d) => d.code === code)) {
    const fl = m.type === "boss" ? ["boss"] : m.type === "raid_boss" ? ["raid"] : staticContent.monster.has(m.code) ? [] : ["event"];
    s.push({ how: `${m.type === "boss" ? "boss " : m.type === "raid_boss" ? "raid " : ""}${m.code} (Lv ${m.level})`, flags: fl });
  }
  for (const n of npcItems) if (n.code === code && n.buy_price != null) {
    const ev = eventNpc.has(n.npc) ? ["event"] : [];
    if (n.currency === "gold") s.push({ how: `${n.npc} ${n.buy_price} gold`, flags: ["gold", ...ev] });
    else if (n.currency === "tasks_coin") s.push({ how: `${n.npc} ${n.buy_price} tasks coins`, flags: ["coins", ...ev] });
    else { const sub = flagsOfLeaf(n.currency); s.push({ how: `${n.npc} ${n.buy_price} ${n.currency} (${sub.how})`, flags: [...new Set([...ev, ...sub.flags])] }); }
  }
  if (rewardOf.has(code)) s.push({ how: `reward of ${rewardOf.get(code)}`, flags: ["achievement", ...achFlags(rewardOf.get(code))] });
  return s;
}
// what an achievement itself needs: a boss, a raid, an event (its monsters and nodes)
function achFlags(code) {
  const f = new Set();
  for (const o of achDefs.get(code)?.objectives ?? []) {
    if (o.type === "combat_kill" || o.type === "combat_drop") {
      const ms = o.type === "combat_kill" ? [monsters.get(o.target)].filter(Boolean) : [...monsters.values()].filter((m) => m.drops.some((d) => d.code === o.target));
      const fl = ms.map((m) => (m.type === "boss" ? "boss" : m.type === "raid_boss" ? "raid" : staticContent.monster.has(m.code) ? "" : "event"));
      if (fl.length && fl.every((x) => x)) for (const x of fl) f.add(x);
    } else if (o.type === "gathering") {
      const ns = resources.filter((r) => r.drops.some((d) => d.code === o.target));
      if (ns.length && ns.every((r) => !staticContent.resource.has(r.code))) f.add("event");
    }
  }
  return [...f];
}
function flagsOfLeaf(code) {
  const s = sourcesOf(code);
  if (!s.length) return { how: "no source in data", flags: ["?"] };
  const free = s.find((x) => x.flags.length === 0);
  if (free) return { how: free.how, flags: [] };
  // every route carries a flag: the intersection is what is unavoidable; show the routes
  const inter = s.map((x) => new Set(x.flags)).reduce((a, b) => new Set([...a].filter((y) => b.has(y))));
  const flags = inter.size ? [...inter] : [...new Set(s.flatMap((x) => x.flags))].map((x) => x + "?");
  return { how: s.map((x) => x.how).join(" / "), flags };
}
// a piece's flagged leaf materials, through its recipe tree
function leavesOf(code, seen = new Set()) {
  if (seen.has(code)) return [];
  seen.add(code);
  const it = items.get(code);
  if (it?.craft) return it.craft.items.flatMap((g) => leavesOf(g.code, seen));
  const l = flagsOfLeaf(code);
  return l.flags.length ? [{ code, ...l }] : [];
}
function pieceInfo(code) {
  const it = items.get(code);
  if (!it) return { craft: "?", flags: ["?"], why: "not in items.json" };
  if (it.craft) {
    const lv = leavesOf(code);
    const flags = [...new Set(lv.flatMap((x) => x.flags))];
    return { craft: `${it.craft.skill} ${it.craft.level}`, flags, why: lv.map((x) => `${x.code}: ${x.how}`).join("; ") };
  }
  const l = flagsOfLeaf(code);
  return { craft: "not crafted", flags: l.flags, why: `${code}: ${l.how}` };
}

// ---------- gates of an achievement from data ----------
function gateOf(code) {
  const a = achDefs.get(code);
  if (!a) return "?";
  const g = [];
  for (const o of a.objectives) {
    const t = o.target;
    if (o.type === "combat_level") g.push(`combat ${o.total}`);
    else if (o.type === "gathering") {
      const nodes = resources.filter((r) => r.drops.some((d) => d.code === t));
      const n = nodes.sort((x, y) => x.level - y.level)[0];
      if (n) g.push(`${n.skill} ${n.level}${staticContent.resource.has(n.code) ? "" : "⚡"}${[...(layerOf.resource[n.code] ?? [])].every((l) => l !== "overworld") && layerOf.resource[n.code] ? "*" : ""}`);
    } else if (o.type === "crafting") {
      const c = items.get(t)?.craft;
      if (c) g.push(`${c.skill} ${c.level}`);
    } else if (o.type === "combat_kill") {
      const m = monsters.get(t);
      if (m) g.push(`kill Lv${m.level}${m.type === "boss" ? " boss" : m.type === "raid_boss" ? " raid" : ""}${staticContent.monster.has(t) ? "" : "⚡"}`);
    } else if (o.type === "combat_drop") {
      const ms = [...monsters.values()].filter((m) => m.drops.some((d) => d.code === t)).sort((x, y) => x.level - y.level);
      const m = ms[0];
      if (m) g.push(`drop Lv${m.level}${m.type === "boss" ? " boss" : ""}${staticContent.monster.has(m.code) ? "" : "⚡"}`);
    } else if (o.type === "use") g.push(`use Lv${items.get(t)?.level ?? "?"}`);
    else if (o.type === "npc_buy" || o.type === "npc_sell") { const n = npcItems.find((x) => x.code === t && (o.type === "npc_buy" ? x.buy_price != null : x.sell_price != null)); if (n) g.push(`${o.type === "npc_buy" ? "buy at" : "sell to"} ${n.npc}${eventNpc.has(n.npc) ? "⚡" : ""}`); }
    else if (o.type === "task") g.push("tasks");
    else if (o.type === "recycling") g.push("recycling");
    else if (o.type === "favor") g.push("favors");
  }
  // keep, per kind, the highest
  const best = new Map();
  for (const x of g) {
    const m = x.match(/^(.*?)(\d+)(.*)$/);
    if (!m) { best.set(x, x); continue; }
    const k = m[1].trim();
    const prev = best.get(k);
    const pv = prev ? Number(prev.match(/(\d+)/)[1]) : -1;
    if (Number(m[2]) > pv) best.set(k, x);
  }
  return [...best.values()].join(", ") || "—";
}
// the map's combat gate (atlas estimate), docs/design/achievement-map.md section C, column "needs before work can start"
const mapGate = new Map();
for (const line of readFileSync(ROOT + "docs/design/achievement-map.md", "utf8").split("\n")) {
  const c = line.split("|").map((x) => x.trim());
  if (c.length > 6 && achDefs.has(c[1])) {
    const need = c[5].split(" — ")[0];
    const m = need.match(/combat (\d+)/);
    mapGate.set(c[1], need === "done" ? "done 11-18" : m ? m[1] : need.startsWith("nothing") ? "—" : need.match(/raid/) ? "raid" : "—");
  }
}

// ---------- the reads ----------
const lbNow = [...J(SNAP + "leaderboard-accounts-1.json").data, ...J(SNAP + "leaderboard-accounts-2.json").data];
const lbNowTotal = J(SNAP + "leaderboard-accounts-1.json").total;
const lbOld = J(OLD + "leaderboard-accounts.json");
const oldBy = new Map(lbOld.data.map((r) => [r.account, r]));
const nowBy = new Map(lbNow.map((r) => [r.account, r]));
const READ = ["uaprsf", "Fox___", "hunter2", "Pischke", "Big_Shark", "Wudagem", "krolov", "Elemental", "Turbofish", "TheCarriedOne", "automode", "shuxart", "FRALEXAlexander", "chewbaccoin", "Odiodin", "Zetark", "alverus"];
const chars = {}, achs = {};
for (const a of READ) { chars[a] = J(SNAP + `acc-${a}-characters.json`).data; achs[a] = J(SNAP + `acc-${a}-achievements.json`).data.filter((x) => x.completed_at); }
const oldChars = new Map(J(OLD + "leaderboard-characters.json").data.map((c) => [c.name, c]));
const leaderOld = new Map(J(OLD + "leader-characters.json").data.map((c) => [c.name, c]));

// ========== 1. leaderboard ==========
p("## 1a. Leaderboard (leaderboard-accounts-1/-2.json, 2026-11-22 19:23 UTC; 11-18: docs/design/snapshot/leaderboard-accounts.json, 14:28 UTC)");
const me = nowBy.get("alverus");
p(`alverus: position ${me?.position}, ${me?.achievements_points} points (board), member ${me?.member}. Accounts listed now ${lbNow.length} of ${lbNowTotal}; 11-18 ${lbOld.data.length} of ${lbOld.total}.`);
p(`At or above 105: ${lbNow.filter((r) => r.achievements_points >= 105).length}; at or above 158: ${lbNow.filter((r) => r.achievements_points >= 158).length}; the top is ${lbNow[0].achievements_points}.`);
const oldMe = oldBy.get("alverus");
p(`alverus on 11-18: ${oldMe ? `position ${oldMe.position}, ${oldMe.achievements_points}` : "not in the first 100 of the old page"}.`);
const span = (T_NOW - T_OLD) / DAY;
p(`Span 11-18 14:28 → 11-22 19:23 = ${span.toFixed(2)} days; season day now ${sday(T_NOW)} (day 1 = 10-24); deadline 2027-02-24 = start of season day ${sday(DEADLINE)}; days left ${((DEADLINE - T_NOW) / DAY).toFixed(1)}.`);
p("");
p("| # | account | m | 11-18 (#) | now | +pts | pts/day | 158 at that pace (season day, date) | read accounts, by completed_at: 11-18 14:28 → now, pts/day, 158 on |");
p("|---|---|---|---|---|---|---|---|---|");
const pace = {};
const rows30 = lbNow.slice(0, 30);
if (!rows30.some((r) => r.account === "alverus")) rows30.push(me);
const sumAt = (a, t) => achs[a].filter((x) => Date.parse(x.completed_at) <= t).reduce((s, x) => s + x.points, 0);
const reach = (pts, pd) => { if (!(pd > 0)) return "never"; const t = T_NOW + ((158 - pts) / pd) * DAY; return `${sday(t)} (${ymd(t)})${t > DEADLINE ? " after the deadline" : ""}`; };
for (const r of rows30) {
  const o = oldBy.get(r.account);
  const oldPts = o ? o.achievements_points : null;
  const d = oldPts == null ? null : r.achievements_points - oldPts;
  const pd = d == null ? null : d / span;
  pace[r.account] = pd;
  let when = "—", atD = "—";
  if (pd != null) { atD = f1(r.achievements_points + pd * (DEADLINE - T_NOW) / DAY); when = reach(r.achievements_points, pd); }
  let rd = "";
  if (achs[r.account]) { const a0 = sumAt(r.account, T_OLD), a1 = sumAt(r.account, T_NOW); const pc = (a1 - a0) / span; rd = `${a0} → ${a1}, ${pc.toFixed(2)}, ${reach(a1, pc)}`; }
  p(`| ${r.position} | ${r.account} | ${r.member ? "y" : "n"} | ${oldPts ?? "≤2, not on the page"}${o ? ` (${o.position})` : ""} | ${r.achievements_points} | ${d ?? "—"} | ${pd == null ? "—" : pd.toFixed(2)} | ${when} | ${rd} |`);
}
const top30p = lbNow.slice(0, 30).map((r) => pace[r.account]).filter((x) => x != null);
p("");
p(`Top thirty: pace median ${med(top30p).toFixed(2)} pts/day, max ${Math.max(...top30p).toFixed(2)}, min ${Math.min(...top30p).toFixed(2)} (${top30p.length} of 30 on the 11-18 page). Pace needed for 158 by the deadline from 77 points: ${((158 - 77) / ((DEADLINE - T_NOW) / DAY)).toFixed(2)}; from 30: ${((158 - 30) / ((DEADLINE - T_NOW) / DAY)).toFixed(2)}; from 29: ${((158 - 29) / ((DEADLINE - T_NOW) / DAY)).toFixed(2)}.`);
p("");

// points by season day from completed_at
p("## 1b. Points by season day, from completed_at (acc-<a>-achievements.json, points of each completed achievement)");
p("");
const DAYS = [10, 15, 20, 24, 26, 28, 30];
p(`| account | board | Σ completed | first (day) | ${DAYS.map((d) => "d" + d).join(" | ")} | pts/day last 7 d | last 14 d |`);
p(`|---|---|---|---|${DAYS.map(() => "---").join("|")}|---|---|`);
for (const a of READ) {
  const L = achs[a];
  const sum = L.reduce((s, x) => s + x.points, 0);
  const first = Math.min(...L.map((x) => Date.parse(x.completed_at)));
  const at = (t) => L.filter((x) => Date.parse(x.completed_at) <= t).reduce((s, x) => s + x.points, 0);
  const cols = DAYS.map((d) => at(START + d * DAY)); // end of season day d
  const l7 = (sum - at(T_NOW - 7 * DAY)) / 7, l14 = (sum - at(T_NOW - 14 * DAY)) / 14;
  p(`| ${a} | ${nowBy.get(a)?.achievements_points ?? "?"} | ${sum} | ${sday(first)} | ${cols.join(" | ")} | ${l7.toFixed(2)} | ${l14.toFixed(2)} |`);
}
p("");
p("(dN = points completed by the end of season day N; d30 = now, 19:24 UTC.)");
p("");

// ========== 2. the order ==========
const ORDER = ["uaprsf", "Pischke", "Big_Shark", "Wudagem", "alverus"];
p("## 2. The order (completed_at → season day; gate from public/data; map = the map's combat gate, an atlas estimate)");
p("");
const codes = new Set(ORDER.flatMap((a) => achs[a].map((x) => x.code)));
const when = (a, c) => { const x = achs[a].find((y) => y.code === c); return x ? Date.parse(x.completed_at) : null; };
const sorted = [...codes].sort((x, y) => (when("uaprsf", x) ?? 9e15) - (when("uaprsf", y) ?? 9e15) || (when("Pischke", x) ?? 9e15) - (when("Pischke", y) ?? 9e15));
p(`| achievement | pts | gate (data) | map | ${ORDER.join(" | ")} |`);
p(`|---|---|---|---|${ORDER.map(() => "---").join("|")}|`);
for (const c of sorted) {
  p(`| ${c} | ${achDefs.get(c)?.points ?? "?"} | ${gateOf(c)} | ${mapGate.get(c) ?? "?"} | ${ORDER.map((a) => { const t = when(a, c); return t ? String(sday(t)) : ""; }).join(" | ")} |`);
}
p("");
// alverus has, they took later; and the other way
for (const a of ["uaprsf", "Pischke", "Big_Shark", "Wudagem"]) {
  const mine = achs.alverus.map((x) => x.code);
  const earlier = mine.filter((c) => { const t = when(a, c); return t == null || t > when("alverus", c); });
  const theirs = achs[a].filter((x) => !mine.includes(x.code));
  p(`- vs ${a}: alverus has first (they later or not yet): ${earlier.map((c) => `${c} (alverus d${sday(when("alverus", c))}, ${a} ${when(a, c) ? "d" + sday(when(a, c)) : "not yet"})`).join(", ") || "none"}.`);
  p(`  ${a} has, alverus not: ${theirs.length} achievements, ${theirs.reduce((s, x) => s + x.points, 0)} points: ${theirs.sort((x, y) => Date.parse(x.completed_at) - Date.parse(y.completed_at)).map((x) => `${x.code} d${sday(Date.parse(x.completed_at))}`).join(", ")}.`);
}
{
  const four = ["uaprsf", "Pischke", "Big_Shark", "Wudagem"];
  const mine = new Set(achs.alverus.map((x) => x.code));
  const core = [...codes].filter((c) => !mine.has(c) && four.filter((a) => when(a, c)).length >= 3);
  p(`- Done by at least three of the four and not by alverus: ${core.map((c) => `${c} (${achDefs.get(c).points}; ${gateOf(c)}; days ${four.map((a) => when(a, c) ? sday(when(a, c)) : "–").join("/")})`).join(", ")} — ${core.reduce((s, c) => s + achDefs.get(c).points, 0)} points.`);
}
p("");
// skill levels proven by day
p("### Levels the order proves (the first day a hard gate of a completed achievement shows a character at that level)");
p("");
const SK = ["combat", "mining", "woodcutting", "fishing", "alchemy", "cooking", "weaponcrafting", "gearcrafting", "jewelrycrafting"];
p(`| account | ${SK.join(" | ")} |`);
p(`|---|${SK.map(() => "---").join("|")}|`);
for (const a of ORDER) {
  const proof = {};
  for (const x of [...achs[a]].sort((u, v) => Date.parse(u.completed_at) - Date.parse(v.completed_at))) {
    for (const part of gateOf(x.code).split(", ")) {
      const m = part.match(/^([a-z]+) (\d+)/);
      if (!m || !SK.includes(m[1])) continue;
      (proof[m[1]] ??= []).push([Number(m[2]), sday(Date.parse(x.completed_at))]);
    }
  }
  p(`| ${a} | ${SK.map((s) => (proof[s] ?? []).reduce((acc, [lv, d]) => { if (!acc.length || lv > acc[acc.length - 1][0]) acc.push([lv, d]); return acc; }, []).map(([lv, d]) => `${lv}@d${d}`).join(" ")).join(" | ")} |`);
}
p("");

// ========== 3. levels against points ==========
p("## 3. Levels against points (acc-<a>-characters.json: level, *_level)");
p("");
p("| account | pts | m | combat (sorted) | c max | c med | wc max/med | gc max/med | jc max/med | alch max | top crafter (wc/gc/jc) |");
p("|---|---|---|---|---|---|---|---|---|---|---|");
const lvRows = [];
for (const a of READ) {
  const cs = chars[a];
  const lv = cs.map((c) => c.level).sort((x, y) => y - x);
  const g = (k) => cs.map((c) => c[k + "_level"]);
  const top = [...cs].sort((x, y) => (y.weaponcrafting_level + y.gearcrafting_level + y.jewelrycrafting_level) - (x.weaponcrafting_level + x.gearcrafting_level + x.jewelrycrafting_level))[0];
  const r = nowBy.get(a);
  lvRows.push({ a, pts: r?.achievements_points, cmed: med(lv), cmax: lv[0], wc: Math.max(...g("weaponcrafting")), gc: Math.max(...g("gearcrafting")), jc: Math.max(...g("jewelrycrafting")) });
  p(`| ${a} | ${r?.achievements_points} | ${r?.member ? "y" : "n"} | ${lv.join(" ")} | ${lv[0]} | ${med(lv)} | ${Math.max(...g("weaponcrafting"))}/${med(g("weaponcrafting"))} | ${Math.max(...g("gearcrafting"))}/${med(g("gearcrafting"))} | ${Math.max(...g("jewelrycrafting"))}/${med(g("jewelrycrafting"))} | ${Math.max(...g("alchemy"))} | ${top.name} ${top.level}: ${top.weaponcrafting_level}/${top.gearcrafting_level}/${top.jewelrycrafting_level} |`);
}
// Spearman
const rank = (v) => { const s = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = new Array(v.length); let i = 0; while (i < s.length) { let j = i; while (j + 1 < s.length && s[j + 1][0] === s[i][0]) j++; for (let k = i; k <= j; k++) r[s[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
const sp = (x, y) => { const rx = rank(x), ry = rank(y); const mx = med(rx), n = x.length; const ax = rx.reduce((s, v) => s + v, 0) / n, ay = ry.reduce((s, v) => s + v, 0) / n; let c = 0, vx = 0, vy = 0; for (let i = 0; i < n; i++) { c += (rx[i] - ax) * (ry[i] - ay); vx += (rx[i] - ax) ** 2; vy += (ry[i] - ay) ** 2; } return c / Math.sqrt(vx * vy); };
const P = lvRows.map((r) => r.pts);
p("");
p(`Spearman rank correlation with points over the ${lvRows.length} accounts: combat median ${sp(P, lvRows.map((r) => r.cmed)).toFixed(2)}, combat max ${sp(P, lvRows.map((r) => r.cmax)).toFixed(2)}, weaponcrafting max ${sp(P, lvRows.map((r) => r.wc)).toFixed(2)}, gearcrafting max ${sp(P, lvRows.map((r) => r.gc)).toFixed(2)}, jewelrycrafting max ${sp(P, lvRows.map((r) => r.jc)).toFixed(2)}.`);
p("");
// combat 11-18 -> now, for characters on the 11-18 character board (top 100) or the leader's read
p("### Combat levels 11-18 → now (11-18: leaderboard-characters.json, the first 100 characters; leader-characters.json)");
p("");
p("| account | character: 11-18 → now |");
p("|---|---|");
for (const a of READ) {
  const s = chars[a].map((c) => {
    const o = oldChars.get(c.name) ?? leaderOld.get(c.name);
    if (!o) return null;
    const cr = c.weaponcrafting_level + c.gearcrafting_level + c.jewelrycrafting_level > 40 ? ` (wc/gc/jc ${o.weaponcrafting_level}/${o.gearcrafting_level}/${o.jewelrycrafting_level} → ${c.weaponcrafting_level}/${c.gearcrafting_level}/${c.jewelrycrafting_level})` : "";
    return `${c.name} ${o.level}→${c.level}${cr}`;
  }).filter(Boolean);
  if (s.length) p(`| ${a} | ${s.join(", ")} |`);
}
const lowest100 = Math.min(...J(OLD + "leaderboard-characters.json").data.map((c) => c.level));
p("");
p(`(The 11-18 page holds characters down to level ${lowest100}; a character not listed was below that or below position 100.)`);
p("");

// ========== 6. how many fight ==========
p("## 6. How many characters fight (combat levels per account; near = within 3 of the account's top, far = 10 or more below)");
p("");
p("| account | pts | combat | near top | 4–9 below | 10+ below | shape | the 10+ below: name combat, skills at 40+ |");
p("|---|---|---|---|---|---|---|---|");
const SKS = ["mining", "woodcutting", "fishing", "alchemy", "cooking", "weaponcrafting", "gearcrafting", "jewelrycrafting"];
for (const a of READ) {
  const lv = chars[a].map((c) => c.level).sort((x, y) => y - x);
  const near = lv.filter((x) => x >= lv[0] - 3).length, mid = lv.filter((x) => x < lv[0] - 3 && x > lv[0] - 10).length, far = lv.filter((x) => x <= lv[0] - 10).length;
  const w = chars[a].filter((c) => c.level <= lv[0] - 10).map((c) => `${c.name} ${c.level}: ${SKS.filter((k) => c[k + "_level"] >= 40).map((k) => `${k.slice(0, 5)} ${c[k + "_level"]}`).join(" ") || "none"}`).join("; ");
  p(`| ${a} | ${nowBy.get(a)?.achievements_points} | ${lv.join(" ")} | ${near} | ${mid} | ${far} | ${near}+${mid}+${far} | ${w || "—"} |`);
}
p("");

// ========== 4. what they wear ==========
const SLOTS = ["weapon", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring1", "ring2", "amulet"];
const isTool = (c) => items.get(c.weapon_slot)?.subtype === "tool";
const all = READ.flatMap((a) => chars[a].map((c) => ({ ...c, account: a })));
p("## 4. What they wear (characters' *_slot; a character whose weapon is a tool is in a gathering set and left out)");
p("");
const bands = [["30–34", 30, 34], ["35–39", 35, 39], ["40+", 40, 99]];
const flagged = new Map();
for (const [name, lo, hi] of bands) {
  const cs = all.filter((c) => c.level >= lo && c.level <= hi);
  const fight = cs.filter((c) => c.weapon_slot && !isTool(c));
  p(`### Combat ${name}: ${cs.length} characters, ${fight.length} in a fight set (${cs.length - fight.length} with a tool or no weapon)`);
  p("");
  p("| slot | pieces worn (count; craft skill level; flags) |");
  p("|---|---|");
  for (const s of ["weapon", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring", "amulet"]) {
    const cnt = new Map();
    for (const c of fight) for (const k of s === "ring" ? ["ring1_slot", "ring2_slot"] : [s + "_slot"]) if (c[k]) cnt.set(c[k], (cnt.get(c[k]) ?? 0) + 1);
    const top = [...cnt].sort((x, y) => y[1] - x[1]);
    p(`| ${s} | ${top.slice(0, 6).map(([code, n]) => { const i = pieceInfo(code); if (i.flags.length) flagged.set(code, i); return `${code} ×${n} (${i.craft}${i.flags.length ? "; " + i.flags.join(",") : ""})`; }).join(", ")}${top.length > 6 ? `, +${top.length - 6} more` : ""} |`);
  }
  // craft levels of the worn crafted pieces
  const lvls = { weaponcrafting: [], gearcrafting: [], jewelrycrafting: [] };
  for (const c of fight) for (const k of SLOTS) { const it = items.get(c[k + "_slot"]); if (it?.craft && lvls[it.craft.skill]) lvls[it.craft.skill].push(it.craft.level); }
  {
    const worn = fight.flatMap((c) => SLOTS.map((k) => c[k + "_slot"])).filter(Boolean).map((x) => pieceInfo(x).flags);
    const share = (f) => `${worn.filter((x) => x.includes(f)).length}`;
    p("");
    p(`Of the ${worn.length} pieces worn: an event material ${share("event")}, tasks coins ${share("coins")}, a boss ${share("boss")}, a raid ${share("raid")}, gold ${share("gold")}, an achievement reward only ${worn.filter((x) => x.length === 1 && x[0] === "achievement").length}, none of these ${worn.filter((x) => !x.length).length}.`);
  }
  p("");
  p(`Craft level of the crafted pieces worn: ${Object.entries(lvls).map(([k, v]) => `${k} median ${med(v)}, max ${Math.max(...v)} (n=${v.length})`).join("; ")}. Not crafted: ${fight.flatMap((c) => SLOTS.map((k) => c[k + "_slot"])).filter((x) => x && !items.get(x)?.craft).length} of ${fight.flatMap((c) => SLOTS.map((k) => c[k + "_slot"])).filter(Boolean).length} pieces.`);
  p("");
}
{
  // by material: every flagged leaf of the pieces worn by the fight sets at 30+, with the pieces and how often they are worn
  const worn = new Map();
  for (const c of all.filter((c) => c.level >= 30 && c.weapon_slot && !isTool(c))) for (const k of SLOTS) if (c[k + "_slot"]) worn.set(c[k + "_slot"], (worn.get(c[k + "_slot"]) ?? 0) + 1);
  const byMat = new Map();
  for (const [code, n] of worn) {
    const it = items.get(code);
    const leaves = it?.craft ? leavesOf(code) : (() => { const l = flagsOfLeaf(code); return l.flags.length ? [{ code, ...l }] : []; })();
    for (const l of leaves) { const e = byMat.get(l.code) ?? byMat.set(l.code, { how: l.how, flags: l.flags, pieces: new Map() }).get(l.code); e.pieces.set(code, n); }
  }
  p("### The flagged materials of the pieces worn by the fight sets at combat 30+ (worn instances in brackets)");
  p("");
  p("| material | flags | source (public/data) | pieces (worn) | worn instances |");
  p("|---|---|---|---|---|");
  for (const [m, e] of [...byMat].sort((a, b) => [...b[1].pieces.values()].reduce((s, x) => s + x, 0) - [...a[1].pieces.values()].reduce((s, x) => s + x, 0)))
    p(`| ${m} | ${e.flags.join(", ")} | ${e.how} | ${[...e.pieces].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${n})`).join(", ")} | ${[...e.pieces.values()].reduce((s, x) => s + x, 0)} |`);
  p("");
}
p("### The worn pieces with a flagged material (event, boss, raid, gold, tasks coins, achievement reward)");
p("");
p("| piece | craft | flags | the material and its source |");
p("|---|---|---|---|");
for (const [code, i] of [...flagged].sort()) p(`| ${code} | ${i.craft} | ${i.flags.join(", ")} | ${i.why} |`);
p("");

// ========== 5. utility, runes, artifacts, bags ==========
p("## 5. What they hold: utility slots, rune, artifacts, bag (per account; ×n = characters)");
p("");
p("| account | utility (code qty) | rune | artifacts | bag | food in bags |");
p("|---|---|---|---|---|---|");
const count = (arr) => { const m = new Map(); for (const x of arr) if (x) m.set(x, (m.get(x) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => (n > 1 ? `${k} ×${n}` : k)).join(", ") || "—"; };
const freq = { util: new Map(), rune: new Map(), art: new Map(), bag: new Map(), food: new Map() };
const inc = (m, k, n = 1) => k && m.set(k, (m.get(k) ?? 0) + n);
for (const a of READ) {
  const cs = chars[a];
  const util = cs.flatMap((c) => [c.utility1_slot && `${c.utility1_slot} ${c.utility1_slot_quantity}`, c.utility2_slot && `${c.utility2_slot} ${c.utility2_slot_quantity}`]).filter(Boolean);
  for (const c of cs) { inc(freq.util, c.utility1_slot); inc(freq.util, c.utility2_slot); inc(freq.rune, c.rune_slot); for (const k of ["artifact1_slot", "artifact2_slot", "artifact3_slot"]) inc(freq.art, c[k]); inc(freq.bag, c.bag_slot); for (const s of c.inventory ?? []) if (items.get(s.code)?.subtype === "food") inc(freq.food, s.code, 1); }
  const food = cs.flatMap((c) => (c.inventory ?? []).filter((s) => items.get(s.code)?.subtype === "food").map((s) => `${s.code} ${s.quantity}`));
  p(`| ${a} | ${util.join(", ") || "—"} | ${count(cs.map((c) => c.rune_slot))} | ${count(cs.flatMap((c) => [c.artifact1_slot, c.artifact2_slot, c.artifact3_slot]))} | ${count(cs.map((c) => c.bag_slot))} | ${food.join(", ") || "—"} |`);
}
p("");
{
  const hasFood = (c) => (c.inventory ?? []).some((s) => items.get(s.code)?.subtype === "food");
  const hasPot = (c) => !!(c.utility1_slot || c.utility2_slot);
  for (const [name, lo] of [["35+", 35], ["40+", 40]]) {
    const fs = all.filter((c) => c.level >= lo && c.weapon_slot && !isTool(c));
    const ot = all.filter((c) => c.level >= lo && !(c.weapon_slot && !isTool(c)));
    p(`Combat ${name}, in a fight set (${fs.length}): a utility potion worn ${fs.filter(hasPot).length}, a rune ${fs.filter((c) => c.rune_slot).length}, food in the bag ${fs.filter(hasFood).length}, none of the three ${fs.filter((c) => !hasPot(c) && !c.rune_slot && !hasFood(c)).length}. The others (${ot.length}, a tool or no weapon): a potion ${ot.filter(hasPot).length}, a rune ${ot.filter((c) => c.rune_slot).length}, food ${ot.filter(hasFood).length}.`);
  }
}
p("");
p("Totals over the " + all.length + " characters, with each item's source (public/data):");
p("");
p("| kind | item | characters | level | craft or source |");
p("|---|---|---|---|---|");
for (const [kind, m] of Object.entries(freq)) for (const [code, n] of [...m].sort((a, b) => b[1] - a[1])) {
  const it = items.get(code);
  const src = it?.craft ? `${it.craft.skill} ${it.craft.level}: ${it.craft.items.map((g) => g.code + "×" + g.quantity).join(" + ")}` : sourcesOf(code).map((s) => s.how).join(" / ");
  p(`| ${kind} | ${code} | ${n} | ${it?.level ?? "?"} | ${src} |`);
}
p("");

// ========== 7. GE history ==========
p("## 7. Grand Exchange history (ge-history-<code>.json: the last 7 days of sales, docs/api/openapi.json; one page of 100 at most)");
p("");
p("| code | sales rows (of total) | window of the page | units in the page | units in 7 days (paged: × total/rows, guess) | per day over 7 days | price min / median / max (per unit, by unit) | sellers | top sellers by units | buyers |");
p("|---|---|---|---|---|---|---|---|---|---|");
for (const c of ["minor_health_potion", "small_health_potion", "health_potion", "algae", "nettle_leaf", "sunflower"]) {
  const j = J(SNAP + `ge-history-${c}.json`);
  const d = j.data;
  if (!d.length) { p(`| ${c} | 0 (of ${j.total}) | — | 0 | 0 | 0 | — | 0 | — | 0 |`); continue; }
  const t0 = Date.parse(d[0].sold_at), t1 = Date.parse(d[d.length - 1].sold_at);
  const units = d.reduce((s, x) => s + x.quantity, 0);
  const per = d.flatMap((x) => Array(x.quantity).fill(x.price));
  const sel = new Map(), buy = new Set();
  for (const x of d) { sel.set(x.seller, (sel.get(x.seller) ?? 0) + x.quantity); buy.add(x.buyer); }
  const u7 = Math.round((units * j.total) / d.length);
  p(`| ${c} | ${d.length} (of ${j.total}) | ${d[0].sold_at.slice(5, 16)} → ${d[d.length - 1].sold_at.slice(5, 16)} | ${units} | ${d.length < j.total ? "≈" : ""}${u7} | ${d.length < j.total ? "≈" : ""}${Math.round(u7 / 7)} | ${Math.min(...per)} / ${med(per)} / ${Math.max(...per)} | ${sel.size} | ${[...sel].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s, n]) => `${s} ${n} (${Math.round((100 * n) / units)}%)`).join(", ")} | ${buy.size} |`);
}
p("");
console.log(out.join("\n"));
