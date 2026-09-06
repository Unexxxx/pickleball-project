# Implementation Plan: Pickleball Club Competition and Leaderboards

**Branch**: `001-club-leaderboard` | **Date**: 2026-09-01 | **Spec**:
[spec.md](./spec.md)  
**Input**: Feature specification from
`/specs/001-club-leaderboard/spec.md`

## Summary

Build a responsive, multi-tenant pickleball competition application as one Next.js App Router
codebase deployed to Vercel and backed by Supabase PostgreSQL, Auth, Storage, and Realtime. Server
Components read data; Server Actions handle first-party UI mutations; Route Handlers expose
webhook, QR, download, and integration-safe HTTP boundaries. Security-critical and
leaderboard-critical changes execute through versioned transactional PostgreSQL functions so
authorization, idempotency, audit history, Elo updates, statistics, disputes, and Trust Score
adjustments commit atomically.

The MVP has no FastAPI, Swagger, separate application backend, anonymous ranked participants, or
third-party sports-data dependency.

## Technical Context

**Language/Version**: TypeScript 5.x in strict mode; SQL/PL/pgSQL on PostgreSQL 17-compatible
Supabase; Node.js 22 LTS  
**Primary Dependencies**: Next.js App Router 16.x, React 19.x, Tailwind CSS 4.x, shadcn/ui,
`@supabase/ssr`, `@supabase/supabase-js`, Zod, React Hook Form where complex client forms need it,
Vitest, Testing Library, Playwright, Supabase CLI  
**Storage**: Supabase PostgreSQL for domain and audit data; Supabase Auth for sessions and verified
contact ownership; private Supabase Storage buckets for dispute evidence and club assets;
Supabase Realtime private Broadcast channels for queue, court, assignment, confirmation, and
dispute invalidations  
**Testing**: Vitest for deterministic domain units and component behavior; pgTAP/Supabase database
tests for functions, constraints, grants, and RLS; Playwright for authenticated mobile and desktop
journeys; migration reset and seed validation in CI  
**Target Platform**: Responsive web application on Vercel; evergreen mobile and desktop browsers;
Supabase managed services in the same primary region as Vercel functions  
**Project Type**: Single full-stack web application with database-owned transactional domain rules  
**Performance Goals**: User-visible queue actions in ≤2 seconds for 95% of accepted operations;
match generation and confirmation in ≤30 seconds; finalized/corrected leaderboard effects visible
within 10 seconds at 500 participants and 2,000 event matches; public profile and leaderboard
server reads target p95 ≤1 second excluding client network latency  
**Constraints**: One canonical Player and Club model; RLS on every exposed table; no service-role
key in clients; no direct client writes to official match, rating, statistic, audit, moderation, or
Trust Score tables; official mutations are idempotent and transactional; ranked and unranked paths
remain explicit; moderation is platform-admin-only; mobile-first and WCAG 2.2 AA target; no
FastAPI, Swagger, separate backend, or authoritative third-party sports platform; private dispute
and report evidence expires 90 days after resolution unless appealed or legally held  
**Scale/Scope**: MVP target of 100,000 player identities, 2,000 clubs, 10,000 events, and 2 million
matches; up to 500 participants, 100 courts, and 2,000 matches per event; 10 primary product domains
plus reporting, moderation, testing, and deployment

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **PASS — Canonical models and identity**: `players` is global and one-to-one with a verified
  Auth identity. Every organization is a `clubs` row; `club_memberships` links rather than
  duplicates players. Every match function requires verified contact ownership; ranked functions
  additionally require active Club identity attestation.
- **PASS — Official-record authority**: The official finalization function locks the match and
  club, verifies active subscription and actor role, and rejects all ineligible participants.
  Ranked state is explicit and never inferred from UI state.
- **PASS — Audit and correction**: Append-only audit and result-revision rows preserve actor,
  reason, before/after values, and rule version. Dispute functions suspend ranked effects and
  rebuild affected projections transactionally.
- **PASS — Deterministic calculations**: Versioned Elo rules use fixed numeric precision, canonical
  result ordering, explicit singles/doubles team derivation, and stored calculation events.
  Rebuild functions replay eligible results in the same order.
- **PASS — Security and privacy**: RLS plus least-privilege grants isolate Club rows. SECURITY
  DEFINER functions use fixed `search_path`, re-check `auth.uid()`, and expose narrow execute
  grants. Platform moderation uses a server-owned administrator table, never user metadata.
  Sensitive evidence has explicit retention deadlines, appeal/legal-hold exceptions, private
  access, and audited deletion.
- **PASS — Quality attributes**: Mobile route layouts, accessible controls, pagination, index
  targets, and measurable latency/scale gates are specified.
