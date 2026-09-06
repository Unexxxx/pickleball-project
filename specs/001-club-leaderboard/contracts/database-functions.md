# Transactional PostgreSQL Function Contracts

## Common Contract

- Public RPC functions are versioned SQL/PL/pgSQL functions, `SECURITY DEFINER`, with
  `SET search_path = pg_catalog, public, private`. Their owners are non-login migration roles.
- Functions revoke `PUBLIC` execution and grant only to `authenticated`; internal replay helpers
  are not Data API-exposed. Each function derives the actor from `auth.uid()` and resolves club
  scope from locked domain rows. Caller-supplied actor IDs, tenant IDs, ratings, and Trust Scores
  are never authoritative.
- UUID idempotency keys are unique per actor and operation. The transaction stores a request hash
  and result; identical retries return the prior result and mismatched reuse raises
  `IDEMPOTENCY_CONFLICT`.
- Expected domain failures use SQLSTATE `P0001` with a stable code in exception detail. Adapters map
  codes to safe application errors; unexpected messages are not returned to clients.
- Official mutations lock rows in stable UUID order, append immutable audit records, and either
  commit all projections/ledger entries or none. Numeric calculations use fixed precision and an
  immutable ruleset version.

## Public RPCs

### `submit_match_result`

```sql
submit_match_result(p_match_id uuid, p_score jsonb, p_idempotency_key uuid)
returns table(result_id uuid, revision_id uuid, status text, version bigint)
```

Validates actor participation or current club score authority, assigned/completed match state,
score rules, unchanged participants, source club subscription for ranked matches, and absence of a
conflicting result. Inserts a pending result and immutable revision, marks the match awaiting
confirmation, and audits the normalized score.

### `confirm_match_result`

```sql
confirm_match_result(p_result_id uuid, p_revision_id uuid, p_idempotency_key uuid)
returns table(result_id uuid, status text, confirmed_side_a boolean,
              confirmed_side_b boolean, calculation_version bigint, version bigint)
```

Requires the actor to be a participant and the revision to remain current. Upserts one immutable
participant confirmation. Once at least one participant on each side has confirmed the same
revision, invokes finalization in the same transaction.

### `open_result_dispute`

```sql
open_result_dispute(p_result_id uuid, p_reason_code text, p_description text,
                    p_evidence_object_ids uuid[], p_idempotency_key uuid)
returns table(dispute_id uuid, status text, calculation_version bigint, version bigint)
```

Requires a participant-visible result and owned, finalized evidence uploads. Locks the result,
creates one open dispute, marks the result disputed, and immediately removes any ranked effect by
invoking deterministic replay. Audit and Trust Score reason-code effects are atomic.

### `resolve_result_dispute`

```sql
resolve_result_dispute(p_dispute_id uuid, p_resolution text,
                       p_corrected_score jsonb, p_reason text,
                       p_idempotency_key uuid)
returns table(dispute_id uuid, result_id uuid, result_status text,
              revision_id uuid, calculation_version bigint, version bigint)
```

`p_resolution` is `upheld`, `corrected`, or `voided`; corrected score is required only for
`corrected`. Requires a current score official or owner of the source club and active authority.
Preserves the prior revision, appends the decision, recomputes affected history, applies the
versioned Trust Score rule, and closes the dispute.

### `adjust_trust_score`

```sql
adjust_trust_score(p_player_id uuid, p_reason_code text, p_delta numeric(8,2),
                   p_source_id uuid, p_idempotency_key uuid)
returns table(player_id uuid, previous_score numeric(8,2), current_score numeric(8,2),
              ledger_entry_id uuid)
```

Direct calls require an active row in `private.platform_admins`. Approved internal domain
functions call a private helper instead. The reason code controls permitted sign/range; the score
is clamped to the configured bounds and the append-only ledger stores actor, source, before/after,
ruleset, and request ID.

### `request_trust_score_review` and `decide_trust_score_review`

`request_trust_score_review` requires the actor to own the challenged manual-adjustment ledger
entry and creates one active review. `decide_trust_score_review` is platform-admin-only and either
upholds, dismisses, or appends a compensating adjustment. Both retain immutable audit history.

### Evidence retention functions

`claim_expired_evidence(batch_size, claim_token)` is internal scheduler-only and returns private
objects whose 90-day deadline passed without appeal/legal hold. After object deletion,
`finalize_evidence_deletion(evidence_id, claim_token)` removes sensitive path access and appends a
non-sensitive deletion audit. Failed object deletion releases the claim for retry; no function
silently marks an existing object deleted.

