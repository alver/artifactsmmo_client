---
name: verify
description: Drive the real app end-to-end in headless Chrome with the API token from .env — bypass the token gate, run goals/queues on a live character, observe via the app's own localStorage state.
---

# Verify: drive the live app headlessly

The app is token-gated and browser-only; typecheck+build alone can't observe
behavior. This recipe drives the REAL app against the REAL game API.

## Setup (once per session)

1. Token: `.env` at repo root, line `TOKEN=...` (gitignored — never commit/echo).
2. Dev server: `npm run dev` in the background → http://localhost:5173/.
3. Browser: system Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`
   driven by `puppeteer-core` (install it in a scratch dir, NOT the project —
   keep package.json clean).

## The handle

- Bypass the token gate before app JS runs:
  `page.evaluateOnNewDocument(t => localStorage.setItem("ammo:v1:token", t), TOKEN)`.
- Boot is done when `.pcard-name` appears (+ ~1.5s for the sync echo).
- `confirm()` dialogs (queue clear-all): `page.on("dialog", d => d.accept())`.

## Observe through the app's own persisted state (authoritative, no DOM scraping)

- `localStorage["ammo:v1:queue"][name]` — items, running flag, live `note`,
  per-item `done`/`error`.
- `localStorage["ammo:v1:state"]` — `.characters[name]` (gold, `*_slot`,
  inventory) and `.log` (the activity log entries, sorted by `id`).
- `localStorage["ammo:v1:campaign"][name]` — campaign job/phase/note.
- Poll every ~1.5s; actions are cooldown-paced (3–25s each). A full bank reset
  ≈ 5–8 actions ≈ 1–2 min; budget generous timeouts.

## Useful selectors

- Roster card: `.pcard` (contains `.pcard-name`); selected panel: `.cp-name`.
- Planner: selects are `.cp-refine-select` (find the right one by which option
  values it contains, then set value + dispatch `change`); buttons
  `button.btn-refine` by text ("📋 Plan", "▶ Run").
- Queue: rows `.q-row .q-text`, head controls `.q-head .btn-stop` /
  `.cat-btn` ("＋ Add") / `.cat-btn.sell` (clear-all ✕); add form `.q-add-form`.
- Skills: `.cp-skill-pinnable` rows (click to pin), focus row `.cp-skill-focus`.

## Flows worth driving

- Beat-monster vs `chicken` (cheap, safe): expect queue
  `[gear(reset), fight times:0]`, log sequence deposit → deposit gold →
  unequip → stow → (withdraw/equip if needed) → fights "fighting N" (no
  `/total`). After reset: gold 0, utility slots "", inventory 0.
- Reload mid-anything: queue/campaign must resume (running persisted).
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

A working driver (selectors + polling + probes, 2026-07-06): `drive.mjs` next
to this file. Run it from a scratch dir that has puppeteer-core installed:
`$env:AMMO_TOKEN = (token from .env); node <path>\drive.mjs` — it needs the
dev server up and writes screenshots + drive-summary.json beside itself.
