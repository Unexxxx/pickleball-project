import "server-only";
import { createClient } from "@/lib/supabase/server";
export async function resolveEventJoin(code: string) {
  if (!/^[a-f0-9]{18}$/.test(code)) return null;
  const s = await createClient();
  const { data } = await s.rpc("resolve_event_join", { p_join_code: code });
  return data?.[0] ?? null;
}

export async function getEventJoinRoster(code: string, eventId: string) {
  const s = await createClient();
  const [{ data: roster }, { data: ownRegistration }] = await Promise.all([
    s.rpc("get_event_join_roster", { p_join_code: code }),
    s
      .from("event_registrations")
      .select("id,status")
      .eq("event_id", eventId)
      .in("status", ["confirmed", "waitlisted"])
      .maybeSingle(),
  ]);
  return { roster: roster ?? [], ownRegistration: ownRegistration ?? null };
}
