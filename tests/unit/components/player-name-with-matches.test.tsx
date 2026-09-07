import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  MatchCountBadge,
  PlayerNameWithMatches,
} from "@/components/queues/player-name-with-matches";

describe("player name with matches", () => {
  it("shows a compact match count after the player name", () => {
    render(<PlayerNameWithMatches displayName="Kent Onyx" totalMatches={2} />);

    expect(screen.getByText("Kent Onyx")).toBeInTheDocument();
    expect(screen.getByLabelText("2 matches")).toHaveTextContent("2");
  });

  it("does not show a match count when the player has no matches", () => {
    render(<PlayerNameWithMatches displayName="New Player" totalMatches={0} />);

    expect(screen.getByText("New Player")).toBeInTheDocument();
    expect(screen.queryByLabelText(/completed match/)).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("can render the badge independently beside player metadata", () => {
    render(<MatchCountBadge totalMatches={2} />);

    expect(screen.getByLabelText("2 matches")).toHaveTextContent("2");
  });
});
