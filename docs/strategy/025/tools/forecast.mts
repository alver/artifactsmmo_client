// Task 025, settled point 3: the forecast against play. Every solo fight of this fleet the logs hold, rebuilt (the set, the
// combat level, the monster) and put to the working tree's simulator — the expected fight and the rolled win rate p over N
// fights — against the outcome the log recorded. No request, nothing written under logs/ or src/; it reads logs/dev.log
// (streamed), logs/raw/, logs/journal/, logs/world/ and public/data/.
//   node --max-old-space-size=2048 --import tsx docs/strategy/025/tools/forecast.mts [--out <dir>] [--until <ISO>]
// (--until: read no line after it — the service keeps appending to the current hour's raw log)
//
// The rebuild: the World snapshot of 2026-11-21 11:43 (logs/world/2026-11-21.json, the service's boot) is the anchor. After
// it the state is played forward from the snapshot (equip / unequip / move / transition, the potions a fight drinks by the
// forecast) and checked against the snapshots of 11-22 and 11-23; before it, back to the first line of 2026-11-03 (the
// season's first line of dev.log — July's lines are another era: no anchor, a 3.5-month gap), the state is played forward
// from "unknown" and a slot still unknown is filled from the next event on that slot (an equip needs an empty slot, the
// game's 491) or the anchor. The combat level: the anchor's XP less (before) or plus (after) every logged combat XP gain.
import { createReadStream, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createInterface } from "node:readline";
import { join } from "node:path";
(globalThis as any).localStorage ??= { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 };
const { setDataReader } = await import("../../../../src/catalog/load.ts");
const cat = await import("../../../../src/catalog/index.ts");
const { applyGear, baseStats, currentFighter } = await import("../../../../src/sim/stats.ts");
const { simulate } = await import("../../../../src/sim/combat.ts");
const { GEAR_SLOTS } = await import("../../../../src/types/api.ts");

const ROOT = join(import.meta.dirname, "../../../..");
const { pathToFileURL } = await import("node:url");
const ai = process.argv.indexOf("--out");
// the outputs (tables, the fights, a generated simulator copy) go to a folder of the system temp dir unless --out names one
const OUT = ai > 0 ? process.argv[ai + 1] : join(tmpdir(), "ammo-025-forecast");
mkdirSync(OUT, { recursive: true });
const ui = process.argv.indexOf("--until");
const UNTIL = ui > 0 ? process.argv[ui + 1] : "9999";
setDataReader(async (n: string) => JSON.parse(readFileSync(join(ROOT, "public/data", `${n}.json`), "utf8")));
await cat.loadCatalog();
const { item, monster, tileAt } = cat;
const EVENTS: any[] = JSON.parse(readFileSync(join(ROOT, "public/data/events.json"), "utf8"));
const XPN: number[] = JSON.parse(readFileSync(join(ROOT, "public/data/atlas.json"), "utf8")).xpNeeded;

const N = 1000; // rolled fights a question; the error of p at 0.75 is √(0.75·0.25/N) = 1.4 points
const FROM = "2026-11-03";
const NAMES = ["First", "Second", "Third", "Fourth", "Fifth"];
const UTIL = new Set(["utility1", "utility2"]);
const STATS = ["max_hp", "attack_fire", "attack_earth", "attack_water", "attack_air", "dmg", "dmg_fire", "dmg_earth", "dmg_water", "dmg_air", "res_fire", "res_earth", "res_water", "res_air", "critical_strike", "haste", "initiative", "wisdom", "prospecting"];
const FIGHT_STATS = ["hp", "attack_fire", "attack_earth", "attack_water", "attack_air", "dmg", "dmg_fire", "dmg_earth", "dmg_water", "dmg_air", "res_fire", "res_earth", "res_water", "res_air", "critical_strike", "initiative"];

// ───────────────────────── the snapshots ─────────────────────────
const SNAPS = readdirSync(join(ROOT, "logs/world")).filter((f) => f.endsWith(".json")).sort().map((f) => {
  const w = JSON.parse(readFileSync(join(ROOT, "logs/world", f), "utf8"));
  return { file: f, t: new Date(w.world.now).toISOString(), chars: w.world.characters as any[] };
});
const ANCHOR = SNAPS[0];

// ───────────────────────── the lines ─────────────────────────
type Ev = { t: string; ch: string; k: string; [x: string]: any };
const evs: Ev[] = [];
const spawns: { code: string; x: number; y: number; layer: string; from: string; until: string; content: any }[] = [];
const fightsOf = new Map<string, Ev[]>();
let julyFights = 0, linesRead = 0;
const RE_LINE = /^(\d{4}-\d\d-\d\dT[\d:.]+Z) \[(\w+)\] (.*)$/;
const RE_API = /^api POST \/my\/(\w+)\/action\/([a-z_/]+)(?: (.*?))? -> (.*)$/;
const RE_LOG = /^log\[(\w+)\] (\w+) ([a-z_/]+): (.*)$/;
const RE_HEAD = /^head (\w+): \[([^\]]*)\] (.*)$/;
const RE_SPAWN = /⚡ (.+) at \((-?\d+), (-?\d+)\) until (\d\d):(\d\d) UTC/;
const cut = (b: string | undefined) => !!b && b.endsWith("…");
const lastFight = new Map<string, Ev>();

