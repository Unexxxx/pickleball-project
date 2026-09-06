import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClub } from "@/lib/queries/clubs";
import { currentPlayerId } from "@/lib/auth/authorization";
import { CourtEditor } from "@/components/events/court-editor";

export default async function CourtsPage({
  params,
}: {
  params: Promise<{ clubSlug: string; eventId: string }>;
}) {
  const { clubSlug, eventId } = await params;
  const club = await getClub(clubSlug);
  if (!club) notFound();
  const supabase = await createClient();
  const playerId = await currentPlayerId();
  const { data: event } = await supabase
    .from("events")
    .select("id,name,status")
    .eq("id", eventId)
    .eq("club_id", club.id)
    .single();
  if (!event) notFound();
  const { data: courts } = await supabase
    .from("event_courts")
    .select("id,label,status,current_match_id")
    .eq("event_id", eventId)
    .neq("status", "inactive")
    .order("label");
  const { data: membership } = await supabase
    .from("club_memberships")
    .select("role")
    .eq("club_id", club.id)
    .eq("player_id", playerId ?? "")
    .eq("status", "active")
    .maybeSingle();
  const canManage =
    membership?.role === "owner" || membership?.role === "organizer";
  const changesAllowed =
    event.status !== "completed" && event.status !== "canceled";
  return (
    <main className="space-y-5">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-800">
          Event operations
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
          Courts
        </h1>
        <p className="mt-2 text-slate-600">
          {event.name} court availability and player assignments.
        </p>
      </header>
      <CourtEditor
        eventId={eventId}
        clubSlug={clubSlug}
        courts={(courts ?? []).map((court) => ({
          id: court.id,
          label: court.label,
          status: court.status,
          currentMatchId: court.current_match_id,
        }))}
        canManage={canManage}
        changesAllowed={changesAllowed}
      />
    </main>
  );
}
