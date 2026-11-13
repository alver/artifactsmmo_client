// Self-check of plan/consumables.ts foodPlan against the catalog snapshot (no API):
//   node --import tsx --experimental-webstorage --localstorage-file=/tmp/x.db --disable-warning=ExperimentalWarning scripts/check-food.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { foodPlan } from "../src/plan/consumables";
import type { BankItem, Character } from "../src/types/api";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
const ch = (lv: number) => ({ level: lv, fishing_level: lv, cooking_level: lv, woodcutting_level: lv, inventory: [], inventory_max_items: 100 }) as unknown as Character;
const bank = (...codes: string[]): BankItem[] => codes.map((code) => ({ code, quantity: 50 }));
const cases: [string, Character, BankItem[], string | undefined][] = [
  ["lv20 fishes nothing: gudgeon/shrimp/trout lose to rest", ch(20), [], undefined],
  ["lv30 fishes bass", ch(30), [], "gather:cooked_bass"],
  ["lv50 fishes swordfish", ch(50), [], "gather:cooked_swordfish"],
  ["apples are apple-pie feedstock, not food", ch(20), bank("apple"), undefined],
  ["lv20 with eggs fries them, never chops ~40 ash trees for pie", ch(20), bank("egg"), "cook:fried_eggs"],
  ["stocked raw fish still gets cooked", ch(20), bank("shrimp"), "cook:cooked_shrimp"],
  ["stocked food still gets eaten", ch(20), bank("cooked_gudgeon"), "bank:cooked_gudgeon"],
];
let bad = 0;
for (const [why, c, b, want] of cases) {
  const p = foodPlan(c, b);
  const got = p && `${p.source}:${p.code}`;
  if (got !== want) { bad++; console.log(`MISMATCH ${why}: got ${got}, want ${want}`); }
}
console.log(bad ? "FAILED" : "OK");
process.exit(bad ? 1 : 0);