## Internal Transaction Functions

### `private.finalize_match_result(p_result_id uuid)`

Returns `{ result_id, official_result_id, calculation_version, version }` to its caller. It is not
granted to API roles. It locks result, match, source club, participants, current statistics, and
court; rechecks confirmations, contact verification, club identity attestations, subscription,
authority, classification, and score. It writes the official result exactly once, rating events,
statistics, leaderboard projections, Trust Score ledger entries, resource release, and audit.

### `private.calculate_elo(p_rule_version text, p_record_class text, p_side_a jsonb, p_side_b jsonb, p_outcome jsonb)`

Pure deterministic calculation returning each player's pre-rating, expected outcome, delta, and
post-rating. Singles uses player rating; doubles derives team rating by the versioned arithmetic
mean. Elo v1 uses initial rating 1500, scale 400, fixed K=32, half-away-from-zero final-delta
rounding, no inactivity decay, and excludes draws/forfeits from ranked effect. It performs no
writes and rejects unknown rule versions.

### `private.apply_competition_projection(p_official_result_id uuid)`

Consumes only an eligible finalized ranked result. Appends immutable rating calculation rows and
updates player statistics, streaks, club leaderboard (source-club results only), overall
leaderboard, and calculation version. A unique result/ruleset key prevents double application.

### `private.rebuild_player_competition_state(p_player_ids uuid[], p_from_occurred_at timestamptz)`

Acquires a scoped advisory lock, expands the affected connected history, clears/rebuilds derived
projections from the earliest affected instant, and replays eligible official results ordered by
`occurred_at, finalized_at, match_id`. Returns `{ calculation_version, players_rebuilt,
results_replayed }`. Immutable source results, revisions, and audits are never deleted.

### `private.update_player_statistics(p_player_id uuid, p_result_id uuid, p_outcome text, p_rule_version text)`

Updates ranked wins/losses, win rate, current and longest streak, last-played timestamp, and
eligibility using fixed formulas. It is called only by apply/rebuild functions and is idempotent by
player/result/ruleset.

### Queue and assignment functions

- `join_event_queue(event_id, idempotency_key)` locks attendance and active queue state, assigns a
  monotonic event sequence, and rejects ineligible/already-playing players.
- `leave_event_queue(event_id, reason, idempotency_key)` closes the active entry without erasing
  queue history.
- `adjust_event_queue(entry_id, expected_version, before_entry_id, reason, idempotency_key)` is
  organizer-only, changes sortable position, and audits old/new order.
- `generate_match_proposal(event_id, format, idempotency_key)` uses a locked snapshot and the
  versioned deterministic balance policy.
- `confirm_match_proposal(proposal_id, expected_queue_version, idempotency_key)` atomically locks
  selected players and court, creates the assignment, and closes their ready entries.

## Stable Error Codes

| Code                                                        | Meaning                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------ |
| `AUTH_REQUIRED`                                             | No valid authenticated actor.                                      |
| `PERMISSION_DENIED`                                         | Actor lacks current role or participation rights.                  |
| `TENANT_MISMATCH`                                           | Referenced resources do not share the derived club/event boundary. |
| `SUBSCRIPTION_INACTIVE`                                     | Ranked source club is not active.                                  |
| `PLAYER_NOT_VERIFIED` / `IDENTITY_NOT_ATTESTED`             | Ranked eligibility requirement failed.                             |
| `INVALID_STATE_TRANSITION`                                  | Resource state cannot accept this command.                         |
| `INVALID_SCORE` / `REVISION_STALE`                          | Score violates rules or confirmation targets old data.             |
| `ALREADY_EXISTS` / `IDEMPOTENCY_CONFLICT`                   | Unique operation exists or key was reused differently.             |
| `STALE_VERSION`                                             | Optimistic queue/event/resource version changed.                   |
| `NO_CAPACITY` / `NO_ELIGIBLE_PLAYERS` / `COURT_UNAVAILABLE` | Event operation cannot be satisfied.                               |
| `DISPUTE_ALREADY_OPEN` / `DISPUTE_NOT_OPEN`                 | Dispute uniqueness/state invariant failed.                         |
| `UNKNOWN_RULE_VERSION`                                      | Calculation rule is absent or disabled.                            |
| `EVIDENCE_NOT_READY`                                        | Evidence object is absent, unowned, or not finalized.              |

Authorization failures SHOULD avoid distinguishing `NOT_FOUND` from `PERMISSION_DENIED` when that
distinction would reveal another tenant's private resource.
