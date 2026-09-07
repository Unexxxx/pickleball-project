"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export type HandoffPlayer = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
};

export function PostMatchHandoffDialog({
  courtLabel,
  players,
  format,
  action,
  onClose,
}: {
  courtLabel: string;
  players: HandoffPlayer[];
  format: "singles" | "doubles";
  action?: ReactNode;
  onClose: () => void;
}) {
  const [remaining, setRemaining] = useState(20);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButton.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setInterval(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (remaining === 0) onClose();
  }, [remaining, onClose]);

  const sideSize = format === "singles" ? 1 : 2;
  const sides = [players.slice(0, sideSize), players.slice(sideSize)];
  const circumference = 2 * Math.PI * 18;

  return (
    <div className="handoff-dialog-backdrop" role="presentation">
      <section
        className="handoff-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="handoff-dialog-title"
        aria-describedby="handoff-dialog-description"
      >
        <header className="handoff-dialog-header">
          <div>
            <p className="eyebrow">Next match</p>
            <h2 id="handoff-dialog-title">Proceed to {courtLabel}</h2>
          </div>
          <button
            ref={closeButton}
            className="handoff-close-button handoff-countdown"
            type="button"
            onClick={onClose}
            aria-label={`Close court handoff. Closes automatically in ${remaining} seconds`}
          >
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="18" />
              <circle
                className="handoff-countdown-progress"
                cx="22"
                cy="22"
                r="18"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - remaining / 20)}
              />
            </svg>
            <span className="handoff-close-content" aria-hidden="true">
              <X size={17} />
            </span>
          </button>
        </header>

        <p id="handoff-dialog-description" className="sr-only">
          Standby players and their teammates for the next match.
        </p>

        {players.length ? (
          <div className="handoff-lineup">
            {sides.map((side, sideIndex) => (
              <section
                className="handoff-team"
                key={sideIndex}
                aria-label={`Side ${sideIndex ? "B" : "A"}`}
              >
                <p>Side {sideIndex ? "B" : "A"} · Teammates</p>
                <ul>
                  {side.map((player) => (
                    <li key={player.id}>
                      <div
                        className="handoff-player-photo"
                        role="img"
                        aria-label={`${player.displayName}'s profile photo`}
                        style={
                          player.avatarUrl
                            ? { backgroundImage: `url(${player.avatarUrl})` }
                            : undefined
                        }
                      >
                        {!player.avatarUrl ? (
                          <span>
                            {player.displayName.charAt(0).toUpperCase()}
                          </span>
                        ) : null}
                        <strong title={player.displayName}>
                          {player.displayName}
                        </strong>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <span className="handoff-versus" aria-label="versus">
              VS
            </span>
          </div>
        ) : (
          <p className="handoff-empty">
            No complete standby lineup is waiting yet.
          </p>
        )}

        {action ? (
          <footer className="handoff-dialog-action">{action}</footer>
        ) : null}

        <span className="sr-only" aria-live="polite">
          Closes automatically in {remaining} seconds
        </span>
      </section>
    </div>
  );
}
