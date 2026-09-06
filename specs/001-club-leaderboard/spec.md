# Feature Specification: Pickleball Club Competition and Leaderboards

**Feature Branch**: `001-club-leaderboard`  
**Created**: 2026-09-01  
**Status**: Draft  
**Input**: User description: "Build a pickleball club management and all-time leaderboard web app
for trusted competition records, event operations, verified participation, ranked and unranked
matches, public player profiles, and club and overall leaderboards."

## Clarifications

### Session 2026-09-01

- Q: Who must confirm a submitted score before ordinary finalization? → A: At least one player
  from each side must confirm.
- Q: What happens to a finalized ranked result's competitive effects when a dispute is opened?
  → A: Suspend its ranked effects immediately and recalculate until resolution.
- Q: What verification is required before a player may participate in ranked matches? → A:
  Verified contact ownership plus identity attestation by an authorized club.
- Q: Which results contribute to a club's leaderboard? → A: Official ranked matches submitted by
  that club.
- Q: Which rating model determines player ratings and primary leaderboard order? → A: An Elo-based
  rating adapted for singles and doubles.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Register a Verified Player (Priority: P1)

A player creates and verifies one account so every ranked result belongs to a real, persistent
identity that follows the player across clubs.

**Why this priority**: Trusted identity is required before any official competition record can
exist.

**Independent Test**: Register and verify a new player, then attempt to register the same person
again and verify that only one canonical player identity can participate in ranked matches.

**Acceptance Scenarios**:

1. **Given** a person without an account, **When** they provide the required registration details
   and verify ownership of their contact method, **Then** one verified player identity is created.
2. **Given** an account without verified contact ownership, **When** the player attempts to enter
   any match, **Then** participation is blocked and the contact-verification requirement is
   explained; ranked participation additionally requires authorized Club identity attestation.
3. **Given** an existing canonical player identity, **When** the person attempts duplicate
   registration, **Then** the system prevents a second ranked identity and offers account recovery
   or identity-resolution support.
4. **Given** an organizer entering participants, **When** they attempt to add a guest, ghost,
   anonymous, placeholder, or duplicate player to any match, **Then** the system rejects the
   participant.

---

### User Story 2 - Access and Administer a Club (Priority: P1)

A club owner establishes a club, maintains an active subscription, and grants scoped roles to
organizers and score officials who operate on behalf of that club.

**Why this priority**: Official match authority and isolated club operations depend on a recognized
club and explicit permissions.

**Independent Test**: Create a club, assign and revoke roles, vary subscription status, and verify
that official submission is allowed only for currently authorized users of an active subscribed
club.

**Acceptance Scenarios**:

1. **Given** a verified user, **When** they establish a club, **Then** the club receives one
   canonical organization record and the user becomes its owner.
2. **Given** a club owner, **When** they assign an organizer or score-official role, **Then** that
   user receives only the permissions associated with the assigned role.
3. **Given** an unauthorized user or a club without an active subscription, **When** official
   ranked submission is attempted, **Then** the submission is rejected without changing ranked
   records.
4. **Given** one person who belongs to multiple clubs, **When** they move between club workspaces,
   **Then** their player identity remains the same while each club's private operations remain
   isolated.

---

### User Story 3 - Create and Join an Event (Priority: P1)

An authorized club organizer creates an open play, tournament, or other pickleball event and
shares a link or QR code through which verified players can register.

**Why this priority**: Events are the organizing context for attendance, queues, courts, and
matches.

**Independent Test**: Create each supported event type, publish it, join through both entry
methods, enforce capacity and eligibility, and close registration.

**Acceptance Scenarios**:

1. **Given** an authorized organizer, **When** they create an event with type, schedule, venue,
   capacity, courts, registration window, and ranked policy, **Then** the event can be published.
2. **Given** a published event with open capacity, **When** a verified player follows its link or
   scans its QR code and accepts the event terms, **Then** the player is registered once.
3. **Given** a full event, **When** another eligible player registers, **Then** the player is placed
   on a waitlist in a visible order.
4. **Given** closed registration or an ineligible account, **When** registration is attempted,
   **Then** no registration is created and the reason is shown.

---

### User Story 4 - Check In and Manage the Queue (Priority: P1)

At event time, players check in and enter or leave the ready queue while organizers can resolve
attendance issues without losing the queue's history or fairness.

