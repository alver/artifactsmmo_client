// Task 027d: tasks and coins (pure; Alex, 2026-11-24: coins are no limit — they are earned by doing tasks).
//   1. A fighter holds a monsters task: its kill step starts at the monsters master when it holds none or a finished one
//      (complete, accept; an items task is cancelled there for a bank coin). Its kills count for the held task whatever the
//      fight is for (the game's rule); of near-equal fights the task's (decide.ts: the task's monster joins pickMonster's
//      `bonus`). A worker holds none by this rule.
//   2. Coins a need's bill lacks are a supply leaf, `src:tasks_coin` (supply.ts billOf), for a fighter: kills of its held
//      task's monster, a chunk at a time; the step that finishes the task turns it in (decide.ts).
//   3. A task worked on purpose (src:tasks_coin, the filler) is cancelled at the master before the work when the character
//      is not admitted to its monster or its hours left exceed a fresh draw's mean hours plus one coin's (`cancelOf`).
//   4. The forward model has no dice: a draw is the pool in a fixed rotation at its mean quantity (`drawOf`).
// The draw's pool is the game's rule as read here: docs/api/openapi.json states none for `task/new` ("Accepting a new task.");
// a task has a `level` (TaskFullSchema) and `/tasks/list` filters by `max_level`, so a draw is any monsters task at or below
// the character's combat level — the World of 11-24 agrees (Second at combat 26 holds Yellow Slime, a level-2 task).

import { catalog, monster as monsterOf, task as taskOf } from "../../catalog";
import { codeSec } from "./cost";
import { admitted, bankSec, fightRec, nearestSpot, placeOf, winSecOf } from "./reach";
import { roleOf } from "./roles";
import { MIN_COOLDOWN } from "../../sim/cost";
import type { Character } from "../../types/api";
import type { Task } from "../../types/catalog";
import type { Step, World } from "./types";

/** The monsters task a character works now: held, of monsters, not finished. */
export const monstersTask = (ch: Character): string | undefined =>
  ch.task && ch.task_type === "monsters" && ch.task_progress < ch.task_total ? ch.task : undefined;

/** The tasks coins a task pays (public/data/tasks.json). */
export const coinsOf = (code: string): number => taskOf(code)?.rewards.items.find((i) => i.code === "tasks_coin")?.quantity ?? 0;

/** "37 of 212 Spider (monsters)" — the held task as a why says it. */
export const taskText = (ch: Character): string =>
  `${ch.task_progress} of ${ch.task_total} ${ch.task_type === "monsters" ? monsterOf(ch.task)?.name ?? ch.task : ch.task}${ch.task_type === "items" ? " (items)" : ""}`;

const pools = new Map<number, Task[]>();
/** The monsters tasks a draw may give at this combat level, by level then code (the forward model's rotation). */
function poolOf(level: number): Task[] {
  let p = pools.get(level);
  if (!p) pools.set(level, (p = [...catalog().tasks.values()].filter((t) => t.type === "monsters" && t.level <= level).sort((a, b) => a.level - b.level || (a.code < b.code ? -1 : 1))));
  return p;
}
const meanQty = (t: Task): number => Math.round((t.min_quantity + t.max_quantity) / 2);

/** The forward model's draw (no dice): the fleet's n-th draw (World.drawn) takes the pool's task at the fraction n × 0.618…
 *  (mod 1) of the way through it, at its mean quantity — a Weyl sequence, so the draws spread over the pool's levels as random
 *  ones do (walked in order, the dear level-35 to 40 tasks came one after another and each was cancelled). */
export function drawOf(level: number, n: number): { code: string; total: number } | undefined {
  const p = poolOf(level);
  const t = p[Math.floor(((n * 0.6180339887498949) % 1) * p.length)];
  return t && { code: t.code, total: meanQty(t) };
}

/** A coin in the bank pays a cancel (the dead-end cancel's rule: any coin; COIN_FLOOR keeps coins from purchases). */
const coinIn = (world: World): boolean => world.bank.some((b) => b.code === "tasks_coin" && b.quantity >= 1);

/**
 * What a visit to the tasks master does before a fighter's kill step: nothing (it works an unfinished monsters task), turn
 * a finished one in and take another (`{}`), or cancel an items task for a bank coin and take a monsters one; with no coin
 * in the bank an items task stays (undefined: no visit). A worker gets none.
 */
