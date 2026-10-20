// The share text of a finished game: pure functions with structural types (no contracts import), so this file is also published as part of the open-source
// rules package (scripts/oss/export.mjs). The clipboard and Web Share helpers stay in share.ts.

export interface ShareGuess { band: "win" | "close" | "far"; direction: "higher" | "lower" | "none" }
export interface ShareSession { status: "won" | "lost"; revision: number; puzzleId: number; gameDate: string; guesses: readonly ShareGuess[] }
export interface SharePayload { title: string; text: string }

const feedbackRows = (session: ShareSession) => session.guesses.map((guess) => guess.band === "win" ? "🟩" :
  `${guess.band === "close" ? "🟨" : "⬜"} ${guess.direction === "higher" ? "↑" : "↓"}`);

/** Unlimited: "Costcodle Unlimited 3/6", the same grid and a link to /unlimited. No puzzle number, date or price: the item stays a surprise for whoever follows the link. */
export function createUnlimitedSharePayload(session: ShareSession, siteUrl: string): SharePayload {
  const url = new URL("/unlimited", siteUrl);
  return { title: "Costcodle Unlimited",
    text: [`Costcodle Unlimited ${session.status === "won" ? session.revision : "X"}/6`, ...feedbackRows(session), url.href].join("\n") };
}

/** Daily: "Costcodle #1122 · 2026-10-15 UTC", the score, one row per guess (green win, yellow close, white far, with the arrow) and a link to the game. Never the price. */
export function createSharePayload(session: ShareSession, siteUrl: string): SharePayload {
  const url = new URL("/", siteUrl);
  const rows = feedbackRows(session);
  return { title: `Costcodle #${session.puzzleId}`,
    text: [`Costcodle #${session.puzzleId} · ${session.gameDate} UTC`,
      `${session.status === "won" ? session.revision : "X"}/6`, ...rows, url.href].join("\n") };
}
