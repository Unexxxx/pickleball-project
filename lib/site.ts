// Canonical site details for SEO metadata, sitemap, and structured data.
// Production sets NEXT_PUBLIC_SITE_URL=https://unex.live; locally it is localhost.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://unex.live"
).replace(/\/$/, "");
export const SITE_NAME = "UNEX";
export const SITE_TITLE = "UNEX — Pickleball Open Play, Matchmaking & Rankings";
export const SITE_DESCRIPTION =
  "UNEX runs pickleball open play for clubs: player check-in, live court queues, fair matchmaking, confirmed results, and all-time player rankings.";
