// The scenario API: boot the real engine against the fake game on the virtual
// clock, run queues, assert on the world / the action trace / the queue.
//
//   import { scenario } from "../harness/index.mts";
//   await scenario({ characters: [...], bank: {...} }, async (t) => {
//     t.queue("Ann", [{ kind: "gather", ... }]);
//     await t.run();
//     t.eq(t.bank("copper_ore"), 25, "the bank holds the yield");
//   });
//
// Every scenario also gets the mirror check (the engine's characters and bank
// equal the fake's world) and the `known` marker (a scenario that reproduces a
// recorded defect must FAIL; when it passes, the run fails until the marker goes).
// Exit codes for the runner: 0 pass · 1 fail · 2 harness error · 3 known defect reproduced.

import "./guard.mts"; // first: refuses to run outside the runner's scratch storage
import { T0, advance, drain } from "./clock.mts"; // second: the engine must load on the virtual clock
import { readFile } from "node:fs/promises";
import path from "node:path";
import { effect } from "@preact/signals";
import { setToken } from "../../src/api/client";
import { loadCatalog } from "../../src/catalog";
import { setDataReader } from "../../src/catalog/load";
import { setDevlogSink } from "../../src/lib/devlog";
import { queueItemText, withId } from "../../src/plan/queue";
import { addItem, insertItem, queues, setRepeat, startQueue } from "../../src/state/queue";
import { bankDetails, bankItems, characters, lastError } from "../../src/state/store";
import { boot } from "../../src/state/sync";
import type { QueueItemInput } from "../../src/plan/queue";
import type { QueueState } from "../../src/state/queue";
import type { ActiveEvent } from "../../src/types/api";
import { fakeFetch, held, seedWorld, world } from "./fake.mts";
import type { Call, WorldInit } from "./fake.mts";

export interface ScenarioDef extends WorldInit {
  /** Audit reference of the defect this scenario reproduces, e.g. "B.4-1". */
  known?: string;
  /** This scenario expects bounces (see bounces()); without it any bounce fails the scenario. */
  bounces?: boolean;
  /** Exceeding either fails the scenario. Defaults: 500 actions, 180 virtual minutes. */
  limits?: { actions?: number; minutes?: number };
}

/** An expectation that did not hold (as opposed to a broken harness). */
class Failure extends Error {}

const NAME = path.basename(process.argv[1] ?? "scenario").replace(/\.mts$/, "");
const VERBOSE = !!process.env.AMMO_CHECK_VERBOSE;
const devlines: string[] = [];
let queueWrites = 0;

const stamp = (ms: number): string => new Date(ms).toISOString().slice(11, 21);
const showCall = (c: Call): string =>
  `  ${stamp(c.t)}  ${c.who.padEnd(6)} ${c.action}${c.body === undefined ? "" : " " + JSON.stringify(c.body)} -> ${c.code === 200 ? (c.note ?? "ok") : c.code}`;

function report(lastCalls: number, lastLog: number): void {
  const calls = world.trace.slice(-lastCalls);
  console.log(`Trace (${calls.length} of ${world.trace.length} actions, virtual time since the start):`);
  for (const c of calls) console.log(showCall(c));
  console.log("Queues:");
  for (const [name, q] of Object.entries(queues.value)) {
    const head = q.items[0];
    const state = q.running ? "running" : head?.error ? "paused" : head ? "stopped" : "done";
    console.log(`  ${name}: ${state}, ${q.items.length} item(s) left${head ? ` — head: ${queueItemText(head)}${head.error ? ` — error: ${head.error}` : ""}` : ""}`);
  }
  console.log(`Dev log (last ${Math.min(lastLog, devlines.length)} of ${devlines.length} lines, in memory only):`);
  for (const l of devlines.slice(-lastLog)) console.log(`  ${l}`);
}

/** A broken harness or an unanswerable call: print what we have and stop at once. */
function die(msg: string): never {
  drain(600); // the dev log's buffer
  report(40, 30);
  console.log(`ERROR ${NAME}: ${msg}`);
  process.exit(2);
}