**Why this priority**: Accurate availability is necessary to create playable matches and use courts
efficiently.

**Independent Test**: Check registered players in and out, join and leave the queue, process a
waitlisted opening, and verify that ineligible or already-playing players cannot be queued.

**Acceptance Scenarios**:

1. **Given** a registered player during the check-in window, **When** the player or organizer
   checks them in, **Then** their attendance becomes visible and they may join the ready queue.
2. **Given** a checked-in player who is neither assigned nor already queued, **When** they join the
   queue, **Then** their queue position and waiting state are shown.
3. **Given** a queued player, **When** they leave, become unavailable, or are assigned to a match,
   **Then** they are removed from ready selection and the change is recorded.
4. **Given** a player who is unverified, not checked in, already playing, or otherwise ineligible,
   **When** queue entry is attempted, **Then** entry is blocked with a specific reason.

---

### User Story 5 - Generate and Assign Balanced Matches (Priority: P1)

An organizer selects ready players and generates a balanced singles or doubles match, then assigns
an available court and notifies the participants.

**Why this priority**: Matchmaking converts attendance into fair play and is central to event
operations.

**Independent Test**: Generate singles and doubles assignments from a known queue, confirm that
only eligible ready players are selected, and verify repeatable balancing and court-conflict rules.

**Acceptance Scenarios**:

1. **Given** enough eligible queued players and an available court, **When** an organizer requests
   a singles or doubles match, **Then** a balanced assignment is proposed using published factors
   such as rating proximity, wait time, and recent partner/opponent repetition.
2. **Given** a proposed match, **When** the organizer confirms it, **Then** participants and court
   are reserved, removed from the ready queue, and shown the assignment.
3. **Given** no eligible combination or no available court, **When** generation is requested,
   **Then** no conflicting assignment is created and the constraint is explained.
4. **Given** identical eligible players, event state, and balancing rules, **When** assignment is
   generated from the same starting state, **Then** the same proposed match results.

---

### User Story 6 - Submit and Confirm a Score (Priority: P1)

After a match, an authorized submitter records the score and all participants can review and
confirm the result before it becomes final.

**Why this priority**: Confirmed, attributable results are the source of trusted player records.

**Independent Test**: Submit valid and invalid scores, collect participant confirmations, handle
duplicate submission attempts, and verify that only an eligible official result becomes final.

**Acceptance Scenarios**:

1. **Given** a completed assigned match, **When** an authorized participant or club official
   submits a valid score, **Then** the result is pending confirmation and all participants can
   review it.
2. **Given** a pending result, **When** at least one player from each side confirms the same score,
   **Then** it is finalized once with submitter, confirmations, timestamps, and source club
   recorded.
3. **Given** an invalid score, altered participant list, or duplicate submission, **When** it is
   submitted, **Then** finalization is blocked and no statistics change.
4. **Given** a ranked match, **When** any participant is unverified or the submitting club or user
   lacks current authority, **Then** the match cannot become an official ranked result.

---

### User Story 7 - Resolve a Score Dispute (Priority: P1)

A participant disputes an incorrect pending or finalized score, and an authorized club official
resolves it through a controlled, visible workflow.

**Why this priority**: Trust requires errors to be correctable without silently rewriting history.

**Independent Test**: Open a dispute, review evidence and prior values, correct or uphold the
result, and verify the audit history and any derived-statistic recalculation.

**Acceptance Scenarios**:

1. **Given** a result visible to a participant, **When** they dispute it with a reason, **Then** the
   result is marked disputed, its ranked effects are suspended immediately, and affected
   statistics and leaderboards are recalculated without it until resolution.
2. **Given** an open dispute, **When** an authorized official reviews it, **Then** the official can
   uphold, correct, or void the result and must record a reason.
3. **Given** a corrected or voided ranked result, **When** the resolution becomes final, **Then**
   affected statistics and leaderboards are deterministically recalculated.
4. **Given** a resolved dispute, **When** an affected player views the match, **Then** the current
   authoritative result, resolution status, reason, and prior-result history are visible as
   permitted.

---

### User Story 8 - View a Public Player Profile and Match History (Priority: P2)

A visitor opens a player's public profile to understand that player's all-time competition record
and review the ranked matches behind it.

**Why this priority**: Transparent records make rankings understandable and useful beyond event
operations.

