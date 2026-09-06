# Current Features

Updated September 6, 2026.

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
