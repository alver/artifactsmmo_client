// Atlas model (npm run atlas): catalog, obtain tiers (core / plus / special), map reachability.
import { readFileSync } from "node:fs";
import { setDataReader } from "../../src/catalog/load";
import { loadCatalog, catalog } from "../../src/catalog";
import type { Item, Monster } from "../../src/types/catalog";

setDataReader(async (n) => JSON.parse(readFileSync(`public/data/${n}.json`, "utf8")));
await loadCatalog();
export const C = catalog();
export const raw = (n: string): any[] => JSON.parse(readFileSync(`public/data/${n}.json`, "utf8"));
export const npcItems = raw("npc_items");
export const events = raw("events");

export const EQUIP_TYPES = new Set(["weapon", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring", "amulet", "artifact", "rune", "utility", "bag"]);

// ---------- map reachability ----------
// Walkable = not "blocked"; "restricted" tiles are entered only through a transition;
// "conditional" tiles need their condition. Gated transitions carry their conditions.
type Gate = string;
const key = (layer: string, x: number, y: number) => `${layer}:${x},${y}`;
const tiles = new Map<string, any>();
for (const m of C.maps) tiles.set(key(m.layer, m.x, m.y), m);
const condLabel = (c: any): string =>
  c.operator === "cost" ? (c.code === "gold" ? `${c.value} gold toll` : `${c.code} (consumed)`)
  : c.operator === "has_item" ? `carry ${c.code}`
  : c.operator === "achievement_unlocked" ? `achievement ${c.code}`
  : `${c.code} ${c.operator} ${c.value}`;
export const reach = new Map<string, Gate[]>(); // tile -> cheapest gate list
{
  // BFS in rounds of increasing gate count.
  let frontier: [string, Gate[]][] = [[key("overworld", 4, 1), []]];
  const pending: [string, Gate[]][] = [];
  while (frontier.length) {
    const q = [...frontier];
    frontier = [];
    while (q.length) {
      const [k, gates] = q.shift()!;
      if (reach.has(k)) continue;
      const t = tiles.get(k);
      if (!t || t.access?.type === "blocked") continue;
      const g = gates;
      reach.set(k, g);
      if (t.access?.type === "conditional") continue; // gated endpoint (entered via pending), never a corridor
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of nb) {
        const nk = key(t.layer, t.x + dx, t.y + dy);
        const n = tiles.get(nk);
        if (!n || reach.has(nk) || n.access?.type === "blocked") continue;
        if (n.access?.type === "restricted" && t.access?.type !== "restricted") continue; // only via its transition
        if (n.access?.type === "conditional") { pending.push([nk, [...g, ...(n.access.conditions ?? []).map(condLabel)]]); continue; }
        q.push([nk, g]);
      }
      const tr = t.interactions?.transition;
      if (tr) {
        const tk = key(tr.layer, tr.x, tr.y);
        if (!reach.has(tk)) {
          if (tr.conditions?.length) pending.push([tk, [...g, ...tr.conditions.map(condLabel)]]);
          else q.push([tk, g]);
        }
      }
    }
    pending.sort((a, b) => a[1].length - b[1].length);
    const minLen = pending.length ? pending[0][1].length : 0;
    while (pending.length && pending[0][1].length === minLen) frontier.push(pending.shift()!);
  }
}
export interface Loc { x: number; y: number; layer: string; name: string; gates: Gate[] | null }
export const contentLocs = new Map<string, Loc[]>(); // "monster:wolf" -> tiles
for (const m of C.maps) {
  const c = m.interactions?.content;
  if (!c) continue;
  const k = `${c.type}:${c.code}`;
  const arr = contentLocs.get(k) ?? [];
  arr.push({ x: m.x, y: m.y, layer: m.layer, name: m.name, gates: reach.get(key(m.layer, m.x, m.y)) ?? null });
  contentLocs.set(k, arr);
}
export const eventOf = new Map<string, any>(); // "monster:demon" -> event
for (const e of events) eventOf.set(`${e.content.type}:${e.content.code}`, e);

/** Availability of a map content: static (with gates) | event | none. */
export function availability(type: string, code: string): { kind: "static" | "event" | "none"; gates: Gate[]; locs: Loc[]; event?: any } {
  const locs = (contentLocs.get(`${type}:${code}`) ?? []);
  const ok = locs.filter((l) => l.gates);
  if (ok.length) {
    const best = ok.reduce((a, b) => (a.gates!.length <= b.gates!.length ? a : b));
    return { kind: "static", gates: best.gates!, locs };
  }
  const ev = eventOf.get(`${type}:${code}`);
  if (ev) return { kind: "event", gates: [], locs, event: ev };
  return { kind: "none", gates: [], locs };
}

// ---------- sources + obtainability tier ----------
// tier 0 = core (always-on static sources), 1 = plus (tasks crystals, gems, gold, rare drops,
// achievements, toll areas), 2 = special (events, bosses, keys, very rare), 9 = unobtainable.
export type Tier = 0 | 1 | 2 | 9;
export const TIER_NAME: Record<number, string> = { 0: "core", 1: "plus", 2: "special", 9: "none" };
export interface Source { kind: string; tier: Tier; flags: string[]; label: string; detail: any }
const gateTier = (gates: Gate[]): { tier: Tier; flags: string[] } => {
  let tier: Tier = 0;
  const flags: string[] = [];
  for (const g of gates) {
    if (g.includes("gold toll")) { tier = Math.max(tier, 1) as Tier; flags.push(`area: ${g}`); }
    else if (g.startsWith("achievement")) { tier = Math.max(tier, 1) as Tier; flags.push(`area: ${g}`); }
    else { tier = Math.max(tier, 2) as Tier; flags.push(`area: ${g}`); }
  }
  return { tier, flags };
};
const rateTier = (rate: number): Tier => (rate >= 500 ? 2 : rate >= 50 ? 1 : 0);

export const sourcesOf = new Map<string, Source[]>();
const addSrc = (code: string, s: Source) => { const a = sourcesOf.get(code) ?? []; a.push(s); sourcesOf.set(code, a); };
for (const r of C.resources.values()) {
  const av = availability("resource", r.code);
  for (const d of r.drops) {
    let tier: Tier = rateTier(d.rate);
    const flags: string[] = [];
    if (d.rate >= 50) flags.push(`rare gather 1/${d.rate}`);
    if (av.kind === "event") { tier = 2; flags.push(`event resource: ${av.event.name}`); }
    else if (av.kind === "none") { tier = 9; }
    else { const g = gateTier(av.gates); tier = Math.max(tier, g.tier) as Tier; flags.push(...g.flags); }
    addSrc(d.code, { kind: "gather", tier, flags, label: `${r.skill} ${r.level} · ${r.code}${d.rate > 1 ? ` 1/${d.rate}` : ""}`, detail: { res: r.code, skill: r.skill, level: r.level, rate: d.rate, qty: (d.min_quantity + d.max_quantity) / 2 } });
  }
}
for (const m of C.monsters.values()) {
  const av = availability("monster", m.code);
  for (const d of m.drops) {
    let tier: Tier = rateTier(d.rate);
    const flags: string[] = [];
    if (d.rate >= 50) flags.push(`rare drop 1/${d.rate}`);
    if (m.type !== "normal") { tier = 2; flags.push(`${m.type} ${m.code}`); }
    if (av.kind === "event") { tier = 2; flags.push(`event monster: ${av.event.name}`); }
    else if (av.kind === "none") tier = 9;
    else { const g = gateTier(av.gates); tier = Math.max(tier, g.tier) as Tier; flags.push(...g.flags); }
    addSrc(d.code, { kind: "drop", tier, flags, label: `${m.code} (Lv ${m.level}) 1/${d.rate}`, detail: { monster: m.code, level: m.level, rate: d.rate, qty: (d.min_quantity + d.max_quantity) / 2 } });
  }
}
const npcAvail = (npc: string) => availability("npc", npc);
for (const o of npcItems) {
  if (o.buy_price == null) continue;
  const av = npcAvail(o.npc);
  let tier: Tier = 0;
  const flags: string[] = [];
  if (av.kind === "event") { tier = 2; flags.push(`event NPC: ${av.event.name}`); }
  else if (av.kind === "none") tier = 9;
  else { const g = gateTier(av.gates); tier = g.tier; flags.push(...g.flags); }
  if (o.currency === "gold") { tier = Math.max(tier, 1) as Tier; flags.push(`${o.buy_price.toLocaleString()} gold`); }
  addSrc(o.code, { kind: "npc", tier, flags, label: `${o.npc}: ${o.buy_price} ${o.currency}`, detail: { npc: o.npc, currency: o.currency, price: o.buy_price } });
}
for (const a of C.achievements.values()) {
  for (const it of a.rewards.items ?? []) {
    const obj = a.objectives.map((o) => `${o.type}${o.target ? " " + o.target : ""} ×${o.total}`).join(", ");
    const lvlAch = a.objectives.every((o) => o.type === "combat_level");
    addSrc(it.code, { kind: "achievement", tier: lvlAch ? 1 : 2, flags: [`achievement ${a.code} (${obj}) ×${it.quantity} once`], label: `achievement ${a.code}`, detail: { ach: a.code, qty: it.quantity } });
  }
}
// tasks coins: item/monster tasks pay 2-5 coins each.
addSrc("tasks_coin", { kind: "task", tier: 1, flags: ["tasks"], label: "task reward (2-5 per task)", detail: {} });

// Resolve each item's best (lowest-tier) way to get it, recursively through recipes.
export interface Obtain { tier: Tier; flags: string[]; via: string }
const obtainMemo = new Map<string, Obtain>();
export function obtain(code: string, depth = 0): Obtain {
  const m = obtainMemo.get(code);
  if (m) return m;
  if (depth > 8) return { tier: 9, flags: ["cycle"], via: "?" };
  obtainMemo.set(code, { tier: 9, flags: ["cycle"], via: "?" }); // cycle guard
  const opts: Obtain[] = [];
  for (const s of sourcesOf.get(code) ?? []) {
    let tier = s.tier;
    const flags = [...s.flags];
    if (s.kind === "npc" && s.detail.currency !== "gold") {
      const cur = obtain(s.detail.currency, depth + 1);
      tier = Math.max(tier, cur.tier) as Tier;
      flags.push(...cur.flags);
      if (["jasper_crystal", "astralyte_crystal", "magical_cure", "prime_fabric"].includes(code)) flags.push(`tasks crystal ${code}`);
    }
    opts.push({ tier, flags, via: s.label });
  }
  const it = C.items.get(code);
  if (it?.craft) {
    let tier: Tier = 0;
    const flags: string[] = [];
    for (const g of it.craft.items) {
      const o = obtain(g.code, depth + 1);
      tier = Math.max(tier, o.tier) as Tier;
      flags.push(...o.flags);
    }
    if (["topaz", "ruby", "emerald", "sapphire", "diamond", "alexandrite"].includes(code)) flags.push(`gem ${code}`);
    opts.push({ tier, flags, via: `craft ${it.craft.skill} ${it.craft.level}` });
  }
  opts.sort((a, b) => a.tier - b.tier || a.flags.length - b.flags.length);
  const best = opts[0] ?? { tier: 9 as Tier, flags: ["no source"], via: "none" };
  const res = { ...best, flags: [...new Set(best.flags)] };
  obtainMemo.set(code, res);
  return res;
}
for (const it of C.items.values()) obtain(it.code);

export const itemOf = (c: string): Item => C.items.get(c)!;
export const monsterOf = (c: string): Monster => C.monsters.get(c)!;