**Independent Test**: View profiles for players with and without ranked history, filter and page
through matches, and reconcile displayed statistics with eligible official results.

**Acceptance Scenarios**:

1. **Given** a player with ranked history, **When** a visitor opens the public profile, **Then**
   rank, rating, wins, losses, win rate, current streak, longest streak, and recent ranked history
   are shown with the effective calculation version or update time.
2. **Given** a player with no eligible ranked matches, **When** the profile is viewed, **Then** the
   player is shown as unranked without fabricated statistics.
3. **Given** ranked and unranked history, **When** the visitor filters the match list, **Then** the
   record classes remain visibly distinct and unranked results do not alter ranked summaries.
4. **Given** private club operational data, **When** a public visitor views a profile or match,
   **Then** only the approved public competition fields are exposed.

---

### User Story 9 - Browse Club and Overall Leaderboards (Priority: P2)

A player or visitor browses club-specific and overall all-time leaderboards and can understand why
players have their positions.

**Why this priority**: Leaderboards provide the primary long-term competitive value of trusted
match records.

**Independent Test**: Process a fixed sequence of ranked and unranked results, compare club and
overall boards to expected fixtures, and verify ordering after a correction.

**Acceptance Scenarios**:

1. **Given** eligible official ranked results, **When** a leaderboard is viewed, **Then** players
   are ordered primarily by the published Elo-based rating, followed by the published eligibility
   and tie-break rules.
2. **Given** a player's eligible results from multiple clubs, **When** the overall leaderboard is
   calculated, **Then** one canonical player entry reflects the combined eligible record.
3. **Given** a club leaderboard, **When** it is viewed, **Then** only official ranked matches
   submitted by that club contribute.
4. **Given** an unranked, disputed, voided, or duplicate result, **When** leaderboards update,
   **Then** that result has no unauthorized ranked effect.
5. **Given** an official correction, **When** recalculation completes, **Then** profiles and every
   affected leaderboard agree and retain a traceable update.

---

### User Story 10 - Operate Events on Mobile Devices (Priority: P2)

Players and organizers complete the primary event journey on a phone, from joining and checking in
through seeing assignments and confirming scores.

**Why this priority**: Most event interactions happen courtside, where a mobile device is the
practical interface.

**Independent Test**: Complete the full player journey and organizer queue-to-result journey on
supported mobile viewport sizes without requiring a desktop-only action.

**Acceptance Scenarios**:

1. **Given** a supported mobile viewport, **When** a player joins, checks in, queues, views an
   assignment, and confirms a score, **Then** every action is readable and operable without
   horizontal page scrolling.
2. **Given** a supported mobile viewport, **When** an organizer manages attendance, queues, courts,
   matches, and a dispute, **Then** all critical controls remain accessible and provide clear
   success or error feedback.

---

### User Story 11 - Report and Moderate Harmful Content (Priority: P2)

A verified player reports a public player, Club, match, or abusive content, and a platform
administrator resolves the report without silently changing official competition history.

**Why this priority**: Trusted public competition data requires a controlled safety workflow that
is separate from Club score-dispute authority.

**Independent Test**: Submit a report with private evidence, prove that Club roles cannot moderate
it, resolve it as a platform administrator, review the audit and retention deadline, and verify
that any duplicate-identity merge preserves one canonical player and all competition provenance.

**Acceptance Scenarios**:

1. **Given** a verified player viewing a permitted subject, **When** they submit a reason and
   optional evidence, **Then** one private, attributable report is created.
2. **Given** an open report, **When** a Club owner or score official attempts to claim or resolve
   it, **Then** the action is rejected without revealing private evidence.
3. **Given** an open report, **When** a platform administrator dismisses it or applies an approved
   visibility, account, or identity-review action, **Then** the reason, actor, prior state, current
   state, and effective period are audited.
4. **Given** a report concerning an official score, **When** moderation is requested, **Then** the
   official result can change only through the source Club's score-dispute workflow.
5. **Given** an adjudicated duplicate identity, **When** a platform administrator merges it into
   the surviving canonical player, **Then** memberships and competition references are repointed
   transactionally while official results, revisions, calculations, and audits remain intact.
6. **Given** a resolved report with no appeal or legal hold, **When** its evidence reaches the
   retention deadline, **Then** stored evidence is deleted and a non-sensitive deletion audit is
   retained.

