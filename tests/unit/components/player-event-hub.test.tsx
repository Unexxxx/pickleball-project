import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  PlayerEventHub,
  type JoinedEvent,
} from "@/components/events/player-event-hub";
afterEach(cleanup);
const event: JoinedEvent = {
  id: "event",
  name: "Morning play",
  venue: "Courts",
  starts_at: "2026-09-10T00:00:00Z",
  status: "in_progress",
  join_code: "code",
  clubSlug: "club",
  clubName: "Club",
  timezone: "Asia/Manila",
  registration: "confirmed",
};
describe("player event hub", () => {
  it("links confirmed players to the live queue", () => {
    render(<PlayerEventHub events={[event]} />);
    expect(
      screen.getByRole("link", { name: "View live queue" }),
    ).toHaveAttribute("href", "/dashboard/clubs/club/events/event/queue");
  });
  it("does not offer a queue to waitlisted or upcoming players", () => {
    render(
      <PlayerEventHub
        events={[
          { ...event, registration: "waitlisted" },
          { ...event, id: "other", status: "published" },
        ]}
      />,
    );
    expect(
      screen.queryByRole("link", { name: "View live queue" }),
    ).not.toBeInTheDocument();
  });
  it("distinguishes failed loading from no registrations", () => {
    render(<PlayerEventHub events={[]} failed />);
    expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded");
  });
});
