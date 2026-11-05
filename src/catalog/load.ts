// Load one static catalog. Prefer the bundled snapshot under public/data/ (free,
// instant, costs no API budget); fall back to the live paginated API only if a
// file is missing — same strategy the original client used.

import type { CatalogName } from "../types/catalog";
import { getAllPages } from "../api/client";

// The tab fetches the served file; the local service swaps in a disk read.
let readData = async (name: CatalogName): Promise<unknown> => {
  const r = await fetch(`/data/${name}.json`, { cache: "force-cache" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};
export function setDataReader(fn: (name: CatalogName) => Promise<unknown>): void {
  readData = fn;
}

export async function loadCatalogFile<T>(name: CatalogName): Promise<T[]> {
  try {
    return (await readData(name)) as T[];
  } catch {
    /* fall through to the live API */
  }
  return getAllPages<T>(`/${name}`);
}