### Edge Cases

- Two registration attempts for the same person occur concurrently.
- A club subscription expires after a ranked event starts but before a result is submitted.
- A user's role is revoked while they are editing or confirming an official result.
- A player belongs to several clubs or changes clubs while retaining historical results.
- A player scans the same event QR code repeatedly or opens an expired or tampered join link.
- The last event place is claimed concurrently by multiple players.
- A queued player disconnects, leaves, or becomes unavailable during match generation.
- A court becomes unavailable after assignment but before play starts.
- A doubles player withdraws after assignment and before the match begins.
- Participants submit conflicting scores, fail to confirm, or dispute after an initial confirmation.
- A result submission is retried after a timeout or from two devices.
- A correction changes an older result that affects later ratings, streaks, and ranks.
- Players tie under the primary leaderboard metric and require deterministic secondary tie-breaks.
- A player has only unranked, disputed, or voided matches.
- Public history contains a match involving a player or club with restricted private information.
- A resolved report is appealed or placed on legal hold before its evidence retention deadline.
- A duplicate-identity merge is retried or races with ranked-result finalization.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST create one canonical player identity per person, require verified
  contact ownership before participation in any match, and additionally require identity
  attestation by an authorized Club before ranked participation.
- **FR-002**: The system MUST detect and prevent guest, ghost, anonymous, placeholder, and duplicate
  identities from entering any match record.
- **FR-003**: Players MUST be able to recover or resolve access to an existing identity without
  creating a second ranked identity.
- **FR-004**: The system MUST represent every organization through the single Club concept and MUST
  preserve one player identity across club memberships.
- **FR-005**: Club owners MUST be able to assign and revoke scoped owner, organizer, and score
  official permissions.
- **FR-005A**: An authorized club official MUST be able to attest that a contact-verified account
  matches the canonical player identity, with attester, club, and timestamp recorded.
- **FR-006**: The system MUST enforce current user authorization and active club subscription when
  an official ranked result is submitted or finalized.
- **FR-007**: Club members MUST NOT access another club's private membership, event-operation, or
  administrative data unless separately authorized there.
- **FR-008**: Authorized organizers MUST be able to create, edit, publish, cancel, and complete open
  play, tournament, and other pickleball events.
- **FR-009**: Events MUST define schedule, venue, capacity, courts, registration window, eligibility,
  match formats, and ranked or unranked policy before publication.
- **FR-010**: Published events MUST provide a shareable join link and QR code that resolve to the
  same registration experience.
- **FR-011**: Eligible verified players MUST be able to register once, withdraw, and see confirmed
  or waitlisted status.
- **FR-012**: The system MUST enforce event capacity and maintain an ordered waitlist when capacity
  is reached.
- **FR-013**: Registered players or authorized organizers MUST be able to record check-in and
  check-out during the event's allowed attendance period.
- **FR-014**: Checked-in eligible players MUST be able to join and leave a ready queue and see
  their current state.
- **FR-015**: The queue MUST exclude players who are unverified, absent, unavailable, already
  assigned, already playing, or otherwise ineligible.
- **FR-016**: Authorized organizers MUST be able to reorder or correct queue state only with an
  attributable reason, preserving the prior state in event history.
- **FR-017**: Authorized organizers MUST be able to generate singles or doubles assignments from
  eligible queued players.
- **FR-018**: Match proposals MUST apply a published deterministic balance policy considering
  rating proximity, queue wait time, and recent partner or opponent repetition.
- **FR-019**: Organizers MUST be able to confirm a proposal and assign exactly one available court
  without double-booking players or courts.
- **FR-020**: Assigned players MUST be notified in the event view and MUST be able to see partners,
  opponents, format, and court.
- **FR-021**: Authorized participants or club officials MUST be able to submit a score for an
  assigned match using the score rules selected for that event.
- **FR-022**: The system MUST validate score structure, participants, match state, submitter
  authority, and duplicate-submission status before accepting a result.
- **FR-023**: All participants MUST be able to review a submitted score, and at least one player
  from each side MUST confirm the same score before ordinary finalization.
- **FR-024**: The system MUST prevent retries or concurrent requests from creating duplicate
  official matches, results, or ranked effects.
