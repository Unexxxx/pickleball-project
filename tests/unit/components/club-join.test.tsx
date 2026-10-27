import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/clubs", () => ({
  joinClub: vi.fn(),
  leaveClub: vi.fn(),
}));

import { ClubJoin } from "@/components/clubs/club-join";

afterEach(cleanup);
const base = { clubId: "c1", clubSlug: "dink-a-boo", clubName: "Dink A Boo" };

describe("club join control", () => {
  it("sends signed-out visitors to log in and back to the club", () => {
    render(
      <ClubJoin
        {...base}
        joinPolicy="approval"
        membership={{ signedIn: false, status: null, role: null }}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Request to join" }),
    ).toHaveAttribute("href", "/login?next=%2Fclubs%2Fdink-a-boo");
  });

  it("offers Join club on open clubs and Request to join otherwise", () => {
    const none = { signedIn: true, status: null, role: null } as const;
    const { rerender } = render(
      <ClubJoin {...base} joinPolicy="open" membership={none} />,
    );
    expect(screen.getByRole("button", { name: "Join club" })).toBeEnabled();
    rerender(<ClubJoin {...base} joinPolicy="approval" membership={none} />);
    expect(
      screen.getByRole("button", { name: "Request to join" }),
    ).toBeEnabled();
  });

  it("shows a pending request with a way to cancel it", () => {
    render(
      <ClubJoin
        {...base}
        joinPolicy="approval"
        membership={{ signedIn: true, status: "requested", role: "member" }}
      />,
    );
    expect(screen.getByText("Request sent")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel request" }),
    ).toBeInTheDocument();
  });

  it("offers Leave club to members, in the same place as Join", () => {
    render(
      <ClubJoin
        {...base}
        joinPolicy="open"
        membership={{ signedIn: true, status: "active", role: "member" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Leave club" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /join/i })).toBeNull();
  });

  it("offers nothing to suspended members", () => {
    const { container } = render(
      <ClubJoin
        {...base}
        joinPolicy="open"
        membership={{ signedIn: true, status: "suspended", role: "member" }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("lets a former member join again", () => {
    render(
      <ClubJoin
        {...base}
        joinPolicy="open"
        membership={{ signedIn: true, status: "left", role: "member" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Join club" })).toBeEnabled();
  });
});
