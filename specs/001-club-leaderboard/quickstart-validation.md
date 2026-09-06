# Quickstart validation evidence

Validated on 2026-09-02 against Node.js 24, Next.js 16, PostgreSQL 17-compatible local Supabase, and the linked hosted Supabase project.

- Install, environment parsing, and development startup: verified.
- Hosted link, migration dry-run, and forward-only push: verified through migration `202609010103_trust_score_reviews.sql`.
- Registration and verified account provisioning: verified in the hosted project.
- Public shell, registration, profiles, leaderboards, event registration, queue, matchmaking, score confirmation, disputes, mobile courtside, reporting, moderation, and accessibility: covered by Playwright workflows.
- Deterministic Elo, ranked/unranked isolation, tenant RLS, audit, Trust Score privacy, evidence retention/legal hold, and idempotency: covered by pgTAP and Vitest.
- Secret scanning, lint, strict typecheck, unit/integration tests, database tests, production build, and browser tests: CI gates.

The local reset command is intentionally separate from hosted operation. It must only target the Docker-backed local database. Hosted environments receive forward migrations with `npx supabase db push` and must never receive demo seed data.
