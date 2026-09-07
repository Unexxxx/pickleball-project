# Matchmaking v3

The database prepares and saves two lineups: Standby and Upcoming. The queue page displays their saved order without running a second client-side/team selector. Assigning Standby uses the saved sides; Upcoming advances unchanged.

## Selection

- Search combinations and team splits within a pool of up to 12 waiting players, rather than splitting only the first four.
- Prefer players with fewer event appearances and earlier queue positions. Always include the highest-priority candidate. After three skipped reservation opportunities within the candidate pool, a player receives mandatory priority, subject to available slots.
- Consider all teammate/opponent encounters within this event, including active matches. Apply additional penalties to encounters within either player's last three appearances.
- Compare team-average rating, smoothed event win rate, and overall rank percentile. Win rate uses `(wins + 1) / (wins + losses + 2)` from current pending/finalized result revisions. Disputed results do not contribute wins/losses. Official ratings are not modified.
- First minimize excess beyond rating 100, win-rate 0.15, and rank-percentile 0.20 differences. Then minimize recent encounters, repeated teammates, repeated opponents, and remaining balance difference, using waiting order as a tie-breaker.
- Missing ratings default to 1500; missing rank uses the midpoint. New players have a neutral win-rate prior.

These are optimization preferences, not a promise of zero repeats or a hard skill threshold. Small pools, mandatory waiting priority, and manual replacements can require compromises.

## Stability and controls

New arrivals enter the bench without changing saved teams. Checkout removes departed members and repairs affected reservations. Explicit organizer replacements update the saved slot. Bench reordering cannot move reserved players. Existing court, verification, permission, and score rules remain in place. Assignment retries with the same request ID return the same match.

The migration bootstraps currently running events. It does not rewrite historical matches or scores. The web page change must be deployed separately for hosted frontends.

## Regression simulation

`scripts/test-rotation-database.mjs` runs the actual selector/assignment migrations in an isolated PGlite database with a minimal schema and authorization test doubles. It does not replace full Supabase RLS/end-to-end testing.

Run with an installed PGlite module:

```sh
ROTATION_PGLITE_PATH=/absolute/path/to/@electric-sql/pglite/dist/index.js node scripts/test-rotation-database.mjs
```

The 36-player, 55-match fixture produced 55 distinct groups, zero repeated teammate pairs, 16 repeated opponent pairs, and 6–7 games per player. It also verifies preview/assignment parity, retry behavior, checkout repair, late arrivals, bench moves, Upcoming replacements, organizer checks, balanced mixed ratings, and singles selection. These are synthetic results, not a replay of historical scores or a guarantee for every event.