- **PASS — Testing**: Unit fixtures cover Elo, stats, streaks, ranking, Trust Score, and balancing.
  Database and E2E suites cover authorization, RLS isolation, official finalization, duplicate
  requests, corrections, Realtime convergence, and mobile workflows.
- **PASS — Data independence**: Supabase stores first-party canonical identities and competition
  records; optional notification or evidence services cannot block core workflows.

**Post-design re-check**: PASS. The data model, contracts, and quickstart preserve every gate.
No constitutional exception or complexity waiver is required.

## Architecture and Data Flow

1. Server Components create a request-scoped Supabase server client using the user's cookies and
   query RLS-protected tables or safe public views.
2. Interactive Client Components are limited to forms, dialogs, queue/score controls, Realtime
   subscriptions, and optimistic display state. They never receive service credentials.
3. Server Actions validate input with shared schemas, authenticate the user, call narrow database
   functions, translate domain error codes, and revalidate affected paths/tags.
4. Route Handlers are reserved for stable HTTP boundaries: auth callback, QR representation,
   signed evidence upload/download, exports, subscription webhook, and health checks. They call the
   same application services/database functions as Server Actions.
5. Ordinary club/event writes use RLS-protected statements where one row is sufficient. Multi-row
   or integrity-critical workflows call transactional PostgreSQL functions.
6. Database triggers send minimal invalidations to private Club/Event Realtime Broadcast topics.
   Channel authorization uses Realtime RLS; every payload is treated as a hint and reconciled with
   an authorized server read.

## Database and Migration Strategy

- Store timestamped, forward-only SQL migrations in `supabase/migrations/`; never edit an applied
  migration. Each feature migration includes tables/types, constraints/indexes, grants/RLS,
  functions/triggers, comments, and its rollback/recovery note.
- Enable RLS on every table in exposed schemas. Revoke default broad `anon` and `authenticated`
  grants, then grant only required operations. Keep sensitive internals in a non-exposed
  `private` schema when direct Data API access is unnecessary.
- Use UUID primary keys, `timestamptz` UTC timestamps, `numeric` for Elo/Trust Score arithmetic,
  enum/check-constrained states, foreign keys, and unique partial indexes for active-state
  invariants.
- Build migrations in dependency order: extensions/types/helpers; identities/clubs/RBAC;
  events/attendance/queues/courts; matches/results; ratings/statistics/leaderboards; disputes/audit;
  reports/moderation/storage; Realtime authorization/triggers; seed fixtures.
- Validate every migration with `supabase db reset`, database tests, generated types, and a
  production-like data smoke test before `supabase db push`.
- Recovery uses Supabase backups/PITR for infrastructure loss and compensating forward migrations
  for application schema changes. Rating-rule changes create a new immutable rule version and a
  bounded replay job rather than overwriting old calculation history.

## Permission and RLS Strategy

- **Public/anon**: Select only published club/event summaries, safe player profiles, safe official
  match history, and leaderboard projections through explicitly safe views.
- **Player/authenticated**: Select/update own account preferences; register/check in/queue where
  eligible; read participant-visible assignments; submit/confirm/dispute own matches through
  checked functions.
- **Club member**: Read only membership-visible rows for clubs where membership is active.
- **Organizer**: Manage events, registrations, attendance, queues, courts, and match proposals for
  an authorized club. Cannot finalize ranked calculations except through official functions.
- **Score official**: Attest identity and resolve score disputes for an authorized subscribed club.
- **Club owner**: Manage Club details, memberships, roles, and subscription-visible state. Cannot
  grant platform-admin powers.
- **Platform administrator**: Review reports, merge duplicate identities, apply moderation status,
  and make manual Trust Score adjustments through separately audited functions.
- Membership and role checks read current database rows rather than stale JWT membership arrays.
  Platform administration reads `private.platform_admins` from fixed-search-path functions.

## Transactional Domain Functions

- `submit_match_result(match_id, score, idempotency_key)`: validates participant/actor/state,
  creates one pending result revision, and audits the submission.
- `confirm_match_result(result_id, idempotency_key)`: records one participant confirmation and
  invokes finalization after one player on each side confirms.
- `finalize_match_result(result_id)`: locks result/match/club/player rows, revalidates verified
  identities, attestation, subscription, authority, ranked classification, and score; writes the
  official result; appends audit/calculation events; applies Elo/statistics/streak/leaderboard and
  Trust Score updates; releases players/court; commits once.
- `open_result_dispute(result_id, reason, evidence_refs)`: locks result, marks disputed, suspends
  its ranked eligibility, audits the action, and rebuilds affected projections before commit.
- `resolve_result_dispute(dispute_id, resolution, corrected_score, reason)`: platform-neutral
  club score-official workflow to uphold/correct/void, add a result revision, replay affected
  ranked history, adjust Trust Score by versioned reason code, and audit.
