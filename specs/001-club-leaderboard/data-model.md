# Data Model: Pickleball Club Competition and Leaderboards

## Conventions and ownership

- PostgreSQL UUID primary keys use `gen_random_uuid()`. Timestamps are `timestamptz` in UTC.
- `auth.users` owns credentials. `accounts.user_id` references it; the application never copies
  credentials into public tables.
- A canonical `players` row is global. Private club operations always carry `club_id`; global
  competitive projections expose only approved public fields.
- Official competition history is retained. Corrections add revisions and compensating ledger
  entries; they do not overwrite or delete provenance.
- All client-accessible tables have RLS enabled and forced. The authenticated role cannot call
  privileged tables directly; security-definer functions have a fixed `search_path`, derive the
  actor from `auth.uid()`, validate club scope, and revoke default `PUBLIC` execution.
- Competitive calculations use `numeric` or scaled integers, never binary floating point.

## Enumerations

| Type                          | Values                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| `contact_verification_status` | `pending`, `verified`, `revoked`                                                                  |
| `club_subscription_status`    | `trialing`, `active`, `past_due`, `suspended`, `canceled`                                         |
| `membership_status`           | `invited`, `active`, `suspended`, `left`                                                          |
| `club_role`                   | `member`, `score_official`, `organizer`, `owner`                                                  |
| `attestation_status`          | `active`, `revoked`                                                                               |
| `event_type`                  | `open_play`, `tournament`, `other`                                                                |
| `event_status`                | `draft`, `published`, `in_progress`, `completed`, `canceled`                                      |
| `record_class`                | `ranked`, `unranked`                                                                              |
| `match_format`                | `singles`, `doubles`                                                                              |
| `match_status`                | `proposed`, `assigned`, `playing`, `score_pending`, `finalized`, `disputed`, `voided`, `canceled` |
| `registration_status`         | `confirmed`, `waitlisted`, `withdrawn`, `removed`                                                 |
| `attendance_status`           | `not_checked_in`, `checked_in`, `checked_out`                                                     |
| `queue_status`                | `ready`, `assigned`, `left`, `unavailable`                                                        |
| `court_status`                | `available`, `reserved`, `in_use`, `unavailable`                                                  |
| `result_revision_status`      | `pending`, `accepted`, `superseded`, `rejected`                                                   |
| `ranked_effect_state`         | `active`, `suspended`, `none`                                                                     |
| `dispute_status`              | `open`, `resolved`                                                                                |
| `dispute_resolution`          | `upheld`, `corrected`, `voided`                                                                   |
| `calculation_run_status`      | `queued`, `running`, `completed`, `failed`                                                        |
| `leaderboard_scope`           | `overall`, `club`                                                                                 |
| `idempotency_status`          | `processing`, `completed`, `failed`                                                               |
| `report_status`               | `open`, `reviewing`, `actioned`, `dismissed`, `reopened`                                          |
| `moderation_action_status`    | `active`, `expired`, `reversed`                                                                   |
| `duplicate_review_status`     | `open`, `reviewing`, `merged`, `not_duplicate`, `dismissed`                                       |
| `trust_review_status`         | `open`, `reviewing`, `upheld`, `adjusted`, `dismissed`                                            |

Enums prevent unknown states. Adding a value is a forward migration; renaming/removing one requires
a compatibility migration.

## Identity, clubs, and authorization

### `accounts`

- `user_id uuid primary key references auth.users(id) on delete restrict`
- `player_id uuid not null unique references players(id) on delete restrict`
- `contact_status contact_verification_status not null default 'pending'`
- `contact_verified_at timestamptz null`
- `created_at`, `updated_at timestamptz not null`

One login maps to exactly one canonical player. Every match requires `contact_status = 'verified'`;
ranked eligibility additionally requires at least one active authorized Club attestation.

### `players`

- `id uuid primary key`
- `display_name text not null`
- `profile_slug citext not null unique`
- `avatar_path text null` (private Storage path; signed/public transformation is policy-controlled)
- `bio text null`, `is_public boolean not null default true`
- `created_at`, `updated_at timestamptz not null`

Public identity contains no email, phone, membership, or attendance fields. Duplicate-person review
is handled by platform moderation, while the unique account mapping prevents a second ranked
identity for one authenticated account.

### `clubs`

