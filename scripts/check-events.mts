// Self-check of the event standing orders (plan/events.ts + state/eventorders.ts, no API):
//   node --import tsx --experimental-webstorage --localstorage-file=/tmp/x.db --disable-warning=ExperimentalWarning scripts/check-events.mts
import { readFile } from "node:fs/promises";
import { setDataReader } from "../src/catalog/load";
import { loadCatalog } from "../src/catalog";
import { fieldOrder, merchantOrder } from "../src/plan/events";
import { eventPlans, reactToEvents } from "../src/state/eventorders";
import { queues } from "../src/state/queue";
import { activeEvents, bankDetails, bankItems, characters } from "../src/state/store";
import type { ActiveEvent, BankItem, BankDetails, Character } from "../src/types/api";
setDataReader(async (name) => JSON.parse(await readFile(`public/data/${name}.json`, "utf8")));
await loadCatalog();

const mk = (name: string, x: number, extra: Record<string, unknown> = {}) =>
  ({ name, x, y: 0, level: 20, inventory: [], woodcutting_level: 21, ...extra }) as unknown as Character;
const fleet = ["A", "B", "C", "D", "E"].map((n, i) => mk(n, i * 3));
const bank: BankItem[] = [{ code: "sap", quantity: 2913 }, { code: "shell", quantity: 217 }, { code: "golden_shrimp", quantity: 6 }, { code: "golden_egg", quantity: 3 }, { code: "forest_ring", quantity: 19 }];
const fails: string[] = [];
const want = (why: string, got: string | undefined, exp: string | undefined) => { if (got !== exp) fails.push(`${why}: got "${got}", want "${exp}"`); };

// Merchants, on the 2026-11-17 bank: whitelist sells down to floors, gear (forest rings) never sold.
want("timber", merchantOrder("timber_merchant", bank, 107_469, fleet)?.text, "sell 2613 Sap");
want("fish", merchantOrder("fish_merchant", bank, 107_469, fleet)?.text, "sell 6 Golden Shrimp · sell 167 Shell");
want("gemstone", merchantOrder("gemstone_merchant", bank, 107_469, fleet)?.text, undefined);
// 107k + 3k eggs − 20k floor buys the 5 maps.
want("nomadic", merchantOrder("nomadic_merchant", bank, 107_469, fleet)?.text, "sell 3 Golden Egg · buy 5 Lost World Map");
// One map worn, one in the bank → 3 more.
const worn = [mk("A", 0, { artifact2_slot: "lost_world_map" }), ...fleet.slice(1)];
want("owned maps", merchantOrder("nomadic_merchant", [...bank, { code: "lost_world_map", quantity: 1 }], 107_469, worn)?.text, "sell 3 Golden Egg · buy 3 Lost World Map");
// Short on gold: no map, and the gold is NOT spent on the next wish.
want("poor", merchantOrder("nomadic_merchant", bank, 30_000, fleet)?.text, "sell 3 Golden Egg");
// All maps owned: nothing else is bought — backpacks are no longer wished for (report 005, decision 2).
const mapped = fleet.map((c) => ({ ...c, artifact2_slot: "lost_world_map" }) as Character);
want("no backpacks", merchantOrder("nomadic_merchant", bank, 200_000, mapped)?.text, "sell 3 Golden Egg");

// Resource event: only a character with the skill for the node goes.
const ev = (code: string, type: string, content: string, x = 3): ActiveEvent =>
  ({ name: code, code, map: { x, y: 2, layer: "overworld", interactions: { content: { type, code: content } } }, duration: 90, expiration: new Date(Date.now() + 3_600_000).toISOString(), created_at: "2026-11-17T10:00:00Z" }) as unknown as ActiveEvent;
want("magic tree, nobody", fieldOrder(ev("magic_apparition", "resource", "magic_tree"), bank, fleet)?.character, undefined);
want("magic tree, D", fieldOrder(ev("magic_apparition", "resource", "magic_tree"), bank, [...fleet.slice(0, 3), mk("D", 9, { woodcutting_level: 36 })])?.character, "D");

// Runtime: the nearest running queue gets the trip ahead of its head, once.
characters.value = Object.fromEntries(fleet.map((c) => [c.name, c]));
bankItems.value = bank;
bankDetails.value = { gold: 107_469 } as BankDetails;
queues.value = Object.fromEntries(fleet.map((c) => [c.name, { running: c.name !== "B", items: [{ id: `h${c.name}`, kind: "gather", code: "ash_wood", resource: "ash_tree", times: 0, done: 0 }] }])) as unknown as typeof queues.value;
eventPlans.value = {}; // a reused --localstorage-file may hold the last run's plans
activeEvents.value = [ev("nomadic_merchant", "npc", "nomadic_merchant", 4)]; // B (x 3) is closest but stopped → A (x 0) or C (x 6): C is 2 away
reactToEvents();
reactToEvents(); // a second poll must not dispatch again
const c = queues.value.C.items.map((it) => it.kind + (it.id.startsWith("ev:") ? "*" : ""));
want("dispatch to C", c.join(","), "sell*,buy*,gather");
want("plan text", eventPlans.value[Object.keys(eventPlans.value)[0]], "C: sell 3 Golden Egg · buy 5 Lost World Map");
want("B untouched", String(queues.value.B.items.length), "1");

for (const f of fails) console.log(`MISMATCH ${f}`);
console.log(fails.length ? "FAILED" : "OK");
process.exit(fails.length ? 1 : 0);
