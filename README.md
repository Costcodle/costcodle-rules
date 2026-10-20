# costcodle-rules

The game rules behind [Costcodle](https://costcodle.org), the daily Costco price guessing game: a small, dependency-free TypeScript library for judging guesses, reading a typed price, scheduling one puzzle per UTC day and writing the spoiler-free share text. Play at [costcodle.org](https://costcodle.org), or the endless practice mode at [costcodle.org/unlimited](https://costcodle.org/unlimited).

- Pure functions, no I/O, no runtime dependencies. Every amount is an integer number of cents.
- The same code runs the live game: it is exported from the site's repository, never edited here by hand.
- This package contains the rules only. It has no puzzles, prices or product images.

## Install

```sh
npm install costcodle-rules
```

## The rules

| Rule | Value |
|---|---|
| Guesses per puzzle | 6 |
| Win | the guess is within **5%** of the price (edges included) |
| Close | within **25%**, with an arrow: go higher or go lower |
| Far | further than 25%, still with the arrow |
| Accepted input | a dollar amount from $0.01 to $999,999.99, at most two decimals |
| New puzzle | every day at 00:00 UTC; a game started that day may be finished until 00:10 UTC |

## Quick start

```ts
import { evaluateGuess, evaluateRound, parseGuess, winningRange } from "costcodle-rules";

const price = 2000; // a $20.00 item, in cents

parseGuess("19.50");          // { ok: true, cents: 1950 }
parseGuess("12.345");         // { ok: false, reason: "invalid_amount" }

evaluateGuess(1950, price);   // { guessCents: 1950, band: "win", direction: "none" }
evaluateGuess(1600, price);   // { guessCents: 1600, band: "close", direction: "higher" }
evaluateGuess(1000, price);   // { guessCents: 1000, band: "far", direction: "higher" }
winningRange(price);          // { minCents: 1900, maxCents: 2100 }

evaluateRound([1000, 1600, 1950], price).status; // "won"
```

### The daily schedule

Puzzle numbers advance by one every UTC day. A game may be finished during a 10 minute grace window after midnight.

```ts
import { canContinueDaily, gameDateForPuzzle, nextRolloverAt, puzzleIdAt } from "costcodle-rules";

puzzleIdAt("2026-10-15T12:00:00.000Z");                         // 1122
gameDateForPuzzle(1122);                                        // "2026-10-15"
nextRolloverAt("2026-10-15T12:00:00.000Z");                     // "2026-10-16T00:00:00.000Z"
canContinueDaily("2026-10-15", "2026-10-16T00:09:59.000Z");     // true
canContinueDaily("2026-10-15", "2026-10-16T00:10:00.000Z");     // false
```

### Unlimited practice

[Costcodle Unlimited](https://costcodle.org/unlimited) deals only puzzles that are over: never today's, never a future one, and never yesterday's while it can still be finished.

```ts
import { isUnlimitedEligible } from "costcodle-rules";

isUnlimitedEligible(1121, "2026-10-16T00:05:00.000Z"); // true  (two days ago)
isUnlimitedEligible(1122, "2026-10-16T00:05:00.000Z"); // false (yesterday, still in its grace window)
isUnlimitedEligible(1122, "2026-10-16T00:10:00.000Z"); // true
```

### Share text

The result grid never contains the price: green for the win, yellow for close, white for far, each with its arrow.

```ts
import { createSharePayload } from "costcodle-rules";

createSharePayload({ status: "won", revision: 3, puzzleId: 1122, gameDate: "2026-10-15", guesses: [
  { band: "far", direction: "higher" }, { band: "close", direction: "higher" }, { band: "win", direction: "none" },
] }, "https://costcodle.org").text;
// Costcodle #1122 · 2026-10-15 UTC
// 3/6
// ⬜ ↑
// 🟨 ↑
// 🟩
// https://costcodle.org/
```

Every value in this README is checked by `test/readme-examples.test.ts`, so the examples cannot drift from the code.

## Development

```sh
npm install
npm test        # vitest
npm run build   # dist/ (ESM + type declarations)
```

## License

MIT. Costcodle is an independent fan game. Not affiliated with, endorsed by, or sponsored by Costco Wholesale Corporation; Costco is a trademark of its owner.
