import { describe, expect, it } from "vitest";
import { canContinueDaily, createSharePayload, evaluateGuess, evaluateRound, gameDateForPuzzle, isUnlimitedEligible, nextRolloverAt, parseGuess, puzzleIdAt,
  winningRange } from "../src/index.js";

// Pins every value shown in README.md.
describe("README examples", () => {
  it("quick start", () => {
    expect(parseGuess("19.50")).toEqual({ ok: true, cents: 1950 });
    expect(parseGuess("12.345")).toEqual({ ok: false, reason: "invalid_amount" });
    expect(evaluateGuess(1950, 2000)).toEqual({ guessCents: 1950, band: "win", direction: "none" });
    expect(evaluateGuess(1600, 2000)).toEqual({ guessCents: 1600, band: "close", direction: "higher" });
    expect(evaluateGuess(1000, 2000)).toEqual({ guessCents: 1000, band: "far", direction: "higher" });
    expect(winningRange(2000)).toEqual({ minCents: 1900, maxCents: 2100 });
    expect(evaluateRound([1000, 1600, 1950], 2000).status).toBe("won");
  });
  it("daily schedule", () => {
    expect(puzzleIdAt("2026-10-15T12:00:00.000Z")).toBe(1122);
    expect(gameDateForPuzzle(1122)).toBe("2026-10-15");
    expect(nextRolloverAt("2026-10-15T12:00:00.000Z")).toBe("2026-10-16T00:00:00.000Z");
    expect(canContinueDaily("2026-10-15", "2026-10-16T00:09:59.000Z")).toBe(true);
    expect(canContinueDaily("2026-10-15", "2026-10-16T00:10:00.000Z")).toBe(false);
  });
  it("unlimited pool", () => {
    expect(isUnlimitedEligible(1121, "2026-10-16T00:05:00.000Z")).toBe(true);
    expect(isUnlimitedEligible(1122, "2026-10-16T00:05:00.000Z")).toBe(false);
    expect(isUnlimitedEligible(1122, "2026-10-16T00:10:00.000Z")).toBe(true);
  });
  it("share text", () => {
    expect(createSharePayload({ status: "won", revision: 3, puzzleId: 1122, gameDate: "2026-10-15", guesses: [
      { band: "far", direction: "higher" }, { band: "close", direction: "higher" }, { band: "win", direction: "none" },
    ] }, "https://costcodle.org").text).toBe(["Costcodle #1122 · 2026-10-15 UTC", "3/6", "⬜ ↑", "🟨 ↑", "🟩", "https://costcodle.org/"].join("\n"));
  });
});
