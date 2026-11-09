// Self-check of plan/xp.ts autoRecyclable against the catalog snapshot (no API):
//   node --import tsx --experimental-webstorage --localstorage-file=/tmp/x.db --disable-warning=ExperimentalWarning scripts/check-recycle.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { autoRecyclable } from "../src/plan/xp";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
// common drops / NPC-for-drops goods recycle; gems, tasks-coin items, non-recyclables don't
const expect: Record<string, boolean> = { copper_ring: true, iron_sword: true, steel_ring: true, hard_leather_armor: true, ruby_ring: false, dreadful_staff: false, ring_of_chance: false, sapphire_amulet: false, copper_bar: false };
const bad = Object.entries(expect).filter(([c, v]) => autoRecyclable(c) !== v);
for (const [c, v] of bad) console.log(`MISMATCH ${c}: got ${!v}, want ${v}`);
console.log(bad.length ? "FAILED" : "OK");
process.exit(bad.length ? 1 : 0);
