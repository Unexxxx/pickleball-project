import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { JoinedEvent } from "@/components/events/player-event-hub";
import { PlayHero } from "@/components/dashboard/play-hero";
afterEach(cleanup);
const event: JoinedEvent = {
  id: "event",
  name: "Friday open play",
  venue: "Central courts",
  starts_at: "2026-10-16T10:00:00Z",
  status: "in_progress",
  join_code: "code",
  clubSlug: "club",
  clubName: "Dink Lab",
  timezone: "Asia/Manila",
  registration: "confirmed",
};
const queueHref = "/dashboard/clubs/club/events/event/queue";

describe("play hero", () => {
  it("offers a match or a live queue when the player has nothing booked", () => {
    render(<PlayHero status={{ kind: "idle" }} hasLiveSessions />);
    expect(
      screen.getByRole("heading", { name: "Ready to play?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Find a match" })).toHaveAttribute(
      "href",
      "/dashboard/events?tab=discover",
    );
    expect(
      screen.getByRole("link", { name: "Join a live queue" }),
    ).toHaveAttribute("href", "#live-now");
  });

  it("shows the real queue position without inventing a wait time", () => {
    render(
      <PlayHero
        status={{ kind: "queued", event, position: 3 }}
        hasLiveSessions={false}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "#3 in line" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 players are ahead of you/)).toBeInTheDocument();
    expect(screen.queryByText(/min/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Follow the queue" }),
    ).toHaveAttribute("href", queueHref);
  });

  it("sends an assigned player to their court", () => {
    render(
      <PlayHero
        status={{ kind: "on_court", event, court: "Court 2" }}
        hasLiveSessions={false}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Head to Court 2" }),
    ).toBeInTheDocument();
  });

  it("shows event, time and venue for an upcoming match", () => {
    render(
      <PlayHero
        status={{
          kind: "upcoming",
          event: { ...event, status: "published" },
        }}
        hasLiveSessions={false}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Friday open play" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dink Lab · Central courts/)).toBeInTheDocument();
    expect(screen.getByText("Fri, Oct 16, 6:00 PM")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View event" })).toHaveAttribute(
      "href",
      "/join/code",
    );
    expect(
      screen.queryByRole("link", { name: /queue/i }),
    ).not.toBeInTheDocument();
  });
});
