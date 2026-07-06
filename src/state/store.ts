// The single source of truth for dynamic state, as Preact signals. Components
// read these directly and re-render automatically when they change — no manual
// "renderCard()" calls (the maintainability pain of the old client).

import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import type { Account, AccountAchievement, ActiveEvent, BankDetails, BankItem, Character } from "../types/api";
import type { GameMap } from "../types/catalog";
import { cooldownRemaining } from "../lib/util";

/** The workshop skills a character can specialize in (the 📌 pin vocabulary). */
export const CRAFT_TRAIN_SKILLS: [string, string][] = [
  ["weaponcrafting", "Weaponcrafting"],
  ["gearcrafting", "Gearcrafting"],
  ["jewelrycrafting", "Jewelrycrafting"],
  ["cooking", "Cooking"],
];

export interface LogEntry {
  id: number;
  ts: number;
  character: string;
  action: string;
  text: string;
  kind: "ok" | "bad" | "info";
}

/** Characters keyed by name. */
export const characters = signal<Record<string, Character>>({});
export const bankItems = signal<BankItem[]>([]);
export const bankDetails = signal<BankDetails | null>(null);
export const account = signal<Account | null>(null);
export const log = signal<LogEntry[]>([]);

/**
 * Time-limited map events (GET /events/active). Refreshed only by reconcile()
 * — the no-polling rule holds — and pruned locally by the 4 Hz clock below as
 * each expiration passes, so the map/pickers forget an event on time without
 * any API call. See state/events.ts for the derived lookups.
 */
export const activeEvents = signal<ActiveEvent[]>([]);

/** Whether the static catalog has finished loading into memory. */
export const catalogReady = signal(false);
/** Whether we currently hold a token (drives the login gate). */
export const authed = signal(false);
/** Epoch ms of the last successful reconcile sync. */
export const syncedAt = signal<number | null>(null);
/** True while a reconcile sync is in flight. */
export const syncing = signal(false);
export const lastError = signal<string | null>(null);

/** Name of the currently selected character (highlights its card + map marker). */
export const selectedCharacter = signal<string | null>(null);

/**
 * Per-character crafting-specialization pin (character name → craft skill key).
 * Unpinned characters auto-highlight their highest crafting skill instead.
 * Persisted via persist.ts; the UI toggles it by clicking a craft skill row.
 */
export const craftSkillPins = signal<Record<string, string>>({});
export function toggleCraftPin(name: string, skill: string): void {
  const cur = { ...craftSkillPins.value };
  if (cur[name] === skill) delete cur[name];
  else cur[name] = skill;
  craftSkillPins.value = cur;
}
/** The character's crafting specialization: the pinned skill, else the highest. */
export function craftFocus(ch: Character): string {
  const keys = CRAFT_TRAIN_SKILLS.map(([k]) => k);
  const pin = craftSkillPins.value[ch.name];
  if (pin && keys.includes(pin)) return pin;
  const stat = ch as unknown as Record<string, number>;
  return keys.reduce((best, k) => ((stat[`${k}_level`] ?? 0) > (stat[`${best}_level`] ?? 0) ? k : best), keys[0]);
}
/**
 * A bump-on-click focus request the map listens to. The `seq` lets repeated
 * clicks on the same already-selected card re-center the map.
 */
export const focusRequest = signal<{ name: string; seq: number } | null>(null);
let _focusSeq = 0;
/** Select a character and ask the map to center on it. */
export function focusCharacter(name: string): void {
  selectedCharacter.value = name;
  focusRequest.value = { name, seq: ++_focusSeq };
}

/** Ask the map to jump to a tile (switching layer if needed) — e.g. an event row click. */
export const tileFocus = signal<{ x: number; y: number; layer: string; seq: number } | null>(null);
let _tileFocusSeq = 0;
export function focusTile(x: number, y: number, layer = "overworld"): void {
  tileFocus.value = { x, y, layer, seq: ++_tileFocusSeq };
}

/**
 * Transient UI state: the interactive tile under the cursor, plus the cursor
 * position and map size (so the HTML inspector can position + edge-flip itself).
 * Only set for tiles that have content worth showing; null otherwise.
 */
export interface MapHover {
  tile: GameMap;
  px: number;
  py: number;
  boxW: number;
  boxH: number;
}
export const mapHover = signal<MapHover | null>(null);

/**
 * The workshop/NPC tile the player clicked, driving the right-hand catalog panel.
 * Null when nothing is selected (panel hidden).
 */
export interface PanelTarget {
  type: "workshop" | "npc" | "bank" | "tasks_master";
  code: string;
  x: number;
  y: number;
  layer: string;
}
export const panelTarget = signal<PanelTarget | null>(null);

/**
 * An item whose parameters to show in a floating popup, with the cursor
 * position to anchor it. Set on hover (e.g. workshop recipe rows), cleared on
 * mouse-out. Purely transient UI — never persisted.
 */
export const itemPopup = signal<{ code: string; x: number; y: number } | null>(null);

/**
 * Whether the full items-catalog panel (right side) is open. Mutually exclusive
 * with panelTarget — opening one closes the other so the right slot holds a
 * single panel.
 */
