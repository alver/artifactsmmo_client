// cal.mjs <name>...: the event achievements' completion days per run (the calendar guard: magic_lumberjack, strange_miner,
// magic_harvester behind mining / woodcutting 35, and the other event achievements)
import { readFileSync } from "node:fs";
const EV = ["magic_lumberjack", "strange_miner", "magic_harvester", "the_new_bandit", "cult_destroyer", "its_malefic", "closing_the_gate", "corruption_eradicator", "welcome_to_hell", "draconic_harvest"];
console.log(`| run | ${EV.join(" | ")} |\n|---|${EV.map(() => "---").join("|")}|`);
for (const n of process.argv.slice(2)) {
  const L = readFileSync(`docs/strategy/022/runs/${n}.jsonl`, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const d = L.find((l) => l.k === "done");
  if (!d) continue;
  const at = Object.fromEntries(d.completed.map((c) => [c.code, new Date(c.at).toISOString().slice(5, 10)]));
  console.log(`| ${n} | ${EV.map((c) => at[c] ?? "—").join(" | ")} |`);
}
