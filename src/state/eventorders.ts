// Event standing orders, runtime half: each live event spawn not handled yet
// gets its orders (plan/events.ts) AHEAD of one running queue's head — the way
// the daily offerings trigger does — and the spawn is remembered (persisted),
// so polls and restarts never repeat it. An event that ends mid-trip skips the
// rest (missing map target, `partial` sells) and the old head resumes; ev:*
// items are never recycled by 🔁. Server-only, like every runner.

import { effect, signal } from "@preact/signals";
import { IS_SERVER } from "../lib/remote";
import { bankDetails, bankItems, characters, isOwned, pushLog } from "./store";
import { insertItem, queues } from "./queue";
import { interrupt } from "./planner";
import { eventKey, liveEvents } from "./events";
import { fieldOrder, merchantOrder, type EventOrder } from "../plan/events";
import type { QueueItem } from "../plan/queue";
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

/** The order for one event: an EventOrder, "none" (nothing worth doing — done
 *  with it), or undefined (worth doing but nobody is free — retry next poll). */
function orderFor(e: ActiveEvent, all: Character[]): EventOrder | "none" | undefined {
  const candidates = e.map.interactions?.content?.type === "npc" ? all : all.filter((c) => !offeringFirst(c));
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
      plans[k] = "nothing to do";
      continue;
    }
    if (isOwned(o.character)) interrupt(o.character, e.map.interactions?.content?.type === "npc" ? "merchant" : "event", o.items, k);
    else o.items.forEach((it, i) => insertItem(o.character, { ...it, id: `ev:${k}:${i}` } as QueueItem, i));
    plans[k] = `${o.character}: ${o.text}`;
    candidates = candidates.filter((ch) => ch.name !== o.character);
    pushLog({ ts: Date.now(), character: o.character, action: "event", text: `${e.name}: ${o.text} — then back to the queue`, kind: "info" });
  }
  if (JSON.stringify(plans) !== JSON.stringify(eventPlans.value)) eventPlans.value = plans;
}
