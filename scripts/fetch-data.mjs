// Re-snapshot the game's static catalogs into public/data/*.json (run after a
// new season / server version). Public data endpoints, no token needed.
//
//   node scripts/fetch-data.mjs [outDir=public/data]
//
// Then `npm run assets` + `node scripts/fetch-map-assets.mjs` for new icons/tiles.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE = "https://api.artifactsmmo.com";
const OUT = process.argv[2] ?? "public/data";

async function getJson(path) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(BASE + path, { headers: { Accept: "application/json" } });
    if (r.ok) return r.json();
    if (r.status !== 429 || attempt >= 5) throw new Error(`${path}: HTTP ${r.status}`);
    await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
  }
}

async function all(path) {
  const out = [];
  for (let page = 1; ; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const j = await getJson(`${path}${sep}page=${page}&size=100`);
    out.push(...j.data);
    if (!j.pages || page >= j.pages) return out;
  }
}

const SOURCES = {
  items: "/items",
  monsters: "/monsters",
  resources: "/resources",
  maps: "/maps",
  npcs: "/npcs/details",
  npc_items: "/npcs/items",
  tasks: "/tasks/list",
  task_rewards: "/tasks/rewards",
  effects: "/effects",
  badges: "/badges",
  achievements: "/achievements",
  events: "/events",
};

const data = {};
for (const [name, path] of Object.entries(SOURCES)) data[name] = await all(path);

// npcs.json embeds each NPC's trade offers (without the redundant npc field).
for (const n of data.npcs)
  n.items = data.npc_items.filter((o) => o.npc === n.code).map(({ npc, ...o }) => o);

await mkdir(OUT, { recursive: true });
const counts = {};
for (const [name, arr] of Object.entries(data)) {
  counts[name] = arr.length;
  await writeFile(join(OUT, `${name}.json`), JSON.stringify(arr));
}
const server = (await getJson("/")).data;
const manifest = { fetched_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"), base_url: BASE, counts, server };
await writeFile(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`server ${server.version} season ${server.season?.number} →`, counts);
