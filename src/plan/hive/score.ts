// The hive's value model — every tunable in one table. Scores are "account
// value per estimated hour" so a 10-minute errand with modest value can
// outrank an 8-hour grind, and goal kinds stay comparable.

export const SCORE = {
  /** Gear value per character: a loss→win flip, a win→safe flip, margin gain. */
  WIN_FLIP: 100,
  SAFE_FLIP: 40,
  /** × the expected-HP-margin gain (0..1) for already-winnable fights. */
  MARGIN: 30,

  /** Achievement value per point, and gold's exchange rate into value. */
  ACH_POINT: 25,
  GOLD: 0.005,

  /** Task farming: per coin, and per task while the Tasks Farmer gate is shut. */
  TASK_COIN: 5,
  GATE_PROGRESS: 3,
  /** Rough coin-equivalent of the turn-in bonus roll (task_rewards.json EV). */
  TASK_BONUS_COINS: 1,

  /** Cooldown-paced wall-clock guess; every estimate is a floor. */
  SEC_PER_ACTION: 5,
  /** Multiplier on goals that can't fully compile yet. */
  BLOCKED_DISCOUNT: 0.5,
} as const;

export const estMinutes = (actions: number): number => Math.round((actions * SCORE.SEC_PER_ACTION) / 60);

/** Value-per-hour with a 15-minute floor so trivial errands don't divide by ~0. */
export const perHour = (value: number, actions: number): number =>
  value / Math.max(0.25, (actions * SCORE.SEC_PER_ACTION) / 3600);
