# UNEX — Handoff

Written October 14, 2026, at the end of the landing-page and design overhaul
session. Read this first, then `design-system/dink-palette.md` (the only design
source of truth) and `docs/current-features.md`.

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

## 2. Current state

**Done and approved by the user:** the landing page (`app/page.tsx`) and the
design overhaul. The whole app now uses the dark navy + volt-lime system.

| Area | State |
| --- | --- |
| Landing page | Finished. Pinned scroll hero with canvas court, scrubbed paddle video band, organizer board, cream CTA/footer. User is happy with it. |
| Design system | One source of truth: `design-system/dink-palette.md`. Old Courtside / Pickleball Record docs deleted. |
| Theme | App-wide via semantic tokens in `app/globals.css` `:root` (`--background`, `--surface`, `--foreground`, `--primary`…). Fonts: Bricolage Grotesque (headings) + Archivo (body) loaded in `app/layout.tsx`. |
| Auth pages | `/login` redesigned (hero court + form card); register/recover/verify share the layout. |
| Public pages | Leaderboards, player profile checked visually after the recolor. |
| **Dashboard & other logged-in pages** | **Recolored by rules but never seen.** Needs login; not visually verified. This is the next focus. |
| Header | Transparent, borderless, scrolls away on non-landing pages; fixed + transparent on landing (text flips dark over light bands). Phones have no bottom tab bar anywhere. |
| Brand | Script UNEX wordmark (`public/unex-logo.png`, used as a CSS mask) and generated app icons. |
| Tests | `tsc`, `eslint` clean. Unit tests: 85 pass, **3 fail** (`tests/integration/events/event-actions.test.ts`, hard-coded Oct 1 2026 dates now in the past — pre-existing, unrelated). E2E suite not run (needs hosted Supabase login). |
| Git | **Nothing committed yet.** Branch `001-club-leaderboard`. |

## 3. Active files

Design / theme
- `design-system/dink-palette.md` — single design source (rewritten).
- `app/globals.css` — ~5,000 lines; tokens at `:root`; auth section and landing (`.ls-*`, `.pch-*`) near the end.
- `app/layout.tsx`, `app/manifest.ts`, `components/layout/site-header.tsx`.

Landing page
- `app/page.tsx`
- `components/marketing/pinned-court-hero.tsx` — canvas court, scroll-pinned; phone layout (`isPhone`).
- `components/marketing/landing-motion.tsx` — reveal observer, parallax, video scrub, header light/dark flip.
- `public/videos/paddle-parallax.mp4`, `public/unex-logo.png`, `public/icons/*`, `app/icon.png`, `app/apple-icon.png`.

Auth
- `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`
- `components/auth/login-form.tsx`, `components/auth/google-auth-button.tsx`

Dashboard (next focus)
- `app/dashboard/page.tsx` (410 lines, class names `dash-*` in `globals.css` top)
- `app/dashboard/profile/`, `app/dashboard/clubs/[clubSlug]/` (events, members, reports, layout)
- `components/events/*`, `components/queues/*`, `components/clubs/*`, `components/matches/*`

Docs / tooling
- `docs/current-features.md` (has an Oct 14 note), `CLAUDE.md` + `.claude/` (Graphify), `.gitignore` (now ignores `graphify-out/`).

## 4. Changes made recently (this session)

1. **Landing page** from the Claude artifact (`claude.ai/artifact/8UUkaYaEL65zaBztB24r1z`): pinned canvas court hero (isometric court, net, paddles, ball), left-anchored big headline, scroll-scrubbed video band, organizer board, cream "three steps" band (inverted colors), light CTA + footer, transparent header, real routes on all buttons.
2. **Header:** logo mask recolors for contrast; phone layout puts Rankings/Log in beside the logo and removes the bottom tab bar; borderless and transparent on all pages.
3. **Rename to UNEX** across metadata, manifest, profile titles, docs.
4. **App-wide restyle** to the dink palette: tokens retargeted, ~150 hard-coded light colors remapped by a script, Tailwind utility colors converted, Bricolage/Archivo everywhere, base = artifact near-black navy (`oklch(15% 0.025 255)`) with near-white text.
5. **Login overhaul** (Emil Kowalski motion rules): split hero with true-proportion top-down pickleball court, form card, password reveal, Google logo, spinner, error styling.
6. **Leaderboards:** removed the "Ranking rules" card and Download CSV link (rules card still on club pages; CSV endpoint still exists).
7. **Cleanup:** deleted 8 unused source files, 2 unused videos, old design docs, dead CSS (courtside, mobile-nav, ~19 unused classes). `courtside-*` classes renamed to `dash-*` / `auth-kicker`.
8. **Graphify** installed and the knowledge graph built (`graphify-out/`, git-ignored).

