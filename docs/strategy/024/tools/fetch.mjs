// Task 024: the one read of the leaders. Public GETs only — no token, no Authorization header, `.env` never read.
//   node docs/strategy/024/tools/fetch.mjs [--cap 150] [--top 25] [--me alverus] [--accounts a,b,c] [--only characters]
// Without --accounts: /leaderboard/accounts?sort=achievements_points&page=1&size=100 first, then its first --top accounts
// plus --me. Then every account's /characters (all of them first, so the positions are one moment), then (unless --only
// characters) its /achievements?size=100, every page `pages` names. Each 200 body is written byte for byte under
// docs/strategy/024/snapshot/<UTC start YYYY-MM-DDTHHMMZ>/ (a folder that exists is never written into); every request is
// one line "<path> <status> <bytes> <iso start>" of docs/strategy/024/requests.log, whose line count is the count of
// every request ever made: it stops when the log holds --cap lines. One request at a time, ≥ 1.3 s from start to start.
// A 4xx/5xx is logged and not retried; a 429 stops the read for good.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HOME = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOG = join(HOME, "requests.log");
const API = "https://api.artifactsmmo.com";
const GAP_MS = 1300;

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const CAP = Number(arg("cap", 150)), TOP = Number(arg("top", 25)), ME = arg("me", "alverus");
const ONLY = arg("only", "");
if (ONLY && ONLY !== "characters") throw new Error(`--only takes "characters", not ${ONLY}`);

const start = new Date();
const stamp = start.toISOString().slice(0, 16).replace(":", "") + "Z";
const DIR = join(HOME, "snapshot", stamp);
if (existsSync(DIR)) throw new Error(`${DIR} exists: a read never overwrites one`);
mkdirSync(DIR, { recursive: true });

let made = existsSync(LOG) ? readFileSync(LOG, "utf8").split("\n").filter(Boolean).length : 0;
let last = 0, stop = "";
/** One GET; the parsed body of a 200, else null. */
async function get(path, file) {
  if (stop) return null;
  if (made >= CAP) { stop = `the cap (${CAP} requests in ${LOG}) is reached`; return null; }
  const wait = last + GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  const t = Date.now();
  last = t;
  let status = 0, body = Buffer.alloc(0);
  try {
    const r = await fetch(API + path, { headers: { Accept: "application/json" } });
    status = r.status;
    body = Buffer.from(await r.arrayBuffer());
  } catch (e) { body = Buffer.from(String(e)); }
  made++;
  appendFileSync(LOG, `${path} ${status} ${body.length} ${new Date(t).toISOString()}\n`);
  console.log(made, path, status, body.length);
  if (status === 429) stop = `429 on ${path}: the read stops for good`;
  if (status !== 200) return null;
  writeFileSync(join(DIR, file), body);
  return JSON.parse(body.toString("utf8"));
}

let accounts = arg("accounts", "")?.split(",").filter(Boolean) ?? [];
if (!accounts.length) {
  const lb = await get("/leaderboard/accounts?sort=achievements_points&page=1&size=100", "leaderboard-1.json");
  if (!lb) throw new Error(`no leaderboard: ${stop || "not a 200"}`);
  accounts = [...lb.data].sort((x, y) => x.position - y.position).slice(0, TOP).map((r) => r.account);
  if (ME && !accounts.includes(ME)) accounts.push(ME);
}
for (const a of accounts) await get(`/accounts/${a}/characters`, `acc-${a}-characters.json`);
if (!ONLY) for (const a of accounts) {
  let pages = 1;
  for (let p = 1; p <= pages; p++) {
    const j = await get(`/accounts/${a}/achievements?size=100&page=${p}`, `acc-${a}-achievements-${p}.json`);
    if (j) pages = j.pages;
  }
}
console.log(`${stamp}: ${accounts.length} accounts, ${made} requests in the log${stop ? `; stopped: ${stop}` : ""}`);
