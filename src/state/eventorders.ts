// Event standing orders, runtime half: each live merchant spawn not handled yet
// gets its order (plan/events.ts merchantOrder) as the planner's `merchant`
// interrupt on the nearest free owned character, and the spawn is remembered
// (persisted), so polls and restarts never repeat it. An event that ends
// mid-trip skips the rest (missing map target, `partial` sells) and the step
// underneath resumes. Server-only, like every runner.
//
// Task 013: a monster or resource spawn and the characters the planner owns — the core decides the members
// (src/plan/planner/events.ts eventPlans: the demand, who goes, why not) at every poll while the spawn is up, and each
// member gets an `event` interrupt with the trip (tripOf); interrupt() is idempotent per character and spawn, so a
// spawn seen again adds only a character that became capable or free since. One `plan: event …` line per spawn, one
// more when a member joins later. Task 018: a character the planner does not own gets no order of any kind.

import { effect, signal } from "@preact/signals";
import { IS_SERVER } from "../lib/remote";
import { devlog } from "../lib/devlog";
import { journal } from "../lib/journal";
import { achievements, bankDetails, bankItems, characters, isOwned, pushLog } from "./store";
import { queues } from "./queue";
import { setReservedOf } from "./exec";
import { interrupt, planner, worldOf } from "./planner";
import { reserved } from "../plan/planner/stock";
import { eventKey, liveEvents } from "./events";
import { merchantOrder, type EventOrder } from "../plan/events";
import { itemsOf } from "../plan/planner/compile";
import { eventDemandOpen, eventPlans as planEvents, tripOf } from "../plan/planner/events";
import type { Trips } from "../plan/planner/events";
import type { QueueItemInput } from "../plan/queue";
import type { ActiveEvent, Character } from "../types/api";

// Task 023, settled point 2: an owned character's own fight solves and its offerings leave what the planner's running steps
// reserved in the bank (exec.ts freeQty) — the hook is set here, the runtime module that reads the planner's World already
if (IS_SERVER) setReservedOf((name) => reserved(worldOf(Date.now()), name));

const KEY = "ammo:v1:eventOrders";
function load(): Record<string, string> {
  try {
    return (JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, string>) ?? {};
  } catch {
    return {};
  }
}

/** Live event spawn → what the fleet does about it (shown on Fleet's "Needs you"). */
export const eventPlans = signal<Record<string, string>>(IS_SERVER ? load() : {});
if (IS_SERVER) effect(() => {
  try {
    localStorage.setItem(KEY, JSON.stringify(eventPlans.value));
  } catch {
    /* quota / unavailable — non-fatal */
  }
});

/** Characters free for a trip: owned, running queue, its head not an interrupt of the class event or higher.
 *  Task 018: a character the planner does not own is never free (it gets no order). */
function free(): Character[] {
  return Object.values(characters.value).filter((c) => {
    const q = queues.value[c.name];
    const head = q?.items[0];
    return isOwned(c.name) && !!q?.running && !/^pl:int:(group|event):/.test(head?.id ?? "");
  });
}

const isField = (e: ActiveEvent): boolean => ["monster", "resource"].includes(e.map.interactions?.content?.type ?? "");

/** The order for one merchant event: an EventOrder, "none" (nothing worth doing — done
 *  with it), or undefined (worth doing but nobody is free — retry next poll).
 *  A monster or resource spawn is the core's (ownedEvents): "none" here. */
function orderFor(e: ActiveEvent, all: Character[]): EventOrder | "none" | undefined {
  const c = e.map.interactions?.content;
  if (c?.type === "npc") {
    const o = merchantOrder(c.code, bankItems.value, bankDetails.value?.gold ?? 0, Object.values(characters.value));
    if (!o) return "none";
    const dist = (ch: Character): number => Math.abs(ch.x - e.map.x) + Math.abs(ch.y - e.map.y);
    const near = [...all].sort((a, b) => dist(a) - dist(b))[0];
    return near ? { ...o, character: near.name } : undefined;
  }
  return "none";
}

const EVENT_PREFIX = "pl:int:event:";
/** Task 013, settled point 3: who of the owned characters is taken — in a `group` interrupt, on a spawn's trip (its
 *  key), after 22:00 UTC its offering interrupt first. */
function busyOf(names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const late = new Date().getUTCHours() >= 22;
  for (const n of names) {
    const items = queues.value[n]?.items ?? [];
    const trip = items.find((it) => it.id.startsWith(EVENT_PREFIX))?.id;
    if (items.some((it) => it.id.startsWith("pl:int:group:"))) out[n] = "group";
    else if (trip) out[n] = trip.slice(EVENT_PREFIX.length, trip.lastIndexOf(":"));
    else if (late && items.some((it) => it.id.startsWith("pl:int:offering:"))) out[n] = "offering";
  }
  return out;
}
/** Task 023, settled point 2 (d): the set and the take each trip in the queues carries (its fight item's `wear` and `take`) —
 *  the core books them, so the members after it never plan on a piece or a potion its reset has not withdrawn yet. */
function tripsOf(names: string[]): Trips {
  const out: Trips = {};
  for (const n of names) {
    const items = (queues.value[n]?.items ?? []).filter((it) => it.id.startsWith(EVENT_PREFIX));
    const fight = items.find((it) => it.kind === "fight");
    // the trip's reset (tripOf's first item, `…:0`) still in the queue: its take is not withdrawn yet
    if (fight?.kind === "fight") out[n] = { wear: fight.wear, take: fight.take, reset: items.some((it) => it.kind === "gear" && it.id.endsWith(":0")) };
  }
  return out;
}
/** Spawn key → the owned characters sent there (this process): one whose trip was removed (a pause) is not sent to that
 *  spawn again — `done:<key>` to the core. */
