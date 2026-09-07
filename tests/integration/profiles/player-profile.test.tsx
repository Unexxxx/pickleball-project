import { describe, expect, it, vi } from "vitest";
import { MatchHistory } from "@/components/profiles/match-history";
import { render, screen } from "@testing-library/react";
vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));
describe("public profile presentation", () => {
  it("shows teammates and opponents with scores oriented to the profile player", () => {
    render(
      <MatchHistory
        slug="alex"
        page={1}
        rows={[
          {
            match_id: "second-side",
            format: "doubles",
            record_class: "unranked",
            played_at: "2026-09-08",
            result_status: "finalized",
            won: true,
            has_revision_history: false,
            side: 2,
            score: { games: [{ sideA: 5, sideB: 11 }] },
            participants: [
              { side: 2, name: "Alex", slug: "alex" },
              { side: 2, name: "Partner", slug: "partner" },
              { side: 1, name: "Opponent", slug: "opponent" },
              { side: 1, name: "Private player", slug: null },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByLabelText("Game 1: 11 to 5")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Partner" })).toHaveAttribute(
      "href",
      "/players/partner",
    );
    expect(screen.getByText("Private player").closest("a")).toBeNull();
    expect(
      screen.queryByRole("link", { name: /Next/ }),
    ).not.toBeInTheDocument();
  });
  it("shows a safe empty history", () => {
    render(<MatchHistory rows={[]} slug="alex" page={1} />);
    expect(screen.getByText(/no.*matches/i)).toBeInTheDocument();
  });
  it("shows correction and class filters", () => {
    render(
      <MatchHistory
        slug="alex"
        page={1}
        filter="ranked"
        rows={[
          {
            match_id: "m",
            format: "singles",
            record_class: "ranked",
            played_at: "2026-01-01",
            result_status: "finalized",
            won: true,
            has_revision_history: true,
          },
        ]}
      />,
    );
    expect(screen.getByText(/Corrected/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Unranked" })).toBeInTheDocument();
  });
});
