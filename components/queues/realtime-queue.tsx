"use client";
import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  reconcileQueueSnapshot,
  subscribeToEventOperations,
  type QueueSnapshot,
} from "@/lib/realtime/event-operations";
export function RealtimeQueue({
  clubId,
  initial,
}: {
  clubId: string;
  initial: QueueSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [stale, setStale] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const s = createClient();
    const refresh = async () => {
      const { data, error } = await s
        .from("events")
        .select(
          "queue_version,event_queue_entries(id,player_id,state,position_key,version)",
        )
        .eq("id", initial.eventId)
        .single();
      if (error) {
        setStale(true);
        return;
      }
      setStale(false);
      setSnapshot((current) =>
        reconcileQueueSnapshot(current, {
          ...current,
          eventVersion: data.queue_version,
          queue: data.event_queue_entries.map((q) => ({
            id: q.id,
            playerId: q.player_id,
            state: q.state,
            position: q.position_key,
            version: q.version,
          })),
        }),
      );
      router.refresh();
    };
    const unsubscribe = subscribeToEventOperations(
      s,
      clubId,
      initial.eventId,
      () => void refresh(),
    );
    const online = () => void refresh();
    window.addEventListener("online", online);
    window.addEventListener("offline", () => setStale(true));
    return () => {
      unsubscribe();
      window.removeEventListener("online", online);
    };
  }, [clubId, initial.eventId, router]);
  return (
    <div className={`queue-sync-status${stale ? " is-stale" : ""}`} role="status">
      {stale ? <WifiOff aria-hidden="true" size={17} /> : <Wifi aria-hidden="true" size={17} />}
      <span>
        {stale ? "Offline — queue may be stale" : "Queue is current"}
      </span>
      <span data-testid="queue-version" data-version={snapshot.eventVersion} />
    </div>
  );
}
