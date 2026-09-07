# Current Features

Updated September 8, 2026.

## September 8 update notes

- Improved registration validation, automatic public slugs, clearer signup errors, expired verification-link recovery, and verification-email resend for unconfirmed logins.
- Added a login prompt for public event participant lists and corrected organizer attendance visibility. Organizer check-in now records the club identity attestation required for ranked play.
- Added event match-count badges, including the active match on playing-now cards, current rating values, and the standby court-assignment action in the post-match popup.
- Added event completion controls with protection against ending an event while matches remain active.
- Introduced persisted Standby/Upcoming reservations and matchmaking v3: broader candidate selection, teammate/opponent rotation, rating/rank/win-rate balance, waiting fairness, and stable lineups when new players arrive. See [matchmaking details](matchmaking-v3.md).
- Introduced versioned team-based Bayesian ratings with per-player uncertainty, authoritative score revisions, replay snapshots, and rating ledgers. Authorized club score submission finalizes results; participant submissions retain confirmation requirements. Applied the model to the specified 55-match test event. Score margins are retained but do not affect v1 ratings. See [rating model](team-bayes-v1.md).
- Leaderboards display whole-number ratings without rounding stored rating precision.
- Redesigned public profile recent matches with Ranked/Unranked filters, separate Doubles/Singles groups, scores, results, teammates, opponents, and pagination. Private player identities remain hidden.
- Added database migrations, regression tests, and scripts for enrollment, matchup analysis, rotation simulation, and rating previews.

Validation: lint, TypeScript checks, all 82 unit/integration tests, and all 185 local database assertions passed. Mobile and desktop profile layouts were checked. The full end-to-end browser suite was not rerun for this commit.

## Player experience

- Verified email/password and Google authentication with profile provisioning.
- One persistent player identity across clubs, including editable name and profile photo.
- Public player profiles with rating, rank, wins, losses, win rate, streaks, and match history.
- Public event discovery, shareable event links, registration, waitlists, and participant lists.
- Player check-in and live queue status with realtime updates.
- Public club profiles with club media and active events prioritized over past events.

## Club and event operations

- Club creation with automatically generated unique slugs and tenant-isolated membership roles.
- Club profile photos, background images, member management, and role-based permissions.
- Public or private events with passcodes/invitations, draft and published states, cancellation, and rescheduling.
- Event details including schedule, venue, map link, notes, capacity, format, and ranked/unranked classification.
- Reclub event-detail and roster import with organizer review before creation.
- Organizer check-in, checkout, queue placement, and an adjustable bench order.
- Live court creation and reduction during an event.
- Balanced singles and doubles matchmaking, standby and upcoming lineups, player replacement, and court assignment.
- Playing-now court cards with player photos, ranks, match counts, elapsed timers, overtime alerts, and score entry.
- Post-match handoff display for sending the standby match to the newly available court.

## Trusted competition records

- Official ranked matches restricted to authorized subscribed clubs and verified players.
- Separate ranked and unranked records.
- Transactional score finalization, rating calculation, statistics, streaks, and leaderboard updates.
- Club and overall leaderboards with deterministic calculations.
- Match history showing actual submitted scores, winner emphasis, score revisions, and match reporting.
- Controlled disputes, moderation, duplicate-player review, Trust Score adjustments, and evidence handling.
- Immutable audit trails and realtime invalidations for leaderboard-critical workflows.

## Engineering and operations

- Next.js App Router, strict TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth/Storage/Realtime, and Vercel-ready deployment.
- PostgreSQL functions and Row Level Security for transactional domain rules and club tenant isolation.
- Responsive mobile-first interface with keyboard and reduced-motion accessibility considerations.
- Vitest unit/integration tests, Playwright end-to-end coverage, PostgreSQL tests, CI, health checks, and migration verification.