- `id uuid primary key`, `slug citext not null unique`, `name text not null`
- `description text null`, `logo_path text null`, `is_public boolean not null default true`
- `subscription_status club_subscription_status not null default 'trialing'`
- `subscription_valid_until timestamptz null`
- `created_by uuid not null references auth.users(id)`, `created_at`, `updated_at`

An official ranked command accepts a club only when status is `trialing` or `active` and any
valid-until timestamp has not elapsed.

### `club_memberships` and `club_member_roles`

`club_memberships`: `id`, `club_id`, `player_id`, `status`, `joined_at`, `left_at`, timestamps;
unique `(club_id, player_id)`. `club_member_roles`: `membership_id`, `role`, `granted_by`,
`granted_at`, `revoked_at`; primary key `(membership_id, role)` with active roles represented by
`revoked_at is null`. Owners cannot remove the final active owner in the club-management function.

Indexes: memberships `(player_id, status)`, `(club_id, status)`; active-role partial index on
`membership_id, role where revoked_at is null`.

### `identity_attestations`

- `id`, `player_id`, `club_id`, `status`, `attested_by`, `attested_at`, `revoked_by`, `revoked_at`,
  `reason`
- One active attestation per `(player_id, club_id)` via a partial unique index.

The attester must currently be an owner or organizer of the same club. Revocation blocks future
ranked finalization but does not retroactively invalidate a result whose finalization evidence was
valid.

### `identity_verification_artifacts`

- `id`, `player_id`, `purpose`, `storage_bucket`, `storage_path`, `content_type`, `sha256`,
  `required_until null`, `legal_hold_at null`, `deleted_at null`, `deletion_reason null`, timestamps.
- Storage path is unique; only the player and explicitly authorized identity reviewers may read it.

Artifacts are deleted when no longer required for account security or ranked-identity review. The
Storage object and sensitive fields are removed while non-sensitive deletion provenance remains in
the audit log.

### `platform_admins`

- `user_id uuid primary key references auth.users(id)`, `granted_by`, `granted_at`, `revoked_at`

This global allowlist is managed only with the service role. Club roles never grant platform
moderation authority.

## Events and operations

### `events`

- `id`, `club_id`, `type`, `status`, `name`, `description`, `venue_name`, `venue_address`
- `starts_at`, `ends_at`, `registration_opens_at`, `registration_closes_at`
- `check_in_opens_at`, `check_in_closes_at`, `capacity integer check (capacity > 0)`
- `allowed_formats match_format[]`, `record_class`, `score_rule_version_id`,
  `matchmaking_rule_version_id`, `join_token_hash`, timestamps, `created_by`

Checks enforce chronological windows and nonempty formats. Publish validation, implemented in a
function, also requires venue, capacity, at least one court, and immutable rule-version references.
Indexes: `(club_id, status, starts_at)`, `(status, registration_opens_at,
registration_closes_at)`, unique `join_token_hash`.

### `courts`

- `id`, `club_id`, `event_id`, `name`, `status`, `current_match_id null`, timestamps
- Unique `(event_id, name)`; index `(event_id, status)`.

Club ID must equal the parent event's club (enforced by composite FK or command function). A
partial unique index on `current_match_id where current_match_id is not null` and row locks prevent
double booking.

### `event_registrations`

- `id`, `club_id`, `event_id`, `player_id`, `status`, `waitlist_position bigint null`
- `terms_version`, `terms_accepted_at`, `registered_at`, `withdrawn_at`, timestamps
- Unique `(event_id, player_id)`; confirmed rows require null waitlist position, waitlisted rows
  require a positive position.

Capacity assignment locks the event. Waitlist positions come from an event-scoped monotonic
sequence/counter and are never reused; visible order is `(waitlist_position, registered_at, id)`.
Indexes: `(event_id, status, waitlist_position)`, `(player_id, status)`.

### `event_attendance`

- `registration_id primary key`, `club_id`, `event_id`, `player_id`, `status`, `checked_in_at`,
  `checked_out_at`, `changed_by`, timestamps

Repeated check-in is idempotent. Composite foreign keys ensure the denormalized tenant/event/player
keys match the registration.

### `queue_entries` and `queue_history`

