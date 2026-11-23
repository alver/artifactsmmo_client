// Task 025, settled point 8: the leaders' read, once a UTC day at 12:22 (src/state/leaders.ts). The fake answers the
// leaderboard and /accounts/{a}/characters|achievements asked without a token from report 024's snapshot. Day 0 (T0 is
// 12:00 UTC): the read at 12:22 — 53 requests in 024's order, none with a token, one at a time ≥ 1.3 s apart, every body byte
// for byte under logs/leaders/<stamp>/ with 024's file names, a line a request in requests.log, one `leaders` record — while
// Ann gathers on her cooldowns. A restart at 12:30 (the leaders' files carried, as the disk keeps them): the second engine
// does not read again that day, and reads on day 1. Day 2: a 429 on the tenth request ends the day's read (a raw line, no
// retry that day); day 3 reads whole. Day 4: a 503 on the twentieth ends that day's read.
import { readdirSync, readFileSync } from "node:fs";
import { scenario } from "../harness/index.mts";
import { T0 } from "../harness/clock.mts";
import type { Scenario } from "../harness/index.mts";
import { startLeaders } from "../../src/state/leaders";

const DAY = 864e5, MIN = 60_000;
const SNAP = new URL("../../docs/strategy/024/snapshot/2026-11-23T1222Z/", import.meta.url);
const NAMES = readdirSync(SNAP).sort();
/** 024's requests.log without the times: `<path> <status> <bytes>`, in order. */
const LOG024 = readFileSync(new URL("../../docs/strategy/024/requests.log", import.meta.url), "utf8").trim().split("\n").map((l) => l.split(" ").slice(0, 3).join(" "));
const gather = { kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 30, done: 0 } as const;

/** The scenario's virtual minutes since T0 (day `d`, `hh:mm` UTC). */
const at = (d: number, h: number, m: number): number => d * DAY + ((h - 12) * 60 + m) * MIN;

async function until(t: Scenario, ms: number): Promise<void> {
  await t.run({ minutes: (ms - (Date.now() - T0)) / MIN });
}

/** Day `d`'s read: the public requests, the folder, the log's lines, the record. */
function day(t: Scenario, d: number) {
  const { files } = t.files();
  const stamp = new Date(Date.UTC(2026, 0, 15 + d, 12, 22)).toISOString().slice(0, 16).replace(":", "") + "Z";
  const reads = t.world.publicReads.filter((r) => r.t >= at(d, 0, 0) && r.t < at(d + 1, 0, 0));
  const folder = [...files.keys()].filter((p) => p.startsWith(`logs/leaders/${stamp}/`)).map((p) => p.slice(`logs/leaders/${stamp}/`.length)).sort();
  const day = new Date(Date.UTC(2026, 0, 15 + d)).toISOString().slice(0, 10);
  const log = (files.get("logs/leaders/requests.log") ?? "").trim().split("\n").filter((l) => l.split(" ")[3]?.startsWith(day));
  const rec = t.journal("leaders").filter((r) => r.stamp === stamp);
  return { stamp, reads, folder, log, rec };
}

/** A whole read: 53 requests in 024's order and bytes, ≥ 1.3 s apart, the bodies byte for byte, the record. */
function whole(t: Scenario, d: number): string {
  const { stamp, reads, folder, log, rec } = day(t, d);
  t.eq(reads.length, 53, `day ${d}: 53 public requests`);
  t.eq(log.map((l) => l.split(" ").slice(0, 3).join(" ")), LOG024, `day ${d}: requests.log holds 024's paths, statuses and sizes, in its order`);
  const gaps = reads.slice(1).map((r, i) => r.t - reads[i].t);
  t.ok(Math.min(...gaps) >= 1300, `day ${d}: one at a time, at least 1.3 s apart (the least gap ${Math.min(...gaps)} ms)`);
  t.ok(reads[0].t >= at(d, 12, 22) && reads[0].t < at(d, 12, 23), `day ${d}: the read starts at 12:22 UTC (${new Date(T0 + reads[0].t).toISOString()})`);
  t.eq(folder, NAMES, `day ${d}: logs/leaders/${stamp}/ holds 024's 53 file names`);
  const same = folder.filter((f) => Buffer.from(t.files().files.get(`logs/leaders/${stamp}/${f}`)!, "utf8").equals(readFileSync(new URL(f, SNAP))));
  t.eq(same.length, 53, `day ${d}: every body byte for byte`);
  const bytes = NAMES.reduce((s, f) => s + readFileSync(new URL(f, SNAP)).length, 0);
  t.eq(rec.map((r) => [r.requests, r.bytes, r.status]), [[53, bytes, null]], `day ${d}: one leaders record`);
  t.ok(rec[0].seconds >= 67.6, `day ${d}: the record's seconds (${rec[0].seconds}) — 52 gaps of 1.3 s at least`);
  return stamp;
}

