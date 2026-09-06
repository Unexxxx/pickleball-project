"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowRight, Clock3, ListOrdered, Users } from "lucide-react";
import type { QueueItem } from "@/lib/realtime/event-operations";
import { AssignStandbyButton } from "@/components/queues/assign-standby-button";
import { MatchTimer } from "@/components/queues/match-timer";
import { EndMatchScore } from "@/components/queues/end-match-score";
import { StandbyRoster } from "@/components/queues/standby-roster";
import { PostMatchHandoffDialog } from "@/components/queues/post-match-handoff-dialog";

export type LiveCourtMatch = {
  id: string;
  courtLabel: string;
  format: string;
  status: string;
  assignedAt: string;
  players: {
    playerId: string;
    displayName: string;
    publicSlug: string | null;
    avatarUrl: string | null;
    rank: number | null;
    totalMatches: number;
    side: number;
  }[];
};

function MatchPlayer({
  player,
}: {
  player: LiveCourtMatch["players"][number];
}) {
  return (
    <div className="match-player-tile" aria-label={player.displayName}>
      <div
        className="match-player-portrait"
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
        <div className="match-player-overlay">
          <strong title={player.displayName}>{player.displayName}</strong>
          <span>
            <small>{player.rank ? `#${player.rank}` : "Unranked"}</small>
            <small>
              {player.totalMatches}{" "}
              {player.totalMatches === 1 ? "match" : "matches"}
            </small>
          </span>
        </div>
      </div>
    </div>
  );
}

function MatchTeam({
  label,
  players,
  side,
}: {
  label: string;
  players: LiveCourtMatch["players"];
  side: "a" | "b";
}) {
  return (
    <div className={`portrait-team portrait-team--${side}`}>
      <small className="portrait-team-label">{label}</small>
      <div
        className={`portrait-team-row${players.length < 2 ? " is-single" : ""}`}
      >
        {players[0] ? <MatchPlayer player={players[0]} /> : null}
        {players.length > 1 ? (
          <span className="portrait-team-join" aria-hidden="true">
            &amp;
          </span>
        ) : null}
        {players[1] ? <MatchPlayer player={players[1]} /> : null}
      </div>
    </div>
  );
}

function PlayerNames({ players }: { players: { displayName: string }[] }) {
  return (
    <ul className="live-player-list">
      {players.map((player, index) => (
        <li key={`${player.displayName}-${index}`}>
          <span aria-hidden="true">{index + 1}</span>
          {player.displayName}
        </li>
      ))}
    </ul>
  );
}

