// Self-check: public/data/atlas.json still says what the 2026-11-15 atlas said (run after `npm run atlas`):
//   node --import tsx scripts/check-atlas.mts
import { readFileSync } from "node:fs";
import type { Atlas } from "../src/catalog/atlas";

const a = JSON.parse(readFileSync("public/data/atlas.json", "utf8")) as Atlas;
const at = (L: number) => a.path[L - 1];
const cases: [string, boolean][] = [
  ["Lv 20 plus tier trains on pigs", at(20).t[1]?.m === "pig"],
  ["Lv 20 vs pig on plus gear ≈ 49 s per kill", Math.abs((at(20).t[1]?.killSec ?? 0) - 49) <= 3],
  ["core gear stalls at Lv 29 (no safe target)", at(28).t[0] != null && at(29).t[0] == null],
  ["plus gear stalls at Lv 38", at(37).t[1] != null && at(38).t[1] == null],
  ["nine bands, 1–9 … 45–50", a.bands.length === 9 && a.bands[0].a === 1 && a.bands[8].b === 50],
  ["the Lv 20 plus set wears steel rings", a.bands[3].loadout[1].ring?.[0]?.[0] === "steel_ring"],
  ["jasper costs 8 tasks coins", a.coinPrices.jasper_crystal === 8],
  ["steel axe needs weaponcrafting 20 + mining 20", (() => { const i = a.items.find((x) => x.code === "steel_axe"); return i?.reqSkills.weaponcrafting === 20 && i?.reqSkills.mining === 20; })()],
];
let bad = 0;
for (const [why, ok] of cases) if (!ok) { bad++; console.log(`MISMATCH ${why}`); }
console.log(bad ? "FAILED" : `OK (${cases.length} checks)`);
process.exit(bad ? 1 : 0);