`queue_entries`: `id`, `club_id`, `event_id`, `player_id`, `status`, `position_key bigint`,
`joined_at`, `assigned_match_id`, `updated_at`; one active ready row per `(event_id, player_id)` and
unique `(event_id, position_key)` through partial indexes. `queue_history`: immutable `id`,
`queue_entry_id`, `from_status`, `to_status`, `old_position_key`, `new_position_key`, `actor_id`,
`reason`, `occurred_at`.

Indexes: ready queue `(event_id, position_key) where status='ready'`; player state
`(event_id, player_id, status)`. Queue commands lock selected entries, attendance, and courts in
stable UUID order.

## Matches and official results

### `matches`

- `id`, `club_id`, `event_id`, `court_id null`, `format`, `record_class`, `status`
- `played_at null`, `assigned_at null`, `completed_at null`
- `score_rule_version_id`, `calculation_rule_version_id null` (required for ranked)
- `created_by`, `created_at`, `updated_at`

Indexes: `(club_id, event_id, status)`, `(record_class, status, played_at, id)`, `(court_id,
status)`. A match's club, participants, event, and record class cannot change after assignment.

### `match_participants`

- `match_id`, `player_id`, `side smallint check (side in (1,2))`, `position smallint`, timestamps
- Primary key `(match_id, player_id)`, unique `(match_id, side, position)`.

Assignment validation requires exactly one player per side for singles and two per side for
doubles, all distinct, each mapped to a contact-verified account. Ranked assignment and
finalization additionally require Club identity attestation. PostgreSQL cannot express these
cross-row rules in a simple check, so assignment/finalization functions validate them while
holding the match lock.

### `result_revisions`

- `id`, `match_id`, `revision_no integer`, `score jsonb`, `score_digest text`, `winner_side`
- `status`, `submitted_by`, `submitted_at`, `supersedes_revision_id null`, `reason null`
- Unique `(match_id, revision_no)` and `(match_id, score_digest, submitted_by)`.

`score` is validated against the immutable score rule version. The digest is made from canonical
JSON and prevents visually equivalent duplicate submissions. Accepted revisions are immutable.

### `result_confirmations`

- `result_revision_id`, `player_id`, `side`, `score_digest`, `confirmed_at`
- Primary key `(result_revision_id, player_id)`.

The player must participate on the stored side and confirm the identical digest. Finalization
requires at least one confirmation from each side. A corrected revision created through the
authorized Club score-dispute workflow records the resolving score official instead of requiring
new ordinary confirmations.

### `official_results`

- `match_id primary key`, `authoritative_revision_id unique`, `effect_state`, `finalized_at`,
  `finalized_by`, `eligibility_evidence jsonb`, `calculation_run_id null`, `updated_at`

The evidence records participant verification/attestation IDs, source club subscription state,
and submitter role observed at finalization. It proves authorization without making later role or
subscription changes retroactive. There is only one current authoritative pointer; revision
history remains immutable.

### `disputes`

- `id`, `club_id`, `match_id`, `opened_by`, `reason`, `status`, `opened_at`
- `resolution null`, `resolution_reason null`, `resolved_by null`, `resolved_at null`,
  `replacement_revision_id null`, `calculation_run_id null`

Partial unique index `(match_id) where status='open'`; indexes `(club_id, status, opened_at)` and
`(match_id, opened_at desc)`. Participants can open disputes. Resolution is restricted to an
active score official or owner of the source Club. Platform administrators may moderate abusive
content or accounts but do not silently replace the Club's competition-resolution authority.

## Deterministic calculations

### `calculation_rule_versions`

- `id`, `version text unique`, `parameters jsonb`, `checksum text unique`, `published_at`,
  `retired_at null`
- Rows become immutable on publication.

Elo v1 parameters:

- Initial rating: `1500` rating points.
- Rating scale: `400`; update factor `K = 32` for every eligible player.
- Singles team rating is the player's pre-match rating. Doubles team rating is the arithmetic
  mean of the two teammates' pre-match ratings, calculated as exact `numeric`.
- Expected side-one score is `1 / (1 + 10 ^ ((R2 - R1) / 400))`; side two is `1 - E1`.
- Winner score is `1`, loser score `0`. Draws and forfeits are not eligible for ranked effect in
  v1 and must be unranked or voided.
- Each doubles teammate receives the same team delta: `round_half_away_from_zero(32 * (S - E))`.
  Ratings and deltas are stored as integers. Round only the final player delta.
