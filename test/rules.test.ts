import { describe, expect, it } from "vitest";
import { MAX_GUESS_CENTS } from "../src/primitives.js";
import { evaluateGuess, evaluateRound, winningRange } from "../src/rules.js";

describe("integer percentage rules", () => {
  it.each([
    [599, 570, "win", "none"], [599, 628, "win", "none"], [599, 599, "win", "none"],
    [599, 569, "close", "higher"], [599, 629, "close", "lower"],
    [599, 450, "close", "higher"], [599, 748, "close", "lower"],
    [599, 449, "far", "higher"], [599, 749, "far", "lower"],
    [2000, 1900, "win", "none"], [2000, 2100, "win", "none"],
    [2000, 1500, "close", "higher"], [2000, 2500, "close", "lower"],
    [2000, 1499, "far", "higher"], [2000, 2501, "far", "lower"],
  ])("target %i, guess %i => %s/%s", (target, guess, band, direction) => {
    expect(evaluateGuess(guess, target)).toEqual({ guessCents: guess, band, direction });
  });

  it("clips the mathematical winning range to legal inputs", () => {
    expect(winningRange(599)).toEqual({ minCents: 570, maxCents: 628 });
    expect(winningRange(1)).toEqual({ minCents: 1, maxCents: 1 });
    expect(winningRange(MAX_GUESS_CENTS)).toEqual({ minCents: 95_000_000, maxCents: MAX_GUESS_CENTS });
  });

  it("agrees with exact rational arithmetic across small and maximum prices", () => {
    for (const target of [...Array.from({ length: 2000 }, (_, i) => i + 1), MAX_GUESS_CENTS]) {
      const range = winningRange(target);
      for (const guess of new Set([1, target, range.minCents - 1, range.minCents, range.maxCents, range.maxCents + 1, MAX_GUESS_CENTS])) {
        if (guess < 1 || guess > MAX_GUESS_CENTS) continue;
        const difference = BigInt(Math.abs(guess - target)) * 100n;
        const band = difference <= BigInt(target) * 5n ? "win" : difference <= BigInt(target) * 25n ? "close" : "far";
        expect(evaluateGuess(guess, target).band).toBe(band);
        expect(guess >= range.minCents && guess <= range.maxCents).toBe(band === "win");
      }
    }
  });

  it.each([0, -1, 1.5, NaN, Infinity, MAX_GUESS_CENTS + 1, Number.MAX_SAFE_INTEGER])("rejects invalid cents %s", (value) => {
    expect(() => evaluateGuess(value, 599)).toThrow();
    expect(() => evaluateGuess(599, value)).toThrow();
    expect(() => winningRange(value)).toThrow();
  });
});

describe("mode-independent round evaluation", () => {
  it("checks victory before exhausting the sixth guess", () => {
    expect(evaluateRound([100, 200, 300, 400, 500, 570], 599)).toMatchObject({ status: "won", remainingGuesses: 0 });
    expect(evaluateRound([100, 200, 300, 400, 500, 569], 599)).toMatchObject({ status: "lost", remainingGuesses: 0 });
  });

  it("handles an empty or partially played round", () => {
    expect(evaluateRound([], 599)).toEqual({ guesses: [], status: "playing", remainingGuesses: 6 });
    expect(evaluateRound([100], 599)).toMatchObject({ status: "playing", remainingGuesses: 5 });
    expect(evaluateRound([599], 599)).toMatchObject({ status: "won", remainingGuesses: 5 });
  });

  it("rejects duplicate, invalid, overlong and post-win histories without mutation", () => {
    for (const guesses of [[100, 100], [100, 0], [100, 200, 300, 400, 500, 550, 560], [570, 600], [100, 570, 600], Array<number>(1)]) {
      const before = [...guesses];
      expect(() => evaluateRound(guesses, 599)).toThrow();
      expect(guesses).toEqual(before);
    }
  });
});
