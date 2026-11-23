// Task 024, section 3: the leaders' characters through this fleet's model — no request, nothing written under src/.
//   node --import tsx docs/strategy/024/tools/model.mts
// Reads base/characters.jsonl, public/data (the catalog and the atlas) and this fleet's newest World snapshot
// (logs/world/<newest>.json, read-only); imports src/ as the service does (a localStorage that keeps nothing stands in,
// as in docs/strategy/022/tools/runecheck.mts). Prints the tables and writes them to docs/strategy/024/tables/3*.md.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
(globalThis as any).localStorage ??= { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 };
const { setDataReader } = await import("../../../../src/catalog/load.ts");
const cat = await import("../../../../src/catalog/index.ts");
const { atlas } = await import("../../../../src/catalog/atlas.ts");
const { currentFighter, applyGear, baseStats } = await import("../../../../src/sim/stats.ts");
const { STAT_CODES, isCombatEffect } = await import("../../../../src/sim/types.ts");
const { simulate } = await import("../../../../src/sim/combat.ts");
const reach = await import("../../../../src/plan/planner/reach.ts");
const { pickMonster } = await import("../../../../src/plan/planner/pick.ts");
const { actionSec } = await import("../../../../src/plan/planner/cost.ts");

const HOME = join(import.meta.dirname, "..");
const ROOT = join(HOME, "../../..");
setDataReader(async (n: string) => JSON.parse(readFileSync(join(ROOT, "public/data", `${n}.json`), "utf8")));
await cat.loadCatalog();
const item = cat.item, monster = cat.monster;
const XP = atlas()!.xpNeeded;

