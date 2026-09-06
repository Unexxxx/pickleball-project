# Competition rules

## Identity and records

Each person has one verified player account across every Club. Guest, ghost, anonymous, and duplicate identities cannot participate. Club membership is tenant-scoped, while public identity and overall ranked history are global. Only active or trialing subscribed Clubs may create official ranked results. Unranked results never affect ranked statistics or leaderboards.

## Elo v1 and leaderboard order

Ranked singles and doubles use Elo v1: initial rating 1500, scale 400, K-factor 32, and half-away-from-zero rounding. Doubles use the team average for expectation and apply the same delta to each teammate. A stored rule version, input checksum, output checksum, and monotonically increasing calculation version make every calculation reproducible.

Leaderboards order eligible players deterministically by rating, wins, win rate, fewer losses, most-recent match, then canonical player UUID. Win rate is wins divided by ranked decisions. Current and longest streaks use finalized ranked outcomes only.

## Confirmation, audit, and correction

One verified participant from each side must confirm the same immutable score revision. Finalization is transactional and idempotent. Corrections never rewrite history: revisions, confirmations, official-result state, rating ledgers, audit events, and calculation runs remain attributable. A dispute suspends ranked effects while an authorized score official resolves it. Correction or voiding triggers a deterministic projection rebuild.

## Trust Score, moderation, and privacy

Trust Score is private to the player and platform administrators. It cannot affect Elo, public profiles, matchmaking, or leaderboard order. Every adjustment is ledgered; players can request review and administrator decisions create compensating entries rather than altering history. Club roles cannot perform platform moderation.

Private Club operations are isolated by Row Level Security. Public pages expose only public profile and competition projections. Evidence uses short-lived signed URLs, a 90-day retention deadline, audited deletion, and explicit appeal or legal-hold protection.
