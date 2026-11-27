// Task 034: the board viewer. data.js (derive.mjs) sets window.BOARD: the reads' files in order (see derive.mjs's header)
// and the catalog's names for their codes. This script replays them into a series a character and draws plain SVG.
"use strict";
const B = window.BOARD;
const H = 3.6e6, DAY = 864e5, ME = B.me, CUM = B.cum, AB = B.ab, SKILLS = B.skills, SLOTS = B.slots;
const GEAR = 13, SHOWN_SLOTS = 15; // the set: weapon … rune; the page also draws the two utilities
const MAX_H = 6; // an interval longer than this (024's reads, a missed read) is left out of the level view's XP an hour
const DARK = matchMedia("(prefers-color-scheme: dark)").matches;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const n0 = (x) => (Number.isFinite(x) ? Math.round(x).toLocaleString("en-US") : "—");
const f1 = (x) => (Number.isFinite(x) ? (Math.round(x * 10) / 10).toLocaleString("en-US") : "—");
const tFmt = (t) => new Date(t).toISOString().slice(5, 16).replace("T", " ");
const dFmt = (t) => new Date(t).toISOString().slice(0, 10);
const levelOf = (x) => { let L = 1; while (L < 50 && CUM[L + 1] <= x) L++; return L; };
const fracOf = (x) => { const L = levelOf(x); return L >= 50 ? 50 : L + (x - CUM[L]) / (CUM[L + 1] - CUM[L]); };
const upperHinge = (a) => { const s = [...a].sort((x, y) => x - y), h = Math.floor(s.length / 2), u = s.slice(s.length % 2 ? h + 1 : h); return u.length ? (u.length % 2 ? u[(u.length - 1) / 2] : (u[u.length / 2 - 1] + u[u.length / 2]) / 2) : Infinity; };

// ---- replay the reads: an account's and a character's series, one entry a read it is in
const dict = [""], READS = [], ACC = new Map();
for (const [ri, r] of B.reads.entries()) {
  for (const c of r.dict) dict.push(c);
  READS.push({ id: r.id, t: r.t, src: r.src });
  for (const [name, e] of Object.entries(r.acc)) {
    let A = ACC.get(name);
    if (!A) ACC.set(name, (A = { name, rs: [], pos: [], pts: [], p: [0, 0], ach: new Map(), ctr: new Map(), chars: new Map() }));
    if (e.p) A.p = e.p;
    A.rs.push(ri);
    A.pos.push(A.p[0]);
    A.pts.push(A.p[1]);
    if (e.a) for (let i = 0; i < e.a.length; i += 2) A.ach.set(dict[e.a[i]], e.a[i + 1]);
    if (e.k) for (let i = 0; i < e.k.length; i += 2) { const k = dict[e.k[i]]; (A.ctr.get(k) ?? A.ctr.set(k, []).get(k)).push([ri, e.k[i + 1]]); }
    for (const [n, d] of Object.entries(e.c ?? {})) {
      let C = A.chars.get(n);
      if (!C) A.chars.set(n, (C = { name: n, acc: A, rs: [], X: [], m: [], s: [], b: [], t: [], h: [], f: [], cur: { f: null } }));
      const cur = C.cur;
      if (d.X) cur.X = d.X;
      if (d.x) cur.X = cur.X.map((v, i) => v + (d.x[i] ?? 0));
      if (d.m != null) cur.m = d.m;
      if (d.s) cur.s = d.s.map((i) => dict[i]);
      if (d.b) cur.b = d.b.map((x, i) => (i % 2 ? x : dict[x]));
      if (d.t) cur.t = d.t.map((x, i) => (i < 2 ? dict[x] : x));
      if (d.h) cur.h = d.h;
      if (d.f != null) cur.f = dict[d.f];
    }
    // shortcut: a character is taken to be in every read of its account from its first on (a deleted one would stay);
    // have derive.mjs list a read's missing characters once the board shows one
    for (const C of A.chars.values()) { for (const k of ["X", "m", "s", "b", "t", "h", "f"]) C[k].push(C.cur[k]); C.rs.push(ri); C.cur.f = null; }
  }
}
const T0 = READS[0].t, T1 = READS.at(-1).t;
const tileOf = (id) => B.tiles[id];
const monAt = (id) => { const t = B.tiles[id]; return t && t[4] === "monster" ? t[5] : null; };
// the intervals: g the XP gained (combat + 8 skills), dh the hours, mon the monster fought (whole.mjs's rule)
for (const A of ACC.values()) for (const C of A.chars.values()) {
  C.g = [null]; C.dh = [null]; C.mon = [null];
  for (let j = 1; j < C.rs.length; j++) {
    C.g.push(C.X[j].map((v, i) => v - C.X[j - 1][i]));
    C.dh.push((READS[C.rs[j]].t - READS[C.rs[j - 1]].t) / H);
    C.mon.push(monAt(C.m[j]) ?? monAt(C.m[j - 1]) ?? C.f[j]);
  }
}
/** A character's index at its account's entry j (a character joins its account's series at its first read). */
const ci = (C, j) => j - (C.acc.rs.length - C.rs.length);
const charsAt = (A, j) => [...A.chars.values()].map((C) => ({ C, k: ci(C, j) })).filter((x) => x.k >= 0);
const byPos = () => [...ACC.values()].sort((a, b) => (a.pos.at(-1) || 999) - (b.pos.at(-1) || 999) || (a.name < b.name ? -1 : 1));
const accMark = (name) => (name === ME ? `<span class="me">${esc(name)}</span>` : esc(name));

