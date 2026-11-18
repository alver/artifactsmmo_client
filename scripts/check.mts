// npm run check            — every scripts/check-*.mts and every scripts/scenarios/*.mts
// npm run check -- <name>  — one of them, with its full output (a scenario prints its action trace)
//
// Each check is its own Node process with a fresh scratch storage file in the
// system temp dir: the engine keeps module-level state with no reset, and
// importing it writes to whatever storage the process was given. No check ever
// sees .ammo/storage.db. Exit code 0 only when nothing failed.

import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TIMEOUT_MS = 110_000; // real time, a backstop only — a livelock ends on a scenario's virtual limits
const PARALLEL = 4;

const list = (dir: string, re: RegExp): string[] => readdirSync(path.join(ROOT, dir)).filter((f) => re.test(f)).sort().map((f) => `${dir}/${f}`);
const all = [...list("scripts", /^check-.+\.mts$/), ...list("scripts/scenarios", /\.mts$/)];
const nameOf = (file: string): string => path.basename(file, ".mts");

const only = process.argv[2];
const files = only ? all.filter((f) => nameOf(f) === only || nameOf(f) === `check-${only}`) : all;
if (!files.length) {
  console.error(`no check named "${only}". Known: ${all.map(nameOf).join(", ")}`);
  process.exit(1);
}

const scratch = mkdtempSync(path.join(tmpdir(), "ammo-check-"));

interface Result {
  name: string;
  code: number | null;
  out: string;
  sec: number;
}

function run(file: string): Promise<Result> {
  const name = nameOf(file);
  const db = path.join(scratch, `${name}.db`);
  const t0 = performance.now();
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "--experimental-webstorage", `--localstorage-file=${db}`, "--disable-warning=ExperimentalWarning", file],
      { cwd: ROOT, env: { ...process.env, AMMO_CHECK_DB: db, AMMO_CHECK_VERBOSE: only ? "1" : "" }, stdio: ["ignore", "pipe", "pipe"] },
    );
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    const timer = setTimeout(() => {
      out += `\nkilled: still running after ${TIMEOUT_MS / 1000} s of real time`;
      child.kill();
    }, TIMEOUT_MS);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ name, code, out: out.trimEnd(), sec: (performance.now() - t0) / 1000 });
    });
  });
}

// A small pool; results are printed in listing order.
const started = performance.now();
const results: Promise<Result>[] = [];
let free = PARALLEL;
const waiting: (() => void)[] = [];
for (const file of files) {
  results.push(
    (async () => {
      if (free > 0) free--;
      else await new Promise<void>((r) => waiting.push(r));
      try {
        return await run(file);
      } finally {
        const next = waiting.shift();
        if (next) next();
        else free++;
      }
    })(),
  );
}

let ok = 0, known = 0, failed = 0;
for (const p of results) {
  const r = await p;
  const last = r.out.split("\n").pop() ?? ""; // every check ends with its verdict
  // 3 = a scenario marked `known` failed the way it should (scripts/harness/index.mts).
  const verdict = r.code === 0 ? "ok   " : r.code === 3 ? "known" : "FAIL ";
  if (r.code === 0) ok++;
  else if (r.code === 3) known++;
  else failed++;
  if (only) console.log(r.out);
  console.log(`${verdict} ${r.name.padEnd(22)} ${r.sec.toFixed(1).padStart(5)} s  ${only ? "" : last}`);
  if (!only && r.code !== 0 && r.code !== 3) console.log(r.out.replace(/^/gm, "      "));
}
rmSync(scratch, { recursive: true, force: true });
console.log(`\n${files.length} checks: ${ok} ok, ${known} known defect${known === 1 ? "" : "s"} reproduced, ${failed} failed — ${((performance.now() - started) / 1000).toFixed(1)} s`);
process.exit(failed ? 1 : 0);
