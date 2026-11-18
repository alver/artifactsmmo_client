// Task 004 — the achievement map's tables. Offline: reads public/data/*.json and
// docs/design/snapshot/*.json, prints markdown. No request, no storage, no engine import
// (src/catalog pulls in the API client, so the two formulas needed are restated here).
//   node --import tsx scripts/design/achievement-map.mts
import { readFileSync } from "node:fs";
import assert from "node:assert";

const D = (n: string): any => JSON.parse(readFileSync(`public/data/${n}.json`, "utf8"));
const S = (n: string): any => JSON.parse(readFileSync(`docs/design/snapshot/${n}.json`, "utf8")).data;

// ── inputs ───────────────────────────────────────────────────────────────────
const items = new Map<string, any>(D("items").map((i: any) => [i.code, i]));
const monsters = new Map<string, any>(D("monsters").map((m: any) => [m.code, m]));
const resources: any[] = D("resources");
const npcItems: any[] = D("npc_items");
const events: any[] = D("events");
const tasks: any[] = D("tasks");
const maps: any[] = D("maps");
const atlas = D("atlas");
const aMon = new Map<string, any>(atlas.monsters.map((m: any) => [m.code, m]));
const status = S("status"), account = S("account"), chars: any[] = S("characters"), ach: any[] = S("achievements");

// ── constants, each with its source ──────────────────────────────────────────
const UTIL = 0.873; // log: share of 2026-11-03 → 11-18 a character had < 10 min between two successful actions
const ACTIONS_PER_HOUR = 136; // log: successful actions per active character-hour, same period
const gatherSec = (lvl: number) => 29 + Math.max(1, Math.floor(lvl / 2)); // docs formula, as src/plan/xp.ts:55
const CRAFT_SEC = 5; // src/plan/xp.ts:57 (measured)
const GUESS_KILL = 300; // guess: the atlas has no kill time for these; its slowest known Lv 44–47 kills are 279–405 s
const BOSS_KILL = 600 * 3; // guess: a 10-minute round (fight + rest) for three characters, in character-seconds
const KEYS_PER_KILL = 3 / 25; // guess: three characters enter on one key each and fight 25 times before leaving
const TASK_SEC = 1.95 * 3600; // log: 783.8 active character-hours with a task-loop at the queue head ÷ 402 tasks completed, 2026-11-03 → 11-18
const OFFERING_SEC = 1200; // guess: 20 min to get and hand in one offering's items
const USE_SEC = 3; // docs: a `use` has a fixed 3 s cooldown
const EVENT_BIAS = 5; // an event-only source is taken over a static one only when it is this many times cheaper
const EVENT_MIN = 55; // of an event's 60 min, after the 5-minute poll and the walk
const FIGHTERS = chars.length;
const NOW = new Date(status.server_time);
const START = new Date(status.season.start_date);
const DEADLINE = new Date(START); DEADLINE.setUTCMonth(DEADLINE.getUTCMonth() + 4); // docs: "approximately 4 months"
const DEADLINE_ALT = new Date("2027-03-06T00:00:00Z"); // docs/rework.md: season 8's length (18 weeks) after 2026-10-31
const days = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 864e5;
const RAID_COIN: Record<string, string> = { enchanted_coin: "enchanted_fairy (pixie)", sonnengott_coin: "god_of_the_sun (sonnengott)" };
const CRAFT_GEAR = ["weaponcrafting", "gearcrafting", "jewelrycrafting"];
const GATHER = ["mining", "woodcutting", "fishing", "alchemy"];
const SKILLS = [...GATHER, ...CRAFT_GEAR, "cooking"];
const bandStart = (L: number): number => atlas.bands.find((b: any) => L >= b.a && L <= b.b)?.a ?? 45;

// ── where things are ─────────────────────────────────────────────────────────
const eventOf = new Map<string, any>(events.map((e) => [`${e.content.type}:${e.content.code}`, e]));
const tilesOf = (type: string, code: string) => maps.filter((m) => m.interactions?.content?.type === type && m.interactions.content.code === code);
/** Reachable by plain `move` from the city: an overworld, standard-access tile off Sandwhisper Isle. */
const plain = (m: any) => m.layer === "overworld" && (m.access?.type ?? "standard") === "standard" && !m.name.startsWith("Sandwhisper");
const walkable = (type: string, code: string) => tilesOf(type, code).some(plain);
const area = (t: any) => (t.name.startsWith("Sandwhisper") || t.name === "Empress House" ? "Sandwhisper Isle: 1,000 gold boat each way" : t.access?.type === "restricted" ? "Enchanted Forest: 5,000 gold entry" : `${t.name} (${t.layer})`);
function place(type: string, code: string): { event?: any; flags: string[] } {
  const tiles = tilesOf(type, code);
  if (!tiles.length) {
    const e = eventOf.get(`${type}:${code}`);
    if (!e) return { flags: ["not on the map"] };
    const at = e.maps.map((x: any) => maps.find((m) => m.map_id === x.map_id)).filter(Boolean);
    return { event: e, flags: at.length && !at.some(plain) ? [`transition → ${area(at[0])}`] : [] };
  }
  if (walkable(type, code)) return { flags: [] };
  const t = tiles[0];
  const gates: string[] = type === "monster" ? (aMon.get(code)?.access.gates ?? []) : [];
  return { flags: [`transition → ${area(t)}`, ...gates.filter((g) => !g.includes("gold toll")).map((g) => `gate: ${g}`)] };
}

