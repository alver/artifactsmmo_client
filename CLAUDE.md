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

## Automation loops (gather, refine)

`src/state/gather.ts` and `src/state/refine.ts` are per-character async loops driven entirely by action cooldowns (`setTimeout` chains) — **they run in the open browser tab; GitHub Pages does not run them.** They follow a shared pattern; copy it for new cycles:

- A `signal<Record<name, Job>>` whose presence means "running"; a module-level `stopFlags` Set; `step()` = run one action then `waitCooldownFull`.
- **Reload-safe** (`reload-resume` pattern): the job signal is hydrated from its own `localStorage` key (`ammo:v1:gather`, `ammo:v1:refine`) at module load, an `effect()` writes it back on change, and `resume*()` (called from `boot()`/`login()` in `sync.ts` **after** the sync) re-launches loops. Hydrate before the persisting `effect` first runs or it overwrites the saved jobs with the empty initial value. Make loops idempotent on restart so they self-heal from any interruption point.
- **Do not route loop persistence through `persist.ts`** — that creates an import cycle (`persist → gather → actions → apply → persist`). Each loop owns its key.
- Gather and refine are **mutually exclusive per character** (a character runs at most one loop).

## UI layout

`app.tsx` gates on auth (`TokenGate`) then renders a full-height `.map-stage` flex row: **left** = `CharacterPanel` (full detail of the selected character; opens on selection), **middle** = `MapView` (canvas map; renders the floating `CharacterMini` cards overlay and `MapInspector` inside its `.map-wrap`), **right** = `CatalogPanel` (opens on clicking a workshop / NPC / **bank** tile — branches on `panelTarget.type`). Both side panels can be open at once.

`CharacterCard.tsx`, `Account.tsx`, and `Log.tsx` are **leftovers from the earlier grid dashboard and are not mounted** by `app.tsx` — don't assume they're live.

## Static catalog

`public/data/*.json` is a committed snapshot of the game's static data (items, maps, monsters, resources, npcs, …). `src/catalog/` loads it once into typed `Map`s and exposes sync lookups (`item()`, `monster()`, `mapAt()`, `tileAt()`, `itemName()`, …) that safely return `undefined` before load. `public/assets/` (map tiles + icons, committed) is served locally; most `<img>`s fall back to the CDN via `assetFallback`, **but map tiles in `MapView` have no fallback** — they must ship in the build or the map renders blank.

## Deploy

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on push to `main`. `vite.config.ts` sets `base: process.env.BASE_PATH || "/"`; the workflow passes `BASE_PATH=/<repo-name>/` so the project-subpath build resolves (all asset URLs go through `import.meta.env.BASE_URL`). The deployed build ships **no token** — `.env` is gitignored and never set in CI; users paste their token into the in-browser gate, stored only in their own `localStorage`.
