import type { ReactNode } from "react";
import { EventActionTray } from "@/components/events/event-action-tray";
import {
  WORKSPACE_ROLES,
  getClubHome,
  getViewerRole,
} from "@/lib/queries/club-home";
import { createClient } from "@/lib/supabase/server";
export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ clubSlug: string; eventId: string }>;
}) {
  const { clubSlug, eventId } = await params;
  const club = await getClubHome(clubSlug);
  const role = club ? await getViewerRole(club.id) : null;
  // Players reach the live queue page too; the workspace tray is for the
  // people running the event. Each workspace page also enforces this.
  const isStaff = role !== null && WORKSPACE_ROLES.includes(role);
  // The running tools only appear once the event has started.
  let status: string | null = null;
  if (isStaff && club) {
    const { data } = await (
      await createClient()
    )
      .from("events")
      .select("status")
      .eq("id", eventId)
      .eq("club_id", club.id)
      .maybeSingle();
    status = data?.status ?? null;
  }
  return (
    <div className="min-w-0 space-y-4">
      {status === "in_progress" || status === "completed" ? (
        <EventActionTray
          clubSlug={clubSlug}
          eventId={eventId}
          status={status}
        />
      ) : null}
      {children}
    </div>
  );
}
