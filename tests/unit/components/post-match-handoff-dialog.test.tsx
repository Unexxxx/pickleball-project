import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PostMatchHandoffDialog } from "@/components/queues/post-match-handoff-dialog";

const players = [
  { id: "1", displayName: "Alex Rivera" },
  { id: "2", displayName: "Sam Lee" },
  { id: "3", displayName: "Jordan Cruz" },
  { id: "4", displayName: "Taylor Lim" },
];

afterEach(() => vi.useRealTimers());

describe("post-match handoff dialog", () => {
  it("shows the released court and standby lineup and can close immediately", () => {
    const close = vi.fn();
    render(
      <PostMatchHandoffDialog
        courtLabel="Court 2"
        players={players}
        format="doubles"
        onClose={close}
      />,
    );
    expect(screen.getByRole("dialog")).toHaveAccessibleName(
      "Proceed to Court 2",
    );
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.getByText("Taylor Lim")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Close court handoff/ }),
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("closes automatically after twenty seconds", () => {
    vi.useFakeTimers();
    const close = vi.fn();
    render(
      <PostMatchHandoffDialog
        courtLabel="Court 1"
        players={players}
        format="doubles"
        onClose={close}
      />,
    );
    act(() => vi.advanceTimersByTime(20_000));
    expect(close).toHaveBeenCalledOnce();
  });
});