- `rebuild_player_competition_state(player_ids, from_occurred_at)`: advisory-lock-protected,
  deterministic replay ordered by `occurred_at, finalized_at, match_id`; updates projections from
  immutable official/calculation events.
- `adjust_trust_score(player_id, reason_code, delta, source_id)`: callable only from approved
  domain functions or audited platform-admin moderation; clamps values to the configured range and
  preserves an immutable ledger.
- Every callable function rejects a caller-supplied actor/tenant identity, derives `auth.uid()`,
  uses explicit authorization helpers, has a fixed `search_path`, and returns stable domain error
  codes.

## Realtime Design

- Emit version-only invalidations for `queue_entries`, `courts`, `match_assignments`,
  `result_confirmations`, and `disputes` to private Broadcast topics; never broadcast private
  audit values, evidence, contact data, or full rows.
- Subscribe by private event/club topics already authorized by Realtime RLS. Use one channel per
  active event, unsubscribe on navigation, and debounce refresh bursts.
- Client state may optimistically display a requested queue action but becomes authoritative only
  after the mutation response and reconciled server snapshot.
- Track monotonically increasing `version` values on queue and court projections. On gaps,
  reconnects, or authorization changes, discard local order and refetch the server snapshot.
- Leaderboards are not streamed row-by-row; finalization invalidates cached server reads, and the
  UI polls/revalidates until the new calculation version is visible within the 10-second target.

## Responsive Page Structure

```text
app/
├── (public)/
│   ├── page.tsx
│   ├── clubs/[clubSlug]/page.tsx
│   ├── players/[playerSlug]/page.tsx
│   ├── leaderboards/page.tsx
│   └── matches/[matchId]/page.tsx
├── (auth)/
│   ├── sign-in/page.tsx
│   ├── register/page.tsx
│   ├── verify/page.tsx
│   └── callback/route.ts
├── join/[eventCode]/page.tsx
├── dashboard/
│   ├── page.tsx
│   ├── profile/page.tsx
│   └── clubs/[clubSlug]/
│       ├── page.tsx
│       ├── members/page.tsx
│       ├── reports/page.tsx
│       └── events/
│           ├── page.tsx
│           ├── new/page.tsx
│           └── [eventId]/
│               ├── page.tsx
│               ├── check-in/page.tsx
│               ├── queue/page.tsx
│               ├── courts/page.tsx
│               ├── matches/page.tsx
│               └── disputes/page.tsx
└── admin/
    ├── reports/page.tsx
    ├── players/page.tsx
    └── audit/page.tsx
```

Mobile layouts use bottom navigation and full-screen sheets for player event actions; desktop Club
operations use a sidebar and dense responsive tables. Queue, court, and match cards remain the
canonical component units at every breakpoint. Server-rendered empty/error/loading states use
route-level `loading.tsx`, `error.tsx`, `not-found.tsx`, and accessible live regions.

## Reporting and Moderation

- Players may report a public profile, match, club, or abusive content with a reason and optional
  evidence. Club score disputes remain a separate competition workflow.
- Reports enter `open → reviewing → actioned|dismissed`; only active platform administrators may
  claim, resolve, or reopen them.
- Moderation may restrict public visibility, suspend account access, merge adjudicated duplicate
  identities, or apply a versioned Trust Score adjustment. It cannot silently rewrite official
  results; competition changes must use dispute/correction functions.
- Evidence lives in a private Storage bucket with owner/upload policies and short-lived signed
  access for the assigned platform administrator. Audit records store object references, not
  public URLs.
- Report and dispute evidence receives a retention deadline 90 days after final resolution.
  Appeals and legal holds pause deletion. A protected scheduled server job claims eligible rows,
  deletes Storage objects, then finalizes non-sensitive deletion audits transactionally.
- Duplicate-identity review is an explicit moderation lifecycle. An approved merge repoints domain
  references transactionally to one surviving canonical Player and never deletes official result,
  revision, calculation, or audit provenance.

## Trust Score Boundaries

- Trust Score starts at 50, is clamped to 0–100, is visible only to the player and platform
  administrators, and never affects Elo, leaderboards, matchmaking, or public profiles.
- Automatic adjustments occur only within approved result/dispute transactions and use immutable,
  versioned reason-code ledger entries. Manual adjustments require a platform administrator,
  reason, and source. Reversals are compensating entries.
- Players may inspect their own adjustment history and request review of a manual adjustment.
  Review decisions are platform-admin-only and append audit and, when needed, compensating entries.

## Testing Strategy

- **Unit/Vitest**: Elo singles/doubles fixtures, expected score, rounding, streaks, win rate,
  leaderboard ties, matchmaking determinism, queue ordering, state reducers, validation schemas,
  Trust Score reason rules, and accessible component states.
