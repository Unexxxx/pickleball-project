import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const setClubContacts = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/clubs", () => ({
  setClubContacts: (...args: unknown[]) => setClubContacts(...args),
}));

import { ClubContact } from "@/components/clubs/club-contact";

afterEach(() => {
  cleanup();
  setClubContacts.mockReset();
});
const base = { clubId: "c1", clubSlug: "dink-a-boo", legacyContact: null };

describe("club contacts", () => {
  it("links each published contact the right way", () => {
    render(
      <ClubContact
        {...base}
        canEdit={false}
        contacts={{
          email: "hi@dinkaboo.ph",
          facebook: "https://www.facebook.com/dinkaboo",
          phone: "0927 647 9058",
        }}
      />,
    );
    expect(
      screen.getByRole("link", { name: "hi@dinkaboo.ph" }),
    ).toHaveAttribute("href", "mailto:hi@dinkaboo.ph");
    const fb = screen.getByRole("link", { name: "facebook.com/dinkaboo" });
    expect(fb).toHaveAttribute("href", "https://www.facebook.com/dinkaboo");
    expect(fb).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "0927 647 9058" })).toHaveAttribute(
      "href",
      "tel:09276479058",
    );
    expect(screen.queryByRole("button", { name: /contacts/i })).toBeNull();
  });

  it("invites admins to add contacts when there are none", () => {
    render(
      <ClubContact
        {...base}
        canEdit
        contacts={{ email: null, facebook: null, phone: null }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Add contacts" }),
    ).toBeInTheDocument();
  });

  it("shows the server's per-field message under the right field", async () => {
    setClubContacts.mockResolvedValue({
      ok: false,
      error: {
        message: "Check the highlighted contact details.",
        fields: { email: ["Enter an email like club@example.com."] },
      },
    });
    render(
      <ClubContact
        {...base}
        canEdit
        contacts={{ email: null, facebook: null, phone: "0927 647 9058" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit contacts" }));
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "nope" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save contacts" }));
    await waitFor(() =>
      expect(
        screen.getByText("Enter an email like club@example.com."),
      ).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/Email/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(setClubContacts).toHaveBeenCalledWith({
      clubId: "c1",
      clubSlug: "dink-a-boo",
      email: "nope",
      facebook: "",
      phone: "0927 647 9058",
    });
  });

  it("falls back to the old contact line before the migration", () => {
    render(
      <ClubContact
        {...base}
        legacyContact="09276479058"
        canEdit
        contacts={null}
      />,
    );
    expect(screen.getByText("09276479058")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
