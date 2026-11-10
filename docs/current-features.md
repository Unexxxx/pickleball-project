# Current Features

Updated September 9, 2026.

## October 14 update notes

- Renamed the product to **UNEX** and adopted a single design source of truth, [design-system/dink-palette.md](../design-system/dink-palette.md): dark navy base, volt-lime accent, cream text, Bricolage Grotesque + Archivo everywhere, and the script UNEX wordmark as the logo and app icon. The earlier Courtside and Pickleball Record design docs were removed.
- Rebuilt the landing page: pinned scroll hero with an animated canvas pickleball court, scroll-scrubbed paddle video band, organizer board preview, and cream CTA/footer sections. Phones drop the bottom tab bar on the landing page and show Rankings/Log in in the header.

- **Player dashboard overhaul.** One primary navigation in the header for signed-in players: Home · Events · Clubs, plus Search and Profile icons (Log out moved to Profile). Home answers three questions: a context-aware _Play_ hero (on court → court label; queued → real queue position and players ahead, no invented wait time; checked in → join the queue; upcoming → event, time and venue; nothing booked → Find a match / Join a live queue), a compact _Coming up_ list (plus a Hosting shortcut for organizers), and _Connect & compete_ (public sessions live now, upcoming public events, clubs to explore, and the player's rank/rating). New pages: `/dashboard/events` (Joined · Hosting · Discover tabs; Hosting only for owners/organizers/staff), `/dashboard/clubs`, `/dashboard/search`. Old `/dashboard?view=…` links redirect.
- **One player profile.** `/players/[slug]` is the only profile page: identity, overall rank, stats and match history for everyone; when you view your own page, Edit profile turns the header itself into the editor (name field, camera button on the avatar, Save/Cancel) and Log out sits beside it. `/dashboard/profile` (header icon, Home rank badge, sign-up callback) forwards there, with `?edit=1` opening the editor.

## October 28 update notes

- **Create event redesigned** (`/dashboard/clubs/[slug]/events/new`): four short sections (What · When & where · Players & courts · Who can join) with tap-to-choose chips, a live preview of what players will see (sticky beside the form on desktop), and a submit button that says what will happen (Publish event / Save draft; pinned to the bottom on phones). Fewer decisions: the start is a date plus an hour (1–12 with AM/PM), or an exact time typed in when needed (e.g. 6:15 AM); the end is the start plus a 3–8 hour length chip (3 by default), shown as "Ends at …"; players/courts steppers show how many games run at once; notes are optional and folded away. No change to what's saved.
- **Who can join an event.** **Public** events are listed on the schedule and players **Request to join**; owners, organizers and staff approve (a spot, or the waitlist when full) or decline in a new _Requests to join_ list on the event page. Players can cancel a pending request; a declined player can't ask again. **Private** events are now listed like any other event (schedule, Home, Discover, search), but joining takes the passcode, club members included; the right passcode joins straight away. Club owners, organizers and staff join their own club's events without approval. New `review_event_registration()`; requests are a new `requested` registration status that holds no spot.
- **Joining a started event.** Players can still join (or ask to join) an event that's in progress while it has a free spot. There's no waitlist once it starts: a full live event turns new players away and organizers can't approve into it. Closed, ended and canceled events stay shut. `register_for_event()` and `review_event_registration()` updated; new `EVENT_FULL` error. Tests: `supabase/tests/166_join_started_events.test.sql`.
- **Club roles are now Owner, Admin and Member.** Staff and score officials are retired: existing staff became admins and score officials became members, and the database now only allows owner, admin (stored as `organizer`) or member. Admins do everything staff and score officials could (create and run events, approve players, enter scores, resolve disputes); owner-only actions stay owner-only. On the Members tab, every row in _Club staff_ and _Members_ has a menu (☰): owners choose **Make admin** on a member or **Remove admin role** on an admin (a short message confirms it), and remove people; admins remove members (removing an admin takes an owner). Nobody gets a menu on their own row or an owner's row, the last owner can't be demoted, and removing asks to confirm. The old "Remove members" list is gone. Role changes are audit-logged. `set_membership_role()` and `private.has_club_role()` updated. Tests: `supabase/tests/167_member_role_menu.test.sql`.
- **Transfer ownership.** On an admin's row the owner's ☰ menu has **Transfer ownership**: after confirming, that admin becomes the owner and the previous owner becomes an admin. Only admins can receive it, so a member is made an admin first. New `transfer_club_ownership()` (audit-logged as `club.ownership_transferred`). Tests: `supabase/tests/168_transfer_club_ownership.test.sql`.
- **Member lists for big clubs.** The Members tab no longer loads everyone at once. _Members_ and _Join requests_ show 30 at a time with **Show more** ("Showing 30 of 1,000"), and search asks the database, so it finds anyone in the club, not just who's on screen (it waits for a pause in typing; `%` and `_` are matched literally). The Members badge, the club header and Overview read a count instead of the whole list. After approving, removing or changing a role, the rows already on screen are re-read so the list stays put. Pages continue after the last name shown, so nobody is skipped or repeated. New `club_member_counts()`, `club_member_page()` (public) and `club_roster_page()` (owners and admins); until they are deployed the app pages the older full lists itself. Tests: `supabase/tests/169_member_list_pages.test.sql`.
- **Event templates.** On Create event, tick **Save as a template for next time** (optionally name it; the same name updates an existing template). Next time, **Start from a template** at the top of the form fills in everything except the date and passcode (passcodes are only stored hashed). Templates belong to the club and are shared by its owners, organizers and staff, who can also remove them; up to 50 per club. New `event_templates` table with `save_event_template()` / `delete_event_template()`.
- **Club contacts:** clubs publish an **email**, a **Facebook page** and a **contact number**, each optional and tappable (mailto:, the page in a new tab, tel:). Club admins (owners, organizers, staff) edit all three in place on the club page; email and Facebook formats are checked in the app and again in the database (Facebook links must be facebook.com/fb.com pages); the contact number is free text (up to 100 characters) and is a call link only when it contains a number. Existing single-line contacts were moved into the matching field. The Contact panel on Overview no longer has an "All members" link.
- Database: `clubs.contact_email`, `contact_facebook`, `contact_phone`; `set_club_contacts()` (audit-logged). `contact_info` is no longer written. Tests: `supabase/tests/163_club_contacts.test.sql`.

## October 27 update notes

- **Joining clubs.** Each club has a join setting, set by owners and organizers on the Members tab: **Approval required** (default) or **Anyone can join**. The club header shows **Join club** / **Request to join** (signed-out visitors go to log in and back), or **Request sent** with Cancel. Members can **Leave club** from the club footer; the last owner can't leave.
- **Staff tools on Members:** owners, organizers and staff approve or decline join requests and remove members (only owners remove staff, organizers or owners; the last owner can't be removed). Pending requests grant nothing: club roles and private-event access only count active memberships.
- Database: `membership_status` gains `requested`; `clubs.join_policy`; `request_club_membership`, `leave_club`, `review_club_membership`, `remove_club_member`, `set_club_join_policy`, `club_staff_roster` (all audit-logged). Tests: `supabase/tests/162_club_join.test.sql`.

## October 22 update notes

- **Header navigation is now Home · Clubs** (plus Search and Profile). The separate Events item was removed: a club's events live on its Schedule tab, and your own Joined · Hosting · Discover list (`/dashboard/events`) is reached from Home's Coming up, Hosting and Upcoming events links, with Home highlighted there.
- **One club home at `/clubs/[slug]`**, public for everyone (signed in or not), with tabs **Overview · Schedule · Members · Rankings**. Old `/dashboard/clubs/[slug]` links (and `/members`, `/events`) forward there; the club sidebar is gone, so the header is the only main navigation. "Schedule" replaces the club's "Events" so it can't be confused with the header's Events (your events across clubs).
- **Role checks on the server.** Owners, organizers and staff see management tools (Create event, Manage/Run live event, drafts/private/canceled events, the event workspace). Check-in, courts, event details and new event are owner/organizer/staff only; matches and disputes also allow score officials; the live queue stays open to confirmed players. Everyone else gets a 404.
- **Overview:** one focus (live now → run/view, next event, or "No events scheduled"), the club contact plus staff, coming up, and real counts (members, events held, ranked players). Billing status is no longer shown publicly.
- **Members:** "Club staff" (owners/organizers/staff) with the contact line, then a searchable member list with join dates; private players are counted but not named. Backed by the new public `club_member_directory()` function.
- **Rankings:** the club leaderboard (all players in the club's ranked matches) with an All players / Members only filter and a Member badge.
- **Club contact:** owners and organizers publish a contact line (new `clubs.contact_info`, set via `set_club_contact()`, audit-logged).
- **Club photos:** owners and organizers change or remove the club picture and cover photo in place on the club header (JPG/PNG/WebP up to 10 MB). Files upload to `club-media/<club id>/…`; `set_club_media()` records the path (only inside that club's folder), audit-logs it and returns the replaced file, which is then deleted.

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
- ~~Reclub event-detail and roster import~~ — removed October 28 (the Create event page no longer imports from Reclub; rosters already imported can still be reviewed on the event page).
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
