# Private Realtime Broadcast Contract

## Delivery Model

Realtime messages are authenticated, private Broadcast notifications emitted from PostgreSQL
triggers after committed projection changes. They are hints to refetch authorized state, not an
authoritative log and not a guaranteed delivery channel. The database mutation response and
subsequent RLS-protected snapshot are authoritative.

Clients subscribe only while viewing an active event, unsubscribe on navigation, debounce bursts,
and refetch on initial `SUBSCRIBED`, version gap, reconnect, token refresh, browser visibility
return, or any unknown schema version. Optimistic UI is rolled forward or back from the snapshot.

## Topics and Authorization

| Topic                                       | Subscribers                                          | Purpose                                                                                   |
| ------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `club:{clubId}:event:{eventId}:operations`  | Active club members with event-operation read access | Queue, court, assignment, result-confirmation, and dispute status invalidations.          |
| `player:{playerId}:event:{eventId}:updates` | The authenticated canonical player only              | Player-specific registration, queue, assignment, confirmation, and dispute invalidations. |

Both topics are private. `realtime.messages` RLS checks `auth.uid()` against current database
membership/player rows and verifies that `eventId` belongs to `clubId`; it does not rely on JWT
role arrays. Platform administrators do not gain event-operation subscriptions merely from being
administrators. Public profiles and leaderboards use cached server reads and do not subscribe to
private topics.

## Envelope

```ts
type RealtimeEnvelope<T extends RealtimePayload> = {
  schemaVersion: 1;
  eventId: string;
  clubId?: string; // included only on club operations topic
  eventType: T["eventType"];
  entityId: string;
  entityVersion: number; // monotonic per entity
  eventVersion: number; // monotonic across event projections
  occurredAt: string; // ISO-8601 UTC
  requestId: string;
  payload: T;
};
```

Payloads contain opaque IDs and presentation-safe state only—never contact information, report or
dispute narrative, evidence paths, role lists, Trust Score, ratings, score details, or audit
before/after JSON.

## Event Payloads

```ts
type RealtimePayload =
  | {
      eventType: "queue.changed";
      queueEntryId: string;
      state: "ready" | "assigned" | "left" | "unavailable";
    }
  | { eventType: "queue.reordered"; changedEntryIds: string[] }
  | {
      eventType: "court.changed";
      courtId: string;
      state: "available" | "reserved" | "in_play" | "offline";
    }
  | {
      eventType: "assignment.changed";
      matchId: string;
      state: "proposed" | "assigned" | "in_play" | "completed" | "cancelled";
    }
  | {
      eventType: "registration.changed";
      registrationId: string;
      state: "confirmed" | "waitlisted" | "withdrawn";
    }
  | {
      eventType: "result.changed";
      resultId: string;
      state: "pending_confirmation" | "finalized" | "disputed" | "voided";
    }
  | {
      eventType: "confirmation.changed";
      resultId: string;
      confirmedSideA: boolean;
      confirmedSideB: boolean;
    }
  | {
      eventType: "dispute.changed";
      disputeId: string;
      resultId: string;
      state: "open" | "reviewing" | "resolved";
    }
  | {
      eventType: "calculation.changed";
      calculationVersion: number;
      state: "current" | "rebuilding" | "failed";
    };
```

The player topic receives only events involving that player. The operations topic may receive
event-wide invalidations. `calculation.changed` carries no leaderboard rows; clients revalidate
profile/leaderboard server data until at least `calculationVersion` is visible.

## Emission Rules

- Projection triggers call `realtime.broadcast_changes()` using the derived private topic. Events
  are emitted only for committed inserts/updates/deletes; transactional rollback emits nothing.
- One logical command may emit several entity events sharing `requestId` and `eventVersion`.
  Consumers coalesce them into one snapshot refresh.
- Triggers publish minimal invalidation fields from `NEW`/`OLD`. Sensitive source tables are never
  included in a Realtime publication and clients cannot broadcast domain events directly.
- Queue/court/assignment/result/dispute projections increment their entity `version`; the event
  projection allocates the event-wide sequence in the same transaction.
- Authorization revocation takes effect on the next channel authorization or token refresh. On a
  failed rejoin, the client clears all private event state and navigates to a safe boundary.

## Reconciliation Algorithm

1. Subscribe to the authorized private topic before requesting the initial snapshot.
2. Fetch `{ eventVersion, queue, courts, assignments, participantStatus }` through an RLS-protected
   Server Component/read endpoint; replace local state.
3. Ignore envelopes whose `eventVersion <= snapshot.eventVersion` or whose `requestId` was already
   reconciled.
4. If the next envelope is contiguous, debounce and refetch the affected projection; do not patch
   authoritative order from the payload alone.
5. If a version is skipped, duplicated with conflicting metadata, malformed, or uses an unsupported
   schema version, discard optimistic state and fetch the full event snapshot.
6. After reconnect or tab resume, always fetch the full snapshot because Broadcast delivery is not
   guaranteed while disconnected.
7. On snapshot `401/403`, clear subscription and private state. On transient failure, show stale
   state explicitly and retry with capped exponential backoff plus jitter.

## Reliability Acceptance Tests

- Authorized club and player subscribers receive committed relevant events; unrelated tenant and
  unrelated player subscribers receive none.
- Rolled-back transactions and unauthorized client broadcasts produce no accepted domain event.
- Duplicate, delayed, coalesced, and out-of-order envelopes converge to the database snapshot.
- Disconnect/reconnect, expired-token refresh, navigation unsubscribe, and visibility resume do
  not leave stale queue, court, assignment, confirmation, or dispute state.
- Two concurrent queue/assignment mutations resolve by database locks/version checks; all clients
  converge after refetch even when one Broadcast message is intentionally dropped.
- Payload fixtures prove absence of private contact, evidence, moderation, Trust Score, and audit
  data.
