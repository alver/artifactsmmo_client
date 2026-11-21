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
  -d '{"fn":"setPlannerConfig","args":[{"on":{"Third":true}}]}' http://localhost:5199/rpc`
  — any exposed function (grep `expose(`) by name. Since task 018 nothing the tab
  can call writes a queue: a queue is the planner's (switch a character on) or the
  Group fight's `queuePrepare`.
- `confirm()` dialogs (the 🧭 planner switch): `page.on("dialog", d => d.accept())`.

## Zero-call mode: the mock-API preload

`mock-api.mjs` (next to this file) patches `fetch` for api.artifactsmmo.com:
every GET is served from a saved `/events` snapshot (characters, bank, bank
items; events/pending empty; achievements from an optional `mockAchievements`
array) and every POST (an action) is refused with a 400. The real service then
boots with ZERO game calls — ideal for UI checks. Capture a snapshot with
`curl -s -N --max-time 3 http://127.0.0.1:5173/events` (first `data:` line),
then:
`PORT=5199 MOCK_SNAPSHOT=<snap.json> node --import file:///<abs>/mock-api.mjs --import tsx --experimental-webstorage --localstorage-file=<scratch>/test.db --disable-warning=ExperimentalWarning src/server/main.ts`.
A started queue pauses on its first action ("mock API: actions refused").

## Observe through the service's state stream (authoritative, no DOM scraping)

- `curl -s -N --max-time 2 http://localhost:5199/events` — the first `data:`
  line is a JSON snapshot of every SYNCED signal: `queues[name]` (items,
  running, live `note`, per-item `done`/`error`), `characters[name]`, `log`
  (activity entries, newest first), `planner`, `bankItems`, …;
  later lines carry only the signals that changed.
- Post-mortem: the raw log, `logs/raw/<YYYY-MM-DD>/<HH>.log` by each line's UTC
  hour (every API call, note change, rpc failure; a per-process tag per service
  start) — a service on another port writes under `logs/port-<N>/raw/`;
  `logs/dev.log` is the archive to 2026-11-21.
- Actions are cooldown-paced (3–25s each). A full bank reset ≈ 5–8 actions ≈
  1–2 min; budget generous timeouts.

## Useful selectors

- Fleet table: `.fleet-name` links (click = select + open Character tab); Character
  tab header `.char-name`, switcher `.char-switch button`. Tables: `.dt-row`, sortable
  headers `.dt-sort`.
- Selects are `.cp-refine-select` (find the right one by which option values it
  contains, then set value + dispatch `change`).
- Queue (read-only since task 018): rows `.q-row .q-text`; the 🧭 planner switch is
  the `.q-head .cat-btn`.
- Skills: `.cp-skill` rows.

## Flows worth driving

- Switch one character on (🧭, or the `setPlannerConfig` rpc): expect its queue
  to get the first step's items (`pl:<key>:<i>`: a gear reset, then the field item
  or the craft) and the Character tab's planner line to show the step's why.
- Restart mid-anything (kill the service; the supervisor restarts it): queues must resume (running persisted)
  and the step re-attach (`plan <name>: re-attached …` in the raw log).

## Gotchas

- Pick an idle character (stalest `cooldown_expiration` via one
  `GET /my/characters` with the token) — the user's own open tab may be
  driving others; races are handled (499 retry) but muddy the evidence.
- LIVE SIDE EFFECTS: the reset really banks the character's gold+inventory and
  re-gears it; fights really run. Use a level-1 monster and tell the user what
  moved. Read budget ~300/hr — each boot costs 3 reads; don't loop reloads.
- One boot-time 404 console error (missing asset) is pre-existing noise.
