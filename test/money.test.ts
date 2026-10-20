import { describe, expect, it } from "vitest";
import { parseGuess } from "../src/money.js";

describe("USD decimal parsing", () => {
  it.each([
    ["5", 500], ["5.9", 590], ["005.99", 599], ["0.01", 1],
    ["999999.99", 99_999_999], ["000000.01", 1], ["  5.99\n", 599], ["1.01", 101],
  ])("accepts %j as %i integer cents", (input, cents) => {
    expect(parseGuess(input)).toEqual({ ok: true, cents });
  });

  it.each([
    "", " ", "0", "0.00", "000000.00", "-1", "+1", "1e2", "1,000", "$5.99",
    ".99", "5.", "5.999", "1000000", "1000000.00", "0000000.01", "1 2", "NaN",
    "Infinity", "５.９９", "5\n.99", "0x10", "5_00", "1.2.3",
  ])("rejects %j without rounding or reinterpretation", (input) => {
    expect(parseGuess(input)).toEqual({ ok: false, reason: "invalid_amount" });
  });

  it("normalizes equal amounts for duplicate detection", () => {
    expect(parseGuess("005.9")).toEqual(parseGuess("5.90"));
    expect(parseGuess(undefined as unknown as string).ok).toBe(false);
  });
});
