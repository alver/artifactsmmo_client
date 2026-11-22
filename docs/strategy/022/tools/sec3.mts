// sec3.mts --tree <dir> --world <file> --out <json>: section 3 — what a combat level costs and what gear buys, on the fixed
// World (P0s: config.home 1). Per fighter at its level and +5, +10, +15: the XP pick and the three best XP monsters it wins
// safely, seconds a kill (the fight alone and the potions' making apart), potions a kill, hours a level — with (i) today's
// pool, (ii) every piece the three crafters can make today, (iii)–(v) with the crafters at 30, 35, 40; a piece with an
// event, boss, tasks-coin or gold material only in the "+special" column; at today's potion price (the chain's, the stock
// left out) and with potions free (potionK 0). Then every level to 45 (the pick only) for the roads, and the points
// behind combat by gate.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
(globalThis as any).localStorage ??= { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 };
(globalThis as any).fetch = () => Promise.reject(new Error("no request"));
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const tree = arg("tree")!;
process.chdir(tree);
const imp = (p: string) => import(pathToFileURL(`${tree}/${p}`).href);
const { setDataReader } = await imp("src/catalog/load.ts");
const cat = await imp("src/catalog/index.ts");
const { atlas } = await imp("src/catalog/atlas.ts");
const { bankPlus } = await imp("src/plan/planner/forward.ts");
const reach = await imp("src/plan/planner/reach.ts");
const cost = await imp("src/plan/planner/cost.ts");
const cons = await imp("src/plan/planner/consumables.ts");
const { pickMonster } = await imp("src/plan/planner/pick.ts");
const { sourceFor, targetsOf, unhandledOf, isDone } = await imp("src/plan/planner/targets.ts");
const { tradeOf, billOf, recipeDemand } = await imp("src/plan/planner/supply.ts");
const { crafterOf } = await imp("src/plan/planner/roles.ts");
const { fightXp } = await imp("src/plan/xp.ts");
const { killSeconds, canEquip } = await imp("src/plan/bis.ts");
const { SLOTS_FOR_TYPE } = await imp("src/types/api.ts");
setDataReader(async (name: string) => JSON.parse(readFileSync(`${tree}/public/data/${name}.json`, "utf8")));
await cat.loadCatalog();
const t0 = performance.now();
const snap = JSON.parse(readFileSync(arg("world")!, "utf8"));
const live = snap.world;
live.config = { ...live.config, home: 1 };
const world0 = { ...live, bank: bankPlus(live.bank, new Map(Object.entries(live.bags ?? {}))), bags: undefined, bankSlots: undefined, nextExpansion: undefined, current: {} };
const bare = cons.gearWorld(world0); // the pool without its potions: a potion is priced at its chain
const xpNeeded: number[] = atlas()?.xpNeeded ?? [];
const GC = ["weaponcrafting", "gearcrafting", "jewelrycrafting"];
const lvl = (c: any, l: string) => (l === "combat" ? c.level : c[`${l}_level`] ?? 0);

// what a piece's materials need: event, boss, tasks coins, gold (walked down the recipes)
const specialMemo = new Map<string, string[]>();
function special(code: string, depth = 0): string[] {
  if (specialMemo.has(code)) return specialMemo.get(code)!;
  const out = new Set<string>();
  const r = cat.item(code)?.craft;
  for (const ing of r?.items ?? []) {
    if (cat.item(ing.code)?.craft && depth < 6) { special(ing.code, depth + 1).forEach((x) => out.add(x)); continue; }
    const s = sourceFor(ing.code);
    if (typeof s === "string") {
      const t = tradeOf(ing.code, true);
      if (ing.code === "tasks_coin" || t?.work.currency === "tasks_coin") out.add("coins");
      else if (t?.work.currency === "gold") out.add("gold");
      else if (!t) out.add("none"); // a trade paid in a material (cowhide for hard leather) is ordinary
      continue;
    }
    for (const g of s.gates) { if (g.kind === "event") out.add("event"); if (g.kind === "group") out.add("boss"); if (g.kind === "layer") out.add("toll"); }
    if (s.work.kind === "kill" && ["boss", "raid_boss"].includes(cat.monster(s.work.monster)?.type)) out.add("boss");
  }
  const a = [...out].sort();
  specialMemo.set(code, a);
  return a;
}
// the pieces the three crafters can make at skill N (N null = their skill today)
const GEAR_TYPES = new Set(Object.keys(SLOTS_FOR_TYPE).filter((t) => !["utility", "bag", "rune", "artifact"].includes(t)));
function piecesAt(N: number | null): { plain: string[]; special: string[] } {
  const plain: string[] = [], spec: string[] = [];
  for (const it of cat.catalog().items.values()) {
    if (!it.craft || !GC.includes(it.craft.skill) || !GEAR_TYPES.has(it.type)) continue;
    const who = world0.characters.find((c: any) => c.name === crafterOf(it.craft.skill, world0));
    const at = N ?? lvl(who, it.craft.skill);
    if (it.craft.level > at) continue;
    (special(it.code).length ? spec : plain).push(it.code);
  }
  return { plain, special: spec };
}
const withPieces = (w: any, codes: string[]) => ({ ...w, bank: bankPlus(w.bank, new Map(codes.map((c) => [c, (cat.item(c)?.type === "ring" ? 2 : 1) * 5]))) });
const POOLS: [string, number | null | undefined][] = [["i", undefined], ["ii", null], ["iii", 30], ["iv", 35], ["v", 40]];
const worlds: Record<string, any> = {};
const pieceLists: Record<string, any> = {};
for (const [k, N] of POOLS) {
  if (N === undefined) { worlds[`${k}|plain`] = bare; continue; }
  const p = piecesAt(N);
  pieceLists[k] = { plain: p.plain.length, special: p.special.length, specialWhy: Object.fromEntries(p.special.map((c) => [c, special(c).join("+")])) };
  worlds[`${k}|plain`] = withPieces(bare, p.plain);
  worlds[`${k}|special`] = withPieces(bare, [...p.plain, ...p.special]);
}
const free = (w: any) => ({ ...w, config: { ...w.config, potionK: 0 } });

