import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const changeMemberRole = vi.fn();
const removeMember = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/actions/clubs", () => ({
  changeMemberRole: (...args: unknown[]) => changeMemberRole(...args),
  removeMember: (...args: unknown[]) => removeMember(...args),
}));

import { ManagedMemberList } from "@/components/clubs/managed-member-list";
import type { RosterEntry } from "@/lib/queries/club-home";

afterEach(() => {
  cleanup();
  changeMemberRole.mockReset();
  removeMember.mockReset();
});

const CLUB = "00000000-0000-4000-8000-000000000001";
const entry = (n: number, role: RosterEntry["role"]): RosterEntry => ({
  membershipId: `00000000-0000-4000-8000-0000000000a${n}`,
  playerId: `p${n}`,
  name: `Player ${n}`,
  slug: `player-${n}`,
  avatarUrl: null,
  role,
  status: "active",
  since: "2026-10-27T00:00:00Z",
});
const members = [entry(1, "owner"), entry(2, "organizer"), entry(3, "member")];
const renderAs = (viewerRole: RosterEntry["role"], viewerPlayerId: string) =>
  render(
    <ManagedMemberList
      clubId={CLUB}
      clubSlug="dink-a-boo"
      members={members}
      viewerRole={viewerRole}
      viewerPlayerId={viewerPlayerId}
      detail="role"
    />,
  );

describe("member menu", () => {
  it("lets an owner make a member an admin", async () => {
    changeMemberRole.mockResolvedValue({ ok: true });
    renderAs("owner", "p1");
    // No menu on your own row.
    expect(screen.queryByLabelText("Options for Player 1")).toBeNull();
    fireEvent.click(screen.getByLabelText("Options for Player 3"));
    expect(
      screen.getByRole("menuitemradio", { name: /Member/ }),
    ).toHaveAttribute("aria-checked", "true");
    // Owner, admin and member are the only roles.
    expect(
      screen.getAllByRole("menuitemradio").map((item) => item.textContent),
    ).toEqual([
      "AdminCreates events and runs the club",
      "MemberPlays in events",
    ]);
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Admin/ }));
    await waitFor(() =>
      expect(changeMemberRole).toHaveBeenCalledWith({
        clubId: CLUB,
        clubSlug: "dink-a-boo",
        membershipId: members[2]!.membershipId,
        role: "organizer",
      }),
    );
  });

  it("asks before removing someone", async () => {
    removeMember.mockResolvedValue({ ok: true });
    renderAs("owner", "p1");
    fireEvent.click(screen.getByLabelText("Options for Player 2"));
    fireEvent.click(screen.getByRole("menuitem", { name: /Remove from club/ }));
    expect(removeMember).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("menuitem", { name: "Remove" }));
    await waitFor(() => expect(removeMember).toHaveBeenCalledTimes(1));
  });

  it("lets admins remove members only, with no role changes", () => {
    renderAs("organizer", "p2");
    // The owner's row has no menu.
    expect(screen.queryByLabelText("Options for Player 1")).toBeNull();
    fireEvent.click(screen.getByLabelText("Options for Player 3"));
    expect(screen.queryByRole("menuitemradio")).toBeNull();
    expect(
      screen.getByRole("menuitem", { name: /Remove from club/ }),
    ).toBeInTheDocument();
  });
});
