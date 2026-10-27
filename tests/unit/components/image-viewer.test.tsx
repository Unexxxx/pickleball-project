import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ViewablePhoto } from "@/components/ui/image-viewer";
afterEach(cleanup);

describe("viewable photo", () => {
  it("opens the photo full screen and closes on a tap anywhere", () => {
    render(
      <ViewablePhoto
        src="https://example.test/a.png"
        alt="Ana's profile photo"
        className="profile-avatar"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "View Ana's profile photo" }),
    );
    const viewer = screen.getByRole("dialog", { name: "Ana's profile photo" });
    expect(
      screen.getByRole("img", { name: "Ana's profile photo" }),
    ).toHaveAttribute("src", "https://example.test/a.png");
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(viewer);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes with Escape", () => {
    render(
      <ViewablePhoto
        src="https://example.test/a.png"
        alt="Cover"
        className="x"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "View Cover" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows owner actions only when provided, without closing on press", () => {
    let pressed = false;
    render(
      <ViewablePhoto
        src="https://example.test/a.png"
        alt="Me"
        className="x"
        actions={() => (
          <button type="button" onClick={() => (pressed = true)}>
            Edit profile
          </button>
        )}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "View Me" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(pressed).toBe(true);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("is a plain image (not a button) when there is no photo", () => {
    render(<ViewablePhoto src={null} alt="Bo's profile photo" className="x" />);
    expect(
      screen.getByRole("img", { name: "Bo's profile photo" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
