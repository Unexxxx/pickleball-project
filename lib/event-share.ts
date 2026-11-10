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
  const times = `${time.format(new Date(event.starts_at))} to ${time.format(new Date(event.ends_at))}`;
  const when = `${day} · ${times}`;
  // As on the event page header: "Monday, November 2, 2026".
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(new Date(event.starts_at));
  const titleCase = (value: string) =>
    value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  // The event page header's badges; Published is the usual state, so only
  // the other statuses get one.
  const badges = [
    titleCase(event.event_type),
    titleCase(event.record_class),
    event.is_private ? "Private" : "Public",
    event.status === "published" ? null : titleCase(event.status),
  ].filter((badge): badge is string => Boolean(badge));
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
        : event.status !== "published" && event.status !== "in_progress"
          ? "Registration is closed."
          : event.is_private
            ? "Join with the passcode on UNEX."
            : "Request to join on UNEX.";
  return {
    title: event.name,
    club: event.club_name,
    when,
    date,
    times,
    badges,
    venue: event.venue,
    tags,
    spots: `${event.capacity} players`,
    description: `${when} · ${event.venue} · ${tags.join(" · ")} · ${event.capacity} players. Hosted by ${event.club_name}. ${join}`,
  };
}
