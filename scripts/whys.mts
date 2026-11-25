// Task 028 (D.1): every step's why on three fixture Worlds — the World of 11-25 played forward `hours` (the road's World:
// bags banked, no bank slots), each character's decision on the World of 11-24, and on the made-up World of check-seconds A
// (11-21, the fighters unarmed). Run against a tree (its src/ and public/data/) to record what that tree says:
//   node --import tsx scripts/whys.mts <tree> <out.json> [hours]
// check-onepage compares this tree's whys with the record of 027g's tree (scripts/fixtures/whys-027g.json).
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

// api/client.ts reads the token at import: outside the check runner (no --localstorage-file) a store that keeps nothing
(globalThis as { localStorage?: unknown }).localStorage ??= { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 };
(globalThis as { fetch: unknown }).fetch = () => Promise.reject(new Error("no request from a check"));

export interface Why { w: string; key: string; why: string }
const ROLES = {
  First: { role: "fighter" },
  Second: { role: "worker", craft: ["weaponcrafting"], gather: ["woodcutting"], fighterFrom: { skill: "weaponcrafting", level: 30 } },
  Third: { role: "worker", craft: ["gearcrafting", "cooking"], gather: ["alchemy", "fishing"] },
  Fourth: { role: "worker", craft: ["jewelrycrafting"], gather: ["mining", "woodcutting"] },
  Fifth: { role: "fighter" },
};

/** The whys of `tree` (a directory holding src/ and public/data/); `onStep` sees every step (this tree's checks). */
export async function whysOf(tree: string, hours: number, onStep?: (w: string, step: any) => void): Promise<Why[]> {
  const mod = (p: string): Promise<any> => import(pathToFileURL(path.join(tree, p)).href);
  const { setDataReader } = await mod("src/catalog/load.ts");
  const { loadCatalog } = await mod("src/catalog/index.ts");
  const { decide } = await mod("src/plan/planner/decide.ts");
  const { bankPlus, forward } = await mod("src/plan/planner/forward.ts");
  setDataReader(async (name: string) => JSON.parse(await readFile(path.join(tree, "public/data", `${name}.json`), "utf8")));
  await loadCatalog();
  const fx = async (f: string): Promise<any> => JSON.parse(await readFile(path.join("scripts/fixtures", f), "utf8")).world;
  const out: Why[] = [];
  const see = (w: string, step: any): void => { out.push({ w, key: step.key, why: step.why }); onStep?.(w, step); };

  const live = await fx("world-2026-11-25.json");
  const world = { ...live, bank: bankPlus(live.bank, new Map(Object.entries(live.bags ?? {}))), bags: undefined, bankSlots: undefined, nextExpansion: undefined };
  forward(world, world.now + hours * 3.6e6, (_w: unknown, step: any) => see("11-25 road", step), undefined, undefined, false);

  const w24 = await fx("world-2026-11-24.json");
  for (const c of w24.characters) if (w24.config.on[c.name]) see("11-24", decide(c.name, w24));

  const f21 = await fx("world-2026-11-21.json");
  const unarmed: Record<string, object> = { First: { weapon_slot: "" }, Fifth: { weapon_slot: "" }, Second: { weaponcrafting_level: 30 } };
  const w21 = {
    ...f21, current: {}, blocked: {}, bags: {}, bankSlots: undefined, nextExpansion: undefined, favors: undefined, bank: [],
    characters: f21.characters.map((c: any) => ({ ...c, ...unarmed[c.name] })),
    config: { ...f21.config, roles: ROLES, on: Object.fromEntries(Object.keys(ROLES).map((n) => [n, true])) },
  };
  for (const c of w21.characters) see("11-21 unarmed", decide(c.name, w21));
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [tree, file, hours] = process.argv.slice(2);
  const t0 = Date.now();
  const w = await whysOf(path.resolve(tree), Number(hours ?? 12));
  await writeFile(file, JSON.stringify(w, null, 1) + "\n");
  console.log(`${w.length} whys in ${((Date.now() - t0) / 1000).toFixed(1)} s → ${file}`);
}