const sent = new Map<string, Set<string>>();

/** Settled point 5: the step underneath resumes in its own set — its own bank reset (the step's first item) ends the trip. */
function backTo(name: string): QueueItemInput | undefined {
  const r = planner.value.current[name], ch = characters.value[name];
  const first = r && !r.over && ch ? itemsOf(r.step, ch)[0] : undefined;
  return first?.kind === "gear" && first.reset ? { kind: "gear", job: first.job, reset: true } : undefined;
}

/** Task 013: the owned characters' event work — every live monster or resource spawn, at every poll. Task 016: each
 *  spawn's plan (its line and members) into `seen`, for the journal's `event` record. */
function ownedEvents(live: ActiveEvent[], plans: Record<string, string>, seen: Map<string, Record<string, unknown>>): void {
  const names = Object.keys(characters.value).filter(isOwned);
  const field = live.filter(isField);
  if (!names.length || !field.length || !achievements.value) return; // the demand waits for the first achievements read
  const busy = busyOf(names);
  for (const k of [...sent.keys()]) if (!field.some((e) => eventKey(e) === k)) sent.delete(k);
  for (const k of field.map(eventKey)) for (const n of sent.get(k) ?? []) if (!busy[n]) busy[n] = `done:${k}`;
  // a spawn nobody needs, or whose demand does not fit, stays so for its hour: not evaluated again (a gear-needs read)
  const open = field.filter((e) => !/^nothing to do — (nobody needs it|does not fit)/.test(plans[eventKey(e)] ?? ""));
  if (!open.length) return;
  for (const p of planEvents(open, worldOf(Date.now()), busy, tripsOf(names))) {
    const joined: string[] = [];
    for (const m of p.members) {
      if (busy[m.name] === p.key) continue; // on the trip already
      if (interrupt(m.name, "event", tripOf(p.content, backTo(m.name), m.take, p.content.type === "monster" ? m.set : undefined), p.key)) joined.push(`${m.name} (${m.why})`);
      (sent.get(p.key) ?? sent.set(p.key, new Set()).get(p.key)!).add(m.name);
    }
    if (!(p.key in plans)) devlog(`plan: ${p.line}`);
    else if (joined.length) devlog(`plan: event ${p.code} — joins: ${joined.join(", ")}`);
    seen.set(p.key, { line: p.line, members: p.members.map((m) => ({ who: m.name, why: m.why, take: m.take })), joined: joined.length ? joined : undefined });
    plans[p.key] = p.members.length ? `${p.members.map((m) => m.name).join(", ")}: ${p.content.type === "monster" ? "fight" : "gather"} until the event ends` : `nothing to do — ${p.line.slice(p.line.indexOf(" — ") + 3)}`;
  }
}

/** A verdict with its members' names sorted ("Ann, Cat, Ben: fight …" → "Ann, Ben, Cat: fight …"). */
const members = (v: string): string => v.replace(/^([A-Za-z0-9_]+(?:, [A-Za-z0-9_]+)*):/, (_, n: string) => `${n.split(", ").sort().join(", ")}:`);

/** Dispatch orders for every live event spawn not handled yet. Idempotent. */
export function reactToEvents(): void {
  if (!IS_SERVER) return;
  const live = liveEvents();
  const keys = new Set(live.map(eventKey));
  const plans = Object.fromEntries(Object.entries(eventPlans.value).filter(([k]) => keys.has(k))); // ended spawns go
  let candidates = free();
  for (const e of live) {
    const k = eventKey(e);
    if (k in plans) continue;
    const o = orderFor(e, candidates);
    if (!o) continue;
    if (o === "none") {
      if (!isField(e) || !Object.keys(characters.value).some(isOwned)) plans[k] = "nothing to do";
      continue;
    }
    interrupt(o.character, "merchant", o.items, k);
    plans[k] = `${o.character}: ${o.text}`;
    candidates = candidates.filter((ch) => ch.name !== o.character);
    pushLog({ ts: Date.now(), character: o.character, action: "event", text: `${e.name}: ${o.text} — then back to the queue`, kind: "info" });
  }
  const seen = new Map<string, Record<string, unknown>>();
  ownedEvents(live, plans, seen);
  // task 016: one `event` record a spawn, one more each time its verdict changes (the same members in another order is none)
  const same = (a: string, b: string | undefined): boolean => !!b && members(a) === members(b);
  for (const e of live) {
    const k = eventKey(e);
    if (plans[k] === undefined || same(plans[k], eventPlans.value[k])) continue;
    journal("event", { key: k, code: e.code, at: [e.map.x, e.map.y, e.map.layer], until: e.expiration, verdict: plans[k], ...seen.get(k) });
  }
  if (JSON.stringify(plans) !== JSON.stringify(eventPlans.value)) eventPlans.value = plans;
}

/** Task 013, settled point 6: the event poll's interval — every 2 minutes while an owned character's world has
 *  event-gated demand open (30 of the data bucket's 2,000 requests an hour), else every 5 (12). */
export function eventPollMs(): number {
  if (!IS_SERVER || !Object.keys(characters.value).some(isOwned)) return 5 * 60_000;
  return eventDemandOpen(worldOf(Date.now())) ? 2 * 60_000 : 5 * 60_000;
}
