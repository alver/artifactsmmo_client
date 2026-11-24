// Task 027b, part C: the board watch's reads (logs/board/<day>/<HHMM>Z, scripts/board/watch.mjs), read offline. No request.
//   node docs/strategy/board/tools/read.mjs                       the newest read: shapes, crafts, weapons, neighbours
//   node docs/strategy/board/tools/read.mjs --from <dir> --to <dir>   …and what each character gained between two reads
// <dir> is a read's folder (logs/board/2026-11-24/0921Z) or its day/HHMM (2026-11-24/0921Z). Prints markdown.
// A fighter: a character within FIGHTER_GAP combat levels of its account's best; the rest are workers.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { ROOT, J, SKILLS, items, med, f1 } from "../../024/tools/lib.mjs";

const ME = "alverus", FIGHTER_GAP = 5, NEAR = 10, GEAR = ["weaponcrafting", "gearcrafting", "jewelrycrafting"];
const AB = { mining: "mi", woodcutting: "wo", fishing: "fi", weaponcrafting: "wc", gearcrafting: "gc", jewelrycrafting: "jc", cooking: "co", alchemy: "al" };
const BOARD = join(ROOT, "logs/board");
const XP = J(join(ROOT, "public/data/atlas.json")).xpNeeded; // XP from L to L + 1, combat and skills alike
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const dirOf = (d) => (existsSync(d) ? d : join(BOARD, d));
const reads = () => readdirSync(BOARD).filter((d) => /^\d{4}-\d\d-\d\d$/.test(d)).sort().flatMap((d) => readdirSync(join(BOARD, d)).filter((h) => /^\d{4}Z$/.test(h)).sort().map((h) => join(BOARD, d, h)));
const gz = (f) => JSON.parse(gunzipSync(readFileSync(f)));

/** One read: the ladder (account → position, points) and per account its characters and achievements. */
function load(dir) {
  const files = readdirSync(dir);
  const ladder = new Map();
  for (const f of files.filter((x) => x.startsWith("leaderboard-"))) for (const r of gz(join(dir, f)).data) ladder.set(r.account, r);
  const acc = new Map();
  for (const f of files.filter((x) => x.endsWith("-characters.json.gz"))) {
    const name = f.slice(4, -"-characters.json.gz".length);
    acc.set(name, { name, pos: ladder.get(name)?.position ?? 999, pts: ladder.get(name)?.achievements_points ?? 0, chars: gz(join(dir, f)).data });
  }
  return { dir, ladder, acc: [...acc.values()].sort((a, b) => a.pos - b.pos) };
}
const top = (a) => Math.max(...a.chars.map((c) => c.level));
const isFighter = (a, c) => c.level >= top(a) - FIGHTER_GAP;
const fighters = (a) => a.chars.filter((c) => isFighter(a, c)).length;
/** The holder of a skill: the account's character with the highest level of it (ties: the higher combat). */
const holder = (a, s) => [...a.chars].sort((x, y) => y[`${s}_level`] - x[`${s}_level`] || y.level - x.level)[0];
const weaponOf = (c) => { const it = items.get(c.weapon_slot); return it ? { code: it.code, level: it.level, tool: it.subtype === "tool" } : undefined; };
const cum = (L, xp) => { let s = xp; for (let l = 1; l < L; l++) s += XP[l] ?? 0; return s; };
const acct = (n) => (n === ME ? `**${ME}**` : n);
const shape = (a) => `${fighters(a)}F`;
const out = [];
const table = (title, head, rows, note) => {
  out.push(`### ${title}`, "", `| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`));
  if (note) out.push("", note);
  out.push("");
};

const toDir = arg("to") ? dirOf(arg("to")) : reads().at(-1);
const R = load(toDir);
const me = R.acc.find((a) => a.name === ME);
out.push(`## The board read ${toDir.split(/[\\/]/).slice(-2).join("/")} — ${R.acc.length} accounts, ${ME} ${me ? `at ${me.pos} with ${me.pts} points` : "not in the read"}`, "");

