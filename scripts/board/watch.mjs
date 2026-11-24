// Task 026: the board watch — one raw read of the accounts around and above this one, then exit.
//   node scripts/board/watch.mjs [--no-guard]
// Plain Node (built-in fetch, fs, zlib), nothing of src/, no dependency. Public GETs to the game API only: no token, no
// Authorization header, `.env` never read. A read:
//   1. GET /leaderboard/accounts?sort=achievements_points&size=100&page=N, every page the first answer names;
//   2. the accounts to read: positions 1–50, every account within 10 positions of `alverus`, and `alverus`;
//   3. each one's /accounts/{a}/characters (all of them first: the characters are one moment), then its
//      /accounts/{a}/achievements?size=100&page=N, every page its first answer names.
// One request at a time, ≥ 1.3 s from start to start, at most 150 a read, each given 30 s; a 429, a 5xx or no answer ends
// the read (not retried), any other non-200 is noted and skipped; past 12 minutes no request is started.
// Every 200 body is kept byte for byte, gzipped, in logs/board/<YYYY-MM-DD>/<HHMM>Z/ (the read's UTC start; report 024's
// file names + .gz): leaderboard-<page>.json.gz, acc-<account>-characters.json.gz, acc-<account>-achievements-<page>.json.gz.
// logs/board/reads.jsonl gets one line a run (README.md says what each field holds). A run within 90 minutes of a read's
// start — reads.jsonl's starts and the read folders, so a read still running counts — writes a `skipped` line and stops;
// --no-guard lifts that (the line says `guard: false`). Exit 0 = a whole read or a skip, 2 = a read that ended early,
// 1 = a crash (its line carries `error`).
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const HOME = join(ROOT, "logs/board");
const READS = join(HOME, "reads.jsonl");
const API = "https://api.artifactsmmo.com";
const ME = "alverus", TOP = 50, NEAR = 10;
const GAP_MS = 1300, CAP = 150, TIMEOUT_MS = 30_000, DEADLINE_MS = 12 * 60_000, GUARD_MS = 90 * 60_000;

