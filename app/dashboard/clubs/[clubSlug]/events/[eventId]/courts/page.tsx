import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClub } from "@/lib/queries/clubs";
import { currentPlayerId } from "@/lib/auth/authorization";
import { CourtEditor } from "@/components/events/court-editor";
import { CLUB_ADMIN_ROLES, requireClubAccess } from "@/lib/queries/club-home";

export default async function CourtsPage({
  params,
}: {
  params: Promise<{ clubSlug: string; eventId: string }>;
}) {
  const { clubSlug, eventId } = await params;
  const club = await getClub(clubSlug);
  if (!club) notFound();
  // Server-side role gate (hidden buttons are not a permission check).
  await requireClubAccess(club.slug, CLUB_ADMIN_ROLES);
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
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--dink-volt)]">
          Event operations
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
          Courts
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
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