// ── combat gates and kill times (atlas) ──────────────────────────────────────
function gate(m: string): { lvl: number; basis: string } {
  const a = aMon.get(m);
  if (!a) return { lvl: 50, basis: "raid boss — not in the atlas" };
  const solo = a.type === "boss" ? "; solo sim, a group of three is not modelled" : "";
  if (a.minLevel[1].safe != null) return { lvl: a.minLevel[1].safe, basis: `plus gear, safe${solo}` };
  if (a.minLevel[2].safe != null) return { lvl: a.minLevel[2].safe, basis: `special gear, safe${solo}` };
  if (a.minLevel[2].win != null) return { lvl: a.minLevel[2].win, basis: `special gear, win but never safe${solo}` };
  return { lvl: 50, basis: `no farmable set wins by Lv 50; with any special item: Lv ${a.ideal.safe ?? a.ideal.win ?? "never"}${solo}` };
}
function killSec(m: string): { sec: number; basis: string } {
  const mon = monsters.get(m), a = aMon.get(m);
  let sec = mon.type === "boss" ? BOSS_KILL : a?.kill?.sec ?? GUESS_KILL;
  const basis = mon.type === "boss" ? "guess 3×600 s" : a?.kill ? `atlas kill.sec ${a.kill.sec}` : `guess ${GUESS_KILL} s`;
  for (const g of a?.access.gates ?? []) if (g.endsWith("(consumed)")) sec += unit(g.split(" ")[0]).sec * KEYS_PER_KILL;
  return { sec, basis };
}

// ── cost of one unit of an item ──────────────────────────────────────────────
interface Cost { site?: string; perAct?: number; gear: number; sec: number; act: number; lvl: number; skills: Record<string, number>; evSec: Record<string, number>; flags: Set<string>; spend: Record<string, number>; via: string }
const zero = (via = ""): Cost => ({ gear: 0, sec: 0, act: 0, lvl: 0, skills: {}, evSec: {}, flags: new Set(), spend: {}, via });
function add(a: Cost, b: Cost, k = 1): Cost {
  if (k) { a.sec += b.sec * k; a.act += b.act * k; } a.lvl = Math.max(a.lvl, b.lvl); a.gear = Math.max(a.gear, b.gear);
  for (const [s, l] of Object.entries(b.skills)) a.skills[s] = Math.max(a.skills[s] ?? 0, l);
  if (k) for (const [e, v] of Object.entries(b.evSec)) a.evSec[e] = (a.evSec[e] ?? 0) + v * k;
  if (k) for (const [c, v] of Object.entries(b.spend)) a.spend[c] = (a.spend[c] ?? 0) + v * k;
  for (const f of b.flags) a.flags.add(f);
  return a;
}
/** A `carry X` gate: every fighter needs an X; X's own needs (skills, events, a raid) become the monster's. */
function carry(c: Cost, m: string, copies: number): void {
  for (const g of aMon.get(m)?.access.gates ?? []) if (g.startsWith("carry ")) add(c, unit(g.slice(6)), copies);
}
function gatherCost(r: any, d: any): Cost {
  const per = d.rate / ((d.min_quantity + d.max_quantity) / 2), p = place("resource", r.code), c = zero(`gather ${r.code}${d.rate > 1 ? ` 1/${d.rate}` : ""}`);
  c.sec = gatherSec(r.level) * per; c.act = per; c.skills[r.skill] = r.level; c.site = `gather:${r.code}`; c.perAct = gatherSec(r.level);
  if (p.event) c.evSec[p.event.code] = c.sec;
  for (const f of p.flags) c.flags.add(f);
  return c;
}
function dropCost(m: any, d: any): Cost {
  const per = d.rate / ((d.min_quantity + d.max_quantity) / 2), p = place("monster", m.code), k = killSec(m.code), g = gate(m.code), c = zero(`${m.code} 1/${d.rate}`);
  c.sec = k.sec * per; c.act = per; c.lvl = c.gear = g.lvl; c.site = `kill:${m.code}`; c.perAct = k.sec;
  if (m.type === "boss") c.flags.add("boss: group of three");
  if (!aMon.get(m.code)?.kill) c.flags.add(`${m.code}: ${k.basis}`);
  if (p.event) c.evSec[p.event.code] = c.sec;
  for (const f of p.flags) c.flags.add(f);
  for (const gt of aMon.get(m.code)?.access.gates ?? []) if (gt.endsWith("(consumed)")) c.spend[gt.split(" ")[0]] = KEYS_PER_KILL * per;
  carry(c, m.code, 0);
  return c;
}
function craftCost(code: string): Cost {
  const r = items.get(code).craft, c = zero(`craft ${r.skill} ${r.level}`);
  for (const g of r.items) add(c, unit(g.code), g.quantity / r.quantity);
  c.sec += CRAFT_SEC / r.quantity; c.act += 1 / r.quantity; c.skills[r.skill] = Math.max(c.skills[r.skill] ?? 0, r.level);
  return c;
}
const memo = new Map<string, Cost>();
/** Cheapest way to one unit, by one character's seconds. A static source beats an event one unless the event's is
 *  EVENT_BIAS times cheaper; gold is never spent; achievement rewards are not counted as a source. */
function unit(code: string): Cost {
  const hit = memo.get(code);
  if (hit) return hit;
  const none = zero("no source"); none.sec = Infinity; none.flags.add(`${code}: no source`);
  memo.set(code, none); // cycle guard
  const opts: Cost[] = [];
  if (RAID_COIN[code]) { const c = zero("raid reward"); c.flags.add(`raid: ${RAID_COIN[code]}`); opts.push(c); }
  if (code === "tasks_coin") { const c = zero("tasks"); c.sec = atlas.coinSec; c.act = atlas.coinSec / 30; opts.push(c); }
  for (const r of resources) for (const d of r.drops) if (d.code === code) opts.push(gatherCost(r, d));
  for (const m of monsters.values()) if (m.type !== "raid_boss") for (const d of m.drops) if (d.code === code && !place("monster", m.code).flags.includes("not on the map")) opts.push(dropCost(m, d));
  if (items.get(code)?.craft) opts.push(craftCost(code));
  for (const o of npcItems) if (o.code === code && o.buy_price != null && o.currency !== "gold") { const c = add(zero(`${o.npc}: ${o.buy_price} ${o.currency}`), unit(o.currency), o.buy_price); c.act += 1; c.spend[o.currency] = (c.spend[o.currency] ?? 0) + o.buy_price; opts.push(c); }
  const ok = opts.filter((o) => Number.isFinite(o.sec));
  const isStatic = (o: Cost) => Object.keys(o.evSec).length === 0 && ![...o.flags].some((f) => f.startsWith("raid"));
  const best = ok.sort((a, b) => a.sec * (isStatic(a) ? 1 : EVENT_BIAS) - b.sec * (isStatic(b) ? 1 : EVENT_BIAS))[0] ?? none;
  memo.set(code, best);
  return best;
}

