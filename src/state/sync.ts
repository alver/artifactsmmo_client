// Boot + reconcile. The whole rate-limit strategy lives here:
//   boot() → paint instantly from localStorage, load catalogs from bundled files,
//            then do exactly ONE authoritative sync of the per-account state.
// After that, nothing polls the account — state stays current from action
// responses (state/apply.ts). The user can force another sync with reconcile().
// The one standing read is the map-event poll (refreshEvents): a public DATA
// endpoint, not the scarce account bucket.

import { IS_SERVER, expose, rpc } from "../lib/remote";
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
  pushLog,
  selectedCharacter,
  syncedAt,
  syncing,
} from "./store";
import { loadPersisted, saveState } from "./persist";
import { resumeHive } from "./hive";
import { resumeQueue } from "./queue";
import { resumePlanner } from "./planner";
import { eventKey } from "./events";
import { eventPollMs, reactToEvents } from "./eventorders";
import { api, getAllPages, hasToken, setToken } from "../api/client";
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
    resumePlanner({ loadAchievements, loadPendingRewards }); // the planner's characters: re-attach, take over, or decide after its first read
    resumeHive(); // re-attach the hive AFTER the queues are back (it observes them)
    watchEvents(); // events already up get their orders; then poll for new ones
  }
}

/**
 * Map events can't be seen in action echoes and spawn ~daily for 60–90 min, so
 * they get the one standing poll: GET /events/active every 5 min — task 013:
 * every 2 min while the planner's characters have event-gated demand open
 * (eventorders.ts eventPollMs). It is a DATA endpoint (2,000/h per IP) — 12 or
 * 30 calls an hour never touch the 300/h account bucket. (The realtime
 * websocket that pushes event_spawn is members-only.)
 */
let eventsTimer: ReturnType<typeof setTimeout> | undefined;

function watchEvents(): void {
  clearTimeout(eventsTimer);
  reactToEvents();
  eventsTimer = setTimeout(() => void refreshEvents(), eventPollMs());
}

async function refreshEvents(): Promise<void> {
  try {
    setEvents(await getAllPages<ActiveEvent>("/events/active"));
    saveState();
  } catch {
    /* keep the current list — the next poll retries */
  }
  watchEvents();
}

/** Replace the active-event list, logging each spawn not seen before. */
function setEvents(fresh: ActiveEvent[]): void {
  const known = new Set(activeEvents.value.map(eventKey));
  for (const e of fresh) {
    if (known.has(eventKey(e))) continue;
    const until = new Date(e.expiration).toISOString().slice(11, 16);
    pushLog({ ts: Date.now(), character: "event", action: "event", text: `⚡ ${e.name} at (${e.map.x}, ${e.map.y}) until ${until} UTC`, kind: "info" });
  }
  activeEvents.value = fresh;
}

/** One authoritative read of the per-account state. Safe to call on demand. */
export async function reconcile(): Promise<void> {
  if (!IS_SERVER) return rpc("reconcile", []);
  if (!hasToken()) return;
  syncing.value = true;
  lastError.value = null;
  try {
    const [chars, bank, items, events, pending] = await Promise.all([
      api<Character[]>("/my/characters"),
      api<BankDetails>("/my/bank").catch(() => null),
      getAllPages<BankItem>("/my/bank/items").catch(() => [] as BankItem[]),
      // Time-limited map events (also polled by refreshEvents; expiry is
      // handled locally by the clock in store.ts).
      getAllPages<ActiveEvent>("/events/active").catch(() => activeEvents.value),
      // Unclaimed rewards (achievement payouts) — drives the 🎁 topbar badge.
      getAllPages<PendingItem>("/my/pending_items").catch(() => pendingRewards.value),
    ]);
    characters.value = Object.fromEntries(chars.map((c) => [c.name, c]));
    setEvents(events);
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
    reactToEvents(); // a manual Refresh that reveals an event acts on it now
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
  if (!IS_SERVER) return rpc("loadAchievements", []);
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
  if (!IS_SERVER) return rpc("loadPendingRewards", []);
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
  if (!IS_SERVER) return rpc("login", []);
  authed.value = hasToken();
  if (authed.value) {
    await reconcile();
    resumeQueue();
    resumePlanner({ loadAchievements, loadPendingRewards });
    resumeHive();
    watchEvents();
  }
}

/** Sign out: forget the server's token (runners then fail their next call and pause). */
export function logout(): void {
  if (!IS_SERVER) return rpc("logout", []);
  setToken("");
  authed.value = false;
}

expose({ reconcile, loadAchievements, loadPendingRewards, login, logout });
