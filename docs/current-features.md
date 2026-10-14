# Current Features

Updated September 9, 2026.

## October 14 update notes

- Renamed the product to **UNEX** and adopted a single design source of truth, [design-system/dink-palette.md](../design-system/dink-palette.md): dark navy base, volt-lime accent, cream text, Bricolage Grotesque + Archivo everywhere, and the script UNEX wordmark as the logo and app icon. The earlier Courtside and Pickleball Record design docs were removed.
- Rebuilt the landing page: pinned scroll hero with an animated canvas pickleball court, scroll-scrubbed paddle video band, organizer board preview, and cream CTA/footer sections. Phones drop the bottom tab bar on the landing page and show Rankings/Log in in the header.

- **Player dashboard overhaul.** One primary navigation in the header for signed-in players: Home · Events · Clubs, plus Search and Profile icons (Log out moved to Profile). Home answers three questions: a context-aware _Play_ hero (on court → court label; queued → real queue position and players ahead, no invented wait time; checked in → join the queue; upcoming → event, time and venue; nothing booked → Find a match / Join a live queue), a compact _Coming up_ list (plus a Hosting shortcut for organizers), and _Connect & compete_ (public sessions live now, upcoming public events, clubs to explore, and the player's rank/rating). New pages: `/dashboard/events` (Joined · Hosting · Discover tabs; Hosting only for owners/organizers/staff), `/dashboard/clubs`, `/dashboard/search`. Old `/dashboard?view=…` links redirect.
- **One player profile.** `/players/[slug]` is the only profile page: identity, overall rank, stats and match history for everyone; when you view your own page, Edit profile turns the header itself into the editor (name field, camera button on the avatar, Save/Cancel) and Log out sits beside it. `/dashboard/profile` (header icon, Home rank badge, sign-up callback) forwards there, with `?edit=1` opening the editor.

## September 9 update notes

- Established the Courtside design direction (premium sports minimalism, forest green, warm surfaces, controlled lime accents). Superseded on October 14 by [design-system/dink-palette.md](../design-system/dink-palette.md).
- Restyled the authentication layout, login, and registration screens while preserving authentication behavior. The shared account layout also styles recovery and verification pages.
- Restructured the dashboard around the player's next event or event discovery, with prominent live-queue access and compact secondary navigation for clubs, rankings, history, and profile.
- Added joined-event and live-event sections, public discovery, and name search across people, clubs, and events. Confirmed players can follow live queue links from the dashboard and event page; waitlisted players retain their waitlist status.
- Fixed invitation lookup across published, registration-closed, in-progress, completed, and canceled events; drafts stay hidden and registration rules are unchanged.
- Made the bench visible by default with compact single-line entries and contained horizontal scrolling on mobile. Entries include event W–L, win rate, match count, and current rating; unavailable statistics show a dash.
- Restricted queue management UI to club owners/organizers, retained existing server checks for assignment/reordering, and added an admin-only database guard for finishing matches. Players retain read-only bench and live-court views.
- Enabled RLS on leaderboard rules and removed excess API-role privileges, preserving public read-only access.
- Converted four public-facing views to security-invoker mode. Public match history uses a sanitized, RLS-protected projection synchronized with results and player privacy changes, without exposing operational score-revision tables.
- Added regression coverage for event-link lifecycle, public-view privacy, rule-table permissions, joined-event navigation, and bench permissions/statistics.

Validation during this update: TypeScript and lint passed; all 88 unit/integration tests and 211 database assertions passed. Login and dashboard were checked on mobile and desktop, including test-account sign-in. The complete end-to-end browser suite was not rerun. The four September 9 database migrations have already been applied to the linked Supabase project.

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
