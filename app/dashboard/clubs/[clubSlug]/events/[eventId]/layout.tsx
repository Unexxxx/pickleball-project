import type { ReactNode } from "react";
import { EventActionTray } from "@/components/events/event-action-tray";
export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ clubSlug: string; eventId: string }>;
}) {
  const { clubSlug, eventId } = await params;
  return (
    <div className="min-w-0 space-y-4">
      <EventActionTray clubSlug={clubSlug} eventId={eventId} />
      {children}
    </div>
  );
}