function onLine(line: string) {
  const m = RE_LINE.exec(line);
  if (!m) return;
  const [, t, , msg] = m;
  if (t > UNTIL) return;
  linesRead++;
  if (t < FROM) { if (msg.includes("/action/fight -> ok")) julyFights++; return; }
  let a: RegExpExecArray | null;
  if ((a = RE_API.exec(msg))) {
    const [, ch, act, body, rest] = a;
    if (!NAMES.includes(ch)) return;
    const ok = rest.startsWith("ok");
    const status = ok ? "ok" : (/^\d+/.exec(rest)?.[0] ?? "?");
    evs.push({ t, ch, k: "api", act, status }); // every request: the cooldown gap after a fight
    if (act === "fight") {
      if (body && body.includes("participants")) { if (ok) evs.push({ t, ch, k: "gfight" }); return; }
      if (ok || /^5\d\d/.test(status)) { const f: Ev = { t, ch, k: "fight", status, outcome: ok ? "?" : "?5xx", xp: 0 }; evs.push(f); lastFight.set(ch, f); }
      return;
    }
    if (act === "equip" && body) {
      const items = [...body.matchAll(/\{"code":"([a-z0-9_]+)","slot":"([a-z0-9_]+)"(?:,"quantity":(\d+)(?=[,}\]]))?/g)].map((x) => ({ code: x[1], slot: x[2], q: x[3] ? +x[3] : undefined }));
      if (ok) evs.push({ t, ch, k: "equip", items, cut: cut(body) });
      else { const lv = /level gt (\d+)/.exec(rest); if (lv) evs.push({ t, ch, k: "lvlcap", max: +lv[1], code: items[0]?.code }); }
      return;
    }
    if (!ok) return;
    if (act === "unequip" && body) evs.push({ t, ch, k: "unequip", items: [...body.matchAll(/\{"slot":"([a-z0-9_]+)"(?:,"quantity":(\d+)(?=[,}\]]))?/g)].map((x) => ({ slot: x[1], q: x[2] ? +x[2] : undefined })), cut: cut(body) });
    else if ((act === "bank/withdraw/item" || act === "bank/deposit/item") && body) evs.push({ t, ch, k: act === "bank/withdraw/item" ? "withdraw" : "deposit", items: [...body.matchAll(/\{"code":"([a-z0-9_]+)","quantity":(\d+)(?=[,}\]])/g)].map((x) => ({ code: x[1], q: +x[2] })), cut: cut(body) });
    else if (act === "move" && body) { const p = /"x":(-?\d+),"y":(-?\d+)/.exec(body); if (p) evs.push({ t, ch, k: "move", x: +p[1], y: +p[2] }); }
    else if (act === "transition") evs.push({ t, ch, k: "transition" });
    else if (act === "use" && body) { const u = /"code":"([a-z0-9_]+)","quantity":(\d+)/.exec(body); if (u) evs.push({ t, ch, k: "use", code: u[1], q: +u[2] }); }
    return;
  }
  if ((a = RE_LOG.exec(msg))) {
    const [, lvl, ch, act, text] = a;
    if (act === "event" && text.includes("⚡")) {
      const s = RE_SPAWN.exec(text);
      if (!s) return;
      const ev = EVENTS.find((e) => e.name === s[1]);
      if (!ev) return;
      let until = `${t.slice(0, 10)}T${s[4]}:${s[5]}:59.999Z`;
      if (until < t) until = new Date(Date.parse(until) + 86400e3).toISOString();
      const layer = ev.maps.find((m: any) => m.x === +s[2] && m.y === +s[3])?.layer ?? "overworld";
      spawns.push({ code: ev.code, x: +s[2], y: +s[3], layer, from: t, until, content: ev.content });
      return;
    }
    if (!NAMES.includes(ch) || lvl !== "ok") return;
    if (act === "fight") {
      const g = /^group fight (win|loss)/.exec(text);
      if (g) { for (const x of text.matchAll(/(\w+) \+(\d+) xp/g)) if (NAMES.includes(x[1])) evs.push({ t, ch: x[1], k: "xp", xp: +x[2], src: "group" }); return; }
      const f = lastFight.get(ch);
      const r = /^fight (win|loss)/.exec(text);
      if (f && f.outcome === "?" ) { f.outcome = r ? r[1] : "?"; f.xp = +(/\+(\d+) xp/.exec(text)?.[1] ?? 0); f.text = text; }
      return;
    }
    if (act === "rest") { const r = /rested \+(\d+) hp/.exec(text); if (r) evs.push({ t, ch, k: "rest", hp: +r[1] }); return; }
    if (act === "offering") { const r = /completed combat offering · \+(\d+) xp/.exec(text); if (r) evs.push({ t, ch, k: "xp", xp: +r[1], src: "offering" }); return; }
    return;
  }
  if ((a = RE_HEAD.exec(msg))) { if (NAMES.includes(a[1])) evs.push({ t, ch: a[1], k: "head", id: a[2], text: a[3] }); }
}

