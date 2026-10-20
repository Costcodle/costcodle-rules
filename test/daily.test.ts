import { describe, expect, it } from "vitest";
import { DAILY_MODE_POLICY, canContinueDaily, canStartDaily, dailyClosesAt, gameDateForPuzzle, nextRolloverAt, puzzleIdAt } from "../src/daily.js";

describe("fixed UTC anchor", () => {
  it.each([
    ["2026-10-14T23:59:59.999Z", 1121], ["2026-10-15T00:00:00.000Z", 1122],
    ["2026-10-15T23:59:59.999Z", 1122], ["2026-10-16T00:00:00.000Z", 1123],
    ["2028-02-29T12:00:00.000Z", 1624],
  ])("maps %s to #%i", (now, id) => expect(puzzleIdAt(now)).toBe(id));

  it("roundtrips every puzzle ID without timezone or DST drift", () => {
    for (let id = 1; id <= 3399; id++) {
      expect(puzzleIdAt(`${gameDateForPuzzle(id)}T00:00:00.000Z`)).toBe(id);
      expect(puzzleIdAt(`${gameDateForPuzzle(id)}T23:59:59.999Z`)).toBe(id);
    }
    expect(gameDateForPuzzle(1122)).toBe("2026-10-15");
    expect(gameDateForPuzzle(3399)).toBe("2033-01-08");
    expect(puzzleIdAt(`${gameDateForPuzzle(1)}T00:00:00.000Z`) - 1).toBe(0);
    expect(gameDateForPuzzle(3400)).toBe("2033-01-09");
  });

  it("returns the next midnight even when called exactly at midnight", () => {
    expect(nextRolloverAt("2026-10-15T00:00:00.000Z")).toBe("2026-10-16T00:00:00.000Z");
    expect(nextRolloverAt("2026-10-15T23:59:59.999Z")).toBe("2026-10-16T00:00:00.000Z");
    expect(nextRolloverAt("2028-02-28T18:00:00.000Z")).toBe("2028-02-29T00:00:00.000Z");
  });

  it.each(["2026-02-30T00:00:00.000Z", "2026-10-15", "2026-10-15T00:00:00Z", "2026-10-15T08:00:00.000+08:00", "not a date"])("rejects noncanonical instant %j", (input) => {
    expect(() => puzzleIdAt(input)).toThrow();
    expect(() => nextRolloverAt(input)).toThrow();
  });

  it.each([0, -1, 1.2, Infinity, Number.MAX_SAFE_INTEGER])("rejects invalid puzzle ID %s", (id) => {
    expect(() => gameDateForPuzzle(id)).toThrow();
  });
});

describe("daily lifecycle policy", () => {
  it("uses a strict 00:10 cutoff and never permits starting yesterday", () => {
    expect(dailyClosesAt("2026-10-15")).toBe("2026-10-16T00:10:00.000Z");
    for (const now of ["2026-10-15T00:00:00.000Z", "2026-10-15T23:59:59.999Z"]) {
      expect(canStartDaily("2026-10-15", now)).toBe(true);
      expect(canContinueDaily("2026-10-15", now)).toBe(true);
    }
    for (const now of ["2026-10-16T00:00:00.000Z", "2026-10-16T00:09:59.999Z"]) {
      expect(canStartDaily("2026-10-15", now)).toBe(false);
      expect(canContinueDaily("2026-10-15", now)).toBe(true);
    }
    for (const now of ["2026-10-14T23:59:59.999Z", "2026-10-16T00:10:00.000Z", "2026-10-17T00:00:00.000Z"]) {
      expect(canStartDaily("2026-10-15", now)).toBe(false);
      expect(canContinueDaily("2026-10-15", now)).toBe(false);
    }
    expect(() => dailyClosesAt("2026-02-30")).toThrow();
  });

  it("keeps daily statistics and rollover in a reusable UI policy", () => {
    expect(DAILY_MODE_POLICY).toMatchObject({ mode: "daily", statisticsNamespace: "daily", supportsStreak: true, rollover: "utc-midnight" });
    expect(DAILY_MODE_POLICY.puzzleLabel({ id: 1122 } as Parameters<typeof DAILY_MODE_POLICY.puzzleLabel>[0])).toBe("Costcodle #1122");
    expect(Object.isFrozen(DAILY_MODE_POLICY)).toBe(true);
  });
});
