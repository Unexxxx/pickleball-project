import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegistrationStatus } from "@/components/events/registration-status";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/actions/events", () => ({
  registerForEvent: vi.fn(),
  withdrawFromEvent: vi.fn(),
}));

describe("RegistrationStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows Join and hides Withdraw before registration", () => {
    render(<RegistrationStatus eventId={crypto.randomUUID()} />);
    expect(screen.getByRole("button", { name: "Join event" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Withdraw registration" }),
    ).not.toBeInTheDocument();
  });

  it("shows Withdraw and hides Join for an active registration", () => {
    render(
      <RegistrationStatus eventId={crypto.randomUUID()} initialRegistered />,
    );
    expect(
      screen.getByRole("button", { name: "Withdraw registration" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Join event" }),
    ).not.toBeInTheDocument();
  });
});