/** First difference between the engine's copy and the game's, as "path: engine X, game Y". */
function diff(mine: unknown, truth: unknown, at: string): string | undefined {
  if (mine === truth) return undefined;
  if (mine && truth && typeof mine === "object" && typeof truth === "object") {
    for (const k of new Set([...Object.keys(mine), ...Object.keys(truth)])) {
      const d = diff((mine as Record<string, unknown>)[k], (truth as Record<string, unknown>)[k], `${at}.${k}`);
      if (d) return d;
    }
    return undefined;
  }
  return `${at}: engine ${JSON.stringify(mine)}, game ${JSON.stringify(truth)}`;
}

function mirror(): string | undefined {
  for (const [name, truth] of world.chars) {
    const d = diff(characters.value[name], truth, name);
    if (d) return `mirror: ${d}`;
  }
  const mine = new Map<string, number>();
  for (const b of bankItems.value) mine.set(b.code, (mine.get(b.code) ?? 0) + b.quantity);
  for (const code of new Set([...mine.keys(), ...world.bank.keys()])) {
    if ((mine.get(code) ?? 0) !== (world.bank.get(code) ?? 0)) return `mirror: bank.${code}: engine ${mine.get(code) ?? 0}, game ${world.bank.get(code) ?? 0}`;
  }
  if (bankDetails.value?.gold !== world.gold) return `mirror: bank gold: engine ${bankDetails.value?.gold}, game ${world.gold}`;
  return undefined;
}

/**
 * Bounces: a character withdraws a code and deposits the same code again with
 * nothing but moves in between — stock fetched and put straight back, the
 * signature of two parts of the runner disagreeing about what is working stock.
 */
function bounces(): string[] {
  const out: string[] = [];
  const fresh = new Map<string, Set<string>>(); // per character: codes of its last withdrawal, until it does anything but move
  for (const c of world.trace) {
    if (c.code !== 200 || c.action === "move") continue;
    const codes = c.action.startsWith("bank/") && Array.isArray(c.body) ? (c.body as { code: string }[]).map((s) => s.code) : [];
    if (c.action === "bank/deposit/item") for (const code of codes) if (fresh.get(c.who)?.has(code)) out.push(`${c.who} ${code} at ${stamp(c.t)}`);
    if (c.action === "bank/withdraw/item") fresh.set(c.who, new Set(codes));
    else fresh.delete(c.who);
  }
  return out;
}

