# ArtifactsMMO Client

A small web client for [ArtifactsMMO](https://play.artifactsmmo.com/) that talks
directly to the public game API from the browser. It syncs your account's durable
state **once** at load and then keeps it current from action responses — no
polling — so it stays well inside the API rate limits.

Built with **Vite + TypeScript + Preact** (signals for reactive state). Deploys as
static files; no backend.

> This is a from-scratch rewrite of an earlier single-file prototype (now kept on
> disk under `web/`, gitignored). Step 1 is a read-mostly dashboard plus a few
> manual actions; fleet automation is intentionally deferred.

## Run

```bash
npm install
npm run dev        # dev server with HMR
npm run build      # static production build → dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
```

Open the dev URL and paste your API token (from
[artifactsmmo.com](https://artifactsmmo.com/account)). It's stored only in your
browser's `localStorage`. For convenience during development you can instead put
`TOKEN=<your jwt>` in a `.env` file (see `.env.example`) — Vite exposes it to the
app and the token prompt is skipped. `.env` is gitignored.

## How it works

- **One sync, then no polling.** At boot the app paints instantly from
  `localStorage`, loads the static catalogs from `public/data/*.json` into memory,
  then does a single authoritative read of `/my/characters`, `/my/bank`,
  `/my/bank/items`, and account info. After that, every action response carries the
  full authoritative character (and bank item moves echo the bank), so local state
  is updated from responses alone — see `src/state/apply.ts`. Re-sync only happens
  when you click **Refresh**.
- **Rate-limit aware.** The per-account read endpoints are the scarcest budget
  (300/hr), so we minimize them. `src/api/client.ts` handles cooldown (error 499)
  and rate-limit (429) retries and pagination.

## Project structure

```
public/data/*.json   bundled snapshot of the game's static catalogs
src/
  api/        client (fetch + retry + pagination), typed action calls
  catalog/    load *.json into typed Maps; lookups (item, monster, mapAt, …)
  state/      signals store, localStorage persistence, the apply chokepoint, boot sync
  ui/         Preact components (CharacterCard, GearSlots, Bank, Account, Log, …)
  types/      api.ts (dynamic) + catalog.ts (static) domain models
```

## Refreshing the catalog snapshot

`public/data/*.json` is a snapshot of the game's static data (see
`data/manifest.json` for the server version and fetch time). It only needs
refreshing when the season/version changes. Each file mirrors a public,
unauthenticated endpoint (`/items`, `/maps`, `/monsters`, …) paged at `size=100`.
A refresh script is a planned follow-up.
