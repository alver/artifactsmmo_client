// The journal (task 016; the schema is docs/journal.md): what the planner decided and what each step did, one JSON
// record a line, written by the runtime at the moment the thing happens from what the engine knows then — never derived
// from the raw log. Beside it: the raw log in hourly files, a status file rewritten every minute, a World snapshot a day.
// Which file a line goes to is decided here (fileSinks): the service hands it the disk (src/server/main.ts), the harness
// a Map (scripts/harness/index.mts). Every write is caught: a write that fails is dropped, as devlog's is, and never
// breaks the runner. In the tab nothing is installed and nothing is written.
//
// The meter (settled point 4) sits in act() (src/api/actions.ts), the one place every action's echo passes. Per
// character, an action's slice runs from its request to the character's next request (or the cut); its echo's
// cooldown seconds go to the group of the cooldown's reason, the rest of the slice is `wait` (retries, an outage hold,
// the runtime's own time). A slice belongs to the bucket the runtime names at the request (setMeterKey: the head item's
// step or interrupt); meterCut hands a bucket over and forgets it. In memory only: a restart loses what was metered.

import { RUN } from "./devlog";
import type { ActionResult, Character } from "../types/api";
import type { ItemStack } from "../types/catalog";

export type Rec = Record<string, unknown>;

// ── the writers ──────────────────────────────────────────────────────────────

interface Sinks {
  record?: (line: string, t: number) => void;
  status?: (json: string) => void;
  world?: (day: string, json: string) => void;
  hasWorld?: (day: string) => boolean;
}
let sinks: Sinks = {};
const last: Rec = {}; // the last `pause` and `server` record (the status shows them)
let info: { dev?: boolean; commit?: string; branch?: string; up: string } = { up: new Date().toISOString() };

/** The run's own facts for the boot record and the status: dev or prod, the commit the checkout stood on (main.ts). */
export const setRunInfo = (i: { dev?: boolean; commit?: string; branch?: string }): void => void (info = { ...info, ...i });
export const runInfo = (): typeof info => info;
export const lastRecords = (): Rec => last;

const held: { line: string; t: number }[] = [];
let booted = false;
/** One record: the time (ISO, UTC), the run id, the kind, the fields. A run's records start with its `boot` (the
 *  planner's resumePlanner): what comes before it (the offerings catch-up of resumeQueue) waits for it, 100 at most. */
export function journal(k: string, fields: Rec): void {
  const t = Date.now();
  const rec = { t: new Date(t).toISOString(), run: RUN, k, ...fields };
  if (k === "pause" || k === "server") last[k] = rec;
  if (!sinks.record) return;
  try {
    const line = JSON.stringify(rec);
    if (!booted && k !== "boot" && held.length < 100) return void held.push({ line, t });
    sinks.record(line, t);
    if (k === "boot") booted = true;
    for (const h of held.splice(0)) sinks.record(h.line, h.t);
  } catch {
    /* disk trouble — the journal must never break the runner */
  }
}

/** The status file, rewritten whole. */
export function writeStatus(status: Rec): void {
  try {
    sinks.status?.(JSON.stringify(status, null, 1));
  } catch {
    /* as above */
  }
}

/** The day's World snapshot, unless the day has one. True when it was written now. */
export function writeWorld(day: string, snapshot: () => Rec): boolean {
  try {
    if (!sinks.world || sinks.hasWorld?.(day)) return false;
    sinks.world(day, JSON.stringify(snapshot()));
    return true;
  } catch {
    return false;
  }
}

/** Where the files go: `append` adds to a file, `replace` writes a file whole (the service: a temporary file and a
 *  rename, so a reader never sees half a status), `exists` asks. Paths use "/" under `root`. */
export interface Disk {
  append(path: string, text: string): void;
  replace(path: string, text: string): void;
  exists(path: string): boolean;
}

const dayOf = (t: number): string => new Date(t).toISOString().slice(0, 10);
const STAMP = /^\d{4}-\d\d-\d\dT\d\d/;

/**
 * Settled point 1: every file of the journal under `root` (logs/), all in UTC — `journal/<day>.jsonl` by the record's
 * time, `status.json`, `world/<day>.json`. Returns the raw log's sink for setDevlogSink: each line goes to
 * `raw/<day>/<HH>.log` by its own time stamp (a line without one — a stack's next line — goes with the line before), so
 * an hour's or a day's turn needs no timer: the first line of the new hour opens the new file.
 */
