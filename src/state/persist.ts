// Mirror dynamic state to localStorage so a page reload paints instantly from the
// last session. We reconcile with one authoritative API sync at boot afterward
// (see state/sync.ts), so this cache only needs to be a good-enough starting point.
//
// Static catalogs are NOT persisted here — they ship as files under public/data/
// and are loaded into memory each boot.

import { account, bankDetails, bankItems, characters, log, syncedAt } from "./store";
import type { LogEntry } from "./store";
import type { Account, BankDetails, BankItem, Character } from "../types/api";

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
    if (s.log) log.value = s.log;
    if (s.syncedAt) syncedAt.value = s.syncedAt;
  } catch {
    /* corrupt cache — start clean */
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced save; many rapid mutations collapse into one write. */
export function saveState(): void {
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
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* quota exceeded — non-fatal */
    }
  }, 300);
}
