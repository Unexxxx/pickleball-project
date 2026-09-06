"use client";

import { useState } from "react";
import { Flag, MoreHorizontal, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitMatchResult } from "@/lib/actions/results";
import { createReport } from "@/lib/actions/reports";

export function MatchHistoryOptions({
  clubId,
  eventId,
  matchId,
  score,
}: {
  clubId: string;
  eventId: string;
  matchId: string;
  score: { games: { sideA: number; sideB: number }[] };
}) {
  const router = useRouter();
  const current = score.games[0];
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<"edit" | "report" | null>(null);
  const [sideA, setSideA] = useState(current ? String(current.sideA) : "");
  const [sideB, setSideB] = useState(current ? String(current.sideB) : "");
  const [report, setReport] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  function selectPanel(next: "edit" | "report") {
    setPanel(next);
    setMenuOpen(false);
    setMessage("");
  }

  return (
    <div className="match-options">
      <button
        type="button"
        className="match-options-trigger"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label="Match options"
        aria-expanded={menuOpen}
      >
        <MoreHorizontal aria-hidden="true" size={20} />
      </button>
      {menuOpen ? (
        <div className="match-options-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => selectPanel("edit")}
          >
            <Pencil aria-hidden="true" size={16} /> Edit score
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => selectPanel("report")}
          >
            <Flag aria-hidden="true" size={16} /> Report match
          </button>
        </div>
      ) : null}

      {panel ? (
        <div
          className="match-options-panel"
          role="dialog"
          aria-label={panel === "edit" ? "Edit match score" : "Report match"}
        >
          <header>
            <strong>{panel === "edit" ? "Edit score" : "Report match"}</strong>
            <button
              type="button"
              onClick={() => setPanel(null)}
              aria-label="Close match option"
            >
              <X aria-hidden="true" size={17} />
            </button>
          </header>
          {panel === "edit" ? (
            <div className="match-options-score-fields">
              <label>
                Side A
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="99"
                  value={sideA}
                  onChange={(event) =>
                    /^\d{0,2}$/.test(event.target.value) &&
                    setSideA(event.target.value)
                  }
                />
              </label>
              <span aria-hidden="true">–</span>
              <label>
                Side B
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="99"
                  value={sideB}
                  onChange={(event) =>
                    /^\d{0,2}$/.test(event.target.value) &&
                    setSideB(event.target.value)
                  }
                />
              </label>
              <button
                type="button"
                disabled={pending || !sideA || !sideB || sideA === sideB}
                onClick={async () => {
                  setPending(true);
                  setMessage("");
                  const result = await submitMatchResult({
                    clubId,
                    eventId,
                    matchId,
                    score: {
                      games: [{ sideA: Number(sideA), sideB: Number(sideB) }],
                    },
                    idempotencyKey: crypto.randomUUID(),
                  });
                  setPending(false);
                  setMessage(
                    result.ok
                      ? "Score revision submitted."
                      : result.error.message,
                  );
                  if (result.ok) router.refresh();
                }}
              >
                {pending ? "Saving…" : "Save score revision"}
              </button>
            </div>
          ) : (
            <div className="match-options-report-fields">
              <label>
                What should be reviewed?
                <textarea
                  value={report}
                  onChange={(event) => setReport(event.target.value)}
                  placeholder="Describe the issue with this match…"
                />
              </label>
              <button
                type="button"
                disabled={pending || report.trim().length < 10}
                onClick={async () => {
                  setPending(true);
                  setMessage("");
                  const result = await createReport({
                    subjectType: "match",
                    subjectId: matchId,
                    reasonCode: "match_issue",
                    description: report,
                    evidenceObjectIds: [],
                    idempotencyKey: crypto.randomUUID(),
                  });
                  setPending(false);
                  setMessage(
                    result.ok
                      ? "Match report submitted."
                      : result.error.message,
                  );
                }}
              >
                {pending ? "Submitting…" : "Submit report"}
              </button>
            </div>
          )}
          <p role="status" aria-live="polite">
            {message}
          </p>
        </div>
      ) : null}
    </div>
  );
}
