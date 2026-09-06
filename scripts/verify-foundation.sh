#!/usr/bin/env bash
set -euo pipefail
npx supabase db reset
npx supabase test db
npx supabase gen types typescript --local > /tmp/pickleball-database.types.ts
npm run lint
npm run typecheck
npm test
npm run build