const guard = !process.argv.includes("--no-guard");
const t0 = new Date();
const iso = (t) => new Date(t).toISOString();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const line = (rec) => { mkdirSync(HOME, { recursive: true }); appendFileSync(READS, JSON.stringify(rec) + "\n"); };
/** An account name as a file name: [A-Za-z0-9_.-] as they are, anything else %XX (no name today needs it). */
const fileName = (a) => a.replace(/[^A-Za-z0-9_.-]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"));

/** The start of the newest read: the newest `start` of a read line, or the newest read folder (made before the first request). */
function lastStart() {
  let t = 0;
  if (existsSync(READS)) for (const s of readFileSync(READS, "utf8").split("\n")) {
    if (!s.trim()) continue;
    try { const r = JSON.parse(s); if (!r.skipped && r.start) t = Math.max(t, Date.parse(r.start)); } catch { /* a torn line */ }
  }
  if (existsSync(HOME)) {
    const days = readdirSync(HOME).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse();
    for (const d of days) {
      const hm = readdirSync(join(HOME, d)).filter((h) => /^\d{4}Z$/.test(h)).sort().pop();
      if (hm) { t = Math.max(t, Date.parse(`${d}T${hm.slice(0, 2)}:${hm.slice(2, 4)}:00Z`)); break; }
    }
  }
  return t;
}

function skip(reason, extra = {}) {
  line({ start: iso(t0), end: iso(Date.now()), skipped: reason, ...extra });
  console.log(`skipped: ${reason}`);
  process.exit(0);
}

if (guard) {
  const last = lastStart();
  if (last && t0 - last < GUARD_MS) skip(`a read started ${Math.round((t0 - last) / 60_000)} min ago`, { last: iso(last) });
}

const day = iso(t0).slice(0, 10), hhmm = iso(t0).slice(11, 16).replace(":", "") + "Z";
const DIR = join(HOME, day, hhmm);
mkdirSync(join(HOME, day), { recursive: true });
try { mkdirSync(DIR); } catch (e) { if (e.code === "EEXIST") skip(`${day}/${hhmm} exists`); throw e; }

let made = 0, last = 0, raw = 0, gz = 0, files = 0, first = null, stopped = null;
const non200 = [];
/** One GET; the body of a 200 (written gzipped as `file`.gz), else null. */
async function get(path, file) {
  if (stopped) return null;
  if (made >= CAP) { stopped = `the cap of ${CAP} requests`; return null; }
  if (Date.now() - t0 > DEADLINE_MS) { stopped = "12 minutes passed"; return null; }
  const wait = last + GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  made++;
  let status = 0, body = null, error = null;
  try {
    const r = await fetch(API + path, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    body = Buffer.from(await r.arrayBuffer());
    status = r.status;
  } catch (e) { error = String(e?.cause?.code ?? e?.name ?? e); }
  console.log(made, path, status || error, body?.length ?? 0);
  if (status !== 200) {
    first ??= status;
    non200.push({ path, status, at: iso(last), ...(error ? { error } : {}) });
    if (status === 0 || status === 429 || status >= 500) stopped = `${status || "no answer"} on ${path}`;
    return null;
  }
  const z = gzipSync(body, { level: 9 });
  writeFileSync(join(DIR, `${file}.gz`), z);
  raw += body.length; gz += z.length; files++;
  return body;
}
/** A 200's JSON, or null (the body is kept as it came either way). */
const json = (b) => { try { return JSON.parse(b.toString("utf8")); } catch { return null; } };

let code = 0, error = null, ladder = [], me = null, pick = [], read = 0;
try {
  let pages = 1;
  for (let p = 1; p <= pages && !stopped; p++) {
    const j = json((await get(`/leaderboard/accounts?sort=achievements_points&size=100&page=${p}`, `leaderboard-${p}.json`)) ?? "");
    if (p === 1 && Number.isInteger(j?.pages)) pages = j.pages;
    if (Array.isArray(j?.data)) ladder.push(...j.data);
  }
  me = ladder.find((r) => r.account === ME) ?? null;
  pick = [...new Set([
    ...ladder.filter((r) => r.position <= TOP || (me && Math.abs(r.position - me.position) <= NEAR))
      .sort((x, y) => x.position - y.position).map((r) => r.account),
    ME,
  ])];
  if (!stopped) {
    for (const a of pick) if (await get(`/accounts/${encodeURIComponent(a)}/characters`, `acc-${fileName(a)}-characters.json`)) read++;
    for (const a of pick) {
      let pages = 1;
      for (let p = 1; p <= pages && !stopped; p++) {
        const j = json((await get(`/accounts/${encodeURIComponent(a)}/achievements?size=100&page=${p}`, `acc-${fileName(a)}-achievements-${p}.json`)) ?? "");
        if (p === 1 && Number.isInteger(j?.pages)) pages = j.pages;
      }
    }
  }
  if (stopped) code = 2;
} catch (e) {
  error = String(e?.stack ?? e);
  code = 1;
}
if (!files) { try { rmdirSync(DIR); rmdirSync(join(HOME, day)); } catch { /* the day holds other reads */ } }
line({
  start: iso(t0), end: iso(Date.now()), skipped: null, guard, dir: files ? `${day}/${hhmm}` : null,
  requests: made, files, raw, gz, ladder: ladder.length, picked: pick.length, accounts: read,
  me: me ? { position: me.position, points: me.achievements_points } : null,
  first, stopped, non200, ...(error ? { error } : {}),
});
console.log(`${day}/${hhmm}: ${made} requests, ${files} files, ${raw} bytes raw, ${gz} gzipped, ${read} of ${pick.length} accounts` +
  `${stopped ? `; stopped: ${stopped}` : ""}${error ? `; error: ${error}` : ""}`);
process.exit(code);
