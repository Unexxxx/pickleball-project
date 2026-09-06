# Pickleball Club Competition

A Next.js App Router and Supabase application for verified pickleball identities, Club operations, auditable official results, and deterministic all-time leaderboards. Supabase is the only backend; no third-party sports platform owns identity or match data.

## Run locally against hosted Supabase

1. Copy `.env.example` to `.env.local` and replace every placeholder with the hosted project URL and keys. Generate the two application secrets with `openssl rand -hex 32`.
2. Link the project once with `npx supabase link --project-ref <project-ref>`.
3. Preview pending migrations with `npx supabase db push --dry-run`, then apply them with `npx supabase db push`.
4. Run `npm install` and `npm run dev`, then open `http://localhost:3000`.

Never run `db reset` against a hosted project and never seed production. `SUPABASE_SERVICE_ROLE_KEY`, `SUBSCRIPTION_WEBHOOK_SECRET`, and `INTERNAL_SCHEDULER_SECRET` are server-only.

## Architecture boundaries

Server Components perform reads. Server Actions and Route Handlers accept mutations using the signed-in user's Supabase session. Transactional PostgreSQL functions own finalization, Elo/stat projection, disputes, Trust Score, and audit invariants. RLS provides Club tenant isolation; service-role use is limited to internal retention, signed Storage operations, and verified webhooks.

Realtime messages are private invalidations; clients reconcile against the database. Evidence is retained for 90 days unless an appeal or legal hold blocks deletion. See [competition rules](docs/competition-rules.md) and the [feature quickstart](specs/001-club-leaderboard/quickstart.md).

## Quality and deployment

Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npx supabase test db`, `npm run build`, and `npm run test:e2e`. `scripts/verify-migrations.sh` additionally performs a destructive reset of the **local** Supabase database, lint, type-drift, retention, and migration-recovery checks. Preview and production must use separate Supabase projects; apply backward-compatible migrations before deploying dependent Vercel code.

Synthetic demo accounts and fixtures are local-only and are documented in `supabase/seed/README.md` when enabled. Never reuse them in preview or production.
