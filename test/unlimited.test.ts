import { describe, expect, it } from "vitest";
import { DAILY_GRACE_SECONDS } from "../src/primitives.js";
import { UNLIMITED_TOKEN_TTL_SECONDS } from "../src/types.js";
import { canContinueDaily, gameDateForPuzzle, puzzleIdAt, UTC_DAY_MS } from "../src/daily.js";
import { isUnlimitedEligible, newestUnlimitedPuzzleId, unlimitedExpiresAt, UNLIMITED_MODE_POLICY } from "../src/unlimited.js";

// #1122 is 2026-10-15. Eligible means: its day is before today's UTC date AND the 10 minute grace window is over.
describe("unlimited pool boundary", () => {
  it("never contains today's puzzle or any later one, at any instant of the day", () => {
    for (const now of ["2026-10-15T00:00:00.000Z", "2026-10-15T00:10:00.000Z", "2026-10-15T12:00:00.000Z", "2026-10-15T23:59:59.999Z"]) {
      for (const id of [1122, 1123, 1124, 1200, 3399]) expect([now, id, isUnlimitedEligible(id, now)]).toEqual([now, id, false]);
    }
  });

  it("keeps yesterday out through the grace window: 00:00, 00:09:59.999 are out, 00:10:00.000 is in", () => {
    // On 2026-10-16 yesterday is #1122.
    const yesterdayOut = ["2026-10-16T00:00:00.000Z", "2026-10-16T00:00:00.001Z", "2026-10-16T00:05:00.000Z", "2026-10-16T00:09:59.999Z"];
    for (const now of yesterdayOut) {
      expect([now, isUnlimitedEligible(1122, now), newestUnlimitedPuzzleId(now)]).toEqual([now, false, 1121]);
    }
    for (const now of ["2026-10-16T00:10:00.000Z", "2026-10-16T00:10:00.001Z", "2026-10-16T12:00:00.000Z", "2026-10-16T23:59:59.999Z"]) {
      expect([now, isUnlimitedEligible(1122, now), newestUnlimitedPuzzleId(now)]).toEqual([now, true, 1122]);
    }
  });

  it("agrees with the daily rule: an eligible puzzle can no longer be continued, and the day before yesterday always is eligible", () => {
    for (const now of ["2026-10-16T00:00:00.000Z", "2026-10-16T00:09:59.999Z", "2026-10-16T00:10:00.000Z", "2026-10-16T18:30:00.000Z"]) {
      expect(canContinueDaily("2026-10-15", now)).toBe(!isUnlimitedEligible(1122, now));
      expect(isUnlimitedEligible(1121, now)).toBe(true);
    }
  });

  it("moves exactly at 00:10 UTC across a day change, one puzzle per day", () => {
    const sweep = (start: string, minutes: number, step: number) => Array.from({ length: Math.floor(minutes / step) + 1 },
      (_, i) => new Date(Date.parse(start) + i * step * 60_000).toISOString());
    let previous = 0;
    for (const now of sweep("2026-10-15T23:00:00.000Z", 3 * 24 * 60, 1)) {
      const newest = newestUnlimitedPuzzleId(now);
      expect(newest).toBeGreaterThanOrEqual(previous); // the pool only grows with time
      previous = newest;
      // Definition cross-check, minute by minute: the newest id is eligible, the next one never is.
      expect([now, isUnlimitedEligible(newest, now), isUnlimitedEligible(newest + 1, now)]).toEqual([now, true, false]);
      // And it is exactly the id whose day closed (plus the grace window) no later than now.
      const closedAt = Date.parse(`${gameDateForPuzzle(newest)}T00:00:00.000Z`) + UTC_DAY_MS + DAILY_GRACE_SECONDS * 1000;
      expect(closedAt).toBeLessThanOrEqual(Date.parse(now));
      expect(puzzleIdAt(now) - newest).toBeGreaterThanOrEqual(1);
    }
    // The step happens at 00:10:00.000 and nowhere else.
    expect(newestUnlimitedPuzzleId("2026-10-16T00:09:59.999Z")).toBe(1121);
    expect(newestUnlimitedPuzzleId("2026-10-16T00:10:00.000Z")).toBe(1122);
    expect(newestUnlimitedPuzzleId("2026-10-17T00:09:59.999Z")).toBe(1122);
    expect(newestUnlimitedPuzzleId("2026-10-17T00:10:00.000Z")).toBe(1123);
  });

  it("is date-driven across month and year ends", () => {
    expect(gameDateForPuzzle(newestUnlimitedPuzzleId("2027-01-01T00:10:00.000Z"))).toBe("2026-12-31");
    expect(gameDateForPuzzle(newestUnlimitedPuzzleId("2027-01-01T00:09:59.999Z"))).toBe("2026-12-30");
    expect(gameDateForPuzzle(newestUnlimitedPuzzleId("2028-03-01T00:10:00.000Z"))).toBe("2028-02-29"); // leap day
  });

  it("rejects instants that are not canonical UTC", () => {
    expect(() => isUnlimitedEligible(1121, "2026-10-16T00:10:00Z")).toThrow();
    expect(() => isUnlimitedEligible(1121, "2026-10-16T08:10:00.000+08:00")).toThrow();
  });
});

describe("unlimited token lifetime and mode policy", () => {
  it("lasts exactly 24 hours from the start and ignores the daily rollover", () => {
    expect(UNLIMITED_TOKEN_TTL_SECONDS).toBe(86_400);
    expect(unlimitedExpiresAt("2026-10-16T12:00:00.000Z")).toBe("2026-10-17T12:00:00.000Z");
    expect(unlimitedExpiresAt("2026-10-16T23:59:59.999Z")).toBe("2026-10-17T23:59:59.999Z");
    expect(unlimitedExpiresAt("2026-12-31T20:00:00.123Z")).toBe("2027-01-01T20:00:00.123Z");
  });

  it("is a rollover-free, streak-free mode whose label never carries the puzzle number", () => {
    expect(UNLIMITED_MODE_POLICY).toMatchObject({ mode: "unlimited", statisticsNamespace: "unlimited", supportsStreak: false, rollover: "none" });
    const puzzle = { id: 1121, gameDate: "2026-10-14", name: "x", packageLabel: null, currency: "USD" as const, image: null };
    expect(UNLIMITED_MODE_POLICY.puzzleLabel(puzzle)).toBe("Costcodle Unlimited");
    expect(UNLIMITED_MODE_POLICY.puzzleLabel(puzzle)).not.toMatch(/\d/);
  });
});
