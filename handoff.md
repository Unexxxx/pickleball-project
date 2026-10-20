# UNEX — Handoff

Updated October 20, 2026. Covers the player dashboard overhaul, the single
profile page, the landing-hero cleanup, the earlier landing/design-system
session (§2b), the login password-toggle fix (`fd0601e`), the hosted-event
cleanup (§2c), the Oct 15–20 homepage/Google commits and the CI fix (§2d). Read this first, then
`design-system/dink-palette.md` (the only design source of truth) and
`docs/current-features.md`.

**Next goal: redesign the club dashboard** — `/dashboard/clubs/[clubSlug]`
(example: `/dashboard/clubs/the-dink-lab`). See §6.

**Working preferences from the user:** commits have **no co-author line**;
design only from `design-system/dink-palette.md`; verify visually before
saying "done"; never act on hosted data without being asked.

## 1. Goal of the application

UNEX (formerly "Pickleball Record" / "Dink") is a Next.js + Supabase app for
**trusted pickleball club competition**:

- Verified player identities (one persistent identity across clubs).
- Club and event operations: events, registration/waitlists, check-in, live
  court queues, matchmaking (v3 rotation), court assignment, score entry.
- **Auditable official results** (submit → confirm → finalize, disputes,
  evidence retention, Trust Score) and **deterministic all-time leaderboards**
  (team Bayesian ratings, replay from ledgers).
- Public surfaces: landing page, leaderboards, player profiles, club pages,
  event/join pages.

Architecture (from `README.md`): Server Components read, Server Actions /
Route Handlers mutate with the user's Supabase session, PostgreSQL functions own
finalization/rating/dispute/audit invariants, RLS isolates clubs, Realtime is
invalidation-only.

## 2. Compared with the previous handoff

