// runecheck.mts: does the planner's solve wear a healing rune from the pool, and what it does to a fight (Third, rat/vampire/skeleton)
import { readFileSync } from "node:fs";
(globalThis as any).localStorage ??= { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 };
const { setDataReader } = await import("../t/all2/src/catalog/load.ts");
const cat = await import("../t/all2/src/catalog/index.ts");
const reach = await import("../t/all2/src/plan/planner/reach.ts");
const cons = await import("../t/all2/src/plan/planner/consumables.ts");
const { bankPlus } = await import("../t/all2/src/plan/planner/forward.ts");
setDataReader(async (n: string) => JSON.parse(readFileSync(`D:/Temp/a022/t/all2/public/data/${n}.json`, "utf8")));
await cat.loadCatalog();
const w0 = JSON.parse(readFileSync("D:/Temp/a022/w/2026-11-22.json", "utf8")).world;
w0.config = { ...w0.config, home: 1 };
const bare = cons.gearWorld({ ...w0, bank: bankPlus(w0.bank, new Map(Object.entries(w0.bags ?? {}))), current: {} });
const rune = { ...bare, bank: bankPlus(bare.bank, new Map([["healing_rune", 5]])) };
for (const L of [23, 28, 33]) for (const m of ["rat", "vampire", "skeleton", "imp"]) for (const [k, w] of [["no rune", bare], ["rune", rune]] as const) {
  const ch = reach.chAt(w.characters.find((c: any) => c.name === "Third"), L);
  const price = (c: string) => cons.chainSec({ ...w, bank: [] }, ch.name, c);
  const r = reach.potionRec(ch, w, m, cons.potionCands(ch).filter((p: string) => Number.isFinite(price(p))), price);
  const g = reach.fightRec(ch, w, m);
  console.log(L, m, k, "gear:", g?.safe ? "safe" : g?.forecast.win ? "win" : "lost", g?.codes.includes("healing_rune") ? "R" : "", "| with potions:", r?.safe ? "safe" : r?.forecast.win ? "win" : "lost", JSON.stringify(r?.forecast.used), r?.codes.includes("healing_rune") ? "R" : "");
}
process.exit(0);
