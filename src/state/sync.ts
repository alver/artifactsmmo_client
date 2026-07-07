// Boot + reconcile. The whole rate-limit strategy lives here:
//   boot() → paint instantly from localStorage, load catalogs from bundled files,
//            then do exactly ONE authoritative sync of the per-account state.
// After that, nothing polls — state stays current from action responses
// (state/apply.ts). The user can force another sync with reconcile().

import {
  account,
  achievements,
  achievementsError,
  achievementsLoading,
  activeEvents,
  authed,
  bankDetails,
  bankItems,
  catalogReady,
  characters,
  lastError,
  pendingRewards,
  selectedCharacter,
  syncedAt,
  syncing,
} from "./store";
import { loadPersisted, saveState } from "./persist";
import { resumeQueue } from "./queue";
import { api, getAllPages, hasToken } from "../api/client";
import { loadCatalog } from "../catalog";
import type { Account, AccountAchievement, ActiveEvent, BankDetails, BankItem, Character, PendingItem } from "../types/api";

export async function boot(): Promise<void> {
  loadPersisted(); // instant paint from last session
  // Select a character right away so the workspace paints before the sync lands.
  if (!selectedCharacter.value) selectedCharacter.value = Object.keys(characters.value)[0] ?? null;
  authed.value = hasToken();
  await loadCatalog(); // static data into memory (bundled files, no API budget)
  catalogReady.value = true;
  if (authed.value) {
    await reconcile(); // one authoritative sync before runners act on character state
    resumeQueue(); // re-launch queues saved from a previous session
  }
}

/** One authoritative read of the per-account state. Safe to call on demand. */
export async function reconcile(): Promise<void> {
  if (!hasToken()) return;
  syncing.value = true;
  lastError.value = null;
  try {
    const [chars, bank, items, events, pending] = await Promise.all([
      api<Character[]>("/my/characters"),
      api<BankDetails>("/my/bank").catch(() => null),
      getAllPages<BankItem>("/my/bank/items").catch(() => [] as BankItem[]),
      // Time-limited map events: fetched only here (no polling — expiry is
      // handled locally by the clock in store.ts).
      getAllPages<ActiveEvent>("/events/active").catch(() => activeEvents.value),
      // Unclaimed rewards (achievement payouts) — drives the 🎁 topbar badge.
      getAllPages<PendingItem>("/my/pending_items").catch(() => pendingRewards.value),
    ]);
    characters.value = Object.fromEntries(chars.map((c) => [c.name, c]));
    activeEvents.value = events;
    pendingRewards.value = pending.filter((p) => !p.claimed_at);
    // The workspace always shows the selected character — default to the first.
    if (!selectedCharacter.value || !characters.value[selectedCharacter.value]) {
      selectedCharacter.value = chars[0]?.name ?? null;
    }
    if (bank) bankDetails.value = bank;
    bankItems.value = items;
    await syncAccount(chars[0]?.account);
    syncedAt.value = Date.now();
    saveState();
  } catch (e) {
    lastError.value = (e as Error).message;
  } finally {
    syncing.value = false;
  }
}

async function syncAccount(accountName?: string): Promise<void> {
  if (!accountName) return;
  try {
    account.value = await api<Account>(`/accounts/${accountName}`);
  } catch {
    // Account endpoint is optional / version-dependent — degrade gracefully and
    // simply show no account panel rather than failing the whole sync.
  }
}

/**
 * Fetch this account's achievement progress on demand (when the panel opens or
 * its Refresh is hit). A read, so never polled; deliberately not persisted. Keeps
 * any previously-loaded list visible while refreshing so reopening isn't jarring.
 */
export async function loadAchievements(): Promise<void> {
  const acct = Object.values(characters.value)[0]?.account;
  if (!acct) {
    achievementsError.value = "no account found — sync first";
    return;
  }
  achievementsLoading.value = true;
  achievementsError.value = null;
  try {
    achievements.value = await getAllPages<AccountAchievement>(`/accounts/${acct}/achievements`);
  } catch (e) {
    achievementsError.value = (e as Error).message;
  } finally {
    achievementsLoading.value = false;
  }
}

/**
 * Refresh the unclaimed-rewards pool on demand (the 🎁 panel's open/refresh).
 * A single small read — never polled; reconcile() also refreshes it.
 */
export async function loadPendingRewards(): Promise<void> {
  if (!hasToken()) return;
  try {
    pendingRewards.value = (await getAllPages<PendingItem>("/my/pending_items")).filter((p) => !p.claimed_at);
    saveState();
  } catch {
    /* keep the current list — a stale badge beats a failed refresh */
  }
}

/** Called by the token gate once a token has been entered. */
export async function login(): Promise<void> {
  authed.value = hasToken();
  if (authed.value) {
    await reconcile();
    resumeQueue();
  }
}
