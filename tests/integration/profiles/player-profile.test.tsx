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