| Area             | Previous handoff (earlier Oct 14)                                       | Now                                                                                                                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Player dashboard | Recolored by rules, never seen; quick-link row + tab row + header links | **Redesigned and verified.** Home built around 3 questions (play now / coming up / connect & compete). New `/dashboard/events`, `/dashboard/clubs`, `/dashboard/search`.                                                                          |
| Navigation       | Header: Rankings · Dashboard · Log out; dashboard had 2 more nav rows   | **One primary nav** for signed-in players: Home · Events · Clubs · Search · Profile. Signed-out: Rankings · Log in. Old `/dashboard?view=…` links redirect.                                                                                       |
| Profile          | `/dashboard/profile` (edit + stats card) and `/players/[slug]` (public) | **One page:** `/players/[slug]`. Owner edits name/photo **in place in the header**; Log out lives there. `/dashboard/profile` only forwards (`?edit=1` opens the editor).                                                                         |
| Landing hero     | Two CTAs (Create account + Explore the rankings)                        | One CTA (Create your player account → `/register`); Rankings stays in the header.                                                                                                                                                                 |
| CI               | Unknown; actually **failing** since the Graphify commit (format check)  | **Green again at `a0d7e40`.** Format check fixed (`.agents/` in `.prettierignore`). Then e2e broke from `3b94618` (Oct 15) to `f4b9aab` because the hosted test fixtures were deleted — see §2d.                                                  |
| Tests            | 85 pass, 3 date-fragile failures reported                               | **98 pass** (the 3 date tests pass now). New `tests/unit/components/play-hero.test.tsx`. `tests/e2e/profile-settings.spec.ts` rewritten for the in-place editor.                                                                                  |
| Git              | Nothing committed                                                       | All pushed on `001-club-leaderboard`: `f290455` (dashboard + profile, PR #5 → `b0840c8`), `25f621a` (landing hero), privacy/terms/SEO/share-image commits, `fd0601e` (login toggle fix), the §2d homepage/Google commits, and `a0d7e40` (CI fix). |
| Club dashboard   | Listed under "recolored but never seen"                                 | **Still not redesigned or visually verified** — this is the next goal.                                                                                                                                                                            |
| Higgsfield trial | Open question (auto-renews ~$49/mo)                                     | **Still open** — not addressed this session.                                                                                                                                                                                                      |

## 2b. Earlier landing / design-system session (already committed — context only)

- **Landing page** from the Claude artifact: pinned canvas court hero, scroll-scrubbed paddle video band, organizer board, cream "three steps" band, light CTA + footer. Header is transparent and borderless on every page; logo is the script UNEX wordmark used as a **CSS mask** (`public/unex-logo.png`, `currentColor`), app icons generated from it.
- **App-wide recolor** to the dink palette: semantic tokens in `app/globals.css` `:root`; base = `oklch(15% 0.025 255)`, surface `oklch(21% 0.03 255)`, text `oklch(97.5% 0.008 90)`, volt accent. The actl.me navy/cream is reserved for the landing hero and the cream "steps" band.
- **`/login` overhaul** (shared auth layout `app/(auth)/layout.tsx`): hero with a true-proportion top-down court (44×20 ft, kitchen lines 7 ft from net, center lines baseline→kitchen), form card, password Show/Hide, spinner. Register/recover/verify inherit it.
- **Leaderboards**: removed the "Ranking rules" card and CSV link (club pages still show rules).
- **Cleanup**: deleted unused components/videos/dead CSS; `courtside-*` classes renamed.
- Fixes this session: event hero used the text color as its **background** (cream card, unreadable) → now `var(--surface)`; the skip link had the same bug → volt. **When recoloring, grep for `background: var(--foreground)`** — dark-green-as-background rules flipped to cream.
- Latest fix (`fd0601e`, pushed): the login Show/Hide button jumped on hover because the global `button:hover` sets `translate: 0 -1px` and replaced the `translate: 0 -50%` centering. **Don't center absolutely-positioned buttons with `translate`; use `top:0;bottom:0;margin-block:auto`** and override the global hover (`translate:none`) with a more specific selector.

## 2c. Hosted data touched this session (be careful — real club data)

- The Claude Code classifier **blocked service-role writes to hosted Supabase** (except one narrow call that canceled a stale match). Event completion requires a signed-in owner/organizer anyway: the `complete_event_operations` trigger writes `event_queue_history.actor_player_id` from `current_player_id()` (NULL for service role → not-null violation) and `transition_event` writes the audit log with `auth.uid()`. Don't bypass; use the in-app **Complete event** / **Cancel event** buttons (`components/events/event-management-controls.tsx`).
- Completing is blocked while any match is `assigned`/`playing` (`ACTIVE_MATCHES_REMAIN`); `score_pending` does not block. Canceling an `in_progress` event is allowed regardless.
- State when last checked (Oct 15 — re-check before relying on it): **OPEN PLAY | 6HRS | 250PHP** (The Dink Lab, `74229049-2952-4fb3-9f2f-a4aee53ce941`) — the stale Sept 9 assigned match was canceled, courts free, still `in_progress`, 32 queued → needs **Complete event** by an organizer. **☀️Thursday Morning Open Play | 150** (`31260bdc-cfbc-43a2-b7e4-db8ac3cedad1`) — still has 2 stale `assigned` matches (Courts 1 and 3, since Sept 6) blocking completion, plus 9 `score_pending` matches (real played games; left untouched). **E2E live journey** (club `test`) — canceled, and the whole `test` club was later deleted (§2d).
- The preview pane **was logged in** as the user when last checked (it showed Dashboard / Log out); the carried-over note below says it was logged out. Check `/dashboard` first.

## 2d. October 15–20 commits and the CI fix

- `c2963f6` named UNEX in the homepage hero and added a statement that Google data isn't used for AI. `f4b9aab` later **restored the original hero text**; what remains of `c2963f6` is the Google-data statement in `app/page.tsx`.
- `722a97b` restyled the Google sign-in button to Google's dark branding; **reverted** in `89f40ba`. The button is unchanged.
- **Production is live.** The user deleted all hosted test data: club `test` (`E2E_CLUB_SLUG`), its event `50000000-0000-4000-8000-000000000001`, and players `e2e-player-1…4`. Hosted Supabase now has only the real clubs **The Dink Lab** and **Dink A Boo**. The E2E login account (`E2E_USER_EMAIL`) still exists.
- That made 17 Playwright tests fail on every push from `3b94618` to `f4b9aab`. **Fixed in `a0d7e40`:** tests that need seeded data skip unless `E2E_FIXTURES=1` (`tests/e2e/helpers/fixtures.ts`); the live-event journey (service-role writes) is gated the same way; `scripts/setup-hosted-e2e.mjs` was deleted. CI result: application + database green, 34 e2e pass, 18 skipped by design.
- **Never re-seed fixtures into the hosted project.** To restore coverage of queue / courtside / live-event / profile-history flows, run those tests in CI against a local Supabase (`supabase start` + `db reset` + seed) with `E2E_FIXTURES=1` — not done yet.
- Still in the repo, gated by `ALLOW_HOSTED_E2E_SETUP=1`: `create-hosted-op-players`, `enroll-hosted-op-players`, `enroll-hosted-verified-players`, `repair-hosted-newcomer-queue-order`. They write to hosted data; the user hasn't decided whether to keep them.

## 3. Current state

| Area                      | State                                                                                                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing page              | Finished and approved. Hero has a single CTA.                                                                                                                                                                                 |
| Design system             | `design-system/dink-palette.md` is the only design file. Dark navy + volt-lime, Bricolage Grotesque + Archivo.                                                                                                                |
| Player home `/dashboard`  | Done. Context-aware Play hero (on court → court label; queued → real position + players ahead, **no invented wait time**; checked in; live; upcoming; idle → Find a match / Join a live queue), Coming up, Connect & compete. |
| Events / Clubs / Search   | Done. `/dashboard/events` tabs Joined · Hosting (owners/organizers/staff only) · Discover. `/dashboard/clubs` = your clubs + roles, Create a club, Explore clubs.                                                             |
| Profile `/players/[slug]` | Done. Public view for everyone; owner gets in-place edit + Log out. Visitors verified to see neither.                                                                                                                         |
| Club dashboard            | **Not redesigned.** See §6.                                                                                                                                                                                                   |
| Live hero states          | Queued / on-court / checked-in states covered by unit tests only — the test account had no live events, so they were never seen with real data.                                                                               |
| Header active state       | The Profile icon doesn't highlight on your own profile (header doesn't know your slug without an extra query per page). Acceptable for now.                                                                                   |

