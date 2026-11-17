// The progression atlas: every level against every monster with the client's own fight
// simulator, gear tiers, crafting/gathering hours — written to public/data/atlas.json
// (shape: src/catalog/atlas.ts), which the Roadmap tab and its milestones read.
// Re-run after scripts/fetch-data.mjs (new season), or when the sim/BIS model changes. ~6 min.
//   npm run atlas
import { readFileSync, writeFileSync } from "node:fs";
import { C, obtain, availability, sourcesOf, EQUIP_TYPES, npcItems } from "./atlas/model.mts";
import { fight, minLevel, availableAt, unlocked, minLevelIdeal } from "./atlas/combat.mts";
import { XP_NEEDED, killFor, cost, calibrateCoin, reqs, craftXpOf, gatherXpOf, bestTool, resAvail } from "./atlas/econ.mts";
import { gatherSec } from "../src/plan/xp";
import type { Atlas } from "../src/catalog/atlas";

const t0 = Date.now();
const log = (s: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${s}`);

const MONS = [...C.monsters.values()].filter((m) => m.type !== "raid_boss").sort((a, b) => a.level - b.level || a.code.localeCompare(b.code));
const freeAccess = (m: string) => { const a = availability("monster", m); return a.kind === "static" && a.gates.every((g) => g.includes("gold toll")); };

log("monster min levels");
const monsters: Atlas["monsters"] = MONS.map((m) => {
  const av = availability("monster", m.code);
  return {
    code: m.code, level: m.level, type: m.type,
    minLevel: [0, 1, 2].map((T) => minLevel(m.code, T)), kill: killFor(m.code), ideal: minLevelIdeal(m.code),
    access: { kind: av.kind, gates: av.gates, event: av.event?.name ?? null }, free: freeAccess(m.code),
  };
});

log("leveling path");
const path: Atlas["path"] = [];
for (let L = 1; L <= 49; L++) {
  const row: Atlas["path"][number] = { L, t: [], alt: [], slots: {} };
  for (const T of [0, 1, 2]) {
    let best: ReturnType<typeof fight> | null = null;
    let bestEvent: ReturnType<typeof fight> | null = null;
    for (const m of MONS) {
      if (m.level < L - 9 || m.level > L + 12 || m.type === "boss") continue;
      if (availability("monster", m.code).kind === "none") continue;
      const f = fight(L, m.code, T);
      if (!f.win || !f.safe || f.xps <= 0) continue;
      if (freeAccess(m.code)) { if (!best || f.xps > best.xps) best = f; }
      else if (!bestEvent || f.xps > bestEvent.xps) bestEvent = f;
    }
    row.t.push(best && { m: best.m, xps: best.xps, killSec: best.killSec, hours: XP_NEEDED[L] / best.xps / 3600 });
    row.alt.push(bestEvent && bestEvent.xps > (best?.xps ?? 0) ? { m: bestEvent.m, xps: bestEvent.xps } : null);
    if (T === 1 && best) row.slots = best.slots;
  }
  path.push(row);
}

const BANDS: [number, number][] = [[1, 9], [10, 14], [15, 19], [20, 24], [25, 29], [30, 34], [35, 39], [40, 44], [45, 50]];
const GROUP_OF = (s: string) => (s.startsWith("ring") ? "ring" : s.startsWith("artifact") ? "artifact" : s.startsWith("utility") ? "utility" : s);
log("bands");
const bisUse = new Map<string, number>();
const bands: Atlas["bands"] = BANDS.map(([a, b]) => {
  // The band's set = per slot group, the picks most often in the band-end BIS vs the band's monsters.
  const mons = MONS.filter((m) => m.level >= a - 4 && m.level <= b + 7);
  const loadout = [0, 1, 2].map((T) => {
    const per: Record<string, Map<string, number>> = {};
    for (const m of mons) {
      const f = fight(b, m.code, T);
      if (!f.win) continue;
      for (const [s, c] of Object.entries(f.slots)) {
        (per[GROUP_OF(s)] ??= new Map()).set(c, (per[GROUP_OF(s)].get(c) ?? 0) + 1);
        bisUse.set(`${T}:${c}`, (bisUse.get(`${T}:${c}`) ?? 0) + 1);
      }
    }
    return Object.fromEntries(Object.entries(per).map(([g, m]) => [g, [...m.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))]));
  });
  const gear = [...C.items.values()].filter((it) => EQUIP_TYPES.has(it.type) && it.level >= a && it.level <= b).map((it) => it.code);
  return { a, b, loadout, gear };
});

log("items");
calibrateCoin();
const coin = calibrateCoin(); // twice: task-item costs that recurse into coins settle on the second pass
const items: Atlas["items"] = [...C.items.values()].filter((it) => EQUIP_TYPES.has(it.type) || it.craft || (sourcesOf.get(it.code) ?? []).length).map((it) => {
  const o = obtain(it.code);
  const r = reqs(it.code);
  const c = cost(it.code, 2);
  return {
    code: it.code, tier: o.tier, flags: o.flags, via: o.via,
    reqSkills: r.skills, reqMonsters: r.monsters,
    costSec: Number.isFinite(c.sec) ? Math.round(c.sec) : null, costGold: Number.isFinite(c.gold) ? Math.round(c.gold) : null,
    availAt: [0, 1, 2].map((T) => availableAt(it.code, T)),
    bis: [0, 1, 2].map((T) => bisUse.get(`${T}:${it.code}`) ?? 0),
  };
});

log("craft training");
const craftTrain: Atlas["craftTrain"] = {};
for (const sk of ["weaponcrafting", "gearcrafting", "jewelrycrafting", "cooking", "alchemy"]) {
  const recipes = [...C.items.values()].filter((it) => it.craft?.skill === sk);
  craftTrain[sk] = [];
  for (let S = 1; S <= 49; S++) {
    const best = recipes.filter((it) => it.craft!.level <= S && S - it.craft!.level <= 10 && obtain(it.code).tier <= 1)
      .map((it) => { const xp = craftXpOf(it.code, S); const c = cost(it.code, 1); const sec = c.sec * it.craft!.quantity; return { code: it.code, xp, gold: c.gold, xph: sec > 0 && Number.isFinite(sec) ? (xp / sec) * 3600 : 0 }; })
      .filter((x) => x.xp > 0 && x.xph > 0 && (x.gold ?? 0) === 0).sort((x, y) => y.xph - x.xph)[0];
    craftTrain[sk].push(best ? { code: best.code, xph: Math.round(best.xph), hours: XP_NEEDED[S] / best.xph } : null);
  }
}

log("gather training");
const gatherTrain: Atlas["gatherTrain"] = {};
for (const sk of ["mining", "woodcutting", "fishing", "alchemy"]) {
  const nodes = [...C.resources.values()].filter((r) => r.skill === sk);
  gatherTrain[sk] = [];
  for (let S = 1; S <= 49; S++) {
    const tool = bestTool(sk, S, 1);
    const best = nodes.filter((r) => r.level <= S && S - r.level <= 10).map((r) => {
      const av = resAvail(r.code);
      const xp = gatherXpOf(r.level, S);
      const sec = gatherSec(r.level) * (1 - (tool?.pct ?? 0) / 100);
      return { code: r.code, ok: av.kind === "static" && av.gates.every((g) => g.includes("gold toll")), xp, xph: (xp / sec) * 3600 };
    }).filter((x) => x.ok && x.xp > 0).sort((x, y) => y.xph - x.xph)[0];
    gatherTrain[sk].push(best ? { code: best.code, xph: Math.round(best.xph), hours: XP_NEEDED[S] / best.xph, tool: tool?.code ?? null } : null);
  }
}

const out: Atlas = {
  generatedAt: new Date().toISOString(),
  coinSec: Math.round(coin.median),
  xpNeeded: XP_NEEDED,
  monsters, path, bands, items, craftTrain, gatherTrain,
  unlocked: [0, 1, 2].map((T) => Object.fromEntries(unlocked[T])),
  coinPrices: Object.fromEntries(npcItems.filter((o) => o.currency === "tasks_coin" && o.buy_price != null).map((o) => [o.code, o.buy_price])),
  events: JSON.parse(readFileSync("public/data/events.json", "utf8")).map((e: { code: string; name: string; content: { type: string; code: string }; duration: number; rate: number }) => ({ code: e.code, name: e.name, content: e.content, duration: e.duration, rate: e.rate })),
};
writeFileSync(process.argv[2] ?? "public/data/atlas.json", JSON.stringify(out));
log("done");
process.exit(0);
