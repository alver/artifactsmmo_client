// Download the map tile artwork (one PNG per distinct `skin` in maps.json) and
// keep it locally under public/assets/maps/. The map is drawn from these local
// files — no runtime requests to the game CDN.
//
//   node scripts/fetch-map-assets.mjs
//
// The official client serves tiles from https://artifactsmmo.com/images/maps/{skin}.png
// (the docs.artifactsmmo.com/resources/images path 404s). Re-run when the season
// adds new tiles; existing files are skipped.

import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

const SRC = "https://artifactsmmo.com/images/maps";
const OUT = "public/assets/maps";
const CONCURRENCY = 8;

const maps = JSON.parse(await readFile("public/data/maps.json", "utf8"));
const skins = [...new Set(maps.map((m) => m.skin).filter(Boolean))].sort();
await mkdir(OUT, { recursive: true });

const exists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

let ok = 0;
let skip = 0;
const failed = [];

async function fetchOne(skin) {
  const out = join(OUT, `${skin}.png`);
  if (await exists(out)) {
    skip++;
    return;
  }
  try {
    const r = await fetch(`${SRC}/${encodeURIComponent(skin)}.png`);
    if (!r.ok) {
      failed.push(`${skin} (${r.status})`);
      return;
    }
    await writeFile(out, Buffer.from(await r.arrayBuffer()));
    ok++;
  } catch (e) {
    failed.push(`${skin} (${e.message})`);
  }
}

console.log(`Fetching ${skins.length} distinct map skins → ${OUT}/`);
for (let i = 0; i < skins.length; i += CONCURRENCY) {
  await Promise.all(skins.slice(i, i + CONCURRENCY).map(fetchOne));
}
console.log(`done: ${ok} downloaded, ${skip} skipped (already present), ${failed.length} failed`);
if (failed.length) console.log("failed:", failed.join(", "));