export function LiveEventBoard({
  matches,
  queue,
  format,
  matchesHref,
  clubSlug,
  eventId,
  canManage,
  viewerPlayerId,
  courtAvailable,
  queueVersion,
  matchDurationMinutes,
}: {
  matches: LiveCourtMatch[];
  queue: QueueItem[];
  format: "singles" | "doubles";
  matchesHref: string;
  clubSlug: string;
  eventId: string;
  canManage: boolean;
  viewerPlayerId: string | null;
  courtAvailable: boolean;
  queueVersion: number;
  matchDurationMinutes: number;
}) {
  const playersPerMatch = format === "singles" ? 2 : 4;
  const standby = queue.slice(0, playersPerMatch);
  const waiting = queue.slice(playersPerMatch);
  const upcoming = waiting.slice(0, playersPerMatch);
  const bench = waiting.slice(playersPerMatch);
  const [handoffCourt, setHandoffCourt] = useState<string | null>(null);
  const closeHandoff = useCallback(() => setHandoffCourt(null), []);

  return (
    <section className="live-event-board" aria-labelledby="live-board-heading">
      <div className="section-heading live-board-heading">
        <div>
          <p className="eyebrow">Live operations</p>
          <h2 id="live-board-heading">Court and match rotation</h2>
          <p>See who is playing now and exactly who is next in line.</p>
        </div>
        <Link className="button-secondary" href={matchesHref}>
          Manage matches <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </div>

      <div className="live-board-stages">
        <section
          className="live-stage live-stage--playing"
          aria-label="Active matches"
        >
          {matches.length ? (
            <div className="live-match-stack">
              {matches.map((match) => {
                const sideA = match.players.filter(
                  (player) => player.side === 1,
                );
                const sideB = match.players.filter(
                  (player) => player.side === 2,
                );
                return (
                  <article className="live-court-card" key={match.id}>
                    <div className="live-court-card__heading">
                      <div>
                        <strong>{match.courtLabel}</strong>
                        <span className="live-status">
                          <span aria-hidden="true" /> Live
                        </span>
                      </div>
                      <MatchTimer
                        startedAt={match.assignedAt}
                        durationMinutes={matchDurationMinutes}
                      />
                    </div>
                    <div className="portrait-matchup">
                      <MatchTeam label="Side A" players={sideA} side="a" />
                      <span className="portrait-versus" aria-label="versus">
                        VS
                      </span>
                      <MatchTeam label="Side B" players={sideB} side="b" />
                    </div>
                    {canManage ||
                    match.players.some(
                      (player) => player.playerId === viewerPlayerId,
                    ) ? (
                      <EndMatchScore
                        clubSlug={clubSlug}
                        eventId={eventId}
                        matchId={match.id}
                        onCompleted={() => setHandoffCourt(match.courtLabel)}
                      />
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="live-empty-state">
              <Users aria-hidden="true" size={24} />
              <div>
                <strong>No match is on court yet</strong>
                <p>
                  Generate and confirm a match to assign players to a court.
                </p>
              </div>
            </div>
          )}
        </section>

        <div className="live-rotation-stack">
          <section className="live-stage live-stage--standby">
            <div className="live-stage-heading">
              <span className="live-stage-icon">
                <Clock3 aria-hidden="true" size={20} />
              </span>
              <div>
                <p className="eyebrow">Next available court</p>
                <h3>Standby — next match</h3>
              </div>
              <span className="live-count">
                {standby.length}/{playersPerMatch}
              </span>
            </div>
            {standby.length ? (
              canManage ? (
                <StandbyRoster
                  players={standby}
                  candidates={waiting}
                  clubSlug={clubSlug}
                  eventId={eventId}
                  format={format}
                  queueVersion={queueVersion}
                />
              ) : (
                <PlayerNames
                  players={standby.map((player) => ({
                    displayName: player.displayName ?? "Player",
                  }))}
                />
              )
            ) : (
              <p className="live-stage-empty">
                No players are waiting on standby.
              </p>
            )}
            {standby.length > 0 && standby.length < playersPerMatch ? (
              <p className="live-waiting-note">
                Waiting for {playersPerMatch - standby.length} more{" "}
                {playersPerMatch - standby.length === 1 ? "player" : "players"}.
              </p>
            ) : null}
            {canManage ? (
              <AssignStandbyButton
                clubSlug={clubSlug}
                eventId={eventId}
                format={format}
                ready={standby.length === playersPerMatch}
                courtAvailable={courtAvailable}
              />
            ) : null}
          </section>

          <section className="live-stage live-stage--upcoming">
            <div className="live-stage-heading">
              <span className="live-stage-icon">
                <ListOrdered aria-hidden="true" size={20} />
              </span>
              <div>
                <p className="eyebrow">Later in rotation</p>
                <h3>Upcoming match</h3>
              </div>
              <span className="live-count">
                {upcoming.length}/{playersPerMatch}
              </span>
            </div>
            {upcoming.length ? (
              <div className="upcoming-match-list">
                <article>
                  <div>
                    <strong>Next after standby</strong>
                    <small>
                      {upcoming.length === playersPerMatch
                        ? "Lineup ready"
                        : `Needs ${playersPerMatch - upcoming.length} more`}
                    </small>
                  </div>
                  {canManage ? (
                    <StandbyRoster
                      players={upcoming}
                      candidates={bench}
                      clubSlug={clubSlug}
                      eventId={eventId}
                      format={format}
                      queueVersion={queueVersion}
                      stage="upcoming"
                    />
                  ) : (
                    <PlayerNames
                      players={upcoming.map((player) => ({
                        displayName: player.displayName ?? "Player",
                      }))}
                    />
                  )}
                </article>
              </div>
            ) : (
              <p className="live-stage-empty">No upcoming lineup is waiting.</p>
            )}
          </section>
        </div>
      </div>
      {handoffCourt ? (
        <PostMatchHandoffDialog
          courtLabel={handoffCourt}
          players={standby.map((player) => ({
            id: player.id,
            displayName: player.displayName ?? "Player",
            avatarUrl: player.avatarUrl ?? null,
          }))}
          format={format}
          onClose={closeHandoff}
        />
      ) : null}
    </section>
  );
}