// 1. the fleets' shapes, and 2. who holds the gear crafts — one row an account
const craftCell = (a, s) => { const h = holder(a, s); return `${h[`${s}_level`]}${isFighter(a, h) ? "F" : "w"}`; };
table("1–2. The fleets: combat levels (best first), fighters (within 5 of the best), the best weaponcrafter / gearcrafter / jewelrycrafter (F a fighter, w a worker)",
  ["#", "account", "pts", "combat", "F", "wc", "gc", "jc"],
  R.acc.map((a) => [a.pos, acct(a.name), a.pts, a.chars.map((c) => c.level).sort((x, y) => y - x).join(" "), fighters(a), ...GEAR.map((s) => craftCell(a, s))]));
const byF = [1, 2, 3, 4, 5].map((k) => R.acc.filter((a) => fighters(a) === k));
table(`1. Shapes over the ${R.acc.length}`, ["fighters", "accounts", "median points", "e.g."],
  byF.map((g, i) => [i === 4 ? "5 (even)" : i + 1, g.length, f1(med(g.map((a) => a.pts))), g.slice(0, 4).map((a) => a.name).join(", ")]));
table("2. The gear crafts: is the best crafter a fighter; its level against the account's top combat", ["craft", "held by a fighter", "by a worker", "median craft level", "median craft − top combat", ME],
  GEAR.map((s) => { const h = R.acc.map((a) => [a, holder(a, s)]); return [s, h.filter(([a, c]) => isFighter(a, c)).length, h.filter(([a, c]) => !isFighter(a, c)).length, f1(med(h.map(([, c]) => c[`${s}_level`]))), f1(med(h.map(([a, c]) => c[`${s}_level`] - top(a)))), me ? craftCell(me, s) : "—"]; }));

// 3. the weapon a fighter wears, by band
const BANDS = [["20–29", 20, 29], ["30–39", 30, 39], ["40+", 40, 50]];
table("3. The weapon a fighter wears: its level against the character's combat level", ["band", "fighters", "a tool in hand", "median weapon level", "median combat − weapon", "weapon within 5 of combat", `${ME}'s fighters`],
  BANDS.map(([b, lo, hi]) => {
    const fs = R.acc.flatMap((a) => a.chars.filter((c) => isFighter(a, c) && c.level >= lo && c.level <= hi).map((c) => ({ a, c, w: weaponOf(c) })));
    const armed = fs.filter((x) => x.w && !x.w.tool);
    const mine = fs.filter((x) => x.a.name === ME).map((x) => `${x.c.name} ${x.c.level}: ${x.w ? `${x.w.code} ${x.w.level}` : "none"}`).join("; ") || "—";
    return [b, fs.length, fs.filter((x) => x.w?.tool).length, f1(med(armed.map((x) => x.w.level))), f1(med(armed.map((x) => x.c.level - x.w.level))), `${armed.filter((x) => x.c.level - x.w.level <= 5).length} of ${armed.length}`, mine];
  }));

// 4. the neighbours, one row a character; and the three accounts nearest this fleet's roles
const charRow = (a, c) => { const w = weaponOf(c); return [acct(a.name), a.pos, c.name, c.level, isFighter(a, c) ? "F" : "w", ...SKILLS.map((s) => c[`${s}_level`]), w ? `${w.code} ${w.level}` : "—"]; };
const HEAD = ["account", "#", "character", "combat", "", ...SKILLS.map((s) => AB[s]), "weapon"];
const near = me ? R.acc.filter((a) => Math.abs(a.pos - me.pos) <= NEAR) : [];
table(`4a. The neighbours: within ${NEAR} positions of ${ME}`, HEAD, near.flatMap((a) => [...a.chars].sort((x, y) => y.level - x.level).map((c) => charRow(a, c))));
// this fleet's roles: two or three fighters, the three gear crafts held by the others; nearest by position
const roleLike = R.acc.filter((a) => a.name !== ME && [2, 3].includes(fighters(a)) && GEAR.every((s) => !isFighter(a, holder(a, s))))
  .sort((a, b) => Math.abs(a.pos - (me?.pos ?? 0)) - Math.abs(b.pos - (me?.pos ?? 0))).slice(0, 3);