## 5. Failed or abandoned attempts (so nobody repeats them)

- **Court-only JS bounce at the page top** — wrong. The reference (actl.me) is the browser's native elastic scroll moving the *whole* hero. Removed; native overscroll restored.
- **Gradient on the root background to hide overscroll** — browsers only paint a flat color there. Fixed by making the hero's top edge a flat near-black and the root the same color.
- **Play-in-view looping paddle video** — user rejected; went back to scroll-scrub, starting when the band first enters the viewport. Forward-scroll lag remains possible because the file has few keyframes; **ffmpeg isn't installed**, so it couldn't be re-encoded.
- **Canvas `var(--…)` colors** silently fail — canvas needs literal `oklch()`.
- **Benches and light poles on the canvas court** — built, then removed by request.
- **Scroll cue ("SCROLL" + arrow) and the hero wave SVG** — removed by request (wave leaked the next section's color).
- **A CSS insert landed inside another selector** (`.site-header--transparent .brand__logo`) once; found and repaired. Always re-check insert points in this very large CSS file.
- **Logo PNG has an opaque black background** — unusable as-is; converted to a transparent alpha mask. A thicker or vector logo would read better at small sizes.
- **Higgsfield / Seedance clips:** generated drafts were never integrated. A reference-guided job (`8936ffeb-48e3-4253-9680-9d72da0dbd16`) was never re-checked. The Plus **3-day trial auto-renews (~$49/mo)** — cancel with `cancel_trial_auto_renewal` or in Higgsfield if it isn't wanted.
- **Temp screen-recording path** couldn't be read (macOS deletes it); the user re-saved to the Desktop. Ask for files in Downloads/Desktop.

Preview-pane quirks (not app bugs): animations lag and the first JS call after `navigate` can see an unlaid-out page; screenshot after a short `wait`. Screenshots of video/canvas can be stale.

## 6. Next steps — dashboard, features and functionality

The user wants to focus on the dashboard and its features next.

**A. See the dashboard first (blocker for everything else)**
- Log in with a **local** test account (`supabase/seed/README.md`; never against hosted data with real credentials) or ask the user to share screenshots. Walk through: `/dashboard`, `/dashboard/profile`, clubs, club events, event detail, check-in, queue, courts, matches, disputes, members, reports, admin.
- Fix recolor misses (tinted badges, live court cards, form errors, tables, the sticky event nav and club sidebar offsets I changed when the header stopped being sticky).

**B. Dashboard design pass** (`app/dashboard/page.tsx`)
- The earlier product intent (from the deleted Courtside doc) still holds: one primary focus by situation — *before an event* (joined event + prep), *during* (current event, court, standby, live queue), *after* (results, progress), *none* (find a game). Never fabricate queue positions or activity.
- Rebuild the cards with the new system: surface cards on the base, volt for the primary action, tiles in `--muted`.

**C. Functionality to review with the user** (ask which matter most)
- Player flow: join/withdraw, waitlist, check-in, live queue status, score confirmation, disputes.
- Organizer flow: event creation/edit, roster import (Reclub), court editor, assignment, finishing matches, completing events.
- Club management: members/roles, reports, trust score.
- Known gaps to confirm: CSV export link removed from leaderboards; no notifications; no messaging/feeds (intentionally not faked).

**D. Quality / hygiene**
- Fix the 3 date-fragile tests (use relative dates).
- Run the full e2e suite against a safe environment.
- Update `docs/current-features.md` after dashboard changes; keep `dink-palette.md` the only design file.
- Optionally re-encode `paddle-parallax.mp4` with more keyframes (needs ffmpeg).
- `AGENTS.md` warns this Next.js has breaking changes — read `node_modules/next/dist/docs/` before writing Next-specific code.

## Commands

```bash
npm run dev            # port 3000 (.claude/launch.json "web")
npm run lint && npm run typecheck && npm test
graphify update .      # refresh the code graph after edits (git-ignored output)
```

## Open questions for the user

1. Which dashboard flow first: player home, organizer tools, or club management?
2. Is a local Supabase with the seed available for safe visual testing, or should the user supply screenshots?
3. Keep the Higgsfield trial, or cancel auto-renewal?
