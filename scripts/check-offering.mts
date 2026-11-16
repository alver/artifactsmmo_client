// Self-check of canObtainOffering (queue.ts) on the 2026-11-16 offerings — accept only what can be completed (no API):
//   node --import tsx --experimental-webstorage --localstorage-file=/tmp/x.db --disable-warning=ExperimentalWarning scripts/check-offering.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { bankItems } from "../src/state/store";
import { canObtainOffering } from "../src/state/queue";
import type { Character, OfferingFavor } from "../src/types/api";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
const ch = (lv: Record<string, number>) => ({ name: "T", x: 0, y: 0, level: 20, inventory: [], ...Object.fromEntries(Object.entries(lv).map(([k, v]) => [`${k}_level`, v])) }) as unknown as Character;
const favor = (target_type: string, target_code: string) => ({ target_type, target_code, xp_multiplier: 1.5 }) as unknown as OfferingFavor;
const cases: [string, Character, string, number, OfferingFavor, Record<string, number>, boolean][] = [
  ["cooking 22 / fishing 19 can't cook bass (Lv 30 recipe, fishing 30)", ch({ cooking: 22, fishing: 19 }), "cooked_bass", 15, favor("craft", "cooked_bass"), {}, false],
  ["banked cooked bass doesn't count for a craft offering", ch({ cooking: 22, fishing: 19 }), "cooked_bass", 15, favor("craft", "cooked_bass"), { cooked_bass: 15 }, false],
  ["cooking 30 / fishing 30 can", ch({ cooking: 30, fishing: 30 }), "cooked_bass", 15, favor("craft", "cooked_bass"), {}, true],
  ["woodcutting 17 gathers spruce", ch({ woodcutting: 17 }), "spruce_wood", 40, favor("resource", "spruce_tree"), {}, true],
  ["woodcutting 21 can't gather dead wood", ch({ woodcutting: 21 }), "dead_wood", 31, favor("resource", "dead_tree"), {}, false],
  ["…unless the bank holds it", ch({ woodcutting: 21 }), "dead_wood", 31, favor("resource", "dead_tree"), { dead_wood: 31 }, true],
];
let bad = 0;
for (const [why, c, code, need, f, bank, want] of cases) {
  bankItems.value = Object.entries(bank).map(([code, quantity]) => ({ code, quantity }));
  const got = canObtainOffering(c, code, need, f, 2, f.target_type !== "craft");
  if (got !== want) { bad++; console.log(`MISMATCH ${why}: got ${got}, want ${want}`); }
}
console.log(bad ? "FAILED" : "OK");
process.exit(bad ? 1 : 0);
