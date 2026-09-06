# Phase 0 Research: Club Competition and Leaderboards

## Application Architecture

**Decision**: Build a single Next.js App Router application in TypeScript. Use Server Components for authenticated reads, Server Actions for same-origin form mutations, and Route Handlers for Auth callbacks, webhooks, QR/deep-link endpoints, exports, and stable HTTP contracts. Keep all authoritative competition mutations in PostgreSQL functions invoked through the Supabase client; do not add FastAPI, Swagger, or a separate MVP backend.

**Rationale**: This keeps secrets and authorization checks server-side, supports progressively enhanced forms, and avoids duplicating domain logic across application and database services. Request-scoped Supabase clients preserve the caller's JWT so Row Level Security (RLS) applies consistently. Tenant-sensitive responses must not be cached across users.

**Alternatives considered**: Client-only Supabase access was rejected because it expands the browser mutation surface. A separate API service was rejected as unnecessary operational and authorization duplication. Route Handlers for every mutation were rejected because Server Actions are simpler for same-origin UI workflows.

**References**: [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Next.js updating data](https://nextjs.org/docs/app/getting-started/updating-data), [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers).

## Authentication and Canonical Identity

**Decision**: Use Supabase Auth with `@supabase/ssr`, cookie-based PKCE sessions, separate browser/server client factories, and Next.js Proxy for token refresh. Model `auth.users` to `profiles` as one-to-one and link each account to one canonical `players` record. Store authorized-Club identity attestations separately in `identity_attestations`; every match requires verified contact ownership and ranked eligibility additionally requires an active attestation.

**Rationale**: Supabase's SSR pattern supports Server Components, Server Actions, and Route Handlers while maintaining server-visible sessions. Separating account, public profile, canonical player identity, and verification evidence lets a player retain one identity across clubs and makes eligibility auditable.

**Alternatives considered**: Local-storage-only sessions were rejected because server rendering cannot securely rely on them. One player identity per club was rejected because it fragments overall records. JWT-only verification state was rejected because attestations need revocation and history.

**References**: [Supabase SSR client setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/quickstarts/nextjs).

## Tenant Isolation, RBAC, and Platform Moderation

**Decision**: Put a mandatory `club_id` on every tenant-owned operational table and use composite foreign keys such as `(club_id, event_id)` and `(club_id, match_id)` where they prevent cross-club relationships. Model club authorization with `club_memberships` and `club_role_assignments` using `owner`, `organizer`, `score_official`, and `member`. Store platform administrators in a separate non-tenant `platform_admins` table; only that role can perform platform moderation.

**Rationale**: Explicit tenant keys allow every query, constraint, index, and policy to enforce the same boundary. Separate global moderation authority prevents club owners from acquiring platform privileges. Role assignment and revocation remain independently auditable and allow a user to hold different roles in different clubs.

**Alternatives considered**: Inferring the tenant only through joins was rejected because missing joins can leak data. Schema-per-club and database-per-club were rejected as excessive for the MVP. Embedding all roles in JWT claims was rejected because claims can become stale after role revocation.

## Row Level Security and Transaction Boundaries

**Decision**: Enable RLS on every table in an exposed schema and grant `anon` and `authenticated` only the operations they require. Public policies expose only approved profile, ranked-match, and leaderboard projections. Authenticated policies allow private self-service data and require active club membership plus the exact capability for tenant operations. Platform moderation policies require a database check against `platform_admins`.

**Rationale**: Database-enforced authorization protects Server Components, browser subscriptions, and direct Data API calls even when an application query is incorrect. Public projections prevent private event operations, contact data, evidence, and audit details from leaking through broad table policies.

**Alternatives considered**: Application-only authorization and broadly permissive authenticated policies were rejected because they do not provide tenant defense in depth. Security-definer views were rejected because views can bypass underlying RLS unless deliberately configured.

**Decision**: Put reusable authorization predicates and privileged implementation helpers in a
non-exposed `private` schema. Expose only narrow transactional RPC entry points. Where an RPC
requires elevated access, it MUST be `SECURITY DEFINER`, set a fixed minimal `search_path`,
schema-qualify objects, derive and validate `auth.uid()`, revoke `PUBLIC` execution, and grant
only the intended authenticated role; internal helpers remain unexposed.

**Rationale**: Private helpers avoid recursive or repeated membership-policy work without creating
a broadly callable privileged API. Narrow RPC entry points keep validation, row locking,
idempotency, match finalization, Elo/stat updates, disputes, Trust Score adjustments,
recalculation, and audit writes in one PostgreSQL transaction.

**Alternatives considered**: Multi-request application transactions were rejected because
Supabase HTTP calls cannot guarantee one atomic unit. Broad or weakly configured exposed
security-definer RPCs were rejected because they increase the privilege-escalation surface. The
service-role key is reserved for controlled server maintenance or webhook jobs and is never used
for ordinary user requests.

**References**: [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).

## Realtime Queue and Court Updates

**Decision**: Persist queue membership, queue history, court state, and assignments in PostgreSQL as the source of truth. Publish committed changes through Supabase Realtime Broadcast triggers to private topics scoped by club and event. Require Realtime Authorization policies for channel joins, and refetch authoritative rows after reconnects or ambiguous events.

**Rationale**: Broadcast is Supabase's recommended option for scalable and secure database-change delivery. Private tenant/event topics minimize irrelevant traffic, while persisted state and history preserve fairness and recover correctly when a client misses a message.

**Alternatives considered**: Postgres Changes was rejected as the default because it is simpler but less scalable. Polling-only updates were rejected for poorer courtside responsiveness. An ephemeral Realtime-only queue was rejected because it cannot provide durable ordering, auditability, or transactional assignment.

**References**: [Supabase Realtime database changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes), [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization).

## Storage Security

**Decision**: Store dispute evidence and verification artifacts in private Supabase Storage buckets. Namespace object paths by club and resource, keep authoritative object metadata in tenant-owned database rows, and enforce Storage RLS by checking the corresponding membership and resource authorization. Use a separate explicitly public bucket for approved avatars, or signed URLs when public access is not appropriate.

**Rationale**: Storage authorization remains aligned with database tenant boundaries, evidence lifecycle, and moderation rules. Database metadata, not a user-supplied path alone, determines access.

**Alternatives considered**: Public evidence buckets were rejected because URLs could disclose sensitive material. PostgreSQL binary storage was rejected because Storage is better suited to object lifecycle and delivery. Routing every download through a service-role server was rejected as unnecessary privilege and bandwidth concentration.

**References**: [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [Supabase Storage ownership](https://supabase.com/docs/guides/storage/security/ownership).

## Migrations, Constraints, and Indexes

**Decision**: Keep reviewed SQL migrations in `supabase/migrations` and deterministic non-production fixtures in `supabase/seed.sql`. Order migrations by dependency: extensions and enums; identity and clubs; roles and RLS helpers; events and queues; matches and results; rating/stat ledgers and projections; disputes and audit; Storage policies; Realtime triggers. Verify a clean `supabase db reset` and database/RLS tests in CI before deployment.

**Rationale**: A migration-first workflow makes local, preview, staging, and production schemas reproducible and prevents Dashboard drift. Dependency ordering keeps policies and functions deployable from an empty database.

**Alternatives considered**: Dashboard-managed schema and one monolithic migration were rejected because they are difficult to review and reproduce. Production data dumps were rejected as demo seeds because they risk exposing personal data.

**Decision**: Prefix tenant query indexes with `club_id`. Add targeted indexes for `(club_id, user_id)` membership checks; event schedule/status; `(event_id, status, joined_at)` queue order; active court occupancy; result status/finalization time; participant player/match lookup; leaderboard scope and descending rating/tie-breaks; and audit actor/tenant timelines. Use partial unique indexes for one active queue entry per event/player, one active court assignment, one canonical finalization, and one active role assignment.

**Rationale**: These indexes support the predicates used by RLS and the highest-frequency courtside queries. Unique and partial constraints make concurrency invariants enforceable even when requests race or retry.

**Alternatives considered**: Application-side duplicate checks were rejected because they race. Indexing only foreign keys was rejected because it does not cover tenant filters, ordering, and partial-active-state lookups.

**References**: [Supabase local development workflow](https://supabase.com/docs/guides/local-development/cli-workflows), [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations), [PostgreSQL partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html).

## Demo Seed Data

**Decision**: Seed deterministic demo data containing at least two isolated clubs; users with single-club and multi-club memberships; owner, organizer, score-official, member, and platform-admin roles; verified and unverified players; active and inactive subscriptions; published events; registrations, waitlists, and queues; singles and doubles matches; pending confirmations; one finalized ranked sequence; one disputed correction; rating/stat projections; audit entries; and Storage metadata placeholders.

**Rationale**: The seed must demonstrate normal journeys, denial paths, tenant isolation, public/private projections, deterministic Elo replay, dispute suspension, and mobile queue states without using real user information.

**Alternatives considered**: A minimal happy-path seed was rejected because it cannot validate authorization boundaries and corrections. Randomized fixtures were rejected because they make tests and leaderboard expectations unstable. Production-derived fixtures were rejected for privacy and reproducibility reasons.

**References**: [Supabase database seeding](https://supabase.com/docs/guides/local-development/seeding-your-database).

## Deterministic Elo and Projection Replay

**Decision**: Publish Elo v1 with initial rating 1500, scale 400, fixed K=32, arithmetic-mean
doubles team ratings, and half-away-from-zero rounding of the final player delta. Exclude draws,
forfeits, unranked, pending, disputed, and voided results. Replay eligible results in immutable
`played_at, finalized_at, match_id` order. Use rating descending, wins descending, win rate
descending, losses ascending, latest eligible match descending, and player UUID ascending as the
leaderboard order.

**Rationale**: Fixed numeric rules are understandable, independently testable in SQL and
TypeScript, and reproducible after an old result is disputed or corrected. Replay is required
because changing an earlier Elo input propagates through later opponents; subtracting the old
delta would be mathematically incorrect.

**Alternatives considered**: Glicko-2 and provisional K bands were deferred because their extra
uncertainty and inactivity parameters add MVP ambiguity. Binary floating-point calculations and
inverse correction deltas were rejected because they undermine cross-runtime determinism.

## Transactional Competition Commands

**Decision**: Make PostgreSQL the sole writer for official-result state and ranked effects. Narrow
RPCs lock match, result, player, Club, and projection rows in stable order; use request
idempotency plus domain uniqueness; append result revisions and audit records; and commit score
confirmation, finalization, Elo, statistics, streaks, leaderboards, Trust Score, resource release,
and sanitized Realtime invalidations together. Dispute opening synchronously suspends the result
and replays projections; resolution upholds, corrects, or voids through a new revision.

**Rationale**: One transaction prevents partial ratings, duplicate finalizations, stale
authorization, and notifications that precede commit. Immutable ledgers preserve correction
provenance and calculation checksums.

**Alternatives considered**: Multi-step Server Action writes, trigger-only orchestration, mutable
rating columns without a ledger, and asynchronous-only dispute suspension were rejected for race,
audit, and trust failures.

## Testing and Delivery

**Decision**: Use Vitest for pure domain rules and synchronous components, pgTAP/Supabase-client
integration tests for schema, RLS, Storage, functions, concurrency, and atomicity, and Playwright
for authenticated desktop/mobile journeys. CI resets the local Supabase database from migrations
and deterministic seed data before database and browser tests. Vercel Development, Preview, and
Production environments use isolated Supabase projects or branches and expand/migrate/contract
database releases.

**Rationale**: UI tests cannot prove RLS or transaction invariants, while database tests cannot
prove Server Component, responsive, accessibility, and Realtime reconciliation behavior. Layered
tests localize failures and make migrations reproducible before deployment.

**Alternatives considered**: Vitest-only, browser-only, shared hosted test databases, random or
production-derived seeds, and one-step destructive migrations were rejected for coverage,
contention, privacy, or rollback risk.

**References**: [Next.js testing](https://nextjs.org/docs/app/guides/testing),
[Supabase database testing](https://supabase.com/docs/guides/local-development/testing/overview),
[Playwright test guidance](https://playwright.dev/docs/writing-tests), and
[Vercel environments](https://vercel.com/docs/deployments/environments).
