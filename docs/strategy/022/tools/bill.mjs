// bill.mjs <runs dir> <name>...: the season's consumables bill in gold — every potion and food a run drank or ate (stats
// `drunk`; row B: `freeUse`, what its kill steps' planned sets drink), opened into its recipe's gathered ingredients, priced at
// the market (section 1's 7-day medians from /grandexchange/history and `npm run market`'s book of 11-21/22; a code with no
// price is listed, not guessed); and the run's gold (the model's bank gold at the start and the end).
import { readFileSync } from "node:fs";
const [dir, ...names] = process.argv.slice(2);
const items = JSON.parse(readFileSync("public/data/items.json", "utf8"));
const I = Object.fromEntries(items.map((x) => [x.code, x]));
// gold a unit: GE history medians (algae, nettle_leaf, sunflower, small_health_potion), the book's median ask (sap, red
// slimeball, cooked trout, cooked chicken, minor_health_potion), the book's bid where there is no ask (egg, slimeballs)
const PRICE = { algae: 2, nettle_leaf: 10, sunflower: 8, sap: 3, egg: 7, yellow_slimeball: 8, green_slimeball: 8, blue_slimeball: 8, red_slimeball: 50, cooked_trout: 70, cooked_chicken: 21 };
const AS_IS = new Set(["cooked_trout", "cooked_chicken"]); // bought made: the book holds them
const START_GOLD = 168196; // logs/world/2026-11-22.json bankGold
for (const n of names) {
  const L = readFileSync(`${dir}/${n}.jsonl`, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const s = L.find((l) => l.k === "stats");
  if (!s) { console.log(`${n}: not done`); continue; }
  const use = Object.keys(s.drunk ?? {}).length ? s.drunk : s.freeUse ?? {};
  const raw = {}, unpriced = {};
  const open = (code, q) => {
    const r = I[code]?.craft;
    if (AS_IS.has(code) || !r) { (PRICE[code] != null ? raw : unpriced)[code] = ((PRICE[code] != null ? raw : unpriced)[code] ?? 0) + q; return; }
    for (const g of r.items) open(g.code, (g.quantity * q) / Math.max(1, r.quantity));
  };
  for (const [c, q] of Object.entries(use)) open(c, q);
  const gold = Object.entries(raw).reduce((t, [c, q]) => t + q * PRICE[c], 0);
  const top = Object.entries(use).sort((a, b) => b[1] - a[1]).map(([c, q]) => `${c} ${Math.round(q)}`).join(", ");
  console.log(`\n${n}: ${Object.keys(s.drunk ?? {}).length ? "drunk and eaten" : "what its kill steps' sets drink (consumables free)"}: ${top}`);
  console.log(`  ingredients priced: ${Object.entries(raw).sort((a, b) => b[1] * PRICE[b[0]] - a[1] * PRICE[a[0]]).map(([c, q]) => `${c} ${Math.round(q)} × ${PRICE[c]} = ${Math.round(q * PRICE[c])}`).join("; ")}`);
  console.log(`  total ${Math.round(gold)} gold; not priced (no market seen): ${Object.entries(unpriced).map(([c, q]) => `${c} ${Math.round(q)}`).join(", ") || "none"}`);
  console.log(`  the model's bank gold: ${START_GOLD} at the start → ${Math.round(s.bankGold)} at the end (kills' gold less fares and keys; tasks, sales and offerings earn nothing in the model)`);
}