- **FR-025**: A participant MUST be able to dispute a pending or finalized result with a reason.
- **FR-026**: An authorized score official MUST be able to uphold, correct, or void a disputed result
  with a recorded reason; no correction may silently overwrite history.
- **FR-027**: Every official result MUST retain source club, event and match, participants,
  submitter, confirmations, timestamps, original values, status changes, disputes, resolutions,
  and rule version.
- **FR-028**: Ranked and unranked matches MUST remain distinctly classified in storage, history,
  filtering, and all derived calculations.
- **FR-029**: Only finalized, eligible official ranked results MUST affect rating, ranked wins and
  losses, win rate, streaks, club rankings, or overall rankings.
- **FR-030**: Unranked, pending, disputed, voided, and duplicate results MUST NOT affect ranked
  calculations; opening a dispute on a finalized ranked result MUST immediately suspend its ranked
  effects and trigger deterministic recalculation until the dispute is resolved.
- **FR-031**: Corrections and voids MUST trigger a deterministic recomputation of every affected
  later rating, statistic, streak, club leaderboard, and overall leaderboard.
- **FR-032**: Public player profiles MUST show rank, rating, ranked wins, ranked losses, ranked win
  rate, current ranked win streak, longest ranked win streak, and eligible ranked match history.
- **FR-033**: Public profiles MUST clearly distinguish unranked players and MUST allow ranked and
  unranked match history to be viewed separately.
- **FR-034**: Match history MUST show opponents, partners for doubles, score, outcome, date, source
  club or event when public, record class, and dispute or correction status.
- **FR-035**: Club and overall leaderboards MUST publish eligibility, ordering, inactivity,
  tie-breaking, rounding, and update rules.
- **FR-036**: The overall leaderboard MUST show one entry per canonical player across eligible
  official ranked results from all clubs; each club leaderboard MUST use only official ranked
  matches submitted by that club.
- **FR-037**: Given the same ordered eligible results and calculation-rule version, statistics and
  leaderboard order MUST be identical on every calculation.
- **FR-037A**: Player ratings and primary leaderboard order MUST use a published Elo-based model
  adapted for singles and doubles; its initial rating, team-rating derivation, expected-outcome
  calculation, update factor, rounding, and tie-break rules MUST be versioned and deterministic.
- **FR-038**: Public views MUST expose only approved competition information and MUST not expose
  private contact, membership, event-operation, or club administration data.
- **FR-039**: Players and organizers MUST be able to complete their primary event workflows on
  supported mobile viewport sizes without a desktop-only step or horizontal page scrolling.
- **FR-040**: The system MUST show clear, actionable feedback when registration, queueing,
  matchmaking, score submission, confirmation, dispute, or recalculation cannot complete.
- **FR-041**: Core player identity, match records, audits, corrections, statistics, and leaderboards
  MUST remain usable without relying on a third-party sports platform.
- **FR-042**: A verified player MUST be able to report a permitted public player, Club, match, or
  abusive content with a reason and optional private evidence.
- **FR-043**: Only active platform administrators MUST be able to claim, resolve, reopen, or apply
  platform moderation actions; Club roles MUST NOT grant platform moderation authority.
- **FR-044**: Every report and moderation transition MUST retain actor, reason, timestamps,
  before/after state, evidence references, and any reversal or expiry without silently changing an
  official competition result.
- **FR-045**: An adjudicated duplicate-identity merge MUST preserve one canonical player and
  transactionally repoint memberships and domain references without deleting official results,
  revisions, calculation provenance, or audit history.
- **FR-046**: Report, dispute, and verification evidence MUST remain private and MUST be accessible
  only to its owner and explicitly authorized reviewers.
- **FR-047**: Trust Score MUST be a private, non-ranking integrity measure initialized at 50 and
  constrained to the inclusive range 0–100.
- **FR-048**: Trust Score MUST NOT affect Elo ratings, leaderboard order, matchmaking, or public
  profiles.
- **FR-049**: Every Trust Score adjustment MUST use a published versioned reason code and immutable
  ledger entry; reversals MUST use compensating entries rather than mutation.
- **FR-050**: Automatic Trust Score adjustments MUST occur only through approved result or dispute
  workflows; manual adjustments MUST require a platform administrator, a non-empty reason, and an
  attributable source.
- **FR-051**: A player MUST be able to view only their own Trust Score and adjustment history and
  request review of a manual adjustment.
