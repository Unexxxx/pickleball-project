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
const fill = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("create event form", () => {
  it("fills the end time 3 hours after the start and shows it in the preview", () => {
    renderForm();
    fill("Starts", "2030-11-09T07:00");
    expect(screen.getByLabelText("Ends")).toHaveValue("2030-11-09T10:00");
    expect(screen.getByRole("button", { name: "3 hours" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(/7:00 AM – 10:00 AM/)).toBeInTheDocument();
  });

  it("keeps the event's length when the start moves", () => {
    renderForm();
    fill("Starts", "2030-11-09T07:00");
    fireEvent.click(screen.getByRole("button", { name: "2 hours" }));
    fill("Starts", "2030-11-09T08:00");
    expect(screen.getByLabelText("Ends")).toHaveValue("2030-11-09T10:00");
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
    fill("Starts", "2030-11-09T07:00");
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
