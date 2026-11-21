// Task 019, settled point 3: the outlook's child process. The service (src/server/main.ts) starts it below normal priority,
// writes one JSON document to its stdin — { world, running, until } — and reads one JSON line per road line back
// (src/plan/planner/road.ts). It loads the catalog and the atlas from public/data as the service does, imports nothing of
// src/state/*, opens no storage, writes no file and makes no request. It exits 0 after the `done` line; 2 when stdin closes
// before the document is whole; 1 on anything else; at once when its parent is gone.
//
//   node --import tsx src/server/outlook-run.ts < input.json

import { readFile } from "node:fs/promises";
import path from "node:path";

// api/client.ts reads the token from localStorage at import: here a store that keeps nothing (no file is opened)
(globalThis as { localStorage?: unknown }).localStorage ??= { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 };
(globalThis as { fetch: unknown }).fetch = () => Promise.reject(new Error("the outlook makes no request"));

const parent = process.ppid;
const alive = (): boolean => {
  try {
    process.kill(parent, 0);
    return true;
  } catch {
    return false;
  }
};
const fail = (code: number, why: string): never => {
  process.stderr.write(`outlook: ${why}\n`);
  process.exit(code);
};

const input = await new Promise<string>((ok) => {
  let s = "";
  process.stdin.setEncoding("utf8").on("data", (d: string) => (s += d)).on("end", () => ok(s));
});
let doc: { world: import("../plan/planner/types").World; running: Record<string, import("../plan/planner/types").Running>; until: number };
try {
  doc = JSON.parse(input);
  if (!doc?.world?.characters || typeof doc.until !== "number") throw new Error("no world or no until");
} catch (e) {
  fail(2, `stdin closed before the document was whole (${(e as Error).message})`);
}

const { setDataReader } = await import("../catalog/load");
const { loadCatalog } = await import("../catalog");
const { road } = await import("../plan/planner/road");
setDataReader(async (name) => {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), "public/data", `${name}.json`), "utf8"));
  } catch (e) {
    if ((name as string) === "atlas") throw e; // optional: loadOptionalFile makes it null
    return fail(1, `catalog file public/data/${name}.json: ${(e as Error).message}`); // never the live API's fallback
  }
});
await loadCatalog();

road(doc!.world, doc!.running ?? {}, doc!.until, (line) => {
  if (!alive()) process.exit(0); // the service is gone: nobody reads this
  process.stdout.write(JSON.stringify(line) + "\n");
});
process.exitCode = 0;