## 4. Active files (this session)

Player dashboard

- `app/dashboard/page.tsx` — home (legacy `?view=` redirects at top).
- `app/dashboard/events/page.tsx`, `app/dashboard/clubs/page.tsx`, `app/dashboard/search/page.tsx`.
- `components/dashboard/play-hero.tsx`, `components/dashboard/event-row.tsx`.
- `lib/queries/player-home.ts` — server-only data: joined events, `getPlayStatus`, hosted events, live/upcoming public events, clubs to discover.
- `lib/format/event-time.ts` — date helpers (club timezone), kept out of the server-only module so components stay unit-testable.
- `components/events/player-event-hub.tsx` — Joined tab cards (compact empty state).

Navigation / profile / landing

- `components/layout/site-header.tsx` — signed-in vs signed-out nav.
- `app/(public)/players/[playerSlug]/page.tsx`, `components/profiles/profile-header.tsx` (client; view + in-place edit + Log out).
- `app/dashboard/profile/page.tsx` (redirect only), `app/auth/callback/route.ts` (new sign-ups → `?edit=1`).
- `components/marketing/pinned-court-hero.tsx`.

CSS (`app/globals.css`, ~5,400 lines): new blocks are **appended near the end** — `ph-*` (player home), `.app-nav`, profile header/editing. Old `dash-*`, `player-dashboard*`, `dashboard-*`, `ranking-*`, `profile-editor`/`avatar-editor` rules were deleted.

Deleted: `components/clubs/club-switcher.tsx`, `components/profiles/profile-editor.tsx`.

## 5. Failed attempts and gotchas (don't repeat)

Carried over from the previous handoff:

- Canvas can't use `var(--…)` colors — use literal `oklch()`.
- Inserting CSS mid-file once landed inside another selector. **Append new blocks at the end** or re-check insert points.
- Paddle video lag: file has few keyframes; ffmpeg isn't installed to re-encode.
- Preview pane: screenshots are often **stale or half-scaled** right after `navigate`/clicks. Verify with `javascript_tool` (bounding boxes, `scrollWidth`) and re-screenshot after a short wait.

Also tried and abandoned in the landing session:

- **Court-only JS bounce at the page top** — wrong; the reference (actl.me) is the browser's native elastic scroll moving the whole hero. Removed; the hero's top edge is a flat near-black (`oklch(15% 0.025 255)`) matching `html:has(.ls-page)` so overscroll is seamless. A gradient root background doesn't work (browsers paint only a flat color there).
- **Play-in-view looping video** — rejected; the paddle video is scroll-scrubbed, starting when the band first enters the viewport.
- **Opaque-black logo PNG** can't be recolored; it was converted to an alpha mask.

New this session:

- **The app runs against the hosted Supabase project** (`.env` → `*.supabase.co`; only `.env.example` points at local). Browse freely, but don't join/withdraw, check in, save profiles or change roles without asking — it's real data.
- **Browser pane login state varies** (logged out earlier; logged in as the user later). Check before visual work on `/dashboard/*`. Never type credentials for the user.
- A Python edit script once truncated `lib/queries/player-home.ts` before its target folder existed — create directories (or use the Write tool) before moving code.
- `main > p:first-of-type`, `main > section` and `h1/h2` have global styles in `globals.css`; scope new page styles under a page class (e.g. `.ph`) and reset `max-width`/margins where needed.
- `tests/e2e/login.spec.ts` expects the dashboard's **h1 to start with "Hi, "** — the greeting is the h1, the hero title is an h2.
- CI runs `prettier --check .`; vendored skill folders (`.claude/`, `.codex/`, `.agents/`) must stay in `.prettierignore`.
- CI e2e runs **against the live production project**. Any new e2e test must be read-only and must not depend on seeded data, or it must be gated behind `E2E_FIXTURES=1`. Under a busy dev server the first login can exceed the 5 s expect timeout locally; re-run before assuming a regression (CI uses a production build with 2 retries).

