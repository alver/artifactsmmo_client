// The single source of truth for dynamic state, as Preact signals. Components
// read these directly and re-render automatically when they change — no manual
// "renderCard()" calls (the maintainability pain of the old client).

import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import type { Account, AccountAchievement, BankDetails, BankItem, Character } from "../types/api";
import type { GameMap } from "../types/catalog";
import { cooldownRemaining } from "../lib/util";

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
 * When set to a character name, the next map-tile click moves that character
 * there instead of selecting the tile (armed by the Move button, cleared after
 * the click or on Escape). Auto-disarms below if the selection moves elsewhere.
 */
export const moveMode = signal<string | null>(null);
effect(() => {
  if (moveMode.value && moveMode.value !== selectedCharacter.value) moveMode.value = null;
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
