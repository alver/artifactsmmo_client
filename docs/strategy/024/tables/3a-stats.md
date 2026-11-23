#### (3a) The API's stats against this fleet's arithmetic, 40 characters in a fight set (2026-11-23T1222Z): every stat that does not agree

| stat | characters that differ | API − model: min / median / max | examples (API vs model) |
|---|---|---|---|
| initiative | 40 of 40 | 100 / 100 / 100 | frtCombat 380 vs 280; frtFish 810 vs 710; frtCraft 330 vs 230 |

The model: 115 + 5·L HP and 0 for every other stat (the atlas's hypothetical character, scripts/atlas/combat.mts:10-19), plus every worn code's effects (src/sim/stats.ts:85-90 applyGear). "gate" = src/sim/stats.ts:102-112 currentFighter (exec.ts:440, :573), which copies the API's totals but initiative: currentStats leaves it 0 (src/sim/stats.ts:49-65), the worn items' initiative is added (:109); the solve's base drops it too (:74-76). Every stat not listed agrees on every character. Combat effects (the API's `effects` against the worn codes' but the utility potions', both without the gathering and crafting cuts): equal on every character.

