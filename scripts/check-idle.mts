// Self-check of the hive's idle policy (plan/hive/tasks.ts, no API):
//   node --import tsx --experimental-webstorage --localstorage-file=/tmp/x.db --disable-warning=ExperimentalWarning scripts/check-idle.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { fillerItems } from "../src/plan/hive";
import { proposeTaskGoals } from "../src/plan/hive/tasks";
import type { HiveCtx } from "../src/plan/hive";
import type { AccountAchievement, Character } from "../src/types/api";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();

const ch = { name: "T", level: 20, inventory: [] } as unknown as Character;
const farmer = [{ code: "tasks_farmer", completed_at: "2026-11-08T16:07:26Z", objectives: [{ progress: 100, total: 100 }] }] as unknown as AccountAchievement[];
const ctx = (pins: string[], coins: number, achievements: AccountAchievement[] | null = farmer): HiveCtx =>
  ({ characters: [ch], bank: [{ code: "tasks_coin", quantity: coins }], bankGold: 0, achievements, craftPins: {}, pins: { T: pins } }) as HiveCtx;
const fails: string[] = [];
const want = (why: string, got: unknown, exp: unknown) => { if (JSON.stringify(got) !== JSON.stringify(exp)) fails.push(`${why}: got ${JSON.stringify(got)}, want ${JSON.stringify(exp)}`); };

// Filler trains a pinned gathering/combat skill; a workshop pin is skipped (it would eat the wave's materials).
want("gearcrafting+mining pins", fillerItems(ctx(["gearcrafting", "mining"], 0), ch), [{ kind: "train", skill: "mining", toLevel: 0, gear: true }]);
want("combat pin", fillerItems(ctx(["combat"], 0), ch), [{ kind: "train", skill: "combat", toLevel: 0, gear: true }]);
want("alchemy pin (herb gathering)", fillerItems(ctx(["cooking", "alchemy"], 0), ch)?.[0], { kind: "train", skill: "alchemy", toLevel: 0, gear: true });
// A full coin reserve with the trader open (or unknown) proposes no task farming at all.
want("526 coins, trader open", proposeTaskGoals(ctx([], 526)), []);
want("526 coins, gate unknown", proposeTaskGoals(ctx([], 526, null)), []);

for (const f of fails) console.log(`MISMATCH ${f}`);
console.log(fails.length ? "FAILED" : "OK");
process.exit(fails.length ? 1 : 0);
