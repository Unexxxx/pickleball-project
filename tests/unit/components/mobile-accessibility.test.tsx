import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FocusManager } from "@/components/ui/focus-manager";
import { FormErrorSummary } from "@/components/ui/form-error-summary";
import { EventActionTray } from "@/components/events/event-action-tray";
describe("mobile accessibility", () => {
  it("focuses newly active content", async () => {
    render(
      <FocusManager>
        <p>Updated assignment</p>
      </FocusManager>,
    );
    await waitFor(() =>
      expect(
        screen.getByText("Updated assignment").parentElement,
      ).toHaveFocus(),
    );
  });
  it("announces an error summary", () => {
    render(<FormErrorSummary errors={["Score is required"]} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Score is required");
  });
  it("labels the scrollable event tray", () => {
    render(<EventActionTray clubSlug="club" eventId="event" />);
    expect(
      screen.getByRole("navigation", { name: "Event actions" }),
    ).toHaveClass("overflow-x-auto");
  });
  it("keeps controls explicitly labelled", () => {
    render(<FormErrorSummary errors={[]} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
