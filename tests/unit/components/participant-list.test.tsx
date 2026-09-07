import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ParticipantList } from "@/components/events/participant-list";

describe("ParticipantList", () => {
  it("shows a login gate instead of a misleading empty roster to guests", () => {
    render(
      <ParticipantList
        participants={[]}
        capacity={36}
        viewerAuthenticated={false}
        loginHref="/login?next=%2Fjoin%2Fevent-code"
      />,
    );

    expect(screen.getByText("Sign in to see who's playing")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Sign in to view participants" }),
    ).toHaveAttribute("href", "/login?next=%2Fjoin%2Fevent-code");
    expect(
      screen.queryByText("No participants have registered yet."),
    ).toBeNull();
    expect(screen.queryByText(/0 \/ 36 confirmed/)).toBeNull();
  });
});
