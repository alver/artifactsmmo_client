// Task 034's check of the dataset: the derived files (logs/board/derived/data.js), replayed, give back every raw read — per account the ladder position and points,
// the completed achievements, the counters (the max progress per type:target); per character the nine total XPs, the tile,
// the 16 slots, the bag's five largest stacks, the task, the HP. Its own parse of the raw, apart from derive.mjs's; it opens
// every read. Offline.   node scripts/board/verify.mjs   (exit 1 on a mismatch)
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const window = {}; new Function("window", readFileSync(join(ROOT, "logs/board/derived/data.js"), "utf8"))(window);
const B = window.BOARD, CUM = B.cum, S = B.skills.slice(1);
const dirOf = (id, src) => (src === "022" ? join(ROOT, "docs/strategy/022/snapshot") : src === "024" ? join(ROOT, "docs/strategy/024/snapshot/2026-11-23T1222Z") : join(ROOT, "logs/board", id));
const dict = [""], st = new Map();
let checked = 0, bad = 0, chars = 0;
const fail = (m) => { if (bad++ < 15) console.log("MISMATCH", m); };
for (const r of B.reads) {
  for (const c of r.dict) dict.push(c);
  for (const [name, e] of Object.entries(r.acc)) {
    const a = st.get(name) ?? { p: null, a: new Map(), k: new Map(), c: new Map() };
    if (e.p) a.p = e.p;
    if (e.a) for (let i = 0; i < e.a.length; i += 2) a.a.set(dict[e.a[i]], e.a[i + 1]);
    if (e.k) for (let i = 0; i < e.k.length; i += 2) a.k.set(dict[e.k[i]], e.k[i + 1]);
    for (const [n, d] of Object.entries(e.c ?? {})) {
      const c = a.c.get(n) ?? {};
      if (d.X) c.X = d.X; if (d.x) c.X = c.X.map((v, i) => v + (d.x[i] ?? 0)); if (d.m != null) c.m = d.m;
      if (d.s) c.s = d.s.map((i) => dict[i]); if (d.b) c.b = d.b.map((x, i) => (i % 2 ? x : dict[x])); if (d.t) c.t = d.t.map((x, i) => (i < 2 ? dict[x] : x)); if (d.h) c.h = d.h;
      a.c.set(n, c);
    }
    st.set(name, a);
  }
  // the raw read, parsed here on its own
  const dir = dirOf(r.id, r.src), files = readdirSync(dir), body = (f) => JSON.parse(f.endsWith(".gz") ? gunzipSync(readFileSync(join(dir, f))) : readFileSync(join(dir, f), "utf8"));
  const ladder = new Map(); for (const f of files.filter((f) => /^leaderboard-/.test(f))) for (const x of body(f).data) ladder.set(x.account, x);
  const accs = files.filter((f) => /-characters\.json(\.gz)?$/.test(f)).map((f) => f.replace(/^acc-/, "").replace(/-characters\.json(\.gz)?$/, ""));
  if (accs.length !== Object.keys(r.acc).length) fail(`${r.id}: ${accs.length} accounts raw, ${Object.keys(r.acc).length} derived`);
  for (const name of accs) {
    const a = st.get(name), l = ladder.get(name), raw = body(files.find((f) => f === `acc-${name}-characters.json` || f === `acc-${name}-characters.json.gz`)).data;
    if (!a) { fail(`${r.id} ${name}: not derived`); continue; }
    if (a.p[0] !== (l?.position ?? 0) || a.p[1] !== (l?.achievements_points ?? 0)) fail(`${r.id} ${name}: ladder ${a.p} raw ${l?.position} ${l?.achievements_points}`);
    const ach = files.filter((f) => f.startsWith(`acc-${name}-achievements`)).flatMap((f) => body(f).data);
    const done = ach.filter((x) => x.completed_at);
    if (done.length !== [...a.a.keys()].filter((c) => done.some((x) => x.code === c)).length || done.some((x) => a.a.get(x.code) !== Math.round(Date.parse(x.completed_at) / 60e3))) fail(`${r.id} ${name}: achievements`);
    if (r.src !== "022") { const k = new Map(); for (const x of ach) for (const o of x.objectives) { const key = `${o.type}:${o.target ?? ""}`; k.set(key, Math.max(k.get(key) ?? 0, o.progress)); } for (const [key, v] of k) if (a.k.get(key) !== v) fail(`${r.id} ${name}: counter ${key} ${a.k.get(key)} raw ${v}`); }
    for (const ch of raw) {
      const c = a.c.get(ch.name); chars++;
      const X = [CUM[ch.level] + ch.xp, ...S.map((s) => CUM[ch[`${s}_level`]] + ch[`${s}_xp`])];
      const bag = (ch.inventory ?? []).filter((s) => s.code && s.quantity > 0).sort((x, y) => y.quantity - x.quantity || (x.code < y.code ? -1 : 1)).slice(0, 5).flatMap((s) => [s.code, s.quantity]);
      const want = { X, m: ch.map_id, s: B.slots.map((k) => ch[`${k}_slot`] || ""), b: bag, t: ch.task ? [ch.task, ch.task_type, ch.task_progress, ch.task_total] : [], h: [ch.hp, ch.max_hp] };
      for (const [f, v] of Object.entries(want)) if (JSON.stringify(c?.[f]) !== JSON.stringify(v)) fail(`${r.id} ${name}/${ch.name} ${f}: ${JSON.stringify(c?.[f])} raw ${JSON.stringify(v)}`);
      checked++;
    }
  }
}
console.log(`${B.reads.length} reads, ${checked} character-reads of ${chars} compared field by field: ${bad} mismatches`);
process.exitCode = bad ? 1 : 0;
