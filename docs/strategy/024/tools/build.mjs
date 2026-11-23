// Task 024: the base, built from the snapshot folders alone — no request (it imports nothing that reaches the network).
//   node docs/strategy/024/tools/build.mjs [<snapshots dir> [<out dir>]]
// Snapshots: docs/strategy/022/snapshot/ (read in place, 17 accounts, 11-22 19:23 UTC; its log docs/strategy/022/requests.log)
// and every docs/strategy/024/snapshot/<stamp>/ (its log docs/strategy/024/requests.log). Writes docs/strategy/024/base/
// characters.jsonl, accounts.jsonl, achievements.jsonl — one JSON object a line, in a fixed order (same input, same bytes).
// Task 025: with a snapshots directory (the service's daily read, logs/leaders: its <stamp>/ folders and requests.log)
// its reads come after those two, and the base goes to <out dir>, by default <snapshots dir>/base.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { HOME, ROOT, J, D, sday, SKILLS } from "./lib.mjs";

const [DIR, OUT] = process.argv.slice(2).map((p) => resolve(p));
const BASE = OUT ?? (DIR ? join(DIR, "base") : join(HOME, "base"));
const monsters = new Map(D("monsters").map((m) => [m.code, m]));
const resources = new Map(D("resources").map((r) => [r.code, r]));
const tiles = new Map(D("maps").map((t) => [t.map_id, t]));
const eventAt = new Map(); // map_id -> [{event, type, code}]
for (const e of D("events")) for (const m of e.maps) (eventAt.get(m.map_id) ?? eventAt.set(m.map_id, []).get(m.map_id)).push({ event: e.code, type: e.content.type, code: e.content.code });

/** The log's lines: path -> [ms]. */
const logOf = (file) => {
  const m = new Map();
  for (const l of readFileSync(file, "utf8").split("\n").filter(Boolean)) {
    const [path, status, , iso] = l.split(" ");
    if (status === "200") (m.get(path) ?? m.set(path, []).get(path)).push(Date.parse(iso));
  }
  return m;
};
const stampMs = (s) => Date.parse(`${s.slice(0, 13)}:${s.slice(13, 15)}:00Z`);

// ---- the snapshots ----
const snaps = [];
{
  const dir = join(ROOT, "docs/strategy/022/snapshot");
  const lb = [...J(join(dir, "leaderboard-accounts-1.json")).data, ...J(join(dir, "leaderboard-accounts-2.json")).data];
  const accounts = readdirSync(dir).filter((f) => f.endsWith("-characters.json")).map((f) => f.slice(4, -16));
  snaps.push({ id: "2026-11-22T1923Z", dir, log: logOf(join(ROOT, "docs/strategy/022/requests.log")), from: stampMs("2026-11-22T1923Z"), lb, accounts,
    achFiles: (a) => [`acc-${a}-achievements.json`] });
}
/** Every <stamp>/ folder of a snapshots directory, with the requests.log `logFile` (a stamp read already is skipped). */
const addSnaps = (root, logFile) => {
  const log = existsSync(logFile) ? logOf(logFile) : new Map();
  for (const s of existsSync(root) ? readdirSync(root).filter((s) => /^\d{4}-\d\d-\d\dT\d{4}Z$/.test(s)).sort() : []) {
    if (snaps.some((x) => x.id === s)) continue;
    const dir = join(root, s);
    const files = readdirSync(dir);
    const lb = files.includes("leaderboard-1.json") ? J(join(dir, "leaderboard-1.json")).data : [];
    const accounts = files.filter((f) => f.endsWith("-characters.json")).map((f) => f.slice(4, -16));
    snaps.push({ id: s, dir, log, from: stampMs(s), lb, accounts,
      achFiles: (a) => files.filter((f) => f.startsWith(`acc-${a}-achievements-`)).sort((x, y) => parseInt(x.split("-").pop()) - parseInt(y.split("-").pop())) });
  }
};
addSnaps(join(HOME, "snapshot"), join(HOME, "requests.log"));
if (DIR) addSnaps(DIR, join(DIR, "requests.log"));

/** When a path was read inside this snapshot: the first 200 line of its log at or after the stamp (022: the one line). */
const readAt = (snap, path) => (snap.log.get(path) ?? []).find((t) => t >= snap.from && t < snap.from + 3 * 3600e3);