// ---- names and colours
const itemName = (c) => B.items[c]?.[0] ?? c;
const itemLv = (c) => B.items[c]?.[1] ?? "?";
const monTxt = (m) => (m ? `${m} (${B.monsters[m]?.[1] ?? "?"})` : "?");
const tileTxt = (id) => {
  const t = tileOf(id);
  if (!t) return `map ${id}`;
  const what = t[4] ? `${t[6] ? "⚡ event " : ""}${t[4]} ${t[4] === "monster" ? monTxt(t[5]) : t[5]}` : "elsewhere";
  return `${what} — ${t[0]} (${t[1]}, ${t[2]}${t[3] && t[3] !== "overworld" ? `, ${t[3]}` : ""})`;
};
const MONS = Object.keys(B.monsters).sort((a, b) => B.monsters[a][1] - B.monsters[b][1] || (a < b ? -1 : 1));
const monHue = new Map(MONS.map((m, i) => [m, (i * 137.508) % 360]));
const monColor = (m) => `hsl(${Math.round(monHue.get(m) ?? 0)} 72% ${DARK ? 58 : 47}%)`;
const KIND = { resource: "var(--res)", workshop: "var(--shop)", bank: "var(--bank)" };
const tileColor = (id) => { const t = tileOf(id); return !t || !t[4] ? "var(--else)" : t[4] === "monster" ? monColor(t[5]) : KIND[t[4]] ?? "var(--else)"; };
const hashHue = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 360; };
const pieceColor = (c) => `hsl(${hashHue(c)} 42% ${DARK ? 36 : 78}%)`;
const lvBg = (L) => { const k = Math.max(0, Math.min(1, (L - 1) / 49)); return DARK ? `hsl(210 50% ${12 + k * 38}%)` : `hsl(210 65% ${96 - k * 58}%)`; };
const lvFg = (L) => (DARK || L >= 34 ? "#fff" : "#111");
const gainTxt = (g, dh) => g.map((v, i) => (v > 0 ? `${AB[i]} +${n0(v)} (${n0(v / dh)}/h)` : "")).filter(Boolean).join(", ") || "no XP";
const bagTxt = (b) => { const o = []; for (let i = 0; i < (b?.length ?? 0); i += 2) o.push(`${b[i + 1]} ${b[i]}`); return o.join(", ") || "empty"; };

// ---- page plumbing: the hash is the state; [data-tip] hovers, [data-go] navigates, [data-list] fills the detail panel
const P = () => Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
const href = (o) => "#" + new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== "")).toString();
function setp(o) { location.hash = href({ ...P(), ...o }); }
const openAt = (C, j) => href({ v: "acc", a: C.acc.name, r: READS[C.rs[j]].id, c: C.name });
const tip = document.getElementById("tip");
document.addEventListener("mouseover", (e) => {
  const el = e.target.closest?.("[data-tip]");
  if (!el) { tip.style.display = "none"; return; }
  tip.textContent = el.getAttribute("data-tip");
  tip.style.display = "block";
});
document.addEventListener("mousemove", (e) => {
  if (tip.style.display !== "block") return;
  tip.style.left = Math.max(4, Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8)) + "px";
  tip.style.top = (e.clientY + 18 + tip.offsetHeight > innerHeight ? e.clientY - tip.offsetHeight - 10 : e.clientY + 18) + "px";
});
const LISTS = [];
document.addEventListener("click", (e) => {
  const go = e.target.closest?.("[data-go]");
  if (go) { location.hash = go.getAttribute("data-go"); return; }
  const li = e.target.closest?.("[data-list]");
  if (li) showList(LISTS[+li.getAttribute("data-list")]);
  const so = e.target.closest?.("[data-sort]");
  if (so) { const k = so.getAttribute("data-sort"); SORT = SORT.k === k ? { k, d: -SORT.d } : { k, d: k === "name" || k === "pos" ? 1 : -1 }; render(); }
});
const W = () => Math.max(640, Math.min(1500, document.getElementById("main").clientWidth - 36)); // less main's padding
const tipAttr = (s) => `data-tip="${esc(s)}"`;
/** Day lines and labels on a time axis from x0, w wide, h tall. */
function timeAxis(x0, w, h, X) {
  let s = "";
  const days = [];
  for (let d = Math.ceil(T0 / DAY) * DAY; d <= T1; d += DAY) days.push(d);
  const step = Math.max(1, Math.ceil(days.length / Math.max(1, Math.floor(w / 46))));
  days.forEach((d, i) => { const x = X(d); s += `<line class="grid" x1="${x}" x2="${x}" y1="0" y2="${h}"/>`; if (i % step === 0) s += `<text x="${x + 2}" y="${h + 11}" class="mute">${dFmt(d).slice(5)}</text>`; });
  return s;
}
const timeX = (x0, w) => (t) => x0 + ((t - T0) / (T1 - T0 || 1)) * w;

