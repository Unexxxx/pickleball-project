# Tasks: Pickleball Club Competition and Leaderboards

**Input**: Design documents from `/specs/001-club-leaderboard/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are mandatory for every leaderboard-critical, authorization, audit, correction,
tenant-isolation, and Realtime workflow. Within each story, write the listed tests first and
confirm they fail before implementation.

**Organization**: Tasks are grouped by user story. Shared security and data-integrity work is
placed in Foundational because it blocks every independently testable story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after its phase prerequisites because it targets different files.
- **[Story]**: Maps the task to one specification user story.
- Every task contains an exact repository-relative file path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the single Next.js and Supabase project, tooling, and test harness.

- [x] T001 Initialize the Next.js App Router TypeScript project and required scripts in package.json
- [x] T002 Install and configure Tailwind CSS and shadcn/ui aliases in components.json
- [x] T003 [P] Configure strict TypeScript and path aliases in tsconfig.json
- [x] T004 [P] Configure ESLint and formatting rules in eslint.config.mjs and .prettierrc.json
- [x] T005 [P] Configure Vitest and Testing Library setup in vitest.config.ts and tests/setup.ts
- [x] T006 [P] Configure Playwright desktop and mobile projects in playwright.config.ts
- [x] T007 Initialize the local Supabase project and environment templates in supabase/config.toml and .env.example
- [x] T008 [P] Create the App Router route-group skeleton and global error/loading boundaries in app/layout.tsx, app/loading.tsx, and app/error.tsx
- [x] T009 [P] Create shared application shell and responsive navigation placeholders in components/layout/app-shell.tsx and components/layout/mobile-nav.tsx
- [x] T010 [P] Configure continuous integration quality-gate jobs in .github/workflows/ci.yml

**Checkpoint**: The empty application builds, local Supabase starts, and test runners execute.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish domain conventions, database security, authenticated clients, safe command
contracts, auditability, and deterministic rules required by every story.

**⚠️ CRITICAL**: No user-story implementation begins until this phase is complete.

### Foundational Tests

- [x] T011 [P] Add database schema, grant, fixed-search-path, and RLS baseline assertions in supabase/tests/001_foundation_schema.test.sql
- [x] T012 [P] Add cross-tenant allow/deny test helpers and role-session fixtures in supabase/tests/helpers/auth.sql and tests/fixtures/users.ts
- [x] T013 [P] Add Server Action result-envelope and domain-error mapping tests in tests/unit/lib/actions/result.test.ts
- [x] T014 [P] Add environment validation and server-only secret boundary tests in tests/unit/lib/env.test.ts

### Foundational Implementation

- [x] T015 Create extensions, shared enums, private schema, and timestamp/version helpers in supabase/migrations/202609010001_foundation.sql
- [x] T016 Create canonical players, accounts, clubs, memberships, roles, identity attestations, and platform-admin tables with constraints and indexes in supabase/migrations/202609010002_identity_clubs.sql
- [x] T017 Create idempotency, append-only audit, outbox, rule-version, calculation-run, and Trust Score foundation tables in supabase/migrations/202609010003_integrity_ledgers.sql
- [x] T018 Create least-privilege grants, authorization helpers, public safe projections, and baseline tenant RLS policies in supabase/migrations/202609010004_grants_rls.sql
- [x] T019 Create private Storage buckets, metadata tables, and evidence/avatar object policies in supabase/migrations/202609010005_storage.sql
- [x] T020 Create private Realtime Broadcast authorization policies and sanitized broadcast helpers in supabase/migrations/202609010006_realtime.sql
- [x] T021 [P] Implement request-scoped Supabase browser, server, and admin client factories in lib/supabase/client.ts, lib/supabase/server.ts, and lib/supabase/admin.ts
- [x] T022 Implement Supabase session refresh and protected-route handling in proxy.ts and lib/auth/session.ts
- [x] T023 [P] Implement current-player, Club-role, and platform-admin authorization helpers in lib/auth/authorization.ts
- [x] T024 [P] Define stable command result and database error-code mappings in lib/actions/result.ts and lib/domain/errors.ts
- [x] T025 [P] Define shared identifiers, score, pagination, and idempotency validation schemas in lib/validation/common.ts
- [x] T026 [P] Create server-only query cache/tag conventions in lib/queries/cache.ts
- [x] T027 Generate Supabase TypeScript database types in lib/supabase/database.types.ts
- [x] T028 Create deterministic local Auth/domain seed orchestration and environment guard in supabase/seed.sql and supabase/seed/README.md
- [x] T029 Verify foundation reset, RLS denial matrix, generated types, lint, typecheck, and build using scripts/verify-foundation.sh

**Checkpoint**: A clean database reset produces secure shared infrastructure; no exposed table is
accessible without an intentional grant and RLS policy.

---

## Phase 3: User Story 1 — Register a Verified Player (Priority: P1) 🎯 MVP

**Goal**: Create one contact-verified canonical player identity, prevent ranked duplicates, support
recovery, and record Club identity attestation.

**Independent Test**: Register and verify a new account, attest it through a seeded authorized Club,
reject ranked eligibility before attestation, and prevent or route a duplicate to recovery.

### Tests for User Story 1

- [x] T030 [P] [US1] Add canonical account/player uniqueness, contact verification for every match, and ranked-attestation database tests in supabase/tests/010_player_identity.test.sql
- [x] T031 [P] [US1] Add registration, verification, recovery, and duplicate-resolution action tests in tests/integration/auth/player-registration.test.ts
- [x] T032 [P] [US1] Add verified-player and prohibited-identity browser journeys in tests/e2e/player-registration.spec.ts

### Implementation for User Story 1

- [x] T033 [US1] Create account provisioning, verification sync, identity attestation, and duplicate-candidate functions in supabase/migrations/202609010010_player_identity_functions.sql
- [x] T034 [P] [US1] Define registration, recovery, and attestation schemas in lib/validation/auth.ts
- [x] T035 [US1] Implement registration, recovery, and attestation Server Actions in lib/actions/auth.ts
- [x] T036 [P] [US1] Build registration, verification, and recovery forms in components/auth/register-form.tsx, components/auth/verify-status.tsx, and components/auth/recovery-form.tsx
- [x] T037 [US1] Implement authentication and verification pages plus PKCE callback in app/(auth)/register/page.tsx, app/(auth)/verify/page.tsx, app/(auth)/recover/page.tsx, and app/(auth)/callback/route.ts
- [x] T038 [US1] Add ranked-eligibility status and attestation controls in app/dashboard/profile/page.tsx and components/auth/identity-attestation-card.tsx

**Checkpoint**: One verified account maps to one canonical player, and only an attested player is
eligible for ranked participation.

---

## Phase 4: User Story 2 — Access and Administer a Club (Priority: P1)

**Goal**: Create the single Club model, manage subscription-visible state and scoped roles, and
enforce tenant isolation without granting moderation authority.

**Independent Test**: Create two Clubs, assign and revoke each Club role, expire one subscription,
prove official authority changes immediately, and prove cross-Club private reads/writes fail.

### Tests for User Story 2

- [x] T039 [P] [US2] Add Club membership, role, subscription, final-owner, and tenant RLS tests in supabase/tests/020_club_access.test.sql
- [x] T040 [P] [US2] Add Club command authorization and subscription webhook tests in tests/integration/clubs/club-actions.test.ts
- [x] T041 [P] [US2] Add owner, organizer, revoked-role, inactive-subscription, and cross-tenant journeys in tests/e2e/club-access.spec.ts

### Implementation for User Story 2

- [x] T042 [US2] Create transactional Club creation, membership, role, and subscription-state functions in supabase/migrations/202609010020_club_commands.sql
- [x] T043 [P] [US2] Define Club, membership, role, and subscription schemas in lib/validation/clubs.ts
- [x] T044 [US2] Implement Club and role-management Server Actions in lib/actions/clubs.ts
- [x] T045 [P] [US2] Implement subscription webhook signature and replay protection in app/api/webhooks/subscription/route.ts
- [x] T046 [P] [US2] Build Club creation, membership, and role components in components/clubs/club-form.tsx, components/clubs/member-table.tsx, and components/clubs/role-editor.tsx
- [x] T047 [US2] Implement Club dashboard and member-management pages in app/dashboard/clubs/[clubSlug]/page.tsx and app/dashboard/clubs/[clubSlug]/members/page.tsx
- [x] T048 [US2] Implement server-read Club switcher with isolated membership context in components/clubs/club-switcher.tsx and lib/queries/clubs.ts

**Checkpoint**: Authorized Club operations work for one tenant and cannot expose or mutate another
tenant; Club owners cannot acquire platform-admin privileges.

---

## Phase 5: User Story 3 — Create and Join an Event (Priority: P1)

**Goal**: Let organizers manage event lifecycles and let verified players join through one link/QR
experience with atomic capacity and waitlist handling.

**Independent Test**: Publish each event type, join through link and QR, fill capacity concurrently,
verify deterministic waitlisting/promotion, and reject expired, tampered, or duplicate joins.

### Tests for User Story 3

- [x] T049 [P] [US3] Add event, court, registration, capacity, waitlist, and join-token database tests in supabase/tests/030_events.test.sql
- [x] T050 [P] [US3] Add event lifecycle and registration command tests in tests/integration/events/event-actions.test.ts
- [x] T051 [P] [US3] Add link, QR, capacity, waitlist, and withdrawal browser journeys in tests/e2e/event-registration.spec.ts

### Implementation for User Story 3

- [x] T052 [US3] Create event, court, registration, attendance, join-token, and tenant-aware indexes in supabase/migrations/202609010030_events.sql
- [x] T053 [US3] Create publish, register, withdraw, waitlist-promotion, and lifecycle functions in supabase/migrations/202609010031_event_commands.sql
- [x] T054 [P] [US3] Define event lifecycle, court, and registration schemas in lib/validation/events.ts
- [x] T055 [US3] Implement event and registration Server Actions in lib/actions/events.ts
- [x] T056 [P] [US3] Implement canonical QR representation and safe join-code resolution in app/join/[eventCode]/qr/route.ts and lib/queries/event-join.ts
- [x] T057 [P] [US3] Build event editor, capacity, court, and registration components in components/events/event-form.tsx, components/events/court-editor.tsx, and components/events/registration-status.tsx
- [x] T058 [US3] Implement organizer event list/create/detail pages in app/dashboard/clubs/[clubSlug]/events/page.tsx, app/dashboard/clubs/[clubSlug]/events/new/page.tsx, and app/dashboard/clubs/[clubSlug]/events/[eventId]/page.tsx
- [x] T059 [US3] Implement public join page with terms, capacity, waitlist, and withdrawal states in app/join/[eventCode]/page.tsx

**Checkpoint**: A Club can publish an event and a verified player can register exactly once with
correct capacity or waitlist status.

---

## Phase 6: User Story 4 — Check In and Manage the Queue (Priority: P1)

**Goal**: Track attendance and a fair, durable ready queue with attributable organizer corrections
and convergent private Realtime updates.

**Independent Test**: Check players in/out, join/leave/reorder the queue, reject ineligible states,
drop or duplicate Broadcast messages, reconnect, and converge to the authoritative queue snapshot.

### Tests for User Story 4

- [x] T060 [P] [US4] Add attendance, queue uniqueness, monotonic ordering, concurrency, history, and Realtime RLS tests in supabase/tests/040_queue.test.sql
- [x] T061 [P] [US4] Add queue command, stale-version, and Realtime reconciliation tests in tests/integration/queues/queue-actions.test.ts
- [x] T062 [P] [US4] Add mobile check-in, queue, organizer reorder, disconnect, and cross-tenant journeys in tests/e2e/event-queue.spec.ts

### Implementation for User Story 4

- [x] T063 [US4] Create attendance, queue entry/history, event-version, partial-index, and Broadcast trigger schema in supabase/migrations/202609010040_queue.sql
- [x] T064 [US4] Create transactional check-in, join, leave, and audited reorder functions in supabase/migrations/202609010041_queue_commands.sql
- [x] T065 [P] [US4] Define attendance, queue, and optimistic-version schemas in lib/validation/queues.ts
- [x] T066 [US4] Implement attendance and queue Server Actions with stable error mapping in lib/actions/queues.ts
- [x] T067 [P] [US4] Implement private Broadcast subscription and snapshot reconciliation in lib/realtime/event-operations.ts and components/queues/realtime-queue.tsx
- [x] T068 [P] [US4] Build player queue card and organizer queue board in components/queues/queue-card.tsx and components/queues/queue-board.tsx
- [x] T069 [US4] Implement responsive check-in and queue pages in app/dashboard/clubs/[clubSlug]/events/[eventId]/check-in/page.tsx and app/dashboard/clubs/[clubSlug]/events/[eventId]/queue/page.tsx

**Checkpoint**: Queue history is durable and fair, private updates converge after delivery failure,
and no unavailable or cross-tenant player can enter selection.

---

## Phase 7: User Story 5 — Generate and Assign Balanced Matches (Priority: P1)

**Goal**: Deterministically propose balanced singles/doubles matches and atomically reserve players
and one available court.

**Independent Test**: Given a fixed queue and rule version, produce the same proposal, assign it
once, reject court/player races, and release resources on pre-result cancellation.

### Tests for User Story 5

- [x] T070 [P] [US5] Add deterministic balance-policy unit fixtures for singles and doubles in tests/unit/lib/domain/matchmaking.test.ts
- [x] T071 [P] [US5] Add proposal, participant-count, row-lock, court-conflict, and idempotency database tests in supabase/tests/050_matchmaking.test.sql
- [x] T072 [P] [US5] Add organizer matchmaking and player assignment browser journeys in tests/e2e/matchmaking.spec.ts

### Implementation for User Story 5

- [x] T073 [US5] Create match proposals, matches, participants, court occupancy, and assignment constraints in supabase/migrations/202609010050_matches.sql
- [x] T074 [P] [US5] Implement pure versioned proposal scoring and deterministic tie-breaking in lib/domain/matchmaking.ts
- [x] T075 [US5] Create transactional proposal generation, confirmation, cancellation, and resource-release functions in supabase/migrations/202609010051_matchmaking_commands.sql
- [x] T076 [US5] Implement matchmaking Server Actions and validation in lib/actions/matchmaking.ts and lib/validation/matches.ts
- [x] T077 [P] [US5] Build match proposal, court assignment, and participant assignment components in components/matches/proposal-card.tsx and components/matches/assignment-board.tsx
- [x] T078 [US5] Implement organizer court and match assignment pages in app/dashboard/clubs/[clubSlug]/events/[eventId]/courts/page.tsx and app/dashboard/clubs/[clubSlug]/events/[eventId]/matches/page.tsx

**Checkpoint**: Fixed inputs produce one repeatable assignment and concurrency cannot double-book a
player or court.

---

## Phase 8: User Story 6 — Submit and Confirm a Score (Priority: P1)

**Goal**: Submit valid scores, collect one confirmation from each side, finalize once, and
atomically update immutable competition ledgers and projections.

**Independent Test**: Submit and confirm a ranked singles and doubles result, retry from concurrent
devices, revoke authority before finalization, and verify exactly one audit, Elo, stats, streak,
leaderboard, Trust Score, and resource-release effect.

### Tests for User Story 6

- [x] T079 [P] [US6] Add Elo v1 singles/doubles, precision, rounding, ordering, streak, and tie-break golden fixtures in tests/unit/lib/domain/elo.test.ts and tests/fixtures/elo-v1.json
- [x] T080 [P] [US6] Add result revision, confirmation quorum, all-match contact verification, ranked attestation/subscription, idempotency, append-only audit, and atomic rollback tests in supabase/tests/060_results.test.sql
- [x] T081 [P] [US6] Add ranked/unranked separation and repeated calculation-checksum tests in supabase/tests/061_calculations.test.sql
- [x] T082 [P] [US6] Add score Server Action validation and database error mapping tests in tests/integration/matches/score-actions.test.ts
- [x] T083 [P] [US6] Add two-side confirmation, retry, revoked-role, and ranked/unranked browser journeys in tests/e2e/score-confirmation.spec.ts

### Implementation for User Story 6

- [x] T084 [US6] Create score rules, result revisions, confirmations, official results, Elo ledger, statistics, leaderboard projections, and required indexes in supabase/migrations/202609010060_results_calculations.sql
- [x] T085 [US6] Publish immutable Elo v1 parameters and deterministic numeric helper functions in supabase/migrations/202609010061_elo_v1.sql
- [x] T086 [US6] Create submit, confirm, finalize-on-quorum, projection, Trust Score, audit, idempotency, and resource-release functions in supabase/migrations/202609010062_result_commands.sql
- [x] T087 [P] [US6] Implement the TypeScript Elo v1 reference calculator for fixture parity in lib/domain/elo.ts
- [x] T088 [P] [US6] Define canonical score and confirmation schemas in lib/validation/results.ts
- [x] T089 [US6] Implement result submission and confirmation Server Actions in lib/actions/results.ts
- [x] T090 [P] [US6] Build score entry, confirmation quorum, and finalized-result components in components/matches/score-form.tsx, components/matches/confirmation-status.tsx, and components/matches/result-card.tsx
- [x] T091 [US6] Integrate result controls and resource-release state into app/dashboard/clubs/[clubSlug]/events/[eventId]/matches/page.tsx
- [x] T092 [US6] Add sanitized result/confirmation/calculation Broadcast triggers and client invalidation handling in supabase/migrations/202609010063_result_broadcasts.sql and lib/realtime/event-operations.ts

**Checkpoint**: An eligible result finalizes exactly once after one confirmation per side, and all
ranked effects agree with the immutable Elo fixture and calculation checksum.

---

## Phase 9: User Story 7 — Resolve a Score Dispute (Priority: P1)

**Goal**: Let participants dispute a result and let a source-Club score official or owner
uphold/correct/void it without erasing history.

**Independent Test**: Open a dispute on an old ranked result, verify immediate suspension and
transitive replay, then uphold/correct/void it and reconcile audits, revisions, Trust Score, and
leaderboards.

### Tests for User Story 7

- [x] T093 [P] [US7] Add dispute uniqueness, evidence RLS, immediate suspension, transitive replay, resolution authority, and immutable revision tests in supabase/tests/070_disputes.test.sql
- [x] T094 [P] [US7] Add dispute and evidence upload/download action tests in tests/integration/disputes/dispute-actions.test.ts
- [x] T095 [P] [US7] Add player dispute and Club score-official uphold/correct/void browser journeys in tests/e2e/disputes.spec.ts

### Implementation for User Story 7

- [x] T096 [US7] Create dispute, correction revision, evidence metadata, calculation replay, and audit indexes in supabase/migrations/202609010070_disputes.sql
- [x] T097 [US7] Create participant dispute-open and Club score-official resolution functions with synchronous suspension/replay in supabase/migrations/202609010071_dispute_commands.sql
- [x] T098 [P] [US7] Define dispute, correction, evidence, and resolution schemas in lib/validation/disputes.ts
- [x] T099 [US7] Implement dispute and resolution Server Actions in lib/actions/disputes.ts
- [x] T100 [P] [US7] Implement authorized signed evidence upload/download handlers in app/api/storage/evidence/upload-url/route.ts and app/api/storage/evidence/[objectId]/route.ts
- [x] T101 [P] [US7] Build dispute form, evidence list, revision history, and resolution components in components/matches/dispute-form.tsx and components/matches/dispute-resolution.tsx
- [x] T102 [US7] Implement Club dispute queue and result-history pages in app/dashboard/clubs/[clubSlug]/events/[eventId]/disputes/page.tsx and app/(public)/matches/[matchId]/page.tsx
- [x] T103 [US7] Add dispute/calculation Broadcast invalidations and leaderboard freshness reconciliation in lib/realtime/event-operations.ts and lib/queries/leaderboards.ts

**Checkpoint**: Disputed results have no ranked effect while open; every resolution is attributable,
correctable, and deterministically replayed.

---

## Phase 10: User Story 8 — View a Public Player Profile and Match History (Priority: P2)

**Goal**: Publish privacy-safe player statistics and paginated ranked/unranked match history with
visible correction status.

**Independent Test**: View profiles with no, ranked, unranked, disputed, and corrected history;
reconcile every displayed value to safe projections and prove private Club/account data is absent.

### Tests for User Story 8

- [x] T104 [P] [US8] Add public profile/history projection, field-denial, filter, and pagination RLS tests in supabase/tests/080_public_profiles.test.sql
- [x] T105 [P] [US8] Add player-profile query, empty-state, and history-filter tests in tests/integration/profiles/player-profile.test.ts
- [x] T106 [P] [US8] Add anonymous profile discovery and match-history browser journeys in tests/e2e/player-profiles.spec.ts

### Implementation for User Story 8

- [x] T107 [US8] Create privacy-safe public player, statistics, and match-history views with supporting indexes in supabase/migrations/202609010080_public_profiles.sql
- [x] T108 [P] [US8] Implement paginated public player and match-history server queries in lib/queries/players.ts and lib/queries/matches.ts
- [x] T109 [P] [US8] Build profile summary, statistics, history filters, and correction badges in components/profiles/profile-header.tsx, components/profiles/stat-grid.tsx, and components/profiles/match-history.tsx
- [x] T110 [US8] Implement public player profile page and metadata in app/(public)/players/[playerSlug]/page.tsx
- [x] T111 [US8] Implement public match detail page with ranked class and revision/dispute status in app/(public)/matches/[matchId]/page.tsx
- [x] T112 [US8] Implement accessible empty, error, and paginated loading states in app/(public)/players/[playerSlug]/loading.tsx and components/profiles/profile-states.tsx

**Checkpoint**: Public profiles explain the trusted record without exposing contact, membership,
attendance, evidence, moderation, or private Club data.

---

## Phase 11: User Story 9 — Browse Club and Overall Leaderboards (Priority: P2)

**Goal**: Display deterministic overall and source-Club leaderboards ordered by Elo v1 and
published tie-break rules.

**Independent Test**: Replay a fixed multi-Club fixture, verify one canonical overall entry per
player, source-Club-only Club boards, deterministic ties, and synchronized correction updates.

### Tests for User Story 9

- [x] T113 [P] [US9] Add overall/Club scope, eligibility, deterministic rank, tie-break, and calculation-version database tests in supabase/tests/090_leaderboards.test.sql
- [x] T114 [P] [US9] Add leaderboard query, filter, pagination, and stale-calculation tests in tests/integration/leaderboards/leaderboard-queries.test.ts
- [x] T115 [P] [US9] Add public overall/Club leaderboard and correction-refresh browser journeys in tests/e2e/leaderboards.spec.ts

### Implementation for User Story 9

- [x] T116 [US9] Create safe overall and source-Club leaderboard views, rank indexes, and ruleset metadata in supabase/migrations/202609010090_leaderboards.sql
- [x] T117 [P] [US9] Implement leaderboard server queries, calculation-version polling, and CSV export serialization in lib/queries/leaderboards.ts and lib/domain/leaderboard-export.ts
- [x] T118 [P] [US9] Implement validated public leaderboard CSV Route Handler in app/api/exports/leaderboard/route.ts
- [x] T119 [P] [US9] Build leaderboard scope filters, rules disclosure, rank table, and freshness indicator in components/leaderboards/leaderboard-table.tsx and components/leaderboards/leaderboard-rules.tsx
- [x] T120 [US9] Implement overall leaderboard page in app/(public)/leaderboards/page.tsx
- [x] T121 [US9] Implement source-Club leaderboard on the public Club page in app/(public)/clubs/[clubSlug]/page.tsx
- [x] T122 [US9] Add cached-read invalidation and 10-second freshness instrumentation in lib/queries/leaderboards.ts and lib/observability/competition.ts

**Checkpoint**: Repeated calculation produces identical overall and Club rank/checksum outputs, and
public pages show the same calculation version as player profiles.

---

## Phase 12: User Story 10 — Operate Events on Mobile Devices (Priority: P2)

**Goal**: Make the complete player and organizer courtside journeys accessible and usable on
supported phone-sized viewports without desktop-only steps.

**Independent Test**: Complete player join-to-confirmation and organizer check-in-to-dispute
journeys at representative mobile widths using keyboard/screen-reader semantics and no horizontal
page scrolling.

### Tests for User Story 10

- [x] T123 [P] [US10] Add responsive overflow, focus, label, dialog, live-region, and reduced-motion component tests in tests/unit/components/mobile-accessibility.test.tsx
- [x] T124 [P] [US10] Add mobile player and organizer journey projects with accessibility scans in tests/e2e/mobile-courtside.spec.ts and tests/e2e/accessibility.spec.ts

### Implementation for User Story 10

- [x] T125 [P] [US10] Implement mobile bottom navigation, event action tray, and responsive desktop sidebar in components/layout/mobile-nav.tsx, components/events/event-action-tray.tsx, and components/layout/club-sidebar.tsx
- [x] T126 [P] [US10] Apply mobile-first responsive composition to registration, queue, court, assignment, score, and dispute components in components/events, components/queues, and components/matches
- [x] T127 [P] [US10] Add accessible focus management, live status announcements, and error summaries in components/ui/focus-manager.tsx and components/ui/form-error-summary.tsx
- [x] T128 [US10] Add route-specific mobile loading, error, and offline-stale states in app/join/[eventCode]/loading.tsx and app/dashboard/clubs/[clubSlug]/events/[eventId]/error.tsx
- [x] T129 [US10] Add installable icons, viewport metadata, and courtside theme behavior in app/manifest.ts and app/layout.tsx
- [x] T130 [US10] Verify representative mobile performance budgets and record results in tests/performance/mobile-courtside.md

**Checkpoint**: All primary player and organizer courtside controls are usable at supported mobile
widths and meet accessibility and performance gates.

---

## Phase 13: User Story 11 — Report and Moderate Harmful Content (Priority: P2)

**Goal**: Let verified players report permitted subjects and let platform administrators apply
audited moderation, duplicate-identity, retention, and Trust Score review workflows without mixing
platform moderation with Club score-dispute authority.

**Independent Test**: Submit a report with private evidence, deny moderation to every Club role,
resolve it as a platform administrator, expire evidence with and without appeal/legal hold, review
a manual Trust Score adjustment, and merge a duplicate while preserving competition provenance.

- [x] T131 [P] [US11] Add report/moderation state, permission, evidence, audit, and Trust Score database tests in supabase/tests/100_moderation.test.sql
- [x] T132 [P] [US11] Add report submission and platform-admin-only moderation action tests in tests/integration/moderation/moderation-actions.test.ts
- [x] T133 [P] [US11] Add player-report, Club-owner-denial, and platform-admin moderation browser journeys in tests/e2e/moderation.spec.ts
- [x] T134 [US11] Create reports, moderation actions, duplicate-review, and private admin indexes/RLS in supabase/migrations/202609010100_moderation.sql
- [x] T135 [US11] Create report, review, moderation, duplicate-merge, and manual Trust Score functions in supabase/migrations/202609010101_moderation_commands.sql
- [x] T136 [P] [US11] Define reporting and moderation validation schemas in lib/validation/reports.ts and lib/validation/moderation.ts
- [x] T137 [US11] Implement reporting and platform-admin moderation Server Actions in lib/actions/reports.ts and lib/actions/moderation.ts
- [x] T138 [P] [US11] Build player report and evidence components in components/reports/report-form.tsx and components/reports/evidence-uploader.tsx
- [x] T139 [P] [US11] Build platform moderation queue, duplicate review, and audit components in components/moderation/report-queue.tsx and components/moderation/duplicate-review.tsx
- [x] T140 [US11] Implement Club reporting entry point and status page in app/dashboard/clubs/[clubSlug]/reports/page.tsx
- [x] T141 [US11] Implement protected platform-admin reports, players, and audit pages in app/admin/reports/page.tsx, app/admin/players/page.tsx, and app/admin/audit/page.tsx
- [x] T142 [P] [US11] Add retention deadline, appeal, legal-hold, expired-object cleanup, and deletion-audit database tests in supabase/tests/101_evidence_retention.test.sql
- [x] T143 [P] [US11] Add Trust Score privacy, non-ranking isolation, history, review, idempotency, and compensation tests in supabase/tests/102_trust_score.test.sql and tests/integration/moderation/trust-score.test.ts
- [x] T144 [US11] Add evidence retention, appeal/legal-hold, and audited cleanup functions in supabase/migrations/202609010102_evidence_retention.sql
- [x] T145 [US11] Add Trust Score review-request schema and platform-admin decision functions in supabase/migrations/202609010103_trust_score_reviews.sql
- [x] T146 [US11] Implement player Trust Score history/review and administrator decision Server Actions in lib/actions/trust-score.ts
- [x] T147 [P] [US11] Build private Trust Score history/review UI and scheduled evidence-cleanup handler in components/profiles/trust-score-history.tsx, app/dashboard/profile/trust-score/page.tsx, and app/api/internal/evidence-retention/route.ts

**Checkpoint**: Authenticated players can report content, Club roles cannot moderate the platform,
and every administrator action is attributable and reversible where applicable.

---

## Phase 14: Polish and Cross-Cutting Concerns

**Purpose**: Complete observability, seed coverage, deployment safety, documentation, and final
constitutional verification.

- [x] T148 [P] Add deterministic multi-Club demo identities, events, queues, matches, disputes, reports, Trust Score reviews, retention states, and projection checksums in supabase/seed.sql
- [x] T149 [P] Add application error, latency, Realtime, finalization, replay, retention, and freshness telemetry in lib/observability/app.ts and lib/observability/competition.ts
- [x] T150 [P] Add health endpoint without tenant or schema disclosure in app/api/health/route.ts
- [x] T151 Add rate limits, origin checks, content-type limits, and safe error redaction to Route Handlers in lib/security/request-guards.ts
- [x] T152 Add production environment validation and service-role bundle guards in lib/env.ts and scripts/check-client-secrets.mjs
- [x] T153 Add migration drift, clean reset, generated-type drift, retention cleanup, and recovery verification in scripts/verify-migrations.sh
- [x] T154 Add repeated replay, correction, duplicate-event, ranked-separation, Trust Score isolation, and cross-Club regression suite in supabase/tests/110_competition_regression.test.sql
- [x] T155 [P] Add Playwright preview smoke tests for authentication, queue, finalization, dispute, leaderboard, Trust Score review, and moderation in tests/e2e/preview-smoke.spec.ts
- [x] T156 [P] Document local commands, demo users, architecture boundaries, retention, and deployment workflow in README.md
- [x] T157 [P] Document Elo v1, leaderboard eligibility/ties, audit/correction, Trust Score, and privacy rules in docs/competition-rules.md
- [x] T158 Validate every quickstart workflow and record evidence in specs/001-club-leaderboard/quickstart-validation.md
- [ ] T159 Run the complete lint, typecheck, Vitest, database/RLS, build, Playwright, accessibility, retention, and migration gates defined in .github/workflows/ci.yml

**Checkpoint**: The complete application satisfies the specification, plan, constitution, security
boundaries, mobile targets, and deployment gates.

---

## Dependencies and Execution Order

### Phase Dependencies

- Setup (Phase 1) has no dependencies.
- Foundational (Phase 2) depends on Setup and blocks every user story.
- US1 and US2 can begin after Foundational using seeded counterpart fixtures.
- US3 depends on US2 for organizer Club authority and on US1 for verified player registration.
- US4 depends on US3 event registration and attendance.
- US5 depends on US4 queue state and US3 court definitions.
- US6 depends on US5 match assignments, US1 ranked eligibility, and US2 official Club authority.
- US7 depends on US6 official results and calculation replay.
- US8 depends on US6 safe result/stat projections; correction badges additionally use US7.
- US9 depends on US6 calculation projections; correction freshness additionally uses US7.
- US10 integrates US3–US7 primary courtside workflows and may start component work earlier.
- US11 depends on Foundational identity/Storage/audit; full subject coverage uses US2, US6, and US8.
- Polish depends on all desired stories, including US11.

### User Story Dependency Graph

```text
Foundation
├── US1 Verified Player ─┐
└── US2 Club Access ─────┴── US3 Events ── US4 Queue ── US5 Matchmaking ── US6 Scores
                                                                      ├── US7 Disputes
                                                                      ├── US8 Profiles
                                                                      └── US9 Leaderboards
