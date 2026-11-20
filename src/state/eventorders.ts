// Event standing orders, runtime half: each live event spawn not handled yet
// gets its orders (plan/events.ts) AHEAD of one running queue's head — the way
// the daily offerings trigger does — and the spawn is remembered (persisted),
// so polls and restarts never repeat it. An event that ends mid-trip skips the
// rest (missing map target, `partial` sells) and the old head resumes; ev:*
// items are never recycled by 🔁. Server-only, like every runner.
//
// Task 013: a monster or resource spawn and the characters the planner owns — the core decides the members
// (src/plan/planner/events.ts eventPlans: the demand, who goes, why not) at every poll while the spawn is up, and each
// member gets an `event` interrupt with the trip (tripOf); interrupt() is idempotent per character and spawn, so a
// spawn seen again adds only a character that became capable or free since. One `plan: event …` line per spawn, one
// more when a member joins later. Merchants, and characters the planner does not own, keep the orders below.

import { effect, signal } from "@preact/signals";
import { IS_SERVER } from "../lib/remote";
import { devlog } from "../lib/devlog";
import { achievements, bankDetails, bankItems, characters, isOwned, pushLog } from "./store";
import { insertItem, queues } from "./queue";
import { interrupt, planner, worldOf } from "./planner";
import { eventKey, liveEvents } from "./events";
import { fieldOrder, merchantOrder, type EventOrder } from "../plan/events";
import { itemsOf } from "../plan/planner/compile";
import { eventDemandOpen, eventPlans as planEvents, tripOf } from "../plan/planner/events";
import type { QueueItem, QueueItemInput } from "../plan/queue";
import type { ActiveEvent, Character } from "../types/api";

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

/** Characters free for a trip: running queue, not holding for a boss, not already on a trip. A character the
 *  planner owns: running queue, its head not an interrupt of the class event or higher. */
function free(): Character[] {
  return Object.values(characters.value).filter((c) => {
    const q = queues.value[c.name];
    const head = q?.items[0];
    if (isOwned(c.name)) return !!q?.running && !/^pl:int:(group|event):/.test(head?.id ?? "");
    return !!q?.running && head?.kind !== "prepare" && !head?.id.startsWith("ev:");
  });
}

/** After 22:00 UTC an owned character whose offerings of the day are still open is not free for an event (design C.3). */
const offeringFirst = (c: Character): boolean =>
  isOwned(c.name) && new Date().getUTCHours() >= 22 && !!queues.value[c.name]?.items.some((it) => it.id.startsWith("pl:int:offering:"));

const isField = (e: ActiveEvent): boolean => ["monster", "resource"].includes(e.map.interactions?.content?.type ?? "");

/** The order for one event: an EventOrder, "none" (nothing worth doing — done
 *  with it), or undefined (worth doing but nobody is free — retry next poll).
 *  Task 013: a monster or resource spawn goes to the characters the planner does not own only. */
function orderFor(e: ActiveEvent, all: Character[]): EventOrder | "none" | undefined {
  const candidates = e.map.interactions?.content?.type === "npc" ? all : all.filter((c) => !offeringFirst(c) && !isOwned(c.name));
  const c = e.map.interactions?.content;
  if (c?.type === "npc") {
    const o = merchantOrder(c.code, bankItems.value, bankDetails.value?.gold ?? 0, Object.values(characters.value));
    if (!o) return "none";
    const dist = (ch: Character): number => Math.abs(ch.x - e.map.x) + Math.abs(ch.y - e.map.y);
    const near = [...candidates].sort((a, b) => dist(a) - dist(b))[0];
    return near ? { ...o, character: near.name } : undefined;
  }
  if (c?.type === "monster" || c?.type === "resource") {
    if (!candidates.length) return undefined;
    return fieldOrder(e, bankItems.value, candidates) ?? "none";
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
/** Spawn key → the owned characters sent there (this process): one whose trip was removed (a pause) is not sent to that
 *  spawn again — `done:<key>` to the core. */
const sent = new Map<string, Set<string>>();

/** Settled point 5: the step underneath resumes in its own set — its own bank reset (the step's first item) ends the trip. */
function backTo(name: string): QueueItemInput | undefined {
  const r = planner.value.current[name], ch = characters.value[name];
  const first = r && !r.over && ch ? itemsOf(r.step, ch)[0] : undefined;
  return first?.kind === "gear" && first.reset ? { kind: "gear", job: first.job, reset: true } : undefined;
}

/** Task 013: the owned characters' event work — every live monster or resource spawn, at every poll. */
function ownedEvents(live: ActiveEvent[], plans: Record<string, string>): void {
  const names = Object.keys(characters.value).filter(isOwned);
  const field = live.filter(isField);
  if (!names.length || !field.length || !achievements.value) return; // the demand waits for the first achievements read
  const busy = busyOf(names);
  for (const k of [...sent.keys()]) if (!field.some((e) => eventKey(e) === k)) sent.delete(k);
  for (const k of field.map(eventKey)) for (const n of sent.get(k) ?? []) if (!busy[n]) busy[n] = `done:${k}`;
  // a spawn nobody needs, or whose demand does not fit, stays so for its hour: not evaluated again (a gear-needs read)
  const open = field.filter((e) => !/^nothing to do — (nobody needs it|does not fit)/.test(plans[eventKey(e)] ?? ""));
  if (!open.length) return;
  for (const p of planEvents(open, worldOf(Date.now()), busy)) {
    const joined: string[] = [];
    for (const m of p.members) {
      if (busy[m.name] === p.key) continue; // on the trip already
      if (interrupt(m.name, "event", tripOf(p.content, backTo(m.name)), p.key)) joined.push(`${m.name} (${m.why})`);
      (sent.get(p.key) ?? sent.set(p.key, new Set()).get(p.key)!).add(m.name);
    }
    if (!(p.key in plans)) devlog(`plan: ${p.line}`);
    else if (joined.length) devlog(`plan: event ${p.code} — joins: ${joined.join(", ")}`);
    plans[p.key] = p.members.length ? `${p.members.map((m) => m.name).join(", ")}: ${p.content.type === "monster" ? "fight" : "gather"} until the event ends` : `nothing to do — ${p.line.slice(p.line.indexOf(" — ") + 3)}`;
  }
}

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
    if (isOwned(o.character)) interrupt(o.character, "merchant", o.items, k); // a field order never goes to an owned character
    else o.items.forEach((it, i) => insertItem(o.character, { ...it, id: `ev:${k}:${i}` } as QueueItem, i));
    plans[k] = `${o.character}: ${o.text}`;
    candidates = candidates.filter((ch) => ch.name !== o.character);
    pushLog({ ts: Date.now(), character: o.character, action: "event", text: `${e.name}: ${o.text} — then back to the queue`, kind: "info" });
  }
  ownedEvents(live, plans);
  if (JSON.stringify(plans) !== JSON.stringify(eventPlans.value)) eventPlans.value = plans;
}

/** Task 013, settled point 6: the event poll's interval — every 2 minutes while an owned character's world has
 *  event-gated demand open (30 of the data bucket's 2,000 requests an hour), else every 5 (12). */
export function eventPollMs(): number {
  if (!IS_SERVER || !Object.keys(characters.value).some(isOwned)) return 5 * 60_000;
  return eventDemandOpen(worldOf(Date.now())) ? 2 * 60_000 : 5 * 60_000;
}
