// Self-check of the train helpers' coordination + the stock-aware train picker (queue.ts, no API):
//   node --import tsx --experimental-webstorage --localstorage-file=/tmp/x.db --disable-warning=ExperimentalWarning scripts/check-assist.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { item, loadCatalog } from "../src/catalog";
import { assistPick, queues, trainRecipe } from "../src/state/queue";
import { bankItems, characters } from "../src/state/store";
import type { Character } from "../src/types/api";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();

const mk = (name: string, lv: Record<string, number>, inv: Record<string, number> = {}) =>
  ({
    name, x: 0, y: 0, level: 20, max_hp: 215, hp: 215, inventory_max_items: 138,
    inventory: Object.entries(inv).map(([code, quantity], i) => ({ slot: i + 1, code, quantity })),
    ...Object.fromEntries(Object.entries(lv).map(([k, v]) => [`${k}_level`, v])),
  }) as unknown as Character;
const skills = { mining: 21, woodcutting: 21, fishing: 19 };
const crafter = mk("C", { weaponcrafting: 10, ...skills });
const setTeam = (a: Character, b: Character) => {
  characters.value = { C: crafter, A: a, B: b };
  const help = { kind: "train", skill: "weaponcrafting", toLevel: 0, for: "C" };
  queues.value = { A: { running: true, items: [{ ...help, id: "a" }] }, B: { running: true, items: [{ ...help, id: "b" }] } } as unknown as typeof queues.value;
};
const bank = (b: Record<string, number>) => (bankItems.value = Object.entries(b).map(([code, quantity]) => ({ code, quantity })));
const knife = item("iron_knife")!.craft!; // 8 iron bars + 2 spruce planks + 1 shell — all gathered or refined
const fails: string[] = [];

// 1. Two idle helpers, empty bank: the second must not pick what the first is already producing.
bank({});
let a = mk("A", skills), b = mk("B", skills);
setTeam(a, b);
const first = assistPick(a, crafter, "weaponcrafting", knife)?.code;
a = mk("A", skills, first === "iron_bar" ? { iron_ore: 5 } : { [first ?? "x"]: 1 });
setTeam(a, b);
const second = assistPick(b, crafter, "weaponcrafting", knife)?.code;
if (!first || !second || first === second) fails.push(`duplicate pick: A=${first}, B=${second}`);

// 2. Banked raw ore counts as bar stock — nobody goes mining for bars the bank can already smelt.
bank({ iron_ore: 1000 });
a = mk("A", skills);
setTeam(a, b);
const withOre = assistPick(a, crafter, "weaponcrafting", knife)?.code;
if (withOre === "iron_bar") fails.push("banked iron ore ignored: helper still picks iron bars");

// 3. Stock-aware picker: the bank's 1,009 idle copper ore (raw → bars) gets used before
//    the loop gathers fresh iron for the recipe that is best from scratch.
bank({});
const cold = trainRecipe(crafter, "weaponcrafting", [crafter])?.code;
bank({ copper_ore: 1009 });
const stocked = trainRecipe(crafter, "weaponcrafting", [crafter]);
if (cold !== "iron_knife" || !stocked?.recipe.items.some((g) => g.code === "copper_bar")) fails.push(`want iron_knife cold → a copper-bar recipe stocked, got ${cold} → ${stocked?.code}`);

for (const f of fails) console.log(`MISMATCH ${f}`);
console.log(fails.length ? "FAILED" : `OK (A=${first}, B=${second}, with ore=${withOre}, cold=${cold})`);
process.exit(fails.length ? 1 : 0);
