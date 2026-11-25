// Task 027g, part D: the board's first day — 027b's reader (read.mjs) extended over every full read of the watch
// (logs/board/<day>/<HHMM>Z with all 50 accounts) from --from (default 2026-11-24/1200Z) to the newest. No request. Prints
// markdown: (1) combat XP an hour by level band, (2) food and potions carried, (3) the gear crafts against the top combat
// level, (4) where the XP goes, an account a row.
//   node docs/strategy/board/tools/day.mjs [--from <day/HHMMZ>] [--to <day/HHMMZ>]
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { ROOT, J, D, items, monsters, med, quart, f1 } from "../../024/tools/lib.mjs";

const ME = "alverus", GEAR = ["weaponcrafting", "gearcrafting", "jewelrycrafting"], GATHER = ["mining", "woodcutting", "fishing"];
const BOARD = join(ROOT, "logs/board");
const XP = J(join(ROOT, "public/data/atlas.json")).xpNeeded;
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const gz = (f) => JSON.parse(gunzipSync(readFileSync(f)));
const log = readFileSync(join(BOARD, "reads.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const startOf = new Map(log.filter((r) => r.dir).map((r) => [r.dir, Date.parse(r.start)]));
const full = log.filter((r) => r.dir && r.accounts === 50 && !r.stopped).map((r) => r.dir).sort();
const from = arg("from") ?? "2026-11-24/1200Z", to = arg("to") ?? full.at(-1);
const span = full.filter((d) => d >= from && d <= to);
if (span.length < 2) { console.error(`fewer than two full reads from ${from} to ${to}`); process.exit(1); }

function load(dir) {
  const p = join(BOARD, dir), ladder = new Map(), acc = new Map();
  for (const f of readdirSync(p).filter((x) => x.startsWith("leaderboard-"))) for (const r of gz(join(p, f)).data) ladder.set(r.account, r);
  for (const f of readdirSync(p).filter((x) => x.endsWith("-characters.json.gz"))) {
    const name = f.slice(4, -"-characters.json.gz".length);
    acc.set(name, { name, pos: ladder.get(name)?.position ?? 999, pts: ladder.get(name)?.achievements_points ?? 0, chars: gz(join(p, f)).data });
  }
  return { dir, t: startOf.get(dir), acc };
}
const first = load(span[0]), last = load(span.at(-1));
const hours = (last.t - first.t) / 3.6e6;
const cum = (L, xp) => { let s = xp; for (let l = 1; l < L; l++) s += XP[l] ?? 0; return s; };
const gained = (a, b, s) => (s === "combat" ? cum(b.level, b.xp) - cum(a.level, a.xp) : cum(b[`${s}_level`], b[`${s}_xp`]) - cum(a[`${s}_level`], a[`${s}_xp`]));
const lvl = (c, s) => (s === "combat" ? c.level + c.xp / Math.max(1, c.max_xp) : c[`${s}_level`] + c[`${s}_xp`] / Math.max(1, c[`${s}_max_xp`]));
const tile = new Map(D("maps").map((m) => [`${m.x},${m.y},${m.layer ?? "overworld"}`, m]));
const placeOf = (c) => { const m = tile.get(`${c.x},${c.y},${c.layer ?? "overworld"}`); const k = m?.interactions?.content; return k ? `${k.code}` : m?.name ?? `${c.x},${c.y}`; };
const isFood = (code) => { const it = items.get(code); return it?.type === "consumable" && (it.effects ?? []).some((e) => e.code === "heal"); };
const dropOf = new Map();
for (const m of monsters.values()) for (const d of m.drops ?? []) if (!dropOf.has(d.code)) dropOf.set(d.code, m.code);
const inv = (c) => (c.inventory ?? []).filter((s) => s.code && s.quantity > 0);
const foods = (c) => inv(c).filter((s) => isFood(s.code));
const pots = (c) => [[c.utility1_slot, c.utility1_slot_quantity], [c.utility2_slot, c.utility2_slot_quantity]].filter(([code, q]) => code && q > 0);
const wears = (c) => { const w = items.get(c.weapon_slot); return `${w ? `${w.code} ${w.level}` : "unarmed"}${c.rune_slot ? `, ${c.rune_slot}` : ""}`; };
const fightsAt = (c) => { const drops = [...new Set(inv(c).map((s) => dropOf.get(s.code)).filter(Boolean))]; return `${placeOf(c)}${c.task ? `; task ${c.task_progress}/${c.task_total} ${c.task}` : ""}${drops.length ? `; drops of ${drops.slice(0, 3).join(", ")}` : ""}`; };
const out = [];
const table = (title, head, rows, note) => {
  out.push(`### ${title}`, "", `| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`));
  if (note) out.push("", note);
  out.push("");
};
const meMark = (a) => (a === ME ? `**${ME}**` : a);

out.push(`## The board, ${span[0]} → ${span.at(-1)}: ${span.length} full reads, ${f1(hours)} h, ${last.acc.size} accounts`, "");

// every character in the first and the last read
const rows = [];
for (const a of last.acc.values()) {
  const a0 = first.acc.get(a.name);
  if (!a0) continue;
  for (const c of a.chars) {
    const c0 = a0.chars.find((x) => x.name === c.name);
    if (!c0) continue;
    const g = Object.fromEntries(["combat", ...GATHER, ...GEAR, "cooking", "alchemy"].map((s) => [s, gained(c0, c, s)]));
    rows.push({ acc: a.name, pos: a.pos, c, c0, g, xph: g.combat / hours });
  }
}
const BANDS = [[20, 29], [30, 34], [35, 39], [40, 99]];
const bandOf = (L) => BANDS.find(([lo, hi]) => L >= lo && L <= hi);
// 1. combat XP an hour by band (the level at the first read)
const band = BANDS.map(([lo, hi]) => ({ lo, hi, r: rows.filter((x) => x.c0.level >= lo && x.c0.level <= hi) }));
table(`1. Combat XP an hour, ${span[0]} → ${span.at(-1)}, by the level at the first read (${rows.length} characters)`, ["band", "characters", "median", "top quarter (Q3)", "best", `${ME}'s`],
  band.map((b) => { const x = b.r.map((r) => r.xph); return [`${b.lo}–${b.hi === 99 ? "" : b.hi}`, b.r.length, f1(med(x)), f1(quart(x)[2]), f1(Math.max(0, ...x)), b.r.filter((r) => r.acc === ME).map((r) => `${r.c.name} ${f1(r.xph)}`).join(", ") || "—"]; }));
{
  const byX = [...rows].sort((x, y) => y.xph - x.xph), rank = (r) => byX.indexOf(r) + 1;
  out.push(`Over all ${rows.length} characters (${rows.filter((r) => r.c0.level < 20).length} below 20 are in no band): the best ${f1(byX[0].xph)} (${byX[0].acc}/${byX[0].c.name}); ${ME}: ${rows.filter((r) => r.acc === ME).map((r) => `${r.c.name} #${rank(r)}`).join(", ")}.`, "");
}
for (const b of band) {
  const best = [...b.r].sort((x, y) => y.xph - x.xph).slice(0, 10);
  const mine = b.r.filter((r) => r.acc === ME && !best.includes(r));
  table(`1. Band ${b.lo}–${b.hi === 99 ? "" : b.hi}: the best ten${mine.length ? ` and ${ME}'s` : ""} — what they wear (weapon, rune), eat (cooked food in the bag), fight (the tile, the task, the drops in the bag)`,
    ["#", "account", "character", "level", "XP/h", "wears", "eats", "potions", "fights"],
    [...best, ...mine].map((r, i) => [best.includes(r) ? i + 1 : "—", meMark(r.acc), r.c.name, `${r.c0.level}→${r.c.level}`, f1(r.xph), wears(r.c), foods(r.c).map((s) => `${s.quantity} ${s.code}`).join(", ") || "—", pots(r.c).map(([c, q]) => `${q} ${c}`).join(", ") || "—", fightsAt(r.c)]));
}

// 2. food and potions — at the last read and in any read
const allReads = span.map(load);
const everFood = new Set(), everPot = new Set();
for (const R of allReads) for (const a of R.acc.values()) for (const c of a.chars) { if (foods(c).length) everFood.add(`${a.name}/${c.name}`); if (pots(c).length) everPot.add(`${a.name}/${c.name}`); }
const q3 = quart(rows.map((r) => r.xph))[2], topQ = rows.filter((r) => r.xph >= q3);
const carry = (rs) => {
  const fd = new Map(), pt = new Map();
  for (const r of rs) { for (const s of foods(r.c)) fd.set(s.code, [(fd.get(s.code)?.[0] ?? 0) + 1, (fd.get(s.code)?.[1] ?? 0) + s.quantity]); for (const [c, q] of pots(r.c)) pt.set(c, [(pt.get(c)?.[0] ?? 0) + 1, (pt.get(c)?.[1] ?? 0) + q]); }
  const fmt = (m) => [...m].sort((x, y) => y[1][0] - x[1][0]).map(([c, [n, q]]) => `${c} ×${n} (${q})`).join(", ") || "—";
  return [rs.filter((r) => foods(r.c).length).length, fmt(fd), rs.filter((r) => pots(r.c).length).length, fmt(pt)];
};
table(`2. Food and potions at the last read (characters carrying, which: ×characters (units)); in any of the ${span.length} reads: ${everFood.size} carried cooked food, ${everPot.size} a potion in a utility slot`,
  ["who", "characters", "carry food", "which", "wear a potion", "which"],
  [["all", rows.length, ...carry(rows)], [`the best quarter by XP/h (≥ ${f1(q3)})`, topQ.length, ...carry(topQ)], [ME, rows.filter((r) => r.acc === ME).length, ...carry(rows.filter((r) => r.acc === ME))]]);

// 3. the gear crafts against the top combat level, an account a row; each craft's XP over the period (the account's sum)
const accRows = [...last.acc.values()].filter((a) => first.acc.has(a.name)).sort((x, y) => x.pos - y.pos);
const holder = (a, s) => [...a.chars].sort((x, y) => y[`${s}_level`] - x[`${s}_level`] || y.level - x.level)[0];
const gearRow = (a) => {
  const a0 = first.acc.get(a.name), topL = Math.max(...a.chars.map((c) => c.level));
  return { a, topL, top0: Math.max(...a0.chars.map((c) => c.level)), crafts: GEAR.map((s) => { const h = holder(a, s), h0 = a0.chars.find((c) => c.name === h.name) ?? h; return { L: h[`${s}_level`], perDay: ((lvl(h, s) - lvl(h0, s)) / hours) * 24, xp: rows.filter((r) => r.acc === a.name).reduce((t, r) => t + r.g[s], 0) }; }) };
};
const G = accRows.map(gearRow);
table(`3. The gear crafts against the top combat level (the best crafter of each; − the levels under the top combat; the account's XP of the craft over ${f1(hours)} h)`,
  ["#", "account", "pts", "top combat", "wc", "gc", "jc", "wc XP", "gc XP", "jc XP"],
  G.map((g) => [g.a.pos, meMark(g.a.name), g.a.pts, g.topL, ...g.crafts.map((c) => `${c.L} (${c.L - g.topL})`), ...g.crafts.map((c) => Math.round(c.xp).toLocaleString("en-US"))]));
const mid = G.filter((g) => g.top0 >= 28 && g.top0 <= 36);
out.push(`**Accounts at top combat 28–36 at the first read (${mid.length}):** the best crafter's levels a day — ${GEAR.map((s, i) => `${s} median ${f1(med(mid.map((g) => g.crafts[i].perDay)))} (top quarter ${f1(quart(mid.map((g) => g.crafts[i].perDay))[2])})`).join("; ")}; ${ME}: ${G.filter((g) => g.a.name === ME).map((g) => g.crafts.map((c, i) => `${GEAR[i]} ${f1(c.perDay)}`).join(", ")).join("") || "—"}.`, "");

// 4. where the XP goes, an account a row
const kinds = [["combat", ["combat"]], ["gathering", GATHER], ["gear crafts", GEAR], ["cooking", ["cooking"]], ["alchemy", ["alchemy"]]];
table(`4. Where the XP goes over ${f1(hours)} h, an account a row (the XP summed over its characters; the share of the account's)`,
  ["#", "account", "pts", ...kinds.map(([k]) => k)],
  accRows.map((a) => { const rs = rows.filter((r) => r.acc === a.name); const by = kinds.map(([, ss]) => rs.reduce((t, r) => t + ss.reduce((u, s) => u + Math.max(0, r.g[s]), 0), 0)); const tot = by.reduce((t, x) => t + x, 0) || 1; return [a.pos, meMark(a.name), a.pts, ...by.map((x) => `${Math.round(x).toLocaleString("en-US")} (${Math.round((100 * x) / tot)}%)`)]; }));
console.log(out.join("\n"));
