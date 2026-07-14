# ArtifactsMMO — Game Actions Reference

Every in-game action is a `POST /my/{name}/action/{action}` call (source of truth: the game's
[OpenAPI spec](https://api.artifactsmmo.com/openapi.json)). This document lists **all 32 of them**,
grouped by category, with request bodies, requirements, and whether this client implements them
(`src/api/actions.ts`).

## How actions work

- **One action at a time per character.** A second call while one is in flight gets `486`.
- **Every action returns a cooldown** (`data.cooldown`) that must elapse before the character's
  next action; calling early gets `499` (the client's `api()` waits and retries).
- **Every action echoes the full authoritative `character`** (bank ops also echo `bank`), which is
  why this app never polls — `applyActionResult` folds the echo into state.
- **Most actions are location-bound**: the character must be standing on the matching tile
  (bank, workshop, NPC, Tasks Master, Grand Exchange, monster, resource). Wrong tile → `598`.
- Budget: ~2000 action requests/hour per account.

---

## Movement

| Action | Body | Client wrapper |
|---|---|---|
| `move` | `{ x, y }` or `{ map_id }` | `move` |
| `transition` | — | `transition` |

`move` walks the character to a map tile; cooldown scales with distance. Fails with `490` if
already there, `496` if the tile has an unmet access condition (e.g. an achievement gate — the
client rethrows this with the requirement spelled out), `595` if no path exists, `596` if blocked.

`transition` enters/exits an interior or another map layer; only valid on a tile whose
`interactions.transition` is set. Can require items (`478`) or gold (`492`).

## Combat & recovery

| Action | Body | Client wrapper |
|---|---|---|
| `fight` | `{ participants?: string[] }` | `fight` (no participants support) |
| `rest` | — | `rest` |

`fight` attacks the monster on the current tile; the response includes the full fight log and
drops. `participants` lets up to 3 of your characters join — **boss monsters only** (`486` otherwise).
A full inventory blocks the fight (`497`).

`rest` heals 5 HP per second of cooldown, minimum 3 seconds. Free — no items consumed.

## Skills (gathering & crafting)

| Action | Body | Client wrapper |
|---|---|---|
| `gathering` | — | `gather` |
| `crafting` | `{ code, quantity? }` | `craft` |
| `recycling` | `{ code, quantity?, enhanced? }` | `recycle` |

`gathering` harvests the resource on the current tile; gated by the matching skill level (`493`).
`crafting` requires standing in the right workshop with the recipe's materials in inventory
(`478` if missing) and sufficient skill (`493`). `recycling` (workshops too) breaks equipment and
weapons back into some of their materials — only equippable items (`473` otherwise); it can also
cost gold (`492`).

## Inventory & equipment

| Action | Body | Client wrapper |
|---|---|---|
| `equip` | `[{ code, slot, quantity? }]` | `equip`, `equipMany` |
| `unequip` | `[{ slot, quantity? }]` | `unequip`, `unequipMany` |
| `use` | `{ code, quantity }` | `use` |
| `delete` | `{ code, quantity }` | `deleteItem` |

`equip`/`unequip` are **batch** endpoints: one request swaps many slots, cooldown 3 s × distinct
items. Notable rules: max 100 utilities per utility slot (`484`), artifact slots must hold
*distinct* items (`485`), and unequipping food/HP gear that would drop you to 0 HP fails (`483`).

`use` consumes a consumable (food, potion, teleport scroll…); `476` if the item isn't consumable.
`delete` destroys items permanently.

## Bank

All require standing on a bank tile.

| Action | Body | Client wrapper |
|---|---|---|
| `bank/deposit/item` | `[{ code, quantity }]` | `depositItems` |
| `bank/withdraw/item` | `[{ code, quantity }]` | `withdrawItems` |
| `bank/deposit/gold` | `{ quantity }` | `depositGold` |
| `bank/withdraw/gold` | `{ quantity }` | `withdrawGold` |
| `bank/buy_expansion` | — | `buyExpansion` |

Item deposit/withdraw are batch: cooldown 3 s × distinct items. The bank is account-wide and can
fill up (`462`); `buy_expansion` adds 20 slots for gold (price rises each purchase; it does not
echo bank details, so the client reconciles after it). `461` means another of your characters has
a bank transaction in flight — momentary, the client's `api()` waits and retries it. A withdraw
of stock another character just took fails with `404` (whole stack gone) or `478` (not enough
left); the runner treats both as "bank changed — replan", never as a queue-pausing error.

## NPC trading

| Action | Body | Client wrapper |
|---|---|---|
| `npc/buy` | `{ code, quantity }` | `npcBuy` |
| `npc/sell` | `{ code, quantity }` | `npcSell` |

On the NPC's tile. NPCs each have a fixed catalog (`/npcs/items`); some trade in currency items
rather than gold. Not everything is purchasable (`441`) or sellable (`442`).

## Grand Exchange — *not implemented in this client*

Player-to-player market; all actions require standing on the Grand Exchange tile.

| Action | Body | What it does |
|---|---|---|
| `grandexchange/buy` | `{ id, quantity }` | Buy from an existing sell order by order id. |
| `grandexchange/create_sell_order` | `{ code, quantity, price }` | List items for sale. |
| `grandexchange/create_buy_order` | `{ code, quantity, price }` | Post a buy order; gold (price × qty) is locked up front; filled items arrive via **pending items**. |
| `grandexchange/fill` | `{ id, quantity }` | Sell into someone's buy order; gold is immediate, the buyer gets the items as pending items. |
| `grandexchange/cancel` | `{ id }` | Cancel own order; items return to inventory / gold refunds. |

Limits: max 100 open orders (`433`), no trading with yourself (`435`), some items are untradeable
(`437`). Read-only order books and 7-day histories live under `GET /grandexchange/*` and
`GET /my/grandexchange/*`.

## Tasks

All require the Tasks Master tile **matching the task type** (monsters vs items).

| Action | Body | Client wrapper |
|---|---|---|
| `task/new` | — | `taskNew` |
| `task/trade` | `{ code, quantity }` | `taskTrade` |
| `task/complete` | — | `taskComplete` |
| `task/cancel` | — | `taskCancel` |
| `task/exchange` | — | `taskExchange` |

`task/new` assigns a random task (`489` if one is already active). Item tasks are handed in
incrementally with `task/trade` (`475` when full). `task/complete` pays out rewards including
**task coins**; `task/cancel` costs 1 task coin; `task/exchange` converts 6 task coins into a
random exclusive reward.

## Account & social

| Action | Body | Client wrapper |
|---|---|---|
| `give/gold` | `{ quantity, character }` | — *(removed 2026-07-14 — the bank is the inter-character channel)* |
| `give/item` | `{ items: [{code, quantity}], character }` | — *(removed 2026-07-14)* |
| `claim_item/{id}` | — | `claimItem` |
| `change_skin` | `{ skin }` | — *(not implemented)* |

`give/*` transfers between **your own** characters standing on the same tile (both sides are
echoed — the giver as `data.character`, the recipient as `data.receiver_character`, which
`applyActionResult` still folds). The client dropped its wrappers + UI in favor of bank
deposits/withdrawals. `claim_item` collects a pending item (achievement payouts, filled
GE buy orders, event rewards — listed by `GET /my/pending_items`) into this character's inventory.
`change_skin` applies an owned cosmetic skin.

---

## Common error codes

| Code | Meaning |
|---|---|
| 404 | Item not found (e.g. bank withdraw of a stack another character emptied) |
| 422 | Invalid payload |
| 461 | Another of your characters has a bank transaction in flight (client auto-retries) |
| 478 | Missing required item(s) |
| 486 | Action already in progress for this character |
| 490 | Already at destination |
| 492 | Not enough gold |
| 493 | Skill level too low |
| 496 | Access conditions not met |
| 497 | Inventory full |
| 498 | Character not found |
| 499 | Still on cooldown (client auto-retries) |
| 598 | Required tile (bank/workshop/NPC/monster/…) not on this map |

## Client coverage summary

Implemented (24 of 32): all movement, combat, skill, inventory, bank, NPC, task and claim
actions. **Not implemented (8):** the five Grand Exchange actions, `change_skin`, and the two
`give/*` transfers (wrappers + UI removed — inter-character exchange goes via the bank). Partially
implemented: `fight` lacks the `participants` option (multi-character boss fights). The queue's
item vocabulary
(move / fight / gather / craft / withdraw / gear / task items — see `src/plan/queue.ts`) composes
exclusively out of the implemented set.
