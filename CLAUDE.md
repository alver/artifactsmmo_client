# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser-only client for [ArtifactsMMO](https://play.artifactsmmo.com/) (Vite + TypeScript + Preact, `@preact/signals` for state). It talks **directly** to the public game API (`https://api.artifactsmmo.com`) from the browser with a Bearer token — there is **no backend**. It deploys as static files to GitHub Pages.

## Commands

```bash
npm run dev        # Vite dev server with HMR
npm run build      # production build → dist/  (BASE_PATH env var sets Vite `base`)
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
npm run assets     # bash scripts/download-assets.sh — re-download public/assets/ icons+tiles
```

There is **no test runner** in this project. Use `npm run typecheck` as the correctness gate; CI runs it before every deploy. The app sits behind a token-entry gate, so behavior usually can't be verified headlessly — rely on typecheck + the production build (`npm run build`) succeeding.

On Windows/Git-Bash, do **not** set `BASE_PATH=/foo/` for a local build via the Bash tool — MSYS rewrites the leading-`/` value into a Windows path. Use PowerShell (`$env:BASE_PATH='/foo/'`) if you need to test a subpath build locally. CI (Linux) is unaffected.

## The core invariant: one sync, then no polling

This is the whole design and the thing most likely to be violated by accident. Read `src/state/sync.ts` and `src/state/apply.ts` together.

- At boot (`main.tsx` → `boot()` in `sync.ts`): paint instantly from `localStorage`, load static catalogs from `public/data/*.json` into memory, then do **exactly one** authoritative read of `/my/characters`, `/my/bank`, `/my/bank/items`, account.
- After that, **nothing polls.** Every action endpoint echoes the full authoritative `character` (and bank item moves echo `bank`), so `applyActionResult` (`src/state/apply.ts`) is the single chokepoint that folds responses into state — no GET-after-write. Re-sync only on the manual Refresh button (`reconcile()`).
- Budgets to respect: per-account **read** endpoints are the scarcest (~300/hr) — never add polling/GET loops. Actions are ~2000/hr; automation loops are paced by the cooldown each action returns, which keeps them well under.

`src/api/client.ts` is the only place that does `fetch`. It handles 429 (rate-limit) and 499 (still-on-cooldown) retries and pagination, and returns the unwrapped `data`. New API calls go through `api()` / typed wrappers in `src/api/actions.ts`, which route every response through `applyActionResult`.

## State

`src/state/store.ts` holds all dynamic state as `@preact/signals` (`characters`, `bankItems`, `bankDetails`, `selectedCharacter`, `panelTarget`, a 4 Hz `now` clock for cooldown countdowns, etc.). Components read signals directly and re-render automatically. `src/state/persist.ts` mirrors the durable signals to `localStorage` (key `ammo:v1:state`) so reload paints instantly.

## Automation runners (queue, campaign)

Exactly **two** per-character async runners execute everything, both driven entirely by action cooldowns (`setTimeout` chains) — **they run in the open browser tab; GitHub Pages does not run them.**

- **Queue** (`src/state/queue.ts` + item vocabulary in `src/plan/queue.ts`): a user-editable ordered list of actions. Fight/gather items with `times: 0` run **forever** (this is how "Beat a monster" grinds). Every item is skip-if-satisfied, so reloads resume mid-item; failure **pauses** the queue with the error on the head item. Key `ammo:v1:queue`.
- **Campaign** (`src/state/campaign.ts`): the phase machines behind the other two goals — `"task"` (one Tasks-Master task, one-shot: accept→prep→execute→deliver→turn-in) and `"train-craft"` (craft→recycle batches, re-picking the recipe each tick). Failure **stops** the campaign. Key `ammo:v1:campaign`.