- **FR-052**: Official match records, revisions, calculation ledgers, and non-sensitive audit
  provenance MUST be retained for the lifetime of the competition record.
- **FR-053**: Private dispute and report evidence MUST be deleted 90 days after final resolution
  unless subject to an active appeal or legal hold; contact-verification artifacts MUST be deleted
  when no longer required for account security or ranked-identity review, while non-sensitive
  deletion audit metadata is retained.

### Competition Data Integrity _(mandatory when competition data is affected)_

- **Identity & Club Boundary**: One verified canonical player identity spans clubs. Every
  organization uses the Club concept, while memberships, roles, event operations, and private club
  records remain club-scoped.
- **Record Classification & Authority**: Matches are explicitly ranked or unranked. Official ranked
  finalization requires verified participants, an authorized submitter, and an active subscribed
  source club at submission and finalization.
- **Audit & Correction**: Official results and every status transition are attributable and
  historically retained. Disputes and corrections require authorized workflows, reasons, and
  deterministic downstream recalculation.
- **Calculation Rules**: Ratings use a versioned, published Elo-based model adapted for singles and
  doubles and are the primary leaderboard ordering value. Win rate is ranked wins divided by
  completed ranked decisions; streaks use chronological eligible ranked outcomes. Elo parameters,
  team-rating derivation, ties, rounding, inactivity, forfeits, and corrections follow explicit
  deterministic rules finalized during planning.
- **Privacy & Security**: Role checks and club boundaries apply at every protected action. Public
  profiles reveal approved competition facts, not private account or club-operational information.
  Official competition provenance is retained for the lifetime of the record. Private dispute and
  report evidence is deleted 90 days after final resolution unless an appeal or legal hold is
  active. Contact-verification artifacts are removed when no longer required. Every deletion
  retains a non-sensitive audit of actor, reason, target, and time.
- **Mobile & Performance**: Join, check-in, queue, assignment, score, and dispute workflows support
  common phone-sized viewports. User-visible event state and leaderboard views meet the measurable
  response outcomes below.
- **External Independence**: The product owns canonical player identity and match data. No
  third-party sports platform is authoritative or required for core competition workflows.

### Trust Score

Trust Score is private to the player and platform administrators, starts at 50, and remains between
0 and 100. It is not a competitive metric and never affects Elo, leaderboards, matchmaking, or
public profiles. Adjustments use versioned published reason codes and immutable ledger entries.
Automatic adjustments occur only inside approved result or dispute transactions; manual
adjustments require a platform administrator, reason, and source. Players may view their own
history and request review of a manual adjustment. Reversals use compensating entries.

### Key Entities _(include if feature involves data)_

- **Player Account**: A person's authenticated access credentials, contact-ownership verification
  state, club identity-attestation state, public visibility choices, and link to one canonical
  player.
- **Player**: The cross-club competitive identity with public profile, memberships, rating, ranked
  statistics, and calculation history.
- **Club**: The single organization type with subscription state, public details, memberships,
  scoped roles, events, and eligible club leaderboard.
- **Club Membership**: A player's relationship to a club, including status and club-scoped
  permissions without changing the canonical player identity.
- **Event**: A club-run open play, tournament, or other event with schedule, venue, capacity,
  courts, registration, eligibility, formats, and ranked policy.
- **Registration and Attendance**: A player's confirmed or waitlisted registration plus check-in,
  availability, and withdrawal history.
- **Queue Entry**: A checked-in player's ready state, ordering information, availability, and
  attributable queue changes.
- **Court**: A playable event resource with availability and current match assignment.
- **Match**: A singles or doubles assignment with players, sides, court, format, ranked class,
  source club, event, state, and calculation-rule version.
- **Result**: A submitted score and outcome with submitter, participant confirmations, eligibility,
  finalization state, and official ranked effect.
- **Dispute and Correction**: A challenge, evidence or reason, authorized decision, previous and
  corrected values, and recalculation status.
- **Audit Event**: An immutable record of actor, action, time, reason, and before/after state for
  official or sensitive workflows.
- **Rating Snapshot and Player Statistics**: Reproducible derived values for rating, wins, losses,
  win rate, current streak, and longest streak at a calculation version.
