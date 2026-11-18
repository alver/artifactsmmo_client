// Imported FIRST by index.mts, before any engine module: importing the engine
// writes its keys to whatever storage file the process was given (audit H.3),
// so a scenario must prove it runs on the runner's own scratch file.
import { tmpdir } from "node:os";
import path from "node:path";

const db = process.env.AMMO_CHECK_DB ?? "";
const dir = path.dirname(db);
const fromRunner =
  !!db &&
  process.execArgv.includes(`--localstorage-file=${db}`) &&
  path.basename(dir).startsWith("ammo-check-") &&
  path.resolve(path.dirname(dir)) === path.resolve(tmpdir());

if (!fromRunner) {
  console.error("harness: a scenario only runs through the runner — npm run check -- <name>");
  process.exit(2);
}
// A fresh file holds nothing: no token, no queues.
if (localStorage.length !== 0) {
  console.error(`harness: scratch storage ${db} is not empty (${localStorage.length} keys) — refusing to run`);
  process.exit(2);
}
