# Application Mutation Contracts

## Conventions

All first-party form mutations are Next.js Server Actions. Route Handlers are used only for HTTP
boundaries (Auth callback, signed Storage operations, QR/export resources, subscription webhooks,
and health checks). Inputs are parsed with shared Zod schemas; unknown keys are rejected.

```ts
type CommandErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_FAILED"
  | "INELIGIBLE"
  | "SUBSCRIPTION_INACTIVE"
  | "STALE_VERSION"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

type CommandResult<T> =
  | { ok: true; data: T; requestId: string; version?: number }
  | {
      ok: false;
      error: {
        code: CommandErrorCode;
        message: string;
        fields?: Record<string, string[]>;
        retryable: boolean;
      };
      requestId: string;
    };
```

- IDs are UUID strings; timestamps are ISO-8601 UTC strings. Mutation inputs never accept
  `actorId`, platform-admin status, derived ratings, statistics, Trust Score, or an authoritative
  tenant identity.
- Every command authenticates from request cookies, derives the player, checks current database
  memberships/roles, and confirms that each referenced resource belongs to the supplied club/event.
- Integrity-critical commands require a client-generated UUID `idempotencyKey`. Reusing it with
  identical input returns the stored result; reuse with different input returns `CONFLICT`.
- Commands return safe domain errors only. Database details, policy names, evidence object paths,
  contact details, and cross-tenant existence are not disclosed.
- Successful actions call `revalidatePath`/`revalidateTag`; Realtime remains an invalidation hint,
  not proof that the mutation committed.

## Authentication and Player

| Command                    | Input                                                          | Success data                        | Authorization / effects                                                           |
| -------------------------- | -------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------- |
| `completePlayerProfile`    | `{ displayName, publicSlug, termsVersion }`                    | `{ playerId, publicSlug }`          | Authenticated, contact-verified account; creates/links one canonical player.      |
| `attestPlayerIdentity`     | `{ clubId, playerId, attestationType, note?, idempotencyKey }` | `{ attestationId, rankedEligible }` | Current club owner or score official in an active club; immutable attester audit. |
| `updateProfilePreferences` | `{ displayName?, avatarObjectId?, visibility }`                | `{ playerId, updatedAt }`           | Own player only; never changes competitive identity.                              |

## Clubs and Memberships

| Command               | Input                                                               | Success data                        | Authorization / effects                                                                |
| --------------------- | ------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------- |
| `createClub`          | `{ name, slug, timezone, idempotencyKey }`                          | `{ clubId, slug }`                  | Verified player; creator becomes owner atomically.                                     |
| `updateClub`          | `{ clubId, expectedVersion, name?, timezone?, publicDescription? }` | `{ clubId, version }`               | Club owner; optimistic version check.                                                  |
| `setMembershipRole`   | `{ clubId, membershipId, role, reason, idempotencyKey }`            | `{ membershipId, role, version }`   | Owner only; cannot assign platform administrator. Last active owner cannot be removed. |
| `setMembershipStatus` | `{ clubId, membershipId, status, reason, idempotencyKey }`          | `{ membershipId, status, version }` | Owner only; audited and club-bound.                                                    |

## Events, Attendance, Queue, and Matchmaking

| Command                 | Input                                                                                                                                                                 | Success data                                                                        | Authorization / effects                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `createEvent`           | `{ clubId, type, name, venue, startsAt, endsAt, registrationOpensAt, registrationClosesAt, capacity, courtCount, formats, recordClass, eligibility, idempotencyKey }` | `{ eventId, joinCode }`                                                             | Club organizer/owner.                                                                       |
| `updateEvent`           | `{ clubId, eventId, expectedVersion, patch }`                                                                                                                         | `{ eventId, version }`                                                              | Club organizer/owner; published-event invariant checks.                                     |
| `transitionEvent`       | `{ clubId, eventId, expectedVersion, transition, reason?, idempotencyKey }`                                                                                           | `{ eventId, status, version }`                                                      | Organizer/owner; valid transitions only.                                                    |
| `registerForEvent`      | `{ eventId, termsVersion, idempotencyKey }`                                                                                                                           | `{ registrationId, status, waitlistPosition? }`                                     | Eligible authenticated player; one active registration. Capacity/waitlist is transactional. |
| `withdrawFromEvent`     | `{ eventId, reason?, idempotencyKey }`                                                                                                                                | `{ registrationId, status, promotedPlayerId? }`                                     | Own registration or organizer; waitlist promotion is atomic.                                |
| `setAttendance`         | `{ clubId, eventId, playerId, state, reason?, idempotencyKey }`                                                                                                       | `{ attendanceId, state, version }`                                                  | Own check-in where allowed, otherwise organizer; tenant/event eligibility checked.          |
| `joinQueue`             | `{ eventId, idempotencyKey }`                                                                                                                                         | `{ queueEntryId, position, version }`                                               | Checked-in eligible player; rejects assigned/playing/already queued.                        |
| `leaveQueue`            | `{ eventId, reason?, idempotencyKey }`                                                                                                                                | `{ queueEntryId, state, version }`                                                  | Own entry or organizer.                                                                     |
| `adjustQueue`           | `{ clubId, eventId, queueEntryId, expectedVersion, beforeEntryId?, reason, idempotencyKey }`                                                                          | `{ queueEntryId, position, eventQueueVersion }`                                     | Organizer/owner; reason and prior order audited.                                            |
| `generateMatchProposal` | `{ clubId, eventId, format, idempotencyKey }`                                                                                                                         | `{ proposalId, sideAPlayerIds, sideBPlayerIds, courtId, policyVersion, expiresAt }` | Organizer/owner; deterministic snapshot-based selection.                                    |
| `confirmMatchProposal`  | `{ clubId, proposalId, expectedEventQueueVersion, idempotencyKey }`                                                                                                   | `{ matchId, assignmentVersion }`                                                    | Organizer/owner; database transaction locks court, queue entries, and players.              |
| `cancelMatchAssignment` | `{ clubId, matchId, reason, idempotencyKey }`                                                                                                                         | `{ matchId, status, assignmentVersion }`                                            | Organizer/owner before finalization; releases resources atomically.                         |

