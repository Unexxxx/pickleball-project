"use client";

import { useState } from "react";
import { cancelMatchAssignment } from "@/lib/actions/matchmaking";
import { ScoreForm } from "@/components/matches/score-form";
import { Trophy } from "lucide-react";
import { MatchHistoryOptions } from "@/components/matches/match-history-options";

export type AssignmentView = {
  id: string;
  courtLabel: string;
  format: string;
  status: string;
  players: {
    playerId: string;
    displayName: string;
    avatarUrl: string | null;
    side: number;
  }[];
  result?: {
    score: { games: { sideA: number; sideB: number }[] };
    winnerSide: number | null;
  };
};

function HistoryPlayer({
  player,
}: {
  player: AssignmentView["players"][number];
}) {
  return (
    <li>
      <div
        className="match-history-player-photo"
        role="img"
        aria-label={`${player.displayName}'s profile photo`}
        style={
          player.avatarUrl
            ? { backgroundImage: `url(${player.avatarUrl})` }
            : undefined
        }
      >
        {!player.avatarUrl ? (
          <span>{player.displayName.charAt(0).toUpperCase()}</span>
        ) : null}
        <strong title={player.displayName}>{player.displayName}</strong>
      </div>
    </li>
  );
}

export function AssignmentBoard({
  clubId,
  eventId,
  assignments,
}: {
  clubId: string;
  eventId: string;
  assignments: AssignmentView[];
}) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  return (
    <section>
      <div className="match-history-heading">
        <div>
          <p className="eyebrow">Event results</p>
          <h2>Match history</h2>
        </div>
        <span>{assignments.length} matches</span>
      </div>
      {assignments.length === 0 ? (
        <p>No matches assigned yet.</p>
      ) : (
        <div className="match-history-grid">
          {assignments.map((match) => {
            const sideA = match.players.filter((player) => player.side === 1);
            const sideB = match.players.filter((player) => player.side === 2);
            const games = match.result?.score.games ?? [];
            const winnerSide = match.result?.winnerSide;
            return (
              <article
                key={match.id}
                data-testid="assigned-match"
                className="match-history-card"
              >
                <header>
                  <div className="match-history-cancel">
                    <p>{match.courtLabel}</p>
                    <span>{match.format}</span>
                  </div>
                  {match.result ? (
                    <MatchHistoryOptions
                      clubId={clubId}
                      eventId={eventId}
                      matchId={match.id}
                      score={match.result.score}
                    />
                  ) : (
                    <strong>{match.status.replaceAll("_", " ")}</strong>
                  )}
                </header>
                <div className="match-history-matchup">
                  {[sideA, sideB].map((players, index) => {
                    const side = index + 1;
                    const isWinner = winnerSide === side;
                    const isLoser = Boolean(winnerSide && !isWinner);
                    return (
                      <section
                        key={side}
                        className={`match-history-team${isWinner ? " is-winner" : ""}${isLoser ? " is-loser" : ""}`}
                        aria-label={`Side ${index ? "B" : "A"}${isWinner ? ", winner" : isLoser ? ", runner-up" : ""}`}
                      >
                        <div className="match-history-team-label">
                          <span>Side {index ? "B" : "A"} · Teammates</span>
                          {isWinner ? (
                            <strong>
                              <Trophy aria-hidden="true" size={14} /> Winner
                            </strong>
                          ) : null}
                        </div>
                        <ul>
                          {players.map((player) => (
                            <HistoryPlayer
                              key={player.playerId}
                              player={player}
                            />
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                  <div className="match-history-score" aria-label="Match score">
                    {games.length ? (
                      games.map((game, index) => (
                        <strong key={index}>
                          <span>{game.sideA}</span>
                          <small>–</small>
                          <span>{game.sideB}</span>
                        </strong>
                      ))
                    ) : (
                      <strong className="is-versus">VS</strong>
                    )}
                  </div>
                </div>
                {match.status !== "finalized" && !match.result ? (
                  <ScoreForm
                    clubId={clubId}
                    eventId={eventId}
                    matchId={match.id}
                  />
                ) : null}
                {["assigned", "playing"].includes(match.status) ? (
                  <div>
                    <label>
                      Cancellation reason
                      <input
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      />
                    </label>
                    <button
                      onClick={async () => {
                        const result = await cancelMatchAssignment({
                          clubId,
                          eventId,
                          matchId: match.id,
                          reason,
                          idempotencyKey: crypto.randomUUID(),
                        });
                        setMessage(
                          result.ok
                            ? "Assignment canceled; players and court released"
                            : result.error.message,
                        );
                      }}
                    >
                      Cancel assignment
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
