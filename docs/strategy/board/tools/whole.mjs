// Task 026b: the board's days read whole — every full read of the board watch (logs/board/<day>/<HHMM>Z, 50 accounts:
// characters + achievements with every objective's counter), offline, no request. Writes docs/strategy/board/whole-1.md:
// parts A–F's tables, each part closed by its section of whole-1.lines.md (the lines to act on, written by hand).
//   node docs/strategy/board/tools/whole.mjs [--to <day/HHMMZ>] [--out <file>|-] [--lines <file>]
// --to defaults to 2026-11-25/1600Z (the newest read when 026b started), so a second run gives the same bytes.
// read.mjs and day.mjs run on import and export nothing: their few helpers (cum, load) are repeated here, the rest is
// 024's lib.mjs as they use it.
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { ROOT, J, D, SKILLS, items, monsters, med, quart, f1 } from "../../024/tools/lib.mjs";

const ME = "alverus", GEAR = ["weaponcrafting", "gearcrafting", "jewelrycrafting"], GATHER = ["mining", "woodcutting", "fishing", "alchemy"];
const AB = { combat: "cb", mining: "mi", woodcutting: "wo", fishing: "fi", weaponcrafting: "wc", gearcrafting: "gc", jewelrycrafting: "jc", cooking: "co", alchemy: "al" };
const KS = ["combat", ...SKILLS];
const BOARD = join(ROOT, "logs/board");
const XP = J(join(ROOT, "public/data/atlas.json")).xpNeeded; // XP from L to L + 1 (the reads' max_xp agree, 1–49)
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const TO = arg("to") ?? "2026-11-25/1600Z";
const OUT = arg("out") ?? join(ROOT, "docs/strategy/board/whole-1.md");
const LINES = arg("lines") ?? join(ROOT, "docs/strategy/board/tools/whole-1.lines.md");
const gz = (f) => JSON.parse(gunzipSync(readFileSync(f)));
const n0 = (x) => Math.round(x).toLocaleString("en-US");
const hm = (dir) => dir.slice(5, 10) + " " + dir.slice(11, 15);
const H = 3.6e6;

