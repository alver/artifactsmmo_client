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

  /** Seconds per cooldown-paced action. Measured from dev.log medians
   *  (2026-11-04): gather 31 s, fight 39 s, rest 23 s, move 22 s, craft 19 s —
   *  gathering dominates every plan. Every estimate is a floor. */
  SEC_PER_ACTION: 30,
  /** Multiplier on goals whose PLAN is partial (compile left blockers). */
  BLOCKED_DISCOUNT: 0.5,
} as const;

export const estMinutes = (actions: number): number => Math.round((actions * SCORE.SEC_PER_ACTION) / 60);

/** Hours an action count takes, floored at 15 minutes so trivial errands don't divide by ~0. */
export const hoursOf = (actions: number): number => Math.max(0.25, (actions * SCORE.SEC_PER_ACTION) / 3600);

export const perHour = (value: number, actions: number): number => value / hoursOf(actions);

/** Wall-clock actions for work the fleet splits across its participants: the
 *  ideal even split (a floor, like every estimate — one crafter's serial batch
 *  is longer, but the gathering that dominates really does run in parallel). */
export const wallActions = (participants: number, actions: number): number =>
  Math.ceil(actions / Math.max(1, participants));
