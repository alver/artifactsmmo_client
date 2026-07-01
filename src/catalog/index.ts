// In-memory static catalog: loaded once at boot, then queried synchronously.
// Use the accessor helpers (item, monster, …) from components — they return
// undefined safely before the catalog has loaded, so callers can fall back to
// the raw code.

import type {
  Achievement,
  Effect,
  GameMap,
  Item,
  Monster,
  Npc,
  Resource,
  Task,
} from "../types/catalog";
import { loadCatalogFile } from "./load";
import { titleCase } from "../lib/util";

export interface Catalog {
  items: Map<string, Item>;
  monsters: Map<string, Monster>;
  resources: Map<string, Resource>;
  maps: GameMap[];
  mapsByCoord: Map<string, GameMap>;
  effects: Map<string, Effect>;
  achievements: Map<string, Achievement>;
  tasks: Map<string, Task>;
  npcs: Map<string, Npc>;
}

let _catalog: Catalog | null = null;

const byCode = <T extends { code: string }>(arr: T[]): Map<string, T> =>
  new Map(arr.map((x) => [x.code, x]));

export async function loadCatalog(): Promise<Catalog> {
  if (_catalog) return _catalog;
  const [items, monsters, resources, maps, effects, achievements, tasks, npcs] = await Promise.all([
    loadCatalogFile<Item>("items"),
    loadCatalogFile<Monster>("monsters"),
    loadCatalogFile<Resource>("resources"),
    loadCatalogFile<GameMap>("maps"),
    loadCatalogFile<Effect>("effects"),
    loadCatalogFile<Achievement>("achievements"),
    loadCatalogFile<Task>("tasks"),
    loadCatalogFile<Npc>("npcs"),
  ]);

  // Several layers (overworld/underground/interior) share an (x,y). Prefer the
  // overworld tile when keying by coordinate, since that's what we display.
  const mapsByCoord = new Map<string, GameMap>();
  for (const m of maps) {
    const key = `${m.x},${m.y}`;
    if (!mapsByCoord.has(key) || m.layer === "overworld") mapsByCoord.set(key, m);
  }

  _catalog = {
    items: byCode(items),
    monsters: byCode(monsters),
    resources: byCode(resources),
    maps,
    mapsByCoord,
    effects: byCode(effects),
    achievements: byCode(achievements),
    tasks: byCode(tasks),
    npcs: byCode(npcs),
  };
  return _catalog;
}

/** The loaded catalog. Throws if called before loadCatalog() resolves. */
export function catalog(): Catalog {
  if (!_catalog) throw new Error("catalog not loaded yet");
  return _catalog;
}

export const item = (code: string): Item | undefined => _catalog?.items.get(code);
export const monster = (code: string): Monster | undefined => _catalog?.monsters.get(code);
export const resource = (code: string): Resource | undefined => _catalog?.resources.get(code);
export const achievement = (code: string): Achievement | undefined => _catalog?.achievements.get(code);
export const effect = (code: string): Effect | undefined => _catalog?.effects.get(code);
export const npc = (code: string): Npc | undefined => _catalog?.npcs.get(code);
export const mapAt = (x: number, y: number): GameMap | undefined => _catalog?.mapsByCoord.get(`${x},${y}`);

/** Exact tile at a coordinate on a given layer (overworld/underground/interior). */
export const tileAt = (x: number, y: number, layer = "overworld"): GameMap | undefined =>
  _catalog?.maps.find((m) => m.x === x && m.y === y && (m.layer ?? "overworld") === layer);

/** Display name for an item code, falling back to the code itself. */
export const itemName = (code: string): string => _catalog?.items.get(code)?.name ?? code;

export interface ItemSource {
  kind: "gather" | "drop" | "craft" | "npc";
  label: string;
  x?: number;
  y?: number;
}

const _sourceCache = new Map<string, ItemSource[]>();

/**
 * How + where to obtain an item: gathered from a resource, dropped by a monster,
 * crafted at a workshop, or bought from an NPC — each with a map tile where it's
 * available. Derived from the static catalog and cached (catalog never changes).
 */
export function itemSources(code: string): ItemSource[] {
  if (!_catalog) return [];
  const cached = _sourceCache.get(code);
  if (cached) return cached;

  const cat = _catalog;
  const tileFor = (type: string, c: string) =>
    cat.maps.find((m) => m.interactions?.content?.type === type && m.interactions.content.code === c);
  const out: ItemSource[] = [];

  for (const r of cat.resources.values()) {
    if (r.drops?.some((d) => d.code === code)) {
      const t = tileFor("resource", r.code);
      out.push({ kind: "gather", label: `${r.name} · ${titleCase(r.skill)} Lv ${r.level}`, x: t?.x, y: t?.y });
    }
  }
  for (const m of cat.monsters.values()) {
    if (m.drops?.some((d) => d.code === code)) {
      const t = tileFor("monster", m.code);
      out.push({ kind: "drop", label: `${m.name} · Lv ${m.level}`, x: t?.x, y: t?.y });
    }
  }
  const it = cat.items.get(code);
  if (it?.craft) {
    const t = cat.maps.find(
      (m) => m.interactions?.content?.type === "workshop" && m.interactions.content.code === it.craft!.skill,
    );
    out.push({ kind: "craft", label: `${titleCase(it.craft.skill)} workshop · Lv ${it.craft.level}`, x: t?.x, y: t?.y });
  }
  for (const n of cat.npcs.values()) {
    if (n.items?.some((i) => i.code === code && i.buy_price != null)) {
      const t = tileFor("npc", n.code);
      out.push({ kind: "npc", label: n.name, x: t?.x, y: t?.y });
    }
  }

  _sourceCache.set(code, out);
  return out;
}
