import type { ModePolicy } from "./types.js";
import { utcInstantSchema, type PuzzleId, type UtcInstant } from "./primitives.js";
import { UNLIMITED_TOKEN_TTL_SECONDS } from "./types.js";
import { canContinueDaily, gameDateForPuzzle, puzzleIdAt } from "./daily.js";

/**
 * The unlimited pool is "puzzles that are over": the game date is before today's UTC date AND the daily grace window
 * (DAILY_GRACE_SECONDS after the day closed) has passed too. Today's puzzle, any future puzzle and yesterday's puzzle
 * while someone may still be finishing it (00:00 <= now < 00:10 UTC) are never in it. This is the one definition; the
 * service, the token check and the tests all go through these two functions.
 */
export function isUnlimitedEligible(puzzleId: PuzzleId, now: UtcInstant): boolean {
  const gameDate = gameDateForPuzzle(puzzleId);
  return gameDate < utcInstantSchema.parse(now).slice(0, 10) && !canContinueDaily(gameDate, now);
}

/** The newest puzzle id the pool may contain at `now` (ids grow by one per UTC day; the pool is every id up to it). */
export function newestUnlimitedPuzzleId(now: UtcInstant): PuzzleId {
  const yesterday = puzzleIdAt(now) - 1;
  // Yesterday is out only during its grace window. The day before it closed at 00:10 yesterday, so it is always past it.
  return isUnlimitedEligible(yesterday, now) ? yesterday : yesterday - 1;
}

export function unlimitedExpiresAt(startedAt: UtcInstant): UtcInstant {
  return utcInstantSchema.parse(new Date(Date.parse(utcInstantSchema.parse(startedAt)) + UNLIMITED_TOKEN_TTL_SECONDS * 1000).toISOString());
}

/** Unlimited has no daily rollover, no streak and no schedule; the label never shows the puzzle number before the round ends. */
export const UNLIMITED_MODE_POLICY: Readonly<ModePolicy> = Object.freeze({
  mode: "unlimited",
  statisticsNamespace: "unlimited",
  supportsStreak: false,
  rollover: "none",
  puzzleLabel: () => "Costcodle Unlimited",
} satisfies ModePolicy);