export function fileSinks(disk: Disk, root: string): (lines: string) => void {
  sinks = {
    record: (line, t) => disk.append(`${root}/journal/${dayOf(t)}.jsonl`, line + "\n"),
    status: (json) => disk.replace(`${root}/status.json`, json),
    world: (day, json) => disk.replace(`${root}/world/${day}.json`, json),
    hasWorld: (day) => disk.exists(`${root}/world/${day}.json`),
  };
  return (lines) => {
    const byHour = new Map<string, string[]>();
    let hour = new Date().toISOString().slice(0, 13);
    for (const l of lines.split("\n")) {
      if (!l) continue;
      if (STAMP.test(l)) hour = l.slice(0, 13);
      (byHour.get(hour) ?? byHour.set(hour, []).get(hour)!).push(l);
    }
    for (const [h, ls] of byHour) disk.append(`${root}/raw/${h.slice(0, 10)}/${h.slice(11, 13)}.log`, ls.join("\n") + "\n");
  };
}

// ── the meter (settled point 4) ──────────────────────────────────────────────

/** The groups of docs/api/openapi.json's ActionType (a cooldown's `reason`); anything else is "other". */
const GROUP: Record<string, string> = {
  fight: "fight", raid_fight: "fight", multi_fight: "fight",
  rest: "rest", use: "eat",
  deposit_item: "bank", withdraw_item: "bank", deposit_gold: "bank", withdraw_gold: "bank", buy_bank_expansion: "bank",
  movement: "walk", transition: "walk",
  equip: "gear", unequip: "gear",
  gathering: "gather", crafting: "craft", recycling: "craft",
  buy_npc: "trade", sell_npc: "trade", buy_ge: "trade", sell_ge: "trade", create_buy_order_ge: "trade", fill_buy_order_ge: "trade", cancel_ge: "trade",
  task: "task",
};
export const GROUPS = ["fight", "rest", "eat", "bank", "walk", "gear", "gather", "craft", "trade", "task", "other", "wait"] as const;

/** What one bucket metered (docs/journal.md "the meter"). Empty fields are left out of a record. */
export interface Meter {
  s: number;                      // seconds metered: the slices, = Σ by (incl. wait)
  by: Record<string, number>;     // seconds by group, from the echoes' cooldowns; `wait` the rest
  n: Record<string, number>;      // actions by the cooldown's reason
  won?: number; lost?: number;    // fights
  xp?: Record<string, number>;    // by skill ("combat": the character's level)
  got?: Record<string, number>;   // fights' drops and gathers' items
  made?: Record<string, number>;  // what crafts made and recycling gave back
  used?: Record<string, number>;  // `use` (food)
  drunk?: Record<string, number>; // the worn utility stacks, before a fight less after it
  dep?: Record<string, number>;   // deposited, by code ("gold": gold)
  wd?: Record<string, number>;    // withdrawn, by code ("gold": gold)
  gin?: number; gout?: number;    // the character's gold in and out (bank gold moves are dep / wd)
}

const buckets = new Map<string, Map<string, Meter>>(); // character → bucket key → meter
const open = new Map<string, { key: string; at: number }>(); // character → its open slice
let keyOf: (name: string) => string = () => "";
/** The runtime names the bucket of an action at its request (src/state/planner.ts: the head item's step or interrupt). */
export const setMeterKey = (fn: (name: string) => string): void => void (keyOf = fn);

const bucket = (name: string, key: string): Meter => {
  let byKey = buckets.get(name);
  if (!byKey) buckets.set(name, (byKey = new Map()));
  let m = byKey.get(key);
  if (!m) byKey.set(key, (m = { s: 0, by: {}, n: {} }));
  return m;
};
const add = (o: Record<string, number>, k: string, v: number): void => void (o[k] = (o[k] ?? 0) + v);
const addTo = (m: Meter, f: "xp" | "got" | "made" | "used" | "drunk" | "dep" | "wd", k: string, v: number): void => {
  if (v) add((m[f] ??= {}), k, v);
};
function closeSlice(name: string, now: number): void {
  const o = open.get(name);
  if (!o) return;
  open.delete(name);
  bucket(name, o.key).s += Math.max(0, now - o.at) / 1000;
}

/** An action of `name` is about to be sent: the last slice ends, this one starts. Returns its bucket key. */
export function meterStart(name: string): string {
  const now = Date.now(), key = keyOf(name);
  closeSlice(name, now);
  open.set(name, { key, at: now });
  return key;
}

