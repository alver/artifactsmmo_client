// Task 034: the board's reads taken apart and kept. Every whole read of logs/board/ (whole.mjs's rule: 50 accounts, not
// stopped, not under 90 minutes after the read kept before it) and 024's two reads of 11-22 and 11-23 become one small file a
// read, logs/board/derived/reads/<day>-<HHMM>Z.json — what changed since the read before, codes through a dictionary — and
// from those files the page's data (derived/data.js) and the planning chat's summary (derived/summary.json). Offline, no
// request, no dependency; the raw reads are only read. A read already derived is not opened again.
//   node scripts/board/derive.mjs [--all]          --all: derive every read again
// A read's file (V 1): { v, id, t (ms), src (board | 022 | 024), dict (codes new in this read, appended to the dictionary
// of the reads before; index 0 is ""), acc: { <account>: entry } } — an entry for every account read, holding only what
// changed since that account's last read:
//   p [position, points] · a [achievement, completed (epoch minutes), …] newly completed · k [counter, progress, …] the
//   objective counters (type:target, the highest progress of its objectives) that moved · c { <character>: {
//     X [9 total XP: combat + SKILLS] at its first read, then x [9 XP gained since the read before, trailing zeros cut],
//     m map_id, s [16 worn codes, SLOTS' order], b [code, quantity, …] the bag's five largest stacks,
//     t [task, task type, progress, total] or [], h [hp, max hp],
//     f the monster fought (an interval with combat XP, no monster tile at either read, the one kill counter that moved
//       where it was the account's only fighter: whole.mjs's third rule) } }.
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const T0 = Date.now();
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BOARD = join(ROOT, "logs/board"), OUT = join(BOARD, "derived"), RD = join(OUT, "reads");
const V = 1;
const ME = "alverus";
const SKILLS = ["combat", "mining", "woodcutting", "fishing", "weaponcrafting", "gearcrafting", "jewelrycrafting", "cooking", "alchemy"];
const AB = ["cb", "mi", "wo", "fi", "wc", "gc", "jc", "co", "al"];
const SLOTS = ["weapon", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring1", "ring2", "amulet", "artifact1", "artifact2", "artifact3", "rune", "utility1", "utility2", "bag"];
const GEAR = 13; // the set: SLOTS before the utilities and the bag
const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const D = (n) => J(join(ROOT, "public/data", `${n}.json`));
const XP = J(join(ROOT, "public/data/atlas.json")).xpNeeded; // XP from L to L + 1; the reads' max_xp agree for 1–49
const CUM = [0, 0];
for (let L = 2; L <= 50; L++) CUM[L] = CUM[L - 1] + XP[L - 1];
const H = 3.6e6;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- the catalog: map tiles (static content, else an event's), items, monsters, achievements
const maps = new Map(D("maps").map((m) => [m.map_id, m]));
const evAt = new Map();
for (const e of D("events")) for (const m of e.maps) evAt.set(m.map_id, e.content);
const items = new Map(D("items").map((i) => [i.code, i]));
const monsters = new Map(D("monsters").map((m) => [m.code, m]));
const achDefs = new Map(D("achievements").map((a) => [a.code, a]));
const contentOf = (id) => maps.get(id)?.interactions?.content ?? (evAt.has(id) ? { ...evAt.get(id), event: true } : null);
const monAt = (id) => { const c = contentOf(id); return c?.type === "monster" ? c.code : null; };

// ---- the reads, oldest first
const runs = readFileSync(join(BOARD, "reads.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const READS = [];
for (const [id, dir, src] of [["2026-11-22/1923Z", "docs/strategy/022/snapshot", "022"], ["2026-11-23/1222Z", "docs/strategy/024/snapshot/2026-11-23T1222Z", "024"]])
  if (existsSync(join(ROOT, dir))) READS.push({ id, t: Date.parse(`${id.slice(0, 10)}T${id.slice(11, 13)}:${id.slice(13, 15)}:00Z`), dir: join(ROOT, dir), src });
for (const r of runs.filter((r) => r.dir && r.accounts === 50 && !r.stopped).sort((a, b) => (a.dir < b.dir ? -1 : 1)))
  if (existsSync(join(BOARD, r.dir)) && (!READS.length || Date.parse(r.start) - READS.at(-1).t >= 90 * 60e3)) READS.push({ id: r.dir, t: Date.parse(r.start), dir: join(BOARD, r.dir), src: "board" });
const fileOf = (id) => join(RD, `${id.replace("/", "-")}.json`);

/** A raw read → { account: { p, a: Map code → minutes, k: Map key → progress | null, c: Map name → character } }. */
function loadRaw(R) {
  const body = (f) => { const b = readFileSync(join(R.dir, f)); return JSON.parse(f.endsWith(".gz") ? gunzipSync(b) : b); };
  const ladder = new Map(), chars = new Map(), ach = new Map();
  for (const f of readdirSync(R.dir).sort()) {
    const n = f.replace(/\.gz$/, "");
    let m;
    if (/^leaderboard-(accounts-)?\d+\.json$/.test(n)) for (const x of body(f).data) ladder.set(x.account, x);
    else if ((m = n.match(/^acc-(.+)-characters\.json$/))) chars.set(m[1], body(f).data);
    else if ((m = n.match(/^acc-(.+)-achievements(-\d+)?\.json$/))) (ach.get(m[1]) ?? ach.set(m[1], []).get(m[1])).push(...body(f).data);
  }
  const out = new Map();
  for (const [name, cs] of chars) {
    const l = ladder.get(name), a = new Map(), k = R.src === "022" ? null : new Map(); // 022's achievements: the completed ones only
    for (const x of ach.get(name) ?? []) {
      if (x.completed_at) a.set(x.code, Math.round(Date.parse(x.completed_at) / 60e3));
      if (k) for (const o of x.objectives) { const key = `${o.type}:${o.target ?? ""}`; k.set(key, Math.max(k.get(key) ?? 0, o.progress)); }
    }
    const c = new Map();
    for (const ch of cs) {
      for (const s of SKILLS) { const L = s === "combat" ? ch.level : ch[`${s}_level`], mx = s === "combat" ? ch.max_xp : ch[`${s}_max_xp`]; if (L < 50 && XP[L] !== mx) throw new Error(`${R.id} ${name}/${ch.name} ${s} ${L}: max_xp ${mx}, the atlas ${XP[L]}`); }
      const bag = (ch.inventory ?? []).filter((s) => s.code && s.quantity > 0).sort((x, y) => y.quantity - x.quantity || (x.code < y.code ? -1 : 1)).slice(0, 5);
      c.set(ch.name, {
        X: SKILLS.map((s) => (s === "combat" ? CUM[ch.level] + ch.xp : CUM[ch[`${s}_level`]] + ch[`${s}_xp`])),
        m: ch.map_id ?? [...maps.values()].find((t) => t.x === ch.x && t.y === ch.y && t.layer === (ch.layer ?? "overworld"))?.map_id ?? 0,
        s: SLOTS.map((s) => ch[`${s}_slot`] || ""),
        b: bag.flatMap((s) => [s.code, s.quantity]),
        t: ch.task ? [ch.task, ch.task_type ?? "", ch.task_progress ?? 0, ch.task_total ?? 0] : [],
        h: [ch.hp, ch.max_hp],
      });
    }
    out.set(name, { p: [l?.position ?? 0, l?.achievements_points ?? 0], a, k, c });
  }
  return out;
}

// ---- the state the files replay to: the dictionary and, per account, what it was at its last read
const dict = [""], dictIx = new Map([["", 0]]);
const state = new Map(); // account → { p, a: Map, k: Map | null, c: Map name → { X, m, s, b, t, h } }
/** A read's codes in the dictionary: the index of a code known, else the next one, noted in `added` (the file's dict). */
function encoder(added) {
  const fresh = new Map();
  const ix = (c) => { let i = dictIx.get(c) ?? fresh.get(c); if (i == null) { i = dict.length + added.length; added.push(c); fresh.set(c, i); } return i; };
  return { ix, field: (f, v) => (f === "s" ? v.map(ix) : f === "b" ? v.map((x, i) => (i % 2 ? x : ix(x))) : f === "t" ? v.map((x, i) => (i < 2 ? ix(x) : x)) : v) };
}
function decode(f, v) {
  if (f === "s") return v.map((i) => dict[i]);
  if (f === "b") return v.map((x, i) => (i % 2 ? x : dict[x]));
  if (f === "t") return v.map((x, i) => (i < 2 ? dict[x] : x));
  return v;
}
/** Apply a read's file to the state; returns, per account read, the state before it (for the summary's intervals). */
function apply(file) {
  dict.push(...file.dict);
  for (const c of file.dict) dictIx.set(c, dictIx.size);
  const before = new Map();
  for (const [name, e] of Object.entries(file.acc)) {
    const prev = state.get(name);
    before.set(name, prev && structuredClone(prev));
    const st = prev ?? { p: [0, 0], a: new Map(), k: null, c: new Map() };
    if (e.p) st.p = e.p;
    if (e.a) for (let i = 0; i < e.a.length; i += 2) st.a.set(dict[e.a[i]], e.a[i + 1]);
    if (e.k) { st.k ??= new Map(); for (let i = 0; i < e.k.length; i += 2) st.k.set(dict[e.k[i]], e.k[i + 1]); }
    for (const [n, d] of Object.entries(e.c ?? {})) {
      const ch = st.c.get(n) ?? {};
      for (const [f, v] of Object.entries(d)) {
        if (f === "x") ch.X = ch.X.map((t, i) => t + (v[i] ?? 0));
        else if (f !== "f") ch[f] = decode(f, v);
      }
      st.c.set(n, ch);
    }
    state.set(name, st);
  }
  return before;
}
/** The file of a raw read against the state (the state is not changed: apply() the result). */
function diff(R, raw) {
  const added = [], acc = {}, { ix, field } = encoder(added);
  for (const [name, cur] of raw) {
    const prev = state.get(name), e = {};
    if (!prev || !same(prev.p, cur.p)) e.p = cur.p;
    const a = [...cur.a].filter(([c]) => !prev?.a.has(c)).sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : 1));
    if (a.length) e.a = a.flatMap(([c, m]) => [ix(c), m]);
    if (cur.k) {
      const k = [...cur.k].filter(([key, v]) => prev?.k?.get(key) !== v).sort((x, y) => (x[0] < y[0] ? -1 : 1));
      if (k.length) e.k = k.flatMap(([key, v]) => [ix(key), v]);
    }
    // the third rule of whole.mjs: the one kill counter that moved, where this was the account's only fighter
    const fighters = [...cur.c].filter(([n, ch]) => prev?.c.get(n) && ch.X[0] > prev.c.get(n).X[0]);
    const kills = prev?.k && cur.k ? [...cur.k].filter(([key, v]) => key.startsWith("combat_kill:") && prev.k.has(key) && v > prev.k.get(key)) : [];
    const c = {};
    for (const [n, ch] of cur.c) {
      const p = prev?.c.get(n), d = {};
      if (!p) d.X = ch.X;
      else if (!same(p.X, ch.X)) { const x = ch.X.map((t, i) => t - p.X[i]); while (x.length && !x.at(-1)) x.pop(); d.x = x; }
      for (const f of ["m", "s", "b", "t", "h"]) if (!p || !same(p[f], ch[f])) d[f] = field(f, ch[f]);
      if (p && fighters.length === 1 && fighters[0][0] === n && kills.length === 1 && !monAt(ch.m) && !monAt(p.m)) d.f = ix(kills[0][0].slice(12));
      if (Object.keys(d).length) c[n] = d;
    }
    if (Object.keys(c).length) e.c = c;
    acc[name] = e;
  }
  return { v: V, id: R.id, t: R.t, src: R.src, dict: added, acc };
}

// ---- derive: replay the files that are there and current, derive the rest from their raw reads
mkdirSync(RD, { recursive: true });
const ALL = process.argv.includes("--all");
const files = [];
let opened = 0, kept = 0, valid = !ALL;
for (const R of READS) {
  let file = null;
  if (valid && existsSync(fileOf(R.id))) { try { file = J(fileOf(R.id)); } catch { file = null; } if (file && (file.v !== V || file.id !== R.id || file.t !== R.t)) file = null; }
  if (file) kept++;
  else {
    valid = false; // every read after a missing one is derived again: its file is a difference from the state before it
    file = diff(R, loadRaw(R));
    opened++;
    writeFileSync(fileOf(R.id) + ".tmp", JSON.stringify(file));
    renameSync(fileOf(R.id) + ".tmp", fileOf(R.id));
  }
  apply(file);
  files.push(file);
}
const ids = new Set(READS.map((R) => fileOf(R.id)));
for (const f of readdirSync(RD)) if (!ids.has(join(RD, f))) unlinkSync(join(RD, f)); // a file of a read no longer whole (or a .tmp)

// ---- the page's data: the files in order and what the page needs of the catalog for the codes they hold
const seenTiles = new Set();
for (const f of files) for (const e of Object.values(f.acc)) for (const d of Object.values(e.c ?? {})) if (d.m != null) seenTiles.add(d.m);
const pick = (code) => { const it = items.get(code); return it && [it.name, it.level, it.type, it.subtype ?? "", it.craft ? `${it.craft.skill} ${it.craft.level}` : ""]; };
const page = {
  made: new Date().toISOString(), me: ME, skills: SKILLS, ab: AB, slots: SLOTS, cum: CUM,
  items: Object.fromEntries(dict.filter((c) => items.has(c)).map((c) => [c, pick(c)])),
  monsters: Object.fromEntries([...monsters.values()].map((m) => [m.code, [m.name, m.level, m.type]])),
  ach: Object.fromEntries([...achDefs.values()].map((a) => [a.code, [a.name, a.points, a.objectives.map((o) => `${o.type}:${o.target ?? ""}`).join(" "), a.objectives.map((o) => o.total).join(" ")]])),
  tiles: Object.fromEntries([...seenTiles].map((id) => { const t = maps.get(id), c = contentOf(id); return [id, [t?.name ?? "?", t?.x, t?.y, t?.layer, c?.type ?? "", c?.code ?? "", c?.event ? 1 : 0]]; })),
};
const head = JSON.stringify(page);
const data = `window.BOARD=${head.slice(0, -1)},"reads":[\n${files.map((f) => JSON.stringify(f)).join(",\n")}\n]};\n`;
writeFileSync(join(OUT, "data.js.tmp"), data);
renameSync(join(OUT, "data.js.tmp"), join(OUT, "data.js"));

// ---- the planning chat's summary: a day a row for every account and character, at most 1 MB (the oldest days go first)
const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
const days = new Map(); // day → { acc: Map name → { pts, pos, chars: Map n → { lv, xp[9], h Map monster → hours, set Map key → hours } } }
const row = (day, name, n) => {
  const d = days.get(day) ?? days.set(day, new Map()).get(day);
  const a = d.get(name) ?? d.set(name, { chars: new Map() }).get(name);
  if (n == null) return a;
  return a.chars.get(n) ?? a.chars.set(n, { xp: Array(9).fill(0), h: new Map(), set: new Map() }).get(n);
};
const levelOf = (t) => { let L = 1; while (L < 50 && CUM[L + 1] <= t) L++; return L; };
{
  // replay again from the start, now with every account's state before each read at hand
  state.clear();
  dict.length = 1;
  dictIx.clear();
  dictIx.set("", 0);
  const lastT = new Map(); // account → the time of its read before
  for (const file of files) {
    const before = apply(file), day = dayOf(file.t);
    for (const name of Object.keys(file.acc)) {
      const st = state.get(name), prev = before.get(name), a = row(day, name);
      a.pts = st.p[1];
      a.pos = st.p[0];
      for (const [n, ch] of st.c) {
        const r = row(day, name, n);
        r.lv = ch.X.map(levelOf);
        const p = prev?.c.get(n);
        if (!p) continue;
        const h = (file.t - lastT.get(name)) / H, mid = dayOf((file.t + lastT.get(name)) / 2), m = row(mid, name, n);
        for (let i = 0; i < 9; i++) m.xp[i] += ch.X[i] - p.X[i];
        if (ch.X[0] > p.X[0]) {
          const mon = monAt(ch.m) ?? monAt(p.m) ?? (file.acc[name].c?.[n]?.f != null ? dict[file.acc[name].c[n].f] : "?");
          m.h.set(mon, (m.h.get(mon) ?? 0) + h);
        }
        const key = ch.s.slice(0, GEAR).map((c) => c || "-").join(" ");
        m.set.set(key, (m.set.get(key) ?? 0) + h);
      }
      lastT.set(name, file.t);
    }
  }
}
function summary(fromDay) {
  const sets = new Map(), out = {};
  for (const [day, accs] of [...days].sort((x, y) => (x[0] < y[0] ? -1 : 1))) {
    if (day < fromDay) continue;
    for (const [name, a] of accs) {
      const o = out[name] ?? (out[name] = { days: {}, chars: {} });
      if (a.pts != null) o.days[day] = [a.pos, a.pts];
      for (const [n, r] of a.chars) {
        const c = o.chars[n] ?? (o.chars[n] = {});
        const e = {};
        if (r.lv) e.lv = r.lv.join(" ");
        const xp = Object.fromEntries(r.xp.map((v, i) => [AB[i], v]).filter(([, v]) => v));
        if (Object.keys(xp).length) e.xp = xp;
        if (r.h.size) e.h = Object.fromEntries([...r.h].sort((x, y) => y[1] - x[1]).map(([m, h]) => [m, Math.round(h * 10) / 10]));
        const top = [...r.set].sort((x, y) => y[1] - x[1])[0];
        if (top) { if (!sets.has(top[0])) sets.set(top[0], sets.size + 1); e.set = sets.get(top[0]); }
        if (Object.keys(e).length) c[day] = e;
      }
    }
  }
  const dayList = [...days.keys()].filter((d) => d >= fromDay).sort();
  return {
    about: "Task 034 (scripts/board/derive.mjs): the board's reads (logs/board/) and 024's of 11-22 and 11-23, a day a row (UTC). " +
      "accounts.<a>.days.<day> = [ladder position, points] at the day's last read. accounts.<a>.chars.<c>.<day>: lv = the levels at the day's last read " +
      "(cb mi wo fi wc gc jc co al); xp = XP gained that day by skill (an interval between two reads counts on the day of its midpoint); " +
      "h = hours of the intervals with combat XP by the monster fought (the tile at the interval's end, else at its start, else the one kill counter " +
      "that moved where it was the account's only fighter; ? = none of these); set = the set worn longest that day (sets.<id>: weapon shield helmet " +
      `body_armor leg_armor boots ring1 ring2 amulet artifact1 artifact2 artifact3 rune, - = empty). ${ME} is this fleet.`,
    made: page.made, from: dayList[0], to: dayList.at(-1), reads: files.filter((f) => dayOf(f.t) >= fromDay).length,
    sets: Object.fromEntries([...sets].map(([k, i]) => [i, k])), accounts: out,
  };
}
const allDays = [...days.keys()].sort();
let sum, cut = 0;
do sum = JSON.stringify(summary(allDays[cut++])); while (sum.length > 1e6 && cut < allDays.length);
writeFileSync(join(OUT, "summary.json"), sum);

const kb = (n) => `${Math.round(n / 1024).toLocaleString("en-US")} KB`;
const sizes = files.map((f) => JSON.stringify(f).length), board = files.filter((f) => f.src === "board").map((f) => JSON.stringify(f).length);
console.log(`board:derive — ${READS.length} reads (${READS[0]?.id} → ${READS.at(-1)?.id}): ${opened} opened and derived, ${kept} already derived (not opened); ` +
  `${((Date.now() - T0) / 1000).toFixed(1)} s`);
console.log(`  reads/: ${kb(sizes.reduce((a, b) => a + b, 0))}, a board read ${kb(board.slice(1).reduce((a, b) => a + b, 0) / Math.max(1, board.length - 1))} after its first; ` +
  `data.js ${kb(data.length)}; summary.json ${kb(sum.length)} (${allDays[cut - 1]} → ${allDays.at(-1)}); dictionary ${dict.length} codes`);