US3–US7 ── US10 Mobile
Foundation + US2 + US6 + US8 ── US11 Reporting/Moderation
All selected increments ── Polish
```

### Within Each User Story

- Write and run story tests first; confirm failures correspond to missing behavior.
- Apply schema/migrations before Server Actions that call their functions.
- Implement pure domain rules before transactional functions that depend on fixtures.
- Implement Server Actions/queries before pages and client interaction components.
- Complete the independent test before starting the next sequential dependency.

### Parallel Opportunities

- Setup tasks T003–T006 and T008–T010 target independent configuration or UI files.
- Foundational tests T011–T014 and implementation tasks T021, T023–T026 can proceed in parallel
  after their direct schema prerequisites.
- Within every story, database, integration, and E2E test files can be drafted in parallel.
- Pure validation, query, and component tasks marked [P] can proceed once their contracts are fixed.
- US8 and US9 can run in parallel after US6; US10 responsive components can overlap US7–US9.
- US11 reporting, moderation, retention, and Trust Score UI can run in parallel after their
  migration/action contracts exist.

## Parallel Execution Examples

### US1

```text
T030 database identity tests | T031 action tests | T032 browser tests
T034 validation schemas | T036 registration components
```

### US2

```text
T039 Club/RLS tests | T040 action tests | T041 browser tests
T043 validation | T045 webhook | T046 components
```

### US3

```text
T049 event database tests | T050 action tests | T051 browser tests
T054 validation | T056 QR handler | T057 components
```

### US4

```text
T060 queue database tests | T061 reconciliation tests | T062 mobile browser tests
T065 validation | T067 Realtime client | T068 components
```

### US5

```text
T070 balance fixtures | T071 concurrency tests | T072 browser tests
T074 pure matchmaking | T077 proposal components
```

### US6

```text
T079 Elo fixtures | T080 result transaction tests | T081 separation tests
T082 action tests | T083 browser tests
T087 TypeScript Elo | T088 validation | T090 components
```

### US7

```text
T093 dispute/replay tests | T094 action tests | T095 browser tests
T098 validation | T100 evidence handlers | T101 components
```

### US8

```text
T104 public projection tests | T105 query tests | T106 browser tests
T108 queries | T109 components
```

### US9

```text
T113 leaderboard database tests | T114 query tests | T115 browser tests
T117 queries/export | T118 Route Handler | T119 components
```

### US10

```text
T123 component accessibility tests | T124 mobile E2E
T125 navigation | T126 responsive domains | T127 accessibility helpers
```

### US11

```text
T131 moderation tests | T132 action tests | T133 browser tests
T136 validation | T138 report UI | T139 admin UI | T142 retention tests | T143 Trust Score tests
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete US1 and prove canonical verified/attested identity.
3. Stop and validate US1 independently.

US1 is the smallest trusted-data MVP. A usable Club competition MVP requires the sequential slice
US1 → US2 → US3 → US4 → US5 → US6; US7 is required before ranked launch because corrections are
non-negotiable.

### Incremental Delivery

1. Identity and Club authority: US1 + US2.
2. Event operations: US3 + US4.
3. Play generation: US5.
4. Trusted ranked record: US6 + US7.
5. Public value: US8 + US9.
6. Courtside usability: US10.
7. Reporting/moderation, retention, Trust Score review, and production polish.

Each increment must pass its independent test and preserve all earlier RLS, audit, ranked
separation, and deterministic calculation fixtures.

## Notes

- [P] means different files and no dependency on an incomplete task in the same phase.
- User-story labels map exactly to the eleven stories in spec.md.
- Tests precede implementation and must fail for the expected missing behavior.
- Use request-user sessions for ordinary work; service-role access is restricted to controlled
  seed, webhook, migration, and administration paths.
- Never bypass transactional functions for official results, ratings, disputes, or Trust Score.
- Never introduce FastAPI, Swagger, or a separate application backend.