const SKILLS = ["mining", "woodcutting", "fishing", "weaponcrafting", "gearcrafting", "jewelrycrafting", "cooking", "alchemy"];
const num = (c: Character, k: string): number => (c as unknown as Record<string, number>)[k] ?? 0;

/** The echo of an action meterStart started: its cooldown, its counts, and the character before and after it. A level
 *  passed is a `level` record (any character). */
export function meterEcho(name: string, key: string, action: string, body: unknown, prev: Character | undefined, data: ActionResult): void {
  const m = bucket(name, key);
  const reason = data.cooldown?.reason ?? action;
  add(m.by, GROUP[reason] ?? "other", data.cooldown?.total_seconds ?? 0);
  add(m.n, reason, 1);
  const after = data.character?.name === name ? data.character : data.characters?.find((c) => c.name === name);
  const stacks = (b: unknown): ItemStack[] => (Array.isArray(b) ? (b as ItemStack[]) : []);
  if (data.fight) {
    const me = data.fight.characters?.find((c) => c.character_name === name) ?? data.fight.characters?.[0];
    if (data.fight.result === "win") m.won = (m.won ?? 0) + 1;
    else m.lost = (m.lost ?? 0) + 1;
    for (const d of me?.drops ?? []) addTo(m, "got", d.code, d.quantity);
    if (prev && after) for (const g of ["utility1", "utility2"]) {
      const code = (prev as unknown as Record<string, string>)[`${g}_slot`];
      if (!code) continue;
      const before = num(prev, `${g}_slot_quantity`);
      const now = (after as unknown as Record<string, string>)[`${g}_slot`] === code ? num(after, `${g}_slot_quantity`) : 0;
      addTo(m, "drunk", code, Math.max(0, before - now));
    }
  }
  if (action === "gathering") for (const i of data.details?.items ?? []) addTo(m, "got", i.code, i.quantity);
  if (action === "crafting" || action === "recycling") for (const i of data.details?.items ?? []) addTo(m, "made", i.code, i.quantity);
  if (action === "use") addTo(m, "used", (body as ItemStack).code, (body as ItemStack).quantity ?? 1);
  if (action === "bank/deposit/item") for (const i of stacks(body)) addTo(m, "dep", i.code, i.quantity);
  if (action === "bank/withdraw/item") for (const i of stacks(body)) addTo(m, "wd", i.code, i.quantity);
  if (action === "bank/deposit/gold") addTo(m, "dep", "gold", (body as { quantity: number }).quantity);
  if (action === "bank/withdraw/gold") addTo(m, "wd", "gold", (body as { quantity: number }).quantity);
  if (!prev || !after) return;
  if (!action.startsWith("bank/") || action === "bank/buy_expansion") {
    const d = after.gold - prev.gold;
    if (d > 0) m.gin = (m.gin ?? 0) + d;
    if (d < 0) m.gout = (m.gout ?? 0) - d;
  }
  for (const s of ["combat", ...SKILLS]) {
    const k = (f: string): string => (s === "combat" ? f : `${s}_${f}`);
    const L0 = num(prev, k("level")), L1 = num(after, k("level"));
    const xp = L1 === L0 ? num(after, k("xp")) - num(prev, k("xp")) : num(prev, k("max_xp")) - num(prev, k("xp")) + num(after, k("xp"));
    if (xp > 0) addTo(m, "xp", s, xp);
    if (L1 > L0) journal("level", { who: name, skill: s, lv: L1 });
  }
}

const r1 = (x: number): number => Math.round(x * 10) / 10;
/** A bucket's meter, closed: its open slice ends now, `wait` is the slices less the cooldowns. The bucket is forgotten. */
export function meterCut(name: string, key: string): Meter | undefined {
  if (open.get(name)?.key === key) closeSlice(name, Date.now());
  const m = buckets.get(name)?.get(key);
  if (!m) return undefined;
  buckets.get(name)!.delete(key);
  const busy = Object.values(m.by).reduce((s, v) => s + v, 0);
  // a cut inside a cooldown (a removed interrupt, a take-over): the slice is the cooldown, nothing waited
  const s = Math.max(m.s, busy);
  const by: Record<string, number> = {};
  for (const g of GROUPS) if (g === "wait" ? s - busy > 0.05 : m.by[g]) by[g] = r1(g === "wait" ? s - busy : m.by[g]);
  return { ...m, s: r1(s), by };
}