/** Ann's gathers: every gap between two of them is her 30 s cooldown, and she gathered while the read ran. */
function acting(t: Scenario, d: number): void {
  const g = t.calls("gathering", "Ann").filter((c) => c.t >= at(d, 0, 0) && c.t < at(d + 1, 0, 0));
  const gaps = new Set(g.slice(1).map((c, i) => c.t - g[i].t));
  const { reads } = day(t, d);
  const during = g.filter((c) => c.t >= reads[0].t && c.t <= reads.at(-1)!.t).length;
  // one gap, before, during and after the read: the 30 s cooldown and the runner's own 100 ms
  t.ok(gaps.size === 1 && gaps.has(30_100) && during >= 2, `day ${d}: the actions' cooldowns untouched — ${g.length} gathers, gaps ${[...gaps].join(", ")} ms, ${during} during the read`);
}

await scenario(
  {
    characters: [{ name: "Ann", account: "alverus", x: 2, y: 0 }], // on the copper rocks
    limits: { actions: 1000, minutes: 5 * 1440 },
  },
  async (t) => {
    const { files } = t.files();
    if (t.boot === 2) for (const [p, s] of t.carried as [string, string][]) files.set(p, s);
    startLeaders();
    const authed = (): string[] => t.world.reads.filter((p) => /^\/leaderboard|^\/accounts\/[^/]+\/characters$/.test(p) || (/achievements$/.test(p) && p !== "/accounts/alverus/achievements"));

    if (t.boot === 1) {
      await until(t, at(0, 12, 15));
      t.eq(t.world.publicReads.length, 0, "nothing read before 12:22");
      t.queue("Ann", [gather]);
      await until(t, at(0, 12, 30));
      whole(t, 0);
      acting(t, 0);
      t.eq(authed(), [], "no public path asked with the token");
      return t.restart([...files].filter(([p]) => p.startsWith("logs/leaders/")));
    }

    // the second engine, from 12:30 on day 0
    await until(t, at(1, 12, 15));
    t.eq(t.world.publicReads.length, 0, "the restart did not read again on day 0 (the newest folder is today's)");
    t.queue("Ann", [gather]);
    await until(t, at(1, 12, 30));
    whole(t, 1);
    acting(t, 1);
    t.eq([...new Set([...files.keys()].filter((p) => p.startsWith("logs/leaders/")).map((p) => p.split("/")[2]))].sort(), [day(t, 0).stamp, day(t, 1).stamp, "requests.log"], "one folder a day");

    // day 2: a 429 on the tenth request
    t.world.publicFault = { after: 9, code: 429 };
    await until(t, at(3, 12, 0));
    const d2 = day(t, 2);
    t.eq([d2.reads.length, d2.folder.length, d2.log.length, d2.log.at(-1)?.split(" ")[1]], [10, 9, 10, "429"], "day 2: the tenth request answered 429 — 10 requests, 9 bodies, 10 log lines");
    t.eq(d2.rec.map((r) => [r.requests, r.status]), [[10, 429]], "day 2: its record names the 429");
    t.ok(t.devlog().some((l) => l.includes(`leaders: ${d2.stamp} — 10 requests`) && l.includes("ended by 429")), "day 2: a raw line says the 429 ended the day's read");
    await until(t, at(3, 12, 30));
    whole(t, 3);

    // day 4: a 503 on the twentieth
    t.world.publicFault = { after: 19, code: 503 };
    await until(t, at(5, 11, 0));
    const d4 = day(t, 4);
    t.eq([d4.reads.length, d4.folder.length, d4.rec.map((r) => [r.requests, r.status])], [20, 19, [[20, 503]]], "day 4: a 503 on the twentieth request ends the day's read");
    t.eq(t.world.publicReads.length, 53 + 10 + 53 + 20, "no retry after a refusal, and nothing else asked");
    t.eq(authed(), [], "no public path asked with the token");
    t.ok(t.journal("leaders").every((r) => typeof r.seconds === "number" && typeof r.bytes === "number"), "every record has its seconds and bytes");
  },
);
