// Self-check: public/data/atlas.json still says what the 2026-11-15 atlas said (run after `npm run atlas`). Task 023: the
// atlas of the repaired solver (2026-11-23) moved two pins — the Lv 20 plus tier trains on wolves at about 32 s a kill
// (the 11-17 atlas: pigs at 49 s). Task 025 (the verdict: admitted at a rolled win rate of 0.75, not "safe"; the player's
// initiative the API's; the healing rune and the plus tier's potions at their chain) moved three: the core tier stalls at 35
// (29 before), the plus tier at 44 (38), and the 20–24 plus set picks forest rings most (steel rings 10 of 12 before):
//   node --import tsx scripts/check-atlas.mts
import { readFileSync } from "node:fs";
import type { Atlas } from "../src/catalog/atlas";

const a = JSON.parse(readFileSync("public/data/atlas.json", "utf8")) as Atlas;
const at = (L: number) => a.path[L - 1];
const cases: [string, boolean][] = [
  ["Lv 20 plus tier trains on wolves (task 023; pigs before)", at(20).t[1]?.m === "wolf"],
  ["Lv 20 vs wolf on plus gear ≈ 32 s per kill (task 023; 49 s vs pig before)", Math.abs((at(20).t[1]?.killSec ?? 0) - 32) <= 3],
  ["core gear stalls at Lv 35 (no admitted target; task 025: 29 under the safe rule)", at(34).t[0] != null && at(35).t[0] == null],
  ["plus gear stalls at Lv 44 (task 025: 38)", at(43).t[1] != null && at(44).t[1] == null],
  ["nine bands, 1–9 … 45–50", a.bands.length === 9 && a.bands[0].a === 1 && a.bands[8].b === 50],
  ["the Lv 20–24 plus set wears forest rings most (task 025: steel rings before)", a.bands[3].loadout[1].ring?.[0]?.[0] === "forest_ring"],
  ["jasper costs 8 tasks coins", a.coinPrices.jasper_crystal === 8],
  ["steel axe needs weaponcrafting 20 + mining 20", (() => { const i = a.items.find((x) => x.code === "steel_axe"); return i?.reqSkills.weaponcrafting === 20 && i?.reqSkills.mining === 20; })()],
];
let bad = 0;
for (const [why, ok] of cases) if (!ok) { bad++; console.log(`MISMATCH ${why}`); }
console.log(bad ? "FAILED" : `OK (${cases.length} checks)`);
process.exit(bad ? 1 : 0);