export const itemsCatalogOpen = signal(false);

/**
 * The location hash, as a signal — the app's entire "router". `#/sim` renders
 * the fight-sim playground instead of the map stage; GitHub Pages needs no
 * server config for hash routes, and the sim page encodes its loadout in the
 * hash query so setups are shareable.
 */
export const routeHash = signal(typeof location !== "undefined" ? location.hash : "");
if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => (routeHash.value = location.hash));
}

/**
 * When set to a character name, the next map-tile click moves that character
 * there instead of selecting the tile (armed by the Move button, cleared after
 * the click or on Escape). Auto-disarms below if the selection moves elsewhere.
 */
export const moveMode = signal<string | null>(null);
effect(() => {
  if (moveMode.value && moveMode.value !== selectedCharacter.value) moveMode.value = null;
});

/**
 * Armed "pick a tile" mode for FORMS (e.g. the queue's Move item): the next
 * map-tile click hands its coordinates to the armed callback instead of doing
 * anything. Unlike moveMode this never issues an action. The callback lives in
 * a module variable (signals only carry JSON-ish UI state); the signal drives
 * the map hint/cursor. Auto-disarms when the selection moves elsewhere.
 */
export const tilePick = signal<{ name: string; label: string } | null>(null);
let _tilePickFn: ((x: number, y: number) => void) | null = null;
export function armTilePick(name: string, label: string, fn: (x: number, y: number) => void): void {
  _tilePickFn = fn;
  tilePick.value = { name, label };
}
export function disarmTilePick(): void {
  _tilePickFn = null;
  if (tilePick.value) tilePick.value = null;
}
/** MapView calls this on a tile click while armed. Disarms after delivering. */
export function deliverTilePick(x: number, y: number): void {
  const fn = _tilePickFn;
  disarmTilePick();
  fn?.(x, y);
}
effect(() => {
  if (tilePick.value && tilePick.value.name !== selectedCharacter.value) disarmTilePick();
});

/**
 * Achievements viewer state. Fetched on demand when the panel is opened (a read,
 * so never polled) and deliberately NOT persisted — it's always requested fresh.
 * `achievements === null` means "not loaded yet".
 */
export const achievementsOpen = signal(false);
export const achievements = signal<AccountAchievement[] | null>(null);
export const achievementsLoading = signal(false);
export const achievementsError = signal<string | null>(null);

/**
 * One global clock that ticks 4x/second. Cooldown countdowns read this so they
 * re-render without a timer per character. Purely local — never hits the API.
 */
export const now = signal<number>(Date.now());
setInterval(() => {
  now.value = Date.now();
  // Drop events whose expiration just passed (guarded write — the signal only
  // changes when something actually expired).
  const evs = activeEvents.value;
  if (evs.length && evs.some((e) => Date.parse(e.expiration) <= now.value)) {
    activeEvents.value = evs.filter((e) => Date.parse(e.expiration) > now.value);
  }
}, 250);

/**
 * Per-character "is on cooldown" flag, derived from the 4 Hz `now` clock.
 *
 * Because this is a `computed<boolean>`, it only notifies its subscribers when the
 * flag actually *flips* (a cooldown starts or ends) — NOT on every 250 ms tick.
 * Action-gated UI (buttons, and whole panels via useActionRunner) subscribes to
 * this instead of reading `now` directly, so those large subtrees re-render only
 * ~twice per cooldown instead of 4×/second. Reading `now.value` in a component
 * body subscribes the *entire* component to the clock; funnelling the gate through
 * this computed is what keeps the panels from re-rendering (and re-running their
 * heavy per-render derivations) continuously — the memory-growth culprit.
 *
 * The live numeric countdown that genuinely needs every tick lives in the tiny
 * <CooldownBadge> leaf (ui/Cooldown.tsx), the only thing that reads `now` directly.
 *
 * Flags are memoised per name (bounded by the character count) so every consumer
 * shares one computed.
 */
const _cooldownFlags = new Map<string, ReadonlySignal<boolean>>();
export function onCooldown(name: string): ReadonlySignal<boolean> {
  let flag = _cooldownFlags.get(name);
  if (!flag) {
    flag = computed(() => {
      const ch = characters.value[name];
      return !!ch && cooldownRemaining(ch, now.value) > 0;
    });
    _cooldownFlags.set(name, flag);
  }
  return flag;
}

let _logId = 0;
/** Bump the id counter past restored entries so new ids never collide with
 *  persisted ones (they're used as render keys). Called by loadPersisted(). */
export function seedLogId(min: number): void {
  if (min > _logId) _logId = min;
}
export function pushLog(entry: Omit<LogEntry, "id">): void {
  log.value = [{ ...entry, id: ++_logId }, ...log.value].slice(0, 200);
}

export function setCharacter(ch: Character): void {
  characters.value = { ...characters.value, [ch.name]: ch };
}

/**
 * Characters in their stable account order (creation order: First, Second, …).
 * `/my/characters` returns them in this order and we keep it: the store is keyed
 * by name, and JS preserves string-key insertion order across our in-place
 * updates, so we deliberately do NOT re-sort.
 */
export function characterList(): Character[] {
  return Object.values(characters.value);
}
