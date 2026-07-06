// Central tunables for "Who Drew That?".
// Change these to rebalance the game without touching UI/logic.

export const PLAYER_LIMITS = {
  /** Fewest players for a meaningful bluff (>=1 imposter + 2 crew). */
  MIN: 3,
  /** Soft cap to keep a lobby sane / turns from dragging forever. */
  SOFT_MAX: 20,
} as const;

// Bounds for host-configurable settings (used by the settings form + validation)
export const SETTING_BOUNDS = {
  imposterCount: { min: 1, max: 5, default: 1 },
  turnDurationSec: { min: 5, max: 30, default: 10 },
  drawingCycles: { min: 1, max: 4, default: 2 },
  rounds: { min: 1, max: 10, default: 5 },
  discussionSec: { min: 10, max: 90, default: 25 },
  votingSec: { min: 10, max: 60, default: 20 },
} as const;

// Scoring — individual accuracy (not winner-take-all).
export const SCORING = {
  /** A crew member who voted for a real imposter. */
  CREW_CORRECT_VOTE: 100,
  /** An imposter who was NOT the most-voted (survived the round). */
  IMPOSTER_SURVIVE: 150,
  /** Per crew member an imposter fooled (who voted someone else). */
  IMPOSTER_FOOL_BONUS: 25,
} as const;

// Fixed phase durations (seconds) not covered by host settings.
export const PHASE_SECONDS = {
  word: 6, // "here's your word" reveal before drawing
  reveal: 9, // imposter + scores reveal
  scoreboard: 6, // standings between rounds
} as const;

/** Max imposters allowed for a given real player count. */
export function maxImpostersFor(playerCount: number): number {
  return Math.max(1, Math.floor((playerCount - 1) / 2));
}
