// Task 024: what build.mjs and stats.mjs share — paths, the static data, the season day, and 022's marks of a piece's
// recipe tree (copied from docs/strategy/022/tools/sec1-analyze.mjs:44-104, which runs on import). No request.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const HOME = join(dirname(fileURLToPath(import.meta.url)), "..");
export const ROOT = join(HOME, "../../..");
export const J = (p) => JSON.parse(readFileSync(p, "utf8"));
export const D = (n) => J(join(ROOT, "public/data", `${n}.json`));
export const SKILLS = ["mining", "woodcutting", "fishing", "weaponcrafting", "gearcrafting", "jewelrycrafting", "cooking", "alchemy"];
const START = Date.parse("2026-10-24T00:00:00Z"); // season day 1 (report 022, manifest.json start_date)
export const sday = (t) => Math.floor((t - START) / 864e5) + 1;
export const med = (a) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return NaN; return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
/** Quartiles by the median of each half (Tukey's hinges). */
export const quart = (a) => { const s = [...a].sort((x, y) => x - y), h = Math.floor(s.length / 2); return [med(s.slice(0, h)), med(s), med(s.slice(s.length % 2 ? h + 1 : h))]; };
export const f1 = (x) => (x == null || !Number.isFinite(x) ? "—" : Number.isInteger(x) ? String(x) : x.toFixed(1));

export const items = new Map(D("items").map((i) => [i.code, i]));
export const monsters = new Map(D("monsters").map((m) => [m.code, m]));
const resources = D("resources");
const achDefs = new Map(D("achievements").map((a) => [a.code, a]));
const npcItems = D("npc_items");
const events = D("events");
const staticContent = { monster: new Set(), resource: new Set(), npc: new Set() };
for (const t of D("maps")) { const c = t.interactions?.content; if (c && staticContent[c.type]) staticContent[c.type].add(c.code); }
const eventNpc = new Set(events.filter((e) => e.content.type === "npc").map((e) => e.content.code));
const rewardOf = new Map();
for (const a of achDefs.values()) for (const it of a.rewards?.items ?? []) rewardOf.set(it.code, a.code);
export const isStatic = (type, code) => staticContent[type]?.has(code) ?? false;

function sourcesOf(code) {
  const s = [];
  for (const r of resources) if (r.drops.some((d) => d.code === code)) s.push({ how: `node ${r.code} (${r.skill} ${r.level})`, flags: staticContent.resource.has(r.code) ? [] : ["event"] });
  for (const m of monsters.values()) if (m.drops.some((d) => d.code === code)) {
    const fl = m.type === "boss" ? ["boss"] : m.type === "raid_boss" ? ["raid"] : staticContent.monster.has(m.code) ? [] : ["event"];
    s.push({ how: `${m.type === "boss" ? "boss " : m.type === "raid_boss" ? "raid " : ""}${m.code} (Lv ${m.level})`, flags: fl });
  }
  for (const n of npcItems) if (n.code === code && n.buy_price != null) {
    const ev = eventNpc.has(n.npc) ? ["event"] : [];
    if (n.currency === "gold") s.push({ how: `${n.npc} ${n.buy_price} gold`, flags: ["gold", ...ev] });
    else if (n.currency === "tasks_coin") s.push({ how: `${n.npc} ${n.buy_price} tasks coins`, flags: ["coins", ...ev] });
    else { const sub = flagsOfLeaf(n.currency); s.push({ how: `${n.npc} ${n.buy_price} ${n.currency} (${sub.how})`, flags: [...new Set([...ev, ...sub.flags])] }); }
  }
  if (rewardOf.has(code)) s.push({ how: `reward of ${rewardOf.get(code)}`, flags: ["achievement", ...achFlags(rewardOf.get(code))] });
  return s;
}
function achFlags(code) {
  const f = new Set();
  for (const o of achDefs.get(code)?.objectives ?? []) {
    if (o.type === "combat_kill" || o.type === "combat_drop") {
      const ms = o.type === "combat_kill" ? [monsters.get(o.target)].filter(Boolean) : [...monsters.values()].filter((m) => m.drops.some((d) => d.code === o.target));
      const fl = ms.map((m) => (m.type === "boss" ? "boss" : m.type === "raid_boss" ? "raid" : staticContent.monster.has(m.code) ? "" : "event"));
      if (fl.length && fl.every((x) => x)) for (const x of fl) f.add(x);
    } else if (o.type === "gathering") {
      const ns = resources.filter((r) => r.drops.some((d) => d.code === o.target));
      if (ns.length && ns.every((r) => !staticContent.resource.has(r.code))) f.add("event");
    }
  }
  return [...f];
}
function flagsOfLeaf(code) {
  const s = sourcesOf(code);
  if (!s.length) return { how: "no source in data", flags: ["?"] };
  const free = s.find((x) => x.flags.length === 0);
  if (free) return { how: free.how, flags: [] };
  const inter = s.map((x) => new Set(x.flags)).reduce((a, b) => new Set([...a].filter((y) => b.has(y))));
  const flags = inter.size ? [...inter] : [...new Set(s.flatMap((x) => x.flags))].map((x) => x + "?");
  return { how: s.map((x) => x.how).join(" / "), flags };
}
function leavesOf(code, seen = new Set()) {
  if (seen.has(code)) return [];
  seen.add(code);
  const it = items.get(code);
  if (it?.craft) return it.craft.items.flatMap((g) => leavesOf(g.code, seen));
  const l = flagsOfLeaf(code);
  return l.flags.length ? [{ code, ...l }] : [];
}
const pieceMemo = new Map();
/** A piece's craft skill and level and the marks of its recipe tree: event, coins (tasks coins), boss, raid, gold,
 *  achievement (only an achievement's reward) — report 022's rule. */
export function pieceInfo(code) {
  let r = pieceMemo.get(code);
  if (r) return r;
  const it = items.get(code);
  if (!it) r = { craft: "?", flags: ["?"], why: "not in items.json" };
  else if (it.craft) { const lv = leavesOf(code); r = { craft: `${it.craft.skill} ${it.craft.level}`, flags: [...new Set(lv.flatMap((x) => x.flags))], why: lv.map((x) => `${x.code}: ${x.how}`).join("; ") }; }
  else { const l = flagsOfLeaf(code); r = { craft: "not crafted", flags: l.flags, why: `${code}: ${l.how}` }; }
  pieceMemo.set(code, r);
  return r;
}
const MARK = { event: "⚡", coins: "¢", boss: "B", raid: "R", achievement: "A", gold: "g" };
export const marks = (flags) => flags.map((f) => MARK[f.replace("?", "")] ? MARK[f.replace("?", "")] + (f.endsWith("?") ? "?" : "") : f).join("");
export const short = (craft) => craft.replace("weaponcrafting ", "wc").replace("gearcrafting ", "gc").replace("jewelrycrafting ", "jc").replace("not crafted", "nc").replace("cooking ", "ck").replace("alchemy ", "al");
