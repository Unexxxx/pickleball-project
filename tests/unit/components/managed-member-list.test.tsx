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
const transferClubOwnership = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/actions/clubs", () => ({
  changeMemberRole: (...args: unknown[]) => changeMemberRole(...args),
  removeMember: (...args: unknown[]) => removeMember(...args),
  transferClubOwnership: (...args: unknown[]) => transferClubOwnership(...args),
}));

import { ManagedMemberList } from "@/components/clubs/managed-member-list";
import type { RosterEntry } from "@/lib/queries/club-home";

afterEach(() => {
  cleanup();
  changeMemberRole.mockReset();
  removeMember.mockReset();
  transferClubOwnership.mockReset();
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
    // One action for the role, then remove.
    expect(
      screen.getAllByRole("menuitem").map((item) => item.textContent?.trim()),
    ).toEqual([
      "Make adminCan create events and run the club",
      "Remove from club",
    ]);
    fireEvent.click(screen.getByRole("menuitem", { name: /Make admin/ }));
    await waitFor(() =>
      expect(changeMemberRole).toHaveBeenCalledWith({
        clubId: CLUB,
        clubSlug: "dink-a-boo",
        membershipId: members[2]!.membershipId,
        role: "organizer",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Player 3 is now an admin.",
    );
  });

  it("lets an owner remove an admin's role", async () => {
    changeMemberRole.mockResolvedValue({ ok: true });
    renderAs("owner", "p1");
    fireEvent.click(screen.getByLabelText("Options for Player 2"));
    expect(screen.queryByRole("menuitem", { name: /Make admin/ })).toBeNull();
    fireEvent.click(
      screen.getByRole("menuitem", { name: /Remove admin role/ }),
    );
    await waitFor(() =>
      expect(changeMemberRole).toHaveBeenCalledWith(
        expect.objectContaining({ role: "member" }),
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Player 2 is no longer an admin.",
    );
  });

  it("lets the owner transfer ownership to an admin, after confirming", async () => {
    transferClubOwnership.mockResolvedValue({ ok: true });
    renderAs("owner", "p1");
    // A member has to be made an admin first.
    fireEvent.click(screen.getByLabelText("Options for Player 3"));
    expect(
      screen.queryByRole("menuitem", { name: /Transfer ownership/ }),
    ).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });

    fireEvent.click(screen.getByLabelText("Options for Player 2"));
    fireEvent.click(
      screen.getByRole("menuitem", { name: /Transfer ownership/ }),
    );
    expect(transferClubOwnership).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("menuitem", { name: "Transfer" }));
    await waitFor(() =>
      expect(transferClubOwnership).toHaveBeenCalledWith({
        clubId: CLUB,
        clubSlug: "dink-a-boo",
        membershipId: members[1]!.membershipId,
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Player 2 is now the club owner.",
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
    expect(screen.queryByRole("menuitem", { name: /admin/i })).toBeNull();
    expect(
      screen.getByRole("menuitem", { name: /Remove from club/ }),
    ).toBeInTheDocument();
  });
});
