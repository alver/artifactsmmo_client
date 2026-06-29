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

export const item = (code: string): Item | undefined => _catalog?.items.get(code);
export const monster = (code: string): Monster | undefined => _catalog?.monsters.get(code);
export const resource = (code: string): Resource | undefined => _catalog?.resources.get(code);
export const achievement = (code: string): Achievement | undefined => _catalog?.achievements.get(code);
export const effect = (code: string): Effect | undefined => _catalog?.effects.get(code);
export const mapAt = (x: number, y: number): GameMap | undefined => _catalog?.mapsByCoord.get(`${x},${y}`);

/** Display name for an item code, falling back to the code itself. */
export const itemName = (code: string): string => _catalog?.items.get(code)?.name ?? code;