- Replay order is `played_at asc, finalized_at asc, match_id asc`. These timestamps are immutable
  after initial finalization. UUID supplies a total tie-break.
- No inactivity decay in v1. Leaderboard eligibility requires at least one eligible ranked
  decision.
- Leaderboard order is rating descending, wins descending, exact win rate descending, losses
  ascending, latest eligible match descending, player UUID ascending.

Golden SQL and TypeScript fixtures must agree on expected values and final checksums. Published
rule changes create a new version and explicit full-replay migration; they never reinterpret an
old ledger silently.

### `calculation_runs`

- `id`, `rule_version_id`, `cause_type`, `cause_id`, `scope`, `status`, `input_cutoff`,
  `earliest_replay_key`, `input_checksum`, `output_checksum`, `started_at`, `completed_at`, `error`

This is the provenance anchor for every projection update. Failed runs preserve their error and
do not replace the last completed projection.

### `rating_ledger`

- `calculation_run_id`, `rule_version_id`, `match_id`, `player_id`, `side`
- `pre_rating integer`, `team_rating numeric`, `expected_score_scaled bigint`, `actual_score`
- `delta integer`, `post_rating integer`, `sequence_no bigint`
- Primary key `(calculation_run_id, match_id, player_id)`; unique `(calculation_run_id,
sequence_no, player_id)`; indexes `(player_id, sequence_no)` and `(match_id)`.

`expected_score_scaled` uses a documented fixed scale (1e12) after controlled `numeric`
calculation, allowing exact fixture comparisons.

### `player_ranked_stats`, `player_club_ranked_stats`, and `leaderboard_entries`

Global stats: `(player_id, rule_version_id)` PK plus `rating`, `wins`, `losses`, `win_rate numeric`,
`current_win_streak`, `longest_win_streak`, `last_match_at`, `calculation_run_id`, `updated_at`.
Club stats add `club_id` to the PK and include only official ranked matches submitted by that
club. Leaderboard rows contain `scope`, nullable `club_id`, `player_id`, the same visible measures,
`rank`, `tie_key`, and `calculation_run_id`; unique scope/player and scope/rank indexes use a
normalized scope key because nulls otherwise remain distinct.

Statistics use the same replay ordering. Win rate is `wins / (wins + losses)` with exact numeric
division. Overall ranking uses the global rating chain. A club board filters results by source
club but displays the canonical global Elo rating plus club-scoped wins/losses as eligibility and
tie-break facts; it does not invent an incompatible second player rating.

### Replay behavior

Opening a dispute synchronously locks the result, changes `effect_state` from `active` to
`suspended`, records audit/outbox rows, and rebuilds projections before commit. Correction points
to a new accepted revision; void sets `none`; uphold restores `active`. Recalculation replays all
active official ranked results because an old change propagates through later opponents. For the
MVP target of 2,000 event matches this is the correctness baseline. Checkpoints may later optimize
replay only if their rule version, sequence boundary, and checksum are validated.

The replay function takes a transaction-scoped advisory lock keyed by rule version, builds ledger
and projection rows in staging tables, verifies counts/checksums, and atomically replaces the
published run. It never tries to reverse an old Elo delta.

## Trust Score

Trust Score is separate from Elo and does not affect ranking or matchmaking in the MVP.

### `trust_score_ledger`

- `id`, `player_id`, `delta smallint`, `reason_code`, `source_type`, `source_id`, `actor_id`,
  `rule_version`, `reason`, `created_at`
- Unique `(source_type, source_id, player_id, reason_code)`.

### `trust_score_summaries`

- `player_id primary key`, `score smallint check (score between 0 and 100)`, `updated_at`,
  `last_ledger_id`

Start at 50. Versioned automatic adjustments may reward timely valid confirmation or apply a
published consequence after a resolved abusive dispute. Platform administrators alone may add a
manual adjustment, always with a reason. The summary clamps the ledger sum to 0–100; reversals are
compensating entries, never mutation. Trust data is private to the player and platform admins
unless a later product decision explicitly publishes it.

### `trust_score_review_requests`

- `id`, `player_id`, `challenged_ledger_id`, `reason`, `status`, `opened_at`, `assigned_admin_id`,
  `decision_reason`, `decided_at`, `decision_ledger_id null`, `version`, timestamps.
- One active request per challenged ledger entry through a partial unique index.

