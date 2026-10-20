import type { GuessFeedback } from "./types.js";
import { centsSchema, MAX_GUESSES, MAX_GUESS_CENTS } from "./primitives.js";
import type { Cents } from "./primitives.js";
import type { RuleFunctions } from "./types.js";

export const evaluateGuess: RuleFunctions["evaluateGuess"] = (guessCents, targetCents) => {
  centsSchema.parse(guessCents);
  centsSchema.parse(targetCents);
  const error = Math.abs(guessCents - targetCents) * 100;
  if (error <= targetCents * 5) return { guessCents, band: "win", direction: "none" };
  return {
    guessCents,
    band: error <= targetCents * 25 ? "close" : "far",
    direction: guessCents < targetCents ? "higher" : "lower",
  };
};

export const winningRange: RuleFunctions["winningRange"] = (targetCents) => {
  centsSchema.parse(targetCents);
  return {
    minCents: Math.max(1, Math.ceil(targetCents * 95 / 100)),
    maxCents: Math.min(MAX_GUESS_CENTS, Math.floor(targetCents * 105 / 100)),
  };
};

export interface RoundEvaluation {
  guesses: GuessFeedback[];
  remainingGuesses: number;
  status: "playing" | "won" | "lost";
}

// Recompute signed histories with the same rules used for a new accepted guess.
export function evaluateRound(guesses: readonly Cents[], targetCents: Cents): RoundEvaluation {
  centsSchema.parse(targetCents);
  if (guesses.length > MAX_GUESSES || new Set(guesses).size !== guesses.length) {
    throw new RangeError("Invalid guess history");
  }
  const feedback = Array.from(guesses, (guess) => evaluateGuess(guess, targetCents));
  if (feedback.slice(0, -1).some((guess) => guess.band === "win")) {
    throw new RangeError("Guess history continues after a win");
  }
  return {
    guesses: feedback,
    remainingGuesses: MAX_GUESSES - guesses.length,
    status: feedback.at(-1)?.band === "win" ? "won" : guesses.length === MAX_GUESSES ? "lost" : "playing",
  };
}
