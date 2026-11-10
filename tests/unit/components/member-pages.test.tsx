import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const loadMemberPage = vi.fn();
vi.mock("@/lib/actions/clubs", () => ({
  loadMemberPage: (...args: unknown[]) => loadMemberPage(...args),
}));

import { MemberList } from "@/components/clubs/member-list";
import type { DirectoryEntry } from "@/lib/queries/club-home";

afterEach(() => {
  cleanup();
  loadMemberPage.mockReset();
  vi.useRealTimers();
});

const CLUB = "00000000-0000-4000-8000-000000000001";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const member = (n: number): DirectoryEntry => ({
  playerId: id(n),
  name: `Member ${String(n).padStart(4, "0")}`,
  slug: `member-${n}`,
  avatarUrl: null,
  role: "member",
  joinedAt: "2026-11-01T00:00:00Z",
});
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => member(from + i));
const ok = (items: DirectoryEntry[], total: number, hasMore: boolean) => ({
  ok: true,
  data: { items, total, hasMore },
  requestId: "r",
});

describe("paged member list", () => {
  it("shows the first 30 and loads the next 30 after the last name", async () => {
    loadMemberPage.mockResolvedValue(ok(range(31, 60), 1000, true));
    render(
      <MemberList
        clubId={CLUB}
        initial={{ items: range(1, 30), total: 1000, hasMore: true }}
        privateCount={0}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(30);
    expect(screen.getByText("Showing 30 of 1,000")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(60),
    );
    expect(loadMemberPage).toHaveBeenCalledWith({
      clubId: CLUB,
      scope: "members",
      query: "",
      after: { name: "Member 0030", id: id(30) },
    });
    expect(screen.getByText("Showing 60 of 1,000")).toBeInTheDocument();
  });

  it("searches the whole club once typing pauses", async () => {
    vi.useFakeTimers();
    loadMemberPage.mockResolvedValue(ok([member(777)], 1, false));
    render(
      <MemberList
        clubId={CLUB}
        initial={{ items: range(1, 30), total: 1000, hasMore: true }}
        privateCount={0}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "0777" },
    });
    expect(loadMemberPage).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(loadMemberPage).toHaveBeenCalledTimes(1);
    expect(loadMemberPage).toHaveBeenCalledWith({
      clubId: CLUB,
      scope: "members",
      query: "0777",
      after: null,
    });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Member 0777")).toBeInTheDocument();
    // Everything matching is on screen, so no Show more.
    expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
  });

  it("has no search or Show more for a small club", () => {
    render(
      <MemberList
        clubId={CLUB}
        initial={{ items: range(1, 3), total: 3, hasMore: false }}
        privateCount={1}
      />,
    );
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
    expect(
      screen.getByText(/1 member keeps their profile private/),
    ).toBeInTheDocument();
  });
});