Players may read and create requests only for their own Trust Score ledger. Only platform
administrators may review or decide them. An adjusted decision creates a compensating ledger entry
and never mutates the challenged entry.

## Reporting, moderation, and retention

### `reports`

- `id`, `reporter_player_id`, `subject_type`, `subject_id`, `reason_code`, `description`, `status`,
  `assigned_admin_id null`, `resolution_reason null`, `resolved_at null`, `version`, timestamps.
- Indexes `(status, created_at)`, `(assigned_admin_id, status)`, and
  `(subject_type, subject_id, created_at desc)`.

Verified players may report only subjects visible to them. Platform administrators alone may
claim, resolve, reopen, or dismiss reports. Report state never changes official competition data.

### `report_evidence`

- `id`, `report_id null`, `dispute_id null`, `owner_player_id`, `storage_bucket`, `storage_path`,
  `content_type`, `size_bytes`, `sha256`, `status`, `retention_due_at`, `legal_hold_at null`,
  `legal_hold_by null`, `appeal_id null`, `deleted_at null`, `deleted_by null`, timestamps.
- Exactly one of `report_id` or `dispute_id` is required. Storage path is unique. Disputes refer to
  evidence through these rows rather than storing mutable path arrays.

Evidence is private to its owner and explicitly authorized reviewers. Final resolution sets
`retention_due_at = resolved_at + interval '90 days'`. An appeal or legal hold pauses deletion.
The cleanup function removes expired Storage objects and retains only non-sensitive metadata and
an immutable deletion audit.

### `moderation_actions`

- `id`, `report_id null`, `subject_type`, `subject_id`, `action_type`, `reason`, `status`,
  `effective_at`, `expires_at null`, `reversed_action_id null`, `actor_admin_id`, timestamps.
- Active-action indexes cover `(subject_type, subject_id, status, expires_at)`.

Only platform administrators may append actions or reversals. Official result changes are rejected
and must use the Club score-dispute workflow.

### `duplicate_identity_reviews`

- `id`, `candidate_player_a_id`, `candidate_player_b_id`, `status`, `evidence_summary`,
  `assigned_admin_id`, `decision_reason`, `surviving_player_id null`, `decided_at null`, timestamps.
- Candidate IDs are stored in canonical UUID order; one active review per pair is enforced by a
  partial unique index.

An approved merge runs transactionally, repoints account/membership/domain references to the
surviving canonical Player, records aliases, and retains every official result, revision,
calculation event, rating ledger entry, and audit record.

## Idempotency, audit, and realtime

### `idempotency_keys`

- `actor_id`, `operation`, `key`, `request_hash`, `status`, `response jsonb`, `created_at`,
  `expires_at`; primary key `(actor_id, operation, key)`.

Reuse with the same hash returns the recorded response. Reuse with another hash fails. Domain
constraints still enforce one official result, confirmation, open dispute, and ledger effect.

### `audit_log`

- `id bigint generated always as identity`, `occurred_at`, `actor_id null`, `club_id null`,
  `action`, `entity_type`, `entity_id`, `reason null`, `before_state jsonb`, `after_state jsonb`,
  `request_id`, `calculation_run_id null`, `correlation_id`

Indexes: `(entity_type, entity_id, occurred_at desc)`, `(club_id, occurred_at desc)`, `request_id`,
`calculation_run_id`. Application roles have no update/delete permission. Sensitive before/after
data is never exposed by public views.

### `outbox_events`

- `id bigint identity`, `topic`, `aggregate_type`, `aggregate_id`, `club_id null`, `payload jsonb`,
  `created_at`, `published_at null`, `attempt_count`, `last_error null`

Partial index `(created_at, id) where published_at is null`. Transactions append narrow topics such
as `queue.changed`, `match.changed`, `result.changed`, `dispute.changed`, and
`leaderboard.changed`. A publisher writes sanitized event projections to Realtime-enabled tables
or broadcasts after commit. Payloads contain IDs and calculation versions, not contact or audit
details; clients refetch under RLS.

## Transactional PostgreSQL functions

- `register_for_event(event_id, terms_version, idempotency_key)`: locks event, validates window and
  eligibility, assigns confirmed/waitlisted state, audits and emits outbox.
- `change_queue_state(event_id, desired_state, reason, idempotency_key)`: validates attendance and
  conflicts; organizer reorder requires a reason and immutable queue history.