## 6. Next goal — club dashboard (`/dashboard/clubs/[clubSlug]`)

What exists today (read from code; **not seen in the browser yet**):

- `app/dashboard/clubs/[clubSlug]/layout.tsx` → `ClubSidebar` (`components/layout/club-sidebar.tsx`): Overview · Events · Members · Reports.
- **Overview** (`page.tsx`): `ClubProfileHero` (name, timezone, subscription status, images) + `ClubEventSections` (Active / Past events) with `management` always `true`.
- **Events** (`events/page.tsx`): the same club's events again as a grid + Create event → **overlaps with Overview**.
- **Members** (`members/page.tsx`): **a stub** — renders `<MemberTable members={[]} />`, never queries memberships. Always empty.
- **Reports** (`reports/page.tsx`): "Report a concern" form + your reports — a member-facing action, not club management.
- Event workspace: `events/[eventId]/layout.tsx` adds `EventActionTray` (Check in · Queue · Courts · Matches · Disputes); event detail, `check-in`, `queue`, `courts`, `matches`, `disputes` pages under it.
- The layout does **no role check**; RLS protects data, but organizer controls may render for plain members. Decide what members vs. owners/organizers/staff should see (server-side checks, not just hidden buttons).

Suggested approach (mirror the player dashboard work):

1. Log in (the account used in the browser pane, `biskwit893`, is **Owner** of _The Dink Lab_ and _Dink A Boo_ — both are **real, live clubs**, so browse only; no creating/editing events, check-ins or role changes unless the user asks) and walk every club page and the event workspace on desktop and phone; note recolor misses (sticky event nav / club sidebar offsets changed when the header stopped being sticky).
2. Apply the same principles: one navigation system (the sidebar vs. the global header vs. the event action tray), no duplicate destinations (Overview vs. Events), context-aware focus — e.g. _live event now_ → courts/queue; _next event_ → check-in prep; _nothing scheduled_ → Create event. Never fabricate numbers.
3. Make Members real (query `club_memberships` with player names, roles, status; role management is a separate, explicit feature request).
4. Decide where Reports belongs (likely a member action on the public club page, plus a moderation view for organizers).
5. Keep using the attached Emil Kowalski skill (`~/Downloads/SKILL.md`): motion only for state, pointer-gated hovers, `scale(0.97–0.98)` presses, custom ease-out, respect reduced motion.

## 7. Other open items

- Higgsfield Plus trial auto-renews (~$49/mo) — cancel with `cancel_trial_auto_renewal` or in Higgsfield if unwanted. Reference job `8936ffeb-48e3-4253-9680-9d72da0dbd16` never re-checked.
- Landing: the closing CTA still has "See the rankings" beside "Start your first event" — left intentionally; remove if the user wants.
- No notifications, messaging or feeds (intentionally not faked). CSV leaderboard endpoint exists but isn't linked.
- Optionally re-encode `public/videos/paddle-parallax.mp4` with more keyframes (needs ffmpeg).
- `AGENTS.md`: this Next.js has breaking changes — read `node_modules/next/dist/docs/` before writing Next-specific code.

## Commands

```bash
npm run dev            # port 3000 (.claude/launch.json "web")
npm run format:check && npm run lint && npm run typecheck && npm test
npm run build
npx playwright test    # uses .env E2E credentials against hosted Supabase
graphify update .      # refresh the code graph after edits (git-ignored output)
```

## Open questions for the user

0. Commit attribution: the working-preferences line above says "no co-author line", but the user hasn't confirmed it in chat yet; `a0d7e40` still carries the Claude co-author trailer. Ask before the next commit.
1. For the club dashboard: should plain members see a read-only club home, or should `/dashboard/clubs/[slug]` be an organizer-only workspace (members use the public `/clubs/[slug]` page)?
2. Should Members include role management (promote/demote/remove) now, or just a real, read-only roster first?
3. Keep the Higgsfield trial, or cancel auto-renewal?
4. Keep or delete the four remaining `ALLOW_HOSTED_E2E_SETUP` scripts (§2d)?
