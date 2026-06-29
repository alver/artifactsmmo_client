// Load one static catalog. Prefer the bundled snapshot under public/data/ (free,
// instant, costs no API budget); fall back to the live paginated API only if a
// file is missing — same strategy the original client used.

import type { CatalogName } from "../types/catalog";
import { getAllPages } from "../api/client";

const BASE = import.meta.env.BASE_URL || "/";

export async function loadCatalogFile<T>(name: CatalogName): Promise<T[]> {
  try {
    const r = await fetch(`${BASE}data/${name}.json`, { cache: "force-cache" });
    if (r.ok) return (await r.json()) as T[];
  } catch {
    /* fall through to the live API */
  }
  return getAllPages<T>(`/${name}`);
}