- `assign_match(event_id, court_id, participant_sides, format, idempotency_key)`: locks court and
  queue rows in stable order, validates tenant/eligibility, creates participants, and removes them
  from ready selection atomically.
- `submit_result(match_id, score, idempotency_key)`: locks match, checks participant/official
  authority and score rules, inserts a pending revision and moves match to `score_pending`.
- `confirm_result(revision_id, idempotency_key)`: inserts one digest-bound confirmation and calls
  finalization when both sides have quorum.
- `finalize_match(match_id, idempotency_key)`: rechecks current participant verification,
  attestation, submitter authority, and subscription; writes eligibility evidence, official
  result, audit/outbox, Elo/stats/leaderboards in the same transaction. A completed retry returns
  the existing response.
- `open_dispute(match_id, reason, evidence_object_ids, idempotency_key)`: participant-only; immediately
  suspends ranked effect and runs deterministic replay in the same transaction.
- `resolve_dispute(dispute_id, resolution, reason, corrected_score, idempotency_key)`: active
  score official or owner of the source Club only; uphold/correct/void, audit, optional Trust Score
  entries, and replay are one transaction.
- `recalculate_competition(rule_version_id, cause_type, cause_id)`: internal only; advisory-locks,
  replays, verifies, atomically publishes projections, and emits versioned changes.
- `adjust_trust_score(player_id, delta, reason_code, reason, idempotency_key)`: platform-admin only;
  inserts a ledger item, recomputes bounded summary, audits.

All functions use `SET LOCAL lock_timeout` and fail cleanly for caller retry rather than silently
skipping locked rows.

## Row Level Security matrix

| Data                                         | Public/anonymous             | Authenticated player                                      | Club organizer/owner                       | Score official                               | Platform admin                           |
| -------------------------------------------- | ---------------------------- | --------------------------------------------------------- | ------------------------------------------ | -------------------------------------------- | ---------------------------------------- |
| Public player/club/profile/leaderboard views | Read approved fields         | Same                                                      | Same                                       | Same                                         | Same                                     |
| Own account/private profile                  | None                         | Read/update own safe fields                               | No inherited access                        | No inherited access                          | Moderation read through admin function   |
| Club membership and private operations       | None                         | Read own rows in each club                                | Read/write rows for active role's club     | Read only needed match/result rows           | Read through audited admin interface     |
| Events/registrations/attendance/queue        | Published projection only    | Own registration and event-visible state                  | Manage same-club rows via functions        | Read same-club result context                | Audited support access                   |
| Matches/results/confirmations                | Public projection only       | Read participant/public fields; mutate only via functions | Same-club operational access               | Submit/review same-club scores via functions | Audited moderation read only             |
| Disputes                                     | Public status where approved | Participant read/create via function                      | Same-club read/evidence; owner may resolve | Same-club read/evidence/resolve              | Audited support read only                |
| Raw calculation ledger/projections           | Public safe views only       | Public safe views                                         | Public safe views                          | Public safe views                            | Diagnostic read                          |
| Audit, idempotency, outbox                   | None                         | Own command receipt only                                  | Narrow same-club audit view                | Narrow same-club audit view                  | Audited read; no mutation                |
| Trust Score and reviews                      | None                         | Own summary/history and own review requests               | None                                       | None                                         | Read/adjust/review via audited functions |
| Reports/evidence                             | None                         | Create/read own permitted report and evidence             | No inherited access                        | Evidence only when separately authorized     | Read/review through audited functions    |
| Moderation/duplicate reviews                 | None                         | Own visible resolution status only                        | None                                       | None                                         | Read/decide through audited functions    |

Policies use helpers such as `is_active_club_member(club_id)`, `has_club_role(club_id, roles[])`,
`is_match_participant(match_id)`, and `is_platform_admin()`. Helpers are stable security-definer
functions with fixed search paths and no user-supplied actor. Every club-table policy requires the
row's `club_id`; membership in one club never authorizes another. Storage paths begin with
`club/{club_id}/...` or `player/{player_id}/...`, with matching object policies. Platform
moderation is never inferred from JWT-editable metadata.

## Lifecycle transitions

- Event: `draft -> published -> in_progress -> completed`; `draft|published|in_progress ->
canceled` subject to audit and cleanup rules.
- Registration: `confirmed|waitlisted -> withdrawn|removed`; waitlisted may promote to confirmed
  under event lock.