// ---- the reads: full ones (50 accounts, not stopped) up to --to; a read under 90 min after the one kept before is a duplicate
const log = readFileSync(join(BOARD, "reads.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const fulls = log.filter((r) => r.dir && r.accounts === 50 && !r.stopped && r.dir <= TO).sort((x, y) => (x.dir < y.dir ? -1 : 1));
const kept = [], dropped = [];
for (const r of fulls) (kept.length && Date.parse(r.start) - Date.parse(kept.at(-1).start) < 90 * 60e3 ? dropped : kept).push(r);
const partial = log.filter((r) => r.dir && r.dir <= TO && (r.accounts !== 50 || r.stopped)).map((r) => r.dir);
function load(r) {
  const p = join(BOARD, r.dir), files = readdirSync(p).sort(), ladder = new Map(), acc = new Map();
  for (const f of files.filter((x) => x.startsWith("leaderboard-"))) for (const x of gz(join(p, f)).data) ladder.set(x.account, x);
  for (const f of files.filter((x) => x.endsWith("-characters.json.gz"))) {
    const name = f.slice(4, -"-characters.json.gz".length), af = join(p, `acc-${name}-achievements-1.json.gz`);
    acc.set(name, { name, pos: ladder.get(name)?.position ?? 999, pts: ladder.get(name)?.achievements_points ?? 0, chars: gz(join(p, f)).data, ach: existsSync(af) ? gz(af).data : [] });
  }
  return { dir: r.dir, t: Date.parse(r.start), acc };
}
const R = kept.map(load);
const LAST = R.at(-1), SPAN_H = (LAST.t - R[0].t) / H;

// ---- the catalog
const cum = (L, xp) => { let s = xp; for (let l = 1; l < L; l++) s += XP[l] ?? 0; return s; };
const cx = (c, s) => (s === "combat" ? cum(c.level, c.xp) : cum(c[`${s}_level`], c[`${s}_xp`]));
const lv = (c, s) => (s === "combat" ? c.level : c[`${s}_level`]);
const resources = D("resources"), resBy = new Map(resources.map((r) => [r.code, r])), npcItems = D("npc_items");
const tiles = new Map(D("maps").map((m) => [`${m.x},${m.y},${m.layer}`, m]));
const evTile = new Map();
for (const e of D("events")) for (const m of e.maps) evTile.set(`${m.x},${m.y},${m.layer}`, e.content);
const EVENT_MON = new Set(D("events").filter((e) => e.content.type === "monster").map((e) => e.content.code));
const key = (c) => `${c.x},${c.y},${c.layer ?? "overworld"}`;
const contentAt = (c) => tiles.get(key(c))?.interactions?.content ?? (evTile.has(key(c)) ? { ...evTile.get(key(c)), event: true } : null);
const place = (c) => { const k = contentAt(c); return k ? `${k.event ? "⚡" : ""}${k.code}` : tiles.get(key(c))?.name ?? key(c); };
const monAt = (c) => { const k = contentAt(c); return k?.type === "monster" ? k.code : null; };
const gatheredBy = new Map(); // a resource item → the gathering skill of its node
for (const r of resources) for (const d of r.drops) if (!gatheredBy.has(d.code)) gatheredBy.set(d.code, r.skill);
const dropsOf = (code) => [...monsters.values()].filter((m) => m.drops?.some((d) => d.code === code)).map((m) => m.code).sort();
const inv = (c) => (c.inventory ?? []).filter((s) => s.code && s.quantity > 0);
const isFood = (code) => items.get(code)?.subtype === "food";
const isPot = (code) => items.get(code)?.type === "utility";
const foodTxt = (c) => inv(c).filter((s) => isFood(s.code)).map((s) => `${s.quantity} ${s.code}`).join(", ") || "—";
const utilTxt = (c) => [1, 2].filter((k) => c[`utility${k}_slot`] && c[`utility${k}_slot_quantity`] > 0).map((k) => `${c[`utility${k}_slot_quantity`]} ${c[`utility${k}_slot`]}`).join(", ") || "—";
const bagTxt = (c, n = 6) => [...inv(c)].sort((a, b) => b.quantity - a.quantity || (a.code < b.code ? -1 : 1)).slice(0, n).map((s) => `${s.quantity} ${s.code}`).join(", ") || "empty";
/** A recipe's tree: every ingredient at any depth (code → depth). */
const tree = (code, out = new Map(), d = 0) => { for (const g of items.get(code)?.craft?.items ?? []) if (!out.has(g.code)) { out.set(g.code, d); tree(g.code, out, d + 1); } return out; };
/** Where a piece comes from: its craft, else its monsters, else its NPC, else "other". */
const srcOf = (code) => {
  const it = items.get(code);
  if (!it) return "?";
  if (it.craft) return `${AB[it.craft.skill] ?? it.craft.skill} ${it.craft.level}`;
  const m = dropsOf(code);
  if (m.length) return `drop: ${m.join("/")}`;
  const n = npcItems.filter((x) => x.code === code && x.buy_price != null).map((x) => `${x.npc} ${x.buy_price} ${x.currency}`);
  return n.length ? `buy: ${n.join("/")}` : "other";
};
/** A piece's ingredients that are monster drops, with their monsters. */
const dropIngr = (code) => [...tree(code).keys()].filter((c) => !items.get(c)?.craft && dropsOf(c).length).sort().map((c) => `${c} (${dropsOf(c).join("/")})`).join(", ") || "—";
const ilv = (code) => items.get(code)?.level ?? "—";

// ---- the counters: per account, objective type:target → its progress (several achievements may hold one counter)
const counters = (ach) => { const m = new Map(); for (const a of ach) for (const o of a.objectives) { const k = `${o.type}:${o.target ?? ""}`; if (!m.has(k)) m.set(k, []); m.get(k).push({ ach: a.code, p: o.progress, tot: o.total }); } return m; };
const delta = (achA, achB) => {
  const A = counters(achA), out = new Map();
  for (const [k, bs] of counters(achB)) {
    let best = null;
    for (const b of bs) { const a = A.get(k)?.find((x) => x.ach === b.ach); if (!a) continue; const d = b.p - a.p, capped = b.p >= b.tot; if (!best || d > best.d || (d === best.d && !capped)) best = { d, capped }; }
    if (best && best.d > 0) out.set(k, best);
  }
  return out;
};

// ---- the intervals: consecutive kept reads, an account in both
const IV = [], ivOf = new Map();
for (let i = 0; i + 1 < R.length; i++) {
  const A = R[i], B = R[i + 1], h = (B.t - A.t) / H;
  for (const [name, b] of B.acc) {
    const a = A.acc.get(name);
    if (!a) continue;
    const chars = b.chars.map((c1) => { const c0 = a.chars.find((x) => x.name === c1.name); return c0 && { n: c1.name, c0, c1, g: Object.fromEntries(KS.map((s) => [s, cx(c1, s) - cx(c0, s)])) }; }).filter(Boolean);
    const iv = { i, name, A, B, h, a, b, ctr: delta(a.ach, b.ach), chars };
    for (const ch of chars) ch.iv = iv;
    IV.push(iv);
    ivOf.set(`${name}|${i}`, iv);
  }
}
const doing = (ch, k = 2) => KS.filter((s) => ch.g[s] > 0).sort((x, y) => ch.g[y] - ch.g[x]).slice(0, k).map((s) => `${AB[s]} ${n0(ch.g[s] / ch.iv.h)}/h`).join(", ") || "idle";
const ctrTxt = (iv, types, n = 6) => [...iv.ctr].filter(([k]) => types.includes(k.split(":")[0])).sort((x, y) => y[1].d - x[1].d || (x[0] < y[0] ? -1 : 1)).slice(0, n).map(([k, v]) => `${k.split(":")[1] || k.split(":")[0]} +${v.d}${v.capped ? "⊤" : ""}`).join(", ");
/** The monster a character fought in an interval: its tile at the end, else at the start, else the one kill counter that moved
 *  in an account where it was the only one to gain combat XP. */
const fought = (ch) => {
  const t = monAt(ch.c1) ?? monAt(ch.c0);
  if (t) return t;
  const kills = [...ch.iv.ctr.keys()].filter((k) => k.startsWith("combat_kill:")), fighters = ch.iv.chars.filter((x) => x.g.combat > 0);
  return kills.length === 1 && fighters.length === 1 ? kills[0].slice(12) : null;
};

const out = [];
const table = (title, head, rows, note) => {
  if (title) out.push(`### ${title}`, "");
  out.push(`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.map((x) => String(x).replace(/\|/g, "/")).join(" | ")} |`));
  if (note) out.push("", note);
  out.push("");
};
const lines = existsSync(LINES) ? readFileSync(LINES, "utf8").replace(/\r\n/g, "\n") : "";
const section = (p) => { const m = lines.match(new RegExp(`^## ${p}\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "m")); return m ? m[1].trim() : ""; };
const close = (p) => { const s = section(p); if (s) out.push(s, ""); };
const mark = (a) => (a === ME ? `**${ME}**` : a);

out.push("# The board's days, read whole (task 026b)", "",
  `Made by \`node docs/strategy/board/tools/whole.mjs\` from the board watch's reads (\`logs/board/\`), offline, no request: ${R.length} full reads ` +
  `from ${R[0].dir} to ${LAST.dir}, ${f1(SPAN_H)} h, ${IV.length} account-intervals between consecutive reads. Left out: ${partial.join(", ") || "none"} (partial) and ` +
  `${dropped.map((r) => r.dir).join(", ") || "none"} (four minutes after the read before it). An account is in an interval when it is in both reads (the 50 read ` +
  `are the ladder's first 50 and ten either side of ${ME}, so a few come and go). Counters are the account's (achievements are per account); ` +
  "a counter marked ⊤ reached its total in the interval, so its move is cut. Skills: cb combat, mi mining, wo woodcutting, fi fishing, " +
  "wc weaponcrafting, gc gearcrafting, jc jewelrycrafting, co cooking, al alchemy. ⚡ an event's tile.", "");
close("intro");

// =================================================================================================== A. crafts
out.push("## A. How a craft is levelled fast", "");
const byCraft = Object.fromEntries(GEAR.map((s) => [s, [...items.values()].filter((it) => it.craft?.skill === s).sort((a, b) => (a.code < b.code ? -1 : 1))]));
/** The recipe a crafter trained in an interval, read from the bags (the recipes that give XP over the interval, at most the
 *  level it started at): a crafting counter of it moved (10), the product in the crafter's bag (3), the share of its direct
 *  ingredients there; ties to the higher recipe. `perRun`: the craft XP ÷ the account's recycles, shown only — this fleet's
 *  own train loop banks some products (Second's battlestaffs, journal of 11-25), so it is no run count. */
function recipeOf(ch, s) {
  const L0 = lv(ch.c0, s), bag = new Set([...inv(ch.c0), ...inv(ch.c1)].map((x) => x.code)), rc = ch.iv.ctr.get("recycling:");
  const perRun = rc && !rc.capped && ch.g[s] > 0 ? ch.g[s] / rc.d : null;
  let best = null;
  for (const it of byCraft[s].filter((x) => x.craft.level <= L0 && L0 - x.craft.level <= 10)) {
    const ing = it.craft.items.map((g) => g.code), made = ch.iv.ctr.get(`crafting:${it.code}`)?.d ?? 0;
    const sc = (made ? 10 : 0) + (bag.has(it.code) ? 3 : 0) + ing.filter((c) => bag.has(c)).length / ing.length;
    if (sc > 0 && (!best || sc > best.sc || (sc === best.sc && it.craft.level > best.L))) best = { it, sc, L: it.craft.level };
  }
  return best && { it: best.it, perRun, by: best.sc >= 3 ? "product" : `${Math.round(best.sc * 100)}% of its ingredients` };
}
/** What a character did for a recipe's tree T in an interval: stood on a node or monster that drops a part of it, a gathering
 *  or crafting counter of a part moved while it gained that skill's XP, parts in its bag. */
function forTree(ch, T, s) {
  const ev = [];
  for (const c of [ch.c0, ch.c1]) {
    const k = contentAt(c);
    if (!k || !["monster", "resource"].includes(k.type)) continue;
    const drops = (k.type === "monster" ? monsters.get(k.code)?.drops : resBy.get(k.code)?.drops) ?? [];
    if (!drops.some((d) => T.has(d.code))) continue;
    if (k.type === "resource") ev.push(`gathers at ${k.code}`);
    else { const m = monsters.get(k.code); ev.push(`${c.level > m.level + 10 ? "fights for no XP" : ch.g.combat > 0 ? "fights" : "stands at (no combat XP)"} ${k.code} (Lv ${m.level})`); }
  }
  for (const [kk, v] of ch.iv.ctr) {
    const [type, target] = kk.split(":");
    if (!T.has(target)) continue;
    if (type === "gathering" && ch.g[gatheredBy.get(target)] > 0) ev.push(`gathered ${target} +${v.d}`);
    const sk = items.get(target)?.craft?.skill;
    if (type === "crafting" && sk && sk !== s && ch.g[sk] > 0) ev.push(`made ${target} +${v.d}`);
  }
  const bag = inv(ch.c1).filter((x) => T.has(x.code)).map((x) => `${x.quantity} ${x.code}`);
  return { ev: [...new Set(ev)], bag };
}
const crafts = [];
const accNames = [...new Set(R.flatMap((r) => [...r.acc.keys()]))].sort();
for (const name of accNames) {
  const ser = R.map((r) => r.acc.get(name));
  const names = [...new Set(ser.filter(Boolean).flatMap((a) => a.chars.map((c) => c.name)))].sort();
  for (const n of names) for (const s of GEAR) {
    const at = (i) => ser[i]?.chars.find((c) => c.name === n);
    let best = null;
    for (let i = 0; i < R.length; i++) if (at(i)) for (let j = i + 1; j < R.length && R[j].t - R[i].t <= 24.1 * H; j++) if (at(j)) { const g = cx(at(j), s) - cx(at(i), s); if (!best || g > best.gain) best = { i, j, gain: g }; }
    const mine = name === ME && ((n === "Second" && s === "weaponcrafting") || (n === "Third" && s === "gearcrafting"));
    if (!best || (best.gain < 30000 && !mine)) continue;
    const gi = (k) => { const iv = ivOf.get(`${name}|${k}`); const ch = iv?.chars.find((x) => x.n === n); return ch ? ch.g[s] : 0; };
    while (best.i < best.j - 1 && gi(best.i) <= 0) best.i++;
    while (best.j > best.i + 1 && gi(best.j - 1) <= 0) best.j--;
    crafts.push({ name, n, s, ...best, mine });
  }
}
crafts.sort((x, y) => Number(x.mine) - Number(y.mine) || y.gain - x.gain);
const answer = [];
for (const k of crafts) {
  // the rows: the window and the run-up before it (the 24 h before its end, at most six intervals before it)
  let s0 = k.i;
  while (s0 > 0 && k.i - s0 < 6 && R[k.j].t - R[s0 - 1].t <= 24.1 * H) s0--;
  const ivs = [], crOf = (iv) => iv.chars.find((x) => x.n === k.n);
  for (let i = s0; i < k.j; i++) { const iv = ivOf.get(`${k.name}|${i}`); if (iv && crOf(iv)) ivs.push(iv); }
  const recs = new Map(ivs.map((iv) => [iv, crOf(iv).g[k.s] > 0 ? recipeOf(crOf(iv), k.s) : null]));
  const T = new Map(); // the trees of every recipe the window trained: a part of any is "for it"
  for (const r of recs.values()) if (r) for (const [c, d] of tree(r.it.code)) if (!T.has(c)) T.set(c, d);
  const rows = [], who = new Map(), recipes = [];
  const note = (n, f, h) => { if (!f.ev.length) return; const w = who.get(n) ?? { h: 0, ev: new Set() }; w.h += h; for (const e of f.ev) w.ev.add(e.replace(/ \+\d+$/, "")); who.set(n, w); };
  let trainH = 0, trainXP = 0;
  for (const iv of ivs) {
    const cr = crOf(iv), rec = recs.get(iv), inWin = iv.i >= k.i;
    if (inWin && cr.g[k.s] > 0) { trainH += iv.h; trainXP += cr.g[k.s]; }
    if (rec) { const last = recipes.at(-1); if (last?.code === rec.it.code) last.to = lv(cr.c1, k.s); else recipes.push({ code: rec.it.code, lvl: rec.it.craft.level, from: lv(cr.c0, k.s), to: lv(cr.c1, k.s) }); }
    const others = iv.chars.filter((x) => x.n !== k.n).map((o) => {
      const f = forTree(o, T, k.s);
      note(o.n, f, iv.h);
      return `${o.n} ${o.c1.level} @${place(o.c1)}: ${doing(o)}${f.ev.length ? `; **for it:** ${f.ev.join(", ")}` : ""}${f.bag.length ? `; bag ${f.bag.slice(0, 3).join(", ")}` : ""}`;
    });
    const own = forTree(cr, T, k.s);
    note(k.n, own, iv.h);
    const at = place(cr.c0) === place(cr.c1) ? place(cr.c1) : `${place(cr.c0)} → ${place(cr.c1)}`;
    rows.push([`${hm(iv.B.dir)}${inWin ? "" : " (before)"}`, `${lv(cr.c1, k.s)} ${n0(cr.g[k.s] / iv.h)}`, `${at}${own.ev.length ? ` (${own.ev.join(", ")})` : ""}`,
      `${rec ? `${rec.it.code} (${rec.it.craft.level}; ${rec.by})` : cr.g[k.s] > 0 ? "?" : "—"}${cr.g[k.s] > 0 && iv.ctr.get("recycling:") && !iv.ctr.get("recycling:").capped ? `; ${n0(cr.g[k.s] / iv.ctr.get("recycling:").d)} XP a recycle` : ""}`, bagTxt(cr.c1, 5), ctrTxt(iv, ["crafting", "recycling"]) || "—", others.join("<br>")]);
  }
  const L0 = lv(crOf(ivs.find((iv) => iv.i >= k.i)).c0, k.s), L1 = lv(crOf(ivs.at(-1)).c1, k.s);
  out.push(`### A.1 ${mark(k.name)} — ${k.n}'s ${k.s}, ${hm(R[k.i].dir)} → ${hm(R[k.j].dir)}: +${n0(k.gain)} XP (${L0} → ${L1})`, "");
  table("", ["read", `${AB[k.s]} level, XP/h`, "crafter stands (start → end)", "recipe (read from the bags: the product, or the share of its ingredients); the craft XP ÷ the recycles", "crafter's bag", "crafted / recycled (account)", "the other four: combat level, tile, XP an hour; what they did for the window's recipes"], rows);
  const fromWho = [...who].sort((x, y) => y[1].h - x[1].h || (x[0] < y[0] ? -1 : 1)).map(([n, w]) => `${n === k.n ? `${n} (itself)` : n} ${f1(Math.round(w.h * 10) / 10)} h: ${[...w.ev].slice(0, 3).join(", ")}`);
  const endIv = ivs.at(-1), top = Math.max(...endIv.chars.map((x) => x.c1.level));
  answer.push([mark(k.name), `${k.n} ${AB[k.s]}`, `${crOf(endIv).c1.level} (${top})`, `${f1(Math.round(((R[k.j].t - R[k.i].t) / H) * 10) / 10)} h`, `${n0(k.gain)} (${L0} → ${L1})`, trainH ? n0(trainXP / trainH) : "—", `${f1(Math.round(trainH * 10) / 10)} h`, recipes.map((r) => `${r.from === r.to ? r.from : `${r.from}–${r.to}`}: ${r.code} (${r.lvl})`).join("; ") || "?", fromWho.join("; ") || "nobody seen (bank stock, or not at a source at a read)"]);
}
table("A.2 The answer, an account a row (A.3: alverus's last two rows)", ["account", "crafter", "its combat (the account's top)", "window", "craft XP (levels)", "XP/h while training", "hours training", "recipe by craft level (the recipe's own level)", "who was seen on the recipes' materials (the run-up included), hours of intervals"], answer,
  "XP/h while training: over the intervals in which the craft gained XP. \"for no XP\": the monster is more than 10 levels under the character at that read (no XP by the rule of report 012); \"stands at\": on the tile, no combat XP in the interval.");
close("A");

// =================================================================================================== B. fights
out.push("## B. What they fight, level by level", "");
const FIGHTS = [];
for (const iv of IV) for (const ch of iv.chars) if (ch.g.combat > 0) FIGHTS.push({ ch, acc: iv.name, n: ch.n, i: iv.i, L: ch.c0.level, mon: fought(ch), xph: ch.g.combat / iv.h, set: SLOTS_SIG(ch.c1) });
function SLOTS_SIG(c) { return ["weapon_slot", "shield_slot", "helmet_slot", "body_armor_slot", "leg_armor_slot", "boots_slot", "ring1_slot", "ring2_slot", "amulet_slot", "artifact1_slot", "artifact2_slot", "artifact3_slot", "rune_slot", "utility1_slot", "utility2_slot"].map((k) => c[k] || "-").join(" "); }
const armour = (c) => ["shield_slot", "helmet_slot", "body_armor_slot", "leg_armor_slot", "boots_slot"].map((k) => c[k] || "—").join(" / ");
const jewels = (c) => ["ring1_slot", "ring2_slot", "amulet_slot"].map((k) => c[k] || "—").join(" / ");
const arts = (c) => [...["artifact1_slot", "artifact2_slot", "artifact3_slot"].map((k) => c[k]).filter(Boolean), c.rune_slot && `rune ${c.rune_slot}`].filter(Boolean).join(", ") || "—";
// B.1: a row a stint — consecutive intervals of one character at one monster in one set
const stints = [];
for (const f of [...FIGHTS].sort((x, y) => (x.acc < y.acc ? -1 : x.acc > y.acc ? 1 : x.n < y.n ? -1 : x.n > y.n ? 1 : x.i - y.i))) {
  const s = stints.at(-1);
  if (s && s.acc === f.acc && s.n === f.n && s.to === f.i && s.mon === f.mon && s.set === f.set) { s.to = f.i + 1; s.h += f.ch.iv.h; s.xp += f.ch.g.combat; s.c1 = f.ch.c1; }
  else stints.push({ acc: f.acc, n: f.n, from: f.i, to: f.i + 1, h: f.ch.iv.h, xp: f.ch.g.combat, c0: f.ch.c0, c1: f.ch.c1, mon: f.mon, set: f.set });
}
out.push(`### B.1 Every character-interval with combat XP (${FIGHTS.length}), a row a stint: consecutive intervals of one character at one monster in one set (${stints.length}); the set and the bag at the stint's last read`, "");
const monTxt = (m) => (m ? `${EVENT_MON.has(m) ? "⚡" : ""}${m} ${monsters.get(m)?.level ?? "?"}` : "?");
table("", ["account", "character", "reads", "h", "level", "monster", "XP/h", "weapon", "shield / helmet / body / legs / boots", "rings / amulet", "artifacts, rune", "utilities", "food in the bag"],
  stints.map((s) => [mark(s.acc), s.n, `${hm(R[s.from].dir)} → ${hm(R[s.to].dir)}`, f1(Math.round(s.h * 10) / 10), `${s.c0.level}→${s.c1.level}`, monTxt(s.mon), n0(s.xp / s.h), `${s.c1.weapon_slot || "—"} ${ilv(s.c1.weapon_slot)}`, armour(s.c1), jewels(s.c1), arts(s.c1), utilTxt(s.c1), foodTxt(s.c1)]),
  "The monster: the tile at the interval's end, else at its start, else the one kill counter that moved where this was the account's only fighter; \"?\" otherwise (a bank, a workshop, a walk).");
// B.2: by combat level
const QB = (xs) => quart(xs)[2];
const levelRows = [];
for (let L = 25; L <= 50; L++) {
  const fs = FIGHTS.filter((f) => f.L === L);
  if (!fs.length) { levelRows.push([L, 0, "—", "—", "—", "—", "—"]); continue; }
  const byMon = new Map();
  for (const f of fs.filter((x) => x.mon)) { if (!byMon.has(f.mon)) byMon.set(f.mon, []); byMon.get(f.mon).push(f.xph); }
  const mons = [...byMon].sort((x, y) => y[1].length - x[1].length || med(y[1]) - med(x[1]) || (x[0] < y[0] ? -1 : 1)).map(([m, xs]) => `${monTxt(m)} ×${xs.length} (${n0(med(xs))} / ${n0(Math.max(...xs))})`);
  const q = QB(fs.map((f) => f.xph)), topq = fs.filter((f) => f.xph >= q), w = new Map();
  for (const f of topq) { const c = f.ch.c1.weapon_slot || "—"; w.set(c, (w.get(c) ?? 0) + 1); }
  const mine = fs.filter((f) => f.acc === ME && ["First", "Fifth"].includes(f.n)).map((f) => `${f.n} ${monTxt(f.mon)} ${n0(f.xph)}`);
  levelRows.push([L, fs.length, n0(med(fs.map((f) => f.xph))), n0(Math.max(...fs.map((f) => f.xph))), mons.slice(0, 6).join("; "), [...w].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)).slice(0, 3).map(([c, k]) => `${c} ${ilv(c)} ×${k}`).join(", "), mine.join("; ") || "—"]);
}
table("B.2 By combat level (the level at the interval's start): the monsters fought, character-intervals each (median / best XP an hour); the weapon of the best quarter by XP/h",
  ["level", "intervals", "median XP/h", "best", "monsters: ×intervals (median / best XP/h)", "best quarter's weapon (level) ×intervals", `${ME}'s First and Fifth`], levelRows);
// B.3: seconds a kill where a counter and the tiles isolate one character
const iso = [];
for (const iv of IV) for (const [k, v] of iv.ctr) {
  if (!k.startsWith("combat_kill:") || v.capped) continue;
  const m = k.slice(12), at = iv.chars.filter((ch) => monAt(ch.c0) === m || monAt(ch.c1) === m);
  if (at.length !== 1 || monAt(at[0].c0) !== m || monAt(at[0].c1) !== m || at[0].g.combat <= 0) continue;
  const ch = at[0];
  iso.push({ m, acc: iv.name, ch, d: v.d, sec: (iv.h * 3600) / v.d });
}
iso.sort((x, y) => (monsters.get(x.m).level - monsters.get(y.m).level) || (x.m < y.m ? -1 : x.m > y.m ? 1 : x.ch.c0.level - y.ch.c0.level || x.sec - y.sec));
table(`B.3 Seconds a kill, where one character stood on the monster's tile at both reads and the account's kill counter of it moved (${iso.length}; an upper bound: the interval's seconds over the kills — a walk to the bank in between counts)`,
  ["monster", "account", "character", "level", "read", "kills", "s a kill", "XP a kill", "weapon", "shield / helmet / body / legs / boots", "rings / amulet", "artifacts, rune", "utilities", "food"],
  iso.map((x) => [monTxt(x.m), mark(x.acc), x.ch.n, x.ch.c0.level, hm(x.ch.iv.B.dir), x.d, f1(Math.round(x.sec * 10) / 10), n0(x.ch.g.combat / x.d), `${x.ch.c1.weapon_slot || "—"} ${ilv(x.ch.c1.weapon_slot)}`, armour(x.ch.c1), jewels(x.ch.c1), arts(x.ch.c1), utilTxt(x.ch.c1), foodTxt(x.ch.c1)]));
close("B");

// =================================================================================================== C. gear by band
out.push("## C. What they wear, by band", "");
const GROUPS = [["weapon", ["weapon_slot"]], ["shield", ["shield_slot"]], ["helmet", ["helmet_slot"]], ["body", ["body_armor_slot"]], ["legs", ["leg_armor_slot"]], ["boots", ["boots_slot"]], ["rings", ["ring1_slot", "ring2_slot"]], ["amulet", ["amulet_slot"]], ["rune", ["rune_slot"]], ["artifacts", ["artifact1_slot", "artifact2_slot", "artifact3_slot"]], ["utilities", ["utility1_slot", "utility2_slot"]]];
const BANDS = [[28, 32], [33, 37], [38, 42], [43, 47], [48, 50]];
const meNow = LAST.acc.get(ME), F1 = meNow?.chars.find((c) => c.name === "First"), F5 = meNow?.chars.find((c) => c.name === "Fifth");
const piece = (c) => (c === "—" ? "—" : `${c} (${ilv(c)}; ${srcOf(c)})`);
const early = new Map(); // the pieces of 28–32 and 33–37 → their slots and bands
for (const [lo, hi] of BANDS) {
  const fs = FIGHTS.filter((f) => f.L >= lo && f.L <= hi), q = QB(fs.map((f) => f.xph)), top = fs.filter((f) => f.xph >= q);
  const who = new Set(top.map((f) => `${f.acc}/${f.n}`));
  const rows = GROUPS.map(([g, ks]) => {
    const cnt = new Map();
    for (const f of top) for (const k of ks) { const c = f.ch.c1[k] || "—"; cnt.set(c, (cnt.get(c) ?? 0) + 1); }
    const ranked = [...cnt].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
    const [c1, k1] = ranked[0] ?? ["—", 0], next = ranked.slice(1, 3).map(([c, k]) => `${c} ${ilv(c)} ×${k}`).join(", ");
    if (lo <= 33) for (const [c] of ranked.slice(0, 2)) if (c !== "—") { const e = early.get(c) ?? { slots: new Set(), bands: new Set() }; e.slots.add(g); e.bands.add(`${lo}–${hi}`); early.set(c, e); }
    const mine = (c) => (c ? ks.map((k) => (c[k] ? `${c[k]} ${ilv(c[k])}` : "—")).join(" / ") : "—");
    return [g, `${piece(c1)} ×${k1}`, c1 === "—" ? "—" : dropIngr(c1), next || "—", mine(F1), mine(F5)];
  });
  table(`C. ${lo}–${hi}: the best quarter by XP an hour (≥ ${n0(q)}: ${top.length} character-intervals of ${fs.length}, ${who.size} characters) — the most worn in every slot (a ring, an artifact, a utility counted a slot each)`,
    ["slot", "most worn (level; craft and level, or source) ×slots", "its drop ingredients (monster)", "next", "First now", "Fifth now"], rows);
}
const earlyRows = [...early].map(([c, e]) => ({ c, it: items.get(c), e })).sort((x, y) => {
  const sx = x.it?.craft ? 0 : 1, sy = y.it?.craft ? 0 : 1;
  return sx - sy || (x.it?.craft?.level ?? x.it?.level ?? 0) - (y.it?.craft?.level ?? y.it?.level ?? 0) || (x.c < y.c ? -1 : 1);
});
table("C. The pieces of the 28–32 and 33–37 bands (the two most worn in every slot), by the craft level they ask", ["piece", "slot", "band", "item level", "craft and level / source", "drop ingredients (monster)"],
  earlyRows.map(({ c, e }) => [c, [...e.slots].join(", "), [...e.bands].join(", "), ilv(c), srcOf(c), dropIngr(c)]));
close("C");

// =================================================================================================== D. achievements
out.push("## D. Which achievements come next", "");
const order = (ach) => ach.filter((a) => a.completed_at).sort((x, y) => (x.completed_at < y.completed_at ? -1 : x.completed_at > y.completed_at ? 1 : x.code < y.code ? -1 : 1));
const myAch = new Map((meNow?.ach ?? []).map((a) => [a.code, a]));
const myTxt = (code) => { const a = myAch.get(code); if (!a) return "—"; if (a.completed_at) return `done ${a.completed_at.slice(5, 10)}`; return a.objectives.map((o) => `${o.target ?? o.type} ${o.progress}/${o.total}`).join(", "); };
const seqs = (lo, hi) => {
  const res = [];
  for (const a of [...LAST.acc.values()].sort((x, y) => x.pos - y.pos)) {
    const ord = order(a.ach), total = ord.reduce((t, x) => t + x.points, 0);
    if (total <= lo) continue;
    let cumP = 0, passed = null;
    const seq = [];
    for (const x of ord) {
      const before = cumP;
      cumP += x.points;
      if (passed === null) { if (cumP > lo) passed = x.completed_at; continue; }
      if (before >= hi) break;
      seq.push({ code: x.code, pts: x.points, t: x.completed_at });
    }
    res.push({ a, passed, seq, total });
  }
  return res;
};
const D39 = seqs(39, 60);
table(`D. The accounts now above 39 points (${D39.length}): the achievements each completed after it passed 39, in order, up to 60 points (the days since the one before; the first since it passed 39)`,
  ["#", "account", "pts", "passed 39", "after it, in order"],
  D39.map(({ a, passed, seq }) => [a.pos, mark(a.name), a.pts, passed.slice(0, 10), seq.map((x, i) => `${x.code} ${x.pts} (+${f1(Math.round(((Date.parse(x.t) - Date.parse(i ? seq[i - 1].t : passed)) / 864e5) * 10) / 10)})`).join(", ") || "—"]));
const common = (S, k) => {
  const m = new Map();
  for (const { seq } of S) seq.forEach((x, i) => { if (!m.has(x.code)) m.set(x.code, { pts: x.pts, pos: [] }); m.get(x.code).pos.push(i + 1); });
  return [...m].sort((x, y) => y[1].pos.length - x[1].pos.length || med(x[1].pos) - med(y[1].pos) || (x[0] < y[0] ? -1 : 1)).slice(0, k);
};
table("D. The fifteen most common after 39, their median place in the order, and alverus's counters now", ["achievement", "pts", "accounts", "median place", `${ME} now`],
  common(D39, 15).map(([c, v]) => [c, v.pts, `${v.pos.length} of ${D39.length}`, f1(med(v.pos)), myTxt(c)]));
const D60 = seqs(60, 80);
table(`D. 60 → 80: the five most common (${D60.length} accounts above 60)`, ["achievement", "pts", "accounts", "median place", `${ME} now`],
  common(D60, 5).map(([c, v]) => [c, v.pts, `${v.pos.length} of ${D60.length}`, f1(med(v.pos)), myTxt(c)]));
close("D");

// =================================================================================================== E. rates
out.push("## E. Rates the model guesses", "");
const rateRows = [];
for (const name of accNames) {
  const ivs = IV.filter((iv) => iv.name === name);
  if (!ivs.length) continue;
  const days = ivs.reduce((t, iv) => t + iv.h, 0) / 24;
  const sum = (pred) => ivs.reduce((t, iv) => t + [...iv.ctr].filter(([k]) => pred(k)).reduce((u, [, v]) => u + v.d, 0), 0);
  const capped = (type) => { const a = LAST.acc.get(name) ?? R.findLast((r) => r.acc.has(name)).acc.get(name); const cs = a.ach.flatMap((x) => x.objectives.filter((o) => o.type === type)); return cs.length && cs.every((o) => o.progress >= o.total) ? "⊤" : ""; };
  const uses = new Map();
  for (const iv of ivs) for (const [k, v] of iv.ctr) if (k.startsWith("use:")) uses.set(k.slice(4), (uses.get(k.slice(4)) ?? 0) + v.d);
  let food = 0, pots = 0;
  for (const iv of ivs) for (const ch of iv.chars) {
    const q = (c) => { const m = new Map(); for (const s of inv(c)) m.set(s.code, (m.get(s.code) ?? 0) + s.quantity); for (const k of [1, 2]) if (c[`utility${k}_slot`]) m.set(c[`utility${k}_slot`], (m.get(c[`utility${k}_slot`]) ?? 0) + c[`utility${k}_slot_quantity`]); return m; };
    const q0 = q(ch.c0), q1 = q(ch.c1);
    for (const [c, x] of q0) { const d = x - (q1.get(c) ?? 0); if (d > 0 && isFood(c)) food += d; if (d > 0 && isPot(c)) pots += d; }
  }
  const creads = R.filter((r) => r.acc.has(name)).flatMap((r) => r.acc.get(name).chars.map((c) => ({ c, t: r.t })));
  const held = creads.filter((x) => x.c.task), idle = creads.filter((x) => Date.parse(x.c.cooldown_expiration) < x.t - 10 * 60e3);
  const a = LAST.acc.get(name) ?? R.findLast((r) => r.acc.has(name)).acc.get(name);
  rateRows.push({ name, pos: a.pos, pts: a.pts, v: [sum((k) => k.startsWith("favor:")) / days, sum((k) => k.startsWith("task:")) / days, held.length ? held.filter((x) => x.c.task_type === "monsters").length / held.length : NaN, sum((k) => k.startsWith("combat_kill:") && EVENT_MON.has(k.slice(12))) / days, [...uses.values()].reduce((t, x) => t + x, 0) / days, food / days, pots / days, idle.length / creads.length],
    cap: [capped("favor"), capped("task")], uses: [...uses].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)).slice(0, 3).map(([c, x]) => `${c} ${n0(x / days)}`).join(", "), days });
}
rateRows.sort((x, y) => x.pos - y.pos);
const pct = (x) => (Number.isFinite(x) ? `${Math.round(100 * x)}%` : "—");
const fmtE = (v) => [f1(Math.round(v[0] * 10) / 10), f1(Math.round(v[1] * 10) / 10), pct(v[2]), f1(Math.round(v[3] * 10) / 10), n0(v[4]), n0(v[5]), n0(v[6]), pct(v[7])];
const col = (j) => rateRows.map((r) => r.v[j]).filter(Number.isFinite);
table(`E. A day, an account a row (over the intervals each account is in; ⊤: every counter of the kind is at its total, so it stopped)`,
  ["#", "account", "pts", "days", "favors", "tasks", "monsters tasks of held", "event kills", "uses (counted)", "which", "food left bags", "potions left bags", "idle reads"],
  [...rateRows.map((r) => { const v = fmtE(r.v); return [r.pos, mark(r.name), r.pts, f1(Math.round(r.days * 10) / 10), v[0] + r.cap[0], v[1] + r.cap[1], v[2], v[3], v[4], r.uses || "—", v[5], v[6], v[7]]; }),
    ["", "median", "", "", ...fmtE([0, 1, 2, 3, 4, 5, 6, 7].map((j) => med(col(j)))).slice(0, 5), "", ...fmtE([0, 1, 2, 3, 4, 5, 6, 7].map((j) => med(col(j)))).slice(5)],
    ["", "best quarter (Q3; idle: Q1)", "", "", ...fmtE([0, 1, 2, 3, 4, 5, 6, 7].map((j) => (j === 7 ? quart(col(j))[0] : quart(col(j))[2]))).slice(0, 5), "", ...fmtE([0, 1, 2, 3, 4, 5, 6, 7].map((j) => (j === 7 ? quart(col(j))[0] : quart(col(j))[2]))).slice(5)]],
  "Favors and tasks: the `favor` and `task` counters (A Favored Champion 500, Tasks Coins Fan 1,000). Monsters tasks: of the character-reads holding a task. " +
  "Event kills: kill counters of monsters that only events bring (" + [...EVENT_MON].sort().join(", ") + ") — most have none. Uses: the `use` counters " +
  "(foods of Carnivore and Gourmet Chef, the teleport potions of Art of Teleportation, the corrupted fruit), not every food. Left bags: food and utility potions " +
  "whose count in a bag or a utility slot fell between two reads — eaten, drunk or banked. Idle: a character-read whose `cooldown_expiration` lies more than ten minutes before the read.");
