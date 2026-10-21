import type { ReactNode } from "react";
import { EventActionTray } from "@/components/events/event-action-tray";
import {
  WORKSPACE_ROLES,
  getClubHome,
  getViewerRole,
} from "@/lib/queries/club-home";
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
  const showTray = role !== null && WORKSPACE_ROLES.includes(role);
  return (
    <div className="min-w-0 space-y-4">
      {showTray ? (
        <EventActionTray clubSlug={clubSlug} eventId={eventId} />
      ) : null}
      {children}
    </div>
  );
}
