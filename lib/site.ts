// Canonical site details for SEO metadata, sitemap, and structured data.
// Production sets NEXT_PUBLIC_SITE_URL=https://unex.live; locally it is localhost.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://unex.live"
).replace(/\/$/, "");
/**
 * Base for links players open (event share links). Local development runs
 * against the hosted database, so its events are real: point at the live
 * site instead of localhost.
 */
export const SHARE_URL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(
  SITE_URL,
)
  ? "https://unex.live"
  : SITE_URL;
export const SITE_NAME = "UNEX";
export const SITE_TITLE = "UNEX — Pickleball Open Play, Matchmaking & Rankings";
export const SITE_DESCRIPTION =
  "UNEX runs pickleball open play for clubs: player check-in, live court queues, fair matchmaking, confirmed results, and all-time player rankings.";