close("E");

// =================================================================================================== F. the twin
out.push("## F. The twin", "");
const R0 = R[0];
const twins = [...R0.acc.values()].filter((a) => a.name !== ME && LAST.acc.has(a.name)).map((a) => {
  const b = LAST.acc.get(a.name), top0 = Math.max(...a.chars.map((c) => c.level));
  const lv0 = a.chars.reduce((t, c) => t + c.level, 0), lv1 = b.chars.reduce((t, c) => t + c.level, 0);
  const xp = b.chars.reduce((t, c) => { const c0 = a.chars.find((x) => x.name === c.name); return t + (c0 ? cx(c, "combat") - cx(c0, "combat") : 0); }, 0);
  return { name: a.name, top0, top1: Math.max(...b.chars.map((c) => c.level)), gained: lv1 - lv0, xp };
}).filter((x) => x.top0 >= 28 && x.top0 <= 36).sort((x, y) => y.gained - x.gained || y.xp - x.xp || (x.name < y.name ? -1 : 1));
table(`F. The accounts at top combat 28–36 at the first read (${twins.length}), by combat levels gained since (all five characters)`, ["account", "top combat first → now", "levels gained", "combat XP gained"],
  twins.map((t) => [mark(t.name), `${t.top0} → ${t.top1}`, t.gained, n0(t.xp)]));
