// Mirror dynamic state to localStorage so a page reload paints instantly from the
// last session. We reconcile with one authoritative API sync at boot afterward
// (see state/sync.ts), so this cache only needs to be a good-enough starting point.
//
// Static catalogs are NOT persisted here — they ship as files under public/data/
// and are loaded into memory each boot.

import { account, activeEvents, bankDetails, bankItems, characters, log, offerings, pendingRewards, seedLogId, skillPins, syncedAt } from "./store";
import { IS_SERVER, expose, rpc } from "../lib/remote";
import type { CachedOfferings, LogEntry } from "./store";
import type { Account, ActiveEvent, BankDetails, BankItem, Character, PendingItem } from "../types/api";

const KEY = "ammo:v1:state";
const SCHEMA = 1;

interface PersistShape {
  schema: number;
  characters: Record<string, Character>;
  bankItems: BankItem[];
  bankDetails: BankDetails | null;
  account: Account | null;
  log: LogEntry[];
  syncedAt: number | null;
  craftPins?: Record<string, string>; // legacy single craft pin — read once to migrate
  pins?: Record<string, string[]>; // additive — main-skill pins (📌1/📌2)
  events?: ActiveEvent[]; // additive — active map events (expired ones dropped at load)
  pending?: PendingItem[]; // additive — unclaimed rewards (🎁 badge)
  offerings?: Record<string, CachedOfferings>; // additive — today's seasonal offerings (past days dropped at load)
}

export function loadPersisted(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const s = JSON.parse(raw) as PersistShape;
    if (s.schema !== SCHEMA) return; // ignore state from an incompatible version
    if (s.characters) characters.value = s.characters;
    if (s.bankItems) bankItems.value = s.bankItems;
    if (s.bankDetails) bankDetails.value = s.bankDetails;
    if (s.account) account.value = s.account;
    if (s.log) {
      log.value = s.log;
      // New ids must start past the restored ones — they're used as render keys.
      seedLogId(s.log.reduce((m, e) => Math.max(m, e.id || 0), 0));
    }
    if (s.syncedAt) syncedAt.value = s.syncedAt;
    if (s.pins) skillPins.value = s.pins;
    else if (s.craftPins) skillPins.value = Object.fromEntries(Object.entries(s.craftPins).map(([n, k]) => [n, [k]]));
    if (s.events) activeEvents.value = s.events.filter((e) => Date.parse(e.expiration) > Date.now());
    if (s.pending) pendingRewards.value = s.pending;
    if (s.offerings) offerings.value = Object.fromEntries(Object.entries(s.offerings).filter(([, o]) => Date.parse(o.expires_at) > Date.now()));
  } catch {
    /* corrupt cache — start clean */
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced save; many rapid mutations collapse into one write. */
export function saveState(): void {
  if (!IS_SERVER) return rpc("saveState", []);
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const s: PersistShape = {
      schema: SCHEMA,
      characters: characters.value,
      bankItems: bankItems.value,
      bankDetails: bankDetails.value,
      account: account.value,
      log: log.value,
      syncedAt: syncedAt.value,
      pins: skillPins.value,
      events: activeEvents.value,
      pending: pendingRewards.value,
      offerings: offerings.value,
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* quota exceeded — non-fatal */
    }
  }, 300);
}

expose({ saveState });