- Attendance: `not_checked_in -> checked_in -> checked_out`; organizer correction is audited.
- Queue: `ready -> assigned|left|unavailable`; a valid release may create a new ready entry so
  history/order remain attributable.
- Match: `proposed -> assigned -> playing -> score_pending -> finalized`; finalized may become
  `disputed`, then `finalized` when upheld/corrected or `voided`. Assigned/playing may cancel before
  an official result.
- Result revision: `pending -> accepted|rejected`; an accepted revision becomes `superseded` only
  when a correction revision becomes authoritative.
- Ranked effect: `none -> active` at eligible ranked finalization; `active -> suspended` on
  dispute; `suspended -> active` on uphold/correction; `suspended -> none` on void.
- Dispute: `open -> resolved` exactly once.
- Report: `open -> reviewing -> actioned|dismissed`; a resolved report may become `reopened` after
  an accepted appeal and then returns to `reviewing`.
- Moderation action: `active -> expired|reversed`; reversals append a linked action.
- Duplicate review: `open -> reviewing -> merged|not_duplicate|dismissed`.
- Trust Score review: `open -> reviewing -> upheld|adjusted|dismissed`.
- Evidence: `uploaded -> retained -> eligible_for_deletion -> deleted`; an appeal or legal hold
  pauses the deletion transition.

Invalid transitions are rejected in command functions and covered by database checks where
possible.

## Migration sequence and recovery

1. Extensions (`pgcrypto`, `citext`), enums, canonical identity and club tables, helper functions,
   and baseline RLS.
2. Event, court, registration, attendance, queue, match, and participant tables with tenant-aware
   foreign keys and indexes.
3. Immutable result revisions, confirmations, official results, disputes, idempotency, audit, and
   outbox; revoke direct mutation grants.
4. Rule versions, calculation runs, rating ledger, stats, leaderboards, Trust Score ledger and
   summaries.
5. Reports, report evidence, moderation actions, duplicate reviews, Trust Score reviews, retention
   indexes, and administrator-only functions/RLS.
6. Transactional competition functions, public/sanitized views, Storage policies, and private
   Realtime Broadcast authorization/triggers.
7. Insert and publish Elo v1, run seed replay, verify expected checksum and RLS/invariant tests.

Migrations are additive first. Before replacing a competitive function, preserve its rule-version
implementation and regression fixtures. A failed projection migration keeps the prior completed
run visible; recovery fixes the function/data and starts a new run. Schema rollback disables new
entry points and restores compatible views/functions but never drops official history, audit, or
published rule versions.

## Demo seed and deterministic fixture

Seed two clubs (`Harbor Pickleball`, active; `Ridge Courts`, active), one inactive club, platform
admin `Morgan`, club owner/organizer `Olivia`, score official `Sam`, and verified/attested canonical
players `Alex`, `Blair`, `Casey`, `Drew`, `Emery`, and `Frank`. Give Alex memberships in both active
clubs to prove identity continuity and tenant isolation.

Create:

- A published Harbor open-play event with two courts, confirmed registrations, checked-in
  players, two ready queue entries, and one assigned court, demonstrating Realtime queue state.
- Ranked Harbor singles: Alex defeats Blair. From 1500/1500, ratings become 1516/1484.
- Ranked Harbor doubles: Alex (1516) + Casey (1500), team 1508, defeat Drew (1500) + Emery (1500),
  team 1500. The fixed Elo fixture records the exact expected scaled value and rounded deltas from
  the SQL rule implementation.
- Ranked Ridge singles: Blair defeats Casey, proving the overall chain combines clubs while the
  Ridge board includes only Ridge-submitted results.
- One finalized Harbor result disputed by a participant and therefore suspended, plus a resolved
  corrected revision that demonstrates replay and retained prior score.
- One unranked match and one voided result, both producing zero ranked ledger rows.
- Trust Score entries for a valid confirmation and one platform-admin compensating adjustment.
- Audit and outbox rows correlated to every official transition.

The seed script calls production functions rather than inserting final projections directly, then
asserts: both repeated replays have the same input/output checksums; overall and club statistics
match their ledgers; disputed/unranked/voided matches have no active ranked effect; cross-club RLS
queries return zero private rows; and retrying each seeded command with its original idempotency key
creates no additional domain, ledger, audit, or Trust Score effect.