const SLOTK = ["weapon_slot", "shield_slot", "helmet_slot", "body_armor_slot", "leg_armor_slot", "boots_slot", "ring1_slot", "ring2_slot", "amulet_slot", "artifact1_slot", "artifact2_slot", "artifact3_slot", "rune_slot", "bag_slot"];
const page = (name) => {
  const ser = R.map((r) => r.acc.get(name));
  const first = ser.find(Boolean), last = [...ser].reverse().find(Boolean);
  out.push(`### F. ${mark(name)}: ${first.pts} → ${last.pts} points; combat ${first.chars.map((c) => c.level).join(" ")} → ${last.chars.map((c) => c.level).join(" ")}`, "");
  const names = last.chars.map((c) => c.name);
  table("", ["read", ...names], R.map((r, i) => {
    const a = r.acc.get(name);
    if (!a) return [hm(r.dir), ...names.map(() => "(not read)")];
    const iv = i ? ivOf.get(`${name}|${i - 1}`) : null;
    return [hm(r.dir), ...names.map((n) => { const c = a.chars.find((x) => x.name === n), ch = iv?.chars.find((x) => x.n === n); if (!c) return "—"; return `${c.level} @${place(c)}${ch ? `: ${doing(ch)}` : ""}`; })];
  }), "A cell: the combat level at the read, the tile, and the two skills that gained most XP since the read before (an hour).");
  const skills = (c) => ["level", ...SKILLS.map((s) => `${s}_level`)].map((k) => `${k === "level" ? "cb" : AB[k.slice(0, -6)]} ${c[k]}`).join(" ");
  out.push(`Skills now: ${last.chars.map((c) => `${c.name} ${skills(c)}`).join("; ")}.`, "");
  const changes = [];
  for (let i = 1; i < R.length; i++) {
    const a = R[i - 1].acc.get(name), b = R[i].acc.get(name);
    if (!a || !b) continue;
    for (const c of b.chars) {
      const c0 = a.chars.find((x) => x.name === c.name);
      if (!c0) continue;
      for (const k of SLOTK) if (c[k] && c[k] !== c0[k]) {
        const it = items.get(c[k]), sk = it?.craft?.skill, L = it?.craft?.level;
        const could = sk ? a.chars.filter((x) => x[`${sk}_level`] >= L).map((x) => x.name).join(", ") || "nobody" : "—";
        changes.push([hm(R[i].dir), c.name, c.level, k.replace("_slot", ""), `${c0[k] || "—"} → ${c[k]}`, ilv(c[k]), srcOf(c[k]), could]);
      }
    }
  }
  table("", ["read", "character", "combat", "slot", "change", "level", "craft / source", "who in the account could make it then"], changes.length ? changes : [["—", "no change", "", "", "", "", "", ""]]);
};
for (const t of twins.slice(0, 3)) page(t.name);
page(ME);
close("F");

const text = out.join("\n").replace(/\n{3,}/g, "\n\n");
if (OUT === "-") process.stdout.write(text);
else { writeFileSync(OUT, text); console.log(`${OUT}: ${text.length} characters, ${R.length} reads, ${IV.length} account-intervals`); }
