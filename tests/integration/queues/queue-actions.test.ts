import { describe, expect, it } from "vitest";
import {
  adjustQueueSchema,
  attendanceSchema,
  joinQueueSchema,
  organizerCheckoutSchema,
  replaceStandbyPlayerSchema,
} from "@/lib/validation/queues";
import { mapQueueDatabaseError } from "@/lib/domain/queue-errors";
import {
  reconcileQueueSnapshot,
  shouldRefetchForEnvelope,
  type QueueSnapshot,
  type RealtimeEnvelope,
} from "@/lib/realtime/event-operations";

const eventId = "10000000-0000-4000-8000-000000000001";
const clubId = "20000000-0000-4000-8000-000000000001";
const playerId = "30000000-0000-4000-8000-000000000001";
const queueEntryId = "40000000-0000-4000-8000-000000000001";

describe("queue command contracts", () => {
  it("accepts an attributable attendance update", () => {
    expect(
      attendanceSchema.safeParse({
        clubId,
        eventId,
        playerId,
        state: "checked_in",
        reason: "Player arrived",
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(true);
  });

  it("accepts an organizer checkout without a caller-supplied reason", () => {
    expect(
      organizerCheckoutSchema.safeParse({
        clubId,
        eventId,
        playerId,
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(true);
  });

  it("does not accept a caller-supplied actor for queue entry", () => {
    expect(
      joinQueueSchema.safeParse({
        eventId,
        actorId: playerId,
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });

  it("requires an optimistic version and reason for organizer reorder", () => {
    expect(
      adjustQueueSchema.safeParse({
        clubId,
        eventId,
        queueEntryId,
        expectedVersion: 7,
        beforeEntryId: null,
        reason: "Court rotation correction",
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(true);
    expect(
      adjustQueueSchema.safeParse({
        clubId,
        eventId,
        queueEntryId,
        reason: "",
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });

  it("maps a database stale-version detail to a stable client error", () => {
    expect(
      mapQueueDatabaseError({ code: "P0001", details: "STALE_VERSION" }),
    ).toBe("STALE_VERSION");
  });
  it("requires two distinct entries, a queue version, and a reason for standby replacement", () => {
    expect(
      replaceStandbyPlayerSchema.safeParse({
        clubSlug: "the-dink-lab",
        eventId,
        format: "doubles",
        outgoingEntryId: queueEntryId,
        replacementEntryId: playerId,
        expectedQueueVersion: 12,
        reason: "Player emergency",
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(true);
    expect(
      replaceStandbyPlayerSchema.safeParse({
        clubSlug: "the-dink-lab",
        eventId,
        format: "doubles",
        outgoingEntryId: queueEntryId,
        replacementEntryId: playerId,
        expectedQueueVersion: 12,
        reason: "",
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });
  it("maps an attendance eligibility failure", () => {
    expect(
      mapQueueDatabaseError({ code: "P0001", details: "INELIGIBLE" }),
    ).toBe("INELIGIBLE");
  });
  it("maps an assigned-player checkout conflict", () => {
    expect(
      mapQueueDatabaseError({ code: "P0001", details: "PLAYER_ASSIGNED" }),
    ).toBe("CONFLICT");
  });
});

describe("Realtime queue reconciliation", () => {
  const current: QueueSnapshot = {
    eventId,
    eventVersion: 8,
    queue: [{ id: queueEntryId, playerId, state: "ready", position: 10 }],
    courts: [],
    assignments: [],
    participantStatus: "ready",
  };

  it("ignores duplicate and older snapshots", () => {
    expect(
      reconcileQueueSnapshot(current, { ...current, eventVersion: 8 }),
    ).toBe(current);
    expect(
      reconcileQueueSnapshot(current, { ...current, eventVersion: 7 }),
    ).toBe(current);
  });

  it("replaces local state with a newer authoritative snapshot", () => {
    const newer = {
      ...current,
      eventVersion: 10,
      queue: [],
    } satisfies QueueSnapshot;
    expect(reconcileQueueSnapshot(current, newer)).toEqual(newer);
  });

  it("refetches for a newer or skipped version and not for duplicates", () => {
    const envelope = (version: number): RealtimeEnvelope => ({
      schemaVersion: 1,
      eventId,
      clubId,
      aggregateVersion: version,
      occurredAt: "2026-09-02T00:00:00.000Z",
      payload: { eventType: "queue.changed", queueEntryId, state: "ready" },
    });

    expect(shouldRefetchForEnvelope(8, envelope(8))).toBe(false);
    expect(shouldRefetchForEnvelope(8, envelope(9))).toBe(true);
    expect(shouldRefetchForEnvelope(8, envelope(11))).toBe(true);
  });

  it("converges after a dropped message by accepting the latest snapshot", () => {
    const afterDrop = {
      ...current,
      eventVersion: 11,
      queue: [{ ...current.queue[0]!, position: 30 }],
    } satisfies QueueSnapshot;

    expect(reconcileQueueSnapshot(current, afterDrop).eventVersion).toBe(11);
    expect(reconcileQueueSnapshot(current, afterDrop).queue[0]?.position).toBe(
      30,
    );
  });
});
