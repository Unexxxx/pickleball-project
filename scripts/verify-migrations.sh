#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--remote" ]]; then
  npx supabase db push --dry-run
  exit 0
fi

echo "Verifying a clean LOCAL database reset (never the linked remote project)."
npx supabase db reset --local
npx supabase db lint --local
npx supabase test db

generated="$(mktemp)"
trap 'rm -f "$generated"' EXIT
npx supabase gen types typescript --local > "$generated"
npx prettier --write --parser typescript "$generated" >/dev/null
if ! cmp -s "$generated" lib/supabase/database.types.ts; then
  echo "Generated Supabase types have drifted. Regenerate lib/supabase/database.types.ts." >&2
  exit 1
fi

echo "Retention/legal-hold recovery is verified by the pgTAP suite."
npx supabase migration list --local >/dev/null
echo "Migration, type, retention, and recovery gates passed."