They share the runner pattern (copy it for new cycles): a `signal<Record<name, Job>>`, a module-level `stopFlags` Set, `step()` = run one action then `waitCooldownFull` (`src/state/loopkit.ts`), and the **reload-resume** pattern — the job signal is hydrated from its own `localStorage` key at module load, an `effect()` writes it back on change, and `resume*()` (called from `boot()`/`login()` in `sync.ts` **after** the sync) re-launches. Hydrate before the persisting `effect` first runs or it overwrites the saved jobs. **Do not route runner persistence through `persist.ts`** (import cycle: `persist → queue → actions → apply → persist`) — each runner owns its key. Queue and campaign are **mutually exclusive per character**. Shared risky mechanics (bank-off, food-first healing, forecast gating, gear swaps) live once in `src/state/exec.ts`.

## The gear model: bank reset, bank-only sets

Gear is **never crafted or acquired for a character** — the bank is the single source of truth. Read `src/plan/jobgear.ts` (planner + stateless differ) with `gearSwapStep` in `src/state/exec.ts`.

- **Every job starts with a full bank reset**: go to the bank, deposit EVERYTHING (whole inventory, all pocket gold, every worn slot incl. utility potion stacks), then withdraw + equip the best set **available in the bank at that moment** (`jobGear`: fights via the bank-only BIS solver with `noUtilities`, gather/craft via prospecting/wisdom/tool argmax). Implemented as the `reset` mode of `nextGearAction`; the queue's `gear` item carries `reset: true`, the campaign persists a per-job `resetDone` flag.
- Mid-job bank trips (inventory full) deposit loot + gold but keep worn gear (`depositAll`/`bankOff`).
- **Per-iteration self-heal**: fight/gather rounds re-derive the desired set from the live bank signal (memoized per bank reference — free until a bank echo changes it) and swap when something better appears.
- The acquisition resolver (`src/plan/acquire.ts`) sources only **consumables, materials and task deliverables** — the three goals are "Beat a monster (∞, queue)", "Train a craft skill (campaign)", "Complete current task (campaign, one-shot)" (`src/plan/goal.ts`).

## UI layout

`app.tsx` gates on auth (`TokenGate`) then renders a full-height `.main-stage` flex row. **Character management is the main area** (`.workspace`, left, flexes): a horizontal `Roster` strip of `CharacterMini` cards on top (clicking selects + centers the map), then `CharacterPanel` — a multi-column `.ws-grid` dashboard of the selected character (control column with Planner + Queue first and widest, then equipment/combat, then skills/inventory; columns collapse at 1560/1150px). A character is always selected (`sync.ts` defaults to the first after boot/reconcile). **The map is a right sidebar** (`.side-stack`, 420px): `MapView` (canvas, still fully interactive — pan/zoom/tile-click, `MapInspector` inside its `.map-wrap`) above `ActivityLog`. `CatalogPanel`/`ItemsCatalogPanel` (open on clicking a workshop / NPC / **bank** tile — branches on `panelTarget.type`) render as a wide (~640px) non-modal overlay **drawer** over the sidebar (`.catalog-panel` is `position:absolute` in `.main-stage`); recipes/bank/NPC/items lists inside are responsive card grids; Escape closes the drawer.

## Static catalog

`public/data/*.json` is a committed snapshot of the game's static data (items, maps, monsters, resources, npcs, …). `src/catalog/` loads it once into typed `Map`s and exposes sync lookups (`item()`, `monster()`, `mapAt()`, `tileAt()`, `itemName()`, …) that safely return `undefined` before load. `public/assets/` (map tiles + icons, committed) is served locally; most `<img>`s fall back to the CDN via `assetFallback`, **but map tiles in `MapView` have no fallback** — they must ship in the build or the map renders blank.

## Deploy

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on push to `main`. `vite.config.ts` sets `base: process.env.BASE_PATH || "/"`; the workflow passes `BASE_PATH=/<repo-name>/` so the project-subpath build resolves (all asset URLs go through `import.meta.env.BASE_URL`). The deployed build ships **no token** — `.env` is gitignored and never set in CI; users paste their token into the in-browser gate, stored only in their own `localStorage`.
