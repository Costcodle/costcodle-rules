import { integer, refine, text } from "./validation.js";

export const CONTRACT_VERSION = "1.0.0";
export const WIRE_VERSION = 1;
export const RULES_VERSION = "classic-v1";
export const STORAGE_VERSION = 1;
export const MAX_GUESSES = 6;
export const MAX_GUESS_CENTS = 99_999_999;
export const DAILY_GRACE_SECONDS = 600;
export const ARCHIVE_PAGE_SIZE = 30;

export type GameMode = "daily" | "unlimited";
export type UtcDate = string;
export type UtcInstant = string;
export type PuzzleId = number;
export type Cents = number;

export const puzzleIdSchema = integer(1);
export const centsSchema = integer(1, MAX_GUESS_CENTS);
export const requestIdSchema = text(1, 64, /^[A-Za-z0-9_-]+$/);
export const opaqueIdSchema = text(16, 128, /^[A-Za-z0-9_-]+$/);
export const versionSchema = text(1, 80, /^[a-zA-Z0-9_-]+$/);
export const utcDateSchema = refine(text(10, 10, /^\d{4}-\d{2}-\d{2}$/), (value) => {
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}, "invalid Gregorian UTC date");
export const utcInstantSchema = refine(
  text(24, 24, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
  (value) => Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value,
  "invalid canonical UTC instant",
);