// =========================================================================================== 1. everyone
let SORT = { k: "pos", d: 1 };
function accStats(A) {
  const j = A.rs.length - 1, t1 = READS[A.rs[j]].t, cs = charsAt(A, j);
  const lv = cs.map((x) => levelOf(x.C.X[x.k][0])).sort((a, b) => b - a);
  const best = (s) => Math.max(0, ...cs.map((x) => levelOf(x.C.X[x.k][s])));
  const cxp = (j0) => cs.reduce((s, x) => { const k0 = ci(x.C, j0); return s + (k0 >= 0 ? x.C.X[x.k][0] - x.C.X[k0][0] : 0); }, 0);
  let j24 = j;
  while (j24 > 0 && t1 - READS[A.rs[j24 - 1]].t <= 24.5 * H) j24--;
  const perDay = (j0) => (j0 < j ? cxp(j0) / ((t1 - READS[A.rs[j0]].t) / DAY) : NaN);
  const tk = A.ctr.get("task:");
  const tasks = tk && tk.length > 1 && t1 > READS[tk[0][0]].t ? (tk.at(-1)[1] - tk[0][1]) / ((t1 - READS[tk[0][0]].t) / DAY) : NaN;
  return { A, name: A.name, pos: A.pos[j] || 999, pts: A.pts[j], lv, wc: best(4), gc: best(5), jc: best(6), mi: best(1), wo: best(2), fi: best(3), al: best(8), co: best(7), x24: perDay(j24), xall: perDay(0), tasks, at: READS[A.rs[j]].id };
}
function topSeries(A, f) {
  return A.rs.map((ri, j) => {
    const ls = charsAt(A, j).map((x) => fracOf(x.C.X[x.k][0])).sort((a, b) => b - a);
    return [READS[ri].t, f(ls), A.pts[j], ri];
  });
}
const top3 = (ls) => ls.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, ls.length);
function viewEveryone(p) {
  const pick = ACC.has(p.pick) ? p.pick : null, accs = byPos(), w = Math.min(W(), 1100);
  let html = `<h2>1. Everyone</h2><p class="note">${accs.length} accounts read at least once. <span class="me">${ME}</span> always in orange; the picked account in blue — pick one: <select onchange="setp({pick:this.value})"><option value="">—</option>${accs.map((A) => `<option ${A.name === pick ? "selected" : ""}>${esc(A.name)}</option>`).join("")}</select> (or click a dot or a line). A row of the table opens the account.</p>`;
  // (a) the scatter
  const ser = new Map(accs.map((A) => [A.name, topSeries(A, top3)]));
  const all = [...ser.values()].flat(), hS = 440, m = { l: 44, r: 16, t: 10, b: 30 }, iw = w - m.l - m.r, ih = hS - m.t - m.b;
  const xs = all.map((d) => d[1]), x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs)), y1 = Math.max(...all.map((d) => d[2])) + 2;
  const sx = (v) => m.l + ((v - x0) / (x1 - x0 || 1)) * iw, sy = (v) => m.t + ih - (v / y1) * ih;
  let s = "";
  for (let v = x0; v <= x1; v++) if (v % 5 === 0 || x1 - x0 < 12) s += `<line class="grid" x1="${sx(v)}" x2="${sx(v)}" y1="${m.t}" y2="${m.t + ih}"/><text x="${sx(v) - 5}" y="${hS - 14}" class="mute">${v}</text>`;
  for (let v = 0; v <= y1; v += 10) s += `<line class="grid" x1="${m.l}" x2="${m.l + iw}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${m.l - 22}" y="${sy(v) + 3}" class="mute">${v}</text>`;
  s += `<text x="${m.l + iw / 2 - 120}" y="${hS - 2}" class="mute">mean combat level of the three highest characters (with the level's progress)</text><text x="2" y="${m.t + 8}" class="mute">pts</text>`;
  const order = [...accs].sort((a, b) => (a.name === ME || a.name === pick ? 1 : 0) - (b.name === ME || b.name === pick ? 1 : 0));
  for (const A of order) {
    const d = ser.get(A.name), hi = A.name === ME ? "var(--me)" : A.name === pick ? "var(--pick)" : null, last = d.at(-1);
    const tipS = `${A.name} — #${A.pos.at(-1)}, ${last[2]} pts, top three ${f1(last[1])} (${READS[last[3]].id})\nfirst: ${d[0][2]} pts, ${f1(d[0][1])} (${READS[d[0][3]].id})`;
    s += `<polyline fill="none" stroke="${hi ?? "var(--mute)"}" stroke-opacity="${hi ? 1 : 0.35}" stroke-width="${hi ? 2 : 1}" points="${d.map((q) => `${sx(q[1]).toFixed(1)},${sy(q[2]).toFixed(1)}`).join(" ")}"/>`;
    s += `<circle cx="${sx(last[1])}" cy="${sy(last[2])}" r="${hi ? 5 : 3.5}" fill="${hi ?? "var(--mute)"}" ${tipAttr(tipS)} data-go="${href({ v: "everyone", pick: A.name })}"/>`;
    if (hi) s += `<text x="${sx(last[1]) + 7}" y="${sy(last[2]) + 3}" font-weight="700">${esc(A.name)}</text>`;
  }
  html += `<h3>(a) Points against the mean combat level of the three highest characters; a dot the account now, its trail over the reads</h3><p class="note">A trail going up bought points, going right bought levels.</p><svg width="${w}" height="${hS}">${s}</svg>`;
  // (b) the table
  const rows = accs.map(accStats), num = (r, k) => (k === "name" ? r.name.toLowerCase() : k.startsWith("c") && /^c\d$/.test(k) ? r.lv[+k[1] - 1] ?? -1 : r[k]);
  rows.sort((a, b) => { const x = num(a, SORT.k), y = num(b, SORT.k); const nx = x == null || Number.isNaN(x), ny = y == null || Number.isNaN(y); return nx !== ny ? (nx ? 1 : -1) : (x < y ? -1 : x > y ? 1 : 0) * SORT.d || a.pos - b.pos; });
  const cols = [["pos", "#"], ["name", "account", "l"], ["pts", "pts"], ["c1", "cb 1"], ["c2", "2"], ["c3", "3"], ["c4", "4"], ["c5", "5"], ["wc", "wc"], ["gc", "gc"], ["jc", "jc"], ["mi", "mi"], ["wo", "wo"], ["fi", "fi"], ["al", "al"], ["co", "co"], ["x24", "combat XP a day, 24 h"], ["xall", "…, whole span"], ["tasks", "tasks a day"]];
  const lvCell = (L) => (L == null ? "<td></td>" : `<td style="background:${lvBg(L)};color:${lvFg(L)}">${L}</td>`);
  html += `<h3>(b) The accounts now (each at its last read); a click on a header sorts, on a row opens the account</h3><p class="note">cb 1–5: the five combat levels, highest first. wc gc jc: the account's best weaponcrafting, gearcrafting, jewelrycrafting; mi wo fi al co: its best mining, woodcutting, fishing, alchemy, cooking. Combat XP a day: the five characters', over the last 24 h and over every read of the account. Tasks a day: the account's task counter over the reads that hold counters (from 11-23).</p>`;
  html += `<div class="scroll"><table><thead><tr>${cols.map(([k, t, c]) => `<th class="${c ?? ""}" data-sort="${k}">${t}${SORT.k === k ? (SORT.d > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}</tr></thead><tbody>`;
  for (const r of rows) {
    html += `<tr class="row ${r.name === ME ? "me" : ""}" data-go="${href({ v: "acc", a: r.name })}" ${tipAttr(`${r.name}, at ${r.at}`)}><td>${r.pos === 999 ? "—" : r.pos}</td><td class="l">${esc(r.name)}${r.name === pick ? " ◆" : ""}</td><td>${r.pts}</td>${[0, 1, 2, 3, 4].map((i) => lvCell(r.lv[i])).join("")}${["wc", "gc", "jc", "mi", "wo", "fi", "al", "co"].map((k) => lvCell(r[k])).join("")}<td>${n0(r.x24)}</td><td>${n0(r.xall)}</td><td>${f1(r.tasks)}</td></tr>`;
  }
  html += `</tbody></table></div>`;
  // (c) points and top combat over time
  html += `<h3>(c) Points and the top combat level over time, every account a line</h3>`;
  html += lines(accs, pick, w, (A) => topSeries(A, (ls) => ls[0]).map((d) => [d[0], d[2]]), "points", 0);
  html += lines(accs, pick, w, (A) => topSeries(A, (ls) => ls[0]).map((d) => [d[0], d[1]]), "top combat level", 1);
  return html;
}
function lines(accs, pick, w, f, label, dec) {
  const h = 260, m = { l: 44, r: 90, t: 8, b: 18 }, iw = w - m.l - m.r, ih = h - m.t - m.b, X = timeX(m.l, iw);
  const ser = accs.map((A) => [A, f(A)]), ys = ser.flatMap(([, d]) => d.map((q) => q[1]));
  const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys)), Y = (v) => m.t + ih - ((v - y0) / (y1 - y0 || 1)) * ih;
  let s = timeAxis(m.l, iw, m.t + ih, X);
  const step = Math.max(1, Math.round((y1 - y0) / 6 / 5) * 5) || 1;
  for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) s += `<line class="grid" x1="${m.l}" x2="${m.l + iw}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${m.l - 24}" y="${Y(v) + 3}" class="mute">${v}</text>`;
  s += `<text x="2" y="${m.t + 8}" class="mute">${label}</text>`;
  ser.sort(([a], [b]) => (a.name === ME || a.name === pick ? 1 : 0) - (b.name === ME || b.name === pick ? 1 : 0));
  for (const [A, d] of ser) {
    const hi = A.name === ME ? "var(--me)" : A.name === pick ? "var(--pick)" : null;
    s += `<polyline fill="none" stroke="${hi ?? "var(--mute)"}" stroke-opacity="${hi ? 1 : 0.3}" stroke-width="${hi ? 2.5 : 1}" points="${d.map((q) => `${X(q[0]).toFixed(1)},${Y(q[1]).toFixed(1)}`).join(" ")}" ${tipAttr(`${A.name}: ${label} ${dec ? f1(d.at(-1)[1]) : d.at(-1)[1]} at ${tFmt(d.at(-1)[0])}`)} data-go="${href({ v: "everyone", pick: A.name })}" style="cursor:pointer"/>`;
    if (hi) s += `<text x="${X(d.at(-1)[0]) + 4}" y="${Y(d.at(-1)[1]) + 3}" font-weight="700">${esc(A.name)}</text>`;
  }
  return `<svg width="${w}" height="${h}">${s}</svg>`;
}

// =========================================================================================== 2. an account
function viewAccount(p) {
  const A = ACC.get(p.a) ?? ACC.get(ME), mark = p.r ? READS.findIndex((r) => r.id === p.r) : -1, j = A.rs.length - 1;
  let html = `<h2>2. An account: <select onchange="setp({a:this.value,r:'',c:''})">${byPos().map((x) => `<option ${x === A ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select> ${A.name === ME ? '<span class="me">(this fleet)</span>' : ""}</h2>`;
  html += `<p class="note">#${A.pos[j] || "—"}, ${A.pts[j]} points at ${READS[A.rs[j]].id}; in ${A.rs.length} of ${READS.length} reads, from ${READS[A.rs[0]].id}.${mark >= 0 ? ` The line marks ${READS[mark].id}.` : ""} Hover anything for its numbers.</p>`;
  const legend = new Set();
  for (const C of A.chars.values()) html += charBlock(C, mark, legend, p.c === C.name);
  html += `<p class="legend">Where they stand: ${[...legend].sort((a, b) => (B.monsters[a]?.[1] ?? 0) - (B.monsters[b]?.[1] ?? 0)).map((m) => `<span><i style="background:${monColor(m)}"></i>${esc(monTxt(m))}</span>`).join("")}<span><i style="background:var(--res)"></i>a resource</span><span><i style="background:var(--shop)"></i>a workshop</span><span><i style="background:var(--bank)"></i>the bank</span><span><i style="background:var(--else);outline:1px solid var(--line)"></i>elsewhere</span></p>`;
  html += achievementsOf(A) + countersOf(A);
  return html;
}
function charBlock(C, mark, legend, focus) {
  const A = C.acc, LW = 78, w = W() - LW - 8, X = timeX(LW, w), last = C.rs.length - 1, t = (j) => READS[C.rs[j]].t;
  const x1 = C.X[last], tk = C.t[last];
  let s = "", y = 0;
  // level and combat XP
  const hL = 84, fr = C.X.map((x) => fracOf(x[0])), lo = Math.floor(Math.min(...fr)), hi = Math.max(lo + 1, Math.ceil(Math.max(...fr)));
  const Y = (v) => y + hL - ((v - lo) / (hi - lo)) * hL;
  const xphMax = Math.max(1, ...C.g.slice(1).map((g, i) => g[0] / C.dh[i + 1]));
  for (let L = lo; L <= hi; L++) s += `<line class="grid" x1="${LW}" x2="${LW + w}" y1="${Y(L)}" y2="${Y(L)}"/><text x="${LW - 18}" y="${Y(L) + 3}" class="mute">${L}</text>`;
  for (let j = 1; j <= last; j++) {
    const v = C.g[j][0] / C.dh[j];
    if (v > 0) { const bh = (v / xphMax) * hL * 0.9; s += `<rect x="${X(t(j - 1))}" y="${y + hL - bh}" width="${Math.max(1, X(t(j)) - X(t(j - 1)) - 0.5)}" height="${bh}" fill="var(--pick)" fill-opacity="0.18" ${tipAttr(`${tFmt(t(j - 1))} → ${tFmt(t(j))} (${f1(C.dh[j])} h): combat ${levelOf(C.X[j - 1][0])} → ${levelOf(C.X[j][0])}, +${n0(C.g[j][0])} XP, ${n0(v)} an hour\nfought ${monTxt(C.mon[j])}`)}/>`; }
  }
  s += `<polyline fill="none" stroke="var(--fg)" stroke-width="1.5" points="${fr.map((v, j) => `${X(t(j)).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}"/>`;
  s += `<text x="0" y="${y + 10}">combat</text><text x="0" y="${y + 22}" class="mute">level; bars</text><text x="0" y="${y + 33}" class="mute">XP an hour</text><text x="0" y="${y + 44}" class="mute">(max ${n0(xphMax)})</text>`;
  y += hL + 8;
  // the activity ribbon
  const hR = 16;
  s += `<text x="0" y="${y + 12}">where</text>`;
  for (let j = 0; j <= last; j++) {
    const xa = j ? X(t(j - 1)) : X(t(0)) - 4, xb = X(t(j)), mon = monAt(C.m[j]);
    if (mon) legend.add(mon);
    const since = j ? `since ${tFmt(t(j - 1))} (${f1(C.dh[j])} h): ${gainTxt(C.g[j], C.dh[j])}${C.g[j][0] > 0 ? `\nfought ${monTxt(C.mon[j])}` : ""}` : "its first read";
    s += `<rect x="${xa}" y="${y}" width="${Math.max(1, xb - xa - 0.5)}" height="${hR}" fill="${tileColor(C.m[j])}" ${tipAttr(`${A.name}/${C.name} at ${tFmt(t(j))}: ${tileTxt(C.m[j])}\n${since}\nbag: ${bagTxt(C.b[j])}\ntask: ${C.t[j]?.length ? `${C.t[j][0]} (${C.t[j][1]}) ${C.t[j][2]}/${C.t[j][3]}` : "none"} · HP ${C.h[j]?.[0]}/${C.h[j]?.[1]}`)}/>`;
  }
  y += hR + 8;
  // the skills: a strip each, bars = XP an hour (square root, one scale for the eight), so a craft's burst stands out
  const hS = 13, sMax = Math.max(1, ...C.g.slice(1).flatMap((g, i) => g.slice(1).map((v) => v / C.dh[i + 1])));
  for (let k = 1; k <= 8; k++) {
    const L0 = levelOf(C.X[0][k]), L1 = levelOf(x1[k]);
    s += `<line class="grid" x1="${LW}" x2="${LW + w}" y1="${y + hS}" y2="${y + hS}"/><text x="0" y="${y + 10}">${AB[k]} ${L0 === L1 ? L1 : `${L0}→${L1}`}</text>`;
    for (let j = 1; j <= last; j++) {
      const v = C.g[j][k] / C.dh[j];
      if (v <= 0) continue;
      const bh = Math.max(1.5, Math.sqrt(v / sMax) * (hS - 1));
      s += `<rect x="${X(t(j - 1))}" y="${y + hS - bh}" width="${Math.max(1, X(t(j)) - X(t(j - 1)) - 0.5)}" height="${bh}" fill="var(--fg)" fill-opacity="0.6" ${tipAttr(`${SKILLS[k]} ${levelOf(C.X[j - 1][k])} → ${levelOf(C.X[j][k])}: +${n0(C.g[j][k])} XP in ${f1(C.dh[j])} h (${n0(v)} an hour)\n${tFmt(t(j - 1))} → ${tFmt(t(j))}`)}/>`;
    }
    y += hS + 1;
  }
  y += 8;
  // the set: a line a slot, a segment while a piece stays
  const hP = 11;
  for (let k = 0; k < SHOWN_SLOTS; k++) {
    s += `<text x="0" y="${y + 9}" class="mute">${SLOTS[k].replace("_armor", "")}</text>`;
    let a = 0;
    for (let j = 1; j <= last + 1; j++) {
      if (j <= last && C.s[j][k] === C.s[a][k]) continue;
      const code = C.s[a][k];
      if (code) {
        const xa = X(t(a)), xb = j <= last ? X(t(j)) : Math.max(X(t(last)) + 3, X(T1) + 3), wd = Math.max(2, xb - xa - 0.5);
        s += `<rect x="${xa}" y="${y}" width="${wd}" height="${hP - 1}" fill="${pieceColor(code)}" ${tipAttr(`${SLOTS[k]}: ${itemName(code)} (${code}, level ${itemLv(code)}${B.items[code]?.[4] ? `, ${B.items[code][4]}` : ""})\n${tFmt(t(a))} → ${j <= last ? tFmt(t(j)) : "now"}`)}/>`;
        if (wd > 70) s += `<text x="${xa + 3}" y="${y + 8.5}" style="font-size:9px;pointer-events:none">${esc(code.length > wd / 5.5 ? code.slice(0, Math.floor(wd / 5.5)) + "…" : code)} ${itemLv(code)}</text>`;
      }
      a = j;
    }
    y += hP;
  }
  s += timeAxis(LW, w, y, X);
  if (mark >= 0) s += `<line x1="${X(READS[mark].t)}" x2="${X(READS[mark].t)}" y1="0" y2="${y}" stroke="var(--me)" stroke-width="1.5" stroke-dasharray="3 2"/>`;
  const skills = AB.slice(1).map((ab, i) => `${ab} ${levelOf(x1[i + 1])}`).join(" · ");
  return `<div class="char" ${focus ? 'id="focus"' : ""}><div class="hd"><b>${esc(C.name)}</b><span>combat ${levelOf(x1[0])}</span><span class="note">${skills}</span><span class="note">now: ${esc(tileTxt(C.m[last]))}; task ${tk?.length ? `${esc(tk[0])} ${tk[2]}/${tk[3]}` : "none"}</span></div><svg width="${LW + w}" height="${y + 14}">${s}</svg></div>`;
}
function achievementsOf(A) {
  const list = [...A.ach].sort((x, y) => y[1] - x[1]);
  let pts = list.reduce((a, [c]) => a + (B.ach[c]?.[1] ?? 0), 0);
  const rows = list.map(([c, m]) => { const r = `<tr class="${m * 60e3 >= T0 ? "" : "old"}"><td class="l">${tFmt(m * 60e3)}</td><td class="l">${esc(B.ach[c]?.[0] ?? c)}</td><td>${B.ach[c]?.[1] ?? "?"}</td><td>${pts}</td></tr>`; pts -= B.ach[c]?.[1] ?? 0; return r; });
  return `<h3>Achievements as they were completed (${list.length}; newest first; the first reads start ${tFmt(T0)})</h3><div class="scroll" style="max-height:300px"><table><thead><tr><th class="l">completed (UTC)</th><th class="l">achievement</th><th>pts</th><th>total after</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}
const CTR = { combat_kill: "kills", gathering: "gathered", crafting: "crafted", recycling: "recycled", task: "tasks", favor: "favors", use: "used", combat_drop: "drops", npc_buy: "bought", npc_sell: "sold", combat_level: "level" };
function countersOf(A) {
  const days = [];
  for (let d = Math.floor(T0 / DAY) * DAY; d <= T1; d += DAY) days.push(dFmt(d));
  const rows = [];
  for (const [k, ser] of A.ctr) {
    const by = new Map();
    for (let i = 1; i < ser.length; i++) {
      const j = A.rs.indexOf(ser[i][0]), ta = READS[A.rs[j - 1]].t, tb = READS[ser[i][0]].t, d = dFmt((ta + tb) / 2);
      by.set(d, (by.get(d) ?? 0) + ser[i][1] - ser[i - 1][1]);
    }
    const tot = [...by.values()].reduce((a, b) => a + b, 0);
    if (tot > 0) { const [type, target] = k.split(":"); rows.push({ type, label: `${CTR[type] ?? type}${target ? ` ${target}` : ""}`, by, tot, now: ser.at(-1)[1] }); }
  }
  const order = Object.keys(CTR);
  rows.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || b.tot - a.tot);
  return `<h3>Counters that moved, a day a column (the account's achievement objectives; a move counts on the day of its interval's midpoint)</h3><div class="scroll" style="max-height:420px"><table><thead><tr><th class="l">counter</th>${days.map((d) => `<th>${d.slice(5)}</th>`).join("")}<th>all</th><th>now</th></tr></thead><tbody>${rows.map((r) => `<tr><td class="l">${esc(r.label)}</td>${days.map((d) => `<td>${r.by.get(d) ? n0(r.by.get(d)) : ""}</td>`).join("")}<td>${n0(r.tot)}</td><td>${n0(r.now)}</td></tr>`).join("") || `<tr><td class="l">none moved</td></tr>`}</tbody></table></div>`;
}

// =========================================================================================== 3. a level
let INTERVALS = null;
function intervals() {
  if (INTERVALS) return INTERVALS;
  INTERVALS = [];
  for (const A of ACC.values()) for (const C of A.chars.values()) for (let j = 1; j < C.rs.length; j++)
    if (C.g[j][0] > 0 && C.dh[j] <= MAX_H) INTERVALS.push({ C, j, L: levelOf(C.X[j - 1][0]), xph: C.g[j][0] / C.dh[j], mon: C.mon[j] ?? "?", s: C.s[j] });
  return INTERVALS;
}
const whoTxt = (xs) => { const m = new Map(); for (const x of xs) { const k = `${x.C.acc.name}/${x.C.name}`; m.set(k, (m.get(k) ?? 0) + 1); } const a = [...m].sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1)); return a.slice(0, 40).map(([k, n]) => `${k} ×${n}`).join("\n") + (a.length > 40 ? `\n… ${a.length - 40} more` : ""); };
const listAttr = (xs, title) => { LISTS.push({ xs, title }); return `data-list="${LISTS.length - 1}"`; };
function showList(l) {
  const el = document.getElementById("detail");
  if (!el || !l) return;
  const xs = [...l.xs].sort((a, b) => b.xph - a.xph);
  el.innerHTML = `<h3>${esc(l.title)} — ${xs.length} intervals (a click opens the account at that read)</h3><div class="scroll" style="max-height:360px"><table><thead><tr><th class="l">account/character</th><th class="l">read</th><th>level</th><th class="l">monster</th><th>XP an hour</th><th class="l">weapon</th></tr></thead><tbody>${xs.map((x) => `<tr class="row ${x.C.acc.name === ME ? "me" : ""}" data-go="${openAt(x.C, x.j)}"><td>${esc(x.C.acc.name)}/${esc(x.C.name)}</td><td>${READS[x.C.rs[x.j]].id}</td><td>${x.L}</td><td>${esc(monTxt(x.mon === "?" ? null : x.mon))}</td><td>${n0(x.xph)}</td><td>${esc(x.s[0] || "—")} ${x.s[0] ? itemLv(x.s[0]) : ""}</td></tr>`).join("")}</tbody></table></div>`;
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
const GROUPS = [["weapon", [0]], ["shield", [1]], ["helmet", [2]], ["body", [3]], ["legs", [4]], ["boots", [5]], ["rings", [6, 7]], ["amulet", [8]], ["rune", [12]], ["artifacts", [9, 10, 11]], ["utilities", [13, 14]]];
function viewLevel(p) {
  LISTS.length = 0;
  const mine = [...(ACC.get(ME)?.chars.values() ?? [])].map((C) => levelOf(C.X.at(-1)[0]));
  const lo = +p.lo || Math.max(...mine, 1), hi = Math.max(lo, +p.hi || lo);
  const xs = intervals().filter((x) => x.L >= lo && x.L <= hi), q = upperHinge(xs.map((x) => x.xph)), top = xs.filter((x) => x.xph >= q);
  let html = `<h2>3. A level: combat <input type="number" min="1" max="50" value="${lo}" onchange="setp({lo:this.value})"> to <input type="number" min="1" max="50" value="${hi}" onchange="setp({hi:this.value})"></h2>`;
  html += `<p class="note">Every interval between two reads in which a character at that combat level (at the interval's start) gained combat XP: ${xs.length} intervals of ${new Set(xs.map((x) => x.C)).size} characters, intervals of ${MAX_H} h or less (024's reads and missed reads left out). The fastest quarter: XP an hour ≥ ${n0(q)} (the upper hinge), ${top.length} intervals. The monster: the tile at the interval's end, else at its start, else the one kill counter that moved where it was the account's only fighter; ? = none. Hover a bar or a dot for its characters; a dot opens the account at that read, a bar lists its intervals below.</p>`;
  if (!xs.length) return html + `<p>No interval at that level.</p>`;
  // what they fight
  const byMon = new Map();
  for (const x of xs) (byMon.get(x.mon) ?? byMon.set(x.mon, []).get(x.mon)).push(x);
  const mons = [...byMon].sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1));
  const w = Math.min(W(), 1200), LW = 170, BW = 140, DW = w - LW - 2 * BW - 40, xMax = Math.max(...xs.map((x) => x.xph)), rh = 18;
  let s = `<text x="${LW}" y="10" class="mute">share of all ${xs.length}</text><text x="${LW + BW + 10}" y="10" class="mute">share of the fastest ${top.length}</text><text x="${LW + 2 * BW + 30}" y="10" class="mute">XP an hour, a dot an interval (filled: the fastest quarter) — 0 to ${n0(xMax)}</text>`;
  const qx = LW + 2 * BW + 30 + (q / xMax) * DW;
  s += `<line x1="${qx}" x2="${qx}" y1="14" y2="${16 + mons.length * rh}" stroke="var(--me)" stroke-dasharray="2 2"/>`;
  mons.forEach(([m, ys], i) => {
    const y = 16 + i * rh, yt = ys.filter((x) => x.xph >= q);
    s += `<rect x="0" y="${y}" width="10" height="${rh - 4}" fill="${m === "?" ? "var(--else)" : monColor(m)}"/><text x="14" y="${y + 11}">${esc(m === "?" ? "? (not at a monster)" : monTxt(m))}</text>`;
    s += `<rect class="bar" x="${LW}" y="${y}" width="${Math.max(1, (ys.length / xs.length) * BW)}" height="${rh - 4}" ${tipAttr(`${monTxt(m)}: ${ys.length} of ${xs.length} intervals\n${whoTxt(ys)}`)} ${listAttr(ys, `${monTxt(m)} at combat ${lo}–${hi}`)} style="cursor:pointer"/><text x="${LW + (ys.length / xs.length) * BW + 3}" y="${y + 11}" class="mute">${Math.round((100 * ys.length) / xs.length)}%</text>`;
    if (yt.length) s += `<rect class="bar q" x="${LW + BW + 10}" y="${y}" width="${Math.max(1, (yt.length / top.length) * BW)}" height="${rh - 4}" ${tipAttr(`${monTxt(m)}: ${yt.length} of the fastest ${top.length}\n${whoTxt(yt)}`)} ${listAttr(yt, `${monTxt(m)} at combat ${lo}–${hi}, the fastest quarter`)} style="cursor:pointer"/><text x="${LW + BW + 13 + (yt.length / top.length) * BW}" y="${y + 11}" class="mute">${Math.round((100 * yt.length) / top.length)}%</text>`;
    for (const x of ys) {
      const fast = x.xph >= q;
      s += `<circle cx="${LW + 2 * BW + 30 + (x.xph / xMax) * DW}" cy="${y + (rh - 4) / 2}" r="3.2" fill="${fast ? "var(--me)" : "none"}" stroke="${x.C.acc.name === ME ? "var(--me)" : "var(--pick)"}" stroke-width="${x.C.acc.name === ME ? 2 : 1}" ${tipAttr(`${x.C.acc.name}/${x.C.name}, combat ${x.L}, ${READS[x.C.rs[x.j]].id}: ${n0(x.xph)} XP an hour at ${monTxt(x.mon === "?" ? null : x.mon)}\nweapon ${x.s[0] || "—"}`)} data-go="${openAt(x.C, x.j)}"/>`;
    }
  });
  html += `<h3>What they fight</h3><svg width="${w}" height="${24 + mons.length * rh}">${s}</svg>`;
  // what they wear
  html += `<h3>What they wear, slot by slot (the set at the interval's end; a ring, an artifact, a utility counted a slot each)</h3><div class="cols">`;
  for (const [g, ks] of GROUPS) {
    const part = (set) => { const m = new Map(); for (const x of set) for (const k of ks) { const c = x.s[k] || "—"; (m.get(c) ?? m.set(c, []).get(c)).push(x); } return [...m].sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1)).slice(0, 7); };
    const draw = (rows, n, cls, what) => { let t = ""; rows.forEach(([c, ys], i) => { const y = 14 + i * 15, bw = (ys.length / n) * 120; t += `<text x="0" y="${y + 9}">${esc(c === "—" ? "— (empty)" : `${c} ${itemLv(c)}`)}</text><rect class="bar ${cls}" x="170" y="${y}" width="${Math.max(1, bw)}" height="11" ${tipAttr(`${g}: ${c === "—" ? "empty" : `${itemName(c)} (level ${itemLv(c)}${B.items[c]?.[4] ? `, ${B.items[c][4]}` : ""})`} — ${ys.length} of ${n} ${what}\n${whoTxt(ys)}`)} ${listAttr(ys, `${g} ${c} at combat ${lo}–${hi}${cls ? ", the fastest quarter" : ""}`)} style="cursor:pointer"/><text x="${174 + bw}" y="${y + 9}" class="mute">${Math.round((100 * ys.length) / n)}%</text>`; }); return t; };
    const ra = part(xs), rt = part(top), n = xs.length * ks.length, nt = top.length * ks.length, hh = 18 + Math.max(ra.length, rt.length) * 15;
    html += `<div><b>${g}</b><div class="cols" style="gap:12px"><svg width="330" height="${hh}"><text x="0" y="9" class="mute">all</text>${draw(ra, n, "", "slots")}</svg><svg width="330" height="${hh}"><text x="0" y="9" class="mute">the fastest quarter</text>${draw(rt, nt, "q", "slots")}</svg></div></div>`;
  }
  html += `</div><div id="detail"></div>`;
  return html;
}

// =========================================================================================== 4. two accounts
const topFighter = (A) => [...A.chars.values()].sort((a, b) => b.X.at(-1)[0] - a.X.at(-1)[0])[0];
function spans(C, from, to) { // the intervals j in (from, to]: monsters and the weapon by hours, combat XP
  const mon = new Map(), wpn = new Map();
  let xp = 0, h = 0;
  for (let j = Math.max(1, from + 1); j <= to; j++) {
    h += C.dh[j];
    wpn.set(C.s[j][0] || "—", (wpn.get(C.s[j][0] || "—") ?? 0) + C.dh[j]);
    if (C.g[j][0] > 0) { xp += C.g[j][0]; mon.set(C.mon[j] ?? "?", (mon.get(C.mon[j] ?? "?") ?? 0) + C.dh[j]); }
  }
  const top = (m, k) => [...m].sort((a, b) => b[1] - a[1]).slice(0, k);
  return { xp, h, mons: top(mon, 3).map(([m, x]) => `${m === "?" ? "?" : monTxt(m)} ${f1(x)} h`).join(", ") || "—", wpn: top(wpn, 1).map(([c]) => (c === "—" ? "—" : `${c} ${itemLv(c)}`))[0] ?? "—" };
}
function byLevel(C) {
  const out = new Map(), lv = C.X.map((x) => levelOf(x[0])), first = (L) => lv.findIndex((v) => v >= L);
  for (let L = lv[0]; L <= lv.at(-1); L++) {
    const a = first(L), b = L < lv.at(-1) ? first(L + 1) : C.rs.length - 1;
    const sp = spans(C, a, b), partial = (a === 0 && L === lv[0]) || L === lv.at(-1);
    out.set(L, { ...sp, txt: `${partial ? "≥ " : ""}${f1(a === b ? 0 : (READS[C.rs[b]].t - READS[C.rs[a]].t) / H)} h${L === lv.at(-1) ? " so far" : ""}` });
  }
  return out;
}
function viewCompare(p) {
  const accs = byPos(), a = ACC.get(p.a) ?? ACC.get(ME), b = ACC.get(p.b) ?? accs.find((x) => x !== a), by = p.by === "time" ? "time" : "level";
  const sel = (k, cur) => `<select onchange="setp({${k}:this.value})">${accs.map((x) => `<option ${x === cur ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>`;
  let html = `<h2>4. Two accounts side by side: ${sel("a", a)} and ${sel("b", b)}, aligned <select onchange="setp({by:this.value})"><option value="level" ${by === "level" ? "selected" : ""}>by the top fighter's level</option><option value="time" ${by === "time" ? "selected" : ""}>by time (a day a row)</option></select></h2>`;
  const fa = topFighter(a), fb = topFighter(b);
  html += `<p class="note">The top fighter: the character with the most combat XP at its account's last read — ${accMark(a.name)}/${esc(fa.name)}, ${accMark(b.name)}/${esc(fb.name)}. Hours: from the first read at the level to the first at the next (≥: the level began before the account's first read; reads are two hours apart). Fought: the hours of the intervals with combat XP by the monster; the weapon worn longest.</p>`;
  const head = (A, C) => `<th class="l" colspan="4">${accMark(A.name)}/${esc(C.name)}</th>`;
  let rows = "";
  if (by === "level") {
    const ra = byLevel(fa), rb = byLevel(fb), ls = [...new Set([...ra.keys(), ...rb.keys()])].sort((x, y) => y - x);
    const cell = (r) => (r ? `<td>${r.txt}</td><td>${n0(r.xp)}</td><td class="l">${esc(r.mons)}</td><td class="l">${esc(r.wpn)}</td>` : `<td></td><td></td><td></td><td></td>`);
    rows = ls.map((L) => `<tr><td>${L}</td>${cell(ra.get(L))}${cell(rb.get(L))}</tr>`).join("");
    html += `<table><thead><tr><th></th>${head(a, fa)}${head(b, fb)}</tr><tr><th>level</th>${"<th>hours</th><th>combat XP</th><th class='l'>fought</th><th class='l'>weapon</th>".repeat(2)}</tr></thead><tbody>${rows}</tbody></table>`;
  } else {
    const days = [];
    for (let d = Math.floor(T0 / DAY) * DAY; d <= T1; d += DAY) days.push(d);
    const dayRow = (C, d) => {
      const js = C.rs.map((ri, j) => j).filter((j) => READS[C.rs[j]].t < d + DAY);
      if (!js.length) return null;
      const end = js.at(-1), from = C.rs.findIndex((ri) => READS[ri].t >= d);
      if (from < 0 || READS[C.rs[from]].t >= d + DAY) return { L: levelOf(C.X[end][0]), xp: 0, mons: "— (not read)", wpn: "—" };
      return { L: levelOf(C.X[end][0]), ...spans(C, Math.max(0, from - 1), end) };
    };
    const cell = (r) => (r ? `<td>${r.L}</td><td>${n0(r.xp)}</td><td class="l">${esc(r.mons)}</td><td class="l">${esc(r.wpn)}</td>` : `<td></td><td></td><td></td><td></td>`);
    rows = days.reverse().map((d) => `<tr><td>${dFmt(d)}</td>${cell(dayRow(fa, d))}${cell(dayRow(fb, d))}</tr>`).join("");
    html += `<table><thead><tr><th></th>${head(a, fa)}${head(b, fb)}</tr><tr><th>day (UTC)</th>${"<th>level at its end</th><th>combat XP</th><th class='l'>fought</th><th class='l'>weapon</th>".repeat(2)}</tr></thead><tbody>${rows}</tbody></table>`;
  }
  return html;
}

// =========================================================================================== the frame
const VIEWS = { everyone: ["Everyone", viewEveryone], acc: ["An account", viewAccount], level: ["A level", viewLevel], cmp: ["Two accounts", viewCompare] };
function render() {
  const p = P(), v = VIEWS[p.v] ? p.v : "everyone";
  document.getElementById("nav").innerHTML = Object.entries(VIEWS).map(([k, [t]]) => `<a href="${href({ v: k, ...(k === "acc" || k === "cmp" ? { a: p.a } : {}) })}" class="${k === v ? "on" : ""}">${t}</a>`).join("");
  document.getElementById("meta").textContent = `${READS.length} reads, ${tFmt(T0)} → ${tFmt(T1)} UTC (${READS.filter((r) => r.src !== "board").length} of 024's); ${ACC.size} accounts; data made ${tFmt(Date.parse(B.made))}`;
  document.getElementById("main").innerHTML = VIEWS[v][1](p);
  const focus = document.getElementById("focus");
  if (focus) focus.scrollIntoView({ block: "start" });
  else scrollTo(0, 0);
}
addEventListener("hashchange", render);
render();