// ── tasks, recycling ─────────────────────────────────────────────────────────
const taskRows = tasks.filter((t) => t.level <= 30).map((t) => ((t.min_quantity + t.max_quantity) / 2) * (t.type === "monsters" ? killSec(t.code).sec : unit(t.code).sec)).filter(Number.isFinite);
const TASK_SEC_DATA = taskRows.reduce((s, x) => s + x, 0) / taskRows.length; // data + atlas: mean task of level ≤ 30, for comparison
const EQUIP = new Set(["weapon", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring", "amulet"]);
const recyclable = [...items.values()].filter((i) => i.craft && EQUIP.has(i.type)).map((i) => ({ code: i.code, c: craftCost(i.code) })).filter((x) => x.c.lvl === 0 && Number.isFinite(x.c.sec)).sort((a, b) => a.c.sec - b.c.sec)[0];

// ── one objective ────────────────────────────────────────────────────────────
interface Obj { key: string; text: string; left: number; cost: Cost; site?: string; what?: string; pays?: { code: string; qty: number }; can: string; counts: string; split: string }
const need = (c: Cost) => [...c.flags].some((f) => f.startsWith("transition") || f.startsWith("gate"));
const DOCS_ACH = "account-wide, all characters add up (docs)";
function objective(o: any): Obj {
  const left = Math.max(0, o.total - Math.min(o.progress, o.total));
  const text = `${o.type}${o.target ? " " + o.target : ""} ${o.progress}/${o.total}`;
  const c = zero();
  const out = (can: string, counts = DOCS_ACH, split = "yes", extra: Partial<Obj> = {}): Obj => ({ key: `${o.type}:${o.target}`, text, left, cost: c, can: left ? can : "done", counts, split: left ? split : "—", ...extra });
  const t = o.target;
  if (!left) return out("done");
  switch (o.type) {
    case "combat_kill": {
      const m = monsters.get(t);
      if (m.type === "raid_boss") {
        c.flags.add(`raid: ${m.code} (Lv ${m.level})`);
        return out("cannot — raid fights: the tile's content is `raid`, no queue item fights it", `${DOCS_ACH}; what counts as a raid "kill" is unknown`, "unknown");
      }
      const p = place("monster", t), k = killSec(t), g = gate(t);
      c.sec = k.sec * left; c.act = left; c.lvl = c.gear = g.lvl; c.via = `${g.basis}; ${k.basis}`;
      if (p.event) c.evSec[p.event.code] = c.sec;
      for (const f of p.flags) c.flags.add(f);
      carry(c, t, 3);
      if (m.type === "boss") {
        c.flags.add("boss: group of three");
        for (const gt of aMon.get(t)?.access.gates ?? []) if (gt.endsWith("(consumed)")) c.spend[gt.split(" ")[0]] = 3;
        return out(need(c) ? "cannot — the boss is behind a transition; then by hand" : p.event ? "by hand — Fleet → Group fight, while the event is up" : "by hand — Fleet → Group fight (Prepare, then Fight: one fight per click)", `${DOCS_ACH}; whether each of the three gets kill credit is not stated`, "needs three at once", { site: `kill:${t}`, what: "kill" });
      }
      if (p.event) return out("auto — event standing order: ONE free character, safe wins only, while the event is up", DOCS_ACH, "yes", { site: `kill:${t}`, what: "kill" });
      if (need(c)) return out("cannot — no `transition` queue item", DOCS_ACH, "yes", { site: `kill:${t}`, what: "kill" });
      return out("by hand — `fight ×N` item (or a hive achievement goal); auto only while it is the training monster", DOCS_ACH, "yes", { site: `kill:${t}`, what: "kill" });
    }
    case "combat_drop": {
      const u = unit(t); add(c, u, left); c.via = u.via;
      const boss = c.flags.has("boss: group of three"), ev = Object.keys(c.evSec).length > 0;
      return out(need(c) ? "cannot — the source is behind a transition" : boss ? "by hand — group fights, one per click" : ev ? "auto — event standing order: ONE free character, safe wins only" : "by hand — `fight ×N` item", `${DOCS_ACH}; assumed: items dropped, not kills (guess)`, boss ? "groups of three" : "yes", { site: u.site, what: t });
    }
    case "gathering": {
      const u = unit(t); add(c, u, left); c.via = u.via;
      const ev = Object.keys(c.evSec).length > 0;
      return out(need(c) ? "cannot — no `transition` queue item" : ev ? "auto — event standing order: ONE character (the highest skill) gathers while it is up" : "by hand — `gather ×N` item (or a hive achievement goal); auto only while it is the training node",
        `${DOCS_ACH}; items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop)`, "yes", { site: u.site, what: t });
    }
    case "crafting": {
      const u = craftCost(t); add(c, u, left); c.via = u.via;
      return out(need(c) || [...c.flags].some((f) => f.startsWith("raid")) ? "cannot — a material is behind a transition or a raid" : "by hand — `craft ×N` item with the materials banked (or a hive achievement goal: gather + craft)", `${DOCS_ACH}; assumed: items produced (guess; snapshot shows whole hundreds only)`);
    }
    case "use": {
      const u = unit(t); add(c, u, left); c.sec += USE_SEC * left; c.act += left; c.via = u.via;
      const lv = items.get(t).conditions?.find((x: any) => x.code === "level"); if (lv) { c.lvl = Math.max(c.lvl, lv.value + 1); c.gear = Math.max(c.gear, lv.value); } // reaching the level takes the band below's gear
      for (const x of items.get(t).conditions ?? []) if (x.operator === "achievement_unlocked") c.flags.add(`gate: achievement ${x.code}`);
      const food = items.get(t).subtype === "food";
      return out(food ? "auto, but not aimed — no `use` item: a hurt fighter eats it only when it is the best food at hand" : "cannot — no `use` queue item for potions", `${DOCS_ACH}; assumed: units used (guess)`);
    }
    case "npc_buy": {
      const offer = npcItems.find((x) => x.code === t && x.buy_price != null && x.currency !== "gold")!;
      add(c, unit(offer.currency), offer.buy_price * left); c.act += left; c.spend[offer.currency] = offer.buy_price * left; c.via = `${offer.npc}: ${offer.buy_price} ${offer.currency} each`;
      if (!walkable("npc", offer.npc)) c.flags.add(`transition → ${tilesOf("npc", offer.npc)[0]?.name}`);
      return out([...c.flags].some((f) => f.startsWith("raid")) ? "cannot — the currency comes from a raid" : need(c) ? "cannot — the trader is behind a transition" : "by hand — `buy` item with the currency in the bag (the hive's achievement goal handles gold offers only)", `${DOCS_ACH}; assumed: units bought (snapshot: 24/25)`, "yes", { pays: { code: offer.currency, qty: offer.buy_price * left } });
    }
    case "npc_sell": {
      const u = unit(t); add(c, u, left); c.via = u.via;
      const buyer = npcItems.find((x) => x.code === t && x.sell_price != null)!;
      const e = eventOf.get(`npc:${buyer.npc}`); if (e) c.evSec[e.code] = (c.evSec[e.code] ?? 0) + 60;
      return out("auto — the event standing order sells it when the merchant spawns; getting the item is luck (1/1000 per kill)", `${DOCS_ACH}; units sold (snapshot: 3/5)`);
    }
    case "task": c.sec = TASK_SEC * left; c.act = (TASK_SEC / 30) * left; c.via = "log: 1.95 h per task";
      return out("by hand — `task-loop ×0` item runs forever once queued", `${DOCS_ACH}; tasks completed`);
    case "recycling": c.sec = (recyclable.c.sec + CRAFT_SEC) * left; c.act = (recyclable.c.act + 1) * left; c.via = `craft + recycle ${recyclable.code}`;
      return out("auto inside craft training (every trained product is recycled); by hand — `recycle ×N` item", `${DOCS_ACH}; assumed: items recycled (guess)`);
    case "favor": c.sec = OFFERING_SEC * left; c.act = left * 2; c.via = "offerings";
      return out("auto — daily trigger at 00:05 UTC on every running queue", "account-wide, one per completed offering (docs)", "yes — 3 per character per day");
    case "combat_level": c.lvl = o.total; c.gear = o.total - 1; c.via = "levelling";
      return out("auto — `train combat` (pins)", "unknown: one character at that level is assumed; progress stays 0 until it happens (snapshot: adept 0/25 with Lv 22)", "no");
    default: throw new Error(`unknown objective type ${o.type}`);
  }
}

// ── every achievement ────────────────────────────────────────────────────────
interface Row { a: any; objs: Obj[]; cost: Cost; done: boolean; unknown: boolean; can: string }
const rows: Row[] = ach.map((a) => {
  const objs: Obj[] = a.objectives.map(objective), cost = zero();
  for (const o of objs) add(cost, o.cost);
  const rank = (s: string) => (s.startsWith("cannot") ? 0 : s.startsWith("by hand") ? 1 : s.startsWith("auto") ? 2 : 3);
  const can = objs.map((o) => o.can).sort((x, y) => rank(x) - rank(y))[0];
  return { a, objs, cost, done: !!a.completed_at, unknown: [...cost.flags].some((f) => f.startsWith("raid")), can };
});
assert.equal(rows.length, 91, "91 achievements");
assert.equal(rows.reduce((s, r) => s + r.a.points, 0), 210, "210 points");
const earned = rows.filter((r) => r.done).reduce((s, r) => s + r.a.points, 0);
assert.equal(earned, account.achievements_points, "completed points = the account's points");

// ── levelling (atlas) ────────────────────────────────────────────────────────
interface State { lv: number[]; sk: Record<string, number>; site: Map<string, Map<string, number>>; perf: Map<string, number> }
const start = (): State => ({ lv: chars.map((c) => c.level), sk: Object.fromEntries(SKILLS.map((s) => [s, Math.max(...chars.map((c) => c[`${s}_level`]))])), site: new Map(), perf: new Map() });
const clone = (s: State): State => ({ lv: [...s.lv], sk: { ...s.sk }, site: new Map([...s.site].map(([k, m]) => [k, new Map(m)])), perf: new Map(s.perf) });
const siteOf = (s: State, k: string) => s.site.get(k) ?? s.site.set(k, new Map()).get(k)!;
const bump = (s: State, k: string, v: number) => siteOf(s, k).set("*level", (siteOf(s, k).get("*level") ?? 0) + v);
function levelSkill(s: State, skill: string, to: number): number {
  let h = 0;
  for (let L = s.sk[skill]; L < Math.min(to, 50); L++) {
    const g = atlas.gatherTrain[skill]?.[L - 1], c = atlas.craftTrain[skill]?.[L - 1];
    if (g) { h += g.hours; bump(s, `gather:${g.code}`, (g.hours * 3600) / gatherSec(resources.find((r) => r.code === g.code).level)); }
    else if (c) h += c.hours;
    else h += Infinity;
  }
  s.sk[skill] = Math.max(s.sk[skill], Math.min(to, 50));
  return h;
}
/** Hours to bring the whole fleet to combat `lvl` (with gear crafting at that band) and one specialist per skill to `skills`. */
function levelTo(s: State, lvl: number, skills: Record<string, number>, gear = lvl): number {
  let h = 0;
  lvl = Math.min(lvl, 50);
  for (let i = 0; i < s.lv.length; i++) for (; s.lv[i] < lvl; s.lv[i]++) {
    const row = atlas.path[s.lv[i] - 1], t = row.t[1] ?? row.t[2];
    if (!t) { h += Infinity; continue; }
    h += t.hours; bump(s, `kill:${t.m}`, (t.hours * 3600) / t.killSec);
  }
  if (gear > 0) for (const c of CRAFT_GEAR) h += levelSkill(s, c, bandStart(Math.min(gear, 50)));
  for (const [k, v] of Object.entries(skills)) h += levelSkill(s, k, v);
  return h;
}
/** The achievement's own hours. Work at one monster or node serves every objective there (a kill rolls every drop,
 *  levelling kills and gathers count too); two achievements on one counter share it; drops collected pay a purchase. */
function ownHours(s: State, r: Row): number {
  let sec = 0;
  for (const o of r.objs) {
    if (!o.left) continue;
    if (o.site) {
      const m = siteOf(s, o.site), covered = Math.min(o.cost.act, Math.max(0, ...m.values()));
      sec += o.cost.sec * (1 - covered / o.cost.act);
      m.set(o.what!, Math.max(m.get(o.what!) ?? 0, o.cost.act));
    } else if (!(o.pays && (s.perf.get(`combat_drop:${o.pays.code}`) ?? 0) >= o.pays.qty)) {
      const prev = s.perf.get(o.key) ?? 0;
      sec += o.cost.sec * (Math.max(0, o.left - prev) / o.left);
    }
    s.perf.set(o.key, Math.max(s.perf.get(o.key) ?? 0, o.left));
  }
  return sec / 3600;
}

// ── the order: most points per marginal hour first ───────────────────────────
interface Step { r: Row; level: number; own: number; cum: number }
/** An achievement that gates a tile or an item (`gate: achievement X`) comes first; a row whose gate is not on the road is left out. */
function road(open: Row[]): Step[] {
  const order: Step[] = [], st = start(), have = new Set(rows.filter((r) => r.done).map((r) => r.a.code));
  let cum = 0;
  while (open.length) {
    let best: { i: number; level: number; own: number } | undefined, bestScore = -1;
    for (let i = 0; i < open.length; i++) {
      if ([...open[i].cost.flags].some((f) => f.startsWith("gate: achievement ") && !have.has(f.slice(18)))) continue;
      const t = clone(st), level = levelTo(t, open[i].cost.lvl, open[i].cost.skills, open[i].cost.gear), own = ownHours(t, open[i]);
      const score = open[i].a.points / Math.max(0.1, level + own);
      if (score > bestScore) { bestScore = score; best = { i, level, own }; }
    }
    if (!best) break;
    const r = open.splice(best.i, 1)[0];
    have.add(r.a.code);
    const level = levelTo(st, r.cost.lvl, r.cost.skills, r.cost.gear), own = ownHours(st, r);
    cum += level + own;
    order.push({ r, level, own, cum });
  }
  return order;
}
const order = road(rows.filter((r) => !r.done && !r.unknown));

// ── printing ─────────────────────────────────────────────────────────────────
const n = (x: number, d = 0) => (Number.isFinite(x) ? x.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }) : "∞");
const hrs = (sec: number) => n(sec / 3600, sec < 36000 ? 1 : 0);
const table = (head: string[], body: (string | number)[][]) => console.log([`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...body.map((r) => `| ${r.join(" | ")} |`)].join("\n") + "\n");
const iso = (d: Date) => d.toISOString().slice(0, 10);

console.log(`# Achievement map — computed tables\n`);
console.log(`${rows.length} achievements, ${rows.reduce((s, r) => s + r.a.points, 0)} points. Account \`${account.username}\`: ${account.achievements_points} points (api: account.json), ${rows.filter((r) => r.done).length} achievements complete (api: achievements.json, sum of their points = ${earned}). Member: ${account.member}.\n`);

console.log(`## A. Season\n`);
console.log(`Season ${status.season.number} "${status.season.name}", start ${iso(START)} (api: status.json). Snapshot taken ${status.server_time}. Deadline used: ${iso(DEADLINE)} (start + 4 months, docs) = ${n(days(NOW, DEADLINE), 1)} days = ${n(days(NOW, DEADLINE) / 7, 1)} weeks away; alternative ${iso(DEADLINE_ALT)} (docs/rework.md) = ${n(days(NOW, DEADLINE_ALT) / 7, 1)} weeks away.\n`);
table(["points", "reward", "type", "qty", "member only", "first only"], status.season.rewards.map((r: any) => [r.required_points, r.code, r.type, r.quantity, r.member_required ? "yes" : "no", r.first_only ? "yes" : "no"]));

console.log(`## B. Account\n`);
table(["character", "combat", ...SKILLS, "gear band worn", "pieces of its level band's plus set"], chars.map((c) => {
  const worn = Object.keys(c).filter((k) => k.endsWith("_slot") && c[k] && items.get(c[k])).map((k) => items.get(c[k]));
  const per = atlas.bands.map((b: any) => worn.filter((i) => i.level >= b.a && i.level <= b.b).length);
  const top = atlas.bands[per.indexOf(Math.max(...per))];
  const band = atlas.bands.find((b: any) => c.level >= b.a && c.level <= b.b);
  const picks = new Set(Object.values(band.loadout[1]).map((l: any) => l[0]?.[0]));
  return [c.name, c.level, ...SKILLS.map((s) => c[`${s}_level`]), `${top.a}–${top.b} (${Math.max(...per)} of ${worn.length} pieces)`, `${worn.filter((i) => picks.has(i.code)).length} of ${picks.size} (band ${band.a}–${band.b})`];
}));

console.log(`## C. Every achievement\n`);
console.log(`Unit times: gather = 29 + max(1, ⌊level/2⌋) s (docs formula); kill = atlas \`monsters[].kill.sec\`, else guess ${GUESS_KILL} s; boss = guess ${BOSS_KILL / 3} s × 3 characters; craft ${CRAFT_SEC} s; task = ${n(TASK_SEC / 3600, 2)} h (log; the data's mean task of level ≤ 30 at the unit times above gives ${n(TASK_SEC_DATA / 3600, 1)} h — the map uses the log); recycle = craft + recycle one ${recyclable.code} (${n(recyclable.c.sec)} s); offering = guess ${OFFERING_SEC / 60} min. "char-h" = one character's hours.\n`);
const needText = (r: Row) => {
  const p: string[] = [];
  if (r.cost.lvl) p.push(`combat ${r.cost.lvl}`);
  for (const [s, l] of Object.entries(r.cost.skills)) p.push(`${s} ${l}`);
  const ev = Object.keys(r.cost.evSec); if (ev.length) p.push(`event: ${ev.join(", ")}`);
  p.push(...[...r.cost.flags]);
  const via = [...new Set(r.objs.filter((o) => o.left && o.cost.via).map((o) => o.cost.via))];
  return (p.join("; ") || "nothing") + (via.length ? ` — ${via.join(" / ")}` : "");
};
const spendText = (r: Row) => Object.entries(r.cost.spend).filter(([, v]) => v > 0).map(([c, v]) => `${n(v, v < 10 ? 1 : 0)} ${c}`).join(", ") || "time only";
const types = [...new Set(rows.map((r) => r.a.objectives[0].type))];
for (const ty of types) {
  const group = rows.filter((r) => r.a.objectives[0].type === ty);
  console.log(`### ${ty} (${group.length} achievements, ${group.reduce((s, r) => s + r.a.points, 0)} points)\n`);
  table(["code", "name", "pts", "objectives: progress/total (left)", "needs before work can start", "how progress counts", "work left: actions · char-h · split", "costs besides time", "client today"],
    group.map((r) => [r.a.code, r.a.name, r.a.points, r.objs.map((o) => `${o.text} (${n(o.left)})`).join("<br>"),
      r.done ? "done" : needText(r), [...new Set(r.objs.map((o) => o.counts))].join("<br>"),
      r.done ? "none" : !r.cost.sec && r.cost.via === "" && r.objs.some((o) => o.key.startsWith("combat_level")) ? "levelling only — see E · split no" : r.unknown ? `unknown (raid) · split ${r.objs[0].split}` : `${n(r.cost.act)} · ${hrs(r.cost.sec)} · ${[...new Set(r.objs.filter((o) => o.left).map((o) => o.split))].join(", ")}`,
      r.done ? "—" : spendText(r), r.done ? "done" : r.can]));
}

console.log(`## D. Overlap with levelling\n`);
{
  const st = start();
  levelTo(st, 50, Object.fromEntries(SKILLS.map((s) => [s, 50])));
  const paid = rows.filter((r) => !r.done).flatMap((r) => r.objs.filter((o) => o.left && o.site).map((o) => ({ r, o, free: Math.min(o.cost.act, st.site.get(o.site!)?.get("*level") ?? 0) }))).filter((x) => x.free > 0);
  console.log(`Kills and gathers the atlas's levelling road to 50 does anyway (five characters' combat, one specialist per gathering skill), against the objectives that count them:\n`);
  table(["achievement", "objective", "actions left", "paid by levelling", "share"], paid.map((x) => [x.r.a.code, x.o.text, n(x.o.cost.act), n(x.free), `${n((x.free / x.o.cost.act) * 100)}%`]));
}

console.log(`### Gates: combat level\n`);
table(["combat level needed", "open achievements", "points", "fleet levelling to the top of the band, char-h from today (atlas: five characters + gear crafting)"],
  [[0, 0], [1, 22], [23, 25], [26, 30], [31, 35], [36, 40], [41, 45], [46, 50]].map(([a, b]) => {
    const g = rows.filter((r) => !r.done && r.cost.lvl >= a && r.cost.lvl <= b);
    return [b ? `${a}–${b}` : "none", g.map((r) => r.a.code).join(", ") || "none", g.reduce((s, r) => s + r.a.points, 0), b ? n(levelTo(start(), b, {})) : "0"];
  }));
console.log(`### Gates: skills\n`);
table(["skill", "best in the fleet today", "level needed → open achievements", "one specialist to 50, char-h (atlas)"], SKILLS.map((sk) => {
  const lv = [...new Set(rows.filter((r) => !r.done && r.cost.skills[sk]).map((r) => r.cost.skills[sk]))].sort((a, b) => a - b);
  return [sk, start().sk[sk], lv.map((l) => `${l}: ${rows.filter((r) => !r.done && r.cost.skills[sk] === l).map((r) => r.a.code).join(", ")}`).join("<br>") || "none", n(levelSkill(start(), sk, 50))];
}));
console.log(`### Rewards that open or pay for something\n`);
table(["achievement", "state", "reward items"], rows.filter((r) => (r.a.rewards.items ?? []).length).map((r) => [r.a.code, r.done ? "done" : "open", r.a.rewards.items.map((i: any) => `${i.quantity} ${i.code}`).join(", ")]));

console.log(`## E. Reachability\n`);
const totalHours = order[order.length - 1].cum;
const cases: [string, number, number][] = [["as measured", UTIL, 1], ["never idle", 1, 1], ["pessimistic (measured share, work × 1.5)", UTIL, 1.5]];
const dateAt = (cum: number, util: number, f: number) => new Date(NOW.getTime() + ((cum * f) / (FIGHTERS * 24 * util)) * 864e5);
console.log(`Pace (log, 2026-11-03 → 11-18): ${ACTIONS_PER_HOUR} actions per active character-hour; queues ran ${n(UTIL * 100, 1)}% of the time. One calendar day = ${n(FIGHTERS * 24 * UTIL, 1)} character-hours as measured, ${FIGHTERS * 24} never idle.\n`);
// events: what waits for a spawn
const evTotals = new Map<string, number>();
for (const r of rows) if (!r.done && !r.unknown) for (const [e, v] of Object.entries(r.cost.evSec)) evTotals.set(e, (evTotals.get(e) ?? 0) + v);
const evDays = (code: string, sec: number, who: number) => (sec / (who * EVENT_MIN * 60)) * (events.find((e) => e.code === code).rate / 1440);
/** Calendar floor of each step, in days from today: its events' spawns so far in the order (`who` characters on
 *  every spawn), or the favor cap of three offerings per character per day. */
function floorsOf(ord: Step[], who: number): number[] {
  const cumEv = new Map<string, number>();
  return ord.map((s) => {
    for (const [e, v] of Object.entries(s.r.cost.evSec)) cumEv.set(e, (cumEv.get(e) ?? 0) + v);
    const favor = Math.max(0, ...s.r.objs.filter((o) => o.key.startsWith("favor")).map((o) => o.left / (FIGHTERS * 3)));
    return Math.max(favor, ...Object.keys(s.r.cost.evSec).map((e) => evDays(e, cumEv.get(e)!, who)));
  });
}
const when = (s: Step, floor: number, util: number, f: number) => new Date(Math.max(dateAt(s.cum, util, f).getTime(), NOW.getTime() + floor * 864e5));
const pointsBy = (ord: Step[], who: number, util: number, f: number, dl: Date) => { const fl = floorsOf(ord, who); return earned + ord.reduce((p, s, i) => p + (when(s, fl[i], util, f) <= dl ? s.r.a.points : 0), 0); };
const floors = floorsOf(order, FIGHTERS);
const doneBy = (i: number, util: number, f: number) => when(order[i], floors[i], util, f);
table(["case", "whole costed road, char-h", "fleet-hours (÷5)", "calendar weeks of work", "last achievement done", `points by ${iso(DEADLINE)}`, `points by ${iso(DEADLINE_ALT)}`, "last free reward tier reached"], cases.map(([name, util, f]) => {
  const by = (dl: Date) => pointsBy(order, FIGHTERS, util, f, dl);
  const p = by(DEADLINE), tier = status.season.rewards.filter((r: any) => !r.member_required && !r.first_only && r.required_points <= p).pop();
  const end = new Date(Math.max(...order.map((_, i) => doneBy(i, util, f).getTime())));
  return [name, n(totalHours * f), n((totalHours * f) / 5), n((totalHours * f) / (FIGHTERS * 24 * util) / 7, 1), iso(end), p, by(DEADLINE_ALT), tier ? `${tier.required_points}: ${tier.code}` : "none"];
}));
const unk = rows.filter((r) => r.unknown && !r.done);
console.log(`Not costed (they need a raid, whose rules are unknown): ${unk.map((r) => `${r.a.code} (${r.a.points})`).join(", ")} = ${unk.reduce((s, r) => s + r.a.points, 0)} points. The most the costed road can reach is ${210 - unk.reduce((s, r) => s + r.a.points, 0)}.\n`);

console.log(`### The order by points per character-hour (levelling charged to the first achievement that needs it)\n`);
{
  let pts = earned;
  table(["#", "achievement", "pts", "total", "levelling char-h", "own char-h", "cumulative char-h", "done by (measured)", "done by (never idle)", "done by (pessimistic)", "calendar floor, days"], order.map((s, i) => {
    pts += s.r.a.points;
    return [i + 1, s.r.a.code, s.r.a.points, pts, n(s.level), n(s.own), n(s.cum), ...cases.map(([, u, f]) => iso(doneBy(i, u, f))), floors[i] >= 0.05 ? n(floors[i], 1) : "—"];
  }));
}

console.log(`### What waits for a spawn\n`);
table(["event", "content", "chance per minute", "mean wait", "up", "event-bound work, char-h", "spawns needed (5 characters)", "calendar days (5)", "calendar days (1 character, today's client)", "achievements"],
  [...evTotals].sort((a, b) => b[1] - a[1]).map(([code, sec]) => {
    const e = events.find((x) => x.code === code);
    return [e.name, `${e.content.type} ${e.content.code}`, `1/${e.rate}`, `${n(e.rate / 60, 1)} h`, `${e.duration} min`, hrs(sec), n(sec / (FIGHTERS * EVENT_MIN * 60), 1), n(evDays(code, sec, FIGHTERS), 1), n(evDays(code, sec, 1), 1), rows.filter((r) => !r.done && r.cost.evSec[code]).map((r) => r.a.code).join(", ")];
  }));
const fav = rows.find((r) => r.a.code === "a_favored_champion")!.objs[0].left;
console.log(`Favors: ${fav} left for a_favored_champion; at most ${FIGHTERS * 3} a day (docs: one offering per category, three categories, per character) → at least ${n(fav / (FIGHTERS * 3), 1)} days; at the 10 a day of 2026-11-17/18 (log) ${n(fav / 10, 1)} days.\n`);

console.log(`## F. Missing abilities\n`);
{
  const RAID = "fight in a raid", TRANS = "use a transition (other layers, the island, keys, tolls)", BOSS = "start a group boss fight without a manual step";
  const EVENT = "put the whole fleet on a live event, not one character", USE = "use an item on purpose (`use` item: food, potions)", PICK = "pick the achievement's work by itself (today: a queue item or hive goal by hand)";
  const ability = (r: Row): string[] => {
    const f = [...r.cost.flags], out: string[] = [];
    if (f.some((x) => x.startsWith("raid"))) out.push(RAID);
    if (f.some((x) => x.startsWith("transition") || x.startsWith("gate"))) out.push(TRANS);
    if (f.includes("boss: group of three")) out.push(BOSS);
    if (Object.keys(r.cost.evSec).some((e) => events.find((x) => x.code === e).content.type !== "npc")) out.push(EVENT);
    if (r.objs.some((o) => o.left && o.text.startsWith("use"))) out.push(USE);
    if (r.objs.some((o) => o.left && o.can.startsWith("by hand —") && !o.can.includes("Group fight") && !o.can.includes("group fights"))) out.push(PICK);
    return out;
  };
  // what each ability buys by the deadline, added one after the other (pace as measured)
  const ladder: [string, string[]][] = [["today's client left alone", []], ["+ picks the work itself", [PICK]], ["+ transitions", [PICK, TRANS]], ["+ whole fleet on events", [PICK, TRANS, EVENT]], ["+ group boss fights", [PICK, TRANS, EVENT, BOSS]], ["+ `use` on purpose", [PICK, TRANS, EVENT, BOSS, USE]]];
  table(["abilities the client has", "open achievements it can then finish (ever)", "their points", `points by ${iso(DEADLINE)} (measured pace)`, "never idle", "pessimistic"], ladder.map(([name, has]) => {
    const can = rows.filter((r) => !r.done && !r.unknown && ability(r).every((a) => has.includes(a)));
    const ord = road([...can]), who = has.includes(EVENT) ? FIGHTERS : 1;
    return [name, ord.length, ord.reduce((s, x) => s + x.r.a.points, 0), ...cases.map(([, u, f]) => pointsBy(ord, who, u, f, DEADLINE))];
  }));
  const by = new Map<string, Row[]>();
  for (const r of rows) if (!r.done) for (const a of ability(r)) by.set(a, [...(by.get(a) ?? []), r]);
  table(["missing ability", "achievements", "points"], [...by].sort((a, b) => b[1].reduce((s, r) => s + r.a.points, 0) - a[1].reduce((s, r) => s + r.a.points, 0)).map(([a, rs]) => [a, rs.map((r) => r.a.code).join(", "), rs.reduce((s, r) => s + r.a.points, 0)]));
  const free = rows.filter((r) => !r.done && ability(r).length === 0);
  console.log(`Open achievements that need none of these: ${free.map((r) => `${r.a.code} (${r.a.points})`).join(", ") || "none"} = ${free.reduce((s, r) => s + r.a.points, 0)} points.\n`);
}

console.log(`## G. Spending\n`);
{
  const tot: Record<string, number> = {};
  for (const r of rows) if (!r.done) for (const [c, v] of Object.entries(r.cost.spend)) tot[c] = (tot[c] ?? 0) + v;
  table(["currency", "amount over the whole road", "achievements"], Object.entries(tot).filter(([, v]) => v > 0).map(([c, v]) => [c, n(v), rows.filter((r) => !r.done && r.cost.spend[c]).map((r) => r.a.code).join(", ")]));
  const isle = rows.filter((r) => !r.done && [...r.cost.flags].some((f) => f.includes("Sandwhisper Isle")));
  const forest = rows.filter((r) => !r.done && [...r.cost.flags].some((f) => f.includes("Enchanted Forest")));
  console.log(`Tolls: Sandwhisper Isle boat 1,000 gold each way per character — ${isle.length} achievements (${isle.reduce((s, r) => s + r.a.points, 0)} points) work there; Enchanted Forest 5,000 gold per entry per character — ${forest.length} achievements (${forest.reduce((s, r) => s + r.a.points, 0)} points).`);
  // what gold could buy instead of work (event merchants only)
  const shortcuts = new Map<string, { a: string; code: string; qty: number; g: any }>();
  const leaves = (code: string, qty: number, top: boolean, r: Row) => {
    const g = npcItems.find((x) => x.code === code && x.currency === "gold" && x.buy_price != null);
    if (g && !top) { const k = r.a.code + "|" + code, e = shortcuts.get(k) ?? { a: r.a.code, code, qty: 0, g }; e.qty += qty; return void shortcuts.set(k, e); }
    const c = items.get(code)?.craft;
    if (c) for (const i of c.items) leaves(i.code, (qty * i.quantity) / c.quantity, false, r);
  };
  for (const r of rows) if (!r.done) for (const o of r.a.objectives) { const left = o.total - Math.min(o.progress, o.total); if (left && (o.type === "crafting" || o.type === "use")) leaves(o.target, left, o.type === "crafting", r); }
  console.log(`\nMaterials an event merchant sells for gold (a bought material still counts for a craft or a use; a gathering objective counts only what is gathered):\n`);
  table(["achievement", "buy", "quantity", "merchant", "gold each", "gold total", "char-h it replaces"], [...shortcuts.values()].map((e) => [e.a, e.code, n(e.qty), e.g.npc, n(e.g.buy_price), n(e.qty * e.g.buy_price), hrs(unit(e.code).sec * e.qty)]));
  console.log(`Gold from achievements still open: ${n(rows.filter((r) => !r.done).reduce((s, r) => s + (r.a.rewards.gold ?? 0), 0))}; tasks coins from them: ${rows.filter((r) => !r.done).flatMap((r) => r.a.rewards.items ?? []).filter((i: any) => i.code === "tasks_coin").reduce((s: number, i: any) => s + i.quantity, 0)}.`);
  const inTime = order.filter((_, i) => doneBy(i, UTIL, 1) <= DEADLINE);
  console.log(`Of that, the ${inTime.length} achievements E finishes by ${iso(DEADLINE)} at the measured pace pay ${n(inTime.reduce((s, x) => s + (x.r.a.rewards.gold ?? 0), 0))} gold.`);
  console.log(`Pocket gold on the five characters: ${n(chars.reduce((s, c) => s + c.gold, 0))} (api: characters.json); bank gold is not in a public read.\n`);
}
