# Quickstart: Pickleball Club Competition and Leaderboards

## Prerequisites

- Node.js 22 LTS with npm
- Docker-compatible container runtime
- Supabase CLI
- Git

Do not add FastAPI, Swagger, a separate backend service, or any third-party sports identity/match
provider. The Next.js application and Supabase database are the complete MVP architecture.

## 1. Bootstrap the application

From the repository root:

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir=false --import-alias="@/*"
npx shadcn@latest init
npm install @supabase/ssr @supabase/supabase-js zod react-hook-form
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom \
  @playwright/test supabase
```

If the repository already contains the scaffold when implementation begins, install only missing
dependencies and preserve existing configuration.

## 2. Initialize local Supabase

```bash
npx supabase init
npx supabase start
npx supabase status
```

Create `.env.local` from the local status values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
SUPABASE_DB_URL=<local-direct-database-url>
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUBSCRIPTION_WEBHOOK_SECRET=<local-only-secret>
```

`SUPABASE_SERVICE_ROLE_KEY`, direct database credentials, and webhook secrets are server-only.
Ordinary user reads and mutations must use the request user's session so RLS remains active.

## 3. Apply schema and demo data

```bash
npx supabase db reset
npx supabase test db
npx supabase gen types typescript --local > lib/supabase/database.types.ts
```

The reset applies every file in `supabase/migrations/` and then `supabase/seed.sql`. Seed data is
synthetic and deterministic:

- Northside Pickleball Club: active subscription, published open play, active queue
- Southbay Pickleball Club: inactive subscription, completed tournament-style event
- verified and unverified players, including one multi-club player
- owner, organizer, score official, member, and platform administrator roles
- singles and doubles matches in proposed, pending, finalized, disputed, corrected, and unranked
  states
- Elo ledgers, player/Club/overall projections, Trust Score events, reports, and audit history

Local demo Auth users are created by an environment-guarded seed script. Credentials must be
documented in `supabase/seed/README.md`, must use `.test` addresses, and must never be enabled in
production.

## 4. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:

1. Public player and leaderboard pages render without private Club data.
2. A verified player can join the active demo event and update the queue.
3. Another browser session receives the private Realtime invalidation and reconciles the queue.
4. An organizer can generate and assign a match without double-booking players or courts.
5. One player on each side can confirm a result; finalization changes Elo and leaderboards once.
6. Opening a dispute suspends the result and rebuilds the affected projections.
7. A cross-Club user is denied private event data.
8. A Club owner is denied `/admin`; only the seeded platform administrator may moderate.
9. An unverified account is rejected from ranked and unranked match assignment.
10. Trust Score is private and does not change Elo, matchmaking, public profiles, or leaderboards.
11. Evidence past its 90-day deadline is deleted only when no appeal or legal hold is active, and a
    non-sensitive deletion audit remains.

## 5. Run quality gates

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npx supabase db reset
npx supabase db lint
npx supabase test db
npm run build
npx playwright test --project=chromium
```

Leaderboard-critical fixtures must compare calculation-run and projection checksums across repeated
replays. Database tests must impersonate anonymous, player, cross-tenant, Club-role, and platform-
administrator sessions and verify Trust Score isolation plus retention/legal-hold behavior.

## 6. Migration workflow

```bash
npx supabase migration new <descriptive_name>
npx supabase db reset
npx supabase db diff
```

Keep migrations forward-only. Put grants, RLS, functions, indexes, and rollback/recovery notes with
the schema change. Use expand/migrate/contract releases for destructive changes. Never change an
applied Elo rule version; add a new ruleset and validate bounded replay instead.

## 7. Preview and production

- Use separate Supabase projects or branches for Development, Preview, and Production.
- Configure Vercel Preview with preview-only Supabase credentials and synthetic smoke-test users.
- Apply backward-compatible migrations before deploying dependent application code.
- Require lint, types, Vitest, database/RLS tests, production build, and Playwright to pass.
- Refuse production demo seeding and keep service-role credentials out of all browser bundles.
- After deployment, smoke-test authentication, tenant isolation, event queue convergence, match
  finalization, dispute suspension, leaderboard freshness, reporting, and admin-only moderation.
