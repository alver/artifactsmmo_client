// Task 025, settled point 1: this fleet's stat arithmetic against the API's on report 024's 40 fight sets
// (docs/strategy/024/base/characters.jsonl, the read of 2026-11-23T1222Z: a weapon that is not a tool). Two ways, both must
// give the API's number for every stat: the solve's (the atlas's hypothetical character — 115 + 5·L HP, every other stat
// absent or 0 — with the worn codes folded on, sim/stats.ts baseStats + applyGear) and the live gate's (currentFighter on
// the API's Character). On 0f94809 initiative differs by 100 on all 40 (report 024, table 3a).
//   node --import tsx scripts/check-stats.mts
import { readFile, readFile as rf } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { item, loadCatalog } from "../src/catalog";
import { applyGear, baseStats, currentFighter } from "../src/sim/stats";
import { GEAR_SLOTS } from "../src/types/api";
import type { Character } from "../src/types/api";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();

const STATS = ["max_hp", "attack_fire", "attack_earth", "attack_water", "attack_air", "dmg", "dmg_fire", "dmg_earth", "dmg_water", "dmg_air", "res_fire", "res_earth", "res_water", "res_air", "critical_strike", "haste", "initiative", "wisdom", "prospecting"];
const lines = (await rf("docs/strategy/024/base/characters.jsonl", "utf8")).trim().split("\n").map((l) => JSON.parse(l));
const now = [...new Set(lines.map((c) => c.snap as string))].sort().at(-1);
const sets = lines.filter((c) => c.snap === now && c.slots.weapon && item(c.slots.weapon)?.subtype !== "tool");

/** The base's line in the API's Character shape (docs/strategy/024/tools/model.mts apiChar, the fields the stats read). */
function apiChar(c: any): Character {
  const o: any = { name: c.name, level: c.level, ...c.stats };
  for (const [k, v] of Object.entries(c.slots)) if (!k.startsWith("utility")) o[`${k}_slot`] = v ?? "";
  for (const u of ["utility1", "utility2"]) { o[`${u}_slot`] = c.slots[u]?.code ?? ""; o[`${u}_slot_quantity`] = c.slots[u]?.qty ?? 0; }
  return o as Character;
}

let bad = 0;
const per = new Map<string, number>();
for (const c of sets) {
  const ch = apiChar(c) as unknown as Record<string, number | string>;
  const hypo: Record<string, unknown> = { name: "L", level: ch.level, max_hp: 115 + 5 * (ch.level as number), hp: 1 };
  for (const s of STATS) if (s !== "max_hp" && s !== "initiative") hypo[s] = 0;
  for (const g of GEAR_SLOTS) hypo[`${g}_slot`] = "";
  const codes = GEAR_SLOTS.map((g) => ch[`${g}_slot`] as string).filter(Boolean);
  const model = applyGear(baseStats(hypo as unknown as Character), codes).stats as unknown as Record<string, number>;
  const gate = currentFighter(ch as unknown as Character).stats as unknown as Record<string, number>;
  for (const s of STATS) {
    const k = s === "max_hp" ? "hp" : s;
    if (ch[s] === model[k] && ch[s] === gate[k]) continue;
    per.set(s, (per.get(s) ?? 0) + 1);
    if (bad++ < 5) console.log(`MISMATCH ${c.account}/${c.name} ${s}: API ${ch[s]}, the solve ${model[k]}, the gate ${gate[k]}`);
  }
}
if (sets.length !== 40) { bad++; console.log(`MISMATCH ${sets.length} fight sets in the read of ${now}, report 024 counts 40`); }
console.log(`${sets.length} fight sets of ${now}: ${per.size ? [...per].map(([s, n]) => `${s} differs on ${n}`).join(", ") : "no stat differs"}`);
console.log(bad ? "FAILED" : "OK");
process.exit(bad ? 1 : 0);
