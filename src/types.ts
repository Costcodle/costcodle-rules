import type { Cents, GameMode, PuzzleId, UtcDate, UtcInstant } from "./primitives.js";

/** Feedback on one guess: a win (within 5%), or close (within 25%) / far, with the direction of the price. */
export type GuessFeedback =
  | { guessCents: Cents; band: "win"; direction: "none" }
  | { guessCents: Cents; band: "close" | "far"; direction: "higher" | "lower" };

/** The pure functions of the rules (the daily schedule and the price checks). */
export interface RuleFunctions {
  parseGuess(input: string): { ok: true; cents: Cents } | { ok: false; reason: "invalid_amount" };
  evaluateGuess(guessCents: Cents, targetCents: Cents): GuessFeedback;
  winningRange(targetCents: Cents): { minCents: Cents; maxCents: Cents };
  puzzleIdAt(now: UtcInstant): PuzzleId;
  gameDateForPuzzle(id: PuzzleId): UtcDate;
  nextRolloverAt(now: UtcInstant): UtcInstant;
}

/** How a game mode behaves: the daily puzzle rolls over at UTC midnight and keeps a streak, unlimited does neither. */
export interface ModePolicy {
  readonly mode: GameMode;
  readonly statisticsNamespace: GameMode;
  readonly supportsStreak: boolean;
  readonly rollover: "utc-midnight" | "none";
  puzzleLabel(puzzle: { id: PuzzleId }): string;
}

/** An unlimited round may be continued for 24 hours after it starts. */
export const UNLIMITED_TOKEN_TTL_SECONDS = 86_400;
