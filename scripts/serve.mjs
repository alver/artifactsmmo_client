// Supervisor for the local game service (src/server/main.ts, run under tsx).
// Restarts it whenever it exits — crash, out-of-memory, the one-time browser
// import — with a doubling delay (1s → 5min, reset after 5 healthy minutes):
// every start does one boot sync (5 reads of the ~300/hr budget), so a crash
// loop must not spin. Exit code 3 (port busy) is final.
//
//   node scripts/serve.mjs          # npm start — serves the built dist/
//   node scripts/serve.mjs --watch  # npm run dev — Vite inside + restart on engine .ts edits

import { spawn } from "node:child_process";
import { mkdirSync, watch } from "node:fs";

const dev = process.argv.includes("--watch");
mkdirSync(".ammo", { recursive: true });
const args = [
  "--import", "tsx",
  "--experimental-webstorage", "--localstorage-file=.ammo/storage.db",
  "--disable-warning=ExperimentalWarning",
  "src/server/main.ts",
  ...(dev ? ["--dev"] : []),
];

let child = null;
let timer = null;
let quick = false; // restart requested by a file change, not a crash
let delay = 1000;
let startedAt = 0;

function schedule(ms) {
  clearTimeout(timer);
  timer = setTimeout(start, ms);
}

function start() {
  startedAt = Date.now();
  // ipc channel: the server exits when this supervisor dies (no orphan runners)
  child = spawn(process.execPath, args, { stdio: ["inherit", "inherit", "inherit", "ipc"] });
  child.on("exit", (code) => {
    child = null;
    if (code === 3) process.exit(3);
    if (quick) {
      quick = false;
      return schedule(0);
    }
    if (Date.now() - startedAt > 5 * 60_000) delay = 1000; // it ran fine for a while — not a crash loop
    console.error(`[serve] service exited (code ${code}) — restarting in ${delay / 1000}s`);
    schedule(delay);
    delay = Math.min(delay * 2, 5 * 60_000);
  });
}

if (dev) {
  let debounce = null;
  // .tsx/.css are the UI — Vite hot-reloads those without touching the runners
  watch("src", { recursive: true }, (_ev, file) => {
    if (!file?.endsWith(".ts")) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      console.error(`[serve] ${file} changed — restarting the service`);
      if (child) {
        quick = true;
        child.kill();
      } else schedule(0);
    }, 300);
  });
}

start();
