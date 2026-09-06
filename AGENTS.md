# pickleball-project Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-09-01

## Active Technologies

- TypeScript 5.x in strict mode; SQL/PL/pgSQL on PostgreSQL 17-compatible + Next.js App Router 16.x, React 19.x, Tailwind CSS 4.x, shadcn/ui, (001-club-leaderboard)

## Project Structure

```text
app/
components/
lib/
supabase/
tests/
```

## Commands

npm run lint && npm run typecheck && npm test && npx supabase test db && npx playwright test

## Code Style

TypeScript 5.x in strict mode; SQL/PL/pgSQL on PostgreSQL 17-compatible: Follow standard conventions

## Recent Changes

- 001-club-leaderboard: Added TypeScript 5.x in strict mode; SQL/PL/pgSQL on PostgreSQL 17-compatible + Next.js App Router 16.x, React 19.x, Tailwind CSS 4.x, shadcn/ui,

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
