// Task 025, settled point 8: the leaders' read, once a UTC day at 12:22 — report 024's read (docs/strategy/024/tools/
// fetch.mjs) made by the service. GET /leaderboard/accounts?sort=achievements_points&page=1&size=100, then for its first 25
// accounts and this one (the characters' `account`) /accounts/{a}/characters, then /accounts/{a}/achievements?size=100&page=1
// (one page): 53 requests. Public (api/client.ts publicGet: no token, no Authorization header, no retry), one at a time, at
// least 1.3 s from start to start, each only once no account request is in flight (client.ts accountIdle), so the read goes
// behind the characters' actions; it counts against the docs' `data` bucket (docs/api/openapi.json RateLimitsDataSchema:
// account / data / action, per IP; data 200 a minute, 2,000 an hour — docs/audit/domain-rules.md), never the account's or
// the actions'. At most CAP requests a UTC day; a 429, a 5xx or a transport failure ends the day's read (a raw line).
// Every 200 body byte for byte into logs/leaders/<stamp>/ with 024's file names, a line a request into
// logs/leaders/requests.log (024's format: `<path> <status> <bytes> <iso start>`), one `leaders` record in the journal —
// through the journal's file sinks (lib/journal.ts writeLeaders; the harness: a Map). The newest stamped folder there
// decides whether today was read: a restart does not read again. Started by the service (src/server/main.ts) — not a dev
// service, not one on another port, not with LEADERS=off in .env; in the harness only by a scenario that asks.

import { accountIdle, publicGet } from "../api/client";
import { devlog } from "../lib/devlog";
import { journal, leadersDir, writeLeaders } from "../lib/journal";
import { characters } from "./store";

const TOP = 25;
/** Requests a UTC day, at most (a whole read is 53). */
export const CAP = 60;
const GAP_MS = 1300;
/** The first look after the start: the boot's sync goes first. */
const FIRST_MS = 2 * 60_000;
/** The longest sleep between two looks, so a clock that jumps (a machine asleep) is caught within the hour. */
const TICK_MS = 60 * 60_000;
const STAMP = /^\d{4}-\d\d-\d\dT\d{4}Z$/;

const dayOf = (t: number): string => new Date(t).toISOString().slice(0, 10);
/** 12:22 UTC of the day of `t`: a day after report 024's read, so that every interval is a whole day. */
const slotOf = (t: number): number => Date.parse(`${dayOf(t)}T12:22:00.000Z`);
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, Math.max(0, ms)));

let timer: ReturnType<typeof setTimeout> | undefined;
let made = { day: "", n: 0 }; // the requests of this UTC day (the cap)
let tried = ""; // shortcut: the day this process tried; a first request refused leaves no folder, so a restart that day reads again (≤ 54 requests)

/** The day of the newest read under logs/leaders/ ("" for none); undefined without a disk to read it from. */
function newestDay(): string | undefined {
  const names = leadersDir();
  return names && (names.filter((n) => STAMP.test(n)).sort().at(-1)?.slice(0, 10) ?? "");
}

function schedule(): void {
  const t = Date.now(), slot = slotOf(t);
  timer = setTimeout(look, Math.min(TICK_MS, (t < slot ? slot : slot + 864e5) - t));
}

function look(): void {
  const t = Date.now(), day = dayOf(t), last = newestDay();
  if (last === undefined || t < slotOf(t) || last >= day || tried === day) return schedule();
  tried = day;
  void read(t).finally(schedule);
}

async function read(t0: number): Promise<void> {
  const stamp = new Date(t0).toISOString().slice(0, 16).replace(":", "") + "Z";
  let requests = 0, bytes = 0, status: number | null = null, stop = "", last = 0;
  devlog(`leaders: the day's read starts — ${stamp}`);
  /** One public GET; the parsed body of a 200 (written byte for byte as `file`), else null. */
  const get = async (path: string, file: string): Promise<any> => {
    if (stop) return null;
    const day = dayOf(Date.now());
    if (made.day !== day) made = { day, n: 0 };
    if (made.n >= CAP) {
      stop = `the cap of ${CAP} requests a day`;
      return null;
    }
    await sleep(last + GAP_MS - Date.now());
    for (let i = 0; i < 40 && !accountIdle(); i++) await sleep(250); // behind the actions: 10 s at most
    const t = (last = Date.now());
    const r = await publicGet(path);
    made.n++;
    requests++;
    bytes += r.body.length;
    writeLeaders("requests.log", `${path} ${r.status} ${r.body.length} ${new Date(t).toISOString()}\n`);
    if (r.status !== 200) {
      status ??= r.status;
      if (r.status === 429 || r.status >= 500 || r.status === 0) stop = `${r.status || "no answer"} on ${path}`;
      return null;
    }
    writeLeaders(`${stamp}/${file}`, r.body);
    try {
      return JSON.parse(new TextDecoder().decode(r.body));
    } catch {
      return null;
    }
  };
  const lb = await get("/leaderboard/accounts?sort=achievements_points&page=1&size=100", "leaderboard-1.json");
  const accounts: string[] = Array.isArray(lb?.data)
    ? [...lb.data].sort((x, y) => x.position - y.position).slice(0, TOP).map((r) => String(r.account))
    : [];
  const me = Object.values(characters.value)[0]?.account;
  if (accounts.length && me && !accounts.includes(me)) accounts.push(me);
  for (const a of accounts) await get(`/accounts/${a}/characters`, `acc-${a}-characters.json`); // the positions: one moment
  for (const a of accounts) await get(`/accounts/${a}/achievements?size=100&page=1`, `acc-${a}-achievements-1.json`);
  const seconds = Math.round((Date.now() - t0) / 100) / 10;
  journal("leaders", { stamp, requests, bytes, seconds, status });
  devlog(`leaders: ${stamp} — ${requests} requests, ${bytes} bytes in ${seconds} s${stop ? `; ended by ${stop} — the next read is tomorrow at 12:22 UTC` : ""}`);
}

/** The leaders' read: a look two minutes after the start (the read at once if today's 12:22 has passed unread), then at
 *  every 12:22 UTC. Server only, started once. */
export function startLeaders(): void {
  if (timer) return;
  timer = setTimeout(look, FIRST_MS);
}