const emptyMemo = new WeakMap<any, any>();
const emptyOf = (w: any) => { let e = emptyMemo.get(w); if (!e) emptyMemo.set(w, (e = { ...w, bank: [] })); return e; };
// one fight: seconds a kill (whole, the fight alone, the potions' making), potions a kill, XP a kill. Today's price: the
// better of the gear alone (fightRec) and the gear with every potion at its chain's price, the stock left out (potionRec,
// as consumables.ts potionSet asks it, without its three-level bound); free: potionK 0 (every potion an extra, free).
function fightAt(c: any, w: any, m: string) {
  const isFree = w.config.potionK === 0;
  const price = (code: string): number => (isFree ? 0 : cons.chainSec(emptyOf(w), c.name, code)); // the stock left out (consumables.ts potionSet)
  const opts = [reach.fightRec(c, w, m)];
  if (!isFree) opts.push(reach.potionRec(c, w, m, cons.potionCands(c).filter((p: string) => Number.isFinite(price(p))), price));
  const mon = cat.monster(m);
  let best: any;
  for (const r of opts) {
    if (!r || !reach.wins(r, w)) continue;
    const xp = fightXp(mon.level, mon.hp, mon.type, c.level, reach.setWisdom(c, r));
    const food = reach.potionPrice(w, c.name).food?.(r.forecast.maxHp - r.forecast.hpRemaining);
    const fight = killSeconds(r.forecast, () => 0, food) + cost.killWalk(c, w, m);
    const making = Object.entries(r.forecast.used ?? {}).reduce((t, [code, u]: any) => t + u * price(code), 0);
    const whole = fight + making;
    if (!best || whole / xp < best.whole / best.xp) best = { m, xp, whole, fight, making, used: r.forecast.used ?? {}, set: r.codes, food: food?.code };
  }
  return best;
}
function top(c: any, w: any) {
  const out: any[] = [];
  for (const mon of cat.catalog().monsters.values()) {
    if (["boss", "raid_boss"].includes(mon.type) || mon.level > c.level + 10 || fightXp(mon.level, mon.hp, mon.type, c.level) <= 0) continue;
    if (!reach.nearestSpot(reach.placeOf(c), "monster", mon.code, w, c.name)) continue;
    const f = fightAt(c, w, mon.code);
    if (f && f.xp > 0) out.push({ ...f, hLevel: (xpNeeded[c.level] ?? Infinity) / ((f.xp / f.whole) * 3600) });
  }
  return out.sort((a, b) => a.hLevel - b.hLevel).slice(0, 3);
}
const res: any = { pieceLists, table: [], roads: [], points: null };
const fighters = world0.characters;
for (const ch of fighters) {
  for (const d of [0, 5, 10, 15]) {
    const L = Math.min(50, ch.level + d);
    const c = reach.chAt(ch, L);
    for (const [k] of POOLS) for (const sp of k === "i" ? ["plain"] : ["plain", "special"]) for (const pr of ["today", "free"]) {
      const w0 = worlds[`${k}|${sp}`], w = pr === "free" ? free(w0) : w0;
      const pick = pickMonster(c, w, new Set());
      const t = top(c, w);
      res.table.push({ who: ch.name, L, pool: k, sp, pr, pick: pick?.monster ?? null, top: t.map((x: any) => ({ m: x.m, whole: +x.whole.toFixed(1), fight: +x.fight.toFixed(1), making: +x.making.toFixed(1), used: x.used, hLevel: +x.hLevel.toFixed(2), set: x.set, food: x.food })) });
    }
    process.stderr.write(`${ch.name} +${d} ${((performance.now() - t0) / 1000).toFixed(0)} s\n`);
  }
}
// the roads: every level from its own to 45, the pick only, plain pools, both prices
for (const ch of fighters) for (const [k] of POOLS) for (const sp of k === "i" ? ["plain"] : ["plain", "special"]) for (const pr of ["today", "free"]) {
  const w0 = worlds[`${k}|${sp}`], w = pr === "free" ? free(w0) : w0;
  const levels: any[] = [];
  for (let L = ch.level; L < 45; L++) {
    const c = reach.chAt(ch, L);
    const t = top(c, w)[0];
    if (!t) { levels.push({ L, stop: "no safe XP monster" }); break; }
    const kills = (xpNeeded[L] ?? Infinity) / t.xp;
    const unmade = Object.keys(t.used).filter((p) => !Number.isFinite(cons.chainSec(emptyOf(w), c.name, p)));
    levels.push({ L, m: t.m, kills: Math.round(kills), fightH: +((kills * t.fight) / 3600).toFixed(2), potionH: +((kills * t.making) / 3600).toFixed(2), used: Object.fromEntries(Object.entries(t.used).map(([p, u]: any) => [p, Math.round(u * kills)])), set: t.set, ...(unmade.length ? { unmade } : {}) });
  }
  res.roads.push({ who: ch.name, from: ch.level, pool: k, sp, pr, levels });
  process.stderr.write(`road ${ch.name} ${k} ${pr} ${((performance.now() - t0) / 1000).toFixed(0)} s\n`);
}
// the gear road: the new pieces of the sets along each road, their bill (supply + crafts) — and the crafters' level roads
// a piece is new when today's bank (the real one, potions aside) holds none; a potion is not gear (its making is potionH)
const newOf = (codes: string[]) => [...new Set(codes)].filter((c) => cat.item(c)?.type !== "utility" && !bare.bank.some((b: any) => b.code === c) && cat.item(c)?.craft);
for (const r of res.roads) {
  const pieces = new Map<string, number>();
  for (const l of r.levels) for (const c of newOf(l.set ?? [])) pieces.set(c, Math.max(pieces.get(c) ?? 0, (l.set as string[]).filter((x) => x === c).length));
  const demand = [...pieces].flatMap(([c, n]) => recipeDemand(c, n));
  const bill = demand.length ? billOf(bare, r.who, demand) : { hours: 0, crafts: 0, gated: [] };
  r.gear = { pieces: Object.fromEntries(pieces), billH: Number.isFinite(bill.hours) ? +bill.hours.toFixed(2) : "inf", crafts: +(bill.crafts ?? 0).toFixed(2), gated: bill.gated, out: (bill as any).out ?? [], events: ((bill as any).events ?? []).map((e: any) => `${e.code}:${e.event}:${Number.isFinite(e.hours) ? Math.round(e.hours) : "inf"}h`) };
}
res.crafters = {};
for (const lane of GC) {
  const who = world0.characters.find((c: any) => c.name === crafterOf(lane, world0));
  const L = lvl(who, lane);
  res.crafters[lane] = { who: who.name, now: L, to: Object.fromEntries([30, 35, 40, 45].map((N) => [N, +cost.hoursToLevel(lane, L, N, bare, who).toFixed(1)])), perLevel: Array.from({ length: 45 - L }, (_, i) => +cost.levelHoursEstimate(lane, L + i, bare, who).toFixed(2)) };
}
// the points behind combat: per open achievement the combat level its gates ask (a level gate of combat; a win gate: the
// map's guess `level`), and what else it waits for (an event, a group, a raid, another layer, use)
const un = unhandledOf(world0);
const byAch = new Map<string, any>();
for (const a of world0.achievements) if (!isDone(a)) byAch.set(a.code, { code: a.code, points: a.points, combat: 0, other: new Set<string>() });
for (const t of targetsOf(world0)) {
  const e = byAch.get(t.achievement);
  if (!e) continue;
  for (const g of t.gates) {
    if (g.kind === "level" && g.lane === "combat") e.combat = Math.max(e.combat, g.level);
    if (g.kind === "win") e.combat = Math.max(e.combat, g.level);
    if (g.kind === "event") e.other.add("event");
    if (g.kind === "group") e.other.add("group");
    if (g.kind === "layer") e.other.add("toll/layer");
  }
  if (t.work.kind === "use") e.other.add("use");
}
for (const u of un) { const e = byAch.get(u.achievement); if (e) e.other.add(u.why.includes("raid") ? "raid" : "unhandled"); }
res.points = [...byAch.values()].map((e) => ({ ...e, other: [...e.other] }));
res.sec = (performance.now() - t0) / 1000;
writeFileSync(arg("out")!, JSON.stringify(res));
process.exit(0);
