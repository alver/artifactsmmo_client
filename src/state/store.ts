// The single source of truth for dynamic state, as Preact signals. Components
// read these directly and re-render automatically when they change — no manual
// "renderCard()" calls (the maintainability pain of the old client).

import { signal } from "@preact/signals";
import type { Account, BankDetails, BankItem, Character } from "../types/api";

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

/**
 * One global clock that ticks 4x/second. Cooldown countdowns read this so they
 * re-render without a timer per character. Purely local — never hits the API.
 */
export const now = signal<number>(Date.now());
setInterval(() => {
  now.value = Date.now();
}, 250);

let _logId = 0;
export function pushLog(entry: Omit<LogEntry, "id">): void {
  log.value = [{ ...entry, id: ++_logId }, ...log.value].slice(0, 200);
}

export function setCharacter(ch: Character): void {
  characters.value = { ...characters.value, [ch.name]: ch };
}

export function characterList(): Character[] {
  return Object.values(characters.value).sort((a, b) => a.name.localeCompare(b.name));
}
