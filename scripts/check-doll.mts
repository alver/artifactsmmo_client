// Self-check: jobGear wears an altar_doll (−10% gather/craft cooldown, no wisdom/PP) for gather + craft jobs, never for fights:
//   node --import tsx --experimental-webstorage --localstorage-file=/tmp/x.db --disable-warning=ExperimentalWarning scripts/check-doll.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { jobGear } from "../src/plan/jobgear";
import type { BankItem, Character } from "../src/types/api";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();
const ch = { name: "T", level: 20, mining_level: 20, woodcutting_level: 20, fishing_level: 20, alchemy_level: 20, cooking_level: 20, hp: 300, max_hp: 300, inventory: [], inventory_max_items: 100 } as unknown as Character;
const bank: BankItem[] = [{ code: "altar_doll", quantity: 5 }, { code: "novice_guide", quantity: 1 }];
const wears = (s?: Partial<Record<string, string>>) => Object.values(s ?? {}).includes("altar_doll");
const cases: [string, boolean, boolean][] = [
  ["gather mining wears the doll", wears(jobGear(ch, bank, { kind: "gather", skill: "mining" })), true],
  ["craft cooking wears the doll", wears(jobGear(ch, bank, { kind: "craft", skill: "cooking" })), true],
];
let bad = 0;
for (const [why, got, want] of cases) if (got !== want) { bad++; console.log(`MISMATCH ${why}: got ${got}, want ${want}`); }
console.log(bad ? "FAILED" : "OK");
process.exit(bad ? 1 : 0);
