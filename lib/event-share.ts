import type { JoinEvent } from "@/lib/queries/event-join";

const TYPE: Record<string, string> = {
  open_play: "Open play",
  tournament: "Tournament",
  league: "League",
  clinic: "Clinic",
  other: "Event",
};

/**
 * What a shared event link shows in Messenger and other apps: the event
 * name, club, day, time, venue and how to join. Times use the club's time
 * zone, written like the event page ("Mon, Nov 2 · 4:00 PM to 8:00 PM").
 */
export function eventShareDetails(event: JoinEvent) {
  const timeZone = event.club_timezone || "UTC";
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(new Date(event.starts_at));
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
  const when = `${day} · ${time.format(new Date(event.starts_at))} to ${time.format(new Date(event.ends_at))}`;
  const format = event.formats.includes("singles") ? "Singles" : "Doubles";
  const tags = [
    TYPE[event.event_type] ?? "Event",
    format,
    event.record_class === "ranked" ? "Ranked" : null,
    event.is_private ? "Private" : null,
  ].filter((tag): tag is string => Boolean(tag));
  const join =
    event.status === "canceled"
      ? "This event was canceled."
      : event.status === "completed"
        ? "This event has ended."
        : event.status !== "published"
          ? "Registration is closed."
          : event.is_private
            ? "Join with the passcode on UNEX."
            : "Request to join on UNEX.";
  return {
    title: event.name,
    club: event.club_name,
    when,
    venue: event.venue,
    tags,
    spots: `${event.capacity} players`,
    description: `${when} · ${event.venue} · ${tags.join(" · ")} · ${event.capacity} players. Hosted by ${event.club_name}. ${join}`,
  };
}
