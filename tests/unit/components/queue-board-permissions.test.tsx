import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { QueueBoard } from "@/components/queues/queue-board";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/queues", () => ({ adjustQueue: vi.fn() }));
afterEach(cleanup);
const entries = [
  {
    id: "one",
    playerId: "player",
    displayName: "Player",
    state: "ready" as const,
    position: 1,
    version: 1,
  },
];
it("shows the bench without mutation buttons by default", () => {
  render(<QueueBoard clubId="club" eventId="event" entries={entries} />);
  expect(screen.getByText("Player")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { hidden: true }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Player").closest("details")).toBeNull();
});
it("shows event record and rating in the expanded bench", () => {
  render(
    <QueueBoard
      clubId="club"
      eventId="event"
      entries={[
        {
          ...entries[0]!,
          eventWins: 3,
          eventLosses: 1,
          totalMatches: 4,
          rating: 1520.7,
        },
      ]}
    />,
  );
  expect(screen.getByText("3–1")).toBeInTheDocument();
  expect(screen.getByText("75%")).toBeInTheDocument();
  expect(screen.getByText("1521")).toBeInTheDocument();
});
it("shows movement controls only for admins", () => {
  render(
    <QueueBoard clubId="club" eventId="event" entries={entries} canManage />,
  );
  expect(
    screen.getByRole("button", { name: "Move Player up", hidden: true }),
  ).toBeInTheDocument();
});
