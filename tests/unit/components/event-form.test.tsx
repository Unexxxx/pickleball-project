import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const createEvent = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/actions/events", () => ({
  createEvent: (...args: unknown[]) => createEvent(...args),
}));

import { EventForm } from "@/components/events/event-form";

afterEach(() => {
  cleanup();
  createEvent.mockReset();
});

const renderForm = () =>
  render(
    <EventForm
      clubId="00000000-0000-4000-8000-000000000001"
      clubSlug="dink-a-boo"
      clubName="Dink A Boo"
      clubImageUrl={null}
    />,
  );
const endsText = () => document.querySelector(".eb-ends")?.textContent;
const fill = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("create event form", () => {
  it("starts at a picked hour and ends after the chosen length", () => {
    renderForm();
    fill("Date", "2030-11-09");
    // Defaults: 7:00 AM and 3 hours.
    expect(screen.getByRole("button", { name: "3 hours" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(endsText()).toBe("Ends 10:00 AM");
    fill("Start hour", "6");
    fireEvent.click(screen.getByRole("button", { name: "PM" }));
    fireEvent.click(screen.getByRole("button", { name: "8 hours" }));
    expect(endsText()).toBe("Ends 2:00 AM the next day");
    expect(screen.getByText(/6:00 PM – 2:00 AM/)).toBeInTheDocument();
  });

  it("offers lengths from 3 to 8 hours only", () => {
    renderForm();
    const lengths = screen
      .getAllByRole("button", { name: /^\d hours$/ })
      .map((b) => b.textContent);
    expect(lengths).toEqual([
      "3 hours",
      "4 hours",
      "5 hours",
      "6 hours",
      "7 hours",
      "8 hours",
    ]);
  });

  it("lets organizers type an exact start time like 6:15 AM", () => {
    renderForm();
    fill("Date", "2030-11-09");
    fireEvent.click(screen.getByRole("button", { name: "Type an exact time" }));
    expect(screen.getByLabelText("Start time")).toHaveValue("07:00");
    fill("Start time", "06:15");
    expect(endsText()).toBe("Ends 9:15 AM");
    fireEvent.click(
      screen.getByRole("button", { name: "Pick an hour instead" }),
    );
    expect(screen.getByLabelText("Start hour")).toHaveValue("6");
  });

  it("names the action on the button and asks for a passcode when private", () => {
    renderForm();
    expect(
      screen.getByRole("button", { name: "Publish event" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Save as draft"));
    expect(
      screen.getByRole("button", { name: "Save draft" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Passcode")).toBeNull();
    fireEvent.click(screen.getByLabelText("Private"));
    expect(screen.getByLabelText("Passcode")).toBeRequired();
  });

  it("sends exactly the chosen details to createEvent", async () => {
    createEvent.mockResolvedValue({ ok: true, data: { eventId: "e1" } });
    renderForm();
    fill("Event name", "Saturday Morning Open Play");
    fill("Date", "2030-11-09");
    fill("Venue", "Home Court Pickleball");
    fireEvent.click(screen.getByLabelText("Ranked"));
    fireEvent.click(screen.getByRole("button", { name: "More courts" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish event" }));
    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent.mock.calls[0]![0]).toMatchObject({
      clubId: "00000000-0000-4000-8000-000000000001",
      type: "open_play",
      name: "Saturday Morning Open Play",
      venue: "Home Court Pickleball",
      startsAt: new Date("2030-11-09T07:00").toISOString(),
      endsAt: new Date("2030-11-09T10:00").toISOString(),
      capacity: 16,
      courtCount: 5,
      formats: ["doubles"],
      recordClass: "ranked",
      initialStatus: "published",
      isPrivate: false,
      accessCode: null,
    });
  });
});