table(`4b. The accounts nearest in shape to the roles of 027 (2–3 fighters, the gear crafts on the others; at most three, nearest by position): ${roleLike.length}`, HEAD,
  roleLike.flatMap((a) => [...a.chars].sort((x, y) => y.level - x.level).map((c) => charRow(a, c))));

// two reads: what each character gained, and what it was doing
if (arg("from")) {
  const F = load(dirOf(arg("from")));
  const hours = (Date.parse(readdirTime(R.dir)) - Date.parse(readdirTime(F.dir))) / 3.6e6;
  const gain = [];
  for (const a of R.acc) {
    const b = F.acc.find((x) => x.name === a.name);
    if (!b) continue;
    let levels = 0;
    const rows = a.chars.map((c) => {
      const p = b.chars.find((x) => x.name === c.name);
      if (!p) return undefined;
      const d = { combat: cum(c.level, c.xp) - cum(p.level, p.xp) };
      for (const s of SKILLS) d[s] = cum(c[`${s}_level`], c[`${s}_xp`]) - cum(p[`${s}_level`], p[`${s}_xp`]);
      levels += c.level - p.level;
      const [what, x] = Object.entries(d).sort((u, v) => v[1] - u[1])[0];
      return { c, d, doing: x > 0 ? (what === "combat" ? "fighting" : GEAR.includes(what) || what === "cooking" || what === "alchemy" ? `${what}` : `gathering ${what}`) : "idle" };
    }).filter(Boolean);
    gain.push({ a, pts: a.pts - b.pts, levels, xp: rows.reduce((s, r) => s + Math.max(0, r.d.combat), 0), rows });
  }
  out.push(`## Between ${F.dir.split(/[\\/]/).slice(-2).join("/")} and ${R.dir.split(/[\\/]/).slice(-2).join("/")} (${f1(hours)} h)`, "");
  const doing = (g) => g.rows.map((r) => `${r.c.level}${isFighter(g.a, r.c) ? "F" : "w"} ${r.doing}`).join("; ");
  table("5a. The ten that gained most combat levels (then combat XP)", ["account", "#", "pts +", "levels +", "combat XP +", "shape", "each character: combat, what it did"],
    [...gain].sort((x, y) => y.levels - x.levels || y.xp - x.xp).slice(0, 10).map((g) => [acct(g.a.name), g.a.pos, g.pts, g.levels, g.xp, shape(g.a), doing(g)]));
  table("5b. The ten that gained most points", ["account", "#", "pts +", "levels +", "combat XP +", "shape", "each character: combat, what it did"],
    [...gain].sort((x, y) => y.pts - x.pts || y.levels - x.levels).slice(0, 10).map((g) => [acct(g.a.name), g.a.pos, g.pts, g.levels, g.xp, shape(g.a), doing(g)]));
  const all = gain.flatMap((g) => g.rows.map((r) => ({ f: isFighter(g.a, r.c), doing: r.doing.split(" ")[0] })));
  table(`5c. What the ${all.length} characters did, fighters and workers`, ["", "fighting", "gathering", "crafting", "idle"],
    [true, false].map((f) => { const xs = all.filter((x) => x.f === f); return [f ? "fighters" : "workers", ...["fighting", "gathering"].map((k) => xs.filter((x) => x.doing === k).length), xs.filter((x) => !["fighting", "gathering", "idle"].includes(x.doing)).length, xs.filter((x) => x.doing === "idle").length]; }));
}
/** A read's start time, from logs/board/reads.jsonl (the folder's own name holds only the minute). */
function readdirTime(dir) {
  const rel = dir.split(/[\\/]/).slice(-2).join("/");
  const line = readFileSync(join(BOARD, "reads.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)).find((r) => r.dir === rel);
  return line?.start ?? `${rel.slice(0, 10)}T${rel.slice(11, 13)}:${rel.slice(13, 15)}:00Z`;
}
console.log(out.join("\n"));
