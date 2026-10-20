import { MAX_GUESS_CENTS } from "./primitives.js";
import type { RuleFunctions } from "./types.js";

export const parseGuess: RuleFunctions["parseGuess"] = (input) => {
  if (typeof input !== "string") return { ok: false, reason: "invalid_amount" };
  const amount = input.trim();
  const parts = amount.length <= 9 ? /^([0-9]{1,6})(?:\.([0-9]{1,2}))?$/.exec(amount) : null;
  if (!parts) return { ok: false, reason: "invalid_amount" };
  const cents = Number(parts[1]) * 100 + Number((parts[2] ?? "").padEnd(2, "0"));
  return cents >= 1 && cents <= MAX_GUESS_CENTS
    ? { ok: true, cents }
    : { ok: false, reason: "invalid_amount" };
};
