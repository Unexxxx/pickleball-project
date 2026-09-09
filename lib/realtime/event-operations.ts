"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
export type QueueItem = {
  id: string;
  playerId: string;
  state: "ready" | "assigned" | "left" | "unavailable";
  position: number;
  version?: number;
  displayName?: string;
  avatarUrl?: string | null;
  totalMatches?: number;
  eventWins?: number;
  eventLosses?: number;
  rating?: number;
};
export type QueueSnapshot = {
  eventId: string;
  eventVersion: number;
  queue: QueueItem[];
  courts: unknown[];
  assignments: unknown[];
  participantStatus: string;
};
export type RealtimeEnvelope = {
  schemaVersion: 1;
  eventId: string;
  clubId?: string;
  aggregateVersion: number;
  occurredAt: string;
  payload:
    | {
        eventType: "queue.changed";
        queueEntryId: string;
        state: QueueItem["state"];
      }
    | { eventType: "queue.reordered"; changedEntryIds: string[] }
    | {
        eventType:
          "result.changed" | "confirmation.changed" | "calculation.changed";
        entityId: string;
      };
};
export function reconcileQueueSnapshot(
  current: QueueSnapshot,
  incoming: QueueSnapshot,
) {
  return incoming.eventVersion > current.eventVersion ? incoming : current;
}
export function shouldRefetchForEnvelope(
  version: number,
  envelope: RealtimeEnvelope,
) {
  return envelope.schemaVersion !== 1 || envelope.aggregateVersion > version;
}
export function subscribeToEventOperations(
  supabase: SupabaseClient,
  clubId: string,
  eventId: string,
  onInvalidate: () => void,
) {
  const topic = `club:${clubId}:event:${eventId}:operations`;
  const channel = supabase
    .channel(topic, { config: { private: true } })
    .on("broadcast", { event: "queue.changed" }, onInvalidate)
    .on("broadcast", { event: "result.changed" }, onInvalidate)
    .on("broadcast", { event: "confirmation.changed" }, onInvalidate)
    .on("broadcast", { event: "calculation.changed" }, onInvalidate)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