const tileOf = (mapId) => {
  const t = tiles.get(mapId);
  const c = t?.interactions?.content;
  if (!c) return null;
  const out = { file: "maps.json", type: c.type, code: c.code };
  if (c.type === "monster") { const m = monsters.get(c.code); out.level = m?.level; out.mtype = m?.type; }
  if (c.type === "resource") { const r = resources.get(c.code); out.skill = r?.skill; out.level = r?.level; }
  return out;
};
const eventOf = (mapId) => (eventAt.get(mapId) ?? []).map((e) => {
  const o = { file: "events.json", ...e };
  if (e.type === "monster") { const m = monsters.get(e.code); o.level = m?.level; o.mtype = m?.type; }
  if (e.type === "resource") { const r = resources.get(e.code); o.skill = r?.skill; o.level = r?.level; }
  return o;
});
const SLOTS = ["weapon", "rune", "shield", "helmet", "body_armor", "leg_armor", "boots", "ring1", "ring2", "amulet", "artifact1", "artifact2", "artifact3", "bag"];
const STATS = ["max_hp", "hp", "speed", "haste", "critical_strike", "wisdom", "prospecting", "initiative", "threat", "attack_fire", "attack_earth", "attack_water", "attack_air", "dmg", "dmg_fire", "dmg_earth", "dmg_water", "dmg_air", "res_fire", "res_earth", "res_water", "res_air"];

const chars = [], accs = [], achs = [];
for (const snap of snaps) {
  const lbOf = new Map(snap.lb.map((r) => [r.account, r]));
  const order = [...snap.accounts].sort((a, b) => (lbOf.get(a)?.position ?? 1e9) - (lbOf.get(b)?.position ?? 1e9) || a.localeCompare(b));
  for (const a of order) {
    const r = lbOf.get(a);
    const path = `/accounts/${a}/characters`;
    const read = readAt(snap, path);
    const list = J(join(snap.dir, `acc-${a}-characters.json`)).data;
    const head = { snap: snap.id, account: a, rank: r?.position ?? null, points: r?.achievements_points ?? null, member: r?.member ?? null };
    for (const c of list) {
      const slots = Object.fromEntries(SLOTS.map((s) => [s, c[`${s}_slot`] || null]));
      slots.utility1 = c.utility1_slot ? { code: c.utility1_slot, qty: c.utility1_slot_quantity } : null;
      slots.utility2 = c.utility2_slot ? { code: c.utility2_slot, qty: c.utility2_slot_quantity } : null;
      const exp = c.cooldown_expiration ? Date.parse(c.cooldown_expiration) : null;
      chars.push({
        ...head, read: read ? new Date(read).toISOString() : null,
        name: c.name, level: c.level, xp: c.xp, max_xp: c.max_xp,
        skills: Object.fromEntries(SKILLS.map((s) => [s, { level: c[`${s}_level`], xp: c[`${s}_xp`], max_xp: c[`${s}_max_xp`] }])),
        stats: Object.fromEntries(STATS.map((k) => [k, c[k]])), effects: c.effects ?? [],
        slots, inventory: (c.inventory ?? []).filter((s) => s.code).map((s) => ({ code: s.code, qty: s.quantity })), inventory_max_items: c.inventory_max_items,
        gold: c.gold, pos: { x: c.x, y: c.y, layer: c.layer, map_id: c.map_id }, tile: tileOf(c.map_id), event: eventOf(c.map_id),
        task: c.task ? { code: c.task, type: c.task_type, progress: c.task_progress, total: c.task_total } : null,
        cooldown: c.cooldown, cooldown_expiration: c.cooldown_expiration ?? null,
        cd_left: exp != null && read ? Math.round((exp - read) / 100) / 10 : null,
      });
    }
    const lv = list.map((c) => c.level), top = Math.max(...lv);
    const holder = (s) => { const c = [...list].sort((x, y) => y[`${s}_level`] - x[`${s}_level`])[0]; return { name: c.name, level: c[`${s}_level`] }; };
    accs.push({
      ...head, read: read ? new Date(read).toISOString() : null, gold: r?.gold ?? null,
      names: list.map((c) => c.name), combat: lv,
      shape: { top, near: lv.filter((x) => x >= top - 3).length, mid: lv.filter((x) => x < top - 3 && x > top - 10).length, far: lv.filter((x) => x <= top - 10).length },
      crafters: Object.fromEntries(["weaponcrafting", "gearcrafting", "jewelrycrafting"].map((s) => [s, holder(s)])),
    });
    for (const f of snap.achFiles(a)) for (const x of J(join(snap.dir, f)).data) {
      const t = x.completed_at ? Date.parse(x.completed_at) : null;
      achs.push({ snap: snap.id, account: a, code: x.code, points: x.points, completed_at: x.completed_at ?? null, day: t ? sday(t) : null,
        objectives: (x.objectives ?? []).map((o) => ({ type: o.type, target: o.target ?? null, progress: o.progress ?? null, total: o.total })) });
    }
  }
}

mkdirSync(BASE, { recursive: true });
const write = (name, rows) => writeFileSync(join(BASE, name), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
write("characters.jsonl", chars);
write("accounts.jsonl", accs);
write("achievements.jsonl", achs);
console.log(`base: ${snaps.length} snapshots (${snaps.map((s) => `${s.id}: ${s.accounts.length} accounts`).join(", ")}); ${chars.length} character lines, ${accs.length} account lines, ${achs.length} achievement lines`);
