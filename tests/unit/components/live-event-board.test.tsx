import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LiveEventBoard } from "@/components/queues/live-event-board";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/matchmaking", () => ({
  assignNextQueuedMatch: vi.fn(),
}));
vi.mock("@/lib/actions/results", () => ({ endMatchWithScore: vi.fn() }));
vi.mock("@/lib/actions/queues", () => ({ replaceStandbyPlayer: vi.fn() }));
afterEach(cleanup);

const player = (n: number) => ({
  id: `entry-${n}`,
  playerId: `player-${n}`,
  displayName: `Player ${n}`,
  state: "ready" as const,
  position: n,
  version: 1,
});
const board = (queue: ReturnType<typeof player>[], reservedSlots: number[]) =>
  render(
    <LiveEventBoard
      matches={[]}
      queue={queue}
      format="singles"
      matchesHref="/matches"
      clubSlug="club"
      eventId="event"
      canManage={false}
      viewerPlayerId={null}
      courtAvailable
      queueVersion={1}
      matchDurationMinutes={15}
      reservedSlots={reservedSlots}
    />,
  );
const stage = (heading: string) =>
  screen.getByRole("heading", { name: heading }).closest("section")!;

it("shows only reserved players under Standby and Upcoming", () => {
  board([1, 2, 3].map(player), [2]);
  const standby = within(stage("Standby — next match"));
  expect(standby.getByText("Player 1")).toBeInTheDocument();
  expect(standby.getByText("Player 2")).toBeInTheDocument();
  const upcoming = within(stage("Upcoming match"));
  expect(upcoming.queryByText("Player 3")).not.toBeInTheDocument();
  expect(upcoming.getByText("No upcoming lineup is waiting.")).toBeVisible();
  expect(
    upcoming.getByText(/Forms when 1 more player is waiting/),
  ).toBeVisible();
});

it("says how many players are missing before a lineup can be saved", () => {
  board([player(1)], []);
  const standby = within(stage("Standby — next match"));
  expect(standby.queryByText("Player 1")).not.toBeInTheDocument();
  expect(standby.getByText("No lineup is on standby yet.")).toBeVisible();
  expect(standby.getByText(/Waiting for 1 more player/)).toBeVisible();
});