- **Leaderboard**: A versioned ordered set of eligible canonical players. A club leaderboard derives
  only from official ranked matches submitted by that club; the overall leaderboard derives from
  eligible official ranked results across all clubs. Each publishes eligibility and tie-break
  rules.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At least 95% of new players can register, verify, and join an eligible event in under
  five minutes without organizer assistance.
- **SC-002**: 100% of official ranked participants in acceptance testing resolve to verified,
  unique canonical player identities; no prohibited identity reaches a ranked result.
- **SC-003**: An organizer can publish a standard event with schedule, venue, capacity, courts,
  eligibility, and match policy in under five minutes.
- **SC-004**: At least 95% of checked-in players can enter a queue and see an assignment or clear
  waiting status within two seconds of each completed action.
- **SC-005**: An organizer can generate and confirm a valid singles or doubles court assignment in
  under 30 seconds when eligible players and a court are available.
- **SC-006**: At least 95% of completed matches are submitted and confirmed by both sides in under
  two minutes, excluding time spent resolving a dispute.
- **SC-007**: 100% of official-result changes in acceptance testing identify the actor, reason,
  timestamp, prior value, current value, and affected recalculation.
- **SC-008**: For all approved calculation fixtures, identical ordered results and rule versions
  produce identical ratings, win rates, streaks, and club and overall ranking positions.
- **SC-009**: Ranked statistics and leaderboards reflect a finalized result or correction within
  10 seconds for events of up to 500 participants and 2,000 matches.
- **SC-010**: Unranked, pending, disputed, voided, and duplicate results cause zero ranked-statistic
  or ranked-leaderboard changes in all acceptance tests.
- **SC-011**: At least 95% of tested users can find a player's rank, rating, record, streak, and a
  specific recent match within 30 seconds.
- **SC-012**: At least 90% of players and organizers complete the primary courtside journey on a
  supported phone-sized viewport without assistance or horizontal page scrolling.
- **SC-013**: During acceptance testing, users from one club can access zero private operational
  records belonging solely to another club without explicit authorization.
- **SC-014**: Core registration, event, match, result, profile, and leaderboard workflows remain
  available when any optional third-party sports service is unavailable.
- **SC-015**: 100% of private evidence objects without an active appeal or legal hold are deleted
  within 24 hours after reaching their 90-day retention deadline, with a non-sensitive deletion
  audit retained.
- **SC-016**: In all acceptance fixtures, Trust Score changes produce zero Elo, matchmaking, public
  profile, or leaderboard-order changes.
- **SC-017**: In all moderation acceptance tests, Club roles complete zero platform-administrator
  actions and every administrator action has a matching immutable audit entry.

## Assumptions

- Account creation verifies control of a unique contact method. Ranked eligibility additionally
  requires an authorized club to attest that the account matches the canonical player.
- Club owners manage subscriptions, roles, event policies, and dispute officials for their club.
- A club that loses active subscription may retain read access to its history but cannot submit or
  finalize new official ranked results until access is restored.
- At least one player from each side must confirm ordinary results; unresolved or conflicting
  confirmations enter the dispute workflow rather than updating ranked records.
- Organizers may create unranked events and matches, but every participant still requires a
  registered account with verified contact ownership so match history is attributable. Club
  identity attestation is required only for ranked participation.
- Elo initial rating, team-rating derivation, update factor, inactivity policy, forfeit treatment,
  score formats, rounding, and leaderboard tie-break order will be selected during planning and
  published as one versioned ruleset before ranked launch.
- Queue balancing weighs fairness, wait time, and repeat avoidance; organizers may reject a
  proposal, but confirmed assignments and manual adjustments remain attributable.
- Public profiles default to competition data only; private contact details, club administration,
  attendance status, and unpublished event operations are not public.
- Supported mobile viewports include common modern phone widths; accessibility requirements apply
  to the primary player and organizer journeys.
- Notifications are available in the product; additional delivery channels are optional and are
  not required for core workflows.
- Historical official records and their audit trails are retained for the lifetime of the
  competition record, subject to lawful privacy correction without erasing competitive provenance.
- Payments beyond tracking whether a club subscription is active are outside this feature.
- Bracket design, financial payouts, equipment rental, and third-party tournament federation
  integration are outside the initial scope.
- MVP tournament events use the same registration, waitlist, check-in, queue, court, matchmaking,
  and result workflows as open play; automated brackets, seeding, advancement, and placement
  points are outside the initial scope.
