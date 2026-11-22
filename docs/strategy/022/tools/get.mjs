// get.mjs <list.txt>: each line "<file> <path>" — one GET to the public API, no token, no Authorization header, at least
// 1.2 s apart; the body saved as it came under docs/strategy/022/snapshot/<file>; "<path> <status> <bytes> <iso>" appended
// to D:/Temp/a022/out/requests.log. A 4xx/5xx is logged, not retried. Stops at 120 requests in all (the log's count).
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
const LOG = "D:/Temp/a022/out/requests.log", DIR = "G:/alex/projects/artifactsmmo/docs/strategy/022/snapshot";
const done = existsSync(LOG) ? readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean).length : 0;
const list = readFileSync(process.argv[2], "utf8").trim().split("\n").map((l) => l.trim().split(/\s+/));
let n = done;
for (const [file, path] of list) {
  if (n >= 120) { console.log("120 reached, stop"); break; }
  const t = Date.now();
  let status = 0, body = "";
  try { const r = await fetch(`https://api.artifactsmmo.com${path}`, { headers: { Accept: "application/json" } }); status = r.status; body = await r.text(); } catch (e) { body = String(e); }
  n++;
  writeFileSync(`${DIR}/${file}`, body);
  appendFileSync(LOG, `${path} ${status} ${body.length} ${new Date(t).toISOString()}\n`);
  console.log(n, path, status, body.length);
  await new Promise((r) => setTimeout(r, Math.max(0, 1200 - (Date.now() - t))));
}