async function readAll() {
  const rl = createInterface({ input: createReadStream(join(ROOT, "logs/dev.log"), { encoding: "utf8" }), crlfDelay: Infinity });
  let lastT = "";
  for await (const line of rl) { onLine(line); lastT = line.slice(0, 24) || lastT; }
  const devEnd = lastT;
  for (const d of readdirSync(join(ROOT, "logs/raw")).sort())
    for (const f of readdirSync(join(ROOT, "logs/raw", d)).sort()) {
      for (const line of readFileSync(join(ROOT, "logs/raw", d, f), "utf8").split(/\r?\n/)) if (line.slice(0, 24) > devEnd) onLine(line); // the raw log starts where dev.log ends
    }
}
await readAll();
// one time order (the files are in order already; a stable sort keeps same-millisecond lines as written)
evs.sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
const byChar = new Map<string, Ev[]>(NAMES.map((n) => [n, evs.filter((e) => e.ch === n)]));
for (const list of byChar.values()) list.forEach((e, i) => (e.ix = i));
// an unequip's deposit: the next deposit of the character before any other gear move, fight or withdraw
for (const list of byChar.values()) for (let i = 0; i < list.length; i++) {
  if (list[i].k !== "unequip") continue;
  for (let j = i + 1; j < list.length; j++) {
    const n = list[j];
    if (n.k === "deposit") { list[i].depGear = n.items.filter((x: any) => ["weapon", "rune", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring", "amulet", "artifact", "utility", "bag"].includes(item(x.code)?.type ?? "")).map((x: any) => x.code); break; }
    if (["equip", "unequip", "fight", "withdraw"].includes(n.k)) break;
  }
}

// ───────────────────────── the combat level: the anchor's XP ± every logged gain ─────────────────────────
const cumOf = (L: number, xp: number) => { let c = xp; for (let l = 1; l < L; l++) c += XPN[l]; return c; };
const levelOf = (cum: number) => { let L = 1, c = 0; while (L < XPN.length && c + XPN[L] <= cum) { c += XPN[L]; L++; } return { L, xp: cum - c }; };
const gains = new Map<string, { ts: string[]; pre: number[] }>(); // pre[i] = the XP of the gains before index i
for (const e of evs) if ((e.k === "fight" && e.xp > 0) || e.k === "xp") {
  if (!gains.has(e.ch)) gains.set(e.ch, { ts: [], pre: [0] });
  const g = gains.get(e.ch)!;
  g.ts.push(e.t); g.pre.push(g.pre.at(-1)! + e.xp);
}
/** The XP of `ch`'s logged gains strictly before `t`. */
function sumBefore(ch: string, t: string): number {
  const g = gains.get(ch);
  if (!g) return 0;
  let lo = 0, hi = g.ts.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (g.ts[mid] < t) lo = mid + 1; else hi = mid; }
  return g.pre[lo];
}
/** The cumulative combat XP of `ch` just before the moment `t` (a gain AT `t` is not yet in). */
const cumAt = (ch: string, t: string, anchorT: string, anchorCum: number) => anchorCum + sumBefore(ch, t) - sumBefore(ch, anchorT);
const anchorCum = new Map(ANCHOR.chars.map((c) => [c.name, cumOf(c.level, c.xp)]));
const levelAt = (ch: string, t: string) => levelOf(cumAt(ch, t, ANCHOR.t, anchorCum.get(ch)!)).L;

// ───────────────────────── a hypothesis: two restore potions fire one after the other ─────────────────────────
// The working tree's combat.ts sums every worn restore into one proc that drinks one unit of each (combat.ts:205, :299,
// :445). Hypothesis H-a: each restore potion is its own effect, checked in slot order at the start of the turn — the
// second fires only when the first left the bearer still under half its HP — and a stack with `qty` units stops after
// them. Built at run time from the working tree's file into the output folder; src/ is not touched.
function patchedSim(): string {
  let src = readFileSync(join(ROOT, "src/sim/combat.ts"), "utf8");
  const rep = (a: string, b: string) => { if (!src.includes(a)) throw new Error(`combat.ts changed: no "${a}"`); src = src.replace(a, b); };
  rep(`from "./types"`, `from "${pathToFileURL(join(ROOT, "src/sim/types.ts")).href}"`);
  rep(`from "./types"`, `from "${pathToFileURL(join(ROOT, "src/sim/types.ts")).href}"`);
  rep(`from "./cost"`, `from "${pathToFileURL(join(ROOT, "src/sim/cost.ts")).href}"`);
  rep(`from "../types/catalog"`, `from "${pathToFileURL(join(ROOT, "src/types/catalog.ts")).href}"`);
  rep(`case "restore": c.restore += v; break;`, `case "restore": c.restore += v; ((c as any).rs ??= []).push({ v, potion: (e as any).potion, left: (e as any).qty ?? Infinity, n: 0 }); break;`);
  rep(`if (c.restore > 0 && c.hp < 0.5 * c.maxHp) { c.hp = Math.min(c.maxHp, c.hp + c.restore); c.restored += c.restore; c.procs++; }`,
    `for (const r of (c as any).rs ?? []) if (r.left > 0 && c.hp < 0.5 * c.maxHp) { c.hp = Math.min(c.maxHp, c.hp + r.v); c.restored += r.v; r.n++; r.left--; c.procs++; }`);
  rep(`e.code === "restore" ? P.procs : 1`, `e.code === "restore" ? ((P as any).rs?.find((r: any) => r.potion === e.potion)?.n ?? 0) : 1`);
  return src;
}
writeFileSync(join(OUT, "combat-ha.ts"), patchedSim());
const simHA = (await import(pathToFileURL(join(OUT, "combat-ha.ts")).href)).simulate as typeof simulate;

// ───────────────────────── the forecast ─────────────────────────
function hypo(L: number): any {
  const h: any = { name: "L", level: L, max_hp: 115 + 5 * L, hp: 115 + 5 * L };
  for (const s of STATS) if (s !== "max_hp" && s !== "initiative") h[s] = 0;
  for (const g of GEAR_SLOTS) h[`${g}_slot`] = "";
  return h;
}
const fnv = (k: string) => { let h = 0x811c9dc5; for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
function mulberry32(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const med = (a: number[]) => { const s = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y); return !s.length ? NaN : s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
type Fc = { usedR: Record<string, number>; win: boolean; turns: number; hp: number; maxHp: number; used: Record<string, number>; p: number; turnsR: number; hpWinR: number; playerFirst: boolean; init: number; minit: number; tieCoin: boolean };
const fcCache = new Map<string, Fc>();
/** The fighter the solve builds: the hypothetical character at level L with `codes` folded on (scripts/check-stats.mts). */
const fighterOf = (L: number, codes: string[]) => applyGear(baseStats(hypo(L)), codes);
function forecast(L: number, codes: string[], mcode: string, tweak?: (f: any) => any, tag = "", sim = simulate): Fc {
  const key = `${tag}|${L}|${[...codes].sort().join(",")}|${mcode}`;
  let r = fcCache.get(key);
  if (r) return r;
  const m = monster(mcode)!;
  let f = fighterOf(L, codes);
  if (tweak) f = tweak(f);
  const e = sim(f, m);
  const rng = mulberry32(fnv(key.slice(key.indexOf("|"))));
  let w = 0;
  const turns: number[] = [], hps: number[] = [];
  const usedR: Record<string, number> = {};
  for (let i = 0; i < N; i++) { const x = sim(f, m, { rng }); if (x.win) { w++; hps.push(x.hpRemaining); } turns.push(x.turns); for (const [c, n] of Object.entries(x.used)) usedR[c] = (usedR[c] ?? 0) + n / N; }
  r = { usedR, win: e.win, turns: e.turns, hp: e.hpRemaining, maxHp: e.maxHp, used: e.used, p: w / N, turnsR: med(turns), hpWinR: med(hps), playerFirst: e.playerFirst, init: f.stats.initiative, minit: m.initiative, tieCoin: f.stats.initiative === m.initiative && f.stats.hp === m.hp };
  fcCache.set(key, r);
  return r;
}

// ───────────────────────── the state, played ─────────────────────────
type Slot = { code: string; q: number }; // code "" = empty, "?" = unknown
type St = { slots: Record<string, Slot>; x: number | null; y: number | null; layer: string };
const fromChar = (c: any): St => {
  const slots: Record<string, Slot> = {};
  for (const g of GEAR_SLOTS) slots[g] = { code: c[`${g}_slot`] ?? "", q: UTIL.has(g) ? c[`${g}_slot_quantity`] ?? 0 : c[`${g}_slot`] ? 1 : 0 };
  return { slots, x: c.x, y: c.y, layer: c.layer ?? "overworld" };
};
const unknownSt = (): St => { const slots: Record<string, Slot> = {}; for (const g of GEAR_SLOTS) slots[g] = { code: "?", q: NaN }; return { slots, x: null, y: null, layer: "overworld" }; };
const slotsFor = (type: string): string[] => type === "ring" ? ["ring1", "ring2"] : type === "artifact" ? ["artifact1", "artifact2", "artifact3"] : type === "utility" ? ["utility1", "utility2"] : type === "body_armor" || type === "leg_armor" || ["weapon", "rune", "shield", "helmet", "boots", "amulet", "bag"].includes(type) ? [type] : [];
const NAME2CODE = new Map([...cat.catalog().monsters.values()].map((m: any) => [m.name, m.code]));
const headMonster = (text: string) => { const r = /(?:^Fight (?:\d+× |\(∞\) )|equip to fight |^Prepare to fight )(.+?)(?: \(|$)/.exec(text); return r ? NAME2CODE.get(r[1]) ?? null : null; };
function monsterAt(x: number, y: number, layer: string, t: string): { code: string; how: string } | null {
  for (const s of spawns) if (s.x === x && s.y === y && layer === s.layer && s.from <= t && t <= s.until && s.content.type === "monster") return { code: s.content.code, how: "event" };
  const tile: any = tileAt(x, y, layer);
  const c = tile?.interactions?.content;
  if (c?.type === "monster") return { code: c.code, how: "tile" };
  const ev = EVENTS.find((e) => e.content.type === "monster" && e.maps.some((m: any) => m.x === x && m.y === y && m.layer === layer));
  return ev ? { code: ev.content.code, how: "event (no spawn line)" } : null;
}

/** How a gear event touches slot g: named in its list, or possibly in the part a cut hid (the lists run in GEAR_SLOTS
 *  order, so a cut hides only slots after the last one shown). */
function touch(e: Ev, g: string): "visible" | "hidden" | null {
  if (e.items.some((it: any) => it.slot === g)) return "visible";
  if (!e.cut) return null;
  const last = Math.max(-1, ...e.items.map((x: any) => GEAR_SLOTS.indexOf(x.slot)));
  return GEAR_SLOTS.indexOf(g) > last ? "hidden" : null;
}
/** The next equip or unequip of `ch` after its event index `ix` that touches g (before `until`). */
const gearEvs = new Map<string, Ev[]>([...byChar].map(([n, l]) => [n, l.filter((e) => e.k === "equip" || e.k === "unequip")]));
function nextTouch(ch: string, ix: number, g: string, until = "9999", visibleOnly = false): { e: Ev; how: "visible" | "hidden" } | null {
  const list = gearEvs.get(ch)!;
  let lo = 0, hi = list.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (list[mid].ix <= ix) lo = mid + 1; else hi = mid; }
  for (let j = lo; j < list.length && list[j].t < until; j++) {
    const how = touch(list[j], g);
    if (how && !(visibleOnly && how === "hidden")) return { e: list[j], how };
  }
  return null;
}
const { fightXp, wisdomOf } = await import("../../../../src/plan/xp.ts");
const DRAIN = { k: 1 };
const SEGS: any[] = [];
const checks: string[] = [];
const newRecon = () => ({ equipCut: 0, equipCutResolved: 0, equipCutLost: 0, equipCutUnknown: 0, unequipCut: 0, unequipCutResolved: 0, headDisagree: 0, headAgree: 0, headNone: 0, filled: 0, fillUnknown: 0 });
type Recon = ReturnType<typeof newRecon>;
const lvlViol: string[] = [];
let lvlChecks = 0;
const EMPTY = (): Slot => ({ code: "", q: 0 });
const UNKNOWN = (): Slot => ({ code: "?", q: NaN });
const GEAR_TYPES = new Set(["weapon", "rune", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring", "amulet", "artifact", "utility", "bag"]);
/** The slots that change a fight: every one but the bag (inventory space only). */
const unknownSlots = (slots: Record<string, string>) => GEAR_SLOTS.filter((g) => g !== "bag" && slots[g] === "?");
const codesOf = (slots: Record<string, string>) => GEAR_SLOTS.map((g) => slots[g]).filter((c) => c && c !== "?");

/** One character's events in [from, to) played on `st`; its fights pushed into `out`. `strict`: a slot that a list the
 *  log's length limit cut may have changed becomes unknown. Otherwise (the inferred rebuild) a cut list changes nothing
 *  that the withdraw or deposit beside it does not show. */
function play(ch: string, from: string, to: string, st: St, pre: boolean, strict: boolean, out: any[], rc: Recon) {
  const mine = byChar.get(ch)!.filter((e) => e.t >= from && e.t < to);
  const bk = strict ? "beforeS" : "beforeL";
  let head: string | null = null, prev: any = null, cur: any = null, pendingGap: any = null, bankCut = false;
  const sinceBank: { code: string; q: number }[] = []; // withdrawn since the last equip or fight (a cut equip's tail)
  const seg: Record<string, any> = { utility1: null, utility2: null };
  for (const e of mine) {
    if (e.k === "api") { if (pendingGap && e.t > pendingGap.t) { pendingGap.gap = (Date.parse(e.t) - Date.parse(pendingGap.t)) / 1000; pendingGap = null; } continue; }
    switch (e.k) {
      case "head": head = e.text; break;
      case "move": st.x = e.x; st.y = e.y; break;
      case "transition": {
        const tr = st.x == null ? null : (tileAt(st.x, st.y!, st.layer) as any)?.interactions?.transition;
        if (tr) { st.x = tr.x; st.y = tr.y; st.layer = tr.layer; } else { st.x = null; st.y = null; }
        break;
      }
      case "withdraw": for (const it of e.items) sinceBank.push({ ...it }); if (e.cut) bankCut = true; break;
      case "unequip": {
        // what came off: the gear of the deposit right after it (the executor's "stow gear"), matched to the slots by type
        const dep: string[] = [...(e.depGear ?? [])];
        const take = (slot: string, want?: string) => {
          const j = dep.findIndex((c) => (want ? c === want : slotsFor(item(c)?.type ?? "").includes(slot)));
          return j >= 0 ? dep.splice(j, 1)[0] : null;
        };
        const before: Record<string, string> = (e[bk] = {});
        for (const it of e.items) {
          if (UTIL.has(it.slot)) { const sg = seg[it.slot]; if (sg && it.q != null && sg.n && st.slots[it.slot].code === sg.code && it.q < sg.q0) SEGS.push({ ...sg, R: it.q }); seg[it.slot] = null; }
          const s = st.slots[it.slot];
          const was = s.code === "?" ? take(it.slot) : (take(it.slot, s.code), s.code);
          if (was) before[it.slot] = was;
          if (UTIL.has(it.slot) && it.q != null && Number.isFinite(s.q) && it.q < s.q) s.q -= it.q; else st.slots[it.slot] = EMPTY();
        }
        if (e.cut) {
          // the slots the cut may hide (after the last one shown: the lists run in GEAR_SLOTS order): off when the deposit
          // after names them; strict: else off when the next event on the slot is an equip (an equip needs an empty slot,
          // the game's 491), kept when it is an unequip, unknown otherwise
          if (strict) rc.unequipCut++;
          const last = Math.max(-1, ...e.items.map((x: any) => GEAR_SLOTS.indexOf(x.slot)));
          for (const g of GEAR_SLOTS.slice(last + 1)) {
            const c = st.slots[g].code;
            if (c === "") continue;
            const gone = c !== "?" ? take(g, c) : take(g);
            if (gone) { before[g] = gone; st.slots[g] = EMPTY(); rc.unequipCutResolved++; continue; }
            if (!strict) continue;
            const nx = nextTouch(ch, e.ix, g, to);
            if (nx?.how === "visible" && nx.e.k === "equip") { st.slots[g] = EMPTY(); rc.unequipCutResolved++; }
            else if (nx?.how === "visible" && nx.e.k === "unequip" && c !== "?") rc.unequipCutResolved++; // still worn
            else st.slots[g] = UNKNOWN();
          }
        }
        break;
      }
      case "equip": {
        const taken = new Set<string>();
        for (const it of e.items) {
          const s = st.slots[it.slot];
          const wi = sinceBank.findIndex((w) => w.code === it.code);
          const q = it.q ?? (UTIL.has(it.slot) ? (wi >= 0 ? sinceBank[wi].q : NaN) : 1);
          if (UTIL.has(it.slot) && s.code === it.code) st.slots[it.slot] = { code: it.code, q: (Number.isFinite(s.q) ? s.q : 0) + q };
          else st.slots[it.slot] = { code: it.code, q };
          if (UTIL.has(it.slot)) { // a stack whose start and end the log names: what the fights really drank
            const sg = seg[it.slot];
            if (sg && sg.code === it.code && it.q != null) sg.q0 += it.q;
            else seg[it.slot] = it.q != null && (s.code === "" || s.code !== it.code) ? { code: it.code, q0: it.q, exp: 0, expR: 0, n: 0 } : null;
          }
          taken.add(it.slot);
          if (wi >= 0) { if (UTIL.has(it.slot) || --sinceBank[wi].q <= 0) sinceBank.splice(wi, 1); }
          const need = (item(it.code)?.conditions ?? []).find((c: any) => c.code === "level");
          if (strict && pre && need) {
            const L = levelAt(ch, e.t); lvlChecks++;
            if (!(need.operator === "gt" ? L > need.value : L >= need.value)) lvlViol.push(`${e.t} ${ch} equipped ${it.code} (level ${need.operator} ${need.value}) at rebuilt level ${L}`);
          }
        }
        if (e.cut) {
          if (strict) rc.equipCut++;
          // the tail the cut hid: the gear withdrawn at this bank visit that the visible part does not name
          const left = sinceBank.filter((w) => GEAR_TYPES.has(item(w.code)?.type ?? ""));
          for (const w of left) {
            const ty = item(w.code)!.type;
            for (let k = 0; k < (ty === "utility" ? 1 : w.q); k++) {
              const s = slotsFor(ty).filter((x) => !taken.has(x)).find((x) => st.slots[x].code === "" || st.slots[x].code === "?");
              if (!s) break;
              st.slots[s] = { code: w.code, q: UTIL.has(s) ? w.q : 1 };
              taken.add(s); rc.equipCutResolved++;
            }
          }
          if (!left.length) rc.equipCutLost++;
          if (strict && bankCut) { // a withdraw of this visit was cut too: an empty slot after the last one shown may have been filled
            const last = Math.max(-1, ...e.items.map((x: any) => GEAR_SLOTS.indexOf(x.slot)));
            for (const g of GEAR_SLOTS.slice(last + 1)) if (!taken.has(g) && st.slots[g].code === "") { st.slots[g] = UNKNOWN(); rc.equipCutUnknown++; }
          }
        }
        sinceBank.length = 0; bankCut = false;
        break;
      }
      case "lvlcap": if (strict && pre) { const L = levelAt(ch, e.t); lvlChecks++; if (L > e.max) lvlViol.push(`${e.t} ${ch} refused ${e.code} (level gt ${e.max}) at rebuilt level ${L}`); } break;
      case "rest": if (cur) cur.after.push({ k: "rest", hp: e.hp }); break;
      case "use": if (cur) { const heal = (item(e.code)?.effects ?? []).find((x: any) => x.code === "heal")?.value ?? 0; cur.after.push({ k: "use", heal: heal * e.q }); } break;
      case "fight": {
        sinceBank.length = 0; bankCut = false;
        const L = levelAt(ch, e.t);
        const at = st.x == null ? null : monsterAt(st.x, st.y!, st.layer, e.t);
        const hm = head ? headMonster(head) : null;
        if (at && hm) { if (hm === at.code) rc.headAgree++; else rc.headDisagree++; } else rc.headNone++;
        const slots: Record<string, string> = {};
        for (const g of GEAR_SLOTS) slots[g] = st.slots[g].code;
        const f: any = { t: e.t, idx: e.ix, ch, pre, outcome: e.outcome, status: e.status, xp: e.xp, L, Lafter: levelAt(ch, new Date(Date.parse(e.t) + 1).toISOString()), x: st.x, y: st.y, layer: st.layer, monster: at?.code ?? null, how: at?.how ?? null, headMonster: hm, slots, uq: { utility1: st.slots.utility1.q, utility2: st.slots.utility2.q }, after: [], prevAfter: prev ? prev.after : null };
        out.push(f);
        prev = f; cur = f; pendingGap = f;
        // the potions this fight drank, by the expected forecast (the log does not say); a slot still unknown here counts as
        // empty for this estimate only (a boost is one a fight whatever the set; a restore potion one a proc)
        if (at) {
          const fc = forecast(L, codesOf(slots), at.code);
          for (const u of ["utility1", "utility2"]) {
            const s = st.slots[u]; const d = (fc.usedR[s.code] ?? 0) * DRAIN.k;
            if (d && Number.isFinite(s.q)) s.q -= d; // the code stays: judge() decides
            const sg = seg[u];
            if (sg && sg.code === s.code) { sg.exp += fc.used[s.code] ?? 0; sg.expR += fc.usedR[s.code] ?? 0; sg.n++; }
          }
        }
        if (e.outcome === "loss") { st.x = null; st.y = null; st.layer = "overworld"; } // a beaten character wakes elsewhere (11-22 00:35:53 Third: rat in the interior, then a move on the overworld)
        break;
      }
      case "gfight": prev = null; cur = null; break;
    }
  }
  return st;
}

/** A slot still unknown at a fight takes the next event on it: an equip → it was empty (491); an unequip → what its
 *  deposit names; nothing until the next snapshot → the snapshot's. Strict: a cut list that may touch it stops the look. */
function fill(out: any[], strict: boolean, rc: Recon) {
  const bk = strict ? "beforeS" : "beforeL";
  for (const f of out) {
    const snap = SNAPS.find((s) => s.t > f.t);
    for (const g of unknownSlots(f.slots)) {
      if (!snap) { rc.fillUnknown++; continue; }
      const nx = nextTouch(f.ch, f.idx, g, snap.t, !strict);
      let v: string | null = null;
      if (!nx) v = snap.chars.find((c) => c.name === f.ch)![`${g}_slot`] ?? "";
      else if (nx.how === "visible" && nx.e.k === "equip") v = "";
      else if (nx.e.k === "unequip" && nx.e[bk]?.[g]) v = nx.e[bk][g];
      if (v == null) { rc.fillUnknown++; continue; }
      f.slots[g] = v; rc.filled++;
    }
  }
}

/** Compare a played state with a snapshot's character: per slot equal / differs / unknown, the tile. */
function compare(label: string, st: St, c: any) {
  let eq = 0, diff = 0, unk = 0;
  const bad: string[] = [];
  for (const g of GEAR_SLOTS) {
    const want = c[`${g}_slot`] ?? "", got = st.slots[g].code;
    if (got === "?") unk++; else if (got === want) eq++; else { diff++; bad.push(`${g}: rebuilt ${got || "—"}, snapshot ${want || "—"}`); }
  }
  const pos = st.x === c.x && st.y === c.y && st.layer === (c.layer ?? "overworld");
  checks.push(`${label} ${c.name}: ${eq} slots equal, ${diff} differ, ${unk} unknown; tile ${pos ? "equal" : `rebuilt ${st.x},${st.y},${st.layer} snapshot ${c.x},${c.y},${c.layer}`}${bad.length ? " — " + bad.join("; ") : ""}`);
}

/** Both rebuilds: before the anchor forward from unknown, after it from each snapshot (checked at the next one). */
function rebuild(strict: boolean) {
  const out: any[] = [], rc = newRecon();
  const tag = strict ? "strict" : "inferred";
  for (const ch of NAMES) {
    const st = play(ch, FROM, ANCHOR.t, unknownSt(), true, strict, out, rc);
    compare(`[${tag}] at the anchor ${ANCHOR.t} (played from ${FROM}, unknown start)`, st, ANCHOR.chars.find((c) => c.name === ch)!);
    for (let i = 0; i < SNAPS.length; i++) {
      const s = SNAPS[i], next = SNAPS[i + 1];
      const st2 = play(ch, s.t, next?.t ?? "9999", fromChar(s.chars.find((x) => x.name === ch)!), false, strict, out, rc);
      if (next && strict) compare(`at ${next.t} (played from ${s.t})`, st2, next.chars.find((x) => x.name === ch)!);
    }
  }
  fill(out, strict, rc);
  return { out, rc };
}
// the drain: what a stack whose start and end the log names really lost, against what its fights' rolled forecasts drink
rebuild(true);
const segs = SEGS.splice(0);
const real = segs.reduce((a, x) => a + x.q0 - x.R, 0), expR = segs.reduce((a, x) => a + x.expR, 0), expE = segs.reduce((a, x) => a + x.exp, 0);
DRAIN.k = expR > 0 ? real / expR : 1;
const drainLine = `Potion drain: ${segs.length} stacks with a named start and end and fights between (${segs.reduce((a, x) => a + x.n, 0)} fights): drunk ${real.toFixed(0)}, the rolled forecasts' mean ${expR.toFixed(0)}, the expected pass ${expE.toFixed(0)} → the forward count drinks ${DRAIN.k.toFixed(3)} × the rolled mean a fight.`;
checks.length = 0; lvlViol.length = 0; lvlChecks = 0;
const S = rebuild(true), I = rebuild(false);

// the XP played forward against the later snapshots
for (const s of SNAPS.slice(1)) for (const c of s.chars) {
  const want = cumOf(c.level, c.xp), got = cumAt(c.name, s.t, ANCHOR.t, anchorCum.get(c.name)!);
  checks.push(`XP at ${s.t} ${c.name}: snapshot level ${c.level} xp ${c.xp}; rebuilt ${JSON.stringify(levelOf(got))} (Δ ${got - want})`);
}
// the solve's arithmetic against each snapshot character's API totals (024's check on this fleet's own sets)
for (const s of SNAPS) for (const c of s.chars) {
  const a = fighterOf(c.level, GEAR_SLOTS.map((g) => c[`${g}_slot`]).filter(Boolean)).stats as any, b = currentFighter(c).stats as any;
  const d = FIGHT_STATS.filter((k) => a[k] !== b[k]).map((k) => `${k} ${a[k]} vs API ${b[k]}`);
  checks.push(`arithmetic ${s.t} ${c.name} L${c.level}: ${d.length ? d.join(", ") : "every fight stat equal"}`);
}

// ───────────────────────── every fight: the forecast and what the log saw ─────────────────────────
function judge(out: any[]) {
  const unk = new Map<string, number>(), known: any[] = [];
  const note = (why: string) => unk.set(why, (unk.get(why) ?? 0) + 1);
  for (const f of out) {
    if (f.status !== "ok") { note("the request answered 500 (Fatal error): the fight may or may not have happened, no outcome"); continue; }
    if (f.outcome !== "win" && f.outcome !== "loss") { note("no outcome line after the request (the log line reads only `fight`)"); continue; }
    if (f.x == null) { note("the tile is unknown (no move since a loss or the start)"); continue; }
    if (!f.monster) { note("the tile holds no monster in the catalog nor any event's monster"); continue; }
    const u = unknownSlots(f.slots);
    if (u.length) { note(`a worn slot is unknown: ${u.length > 3 ? "4 or more slots" : u.join(", ")}`); continue; }
    // a worn potion stack: proven there when the next event on its slot is an unequip that names a quantity, or the next
    // snapshot shows it; else estimated from the forward count (each fight drinks what its expected pass drinks)
    f.stack = {};
    for (const u of ["utility1", "utility2"]) {
      const c = f.slots[u];
      if (!c) continue;
      const snap = SNAPS.find((x) => x.t > f.t);
      const nx = nextTouch(f.ch, f.idx, u, snap?.t ?? "9999", true);
      const sc = snap?.chars.find((x) => x.name === f.ch);
      const R = nx?.e.k === "unequip" ? nx.e.items.find((it: any) => it.slot === u)?.q : !nx && sc && sc[`${u}_slot`] === c ? sc[`${u}_slot_quantity`] : undefined;
      f.stack[u] = R != null && R > 0 ? { how: "proven", q: R } : { how: "estimated", q: f.uq[u] };
      if (f.stack[u].how === "estimated" && Number.isFinite(f.uq[u]) && f.uq[u] <= 0) f.slots[u] = ""; // drunk dry by the estimate
    }
    const codes = codesOf(f.slots);
    const fc = forecast(f.L, codes, f.monster);
    f.codes = codes; f.fc = fc;
    // a restore stack the estimate leaves short of this fight's procs may run out inside it: p without it beside p
    const short = Object.entries(f.stack).filter(([u, x]: any) => x.how === "estimated" && Number.isFinite(x.q) && f.slots[u] && x.q < (fc.used[f.slots[u]] ?? 0) && (item(f.slots[u])?.effects ?? []).some((e: any) => e.code === "restore")).map(([u]) => f.slots[u]);
    f.short = short;
    // found dry right after it: before this character's next fight, an unequip strips a utility stack but not this one
    // (a reset strips every stack it holds), or this slot is filled again
    f.dry = [];
    const list = byChar.get(f.ch)!;
    for (let j = f.idx + 1; j < list.length && list[j].k !== "fight"; j++) {
      const x = list[j];
      if (x.k === "unequip" && !x.cut && x.items.some((it: any) => UTIL.has(it.slot))) { for (const u of ["utility1", "utility2"]) if (f.slots[u] && !x.items.some((it: any) => it.slot === u)) f.dry.push(f.slots[u]); break; }
      if (x.k === "equip" && x.items.some((it: any) => UTIL.has(it.slot) && f.slots[it.slot] === it.code)) { for (const it of x.items) if (UTIL.has(it.slot) && f.slots[it.slot] === it.code) f.dry.push(it.code); break; }
    }
    f.pNoDry = f.dry.length ? forecast(f.L, codes.filter((c: string) => !f.dry.includes(c)), f.monster).p : fc.p;
    f.pDry = short.length ? forecast(f.L, codes.filter((c: string) => !short.includes(c)), f.monster).p : fc.p;
    const m = monster(f.monster)!;
    f.xpFc = fightXp(m.level, m.hp, m.type, f.L, wisdomOf(codes));
    // HP: what the heals after it say (a rest refills to the max of the set worn), and whether it started at full
    const maxHp = fighterOf(f.Lafter, codes.filter((c: string) => item(c)?.type !== "utility")).stats.hp;
    const first = f.after.find((a: any) => a.k === "rest" || a.k === "use");
    f.hpObs = first?.k === "rest" ? maxHp - first.hp : null; // a rest directly follows, no food
    const ri = f.after.findIndex((a: any) => a.k === "rest");
    f.hpObsFood = ri >= 0 ? maxHp - f.after.slice(0, ri + 1).reduce((s: number, a: any) => s + (a.k === "rest" ? a.hp : a.heal), 0) : null;
    f.start = f.prevAfter == null ? "no fight before it" : f.prevAfter.some((a: any) => a.k === "rest") ? "full (a rest since the fight before)" : f.prevAfter.length ? "food only since the fight before" : "no heal since the fight before";
    known.push(f);
  }
  return { unk, known };
}
const JS = judge(S.out), JI = judge(I.out);
writeFileSync(join(OUT, "fights-strict.jsonl"), S.out.map((f) => JSON.stringify({ ...f, prevAfter: undefined })).join("\n"));
writeFileSync(join(OUT, "fights-inferred.jsonl"), I.out.map((f) => JSON.stringify({ ...f, prevAfter: undefined })).join("\n"));

// ───────────────────────── tables ─────────────────────────
const md: string[] = [];
const pts = (o: number, e: number, n: number) => (n ? (((o - e) / n) * 100).toFixed(1) : "—");
const f1 = (x: number) => (Number.isFinite(x) ? (Number.isInteger(x) ? String(x) : x.toFixed(1)) : "—");
const band = (p: number) => (p < 0.75 ? "< 0.75" : p < 0.9 ? "0.75–0.9" : p < 0.99 ? "0.9–0.99" : "≥ 0.99");
const BORD = ["< 0.75", "0.75–0.9", "0.9–0.99", "≥ 0.99"];
function table(title: string, head: string[], rows: (string | number)[][], foot?: string) {
  md.push(`### ${title}`, "", `| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`), ...(foot ? ["", foot] : []), "");
}
const sortKey = (k: string) => BORD.reduce((s, b, i) => s.replace(b, `${i}${b}`), k);
function groupRows(list: any[], keyOf: (f: any) => string, withHp: boolean) {
  const g = new Map<string, any[]>();
  for (const f of list) { const k = keyOf(f); if (!g.has(k)) g.set(k, []); g.get(k)!.push(f); }
  return [...g].sort((a, b) => (sortKey(a[0]) < sortKey(b[0]) ? -1 : 1)).map(([k, fs]) => {
    const n = fs.length, e = fs.reduce((s, f) => s + f.fc.p, 0), o = fs.filter((f) => f.outcome === "win").length;
    const row: (string | number)[] = [k, n, e.toFixed(1), o, pts(o, e, n)];
    if (withHp) {
      const h = fs.filter((f) => f.hpObs != null && f.outcome === "win");
      row.push(h.length, f1(med(h.map((f) => f.hpObs))), f1(med(h.map((f) => f.fc.hp))), f1(med(h.map((f) => f.fc.hpWinR))));
      const c = fs.filter((f) => f.gap != null && f.gap < 300);
      row.push(f1(med(c.map((f) => f.gap))), f1(med(fs.map((f) => f.fc.turns))));
      const w = fs.filter((f) => f.outcome === "win");
      row.push(w.length ? `${w.filter((f) => f.xpFc === f.xp).length}/${w.length}` : "—");
    }
    return row;
  });
}
const H = ["", "fights", "wins forecast (Σp)", "wins observed", "observed − forecast (points)"];
const HH = [...H, "won, rest right after", "HP left observed (median)", "HP left, expected pass (median)", "HP left, rolled wins (median)", "s to the next request (median)", "expected turns (median)", "won fights whose XP the set's wisdom gives exactly"];
const reasons = (unk: Map<string, number>, known: number) => [...unk].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v] as (string | number)[]).concat([["July (before " + FROM + ", not rebuilt)", julyFights], ["**solo fights with set, level and monster known**", known]]);
const reconLine = (rc: Recon) => `equip bodies cut ${rc.equipCut} (tail items placed from the withdraws of the same bank visit ${rc.equipCutResolved}; nothing withdrawn left to place ${rc.equipCutLost}; empty slots after a cut list with a cut withdraw marked unknown ${rc.equipCutUnknown}); unequip bodies cut ${rc.unequipCut} (hidden slots resolved ${rc.unequipCutResolved}); unknown slots filled ${rc.filled}, left unknown ${rc.fillUnknown}; tile monster against the queue head's monster: ${rc.headAgree} agree, ${rc.headDisagree} differ, ${rc.headNone} no head monster`;

const stackKey = (f: any) => { const v = Object.values(f.stack) as any[]; return !v.length ? "no potion worn" : v.every((x) => x.how === "proven") ? "every stack proven" : "a stack estimated"; };
function potionTables(J: any, tag: string) {
  table(`4. ${tag}: by the potion stacks × band`, H, groupRows(J.known, (f) => `${stackKey(f)} · ${band(f.fc.p)}`, false));
  const sh = J.known.filter((f: any) => f.short.length);
  const o = sh.filter((f: any) => f.outcome === "win").length;
  md.push(`${tag}: ${sh.length} fights where an estimated restore stack is short of the fight's procs (it may run out inside the fight): wins forecast ${sh.reduce((a: number, f: any) => a + f.fc.p, 0).toFixed(1)} with the stack, ${sh.reduce((a: number, f: any) => a + f.pDry, 0).toFixed(1)} without it, observed ${o}.`, "");
  const dr = J.known.filter((f: any) => f.dry.length), nd = J.known.filter((f: any) => !f.dry.length);
  const sum = (a: any[], k: (f: any) => number) => a.reduce((x, f) => x + k(f), 0);
  table(`4a. ${tag}: the last fight before a potion stack is found dry, against every other fight`, ["", "fights", "wins forecast with the stack", "wins forecast without it", "wins observed", "losses observed"],
    [["a stack found dry right after it", dr.length, sum(dr, (f) => f.fc.p).toFixed(1), sum(dr, (f) => f.pNoDry).toFixed(1), dr.filter((f: any) => f.outcome === "win").length, dr.filter((f: any) => f.outcome === "loss").length],
     ["every other fight", nd.length, sum(nd, (f) => f.fc.p).toFixed(1), "—", nd.filter((f: any) => f.outcome === "win").length, nd.filter((f: any) => f.outcome === "loss").length]]);
  const lost = J.known.filter((f: any) => f.outcome === "loss" && f.fc.p >= 0.9);
  table(`4b. ${tag}: every lost fight at p ≥ 0.9`, ["time (UTC)", "character", "monster", "level", "p", "p without a short restore stack", "found dry right after", "p without it", "expected pass: turns, HP left / max", "stacks at the fight (q: proven = left at the next unequip or snapshot; estimated = the forward count)", "set"],
    lost.map((f: any) => [f.t.replace("T", " ").slice(0, 19), f.ch, f.monster, f.L, f.fc.p.toFixed(3), f.short.length ? f.pDry.toFixed(3) : "—", f.dry.join(", ") || "—", f.dry.length ? f.pNoDry.toFixed(3) : "—", `${f.fc.turns}, ${f.fc.hp}/${f.fc.maxHp}`, Object.entries(f.stack).map(([u, x]: any) => `${f.slots[u] || "(dry) " + (u === "utility1" ? "u1" : "u2")} ${x.how} ${Number.isFinite(x.q) ? Math.round(x.q) : "?"}`).join("; ") || "none", f.codes.filter((c: string) => item(c)?.type !== "utility").join(", ")]));
}
md.push(`# The forecast against play (task 025, settled point 3)`, "");
md.push(`Simulator: the working tree's src/sim (combat.ts FNV ${fnv(readFileSync(join(ROOT, "src/sim/combat.ts"), "utf8")).toString(16)}, stats.ts FNV ${fnv(readFileSync(join(ROOT, "src/sim/stats.ts"), "utf8")).toString(16)}). N = ${N} rolled fights a question (mulberry32 seeded by FNV-1a of level|sorted set|monster). ${linesRead} lines read (until ${UNTIL}); solo fight requests from ${FROM}: ${S.out.length}; July's (before ${FROM}, not rebuilt): ${julyFights}. Anchor: ${ANCHOR.file} at ${ANCHOR.t}. Start HP assumed full (the executor heals to full before every fight: src/state/exec.ts fightRound, the \`ch.hp < ch.max_hp\` branch); table 2c splits by what the log shows.`, "");
md.push(drainLine, "");
md.push("## A. Strict: every slot proven by the log", "");
table("1. By band of p", H, groupRows(JS.known, (f) => band(f.fc.p), false));
table("1b. By band, before the anchor and after it", H, groupRows(JS.known, (f) => `${f.pre ? "before" : "after"} · ${band(f.fc.p)}`, false));
table("2. By monster", HH, groupRows(JS.known, (f) => f.monster, true));
const multi = (known: any[]) => new Set([...new Set(known.map((f) => f.monster))].filter((m) => new Set(known.filter((f) => f.monster === m).map((f) => band(f.fc.p))).size > 1));
const ms = multi(JS.known);
table("2b. By monster × band (monsters in more than one band)", HH, groupRows(JS.known.filter((f) => ms.has(f.monster)), (f) => `${f.monster} · ${band(f.fc.p)}`, true));
table("2c. By what the log shows of the start HP × band", H, groupRows(JS.known, (f) => `${f.start} · ${band(f.fc.p)}`, false));
table("3. What the log cannot tell (strict)", ["reason", "fights"], reasons(JS.unk, JS.known.length));
potionTables(JS, "Strict");
md.push(`Strict rebuild: ${reconLine(S.rc)}. Level checks on every equip with a level condition before the anchor: ${lvlChecks}, violations ${lvlViol.length}.`, "");


// ───────────────────────── 6. the restore potions: what play drank against the forecast ─────────────────────────
{
  const ha = (f: any) => forecast(f.L, f.codes, f.monster, undefined, "HA", simHA);
  const restoreOf = (c: string) => (item(c)?.effects ?? []).some((e: any) => e.code === "restore");
  const J = readdirSync(join(ROOT, "logs/journal")).filter((x) => x.endsWith(".jsonl")).sort().flatMap((x) => readFileSync(join(ROOT, "logs/journal", x), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)));
  const steps = new Map(J.filter((r) => r.k === "step").map((r) => [`${r.key}|${r.who}`, r]));
  const rows: (string | number)[][] = [];
  const tot = { drunk: 0, cur: 0, ha: 0 };
  for (const r of J.filter((r) => r.k === "end" && r.m?.drunk)) {
    const st = steps.get(`${r.key}|${r.who}`);
    if (!st) continue;
    const fs = JS.known.filter((f) => f.ch === r.who && f.t >= st.t && f.t <= r.t);
    const pots = Object.keys(r.m.drunk).filter(restoreOf);
    if (!pots.length || !fs.length) continue;
    const n = (r.m.won ?? 0) + (r.m.lost ?? 0);
    const cur = (c: string) => fs.reduce((a, f) => a + (f.fc.usedR[c] ?? 0), 0), h = (c: string) => fs.reduce((a, f) => a + (ha(f).usedR[c] ?? 0), 0);
    for (const c of pots) { tot.drunk += r.m.drunk[c]; tot.cur += cur(c); tot.ha += h(c); }
    rows.push([r.t.replace("T", " ").slice(0, 19), r.who, st.work?.monster ?? "?", `${fs.length} of ${n}`, pots.map((c) => `${c.replace("_health_potion", "")} ${r.m.drunk[c]}`).join(", "), pots.map((c) => `${cur(c).toFixed(0)}`).join(", "), pots.map((c) => `${h(c).toFixed(0)}`).join(", "),
      [...new Set(fs.map((f) => ["utility1", "utility2"].map((u) => f.slots[u] ? f.slots[u].replace("_health_potion", "") : "—").join(" + ")))].join(" / ")]);
  }
  table("6a. The restore potions a step drank (journal `end` meter, logs/journal/) against the rolled forecasts of the same fights (strict rebuild): today's simulator, and H-a (each restore its own effect, in slot order)", ["end (UTC)", "character", "monster", "fights rebuilt of the step's", "drunk", "forecast today", "forecast H-a", "utility1 + utility2 at the fights"], rows,
    `Sum over these steps: drunk ${tot.drunk}, forecast today ${tot.cur.toFixed(0)}, H-a ${tot.ha.toFixed(0)}.`);
  const two = JS.known.filter((f: any) => ["utility1", "utility2"].every((u) => f.slots[u] && restoreOf(f.slots[u])));
  const rowsB = BORD.map((b) => {
    const fs = JS.known.filter((f: any) => band(f.fc.p) === b);
    return fs.length ? [b, fs.length, fs.reduce((a: number, f: any) => a + f.fc.p, 0).toFixed(1), fs.reduce((a: number, f: any) => a + ha(f).p, 0).toFixed(1), fs.filter((f: any) => f.outcome === "win").length] : null;
  }).filter(Boolean) as (string | number)[][];
  table("6b. Strict: by band of today's p — the wins today's forecast and H-a's give, and the wins observed", ["band (today's p)", "fights", "wins forecast today", "wins forecast H-a", "wins observed"], rowsB);
  const hw = two.filter((f: any) => f.hpObs != null && f.outcome === "win");
  md.push(`Strict, the ${two.length} fights wearing two restore potions: wins forecast today ${two.reduce((a: number, f: any) => a + f.fc.p, 0).toFixed(1)}, H-a ${two.reduce((a: number, f: any) => a + ha(f).p, 0).toFixed(1)}, observed ${two.filter((f: any) => f.outcome === "win").length}; HP left after a won fight with a rest right after (${hw.length}): observed median ${f1(med(hw.map((f: any) => f.hpObs)))}, today's rolled wins ${f1(med(hw.map((f: any) => f.fc.hpWinR)))}, H-a's rolled wins ${f1(med(hw.map((f: any) => ha(f).hpWinR)))}.`, "");
}
md.push("## B. Inferred: a cut list hides nothing the withdraw and deposit beside it do not show", "");
table("1. By band of p", H, groupRows(JI.known, (f) => band(f.fc.p), false));
table("2. By monster", HH, groupRows(JI.known, (f) => f.monster, true));
const mi = multi(JI.known);
table("2b. By monster × band", HH, groupRows(JI.known.filter((f) => mi.has(f.monster)), (f) => `${f.monster} · ${band(f.fc.p)}`, true));
table("2c. By the start HP × band", H, groupRows(JI.known, (f) => `${f.start} · ${band(f.fc.p)}`, false));
table("3. What the log cannot tell (inferred)", ["reason", "fights"], reasons(JI.unk, JI.known.length));
potionTables(JI, "Inferred");
md.push(`Inferred rebuild: ${reconLine(I.rc)}.`, "");
md.push("## Checks", "", ...checks.map((c) => `- ${c}`), ...lvlViol.slice(0, 20).map((v) => `- level violation: ${v}`), "");

// decision 28: the fights of 11-18 18:21:40 → 20:55:18 (report 010: 159 skeletons, 41 cows, 44 skeleton losses)
{
  const win = (f: any) => f.t >= "2026-11-18T18:21:00" && f.t <= "2026-11-18T20:56:00";
  const d = I.out.filter(win), strictOf = new Map(S.out.filter(win).map((f) => [f.t + f.ch, f]));
  const key = (f: any) => `${f.ch}|${f.monster}|${f.L}|${(f.codes ?? []).join(",")}`;
  const groups = new Map<string, any[]>();
  for (const f of d) { if (!f.fc) continue; const k = key(f); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(f); }
  table("5. Decision 28: 2026-11-18 18:21 → 20:56 UTC, inferred sets (the strict rebuild's unknown slots in the last column)", ["character", "monster", "level", "set", "fights", "p", "expected pass: win, turns, HP left / max", "wins", "losses", "first", "strict: unknown"],
    [...groups.values()].map((fs) => { const f = fs[0]; const sf = strictOf.get(f.t + f.ch); return [f.ch, f.monster, f.L, f.codes.join(", "), fs.length, f.fc.p.toFixed(3), `${f.fc.win ? "win" : "loss"}, ${f.fc.turns}, ${f.fc.hp}/${f.fc.maxHp}`, fs.filter((x) => x.outcome === "win").length, fs.filter((x) => x.outcome === "loss").length, f.t.slice(11, 19), sf ? unknownSlots(sf.slots).join(", ") || "none" : "?"]; }),
    `${d.length} fight requests in the window; outcomes: ${d.filter((f) => f.outcome === "win").length} wins, ${d.filter((f) => f.outcome === "loss").length} losses; by monster: ${[...new Set(d.map((f) => f.monster))].map((m) => `${m} ${d.filter((f) => f.monster === m).length} (${d.filter((f) => f.monster === m && f.outcome === "loss").length} lost)`).join(", ")}.`);
}
writeFileSync(join(OUT, "forecast.md"), md.join("\n"));
console.log(md.join("\n"));