- **Database integration**: constraints, indexes, function error codes, concurrent finalization,
  idempotency, replay determinism, audit append-only enforcement, ranked/unranked separation,
  subscription/role revocation, dispute suspension, correction/void replay, storage policies, and
  allow/deny RLS matrices for anon/player/club roles/platform admin; evidence retention, legal
  holds, deletion audits, Trust Score isolation, and Trust Score review/compensation.
- **App integration/Vitest**: Server Action authentication/authorization, input validation,
  database-function mapping, cache invalidation, and safe error translation with Supabase clients
  mocked only at the network boundary.
- **E2E/Playwright**: registration/verification/attestation; club setup/RBAC; event link and QR;
  capacity/waitlist; mobile check-in/queue; singles/doubles assignment; two-side confirmation;
  duplicate submission; dispute and recalculation; profile/history; club/overall leaderboards;
  cross-tenant denial; reports and platform-admin-only moderation.
- Run deterministic fixtures against fresh local migrations. CI fails on any leaderboard-critical,
  RLS, audit, or migration test regression.

## Deployment and Operations

- Vercel environments map to isolated Supabase projects or branches. Preview environments never
  point to production data. Environment validation fails builds missing public URL/key or
  server-only webhook secrets.
- CI stages: format/lint/typecheck → Vitest → Supabase reset/database tests → production build →
  Playwright → migration drift check. Production deploy requires all gates and an approved
  migration review.
- Apply backward-compatible database migrations before application deployment; defer destructive
  cleanup to a later verified migration. Provide a forward recovery migration and calculation
  replay command for each ruleset/schema change.
- Monitor Vercel function errors/latency and Supabase database health, slow queries, Realtime
  connections, auth failures, denied RLS operations, finalization failures, replay duration, and
  leaderboard freshness. Alerts must not contain private score evidence or contact data.
- Seed scripts are deterministic and environment-guarded. Production execution is refused unless
  an explicit safe mode inserts only reference data.

## Project Structure

### Documentation (this feature)

```text
specs/001-club-leaderboard/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── actions.md
│   ├── database-functions.md
│   └── realtime-events.md
└── tasks.md
```

### Source Code (repository root)

```text
app/                         # App Router pages, layouts, loading/error states, route handlers
├── (public)/
├── (auth)/
├── join/
├── dashboard/
└── admin/
components/
├── ui/                      # shadcn/ui primitives
├── auth/
├── clubs/
├── events/
├── queues/
├── matches/
├── leaderboards/
├── profiles/
├── reports/
└── moderation/
lib/
├── actions/                 # Server Actions by domain
├── auth/                    # Session and authorization helpers
├── domain/                  # Shared pure rules and error vocabulary
├── queries/                 # Server-only read functions
├── supabase/                # Browser/server/admin clients and generated types
└── validation/              # Shared Zod schemas
supabase/
├── migrations/
├── seed.sql
├── tests/
└── config.toml
tests/
├── unit/
├── integration/
├── e2e/
└── fixtures/
public/
└── icons/
```

**Structure Decision**: Use one Next.js App Router application as the UI and application boundary,
with Supabase PostgreSQL as the transactional domain authority. This satisfies the no-separate-
backend constraint while keeping database rules, UI orchestration, and tests in cohesive domains.

## Implementation Workstreams

1. **Authentication**: Supabase SSR session handling, contact verification, canonical Player
   provisioning, recovery, identity attestation, protected layouts.
2. **Club management**: Club creation, subscription state, memberships, roles, tenant helpers/RLS.
3. **Events**: Event lifecycle, join codes/QR, capacity/waitlist, attendance, and courts. MVP
   tournaments use these ordinary event flows without brackets, seeding, or advancement.
4. **Queues**: Ready-state transitions, fair ordering, Realtime convergence, organizer overrides.
5. **Matchmaking**: Deterministic singles/doubles candidate scoring and conflict-free assignment.
6. **Score confirmation**: submissions, two-side confirmation, transactional finalization,
   idempotency, audit, Elo/statistics/Trust Score.
7. **Leaderboards**: overall and source-Club projections, rule versions, freshness and replay.
8. **Player profiles**: safe public views, ranked/unranked history, pagination, correction status.
9. **Reporting**: user reports and private Storage evidence.
10. **Moderation**: platform-admin queue, duplicate merge, visibility/account actions, retention,
    Trust Score review, and audit.
11. **Testing**: unit, database integration, application integration, E2E, performance/accessibility.
12. **Deployment**: local Supabase, seed data, CI, preview isolation, migrations, Vercel observability.

## Complexity Tracking

No constitutional violations require justification.