## Scores and Disputes

`ScoreInput` is `{ games: Array<{ sideA: number; sideB: number }> }`; event rule validation occurs
in PostgreSQL rather than trusting a client-computed winner.

| Command                | Input                                                                        | Success data                                                   | Authorization / effects                                                                 |
| ---------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `submitMatchResult`    | `{ matchId, score: ScoreInput, idempotencyKey }`                             | `{ resultId, revisionId, status: 'pending_confirmation' }`     | Match participant or authorized club official; calls `submit_match_result`.             |
| `confirmMatchResult`   | `{ resultId, revisionId, idempotencyKey }`                                   | `{ resultId, status, confirmedSides, calculationVersion? }`    | Participant confirms only the current unchanged revision; calls `confirm_match_result`. |
| `openResultDispute`    | `{ resultId, reasonCode, description, evidenceObjectIds?, idempotencyKey }`  | `{ disputeId, status, calculationVersion? }`                   | Participant; calls `open_result_dispute`.                                               |
| `resolveResultDispute` | `{ clubId, disputeId, resolution, correctedScore?, reason, idempotencyKey }` | `{ disputeId, resultStatus, revisionId?, calculationVersion }` | Current club score official/owner; calls `resolve_result_dispute`.                      |

## Reporting and Platform Moderation

| Command                   | Input                                                                                     | Success data                                               | Authorization / effects                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `createReport`            | `{ subjectType, subjectId, reasonCode, description, evidenceObjectIds?, idempotencyKey }` | `{ reportId, status: 'open' }`                             | Authenticated player; subject visibility and upload ownership checked.             |
| `reviewReport`            | `{ reportId, expectedVersion, decision, reason, idempotencyKey }`                         | `{ reportId, status, version }`                            | Platform administrator only; audited.                                              |
| `applyModerationAction`   | `{ reportId?, subjectType, subjectId, action, reason, expiresAt?, idempotencyKey }`       | `{ moderationActionId, status }`                           | Platform administrator only; never inferred from Auth metadata.                    |
| `adjustPlayerTrustScore`  | `{ playerId, reasonCode, delta, sourceId, idempotencyKey }`                               | `{ playerId, previousScore, currentScore, ledgerEntryId }` | Platform administrator only; calls audited `adjust_trust_score`.                   |
| `requestTrustScoreReview` | `{ ledgerEntryId, reason, idempotencyKey }`                                               | `{ reviewId, status: 'open' }`                             | Player may challenge only their own manual adjustment.                             |
| `decideTrustScoreReview`  | `{ reviewId, decision, reason, idempotencyKey }`                                          | `{ reviewId, status, compensatingLedgerEntryId? }`         | Platform administrator only; adjustment appends compensation rather than mutation. |

## Route Handlers

| Method and route                        | Contract                                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /auth/callback?code=&next=`        | Exchanges PKCE code; `next` must be a validated same-origin path. Redirects or renders a safe auth error.                                                                 |
| `GET /join/[eventCode]/qr`              | Returns cached SVG/PNG for the canonical same-origin join URL; published events only.                                                                                     |
| `POST /api/storage/evidence/upload-url` | Input `{ disputeId? , reportId?, fileName, contentType, size }`; participant/reporter ownership checked; returns short-lived signed upload data and `objectId`.           |
| `GET /api/storage/evidence/[objectId]`  | Returns a short-lived signed download redirect only to authorized reviewers/parties.                                                                                      |
| `GET /api/exports/leaderboard?...`      | Public safe projection; validated filters, pagination, CSV response.                                                                                                      |
| `POST /api/webhooks/subscription`       | Verifies provider signature and replay timestamp before invoking an idempotent subscription-state RPC; no user cookie authority.                                          |
| `GET /api/health`                       | Liveness only; no secrets, schema details, or tenant data.                                                                                                                |
| `POST /api/internal/evidence-retention` | Authenticates scheduler secret, claims evidence past its 90-day deadline without appeal/legal hold, deletes private objects, and finalizes non-sensitive deletion audits. |

Route Handlers use standard HTTP status codes (`400`, `401`, `403`, `404`, `409`, `422`, `429`,
`500`) and the same error body shape as `CommandResult.error`. Mutation endpoints enforce origin,
content type, body-size, and rate limits.
