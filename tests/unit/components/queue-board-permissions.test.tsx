import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { QueueBoard } from "@/components/queues/queue-board";
import { adjustQueue } from "@/lib/actions/queues";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/queues", () => ({
  adjustQueue: vi.fn(async () => ({ ok: true, data: null })),
}));
afterEach(() => {
  cleanup();
  vi.mocked(adjustQueue).mockClear();
});
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
const twoEntries = [
  ...entries,
  { ...entries[0]!, id: "two", playerId: "second", displayName: "Second" },
];
it("moves a player with a default reason when none is given", async () => {
  render(
    <QueueBoard clubId="club" eventId="event" entries={twoEntries} canManage />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Move Second up", hidden: true }),
  );
  await waitFor(() =>
    expect(adjustQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        queueEntryId: "two",
        reason: "Organizer moved player up",
      }),
    ),
  );
});
it("sends the organizer's optional reason with the move", async () => {
  render(
    <QueueBoard clubId="club" eventId="event" entries={twoEntries} canManage />,
  );
  fireEvent.change(screen.getByLabelText(/Reason for the next move/), {
    target: { value: "  Arrived early  " },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Move Player down", hidden: true }),
  );
  await waitFor(() =>
    expect(adjustQueue).toHaveBeenCalledWith(
      expect.objectContaining({ queueEntryId: "two", reason: "Arrived early" }),
    ),
  );
});
it("rejects a reason that is too short to record", () => {
  render(
    <QueueBoard clubId="club" eventId="event" entries={twoEntries} canManage />,
  );
  fireEvent.change(screen.getByLabelText(/Reason for the next move/), {
    target: { value: "ok" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Move Second up", hidden: true }),
  );
  expect(adjustQueue).not.toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent(
    "A reason needs at least 3 characters",
  );
});
