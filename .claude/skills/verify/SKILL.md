---
name: verify
description: Drive the real app end-to-end — the local game service (src/server/main.ts) plus headless Chrome over its UI; seed and observe through /rpc and the /events state stream, on a throwaway service port so the user's live queues stay untouched.
---

# Verify: drive the live app headlessly

Since 2026-11-05 the engine runs in the LOCAL SERVICE (src/server/main.ts), not
the tab — the browser is a view over an SSE state stream + POST /rpc (see
CLAUDE.md "The local service"). typecheck+build alone can't observe behavior;
this recipe drives the REAL service against the REAL game API.

## Setup (once per session)

1. Token: `.env` at repo root, line `TOKEN=...` (gitignored — never commit/echo).
   The service reads it; the browser never needs it (no token-gate bypass).
2. Service: the user's own `npm start` / `npm run dev` on :5173 is LIVE — it
   runs their queues. For experiments that must not touch those, start a
   throwaway service on a spare port with its own storage (no queues → no
   actions; one boot sync ≈ 5 reads):
   `PORT=5199 node --import tsx --experimental-webstorage --localstorage-file=<scratch>/test.db --disable-warning=ExperimentalWarning src/server/main.ts`
   (prod mode serves dist/ — run `npm run build` first; add `--dev` for Vite).
   Never point a test at :5173 unless the user asked to drive their real queues.
3. Browser: system Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`
   (forward slashes from Git-Bash) driven by `puppeteer-core` (install it in a
   scratch dir, NOT the project — keep package.json clean). Chrome's own
   `--headless --dump-dom/--screenshot` hangs on the open SSE stream; use puppeteer.

## The handle

- Boot is done when `.fleet-name` appears (Fleet tab) — the tab waits for the
  service's first snapshot + the catalog before rendering anything.
- Tabs are hash routes — switch with `location.hash = "#/items"` (no reload,
  no extra reads): fleet · char · bank · items · monsters · achievements · map · sim.
- Drive the engine without the UI: `curl -X POST -H 'Content-Type: application/json'
  -d '{"fn":"addItem","args":["Third",{…item with id…}]}' http://localhost:5199/rpc`
  — any exposed function (grep `expose(`) by name. Seed queues this way on a
  test service (keep `running:false` unless you mean to run them).
- `confirm()` dialogs (queue clear-all): `page.on("dialog", d => d.accept())`.

## Observe through the service's state stream (authoritative, no DOM scraping)

- `curl -s -N --max-time 2 http://localhost:5199/events` — the first `data:`
  line is a JSON snapshot of every SYNCED signal: `queues[name]` (items,
  running, live `note`, per-item `done`/`error`), `characters[name]`, `log`
  (activity entries, newest first), `hive`, `skillPins`, `bankItems`, …;
  later lines carry only the signals that changed.
- Post-mortem: `logs/dev.log` (every API call, note change, rpc failure; a
  per-process tag per service start).
- Actions are cooldown-paced (3–25s each). A full bank reset ≈ 5–8 actions ≈
  1–2 min; budget generous timeouts.

## Useful selectors

- Fleet table: `.fleet-name` links (click = select + open Character tab); Character
  tab header `.char-name`, switcher `.char-switch button`. Tables: `.dt-row`, sortable
  headers `.dt-sort`.
- Planner: selects are `.cp-refine-select` (find the right one by which option
  values it contains, then set value + dispatch `change`); buttons
  `button.btn-refine` by text ("📋 Plan", "▶ Run").
- Queue: rows `.q-row .q-text`, head controls `.q-head .btn-stop` /
  `.cat-btn` ("＋ Add") / `.cat-btn.sell` (clear-all ✕); add form `.q-add-form`.
- Skills: `.cp-skill` rows, each with a Pin/📌N `button`; pinned rows `.cp-skill-focus`.

## Flows worth driving

- Beat-monster vs `chicken` (cheap, safe): expect queue
  `[gear(reset), fight times:0]`, log sequence deposit → deposit gold →
  unequip → stow → (withdraw/equip if needed) → fights "fighting N" (no
  `/total`). After reset: gold 0, utility slots "", inventory 0.
- Restart mid-anything (kill the service; the supervisor restarts it): queues must resume (running persisted).
- Naked-guard: hand-add gear+reset vs a top-level monster → queue pauses with
  "no winnable gear set…" and gear stays worn.

## Gotchas

- Pick an idle character (stalest `cooldown_expiration` via one
  `GET /my/characters` with the token) — the user's own open tab may be
  driving others; races are handled (499 retry) but muddy the evidence.
- LIVE SIDE EFFECTS: the reset really banks the character's gold+inventory and
  re-gears it; fights really run. Use a level-1 monster and tell the user what
  moved. Read budget ~300/hr — each boot costs 3 reads; don't loop reloads.
- One boot-time 404 console error (missing asset) is pre-existing noise.

BROWSER-ERA scripts (pre-2026-11-05 — they seed/read the tab's localStorage,
which no longer holds engine state; port them to /events + /rpc before reuse):
`drive.mjs` next to this file. Run it from a scratch dir that has puppeteer-core installed:
`$env:AMMO_TOKEN = (token from .env); node <path>\drive.mjs` — it needs the
dev server up and writes screenshots + drive-summary.json beside itself.

A read-only planning probe (2026-11-04): `hive-probe.mjs` next to this file —
same boot, then in-page `import("/src/plan/hive/index.ts")` to dump
proposals, compiled waves and synthetic craft orders against live state.
No queue writes; ~4 reads per run. Output: `hive-probe-out.json` beside it.
