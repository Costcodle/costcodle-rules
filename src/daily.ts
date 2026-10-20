import type { ModePolicy } from "./types.js";
import { DAILY_GRACE_SECONDS, puzzleIdSchema, utcDateSchema, utcInstantSchema } from "./primitives.js";
import type { UtcDate, UtcInstant } from "./primitives.js";
import type { RuleFunctions } from "./types.js";

export const UTC_DAY_MS = 86_400_000;
export const DAILY_ANCHOR = Object.freeze({ instant: "2026-10-15T00:00:00.000Z", puzzleId: 1122 });
const anchorTime = Date.parse(DAILY_ANCHOR.instant);

function instantTime(now: UtcInstant): number {
  return Date.parse(utcInstantSchema.parse(now));
}

export const puzzleIdAt: RuleFunctions["puzzleIdAt"] = (now) =>
  DAILY_ANCHOR.puzzleId + Math.floor((instantTime(now) - anchorTime) / UTC_DAY_MS);

export const gameDateForPuzzle: RuleFunctions["gameDateForPuzzle"] = (id) => {
  puzzleIdSchema.parse(id);
  const time = anchorTime + (id - DAILY_ANCHOR.puzzleId) * UTC_DAY_MS;
  if (!Number.isSafeInteger(time) || Math.abs(time) > 8_640_000_000_000_000) {
    throw new RangeError("Puzzle date is out of range");
  }
  return utcDateSchema.parse(new Date(time).toISOString().slice(0, 10));
};

export const nextRolloverAt: RuleFunctions["nextRolloverAt"] = (now) => {
  const time = instantTime(now);
  return utcInstantSchema.parse(new Date((Math.floor(time / UTC_DAY_MS) + 1) * UTC_DAY_MS).toISOString());
};

export function dailyClosesAt(gameDate: UtcDate): UtcInstant {
  const start = Date.parse(`${utcDateSchema.parse(gameDate)}T00:00:00.000Z`);
  return utcInstantSchema.parse(new Date(start + UTC_DAY_MS + DAILY_GRACE_SECONDS * 1000).toISOString());
}

export function canStartDaily(gameDate: UtcDate, now: UtcInstant): boolean {
  return utcDateSchema.parse(gameDate) === utcInstantSchema.parse(now).slice(0, 10);
}

export function canContinueDaily(gameDate: UtcDate, now: UtcInstant): boolean {
  const start = Date.parse(`${utcDateSchema.parse(gameDate)}T00:00:00.000Z`);
  const time = instantTime(now);
  return time >= start && time < Date.parse(dailyClosesAt(gameDate));
}

export const DAILY_MODE_POLICY: Readonly<ModePolicy> = Object.freeze({
  mode: "daily",
  statisticsNamespace: "daily",
  supportsStreak: true,
  rollover: "utc-midnight",
  puzzleLabel: (puzzle) => `Costcodle #${puzzle.id}`,
} satisfies ModePolicy);