export function startVisit(ch: Character, world: World): { cancel?: string } | undefined {
  if (roleOf(ch.name, world) !== "fighter" || monstersTask(ch)) return undefined;
  if (!ch.task || ch.task_progress >= ch.task_total) return {};
  return ch.task_type === "items" && coinIn(world) ? { cancel: ch.task } : undefined;
}

/** The seconds a visit adds to a step: from where the character stands to the monsters master (by way of the items master
 *  when it cancels an items task), then to the bank its reset starts at, instead of straight to that bank — and its actions
 *  (a turn-in or a cancel, the accept) at the game's least cooldown each. */
export function visitSec(ch: Character, world: World, cancel?: string): number {
  const here = placeOf(ch);
  const items = cancel && ch.task_type === "items" ? nearestSpot(here, "tasks_master", "items", world, ch.name) : undefined;
  const m = nearestSpot(items?.place ?? here, "tasks_master", "monsters", world, ch.name);
  if (!m) return Infinity;
  return Math.max(0, (items?.sec ?? 0) + m.sec + bankSec(m.place) - bankSec(here)) + MIN_COOLDOWN * (ch.task ? 2 : 1);
}

/** Hours of `n` kills of a monster by this character: its expected seconds a win (∞: not admitted). */
function killH(ch: Character, world: World, monster: string, n: number): number {
  const r = admitted(ch, world, monster) ? fightRec(ch, world, monster) : undefined;
  return r ? (n * winSecOf(r, world, ch.name, monster)) / 3600 : Infinity;
}

/** A fresh draw's mean hours: each task of the pool at its mean quantity and this character's seconds a win; one it is not
 *  admitted to costs a coin's hours more than the mean of the others (it is cancelled again). ∞: no draw it is admitted to. */
function drawHours(ch: Character, world: World, coinH: number): number {
  const p = poolOf(ch.level);
  const hs = p.map((t) => killH(ch, world, t.code, meanQty(t))).filter(Number.isFinite);
  if (!hs.length) return Infinity;
  const sum = hs.reduce((a, b) => a + b, 0);
  return (sum + (p.length - hs.length) * (coinH + sum / hs.length)) / p.length;
}

/**
 * Rule 4: why a task worked on purpose (src:tasks_coin, the filler) is cancelled at the master before the work — the
 * character is not admitted to its monster, or its hours left exceed a fresh draw's mean hours plus one coin's hours
 * (codeSec's tasks coin). Undefined: kept — no task, a finished one, no coin in the bank, or no draw it is admitted to.
 * A held task nobody works is never asked.
 */
export function cancelOf(ch: Character, world: World): string | undefined {
  if (!ch.task || ch.task_progress >= ch.task_total || !coinIn(world)) return undefined;
  const coinH = codeSec("tasks_coin", ch, world) / 3600;
  const fresh = drawHours(ch, world, coinH);
  if (!Number.isFinite(fresh)) return undefined;
  const left = ch.task_total - ch.task_progress;
  if (ch.task_type === "monsters" && !admitted(ch, world, ch.task)) return `not admitted to ${monsterOf(ch.task)?.name ?? ch.task}`;
  const h = ch.task_type === "monsters" ? killH(ch, world, ch.task, left) : (left * codeSec(ch.task, ch, world)) / 3600;
  return h > fresh + coinH ? `${h.toFixed(1)} h left, a fresh draw ${fresh.toFixed(1)} h + a coin ${coinH.toFixed(1)} h` : undefined;
}

/** What the others' running src:tasks_coin steps bank: the coins of each task such a step turns in. */
export const coinsInFlight = (others: Step[]): number =>
  others.reduce((t, s) => t + (s.target === "src:tasks_coin" && s.visit?.at === "end" && s.work.kind === "kill" ? coinsOf(s.work.monster) : 0), 0);

/** The forward model's visit: a finished task turned in (its coins to the bank, `done`), `cancel` cancelled for a coin, and a
 *  monsters task drawn when none is held (`take`). Changes `ch`; returns the bank's coins, the tasks done and the draws taken. */
export function playVisit(ch: Character, drawn: number, cancel?: string, take = true): { coins: number; done: number; drawn: number } {
  let coins = 0, done = 0;
  if (ch.task && ch.task_progress >= ch.task_total) { coins += coinsOf(ch.task); done++; ch.task = ""; }
  else if (cancel && ch.task === cancel) { coins--; ch.task = ""; }
  if (!ch.task && take) {
    const d = drawOf(ch.level, drawn);
    if (d) { Object.assign(ch, { task: d.code, task_type: "monsters", task_progress: 0, task_total: d.total }); drawn++; }
  }
  return { coins, done, drawn };
}