const ME = "alverus";
const SKILLS = ["mining", "woodcutting", "fishing", "weaponcrafting", "gearcrafting", "jewelrycrafting", "cooking", "alchemy"];
const CH: any[] = readFileSync(join(HOME, "base/characters.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const SNAPS = [...new Set(CH.map((c) => c.snap))].sort();
const NOW = SNAPS.at(-1)!;
const WFILE = readdirSync(join(ROOT, "logs/world")).filter((f) => f.endsWith(".json")).sort().at(-1)!;
const W0 = JSON.parse(readFileSync(join(ROOT, "logs/world", WFILE), "utf8")).world;

const f1 = (x: number | undefined | null) => (x == null || !Number.isFinite(x) ? "—" : Number.isInteger(x) ? String(x) : x.toFixed(1));
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return !s.length ? NaN : s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const fightSet = (c: any) => !!c.slots.weapon && item(c.slots.weapon)?.subtype !== "tool";
const active = (c: any) => c.cd_left != null && c.cd_left > -60; // stats.mjs ACTIVE_S
const content = (c: any) => c.tile ?? (c.event.length ? { ...c.event[0], ev: true } : null);
const bandOf = (L: number) => (L < 20 ? "<20" : L >= 45 ? "45+" : `${Math.floor(L / 5) * 5}–${Math.floor(L / 5) * 5 + 4}`);
const acct = (a: string) => (a === ME ? `**◀ ${ME}**` : a);

/** The base's line back into the API's Character shape (what src/ reads). */
function apiChar(c: any): any {
  const o: any = { name: c.name, account: c.account, level: c.level, xp: c.xp, max_xp: c.max_xp, gold: c.gold, x: c.pos.x, y: c.pos.y, layer: c.pos.layer, map_id: c.pos.map_id,
    ...c.stats, effects: c.effects, inventory: c.inventory.map((s: any, i: number) => ({ slot: i + 1, code: s.code, quantity: s.qty })), inventory_max_items: c.inventory_max_items,
    task: c.task?.code ?? "", task_type: c.task?.type ?? "", task_progress: c.task?.progress ?? 0, task_total: c.task?.total ?? 0, cooldown: 0, cooldown_expiration: c.cooldown_expiration };
  for (const s of SKILLS) { o[`${s}_level`] = c.skills[s].level; o[`${s}_xp`] = c.skills[s].xp; o[`${s}_max_xp`] = c.skills[s].max_xp; }
  for (const [k, v] of Object.entries(c.slots)) if (!k.startsWith("utility")) o[`${k}_slot`] = v ?? "";
  for (const u of ["utility1", "utility2"]) { o[`${u}_slot`] = c.slots[u]?.code ?? ""; o[`${u}_slot_quantity`] = c.slots[u]?.qty ?? 0; }
  return o;
}
/** A World of this fleet's snapshot with one character in it: no bank, its bag as `bags`, nothing running — the pool the
 *  planner may plan its fights with is exactly what it wears and carries (reach.ts poolOf). */
function worldFor(ch: any): any {
  const bags: Record<string, number> = {};
  for (const s of ch.inventory) bags[s.code] = (bags[s.code] ?? 0) + s.quantity;
  return { ...W0, characters: [ch], bank: [], bankGold: 0, current: {}, costs: {}, blocked: {}, events: [], favors: {}, bags, bankSlots: undefined, nextExpansion: undefined, config: { ...W0.config, on: { [ch.name]: true }, roles: {} } };
}
const codesOf = (ch: any) => ["weapon", "rune", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring1", "ring2", "amulet", "artifact1", "artifact2", "artifact3", "utility1", "utility2", "bag"].map((g) => ch[`${g}_slot`]).filter(Boolean);

const files = new Map<string, string>(), out: string[] = [];
function table(id: string, title: string, head: string[], body: (string | number)[][], note?: string) {
  const md = [`#### ${title}`, "", `| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...body.map((r) => `| ${r.join(" | ")} |`), ...(note ? ["", note] : []), ""].join("\n");
  files.set(id, (files.get(id) ?? "") + md + "\n");
  out.push(md);
}
out.push(`# Task 024 — the leaders through this fleet's model (base/ ${SNAPS.join(", ")}; this fleet's World logs/world/${WFILE}, ${W0.now ? new Date(W0.now).toISOString() : "?"})\n`);

// ===== 3a. the stats =====
{
  const STATS = ["max_hp", "attack_fire", "attack_earth", "attack_water", "attack_air", "dmg", "dmg_fire", "dmg_earth", "dmg_water", "dmg_air", "res_fire", "res_earth", "res_water", "res_air", "critical_strike", "haste", "initiative", "wisdom", "prospecting"];
  const key = (s: string) => (s === "max_hp" ? "hp" : s);
  const fs = CH.filter((c) => c.snap === NOW && fightSet(c));
  const per = new Map<string, { n: number; diffs: number[]; who: string[] }>();
  const detail: (string | number)[][] = [];
  const effDiff: string[] = [];
  for (const c of fs) {
    const ch = apiChar(c);
    // the model's arithmetic from nothing: the atlas's hypothetical character (scripts/atlas/combat.mts:10-19: 115 + 5·L HP,
    // every other stat 0) with the worn codes' effects summed (sim/stats.ts applyGear, as the solve folds a set)
    const hypo: any = { ...ch, max_hp: 115 + 5 * ch.level };
    for (const k of STATS) if (k !== "max_hp") hypo[k] = 0;
    for (const g of ["weapon", "rune", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring1", "ring2", "amulet", "artifact1", "artifact2", "artifact3", "utility1", "utility2", "bag"]) hypo[`${g}_slot`] = "";
    const model = applyGear(baseStats(hypo), codesOf(ch)).stats as any;
    const cur = currentFighter(ch).stats as any; // exec.ts:440 — the live gate's fighter
    const diffs: string[] = [];
    for (const s of STATS) {
      const api = ch[s], m = model[key(s)], g = cur[key(s)];
      if (api !== m || api !== g) {
        const e = per.get(s) ?? per.set(s, { n: 0, diffs: [], who: [] }).get(s)!;
        e.n++; e.diffs.push(api - m); if (e.who.length < 3) e.who.push(`${c.name} ${api} vs ${m}${g !== m ? ` (gate ${g})` : ""}`);
        diffs.push(`${s} ${api} / ${m}${g !== m ? ` / gate ${g}` : ""}`);
      }
    }
    // the combat effects: the API's `effects` against what the model folds (runes, utilities, gear with a combat effect)
    const mine = new Map<string, number>();
    for (const code of codesOf(ch)) if (item(code)?.type !== "utility") for (const e of item(code)?.effects ?? []) if (isCombatEffect(e.code)) mine.set(e.code, (mine.get(e.code) ?? 0) + e.value);
    const theirs = new Map<string, number>((c.effects ?? []).filter((e: any) => isCombatEffect(e.code)).map((e: any) => [e.code, e.value]));
    const ed = [...new Set([...mine.keys(), ...theirs.keys()])].filter((k) => mine.get(k) !== theirs.get(k)).map((k) => `${k} ${theirs.get(k) ?? "—"} / ${mine.get(k) ?? "—"}`);
    if (ed.length) effDiff.push(`${c.account}/${c.name}: ${ed.join(", ")}`);
    detail.push([acct(c.account), c.name, c.level, diffs.join("; ") || "all equal", ed.join(", ") || "equal"]);
  }
  table("3a-stats", `(3a) The API's stats against this fleet's arithmetic, ${fs.length} characters in a fight set (${NOW}): every stat that does not agree`,
    ["stat", "characters that differ", "API − model: min / median / max", "examples (API vs model)"],
    STATS.filter((s) => per.has(s)).map((s) => { const e = per.get(s)!; return [s, `${e.n} of ${fs.length}`, `${Math.min(...e.diffs)} / ${med(e.diffs)} / ${Math.max(...e.diffs)}`, e.who.join("; ")]; }),
    `The model: 115 + 5·L HP and 0 for every other stat (the atlas's hypothetical character, scripts/atlas/combat.mts:10-19), plus every worn code's effects (src/sim/stats.ts:85-90 applyGear). "gate" = src/sim/stats.ts:102-112 currentFighter (exec.ts:440, :573), which copies the API's totals but initiative: currentStats leaves it 0 (src/sim/stats.ts:49-65), the worn items' initiative is added (:109); the solve's base drops it too (:74-76). Every stat not listed agrees on every character. Combat effects (the API's \`effects\` against the worn codes' but the utility potions', both without the gathering and crafting cuts): ${effDiff.length ? effDiff.length + " characters differ — " + effDiff.slice(0, 5).join("; ") : "equal on every character"}.`);
  table("3a-stats-detail", "(3a) Per character: API / model (/ the gate's fighter where it differs)", ["account", "character", "combat", "stats that differ", "effects that differ (API / model)"], detail);
}

// ===== 3b. the fights on the tile =====
/** The win rate over 2,000 fights with crits rolled (src/sim/monte.ts's method, combat.ts rng) — a seeded generator
 *  (mulberry32) instead of Math.random, so the tables come back the same. */
function winRate(f: any, m: any, n = 2000): number {
  let a = 0x2024, wins = 0;
  const rng = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = 0; i < n; i++) if (simulate(f, m, { rng }).win) wins++;
  return wins / n;
}
type Verdict = { win: boolean; safe: boolean; turns: number; hp: number; maxHp: number; used: string; first: boolean };
const run = (f: any, m: any): Verdict => {
  const e = simulate(f, m), p = e.win && !e.timedOut ? simulate(f, m, { pessimistic: true }) : e;
  return { win: e.win && !e.timedOut, safe: e.win && !e.timedOut && p.win, turns: e.turns, hp: Math.round(e.hpRemaining), maxHp: e.maxHp, used: Object.entries(e.used).map(([k, v]) => `${k.replace("_potion", "")} ${v}`).join(", "), first: e.playerFirst };
};
const vtxt = (v: Verdict) => `${v.safe ? "safe" : v.win ? "win, not safe" : "**loss**"} · ${v.turns} t · ${v.hp}/${v.maxHp}${v.used ? ` · ${v.used}` : ""}${v.first ? "" : " · 2nd"}`;
const refused: any[] = [], solo: any[] = [];
const pc = (x: number) => (Number.isFinite(x) ? `${(100 * x).toFixed(x >= 0.9995 ? 0 : 1)}%` : "—");
{
  const rows: (string | number)[][] = [];
  for (const snap of [...SNAPS].reverse()) for (const c of CH.filter((x) => x.snap === snap && x.account !== ME && active(x) && content(x)?.type === "monster")) {
    const ch = apiChar(c), t = content(c), m = monster(t.code)!;
    const cf = currentFighter(ch);
    const gate = run(cf, m);
    const withInit = run({ stats: { ...cf.stats, initiative: ch.initiative }, effects: cf.effects }, m);
    const boss = m.type === "boss";
    const w = worldFor(ch);
    const rule = boss ? undefined : reach.safeWin(ch, w, m.code);
    const rec = boss ? undefined : reach.fightRec(ch, w, m.code);
    const wr = boss ? NaN : winRate(cf, m), wrI = boss ? NaN : winRate({ stats: { ...cf.stats, initiative: ch.initiative }, effects: cf.effects }, m);
    if (!boss) solo.push({ c, m, rule, wr, wrI, xp: c.level - m.level <= 10 });
    if (!boss && !rule) refused.push({ c, m, gate, withInit, rec, wr, wrI });
    rows.push([snap === NOW ? "now" : "11-22", acct(c.account), c.name, c.level, `${m.code}${boss ? " (boss: a group)" : ""}`, m.level, c.level - m.level, vtxt(gate), boss ? "—" : pc(wr), vtxt(withInit), boss ? "—" : pc(wrI), boss ? "—" : rule ? "safe" : `**refused** (${rec?.forecast.win ? "win, not safe" : "loss"})`]);
  }
  table("3b-fights", "(3b) Every active leader on a monster's tile: this fleet's simulator on the character as it is, and this fleet's rule",
    ["read", "account", "character", "combat", "monster", "level", "gap", "the gate's fighter (worn set; initiative 0 + items)", "wins of 2,000 (crits rolled)", "the same with the API's initiative", "wins of 2,000", "reach.ts safeWin on its own pool"], rows,
    `Of ${solo.length} solo fights (bosses left out) the rule refuses ${solo.filter((x) => !x.rule).length}; of the ${solo.filter((x) => x.xp).length} that give XP (gap ≤ 10) it refuses ${solo.filter((x) => x.xp && !x.rule).length}. The refused fights' win rate with crits rolled: min ${pc(Math.min(...refused.map((r) => r.wr)))}, median ${pc(med(refused.map((r) => r.wr)))}; with the API's initiative min ${pc(Math.min(...refused.map((r) => r.wrI)))}, median ${pc(med(refused.map((r) => r.wrI)))}. ` + "Each cell: safe / win, not safe / loss (src/sim/combat.ts simulate, the expected fight; safe = the pessimistic pass — the player never crits, the monster always does — wins too, src/plan/bis.ts:330); turns; HP left of max; the potions the fight drinks; \"2nd\" = the monster strikes first (combat.ts:394, initiative). The rule: reach.ts:475 safeWin on a World holding only this character, its bag and no bank (its pool = what it wears and carries). A boss is a group fight (1v1 not simulated).");
  refused.sort((a, b) => Number(a.gate.win) - Number(b.gate.win) || a.gate.hp / a.gate.maxHp - b.gate.hp / b.gate.maxHp);
  table("3b-fights", `(3b) The fights this fleet's rule refuses: ${refused.length}`, ["account", "character", "combat", "monster (level)", "the worn set", "wins of 2,000 (model / API initiative)", "the task", "the rule's best set of its pool", "HP at the read"],
    refused.map((r) => [r.c.account, r.c.name, r.c.level, `${r.m.code} (${r.m.level})`, vtxt(r.gate), `${pc(r.wr)} / ${pc(r.wrI)}`, r.c.task ? `${r.c.task.code} ${r.c.task.progress}/${r.c.task.total}` : "—", r.rec ? `${vtxt({ win: r.rec.forecast.win && !r.rec.forecast.timedOut, safe: r.rec.safe, turns: r.rec.forecast.turns, hp: Math.round(r.rec.forecast.hpRemaining), maxHp: r.rec.forecast.maxHp, used: "", first: r.rec.forecast.playerFirst })}` : "—", `${r.c.stats.hp}/${r.c.stats.max_hp}`]));
}

// ===== 3c. the leaders' fighters under this fleet's planner =====
/** stats.mjs (f1)'s measure for one character: combat XP between the reads less one combat offering (a quarter of the
 *  first read's level), as hours a level; "—" when it is not in both reads. */
function paceOf(c: any): string {
  const [a, b] = SNAPS.map((s) => CH.find((x) => x.snap === s && x.account === c.account && x.name === c.name));
  if (!a || !b || a === b) return "—";
  let xp = b.level === a.level ? b.xp - a.xp : XP[a.level] - a.xp + b.xp;
  let lv = b.level === a.level ? (b.xp - a.xp) / XP[a.level] : (XP[a.level] - a.xp) / XP[a.level] + b.xp / XP[b.level];
  for (let l = a.level + 1; l < b.level; l++) { xp += XP[l]; lv += 1; }
  const off = xp >= 0.25 * XP[a.level] - 1 ? 0.25 * XP[a.level] : 0;
  const lvF = xp > 0 ? (lv * (xp - off)) / xp : 0, h = (Date.parse(b.read) - Date.parse(a.read)) / 3600e3;
  return lvF > 0.005 ? `${a.level} → ${b.level}: ${f1(h / lvF)} h a level` : `${a.level} → ${b.level}: no fight XP`;
}
{
  const rows: (string | number)[][] = [];
  const fs = CH.filter((c) => c.account !== ME && c.level >= 25 && c.level <= 39 && fightSet(c));
  for (const c of fs) {
    const ch = apiChar(c), w = worldFor(ch);
    const p = pickMonster(ch, w, new Set());
    const t = content(c);
    let pick = "no safe XP monster";
    if (p) {
      const rec = reach.fightRec(ch, w, p.monster);
      const used = Object.values(rec?.forecast.used ?? {}).reduce((s: number, x: any) => s + x, 0);
      pick = `${p.monster} (${monster(p.monster)!.level}) · ${f1(p.sec)} s · ${used} potions · ${f1(XP[c.level] / ((p.xp / p.sec) * 3600))} h`;
    }
    let here = "—";
    if (t?.type === "monster" && monster(t.code)!.type !== "boss") {
      const xp = (await import("../../../../src/plan/xp.ts")).fightXp(t.level, monster(t.code)!.hp, monster(t.code)!.type, c.level, reach.setWisdom(ch, reach.fightRec(ch, w, t.code)));
      const safe = reach.safeWin(ch, w, t.code);
      const sec = safe ? actionSec({ kind: "kill", monster: t.code }, ch, w) : NaN;
      here = `${t.code} (${t.level}) · ${safe ? `${f1(sec)} s · ${xp > 0 ? f1(XP[c.level] / ((xp / sec) * 3600)) + " h" : "no XP"}` : "refused"}`;
    } else if (t) here = `${t.type} ${t.code}`;
    rows.push([c.snap === NOW ? "now" : "11-22", acct(c.account), c.name, c.level, c.slots.weapon, pick, here, paceOf(c)]);
  }
  table("3c-pick", "(3c) Every leader's fighter at combat 25–39 (both reads), its own worn set and bag as the pool: this fleet's XP pick and the hours it gives a level",
    ["read", "account", "character", "combat", "weapon", "pick.ts pickMonster: monster · seconds a kill · potions a kill · hours a level", "where it stands, priced the same way", "measured between the reads (table f1)"], rows,
    "pickMonster (src/plan/planner/pick.ts:34-48): every monster ≤ L+10 that gives XP, reachable, reach.ts safeWin; XP by xp.ts fightXp with the set's wisdom; seconds by cost.ts actionSec (the fight, its rest or food, the potions at the chain's price, × KILL_LOG, the walks to the bank). Hours a level = xpNeeded[L] ÷ XP an hour. The pace measured for the same characters is table (f1).");
}

// ===== 3d. this fleet's fighters the other way =====
{
  const mons = new Map<string, string[]>();
  for (const c of CH.filter((x) => x.account !== ME && x.level >= 20 && x.level <= 34 && active(x) && content(x)?.type === "monster")) {
    const t = content(c);
    (mons.get(t.code) ?? mons.set(t.code, []).get(t.code)!).push(`${c.account}/${c.name} ${c.level}`);
  }
  const ours = CH.filter((c) => c.snap === NOW && c.account === ME).map(apiChar);
  const noUtil = (c: any) => ({ ...c, utility1_slot: "", utility1_slot_quantity: 0, utility2_slot: "", utility2_slot_quantity: 0 });
  const bare = { ...W0, bank: W0.bank.filter((b: any) => item(b.code)?.type !== "utility"), characters: W0.characters.map(noUtil), bags: Object.fromEntries(Object.entries(W0.bags ?? {}).filter(([k]) => item(k)?.type !== "utility")) };
  const bareRune = { ...bare, bank: [...bare.bank.filter((b: any) => b.code !== "healing_rune"), { code: "healing_rune", quantity: 5 }] };
  const rows: (string | number)[][] = [];
  for (const [code, who] of mons) {
    const m = monster(code)!;
    for (const ch of ours) {
      const worn = run(currentFighter(ch), m);
      const wornRune = run(applyGear(baseStats(ch), [...codesOf(ch).filter((x: string) => item(x)?.type !== "rune"), "healing_rune"]), m);
      const wch = W0.characters.find((x: any) => x.name === ch.name);
      const best = reach.fightRec(wch, W0, code), bch = bare.characters.find((x: any) => x.name === ch.name);
      const bestB = reach.fightRec(bch, bare, code), bestBR = reach.fightRec(bch, bareRune, code);
      const rv = (r: any) => (r ? `${r.safe ? "safe" : r.forecast.win && !r.forecast.timedOut ? "win, not safe" : "**loss**"} · ${r.forecast.turns} t · ${Math.round(r.forecast.hpRemaining)}/${r.forecast.maxHp}${Object.keys(r.forecast.used).length ? " · " + Object.entries(r.forecast.used).map(([k, v]) => `${k.replace("_potion", "")} ${v}`).join(", ") : ""}` : "—");
      rows.push([`${code} (${m.level})`, who.join(", "), `${ch.name} ${ch.level} (${wch.level} in the World)`, vtxt(worn), vtxt(wornRune), rv(best), rv(bestB), rv(bestBR)]);
    }
  }
  table("3d-ours", `(3d) First to Fifth against the monsters the leaders' fighters of combat 20–34 stood on (both reads)`,
    ["monster", "stood on by", "ours", "worn at the read", "worn + healing rune", `the planner's best set of the bank (reach.ts fightRec, logs/world/${WFILE})`, "the same, no potion anywhere", "no potion, 5 healing runes in the bank"], rows,
    "Worn at the read: the alverus characters of the newest read (a tool in the weapon slot is a gathering set). The planner's set: reach.ts:450 fightRec on the World of this fleet's newest snapshot (the bank, the others' reservations, the potions of the pool in); \"no potion\": the same World with every utility item taken out of the bank, the bags and the worn slots; the rune column adds five healing runes to that bank (as docs/strategy/022/tools/runecheck.mts did).");

  // ===== 3e. what the safe rule and the potions cost this fleet's own road (the verdict's numbers) =====
  const variants: [string, any][] = [["as it is", W0], ["risk win", { ...W0, config: { ...W0.config, risk: "win" } }], ["no potion", bare], ["no potion, risk win", { ...bare, config: { ...bare.config, risk: "win" } }],
    ["no potion + rune", bareRune], ["no potion + rune, risk win", { ...bareRune, config: { ...bareRune.config, risk: "win" } }]];
  const rows2: (string | number)[][] = [];
  for (const name of ["Second", "Third"]) for (const L of [0, 28, 30, 33, 35]) {
    const cells: string[] = [];
    let lv = 0;
    for (const [, w] of variants) {
      const c0 = w.characters.find((x: any) => x.name === name);
      lv = L || c0.level;
      const ch = reach.chAt(c0, lv);
      const p = pickMonster(ch, w, new Set());
      if (!p) { cells.push("no XP monster"); continue; }
      const used = Object.values(reach.fightRec(ch, w, p.monster)?.forecast.used ?? {}).reduce((s: number, x: any) => s + x, 0);
      cells.push(`${p.monster} · ${f1(p.sec)} s · ${used} p · **${f1(XP[lv] / ((p.xp / p.sec) * 3600))} h**`);
    }
    rows2.push([name, lv, ...cells]);
  }
  table("3e-rule", `(3e) This fleet's XP pick for Second and Third on its own pool (logs/world/${WFILE}), at its level and above: the safe rule against "a win is enough", potions against none, a healing rune`,
    ["character", "combat", ...variants.map(([k]) => k)], rows2,
    "Each cell: pick.ts pickMonster's monster · seconds a kill (cost.ts actionSec) · potions a kill (the fight set's forecast) · hours a level. \"risk win\" = config.risk \"win\" (reach.ts:468-469: any expected win that does not time out, the replay's row D). A level above the character's own is reach.ts chAt (+5 HP a level); there the first look (planRec) is solved on the gear alone (reach.ts:484-492) and the set and its potions are fightRec's, the pool's potions in (reach.ts:450-458).");
}

const TD = join(HOME, "tables");
mkdirSync(TD, { recursive: true });
for (const f of readdirSync(TD)) if (f.startsWith("3")) rmSync(join(TD, f));
for (const [id, md] of files) writeFileSync(join(TD, `${id}.md`), md);
console.log(out.join("\n"));
process.exit(0);