function handle(limits: { actions: number; minutes: number }) {
  const ok = (cond: unknown, msg: string): void => {
    if (!cond) throw new Failure(msg);
  };
  return {
    /** The fake's truth, plus fault injection: world.fault(), world.forceFight(), world.yields. */
    world,
    /** Append items to a character's queue and start it. */
    queue(name: string, items: QueueItemInput[], opts: { repeat?: boolean } = {}): void {
      for (const it of items) addItem(name, withId(it));
      if (opts.repeat) setRepeat(name, true);
      startQueue(name);
    },
    /** Put an item at `index` of a queue, even ahead of the running head — what the automatic writers do (insertItem). */
    insert(name: string, item: QueueItemInput, index = 0): void {
      insertItem(name, withId(item), index);
    },
    /**
     * Let virtual time pass: until `until()` holds, or for `minutes`, or (neither
     * given) until no queue is running — idle, paused or stopped. A limit of the
     * scenario reached first is a failure.
     */
    async run(opts: { until?: () => boolean; minutes?: number } = {}): Promise<void> {
      const cap = T0 + limits.minutes * 60_000;
      const stopAt = opts.minutes != null ? Date.now() + opts.minutes * 60_000 : Infinity;
      const done = opts.until ?? (opts.minutes != null ? () => false : () => Object.values(queues.value).every((q) => !q.running));
      const tooMany = (): boolean => world.trace.length > limits.actions;
      const stopped = await advance(() => tooMany() || done(), Math.min(stopAt, cap));
      if (tooMany()) throw new Failure(`limit: more than ${limits.actions} actions`);
      if (!stopped && stopAt > cap) throw new Failure(`limit: more than ${limits.minutes} virtual minutes`);
    },
    /** The engine's queue of a character. */
    q: (name: string): QueueState => queues.value[name] ?? { items: [], running: false },
    /** Action calls so far, optionally of one action and/or one character, in order. */
    calls: (action?: string, who?: string): Call[] => world.trace.filter((c) => (!action || c.action === action) && (!who || c.who === who)),
    /** World: how many of `code` the character carries. */
    inv: (name: string, code: string): number => held(world.chars.get(name)!, code),
    /** World: how many of `code` the bank holds. */
    bank: (code: string): number => world.bank.get(code) ?? 0,
    /** Writes to the engine's queues signal so far (each is a storage write and an SSE push in the service). */
    queueWrites: (): number => queueWrites,
    ok,
    eq<V>(got: V, want: V, msg: string): void {
      ok(JSON.stringify(got) === JSON.stringify(want), `${msg}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
    },
  };
}
export type Scenario = ReturnType<typeof handle>;

/** A merchant event that is up from half an hour before the scenario starts until `minutes` after. */
export const merchantEvent = (code: string, x: number, y: number, minutes = 60): ActiveEvent => ({
  name: code, code, duration: minutes + 30, previous_map: null,
  created_at: new Date(T0 - 30 * 60_000).toISOString(), expiration: new Date(T0 + minutes * 60_000).toISOString(),
  map: { map_id: 0, name: code, skin: code, x, y, layer: "overworld", access: { type: "standard", conditions: [] }, interactions: { content: { type: "npc", code }, transition: null } },
});

export async function scenario(def: ScenarioDef, body: (t: Scenario) => Promise<void> | void): Promise<never> {
  world.onFatal = die;
  (globalThis as { fetch: unknown }).fetch = fakeFetch;
  setDevlogSink((lines) => void devlines.push(...lines.trimEnd().split("\n"))); // memory, never logs/dev.log
  // The catalog, by a path relative to this file. A missing file is an error, never the live API
  // (catalog/load.ts would fall back to it); only the optional atlas may be absent.
  setDataReader(async (name) => {
    try {
      return JSON.parse(await readFile(new URL(`../../public/data/${name}.json`, import.meta.url), "utf8"));
    } catch (e) {
      if ((name as string) === "atlas") throw e;
      return die(`catalog file public/data/${name}.json: ${(e as Error).message}`);
    }
  });
  setToken("harness"); // boot() only syncs with a token; this one never leaves the process
  await loadCatalog(); // before the world: worn gear is read from the catalog (boot() finds it loaded)
  seedWorld(def);
  await boot();
  if (lastError.value) die(`boot sync failed: ${lastError.value}`);
  effect(() => void (queues.value, queueWrites++));
  queueWrites = 0;

  let failed: string | undefined;
  try {
    await body(handle({ actions: def.limits?.actions ?? 500, minutes: def.limits?.minutes ?? 180 }));
    const b = def.bounces ? [] : bounces();
    failed = mirror() ?? (b.length ? `bounce: ${b.length} withdrawal(s) put straight back, first: ${b[0]}` : undefined);
  } catch (e) {
    if (!(e instanceof Failure)) die((e as Error).stack ?? String(e));
    failed = e.message;
  }
  // Over: from here every request throws, and no engine code runs again.
  world.ended = true;
  drain(600); // the dev log's buffer

  const actions = `${world.trace.length} actions, ${Math.round((Date.now() - T0) / 60_000)} virtual min`;
  // The verdict is the LAST line: the runner shows it next to the name.
  if (VERBOSE) report(Infinity, 60);
  else if (failed && !def.known) report(40, 30);
  if (failed && def.known) {
    console.log(`known defect reproduced (${def.known}) — ${failed} [${actions}]`);
    process.exit(3);
  }
  if (failed) {
    console.log(`FAIL — ${failed} [${actions}]`);
    process.exit(1);
  }
  if (def.known) {
    console.log(`FAIL — passes, but is marked known (${def.known}): fixed? remove the marker [${actions}]`);
    process.exit(1);
  }
  console.log(`ok [${actions}]`);
  process.exit(0);
}
