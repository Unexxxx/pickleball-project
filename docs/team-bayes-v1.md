# Team Bayesian ratings, version 1

## Model

`team-bayes-v1` is a two-team, no-draw Gaussian skill update based on the model described by Herbrich, Minka and Graepel in [TrueSkill (2006)](https://www.microsoft.com/en-us/research/wp-content/uploads/2007/01/NIPS2006_0688.pdf). It is our restricted implementation, not the OpenSkill library or the full TrueSkill product.

Each player has a mean (displayed rating) and sigma (uncertainty). Parameters are mean 1500, initial sigma 350, performance noise beta 175, and per-match dynamics tau 3.5. Sigma is bounded to 35–350 for numerical stability and to avoid permanent overconfidence. Provisional means sigma > 175; this threshold is a product choice, not a scientifically validated match-count guarantee.

Team performance is the sum of independent player performances. Both teams must have equal sizes (singles or doubles), with full participation and no ties. More uncertain players change more in either direction. Lower mean alone does not earn a bigger reward. Updates need not be zero-sum when uncertainty differs. There is no fixed maximum change; provisional updates are deliberately much larger than Elo K=32.

All scores are retained, but only the match winner affects v1. The majority of game wins determines that winner. Margins, partner contribution, inactivity decay, and forfeits are not separately modeled. Administrative/unfinished results should not be submitted as completed ranked scores. Singles and doubles currently share the existing rating pool; separate pools require an explicit future model/migration.

## Results and corrections

An owner, organizer, or score official submitting a score approves it for rating immediately. Participant-only submissions still require both sides' confirmation. No fake player confirmations are created. Existing verified-account, club identity-attestation and subscription requirements remain.

Club edits create a new score revision and replay active official ranked results chronologically, ordered by played_at (fallback assigned_at), then match ID. Suspended/voided results are excluded. Match dates and original scores are preserved. Club leaderboards show the global skill mean with club-scoped wins/losses/streaks.

Every replay creates an immutable run snapshot and per-player, per-match ledger. Projection tables are rebuilt atomically; earlier runs are retained rather than overwritten. Public mutation paths take a shared advisory transaction lock to serialize replay. Full replay is appropriate for the current small test dataset; checkpoints or incremental suffix replay are needed before scaling to large histories.

## Future improvement

Keep `team-bayes-v1` immutable. Introduce a new version, replay the same authoritative revisions into a preview, compare chronological predictions and calibration, then explicitly activate the new version. Do not silently edit parameters or award arbitrary bonus points. Public rating is a mean estimate, not a national/commercial pickleball rating conversion.

The authorized event migration applies only the specified 55 historical matches. New lineups read `player_statistics.rating`, so the next event uses these estimates automatically. Saved Standby/Upcoming lineups are not silently reshuffled when ratings change.

## Validation

- `supabase/tests/130_team_bayes.test.sql`: production-schema score approval, permissions, retry safety, correction, suspension and uncertainty checks.
- `tests/unit/lib/domain/team-bayes.test.ts`: symmetry, equal/different uncertainty, extreme upsets, singles, and invalid input.
- `scripts/preview-team-ratings.mjs EVENT_ID`: read-only, from-1500 event preview for this initial migration. It is not a general cross-event historical preview when other rated events exist.

The 55-match preview leaves all 36 players provisional. Repeated groups provide limited cross-group evidence; later varied teammates/opponents are important.
